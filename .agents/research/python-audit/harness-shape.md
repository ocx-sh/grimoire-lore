---
title: "Shape 1 audit: pytest acceptance harness (ocx/test, grimoire/test)"
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope: "/home/mherwig/dev/ocx/test, /home/mherwig/dev/grimoire/test, spot-check of ocx-sion/ocx-soraka/ocx-evelynn/ocx-mirror/ocx-mcp/ocx-save/grimoire-duo/test"
method: >
  All counts produced by find/grep/wc/python3 one-liners run directly against the
  working trees on 2026-08-22, with `grep -v -E '\.venv/|\.out/|\.ruff_cache/|target/|external/|\.agents/worktrees/|__pycache__'`
  applied to file lists before counting. Exact commands are inlined next to each
  number below (all re-runnable from the repo's `test/` dir unless a full path is
  shown). subprocess.run timeout detection used a small paren-balance scanner
  (python3, shown in section 4) rather than a regex, since call sites span
  multiple lines.
---

## 1. LOC and file count per directory

`find <dir> -name "*.py" | wc -l` and `... | xargs cat | wc -l`, both repos:

| dir | ocx files | ocx LOC | grimoire files | grimoire LOC |
|---|---|---|---|---|
| `tests/` | 149 | 84,708 | 67 | 33,739 |
| `src/` | 19 | 4,815 (3,925 excl. `announce_e2e`/`scenarios` subpkgs) | 5 | 555 |
| `scripts/` | 1 | 42 | — | — |
| `bin/` | 0 (4 non-py files) | 0 | 0 (1 non-py) | 0 |
| `scenarios/` | 0 (19 non-py, TOML fixtures) | 0 | — | — |
| `bench/` | 7 | 2,697 | — | — |
| `doc_scripts/` | 0 (62 non-py) | 0 | — | — |
| `manual/` | 0 (63 non-py) | 0 | 0 (93 non-py) | 0 |
| `recordings/` | 9 | 2,406 | 3 | 391 |
| `docker/`, `sigstore/` | 0 / 4 | 0 / 365 | — | — |
| **repo total** (`find . -name "*.py"`, excl. listed) | **190** | **95,419** | **76** | **35,050** |

ocx/test has 8 top-level dirs grimoire/test does not have at all: `bench/`, `doc_scripts/`, `scenarios/`, `docker/`, `sigstore/`, plus a `docker-compose.yml` (14K) and `zot-config.json`. grimoire/test's footprint is `tests/`, `src/`, `bin/`, `manual/`, `recordings/` only — about 40% of ocx's file count.

## 2. Test inventory

`grep -rE '^\s*(async )?def test_' tests/ | wc -l`, `grep -rE '@pytest\.mark\.parametrize' tests/ | wc -l`, `find . -name conftest.py`:

| metric | ocx | grimoire |
|---|---|---|
| test files (`test_*.py`) | 138 | 65 |
| test functions | 1,974 | 954 |
| `@pytest.mark.parametrize` uses | 53 | 24 |
| fixtures defined (`@pytest.fixture`) | 53 | 17 |
| fixture scope `session` | 9 (`conftest.py`×5, `bench/conftest.py`×2, `recordings/conftest.py`×1, `test_cosign_interop.py`×1) | 2 (`conftest.py`) |
| fixture scope `module` | 8 across 6 files | 1 (`test_login.py`) |
| conftest.py count | 4 (`./conftest.py` 386 ln, `./tests/conftest.py` 48 ln, `./bench/conftest.py` 140 ln, `./recordings/conftest.py` 335 ln) | 2 (`./conftest.py` 365 ln, `./tests/conftest.py` 64 ln) |
| custom markers declared (`pyproject.toml`) | 1 — `requires_tty` (ocx/test/pyproject.toml:14-16) | **0 — no `markers =` block exists** |
| marker usage (`@pytest.mark.X` in tests/) | skipif 93, parametrize 53, requires_tty 8, xfail 7, xdist_group 4, skip 3, filterwarnings 1 | parametrize 24, skipif 14 (no xfail/skip/xdist_group anywhere) |

grimoire declares zero custom markers yet its 14 `skipif` sites work fine (they use builtin conditions like `sys.platform == "win32"`) — it simply never needed a project-specific marker. `--strict-markers` is not set in either `pyproject.toml`, so an unregistered marker in either repo would silently pass, not fail.

### Largest 10 test files (`find tests -name "*.py" -exec wc -l {} + | sort -rn`)

ocx:
1. `tests/test_patches.py` 3,944 ln — global-slot mutation tests serialized via `xdist_group`; size is inherent to exhaustively enumerating patch/frozen-index interactions, not sprawl.
2. `tests/test_index_ocx_sh.py` 2,258 ln — end-to-end index-consumption suite; broad by design (one binary's full index-facing surface).
3. `tests/test_doc_scripts_publish.py` 1,897 ln — cohesive, one publish workflow per doc script family.
4. `tests/test_toolchain_env.py` 1,789 ln — largest cluster of no-timeout subprocess calls (§4); scope creep candidate.
5. `tests/test_project_pull.py` 1,691 ln — cohesive, pull-command matrix.
6. `tests/test_project_env.py` 1,689 ln — cohesive, env-resolution matrix.
7. `tests/test_dependencies.py` 1,667 ln — cohesive, dependency-graph matrix.
8. `tests/test_index_servable_snapshot.py` 1,657 ln — cohesive, snapshot-format matrix.
9. `tests/test_lock.py` 1,629 ln — cohesive, lockfile matrix.
10. `tests/test_self_setup.py` 1,587 ln — mixes self-update, shell-hook, and shim tests; weakest cohesion of the top 10.

grimoire:
1. `tests/test_config_registry.py` 2,010 ln — cohesive, config+registry resolution matrix (heaviest user of the `runner` local-name convention, 90 `.run(` calls).
2. `tests/test_publish_announce.py` 1,842 ln — cohesive, one publish/announce workflow.
3. `tests/test_publish.py` 1,752 ln — cohesive, publish-command matrix.
4. `tests/test_global.py` 1,672 ln — broad grab-bag by name; global-scope install matrix, moderate cohesion.
5. `tests/test_registries.py` 1,663 ln — cohesive, registry-config matrix.
6. `tests/test_config.py` 1,560 ln — cohesive, config-resolution matrix.
7. `tests/test_render_clients.py` 1,381 ln — cohesive, per-vendor render matrix.
8. `tests/test_bundles.py` 1,116 ln — cohesive, bundle-resolution matrix.
9. `tests/test_index_source.py` 1,009 ln — cohesive, index-source matrix.
10. `tests/test_rate.py` 923 ln — cohesive, rate-limit matrix.

## 3. Helper layer (`test/src/`)

Invocation abstraction: `OcxRunner.run()` / `GrimRunner.run()` — a dataclass-free class wrapping the CLI binary in `subprocess.run`, at `/home/mherwig/dev/ocx/test/src/runner.py:92-131` and `/home/mherwig/dev/grimoire/test/src/runner.py:91-114`. Tests get it via the `ocx` / `grim` fixture (aliased to a local `runner` variable in ~10 of grimoire's larger files, e.g. `tests/test_config_registry.py:442`).

Public surface (top-level `def`/`class`, `grep -nE '^def |^class '`):

| module | ocx defs | grimoire defs | notes |
|---|---|---|---|
| `runner.py` | 4 (`current_platform`, `registry_dir`, `PackageInfo`, `OcxRunner`) | 2 (`current_platform`, `GrimRunner`) | grimoire's class carries an extra isolated-`HOME`/`USERPROFILE` concern ocx's doesn't (§5) |
| `helpers.py` | 22 | 4 | ocx's `helpers.py` absorbed docker-compose control, sigstore-stack bring-up, identity-token minting, shim-dir assertions — none of which exist in grimoire |
| `registry.py` | 21 | 12 | **ocx wraps `oras.client.OrasClient`** (`src/registry.py:19`); **grimoire hand-rolls the OCI push/fetch protocol against stdlib `urllib`/`hashlib`/`tarfile`** (`src/registry.py:1-29` docstring explains why: "no extra test dependency") |
| `assertions.py` | 4 (`assert_path_exists`, `assert_dir_exists`, `assert_symlink_exists`, `assert_not_exists`) | identical 4 | **byte-for-byte identical file** (`diff` exit 0) — the only src/ module that is |
| `doc_scripts.py`, `state_providers.py`, `static_index.py`, `doc_binding.py` | 4 modules, ~2,100 LOC combined | **do not exist** | ocx-only: doc-comment parsing, fake state-provider registry, an in-process static HTTP index server, and inline-doc-block binding checks |

Import fan-out (`grep -rl "from src.<mod> import" tests/ | wc -l`): ocx `runner` 96 files, `helpers` 91, `registry` 45, `doc_scripts` 8, `shell_eval` 5, `assertions` 9, `static_index` 3, `state_providers`/`doc_binding` 2 each. grimoire: `helpers` 50, `registry` 27, `runner` 24, `assertions` 10.

**Top-level `conftest.py` diff is 694 changed lines out of ~750 total** (`diff ocx/test/conftest.py grimoire/test/conftest.py | wc -l`) — ocx's brings up docker-compose registries + a sigstore stack; grimoire's spins a stdlib-socket-based single registry via `subprocess`. This is not the same file with variable renames; it is two independently-evolved fixture files that happen to solve the same problem (give tests a registry) with different infrastructure.

**Cross-repo replication spot-check** (`find <repo>/test -name '*.py' | wc -l`, excl. venv/cache): `ocx-sion` and `ocx-soraka` both report exactly 190 files / 95,364 LOC — identical to `ocx/test` itself, i.e. these are the same tree, not independent adopters. `ocx-evelynn` is 190/96,039 (near-identical, slightly diverged). `grimoire-duo` is 68/28,580 — close to but not identical to `grimoire/test`'s 76/35,050. `ocx-mirror` (20/7,946), `ocx-save` (27/2,582), and `ocx-mcp` (5/159) are genuinely smaller products using the same `src/runner.py`-shaped abstraction at a fraction of the size. **The abstraction shape is replicated; the suite size is not — it spans two orders of magnitude (5 to 190 files) across the cited repos**, so a rule authored against ocx's 190-file suite will over-fit the smaller adopters.

## 4. Subprocess / process-control surface (load-bearing)

Counts via `grep -rn 'subprocess\.run\|subprocess\.Popen\|pexpect\.spawn\|os\.system\|shell=True' . --include='*.py'` (excl. venv/pycache):

| | ocx | grimoire |
|---|---|---|
| `subprocess.run` sites | 320 total call sites, 308 distinct `subprocess.run(` invocations found by AST-free paren scan | 27 |
| `Popen` sites | 8 | 2 |
| `pexpect.spawn` sites | 6 | 2 |
| `os.system` | 0 | 0 |
| `shell=True` | 0 | 0 |

Output capture/decode: uniformly `capture_output=True, text=True` — both `runner.py:run()` call sites (ocx `src/runner.py:117-124`, grimoire `src/runner.py:100-105`) decode via `text=True`, no manual `.decode()` anywhere in either `run()` method.

**Timeout coverage** (python3 paren-balance scan, counts a call "with timeout" only if `timeout` literally appears inside that call's argument list):
- ocx: 308 `subprocess.run(` calls, **17 carry a `timeout=` kwarg, 291 do not** (94.5% unguarded). The central abstraction itself has none: `src/runner.py:120` (`OcxRunner.run()`'s `subprocess.run(cmd, capture_output=True, text=True, env=env, input=stdin)`), so every one of the 305 `ocx.run(...)` call sites across 103 test files inherits no timeout unless the test explicitly bypasses the wrapper.
- grimoire: 27 calls, **3 carry `timeout=`, 24 do not** (89% unguarded). Same gap at the source: `src/runner.py:105` (`GrimRunner.run()`) has no timeout either, feeding 818 `.run(`/`grim.run(`/`runner.run(` call sites across the test files.

Both harnesses have a hung-process risk that lives in exactly one place per repo — the fix (if wanted) is a single default `timeout=` on the wrapper, not 291+24 individual edits.

Exit-code assertion: not via `pytest.raises` — via the wrapper's own `check=True` default (`OcxRunner.run:114-118`, `GrimRunner.run:106-110`), which raises `AssertionError(f"{binary} {args} failed (rc=...)\nstderr: ...")` on nonzero exit unless the caller passes `check=False` to inspect `result.returncode` itself. `result.returncode` is referenced 2,625 times across ocx's `tests/`.

## 5. External-dependency surface

- **docker/docker-compose**: ocx only — 12 files reference `docker` (`docker-compose.yml` 14K, `conftest.py`, `src/helpers.py:63-183` compose-up/sigstore-stack bring-up, `sigstore/wait-for-stack.py`). grimoire has **no docker-compose file**; its 4 `docker`-referencing files are about the CLI's own docker-registry *feature* being tested, not test infra — grimoire's registry fixture is a hand-rolled stdlib server (`registry.py` docstring, §3).
- **oras/registry client**: ocx depends on `oras>=0.2.42` (pyproject.toml) and wraps it in `src/registry.py:19`. grimoire has no such dependency — it re-implements push/fetch/manifest by hand against stdlib `urllib.request`.
- **sigstore/cryptography**: ocx only — `cryptography>=42`, `pyjwt[crypto]>=2.8` deps, `sigstore/` dir (4 files, 365 LOC), `src/helpers.py:126-183` (`start_sigstore_stack`), `tests/test_cosign_interop.py`. grimoire declares no crypto dependency.
- **tempfile module usage** (`grep -rn 'tempfile\.'`): ocx 10 sites, grimoire 2 (both repos rely on pytest's `tmp_path` fixture as the primary mechanism, not raw `tempfile`).
- **env mutation** (`os.environ[...] =`): ocx 2 sites, grimoire 9 sites (worst offender: `grimoire/test/conftest.py` around lines 150-174, isolating `HOME`/`USERPROFILE`/`XDG_CONFIG_HOME` for the registry-controller/xdist-worker fork boundary — see §3, ocx's equivalent isolation lives inside `OcxRunner.__init__` instead of `os.environ` mutation).
- **`monkeypatch.setenv`**: ocx 1 site, grimoire 0.

## 6. Determinism and flakiness surface

`time.sleep` sites (`grep -rn 'time\.sleep('`):
- ocx: 12 — `src/helpers.py:89` (0.5s, compose warmup), `sigstore/wait-for-stack.py:66` (1.0s poll), `src/static_index.py:296` (configurable `hold_seconds`) and `:330` (0.05s), `tests/test_project_crash_recovery.py:142` (2.0s), `tests/test_project_pull.py:1468` (1.1s), `tests/test_announce.py:1173` (7s, comment explains it waits past a 2s backoff), `tests/test_package_test_script.py:684`/`:698` (0.25s/2.0s), `tests/test_update_check_throttle.py:245` (1.1s), `bench/harness.py:760` (0.5s), `tests/test_project_concurrency.py:276` (0.5s).
- grimoire: 2 — `conftest.py:107` (0.5s) and `tests/test_login.py:145` (0.5s).

**Every ocx sleep site carries an inline comment explaining what it's waiting past** (e.g. `test_announce.py:1173`: "past the immediate probe + the first 2s backoff sleep") rather than a bare magic number — worth encoding as a rule, not just avoided.

`xdist` parallel-safety: ocx has 4 real `@pytest.mark.xdist_group` marker uses (`tests/test_doc_scripts.py:123`, `tests/test_patches.py:52`, `tests/test_frozen.py:425/462/554/627` — 4 distinct call sites all `"patch_global_slot"`) protecting tests that mutate a shared global/frozen-index slot; the rest of the suite documents *why* it's safe without a group (unique repo/tag prefixes per test, `test_state_providers.py:469-488`). grimoire has **zero** `xdist_group` marker uses; its `conftest.py` achieves xdist-safety entirely through controller/worker-only teardown logic (comments at `conftest.py:86,123,150,159,174,280,323`), not per-test grouping — a materially different strategy for the same problem, not the same pattern at smaller scale.

`skipif`/`xfail`: ocx groups skip reasons almost entirely around `sys.platform == "win32"` (10+ of the sampled 20, reasons like "bash required", "Unix launcher exec test", "POSIX executable bit has no Windows analogue") plus one Windows-only test inverted (`sys.platform != "win32"`). ocx has 7 `xfail` sites, all in behavior-pending-fix contexts (`test_index_ocx_sh.py:2005`, `test_project_config.py:416/449/484`, `test_sign.py:625`, `test_exit_codes.py:63`). grimoire's 14 `skipif` sites are the same platform-gating pattern (POSIX file mode, symlink elevation, shell-shim fixtures) but **zero `xfail`** anywhere — either grimoire has no known-broken behavior on the books, or it deletes/fixes rather than marking xfail (worth confirming with the team, not resolvable from static counts alone).

## 7. Assertion style

Raw `assert` (`grep -rn '^\s*assert ' tests/`): ocx 5,716, grimoire 3,269 — both suites are almost entirely raw asserts, not a custom DSL. The one shared helper module, `assertions.py` (§3, identical in both repos), supplies 4 filesystem-existence helpers (`assert_path_exists`/`assert_dir_exists`/`assert_symlink_exists`/`assert_not_exists`) and is imported by 9 ocx files, 10 grimoire files — a small, consistently-used slice, not the dominant style.

No `pytest_assertrepr_compare` hook in either repo (`grep -rn 'pytest_assertrepr_compare'` → 0 hits both) — failures render via pytest's default assertion rewriting only.

Substring vs whole-blob comparison against process output: substring checks (`in result.stdout` / `in result.stderr`) dominate — ocx 369 sites, grimoire 201. Whole-blob equality (`result.stdout ==` / `== result.stdout` etc.) is rare — ocx 10 sites, grimoire 9 — consistent with a CLI suite that expects to add trailing text/color codes without breaking every assertion.

## 8. Typing posture

`from __future__ import annotations` (`grep -rl`): ocx 171/190 files (90%), grimoire 73/76 files (96%) — near-universal but not enforced (no file fails to import without it; it's a style convention, not a checked gate).

No `py.typed` marker in either `test/` tree (only third-party deps under `.venv` carry one — `find . -name py.typed` hits only `.venv/lib/.../site-packages/*`).

**No ruff or pyright configuration targets `test/` in either repo**: `test/pyproject.toml` has no `[tool.ruff]`/`[tool.pyright]` section in either repo, neither `dependency-groups` list declares `ruff`/`pyright`/`mypy`, neither `test/taskfile.yml` has a lint/typecheck task, and `grep -rn 'ruff\|pyright'` over both `.github/workflows/*.yml` returns zero real hits (the only "pyright" match was `grep`'s substring hit inside the word "Copyright" in an autogenerated `dist`-tool header). The `.ruff_cache/` directories visible at both `test/` roots are therefore evidence of a developer running `ruff` ad hoc locally, not of CI enforcement — **this harness's own type/lint posture is unchecked**, in contrast to the `ocx-sdk-python` shape's `pyright strict` + 100% coverage gate.

---

## Smells, ranked

1. **No default timeout on the one call site everything routes through** — ocx `src/runner.py:120`, grimoire `src/runner.py:105`. 291/308 ocx and 24/27 grimoire `subprocess.run` calls inherit no timeout; a hung CLI process hangs CI with no bound. Single-line fix per repo, highest leverage finding in this audit.
2. **No lint/type gate over `test/` in either repo** — no `[tool.ruff]`/`[tool.pyright]` in `test/pyproject.toml`, no CI step (§8). 95k + 35k LOC of test code is unchecked by tooling despite 90-96% of files using `from __future__ import annotations` as if typed.
3. **No `--strict-markers`** in either `pyproject.toml`'s `[tool.pytest.ini_options]` — a typo'd marker name silently no-ops instead of failing collection. grimoire additionally declares **zero** markers at all (`grimoire/test/pyproject.toml`) while still using `skipif`/`parametrize`, so this is currently masking nothing there, but the ocx gap (1 declared marker, 6 marker kinds used) is real.
4. **`test_self_setup.py` (ocx, 1,587 ln)** mixes self-update, shell-hook, and shim concerns — weakest cohesion of the top-10 largest files; a split candidate if this file grows further.
5. **7 ocx `xfail` sites with no equivalent triage visible in grimoire** (`test_index_ocx_sh.py:2005`, `test_project_config.py:416/449/484`, `test_sign.py:625`, `test_exit_codes.py:63`) — worth confirming these aren't stale (an `xfail` that started passing silently keeps passing unless `strict=True` is set; not verified here whether it is).
6. **`conftest.py` is 694/750 lines different between the two repos** — this is not "the same harness, tuned"; it's two independently-built fixture layers (docker-compose+oras+sigstore vs. stdlib-only registry) that happen to expose a similarly-shaped `ocx`/`grim` runner fixture. A rule written against one repo's conftest will not transfer mechanically to the other.

## Patterns worth encoding

1. **One invocation abstraction, everything else built on top.** `OcxRunner`/`GrimRunner.run()` is the sole `subprocess.run` call site for CLI invocation (96/24 import sites, 305/818 call sites route through it). A rule enforcing "tests call the binary through the shared runner, never raw `subprocess`" would be checkable and is already >95% true in both repos.
2. **Every `time.sleep` in ocx names what it's waiting past**, not a bare number (`test_announce.py:1173`, `src/helpers.py:89`, etc.) — encode as "no unexplained sleep durations," not "no sleeps."
3. **Substring assertions over process output, not whole-blob equality** (369/201 vs 10/9) — keeps tests resilient to incidental output changes (color codes, trailing whitespace) while still being precise. Worth stating as the default assertion shape for CLI-output checks.
4. **Platform-gating via `skipif(sys.platform == "win32", reason="...")` with a real reason string**, never a bare skip — both repos, consistently, 93+14 sites.
5. **`check=True` by default on the runner, raising with `stderr` attached** — failing CLI invocations surface their own stderr in the pytest failure message without every call site needing to assert `returncode == 0` and print stderr manually. 2,625 raw `returncode` references exist for the cases that *do* need to inspect a nonzero exit deliberately (`check=False`).
6. **xdist-safety is achieved two different valid ways** (ocx: explicit `xdist_group` on the tests that share global state; grimoire: controller-only teardown logic) — a rule should require *a* documented xdist-safety story per shared-state fixture, not mandate one specific mechanism.
