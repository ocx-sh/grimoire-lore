---
title: Python tooling and runtime posture audit
agent: ground-python-audit
model: claude-sonnet-5
scope: >
  Every Python-relevant config, CI workflow, and .py file under
  /home/mherwig/dev/{ocx,grimoire,index,ocx-sdk-python,ocx-mirror-sdk,
  grimoire-lore,ocx-save}, excluding .agents/worktrees/, external/, target/,
  .venv/, node_modules/, .cache/, __pycache__/. 493 in-scope .py files,
  188,415 lines.
method: >
  File discovery: `find <repos> \( -path '*/.venv/*' -o -path '*/external/*'
  -o -path '*/.agents/worktrees/*' -o -path '*/node_modules/*' -o -path
  '*/.cache/*' -o -path '*/target/*' -o -path '*/__pycache__/*' \) -prune -o
  -name '*.py' -print` into a file list, then all commands below iterate that
  list. LOC and file counts verified two ways (grep pipeline and `find | xargs
  cat | wc -l`) after the shell's `rtk` output-filtering hook was found to
  silently truncate one intermediate `grep | xargs wc -l` pipeline (caught by
  cross-checking ocx/test against the 190-file/95k-LOC hypothesis in the
  brief; `find ocx/test -name '*.py' | xargs cat | wc -l` gave the correct
  95,419). Every count below was produced by the `find`-based form, not the
  grep-pipe form. Config content read directly (`cat`/`grep -n`). Ruff family
  list from `uv run ruff linter` (ocx-sdk-python, ruff 0.16.3). Lockfile
  staleness from `uv lock --check` (exit code, run from each project dir, not
  mtime comparison — mtimes survive a checkout and prove nothing). CI
  inventory by reading every `.github/workflows/*.yml` that references
  python/pytest/ruff/pyright/mypy or wires a `task` that does. Task commands
  traced through `taskfile.yml` `cmds:` (Task's own indirection layer).
  Python-version reality: `python3 --version`, `uv python list`, and `uv run
  python --version` from inside each project directory (the last is the one
  that matters — it's what `task test` actually gets). Runtime-posture greps
  are line-anchored patterns (e.g. `^\s*except\s*:`, `os\.environ\[.*\]\s*=`)
  read with `-n` and manually spot-checked against the source for false
  positives (documented inline below); they do not parse the AST, so a
  multi-line function signature with a mutable default, or a blocking call
  reached through an alias, would not be caught.
---

# Python tooling and runtime posture

## 1. Every Python-relevant config file

**No** `.pre-commit-config.yaml`, `mypy.ini`, `setup.cfg`, or `tox.ini` exists
anywhere in scope (the one `.pre-commit-config.yaml` hit is a vendored
`zip-8.6.0` crate under `ocx/.cache/xwin/cargo/registry/`, excluded).
`pyrightconfig.json` doesn't exist either — every pyright config lives inline
in `pyproject.toml` under `[tool.pyright]`.

| Path | requires-python | Normative content |
|---|---|---|
| `ocx/test/pyproject.toml` | `>=3.10` | `[tool.pytest.ini_options]` only: `testpaths=["tests"]`, `pythonpath=[".","src"]`, one marker (`requires_tty`). **No `[tool.ruff]`, no `[tool.pyright]`, no `[tool.coverage]`.** |
| `grimoire/test/pyproject.toml` | `>=3.10` | Same shape: `testpaths=["tests"]`, `pythonpath=["."]`. No lint/type/coverage config. |
| `grimoire/.claude/tests/pyproject.toml` | `>=3.10` | `testpaths=["."]`. No lint/type/coverage config. |
| `ocx/.claude/tests/pyproject.toml` | `>=3.10` | Same as grimoire's twin (byte-identical shape, separate `uv.lock`). |
| `ocx-save/test/pyproject.toml` | `>=3.10` | `testpaths=["tests"]`, `pythonpath=["."]`. No lint/type/coverage config. |
| `index/bot/pyproject.toml` | `>=3.12` | ruff `select=[E,F,W,I,UP,B,C4,SIM,RUF,S,ANN]`, per-file-ignore `tests/**→S101`, line-length 100, target `py312`. pyright `typeCheckingMode="strict"`. pytest `addopts="--cov=indexbot --cov-branch --cov-report=term-missing"`. coverage `branch=true`, **`fail_under=100`**. `[tool.bandit] exclude_dirs=["tests"]`. `[tool.mutmut]` configured. |
| `ocx-sdk-python/pyproject.toml` | `>=3.12` | ruff `select=[E,F,W,I,B,UP,ANN,RUF,D]`, `ignore=[ANN401]`, `extend-ignore=[D105,D107]`, pydocstyle convention `google`, per-file-ignore `tests/*→[ANN,D]`, line-length 120, target `py312`. pyright `typeCheckingMode="standard"` but `strict=["src"]` (shipped code strict, tests standard). pytest `addopts=["-ra","--strict-markers"]`, `asyncio_mode="auto"`, `testpaths` include `docs`, `README.md`, `src` (Sybil doc-testing). coverage `branch=true`, **`fail_under=100`**. |
| `ocx-mirror-sdk/pyproject.toml` | `>=3.13` | ruff `select=[E,W,F,I,B,UP,ANN,RUF]`, `ignore=[ANN401]`, per-file-ignore `tests/*→[ANN]`, `_schema.py→[ALL]` (generated), line-length 120, target `py313`. pyright `typeCheckingMode="standard"` (no strict override anywhere). pytest `addopts=["-ra","--strict-markers"]`. coverage `branch=true`, **`fail_under=80`** — the lowest gate in the fleet. |
| `grimoire-lore/ruff.toml` | *(no pyproject.toml — PEP 723 scripts)* | ruff `select=[F,E,W,I,UP,B,SIM,RET,PTH,PL,RUF,S,ISC,FURB]`, `ignore=[E501,PLR0912,PLR0915,PLR0911,PLR2004]`, per-file-ignores `tests/*→[S101,PLR2004,S603]`, `.../scripts/*→[S101]`. line-length 100, target `py311`. **No pyright/mypy config anywhere** — tests are stdlib `unittest`, not pytest. |
| `ocx/ocx.toml`, `ocx-sdk-python/ocx.toml`, `ocx-mirror-sdk/ocx.toml`, `grimoire-lore/ocx.toml`, `ocx/test/ocx.toml` | — | Tool pin manifests (§4). |
| `uv.lock` × 7 (`ocx/test`, `grimoire/test`, `grimoire/.claude/tests`, `ocx/.claude/tests`, `ocx-save/test`, `index/bot`, `ocx-sdk-python`, `ocx-mirror-sdk`) | — | All git-tracked, all pass `uv lock --check` (§4). |

## 2. Divergence table

| Repo/subject | requires-python | ruff target-version | ruff families selected | line-length | Type checker | Test runner + addopts | Coverage gate |
|---|---|---|---|---|---|---|---|
| `ocx/test` | `>=3.10` | — (no ruff config) | **none** | — | **none** | pytest, `pythonpath=[".","src"]` | **none** |
| `grimoire/test` | `>=3.10` | — | **none** | — | **none** | pytest, `pythonpath=["."]` | **none** |
| `grimoire/.claude/tests` | `>=3.10` | — | **none** | — | **none** | pytest | **none** |
| `ocx/.claude/tests` | `>=3.10` | — | **none** | — | **none** | pytest | **none** |
| `ocx-save/test` | `>=3.10` | — | **none** | — | **none** | pytest, `pythonpath=["."]` | **none** |
| `index/bot` | `>=3.12` | py312 | E,F,W,I,UP,B,C4,SIM,RUF,S,ANN (11) | 100 | pyright **strict** | pytest, `--cov --cov-branch` | **100%** |
| `ocx-sdk-python` | `>=3.12` | py312 | E,F,W,I,B,UP,ANN,RUF,D (9) | 120 | pyright standard, **strict on `src`** | pytest, `-ra --strict-markers`, asyncio auto | **100%** |
| `ocx-mirror-sdk` | `>=3.13` | py313 | E,W,F,I,B,UP,ANN,RUF (8) | 120 | pyright **standard** (no strict) | pytest, `-ra --strict-markers` | **80%** |
| `grimoire-lore` (scripts) | *(none declared)* | py311 | F,E,W,I,UP,B,SIM,RET,PTH,PL,RUF,S,ISC,FURB (14) | 100 | **none** | stdlib `unittest` | **none** |

**Headline divergence**: this isn't primarily a "which families" gap between
configured projects — it's that **5 of 9 subjects run zero lint and zero type
checking**, full stop. Those 5 are the entire pytest-acceptance-harness shape
(`ocx/test` 190 files/95,419 LOC, `grimoire/test` 76/35,050, `ocx-save/test`
27/2,582) plus the two `.claude/tests` AI-config structural suites (2 files
each, 2,925 and 3,221 LOC). That's **297 of 493 files (60%)** and **~104k of
188k LOC (55%)** of everything in scope, gated by nothing but "does pytest
exit 0."

Among the 4 subjects that *do* configure ruff, family-select breadth ranges
14 (`grimoire-lore`) down to 8 (`ocx-mirror-sdk`) — a 6-family spread, none of
it overlapping perfectly (grimoire-lore selects `SIM,RET,PTH,PL,ISC,FURB` that
none of the three `pyproject.toml`-based projects select; the SDK pair
selects `ANN,D` that grimoire-lore doesn't). Coverage gates split 100% / 100%
/ 80% / none. Type-checker mode splits strict / standard-with-strict-src /
standard / none.

## 3. Ruff rule families never selected anywhere

59 rule families exist (`ruff linter`, ruff 0.16.3). 17 are selected by at
least one config (`E/W, F, I, UP, B, C4, SIM, RUF, S, ANN, D, RET, PTH, PL,
ISC, FURB` — treating the combined `E/W pycodestyle` row as one). **42 are
selected nowhere in the fleet:**

| Family | Catches |
|---|---|
| `ASYNC` | blocking calls inside `async def` (`time.sleep`, sync `open()`, sync `subprocess.run`) — directly relevant, `ocx-sdk-python` ships real asyncio code |
| `BLE` | overbroad `except Exception:` swallowing everything — directly relevant, §7 finds 20 instances |
| `TRY` | exception-handling anti-patterns (raise-from-broad, try body too large, exception message built inline) |
| `G` | logging calls built with `%`/f-string interpolation instead of lazy `%s` args (perf + eager-eval of secrets into log lines) |
| `LOG` | misuse of the `logging` module itself (`logging.warn`, root-logger calls, etc.) |
| `T20` | `print()` in library/production code — directly relevant, 57 real call sites (§7) |
| `DTZ` | naive `datetime.now()`/`utcnow()` without a timezone |
| `SLF` | reaching into another object's `_private` attribute from outside its class |
| `ARG` | unused function/method arguments |
| `EM` | exception messages inlined at `raise` instead of assigned first (adds noise to tracebacks) |
| `RSE` | unnecessary parens on a bare `raise` |
| `PT` | pytest idiom violations (bare `assert` where `pytest.raises` belongs, fixture naming) |
| `TC` | imports that should be moved behind `if TYPE_CHECKING:` |
| `TID` | banned or relative-import patterns |
| `PIE` | misc redundancies (`dict.get(k, None)`, unnecessary `else` after `return`, etc.) |
| `SIM` | *(selected by grimoire-lore only — gap for the other 8 subjects)* |
| `C90` | cyclomatic complexity ceiling (mccabe) |
| `PERF` | accidental O(n²) patterns (membership test against a list in a loop, etc.) |
| `N` | naming-convention violations (class/function/variable case) |
| `A` | shadowing a builtin (`id`, `type`, `list`, …) as a name |
| `FBT` | boolean positional args that read as noise at call sites |
| `T10` | leftover `pdb.set_trace()` / `breakpoint()` |
| `PGH` | blanket `# type: ignore` / `# noqa` with no error code attached |
| `INP` | implicit namespace package (missing `__init__.py`) |
| `TD` | `TODO` comments with no owner/ticket |
| `FIX` | `FIXME`/`XXX` markers left in |
| `ERA` | commented-out dead code |
| `FLY` | string concatenation that should be an f-string |
| `ICN` | non-conventional import aliases |
| `SLOT` | tuple/namedtuple subclasses missing `__slots__` |
| `FA` | missing `from __future__ import annotations` |
| `Q` | quote-style consistency (largely superseded by `ruff format`) |
| `COM` | missing trailing commas (also largely the formatter's job) |
| `EXE` | shebang / executable-bit mismatch on a script |
| `DOC` | docstring/signature mismatch (pydoclint) |
| `PYI` | `.pyi` stub-file issues — n/a, no stubs in scope |
| `YTT` | `sys.version`/`version_info` comparison bugs |
| `INT` | i18n/gettext misuse — n/a |
| `AIR`, `FAST`, `DJ`, `NPY`, `PD`, `CPY` | Airflow / FastAPI / Django / NumPy / pandas / copyright-header — n/a, none of those frameworks are in scope |

The rule author's actionable subset, given what §7 already found in this
codebase: **`ASYNC`, `BLE`, `TRY`, `T20`, `G`/`LOG`, `SLF`, `DTZ`, `PT`, `TC`**.

## 4. Dependency and environment management

**uv everywhere, no pip/pdm.** Every subject uses `uv` + `uv.lock`
(`requires-python` in each lock matches its `pyproject.toml` exactly — no
drift). All 7 relevant lockfiles pass `uv lock --check` with exit 0 (checked
from inside each project dir, not by mtime — mtime is meaningless after a
fresh checkout). All are git-tracked (`git ls-files`), so CI and a
contributor resolve the identical version set — verified this is real, not
aspirational, by resolving `ruff --version` per project: `index/bot`→0.15.22,
`ocx-sdk-python`→0.16.3, `ocx-mirror-sdk`→0.15.6 (three different resolved
versions — each locked and reproducible *within* its own repo, but the fleet
itself is not on one ruff version).

Tool pinning is layered: `pyproject.toml` `dev`/`optional-dependencies` set a
*floor* (`ruff>=0.7`, `pyright>=1.1`, …); `uv.lock` pins the exact resolved
version. Separately, `ocx.toml` pins the *system* toolchain (task runner,
actionlint, etc.) via `ocx.sh/<pkg>/<name>:<tag>`, resolved to a digest in the
git-tracked `ocx.lock`. Only `grimoire-lore/ocx.toml` and one entry in
`ocx/ocx.toml` (`actionlint`) use a floating `:latest` tag instead of a
major-version pin (`uv:0`, `task:3`, etc.) — **but this is not a
reproducibility gap**: `ocx.lock` resolves `:latest` to a concrete digest at
`ocx add`/`ocx update` time and `ocx run`/CI consume the lock, not the
floating tag directly, mirroring exactly how `ruff>=0.7` + `uv.lock` works.
Confirmed no drift.

Exact command a contributor runs:

| Subject | Lint/format | Type-check | Test |
|---|---|---|---|
| `ocx/test`, `grimoire/test`, `ocx-save/test`, `*/.claude/tests` | *(none exists)* | *(none exists)* | `task test` → `uv run pytest` |
| `index/bot` | `task bot:lint` → `ruff check .`, `ruff format --check .`, `pyright`, `bandit -c pyproject.toml -r src tests` | (folded into `bot:lint`) | `task bot:test` → `uv run pytest` |
| `ocx-sdk-python`, `ocx-mirror-sdk` | `task format:check` + `task lint` → `ruff format --check src tests`, `ruff check src tests` | `task types` → `uv run --extra dev pyright` | `task test` → `uv run --extra dev coverage run -m pytest` |
| `grimoire-lore` | `task lint` → `ocx run ruff -- ruff check --output-format concise .`; `task format:check` → `ruff format --check .` | *(none)* | `task test` → stdlib `unittest` |

## 5. CI inventory

| Workflow | Path | Trigger | Python versions | Commands |
|---|---|---|---|---|
| Basic Verification (acceptance job) | `ocx/.github/workflows/verify-basic.yml` | push main, PR | *(implicit — no matrix, no `setup-python`)* | `task test -- --junit-xml=results/junit.xml` (pytest only) |
| Basic Verification (acceptance job) | `grimoire/.github/workflows/verify-basic.yml` | push main, PR | *(implicit)* | same |
| Basic Verification (acceptance job) | `ocx-save/.github/workflows/verify-basic.yml` | push main, PR | *(implicit)* | same |
| Verify Deep (acceptance job) | `ocx/.github/workflows/verify-deep.yml`, `grimoire/.github/workflows/verify-deep.yml` (also ocx-save) | `workflow_dispatch` | *(implicit)* | same, cross-platform (Linux/Windows) |
| CI | `index/.github/workflows/ci.yml` | push main, PR, cron 04:00 | *(implicit — `.python-version`=3.12 read by `uv sync`)* | `task schema:validate`, `task bot:lint` (ruff+ruff format+pyright+bandit), `task bot:test` (pytest, 100% branch cov), `task bot:audit` (pip-audit), `task workflows:lint`, golden-baseline, render-check |
| mutmut | `index/.github/workflows/mutmut.yml` | cron Mon 06:00 | *(implicit)* | `uv run mutmut run` — **`continue-on-error: true`, non-blocking by design** |
| CI | `ocx-sdk-python/.github/workflows/ci.yml` | push main, PR | **explicit matrix: 3.12, 3.13, 3.14** × ubuntu/macos/windows | `task verify` (format:check, lint, types, test, cov:report), `task test:contract`, `task lint:actions`, `task lint:links`, `task secrets` |
| Acceptance | `ocx-sdk-python/.github/workflows/acceptance.yml` | push main, nightly 03:00, dispatch | *(implicit)* | `task test:acceptance` (+ nightly canary against `ocx` latest) |
| CI | `ocx-mirror-sdk/.github/workflows/ci.yml` | push main, PR, dispatch | *(implicit — **no matrix, no setup-python at all**)* | `task verify`, `task cov:xml` |
| python | `grimoire-lore/.github/workflows/python.yml` | PR/push touching `**/*.py`, `ruff.toml`, `taskfile.yml`, `ocx.toml`, `ocx.lock` | **explicit: 3.11 only** (`actions/setup-python`) | `ocx run task -- task ci` (lint, format:check, test, selftest, artifacts) |

**No CI coverage at all**: the `.claude/tests/` AI-config structural suite
(`test_ai_config.py` + `test_hooks.py`, both `ocx/.claude/tests/` and
`grimoire/.claude/tests/`) has its own `task .claude:tests` command
(`ocx/.claude/taskfile.yml:35-45`) but **no workflow anywhere invokes it** —
grepped every workflow in `ocx/.github`, `grimoire/.github`, `ocx-save/.github`
for `claude:tests`, `claude:check`, `test_ai_config`, `test_hooks`: zero hits.
(`grimoire/.github/workflows/claude.yml` and `ocx-save/.github/workflows/claude.yml`
are the unrelated Claude-Code-mention bot workflow.) `ocx-save/.claude/hooks/`
ships the same stdlib hook scripts as `ocx`/`grimoire` but has **no
`.claude/tests/` directory at all** — not "untested in CI", genuinely
untested, period.

## 6. Version reality

```
$ python3 --version            → Python 3.14.5   (system, /usr/sbin/python3)
$ uv python list                → cpython-3.14.5 (system), 3.13.12, 3.12.13, 3.11.15 (all uv-managed)
```

| Subject | requires-python | CI matrix | `uv run python --version` (this machine, no `.python-version` file) |
|---|---|---|---|
| `ocx/test`, `grimoire/test` | `>=3.10` | *(none — implicit)* | **3.14.5** |
| `ocx-save/test`, `*/.claude/tests` | `>=3.10` | *(none)* | 3.14.5 (same resolution path) |
| `index/bot` | `>=3.12` | *(none — `.python-version`=3.12)* | **3.12.13** |
| `ocx-sdk-python` | `>=3.12` | **3.12, 3.13, 3.14** | matches its own matrix floor |
| `ocx-mirror-sdk` | `>=3.13` | *(none)* | not pinned — resolves to newest available, untested against its own `>=3.13` floor specifically |
| `grimoire-lore` | *(none declared — PEP 723 scripts, comment says "3.11 is the floor")* | **3.11 only** | n/a (no uv project) |

**Disagreement, stated plainly**: `ocx/test`, `grimoire/test`, `ocx-save/test`
and both `.claude/tests` suites declare `>=3.10` as a floor, but nothing —
not `.python-version`, not a CI matrix, not `uv.lock`'s resolution — ever
exercises 3.10, 3.11, 3.12, or 3.13 against them. Locally and in CI alike,
`uv run` silently picks the newest interpreter that satisfies `>=3.10`
(3.14.5 here). **The `>=3.10` floor is declared, not verified — it has never
actually run on 3.10.** `ocx-mirror-sdk` has the same shape of gap one door
down: `requires-python>=3.13`, but CI never pins a version, so its own floor
is untested too. `ocx-sdk-python` is the only subject where declared floor,
CI matrix, and (locally) resolved interpreter all provably agree.

## 7. Runtime posture (493 files, 188,415 lines)

| Signal | Count | Worst offender / note |
|---|---|---|
| `print(` calls | 166 raw hits, **61 real** after excluding test files (105) and 4 `grep` false positives (`fingerprint(` substring match) | `index/bot/src/indexbot/cli/validate.py` (5 calls) — but every real hit is a CLI/hook writing to stdout/stderr as its actual output contract, not a library swallowing errors silently. `ocx/website/scripts/publish_doc_scripts.py` marks 6 of its 8 with `# noqa: T201` already. |
| `import logging` | 11 files | Confined to the two shipped SDKs: `ocx-sdk-python/src/ocx_sdk/{_client,_process}.py`, `ocx-mirror-sdk/src/ocx_mirror_sdk/{_pipeline,gitlab/_rest,github/_rest,github/_router,github/_graphql}.py`. Print/logging split is a clean **library-logs / CLI-prints** boundary, not a smell. |
| `warnings.warn` | 1 | `ocx-sdk-python/src/ocx_sdk/_config.py:170` |
| `asyncio` usage | 5 files | `ocx-sdk-python/src/ocx_sdk/{_client,_retry,_process}.py`, `ocx/test/bench/harness.py`, one test file. |
| Blocking call inside `async def` | **0 found** | Checked all 3 SDK async files by hand (not just grep): `_process.py`'s async paths use `asyncio.subprocess.Process`/`await proc.wait()` throughout, sync paths use `subprocess.Popen` in *separate* non-async functions. `_retry.py` explicitly forks `run_with_retry` (sync, `time.sleep`) from `run_with_retry_async` (async, `asyncio.sleep`) — a pattern worth encoding (§ Patterns). |
| `threading` | 8 files, all test fixtures or synchronization primitives | `threading.Thread(target=server.serve_forever, daemon=True)` — fake-registry/fake-forge HTTP servers backing the acceptance suites (`ocx/test/conftest.py`, `grimoire/test/tests/test_index_source.py`, etc.). Production use is `threading.Lock` (`ocx-sdk-python/src/ocx_sdk/_envmodel.py:56` — ownership guard; `_process.py` stdout/stderr pump threads). No shared-mutable-state races found. |
| `multiprocessing` | 0 | — |
| `signal.signal(` | 2 | `ocx-sdk-python/src/ocx_sdk/_process.py:714,724` — installs then restores a `SIGINT` forwarder around a child process, paired correctly. |
| `atexit` | 0 | — |
| Module-level global mutable state (`global` keyword) | 3 in shipped code | `ocx-sdk-python/src/ocx_sdk/_envmodel.py:106` (`global _active`), `ocx-mirror-sdk/src/ocx_mirror_sdk/http.py:25` (`global _CLIENT`), `ocx-mirror-sdk/src/ocx_mirror_sdk/cache.py:61` (`global _cache_root_override`) — all three are single-slot lazy-singleton caches, not free-form shared state. |
| Mutable default arguments | 0 found | Heuristic only matches single-line `def f(x=[])` signatures; a multi-line signature would be missed. |
| Bare `except:` | **0** | — |
| `except Exception:` / `except Exception as e:` | 20 | Non-test hits: `ocx/.claude/hooks/post_tool_use_tracker.py:189,303`, `stop_validator.py:65`, `subagent_stop_logger.py:93` (×2 for grimoire's byte-different twins); `ocx-sdk-python/src/ocx_sdk/_retry.py:104,159` (deliberate — feeds a `classify()` predicate, not a swallow); `ocx-mirror-sdk/src/ocx_mirror_sdk/http.py:39`; `grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py:132`. The hook ones are unannotated broad catches in stdlib-only Claude-Code hooks — hooks that fail open are arguably correct (never block the editor), but nothing marks that as intentional. |
| `assert` outside a test dir, as a runtime check | 0 in shipped `src/`, 0 in `.claude/hooks/`, 8 in `grimoire-lore`'s validator (all inside its own `--self-test`, not production path) | `ocx/test/src/assertions.py` etc. use `assert` but those *are* the acceptance harness's own assertion library — expected. |
| `os.environ` mutation | 17 raw hits, 12 real (5 are `assert os.environ[...] ==` — reads, not writes, caught by the same `=` substring) | `grimoire/test/conftest.py` (7, test-fixture registry-host swapping) and `ocx-sdk-python/src/ocx_sdk/_envmodel.py:123,133,135` — the latter *is* an env-scoping context manager; that's its entire purpose. |
| `sys.path` mutation | 31 | Two clusters: every `.claude/hooks/*.py` file (`ocx` and `grimoire`, ~9 each) inserts its own directory so the hook is runnable standalone by Claude Code's hook runner (unavoidable given no packaging); and `ocx/test/{scripts,tests,bench}/*.py` insert `_TEST_DIR`/`_WEBSITE_SCRIPTS_DIR` to reach sibling modules outside the configured `pythonpath`. |
| Star imports (`from x import *`) | **0** | — |

## Smells, ranked

1. **60% of the fleet's Python files (297/493, ~104k LOC) run no lint and no
   type checker at all** — the three pytest acceptance harnesses and both
   `.claude/tests` suites. Only pytest gates them. This is the exact defect
   class the brief named ("a verification that cannot go red") at fleet
   scale: a syntax-valid-but-wrong refactor in `ocx/test/src/helpers.py`
   (used by 190 files) has zero automated check besides "did the tests
   happen to exercise it."
2. **The `.claude/tests/` structural suite is written but never run in CI**
   — `task .claude:tests` exists, nothing calls it. `ocx-save/.claude/hooks/`
   has no test suite at all, written or otherwise, for hooks that are
   presumably copy-derived from `ocx`'s (which does have one, just unwired).
3. **`requires-python>=3.10` is declared, not verified**, for the three
   acceptance harnesses — no `.python-version`, no CI matrix; both local and
   CI resolution silently land on "whatever's newest" (3.14.5 here).
   `ocx-mirror-sdk`'s `>=3.13` floor has the identical gap.
4. **Coverage gate has no floor consistency**: 100% / 100% / 80% / *(no
   coverage measured at all)* across the 4 subjects that measure it plus the
   5 that don't measure it.
5. **Unannotated broad `except Exception:`** in 4 of the stdlib-only
   `.claude/hooks/*.py` files (duplicated across `ocx` and `grimoire`) with
   no comment marking the fail-open behavior as intentional, versus
   `ocx/.claude/scripts/review_surface.py:533`'s `# noqa: BLE001 — opening is
   a convenience, never fatal`, which does mark it. The pattern the good one
   uses should be the rule.
6. Ruff family selection has no floor across the 4 configured projects —
   `ASYNC` and `BLE`/`TRY` (the exact classes hit in #5 and the asyncio SDK)
   are selected by none of them.

## Patterns worth encoding

1. **Sync/async retry split**: `ocx-sdk-python/src/ocx_sdk/_retry.py` forks
   `run_with_retry` (blocking, `time.sleep`) from `run_with_retry_async`
   (`asyncio.sleep`), with the docstring stating explicitly that
   `RetryPolicy.sleep` is ignored on the async path because "it is a
   synchronous callable." A rule that says "never call a sync sleep/IO
   primitive from an `async def`" can cite this file as the reference
   implementation of doing it right, not just what to avoid.
2. **Lockfile-over-tag pinning discipline**: every subject uses a loose
   `pyproject.toml`/`ocx.toml` version *floor* plus a git-tracked lockfile
   that pins the resolved version — including the one place (`ocx.toml`
   `:latest`) that looks unpinned at a glance but isn't, because `ocx.lock`
   resolves it. A rule author should point at the lockfile as the
   reproducibility contract, not the manifest.
3. **`# noqa: <CODE> — <reason>`** (seen at
   `ocx/.claude/scripts/review_surface.py:533` and repeatedly in
   `ocx/website/scripts/publish_doc_scripts.py`) is the fleet's existing
   convention for a deliberate lint exception; it is inconsistently applied
   (broad `except Exception:` in hooks lacks it) but the convention itself is
   sound and worth codifying as "every suppressed rule needs an inline reason,"
   not just "every suppressed rule needs a code."
4. **Env-scoping via a context manager over ambient `os.environ` mutation**:
   `ocx-sdk-python/src/ocx_sdk/_envmodel.py` is the one place production code
   mutates `os.environ`, and it does so behind a `threading.Lock`-guarded,
   restore-on-exit context manager (not a bare `os.environ[x] = y` sprinkled
   through call sites) — worth citing as the shape a "don't mutate global
   process state" rule should point to as the escape hatch.
