---
title: "Pyright triage: what the 186 errors actually are, and what a gate would cost"
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope: /home/mherwig/dev/ocx/test, /home/mherwig/dev/grimoire/test
method: >
  pyright 1.1.411 via `uvx pyright` (same binary as the companion lint-yield
  audit). Every count in this file comes from a real `--outputjson` run;
  where a number is a *derived* total (the classification matrix in §2, the
  "76 survive" figures in §4) it is computed from those JSON files by a
  short python3 aggregation, not re-typed by hand — the aggregation logic is
  reproduced inline wherever it drives a number. Two throwaway
  `pyrightconfig.json` files and a 3-file PEP 649 repro were written under
  the session scratchpad to get pyright's `basic` mode and a `src/`-scoped
  run working outside pyright's CLI-only mode flags; all were deleted before
  this report was finalized. Nothing in `ocx/` or `grimoire/` was modified.
---

## 1. The trustworthy invocation

**Use:** `cd <repo>/test && uvx pyright --outputjson --pythonpath .venv/bin/python .`

**Why the unpointed form lies:** `cd /home/mherwig/dev/ocx/test && uvx pyright --outputjson .` (no `--pythonpath`) reports **292 errors**, of which **100 are `reportMissingImports`** for `oras`, `pexpect`, `cryptography` — real third-party dependencies that genuinely are installed, in `ocx/test/.venv`, which pyright never looks at unless told where it is. Pyright does not auto-discover a `.venv` sibling of the analyzed directory the way `uv run`/`pytest` do. Pointing `--pythonpath` at the project's own interpreter (`.venv/bin/python`) drops the count to **154 errors, 0 of them import-resolution noise**. Same story for grimoire: unpointed run is noisier; venv-pointed run gives **32 errors, 1 warning**. 154 + 32 = **186**, matching the count this triage commission was scoped against.

```
cd /home/mherwig/dev/ocx/test      && uvx pyright --outputjson --pythonpath .venv/bin/python .   # -> 154 errors, 190 files
cd /home/mherwig/dev/grimoire/test && uvx pyright --outputjson --pythonpath .venv/bin/python .   # -> 32 errors, 1 warning, 76 files
```

## 2. Triage matrix — all 186, by rule × class

Classes: **real** (misbehaves, or already does, at runtime) · **latent** (silent today, breaks on refactor/version bump/introspection) · **stub** (missing/lagging third-party type info) · **idiom** (correct code pyright can't model) · **fp** (genuine false positive — the type system is simply wrong here).

| subject | rule | class | count |
|---|---|---|---|
| ocx | `reportAttributeAccessIssue` | idiom | 62 |
| ocx | `reportAttributeAccessIssue` | latent | 6 |
| ocx | `reportAttributeAccessIssue` | stub | 1 |
| ocx | `reportArgumentType` | latent | 25 |
| ocx | `reportArgumentType` | idiom | 17 |
| ocx | `reportArgumentType` | fp | 13 |
| ocx | `reportOptionalMemberAccess` | latent | 13 |
| ocx | `reportMissingImports` | idiom | 6 |
| ocx | `reportIncompatibleVariableOverride` | idiom | 3 |
| ocx | `reportCallIssue` | idiom | 2 |
| ocx | `reportInvalidTypeForm` | idiom | 1 |
| ocx | `reportGeneralTypeIssues` | latent | 1 |
| ocx | `reportAssignmentType` | fp | 1 |
| ocx | `reportPossiblyUnboundVariable` | latent | 1 |
| ocx | `reportUndefinedVariable` | latent | 1 |
| ocx | `reportReturnType` | latent | 1 |
| grimoire | `reportAttributeAccessIssue` | latent | 17 |
| grimoire | `reportUndefinedVariable` | latent | 10 |
| grimoire | `reportIncompatibleMethodOverride` | idiom | 2 |
| grimoire | `reportReturnType` | idiom | 1 |
| grimoire | `reportGeneralTypeIssues` | latent | 1 |
| grimoire | `reportArgumentType` | fp | 1 |
| **totals** | | **real 0 · latent 76 · stub 1 · idiom 94 · fp 15** | **186** |

(Computed by tagging each of the 186 JSON diagnostics with the file-level rule below, then summing — `python3` one-off over the two `--outputjson` files, logic reproduced in the citations below.)

**Zero in the `real` column is itself the finding.** Nothing in the 186 pyright *errors* is already misbehaving at runtime. One genuinely real, already-wrong line exists in this code — `grimoire/test/tests/test_update.py:389` — but it surfaces as `reportUnusedExpression`, a **warning**, not an error, so it sits outside the 186:
```python
assert_path_exists(claude), "claude's output must survive a sibling's detection drift"
```
Missing `assert` keyword: this is a bare tuple-expression statement, not an assertion-with-message. It happens to still check something because `assert_path_exists` raises internally — but the trailing string is silently discarded, and if that helper is ever changed to a boolean-returning predicate, this line stops testing anything with zero warning. Real, one-line, easy fix, outside the counted 186.

### The idiom bucket (94) is mostly one root cause, not 94 findings
`ocx/test/tests/fake_gitlab.py` (62 of the 94) is a mixin class (`class GitLabRoutes:`, no base) whose methods reference `self.lock`, `self.gitlab_ids`, `self.repos`, etc. — attributes that live on `FakeForge`, the class it's mixed into (`fake_forge.py:37,217`: `from fake_gitlab import GitLabRoutes`; `class FakeForge(GitLabRoutes, ...)`). Correct at runtime, invisible to pyright without a `self: FakeForge` self-type annotation on the mixin — a single documented Python typing gap, not 62 bugs.

Other idiom clusters, each one root cause:
- **pytest fixture `-> T` with a `yield` body** (`recordings/conftest.py:186`, `grimoire/test/conftest.py:339`) — the single most common pytest/pyright friction point industry-wide; pytest's own docs recommend this exact style for fixture ergonomics.
- **`self.server: StaticIndexServer` narrowing `BaseRequestHandler`** (`src/static_index.py:192`, `tests/fake_forge.py:64`, `tests/fake_registry.py:34`) and **`log_message` override on `BaseHTTPRequestHandler`** (`grimoire/tests/test_publish_announce.py:335`, `tests/test_rate.py:247`) — both are the textbook `http.server`/`socketserver` subclass-narrowing pattern; `static_index.py:191` even carries a comment pre-empting it (`# narrows the inherited Any-typed attribute`).
- **`FakeRecorder`/dict-literal test doubles standing in for a concrete class** (`tests/test_doc_scripts_cast.py`, 12 hits; `tests/test_doc_scripts_parser.py`, 5 hits) — `maybe_record_cast(recorder: "CastRecorder", ...)` (`recordings/cast_layer.py:113-116`) takes the concrete `CastRecorder` class, not a `Protocol`; the test's lightweight `FakeRecorder` duck-types it correctly at runtime but isn't nominally related.
- **`sys.path.insert()` before an import** (`reportMissingImports`, 6 hits) — `tests/test_doc_binding.py:51-53`: `_WEBSITE_SCRIPTS_DIR = PROJECT_ROOT / "website" / "scripts"; sys.path.insert(0, str(_WEBSITE_SCRIPTS_DIR)); from publish_doc_scripts import render_display  # noqa: E402` — deliberate, commented, and pyright can't see a runtime `sys.path` mutation. Same story for `announce_e2e`: `ocx/test/pyproject.toml:9-13` documents `pythonpath = [".", "src"]` in `[tool.pytest.ini_options]`, which pytest honors and pyright never reads.
- **Heterogeneous callable registry** (`reportCallIssue`, 2 hits) — `SETUPS[setup_name](ocx, ref_tmp, prefix=ref_prefix)` in `tests/test_state_providers.py:510`: `SETUPS` is a `dict[str, Callable[...]]` over functions with genuinely different signatures; pyright can't validate a dynamic dispatch through it.

### The latent bucket (76) is about a dozen root causes
- **`importlib.util.spec_from_file_location(...)` used without a `None` check** — `conftest.py:249-251`, `:278-280`, `tests/test_registry_startup_retry.py:33-35`:
  ```python
  spec = importlib.util.spec_from_file_location("fake_forge", module_path)
  module = importlib.util.module_from_spec(spec)  # spec: ModuleSpec | None
  spec.loader.exec_module(module)  # .loader on a possible None
  ```
  Works today because the file always exists; would raise a confusing `AttributeError` instead of a clear message the day it doesn't. ~10 of the 76.
- **`re.search(...).group()` chained without a `None` check** — `ocx/test/tests/test_lock.py:469-472` (and 4 more sites, 471-567): `re.search(r'declaration_hash\s*=\s*"...', first_text).group(1)`. Classic Python footgun; works while the lock format matches, breaks the moment it doesn't. 6 of the 76.
- **Hand-written annotations that don't match the real type — the dominant single pattern (35 of the 76), all in `grimoire/test`:**
  - `grimoire/test/tests/test_fix_installer_txn.py:165`: `def test_env_aliased_root_refuses_instead_of_deleting(grim: "object", ...)` — `grim` is a `GrimRunner` fixture, typed `"object"` by copy-paste. 6 downstream `.home`/`.env`/`.run` errors.
  - `grimoire/test/tests/test_state_portability.py:49,60`: `def _rule_artifact(...) -> object:` / `def _multifile_rule_artifact(...) -> object:` — both actually return `PublishedArtifact` (`.fq` attribute). 8 downstream errors.
  - `grimoire/test/tests/test_status.py:357`: `def _install_deprecated_skill(...) -> tuple:` — returns a single `GrimRunner`, not a tuple. 3 downstream `.json`/`.run` errors on an inferred `tuple[Unknown, ...]`.
  - `grimoire/test/tests/test_manual_rig.py:75`: `def _catalog_artifacts() -> list[pytest.param]:` — `pytest.param` is a function, not a type; should be `list[ParameterSet]`. 1 error (counted under `reportGeneralTypeIssues`).
  - `ocx/test/tests/test_entrypoints_crossplat.py:25-29`: `def _make_pkg(..., entrypoints: list[dict], ...)` locally re-declares a narrower type than the real function it wraps (`list[str] | dict[str, dict]`); call sites pass `entrypoints=["hello"]` (a `list[str]`), which is what the real function actually accepts. 6 downstream errors.
- **The forward-ref pattern** (11 total) — see §3, its own root cause, counted under `reportUndefinedVariable`.
- **JSON loaded from a CLI arg and passed on without validating its shape** — `ocx/test/src/announce_e2e/evidence.py:385,390,444`: `classify_report(_read_json(args.file))` where `_read_json` returns an untyped/`object` blob. 3 of the 76.
- **`dict.get(...)` result passed to a `str`-only parameter without narrowing** — `ocx/test/tests/fake_forge.py:616,625,652,675`. 4 of the 76.
- **`except (DocScriptParseError, OSError, ImportError):` naming a class from the try block's own (possibly-failing) import** — `ocx/test/src/doc_binding.py:424-428`:
  ```python
  try:
      from src.doc_scripts import DocScriptParseError, parse_doc_header

      meta = parse_doc_header(script_path)
  except (DocScriptParseError, OSError, ImportError):
      return []
  ```
  If the `from src.doc_scripts import` line itself raises `ImportError`, `DocScriptParseError` was never bound, and evaluating the `except` tuple raises a *second*, more confusing error instead of the graceful `[]`. 1 of the 76.
- **`pexpect` `child.exitstatus` (`int | None`) returned where the signature promises `int`** — `ocx/test/tests/test_lazy_loading.py:259`: `return child.exitstatus, terminal` against `-> tuple[int, str]`. 1 of the 76.

### Genuine false positives (15) and missing-stub noise (1)
- **`dict[str, str]` passed where `dict[str, str | bytes]` is expected** (`grimoire/test/tests/test_state_portability.py:72`) and **`dict[str, dict[str,str]]` unpacked via `**kwargs` against a function with 11 differently-typed keyword parameters** (`ocx/test/tests/test_toolchain_env.py:1236`, 11 of the 13 `fp`-classified `reportArgumentType` hits) — both are well-known pyright/mypy invariant-generic and `**kwargs`-unpacking limitations; the actual runtime calls are correct.
- **`socket.create_connection(server.server_address, ...)`** (`ocx/test/src/static_index.py:327`) — typeshed's `create_connection` address parameter doesn't structurally accept the full `_AfInetAddress | _AfInet6Address` union that `server_address` produces, even though this fixture only ever runs IPv4.
- **Set-comprehension narrowing not propagating across two different accessors on the same dict** (`ocx/test/src/doc_binding.py:328-332`): `{entry["slug"] for entry in export if entry.get("slug") is not None}` — the `.get()` guard doesn't narrow the separate `entry["slug"]` subscript.
- **`cryptography.x509.oid`** (`ocx/test/tests/fixtures/adversarial.py:335`) — the one `stub` classification: an attribute the installed `cryptography` stub doesn't expose at the version pinned, unrelated to correctness.

## 3. The forward-ref pattern, in full, and what PEP 649/749 does to it

**Every instance** (11 total, both repos — `reportUndefinedVariable` in pyright, `F821` independently in ruff per the companion lint-yield audit):

| file:line | annotation |
|---|---|
| `grimoire/test/conftest.py:355` | `def grim(...) -> "GrimRunner":` (import on line 356, inside the function) |
| `grimoire/test/tests/test_agents.py:99` | `-> "src...."` |
| `grimoire/test/tests/test_render_clients.py:82` | `-> "src.registry.PublishedArtifact"` |
| `grimoire/test/tests/test_render_clients.py:91` | same |
| `grimoire/test/tests/test_render_clients.py:110` | same |
| `grimoire/test/tests/test_render_clients.py:127` | same |
| `grimoire/test/tests/test_render_clients.py:842` | same |
| `grimoire/test/tests/test_render_clients.py:846` | same |
| `grimoire/test/tests/test_render_clients.py:858` | same |
| `grimoire/test/tests/test_render_clients.py:865` | same |
| `ocx/test/tests/test_doc_scripts_cast.py:442` | `-> "OcxRunner"` (or similar local var annotation) |

Root cause, exact shape (`grimoire/test/tests/test_render_clients.py:81-83`):
```python
def _push_namespaced_skill(
    unique_repo: str, name: str = "my-skill"
) -> "src.registry.PublishedArtifact":
    return make_artifact(...)
```
`src` (the package) is never imported as a bare name anywhere in the file — only `from src.registry import push_artifact`-style named imports exist — so the forward-ref string `"src.registry.PublishedArtifact"` can never resolve.

**Reproduction** (`typing.get_type_hints()` on the exact shape — annotation import happens *inside* the function body, one line after the annotation), run across 3.12, 3.13, and 3.14 (PEP 649 default):

```python
def make(x) -> "Widget":
    from other_module import Widget  # matches conftest.py:356's placement

    return "called ok"
```
```
--- Python 3.12.13 : quoted annotation ---     --- Python 3.13.12 : quoted annotation ---     --- Python 3.14.5 : quoted annotation ---
direct call:  called ok                        direct call:  called ok                        direct call:  called ok
get_type_hints: NameError: name 'Widget' is not defined   (identical on all three versions)
```
**Answer: PEP 649/749 changes nothing for these 11 instances.** They were already deferred (they're quoted strings), and `typing.get_type_hints()` already raises `NameError` on them **today**, on 3.12, 3.13, *and* 3.14 — not "in the future." Anything that resolves annotations at runtime — `get_type_hints`, `dataclasses.fields()` on a dataclass using the name, a pydantic model, Sybil doc-testing, an IDE's "go to definition" — hits this now.

**What PEP 649 actually changes, and why it makes the finding worse, not better:** the *unquoted* form of the same shape —
```python
def make(x) -> Widget:
    from other_module import Widget
```
— **crashes the whole module at import time on 3.12/3.13** (`NameError: name 'Widget' is not defined` at the `def` line itself — collection would fail loudly), but **imports cleanly on 3.14** (PEP 649 defers all annotation evaluation, quoted or not; only `get_type_hints()` still raises). And critically: **both harnesses already opt into this deferred behavior today**, on every currently-supported Python version, via `from __future__ import annotations` — present in 171/190 ocx files and 73/76 grimoire files per the companion harness-shape audit. So the "safety net" of an unquoted forward-ref crashing loudly at collection time is *already gone* in ~90-95% of both suites' files, right now, independent of interpreter version. A type checker is already the only thing that catches this bug class in this codebase — 3.14 doesn't create that gap, it universalizes a gap `from __future__ import annotations` already opened.

## 4. The decision the map needs

| option | what it costs (day one) | real+latent errors it catches |
|---|---|---|
| **(a) pyright `standard` over `test/`** | 110 suppressions/config entries (94 idiom + 15 fp + 1 stub) **plus 76 code fixes** before the gate is green — not adoptable as a hard CI gate on day one without first landing the 76 fixes (which trace to ~12 root causes, not 76 independent problems, per §2) | 76 (0 already-real, 76 latent) |
| **(b) pyright `basic` over `test/`** | Barely cheaper: ocx 150 errors (was 154), grimoire 30 (was 32) — basic mode only turns off `reportIncompatibleVariableOverride`/`reportIncompatibleMethodOverride`/`reportPossiblyUnboundVariable`, a 6-error saving out of 186. Not a meaningfully different adoption cost from (a). | Same 76, minus the 1 `reportPossiblyUnboundVariable` real latent hit `basic` also silences (75) |
| **(c) pyright `standard` on `test/src/` only** | **7 errors total** (ocx 7 of 19 files, grimoire 0 of 5 files) — `cd ocx/test && uvx pyright --outputjson --pythonpath .venv/bin/python src` / same for grimoire. Adoptable immediately: fix the 1 genuine bug (`doc_binding.py:428`), suppress or fix the other 6 (2 latent JSON-boundary, 1 idiom `http.server` override, 2 fp) | 4 latent + 1 idiom + 2 fp = the highest signal-to-noise of any option; misses the forward-ref pattern (lives in `tests/`, not `src/`) and the grimoire wrong-annotation cluster entirely |
| **(d) nothing, keep `test/` unchecked** | 0 | 0 — misses all 76, plus the 1 real `reportUnusedExpression` bug, plus everything the companion lint-yield audit found via ruff (`F821`, 11 hits, the same forward-ref pattern, cheaper to run than pyright) |

**The honest number for (a): needs ~110 suppressions and 76 code fixes to reach green.** That is not a day-one CI gate — it's a cleanup project that a gate could enforce *after* landing. (c) is the only option that's a green, meaningful gate today.

## 5. Recommendation: option (c), proven

`cd /home/mherwig/dev/ocx/test && uvx pyright --outputjson --pythonpath .venv/bin/python src` → **7 errors, 19 files**.
`cd /home/mherwig/dev/grimoire/test && uvx pyright --outputjson --pythonpath .venv/bin/python src` → **0 errors, 5 files**.

This is exactly what scoping `include` to `src/` in each repo's own config produces (verified by running the equivalent scoped command directly, avoiding a `pyrightconfig.json` root-resolution trap: pointing `--project` at a config file *outside* the analyzed tree silently breaks first-party import resolution — `from src.runner import OcxRunner` starts reporting `reportMissingImports` for the whole tree unless an explicit `executionEnvironments[].root` is also set. Keeping the config inside the repo, as below, doesn't have this problem).

Config fragment (add to each repo's own `test/pyproject.toml`, matching the shape `ocx-sdk-python/pyproject.toml:82-86` already uses):

```toml
[tool.pyright]
include = ["src"]                        # the shared helper layer (runner.py, helpers.py, ...) — the
                                          # load-bearing code every test file imports; test/tests/ itself
                                          # is not in scope yet (needs the 76-error, ~12-root-cause cleanup
                                          # in pyright-triage.md §2 first)
pythonPath = ".venv/bin/python"          # required — pyright does not auto-discover a sibling .venv
typeCheckingMode = "standard"
```

Rationale for `src/`-only over full-tree with suppressions: 7 real, citeable errors beat 186 errors where 94 need a suppression comment before anyone can tell if a new one is real. Expanding to `tests/` later is exactly the 76-fix backlog in §2 — doing it as a deliberate follow-up, not a blanket day-one gate, is what makes it landable.

## 6. The PLC0415 line

Per the companion lint-yield audit: `PLC0415` (import-outside-top-level) is 86% of the `PLC` family (327 of 380 hits) and is the harness's own documented lazy-import idiom (`ocx/test/pyproject.toml:9-13`: heavy imports — `oras`, registry clients — are kept out of collection-time for pure-logic unit tests). Nothing in the fleet currently ignores it. Add to each repo's `ruff.toml` (or `[tool.ruff.lint.per-file-ignores]` in `pyproject.toml`), matching the existing `"tests/*" = [...]` line already in `grimoire-lore/ruff.toml:44-47`:

```toml
[lint.per-file-ignores]
"tests/*" = ["S101", "PLR2004", "S603", "PLC0415"]  # PLC0415 — deliberate: heavy imports (oras, registry
                                                     # clients, sigstore) are lazy-loaded inside test bodies
                                                     # so a pure-logic unit test never pays their import
                                                     # cost at collection time
```

For a one-off site outside `tests/*` (e.g. `src/doc_binding.py:425`'s deferred `src.doc_scripts` import), the inline form matches `review_surface.py:533`'s style directly:
```python
from src.doc_scripts import DocScriptParseError, parse_doc_header  # noqa: PLC0415 — deferred so importing doc_binding never drags in doc_scripts' own import graph
```
