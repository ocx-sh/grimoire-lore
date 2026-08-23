---
title: "Python landscape scout: recent shifts (2024-2026)"
corpus: "docs.python.org whatsnew 3.11-3.14, peps.python.org, docs.astral.sh (uv/ruff), docs.pytest.org, docs.pypi.org, packaging ecosystem writeups"
agent: scout-shifts
model: sonnet
date_researched: 2026-08-22
sources_count: 29
---

## Table of contents

1. [Use X not Y in 2026](#use-x-not-y-in-2026)
2. [Available at >=3.10 vs >=3.12 vs >=3.14](#available-at-310-vs-312-vs-314)
3. [Candidate topics](#candidate-topics)
4. [Advice that is now wrong](#advice-that-is-now-wrong)
5. [Sources](#sources)

---

## Use X not Y in 2026

| Instead of | Use | Since version | Why it matters | How to detect the stale form |
|---|---|---|---|---|
| `TypeVar("T")` + `Generic[T]` boilerplate for a generic class | `class Foo[T]: ...` (PEP 695) | 3.12 | No module-level `TypeVar`, scoping is automatic, variance is inferred | ruff `UP046` (`non-pep695-generic-class`) |
| `TypeVar("T")` + `Generic[T]` boilerplate for a generic function | `def foo[T](...) -> T: ...` (PEP 695) | 3.12 | Same as above, function scope | ruff `UP047` (`non-pep695-generic-function`) |
| `X: TypeAlias = list[int]` | `type X = list[int]` (PEP 695) | 3.12 | Native alias statement, lazily evaluated, supports its own type params | ruff `UP040` (`non-pep695-type-alias`) |
| `from typing import List, Dict, Tuple, Set` in annotations | `list`, `dict`, `tuple`, `set` (PEP 585) | 3.9 | `typing.List` etc. are soft-deprecated aliases; stdlib generics have supported subscripting since 3.9 | ruff `UP006` (`non-pep585-annotation`) / `UP035` (`deprecated-import`) |
| `typing.Union[X, Y]` | `X \| Y` (PEP 604) | 3.10 | Shorter, no import, matches runtime `isinstance` unions | ruff `UP007` (`non-pep604-annotation-union`) |
| `typing.Optional[X]` | `X \| None` (PEP 604) | 3.10 | Same rationale as Union | ruff `UP045` (`non-pep604-annotation-optional`) |
| `TypeGuard[X]` for a boolean `is_x()` narrowing helper | `TypeIs[X]` (PEP 742) | 3.13 | `TypeIs` narrows in both the `True` and `False` branch; `TypeGuard` only narrows on `True` and permits unsound results | nothing automated — grep `-> TypeGuard\[` and re-review each use |
| Overriding a base-class method with no marker | `@typing.override` (PEP 698) | 3.12 | Type checker now flags the override if the base method is renamed/removed instead of silently creating an unrelated method | nothing automated in ruff; pyright strict / ty report unmarked overrides only if you also enable `reportImplicitOverride` |
| `**kwargs: Any` on a function with a fixed keyword shape | `**kwargs: Unpack[SomeTypedDict]` (PEP 692) | 3.12 | Each keyword gets its own type instead of one blanket type | nothing automated — grep `**kwargs: Any` in public signatures |
| `from __future__ import annotations` added reflexively to every new module | Nothing, on a 3.10+ floor `X \| Y` already works at runtime; on a 3.14-only floor annotations are lazy by default (PEP 649/749) — the import is now a no-op there, not a requirement | 3.10 for the union syntax; 3.14 for default laziness | Cargo-culting the import buys nothing on either of this project's floors and creates a real gap once it becomes a `DeprecationWarning` (announced timeline: after 3.13 EOL) | nothing automated — grep the import line, then check whether the file actually needs it (forward refs to a name defined later in the same module, or PEP 604 syntax on a <3.10 floor) |
| `asyncio.get_event_loop()` to obtain/create a loop from sync code | `asyncio.run(main())` or `asyncio.Runner()` | Deprecated 3.10, raises `RuntimeError` with no running loop since 3.14 | The implicit loop-creation fallback is gone; code written against the old semantics now crashes instead of silently working | nothing automated in ruff; grep `get_event_loop(` |
| Manual `loop.run_until_complete()` / `loop.close()` boilerplate | `asyncio.run()` | 3.7, now the only sanctioned pattern once `get_event_loop()` raises | Handles loop creation, cleanup, and cancellation consistently | grep `run_until_complete(` |
| `asyncio.gather()` for a fixed set of related sub-tasks that should fail together | `asyncio.TaskGroup` | 3.11 | Structured concurrency: one failing task cancels the siblings and all errors surface as one `ExceptionGroup` instead of `gather`'s first-exception-wins | grep `asyncio.gather(` and review whether the tasks are actually independent |
| `asyncio.wait_for(coro, timeout)` wrapping one call | `async with asyncio.timeout(seconds): ...` | 3.11 | Composable, re-enters cleanly, doesn't need a fresh coroutine wrapper on retry | grep `asyncio.wait_for(` |
| Catching one exception type at a time from a fan-out of unrelated failures | `except*` / `ExceptionGroup` (PEP 654) | 3.11 | Handles multiple unrelated exceptions raised together (e.g. from a `TaskGroup`) without losing any of them | grep for `except ExceptionGroup` patterns predating 3.11, or manual review of `TaskGroup` call sites |
| Re-raising with only a message string appended | `err.add_note(...)` (PEP 678) then re-raise, or `raise NewErr(...) from err` | 3.11 | Preserves the original traceback/cause instead of losing context | grep `raise .*str(e)` |
| `datetime.utcnow()` / `datetime.utcfromtimestamp()` | `datetime.now(datetime.UTC)` / `datetime.fromtimestamp(ts, tz=datetime.UTC)` | Deprecated 3.12, still deprecated (no fixed removal) as of 3.14 | Old calls return a naive datetime that's silently wrong once compared or serialized against aware ones | ruff `DTZ003` (`call-datetime-utcnow`) / `DTZ004` (`call-datetime-utcfromtimestamp`) |
| `datetime.now()` / `date.today()` with no explicit tz | `datetime.now(tz=...)` | n/a (always been a footgun; codified by ruff) | Naive datetimes break under DST/timezone changes and can't compare against aware ones | ruff `DTZ005` (`call-datetime-now-without-tzinfo`) / `DTZ011` (`call-date-today`) |
| `tarfile.extractall()` / `extract()` with no `filter=` argument | Explicit `filter="data"` (or a custom `TarFile.data_filter`-based filter) | `filter=` added 3.12 (PEP 706), default flips from `fully_trusted` to `data` in 3.14 | The safe default doesn't exist on this project's floors (3.10/3.12); a version-dependent default is not a substitute for an explicit one, and CVE-2024-12718 / CVE-2025-4138 / CVE-2025-4330 / CVE-2025-4435 all involve tar extraction edge cases patched as late as 2025 | nothing automated — grep `extractall(` / `\.extract(` without a `filter=` argument |
| Code that assumes `multiprocessing.Pool()`/`Process()` forks and inherits process state | Explicit `multiprocessing.get_context("fork")` (or rewrite to not depend on fork's copy-on-write semantics) | Unix (non-macOS) default flips `'fork'` -> `'forkserver'` in 3.14 | Global mutable state, open file descriptors, and unpicklable objects captured by closures silently stop working once the default changes | grep `multiprocessing.Pool(\|multiprocessing.Process(\|Manager(` with no explicit `get_context(...)` |
| `class Color(str, Enum): ...` | `class Color(enum.StrEnum): ...` | 3.11 | Purpose-built mixin with correct `__str__`/`__format__`, no accidental `str` method leakage from mixin order bugs | grep `\(str, Enum\)` |
| Hand-rolled batching via `itertools.islice` in a loop, or `zip(*[iter(x)]*n)` | `itertools.batched(iterable, n)` | 3.12 (`strict=` param added 3.13) | Correct, documented, no off-by-one edge cases | grep `zip(\*\[iter(` or manual chunking helpers |
| `os.walk()` + manual `os.path.join` for recursive traversal on a `Path` | `Path.walk()` | 3.12 | Returns `Path` objects directly, same top-down/bottom-up/`onerror` semantics as `os.walk` | grep `os.walk(` in a codebase already using `pathlib` elsewhere |
| Parsing a `file://` URI by hand into a `Path` | `Path.from_uri(uri)` | 3.13 | Handles platform quirks (Windows drive letters, percent-encoding) that hand-rolled parsing gets wrong | grep manual `urllib.parse` + `Path(` combinations for `file://` |
| `import distutils` / `from distutils import ...` | `setuptools` equivalents, or stdlib (`shutil`, `sysconfig`) | distutils removed 3.12 | Import now fails outright; this is not a deprecation warning, it's a hard break | grep `import distutils\|from distutils` — will also fail at import time on 3.12+ |
| `black` for formatting | `ruff format` | ruff formatter stable since ~2023, default recommendation by 2025-2026 | Single tool for lint + format, one Rust binary, no plugin-version drift; >99.9% output-identical to black on large real-world codebases | check `pyproject.toml` for `[tool.black]` with no `[tool.ruff.format]` |
| `flake8` + a pile of flake8-* plugins | `ruff check` | ruff stable | One resolver, one config surface, no plugin compatibility matrix to maintain | check for `.flake8` / `setup.cfg [flake8]` with no `[tool.ruff]` |
| `isort` as a separate import-sorter | `ruff check --select I` (or `ruff format` for the physical sort) | ruff `I` rules stable | Same tool as the linter/formatter, one config | check for `[tool.isort]` with no `ruff` `I` selection |
| `pydocstyle` | `ruff check --select D` | ruff `D` rules stable | Same rationale | check for `pydocstyle` in dev deps with no `D` selection in `[tool.ruff.lint]` |
| `bandit` as a standalone security linter | `ruff check --select S` | ruff `S` (flake8-bandit) rules stable | Runs in the same pass as the rest of the lint suite | check for `bandit` in dev deps / CI with no `S` selection |
| `pyupgrade` as a separate pre-commit hook | `ruff check --select UP` | ruff `UP` rules stable | Same tool, same pass | check for `pyupgrade` in `.pre-commit-config.yaml` |
| `pip install -r requirements.txt` / `pip-compile` workflows | `uv add` / `uv sync` / `uv lock` | uv mainstream default 2024-2026 | One resolver used identically by CI and contributors, no separate `pip-tools` invocation, 10-100x faster installs | check for `requirements.txt` + `requirements-dev.txt` pairs with no `uv.lock` |
| `pyenv` for Python version management | `uv python install` / `uv python pin` | uv | One tool instead of two, version pin lives in `.python-version` either way | check for `pyenv` references in contributor docs with a `pyproject.toml` that already uses uv |
| `pipx install <tool>` | `uv tool install <tool>` / `uvx <tool>` | uv | Same isolated-tool-environment model, one less dependency | check contributor docs / CI for `pipx` alongside a `uv`-based project |
| Dev/test/typing extras declared as `project.optional-dependencies` (which get published and force-install the package) | `[dependency-groups]` (PEP 735) | 3.9+ compatible spec, Final Oct 2024; uv/pip support landed 2024-2025 | Dev-only groups no longer leak into the published package's installable extras | grep `optional-dependencies` for groups like `dev`, `test`, `typing` that are never meant to be installed by end users |
| Only a tool-proprietary lock file (`poetry.lock`, `Pipfile.lock`) with no interoperable export | `pylock.toml` (PEP 751) alongside or exported from the native lock | Final March 2025; uv/pip export support landing through 2025-2026 | A standard, tool-agnostic lock format other tooling (SBOM generators, CI caches) can read without vendor-specific parsers | check whether `uv export --format pylock.toml` (or equivalent) is wired into CI/release tooling |
| Long-lived PyPI API tokens stored as CI secrets for publishing | Trusted Publishing (OIDC, PEP 740 attestations) | PyPI feature since 2023, now the default recommendation | Tokens are long-lived and a favored theft target in 2025-2026 supply-chain campaigns (TeamPCP/"Shai-Hulud"-style credential-harvesting worms hit PyPI packages with tens of millions of downloads); short-lived OIDC tokens close that window | grep CI YAML for `TWINE_PASSWORD` / `PYPI_TOKEN` / `PYPI_API_TOKEN` secrets on a publish job |
| `pip-audit` as the only dependency vulnerability scan | `pip-audit` today; track `uv audit` (preview, 4-10x faster, same OSV data) for promotion out of preview | `uv audit` shipped as preview mid-2026 | Both query OSV; `uv audit` is uv-native and much faster once stable, but it's still explicitly experimental | check `uv --version` / changelog for `uv audit` graduating out of preview before switching |
| No malware/typosquat check at install time | `UV_MALWARE_CHECK=1` (uv's experimental malware/adverse-status check) | uv, preview mid-2026 | Directly targets the install-time compromise pattern used in 2026 PyPI worm campaigns | grep CI env vars for `UV_MALWARE_CHECK` |
| `pytest.warns(None)` to assert "some warning was raised" | `pytest.warns(Warning)` or a specific warning class, with `match=` | Deprecated pytest 7.0, removed 8.0 | `warns(None)` was routinely misused and silently accepted zero-match cases | ruff `PT030` (`pytest-warns-too-broad`) / `PT029` (`pytest-warns-without-warning`) |
| Nose-style `setup`/`teardown` module functions | `setup_method`/`teardown_method`, or fixtures | Deprecated pytest 7.2, removed 8.0 | Nose-style support is gone outright, not just discouraged | grep `def setup(self)` / `def teardown(self)` on a test class with no pytest fixture |
| Yield-style tests (a test function that `yield`s callables) | `@pytest.mark.parametrize` | Removed pytest 8.4 | Collection error on pytest 8.4+, not a warning | grep test functions containing bare `yield` (not `yield` inside a fixture) |
| `tmpdir` / `tmpdir_factory` fixtures (`py.path.local`) | `tmp_path` / `tmp_path_factory` (`pathlib.Path`) | `tmp_path` available a long time; `tmpdir` is soft-deprecated, kept only for legacy compat | `py.path.local` is a legacy third-party type with a different API surface than the rest of a `pathlib`-based codebase | grep `tmpdir` / `tmpdir_factory` fixture arguments — no ruff/PT rule ships this check as of 2026 |
| `pytest.importorskip("x")` relying on it catching any `ImportError` | `pytest.importorskip("x", exc_type=ImportError)` if the old broad-catch behavior is actually wanted | Narrowed to `ModuleNotFoundError`-only by default, pytest 9.1 | A skip that used to trigger on any import-time failure (e.g. a real `ImportError` from a broken transitive import) now only triggers on "module not found" and lets other import errors propagate as failures | grep `importorskip(` calls guarding something other than a plain missing-module case |
| `zip(a, b)` over sequences that must be the same length | `zip(a, b, strict=True)` | 3.10 (parameter added) | Silently truncates to the shorter sequence otherwise, hiding a length-mismatch bug | ruff `B905` (`zip-without-explicit-strict`) |
| Mutable default argument (`def f(x=[]):`) | `def f(x=None): x = x if x is not None else []` | n/a — perennial footgun, now mechanically enforced | Shared mutable state across calls | ruff `B006` (`mutable-argument-default`) |
| Bare `except:` | `except Exception:` (or a specific type) | n/a | Bare except also catches `KeyboardInterrupt`/`SystemExit` | pyflakes `E722` |
| `except Exception: pass` with no logging/handling | Log, re-raise, or narrow the exception type | n/a | Silently swallows real failures | ruff `S110` (`try-except-pass`) / `BLE001` (`blind-except`) |
| TYPE_CHECKING-guarded imports maintained by hand | Let `ruff check --select TC` move/flag them automatically | ruff `TC` rules (renamed from `TCH` in ruff 0.8.0) | Keeps runtime imports minimal without manual bookkeeping | ruff `TC001`-`TC010` |
| Blocking calls (`time.sleep`, `open()`, `requests`/`httpx` sync calls, `subprocess.run`) inside an `async def` | `asyncio.sleep`, `aiofiles`/async file I/O, an async HTTP client, `asyncio.create_subprocess_exec` | n/a — codified by ruff's flake8-async port | Blocks the entire event loop, defeating the purpose of `async def` | ruff `ASYNC251` (`blocking-sleep-in-async-function`) / `ASYNC230` (`blocking-open-call-in-async-function`) / `ASYNC210` (`blocking-http-call-in-async-function`) / `ASYNC220`-`ASYNC222` (blocking subprocess calls) |

---

## Available at >=3.10 vs >=3.12 vs >=3.14

Shape 1 (pytest black-box harnesses) floors at `>=3.10`. Shape 2 (`ocx-sdk-python`) floors at `>=3.12`. Neither shape's floor reaches 3.13 or 3.14 yet, even though shape 2 ships 3.13/3.14 classifiers — those versions are supported, not required, so 3.13/3.14-only features need a guard or `typing_extensions` fallback to be used unconditionally.

| Feature | Landed | Native on shape 1 floor (>=3.10)? | Native on shape 2 floor (>=3.12)? | Notes |
|---|---|---|---|---|
| `X \| Y` union syntax at runtime | 3.10 | Yes | Yes | No `__future__` import needed on either floor |
| `except*` / `ExceptionGroup` (PEP 654) | 3.11 | Yes | Yes | |
| `BaseException.add_note()` (PEP 678) | 3.11 | Yes | Yes | |
| `tomllib` | 3.11 | Yes | Yes | |
| `enum.StrEnum` | 3.11 | Yes | Yes | |
| `asyncio.TaskGroup` / `asyncio.timeout()` | 3.11 | Yes | Yes | |
| `typing.Self` (PEP 673) | 3.11 | No — needs `typing_extensions.Self` | Yes | |
| `TypeVarTuple` / `Unpack` for variadic generics (PEP 646) | 3.11 | No — needs `typing_extensions` | Yes | |
| `typing.LiteralString` (PEP 675) | 3.11 | No — needs `typing_extensions` | Yes | |
| PEP 695 `class Foo[T]` / `def foo[T]` / `type X = ...` | 3.12 | No | Yes | |
| `@typing.override` (PEP 698) | 3.12 | No — needs `typing_extensions.override` | Yes | |
| `Unpack[TypedDict]` for `**kwargs` (PEP 692) | 3.12 | No — needs `typing_extensions` | Yes | |
| `itertools.batched` | 3.12 | No | Yes (`strict=` only from 3.13) | |
| `Path.walk()` | 3.12 | No | Yes | |
| `tarfile` `filter=` argument exists (default still `fully_trusted`) | 3.12 | Yes, but must pass it explicitly | Yes, but must pass it explicitly | Safe default doesn't arrive until 3.14 |
| `distutils` removed | 3.12 | n/a — must not import it | n/a — must not import it | Hard `ImportError`, not a warning |
| `TypeVar`/`ParamSpec`/`TypeVarTuple` `default=` (PEP 696) | 3.13 | No | No — needs `typing_extensions` | |
| `TypeIs` (PEP 742) | 3.13 | No | No — needs `typing_extensions` | |
| `ReadOnly` TypedDict qualifier (PEP 705) | 3.13 | No | No — needs `typing_extensions` | |
| `@warnings.deprecated` (PEP 702) | 3.13 | No | No — needs `typing_extensions.deprecated` | |
| `Path.from_uri()` | 3.13 | No | No | Only on the 3.13/3.14 versions the SDK also ships against, not the floor |
| Free-threaded build (PEP 703), experimental | 3.13 | N/A — build-time flag, not a language feature to code against | N/A | Relevant to CI build matrix decisions, not to source code |
| Deferred annotation evaluation by default (PEP 649/749) | 3.14 | No — annotations still eager unless `from __future__ import annotations` is used | No — same | `from __future__ import annotations` is still meaningful on both current floors |
| `t"..."` template strings (PEP 750) | 3.14 | No | No | |
| Free-threading officially supported (PEP 779) | 3.14 | N/A | N/A | |
| `multiprocessing`/`ProcessPoolExecutor` default flips to `forkserver` on Unix | 3.14 | No — still defaults to `fork` below 3.14 | No — same | Code relying on fork semantics keeps working today but should not assume it will forever |
| `tarfile` extraction default flips to `filter="data"` | 3.14 | No — still `fully_trusted` below 3.14 | No — same | |
| PEP 728 `TypedDict(extra_items=...)` / `closed=True` | 3.15 (not yet released) | No | No | Usable today only via `typing_extensions` |

---

## Candidate topics

Every row below is a QUESTION for the rule-writing phase, not a settled answer. "Already covered?" is `no` for all — this is wave one for Python.

| Topic (as a question) | Why it matters | Source | Already covered? | Priority / shape |
|---|---|---|---|---|
| Should new 3.12+-floor code (shape 2) be required to use PEP 695 generic syntax instead of `TypeVar`+`Generic`? | Direct stale-idiom risk — an LLM trained pre-2024 defaults to the old form | whatsnew 3.12, PEP 695 | no | HIGH — shape 2 |
| Should `from __future__ import annotations` be banned, mandated, or left to author discretion, and does the answer differ between shape 1's 3.10 floor and shape 2's 3.12 floor? | Explicitly flagged as commonly answered with stale advice; PEP 649/749 changed the calculus for 3.14 but neither floor reaches 3.14 | whatsnew 3.14, PEP 649, PEP 749 | no | HIGH — shapes 1 & 2 |
| Should `asyncio.get_event_loop()` be an outright-forbidden call across all shapes given it now raises `RuntimeError`? | Correctness break, not just a style issue, once code lands on 3.14 | whatsnew 3.14 (Removed: asyncio) | no | HIGH — shapes 1 & 2 |
| Should `asyncio.TaskGroup` + `asyncio.timeout()` be the mandated replacement for `gather()`/`wait_for()` in the async SDK's concurrent request code? | Structured concurrency changes failure semantics, not just syntax | whatsnew 3.11, PEP 654 | no | HIGH — shape 2 |
| Should `except*`/`ExceptionGroup` be mandated for the SDK's fan-out error handling, given shape 1's 3.10 floor can't use it at all? | A rule usable on only one of the two floors needs explicit floor-gating in how it's authored | PEP 654 | no | MEDIUM — shape 2 only |
| Should `TypeIs` replace `TypeGuard` in the SDK's runtime type-narrowing helpers? | `TypeIs` narrows both branches and is the now-preferred form, but needs `typing_extensions` below 3.13 | PEP 742 | no | MEDIUM — shape 2 |
| Should `@typing.override` be mandated on every subclass method override, given pyright strict is already configured for the SDK? | Catches silent "orphaned override" bugs when a base method is renamed | PEP 698 | no | MEDIUM — shape 2 |
| Should `Unpack[TypedDict]` replace `**kwargs: Any` across the SDK's public API surface? | Precision gain for a 100%-coverage, strict-typed library | PEP 692 | no | MEDIUM — shape 2 |
| Is free-threading (3.13 experimental / 3.14 officially supported) relevant to any of the four shapes today, or is it a "watch, don't adopt" item for 2026? | None of the four shapes look CPU-bound-multithreaded from their description; adopting free-threading advice prematurely could be pure noise | PEP 703, PEP 779, real-world benchmarks | no | LOW/WATCH — all shapes |
| Should the pytest black-box harness repos (shape 1) standardize on `pytest-xdist` or evaluate `pytest-run-parallel` for thread-safety smoke-testing? | These are different tools for different goals (wall-clock speed vs. thread-safety detection); conflating them in a rule would mislead | pytest-xdist, pytest-run-parallel, py-free-threading.github.io | no | MEDIUM — shape 1 |
| Should `tmp_path`/`tmp_path_factory` be mandated over `tmpdir`/`tmpdir_factory` across every repo's test suite, and is there any automated way to enforce it? | No ruff/PT rule currently exists for this — a rule here would need to be a grep-based check, not a lint-integration one | pytest docs/deprecations | no | MEDIUM — shape 1 & 2 |
| Should `pytest.warns(None)`-style overly-broad assertions be banned given ruff already has `PT029`/`PT030` for it? | Mechanically enforceable today, cheap win | ruff PT rules, pytest deprecations | no | MEDIUM — shape 1 & 2 |
| Does `pytest.importorskip`'s narrowed default (`ModuleNotFoundError`-only since 9.1) change any existing optional-dependency skip pattern across the repos? | A behavior change that could silently stop skipping tests it used to skip | pytest 9 changelog | no | LOW — shape 1 & 2 |
| Should snapshot testing (`syrupy` or `inline-snapshot`) be introduced for CLI-output-asserting harness tests, or is that out of scope for an editing-time rule set? | Bears directly on shape 1's "pytest black-box harness driving Rust CLIs" description | syrupy docs, inline-snapshot / pydantic.dev article | no | LOW/OUT-OF-SCOPE? — shape 1 |
| Should every repo require PyPI Trusted Publishing (OIDC) instead of API-token CI secrets for publish jobs, including this repo's own `--announce` publish workflow? | Directly actionable, security-relevant, and self-referential to grimoire-lore's own release pipeline | docs.pypi.org trusted publishing, PEP 740 | no | HIGH — meta/tooling, all shapes |
| Should `uv audit` (still preview/experimental) be adopted now, or does `pip-audit` remain the safer default until it graduates? | Rule sets that recommend a preview feature as a hard requirement risk churn when the feature's shape changes | astral.sh/blog/uv-audit, pip-audit | no | MEDIUM — all shapes |
| Should `UV_MALWARE_CHECK=1` be turned on by default in CI given 2026's PyPI credential-harvesting campaigns hit packages with tens of millions of downloads? | Directly responsive to a live, dated threat class rather than a hypothetical one | 2026 supply-chain incident reporting (CSOonline, Security Boulevard) | no | HIGH — all shapes |
| Should `pyrefly` be evaluated as a second type checker alongside pyright strict for the SDK, given it hit stable 1.0 in May 2026 and is dramatically faster on large codebases? | Concrete tooling decision with a real 2026 status change (not speculative) | pyrefly 1.0 announcement coverage | no | MEDIUM — shape 2 |
| Should `ty` be tracked but explicitly NOT adopted yet, given it's still beta/alpha and not CI-grade as of 2026? | Prevents a rule from prematurely recommending a tool not ready for enforcement | ty beta coverage (InfoWorld et al.) | no | LOW/WATCH — shape 2 |
| Should ruff's `TC` (type-checking import) rules be mandated to auto-manage `TYPE_CHECKING`-guarded imports across all four shapes? | Cheap, mechanical, uniformly applicable regardless of Python floor | ruff TC rules (renamed from TCH) | no | MEDIUM — all shapes |
| Should multiprocessing-using code anywhere in the four shapes be audited now for the fork-to-forkserver default flip landing in 3.14, even though no floor reaches 3.14 yet? | Forward-looking; a rule that prevents "fork-only" assumptions today avoids a break when floors eventually move | whatsnew 3.14 (multiprocessing) | no | MEDIUM/FORWARD-LOOKING — shape 1 & 4 |
| Should `tarfile.extractall()` calls in the CLI-driving harnesses (which plausibly unpack test fixtures or downloaded artifacts) be required to pass an explicit `filter=` today, ahead of the 3.14 default flip? | Security-relevant and independent of Python floor — the unsafe default exists right now on both floors | PEP 706, whatsnew 3.12/3.14, tarfile CVEs 2024-12718/2025-4138/2025-4330/2025-4435 | no | HIGH — shape 1 & 4 |
| Should the stdlib-only single-file tools (shape 4) be barred from PEP 695/PEP 604 syntax because "stdlib-only" doesn't specify a floor, or does this project need to define one for shape 4? | Shape 4 has no documented `requires-python` floor unlike shapes 1/2 — a real gap the rule set needs to resolve before writing floor-gated rules | project context | no | HIGH — shape 4 (blocks writing any floor-gated rule for this shape) |
| Should `[dependency-groups]` (PEP 735) replace `project.optional-dependencies` for dev/test/typing extras across all repos? | Directly fixes the "dev deps leak into published extras" problem uv-based repos commonly hit | PEP 735 | no | MEDIUM — all shapes |
| Should a `pylock.toml` export be wired into CI/release tooling alongside the native `uv.lock`, or is that solving a problem nobody here has yet? | PEP 751 is Final but adoption/tooling support is still landing through 2025-2026 | PEP 751 | no | LOW — all shapes |
| Should `enum.StrEnum` replace the `class Foo(str, Enum):` pattern likely present in CLI arg-parsing code across the harnesses? | Cheap, mechanical, directly detectable by grep | whatsnew 3.11 | no | MEDIUM — shape 1 & 4 |
| Should `Path.walk()` replace `os.walk()` + manual join wherever a repo already imports `pathlib`? | Consistency win, but only on the shape 2 floor (3.12); not available on shape 1's 3.10 floor | whatsnew 3.12 | no | LOW — shape 2 only |
| Does PEP 750's t-strings have any real adoption case in a CLI-driving test harness that builds shell commands, or is it too new/provisional in practice to mandate in 2026? | Explicitly asked in the brief; needs an honest "not yet" answer if that's what the evidence supports | PEP 750 | no | LOW/WATCH — shape 1 & 4 |
| Should Sybil doctests in `ocx-sdk-python` be reviewed against PEP 649's deferred-annotation behavior (`get_type_hints`/`annotationlib` changes)? | The SDK's doctest suite is exactly the kind of introspection-heavy code PEP 649 changes the rules for | PEP 649, PEP 749 | no | LOW — shape 2 |
| Should `coverage fail_under=100` be re-examined for how it interacts with any future free-threaded/parallel test run mode? | Speculative given free-threading isn't yet clearly relevant to this project (see the free-threading question above) | pytest-run-parallel, py-free-threading.github.io | no | LOW/SPECULATIVE — shape 2 |
| Should contributor docs across all repos be swept for lingering `pipx`/`pyenv`/`pip install` instructions now that uv is standard? | Documentation-hygiene rather than a code rule, but affects whether new-contributor guidance contradicts the rule set | docs.astral.sh/uv | no | LOW — all shapes |
| Should `pre-commit` (with `pre-commit-uv`) remain the CI gate, or does `uv run` directly (skipping pre-commit entirely) better match this project's "resolved through a runner so CI and a contributor get identical versions" constraint? | Directly bears on the stated tooling philosophy | 2026 pre-commit/uv integration coverage, prek | no | MEDIUM — meta/tooling, all shapes |
| Should `zip(..., strict=True)` be mandated wherever two same-length sequences are zipped, given it's already a ruff-enforceable rule (`B905`)? | Cheap, mechanical, zero-controversy — a good candidate for an easy-win rule | whatsnew 3.10, ruff B905 | no | MEDIUM — all shapes |

---

## Advice that is now wrong

- **"Add `from __future__ import annotations` to every new module as a matter of habit."** On this project's actual floors (3.10 and 3.12), the import is still meaningful for forward references, but PEP 649/749 (`docs.python.org/3.14/whatsnew/3.14.html`, `peps.python.org/pep-0649`, `peps.python.org/pep-0749`) made deferred evaluation the *default* on 3.14, so the reflexive add-it-everywhere habit is now the wrong default reasoning even where it happens to still be harmless — and PEP 749 states it will eventually become a `DeprecationWarning` and later a `SyntaxError`.
- **"Use `asyncio.get_event_loop()` to grab a loop from synchronous code."** Since 3.14 this raises `RuntimeError` when there's no running loop instead of silently creating one (`docs.python.org/3.14/whatsnew/3.14.html`, Removed: asyncio). Use `asyncio.run()` or `asyncio.Runner()`.
- **"Format with `black`."** `ruff format` (`docs.astral.sh/ruff/formatter`) is a stable, near-identical drop-in replacement and the current default recommendation for new setups; `black` isn't wrong, but it's no longer the obvious first choice.
- **"Type-check with `mypy` first, everything else is optional."** This project already doesn't use mypy. Beyond that, the 2026 landscape shifted: Pyrefly (Meta) reached stable 1.0 in May 2026 and is dramatically faster than Pyright on large codebases; `ty` (Astral) is real but still beta/alpha and not CI-grade yet. "mypy-first" is stale on both counts.
- **"Package with `setup.py`."** `distutils` was removed outright in 3.12 (`docs.python.org/3/whatsnew/3.12.html`, Removed), and `setuptools` is no longer pre-installed in venvs by default — `pyproject.toml` + a modern build backend is the only unqualified-safe answer now.
- **"Annotate with `typing.List`/`Dict`/`Tuple`."** Soft-deprecated since PEP 585 landed in 3.9; `list`/`dict`/`tuple` have supported subscripting ever since. Mechanically flagged by ruff `UP006`/`UP035`.
- **"Use `datetime.utcnow()` to get a UTC timestamp."** Deprecated since 3.12 and still deprecated (no fixed removal version) as of 3.14 (`docs.python.org/3/whatsnew/3.12.html`); it returns a *naive* datetime that silently misbehaves once compared against timezone-aware ones. Use `datetime.now(datetime.UTC)`.
- **"`import pkg_resources` for runtime package metadata."** `pkg_resources` is legacy `setuptools` API; `importlib.metadata` has been in the stdlib since 3.8 and is the current answer, reinforced by `setuptools` no longer being guaranteed present in a venv (`docs.python.org/3/whatsnew/3.12.html`).
- **"Use `TypeGuard` for any `is_x()`-style boolean narrowing helper."** `TypeIs` (PEP 742, 3.13) is now the generally-preferred form because it narrows both the `True` and `False` branches and disallows unsound results; `TypeGuard` is kept only for its narrower, more permissive use case.
- **"Extracting a tar archive with default settings is fine."** The safe `filter="data"` default doesn't land until 3.14 (`docs.python.org/3.14/whatsnew/3.14.html`, PEP 706); on this project's floors the default is still the permissive one, and CVE-2024-12718 / CVE-2025-4138 / CVE-2025-4330 / CVE-2025-4435 show the extraction-safety story kept changing through 2025. Always pass `filter=` explicitly.
- **"`pip install -r requirements.txt` is the standard, uncontroversial workflow."** `uv` (`docs.astral.sh/uv`) has displaced pip/pip-tools/pipx/poetry/pyenv/virtualenv as the default recommendation across new Python tooling as of 2024-2026.
- **"Generic classes/functions need `TypeVar` + `Generic[T]` boilerplate."** PEP 695 (3.12) syntax (`class Foo[T]`, `def foo[T]`, `type X = ...`) replaces it, with ruff auto-fixes (`UP046`/`UP047`/`UP040`) for the mechanical cases.
- **"`multiprocessing.Pool()`/`Process()` on Linux always forks and shares process state."** True today on both this project's floors, but 3.14 flips the Unix (non-macOS) default to `'forkserver'` (`docs.python.org/3.14/whatsnew/3.14.html`); code that implicitly depends on fork's copy-on-write semantics needs an explicit `get_context("fork")` to keep working once floors move.
- **"Long-lived PyPI API tokens in CI secrets are the standard way to publish."** Trusted Publishing / OIDC (`docs.pypi.org/trusted-publishers`, PEP 740) is now the recommended default, and 2026's PyPI credential-harvesting campaigns against widely-used packages are a live argument for why static tokens are the weaker choice.
- **"`tmpdir`/`tmpdir_factory` are the normal pytest fixtures for temp directories."** `tmp_path`/`tmp_path_factory` (returning `pathlib.Path`) are preferred; `tmpdir` (returning legacy `py.path.local`) is kept only for backward compatibility.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://docs.python.org/3/whatsnew/3.11.html | Official What's New | 3.11, released Oct 2022 | Exception groups, `tomllib`, TypeVarTuple/Self/LiteralString, `enum.StrEnum`, asyncio TaskGroup/timeout — primary source for §1 of this scout |
| https://docs.python.org/3/whatsnew/3.12.html | Official What's New | 3.12, released Oct 2023 | PEP 695 syntax, `distutils` removal, `itertools.batched`, `Path.walk`, `@override`, `Unpack[TypedDict]` |
| https://docs.python.org/3/whatsnew/3.13.html | Official What's New | 3.13, released Oct 2024 | Free-threading (experimental), TypeVar defaults, TypeIs, ReadOnly, `@warnings.deprecated`, new REPL |
| https://docs.python.org/3.14/whatsnew/3.14.html | Official What's New | 3.14, released Oct 2025 | PEP 649/749 deferred annotations, t-strings, free-threading officially supported, multiprocessing/tarfile default changes — fetched as raw HTML and grepped directly for the Deprecated/Removed sections after the summarizing fetch truncated them |
| https://peps.python.org/pep-0703/ | PEP (Final) | Accepted 2023 | Free-threading rationale, `Py_GIL_DISABLED`, rollout phases through 3.16-3.18 |
| https://peps.python.org/pep-0779/ | PEP (Final) | 2025, targets 3.14 | Criteria for "officially supported" free-threading status, performance/memory targets |
| https://peps.python.org/pep-0695/ | PEP (Final) | 3.12 | Canonical spec for the new generic/type-alias syntax |
| https://peps.python.org/pep-0696/ | PEP (Final) | 3.13 | Type parameter defaults |
| https://peps.python.org/pep-0698/ | PEP (Final) | 3.12 | `@override` decorator rationale and semantics |
| https://peps.python.org/pep-0692/ | PEP (Final) | 3.12 | `Unpack[TypedDict]` for precise `**kwargs` typing |
| https://peps.python.org/pep-0742/ | PEP (Final) | 3.13 | `TypeIs` vs `TypeGuard` |
| https://peps.python.org/pep-0705/ | PEP (Final) | 3.13 | `ReadOnly` TypedDict qualifier |
| https://peps.python.org/pep-0728/ | PEP (Final, not yet released) | targets 3.15 | Typed extra items / closed TypedDicts |
| https://peps.python.org/pep-0649/ | PEP (Final) | 3.14 | Deferred annotation evaluation, explicit statement that it supersedes PEP 563 |
| https://peps.python.org/pep-0749/ | PEP (Final) | 3.14 | `annotationlib` module, the actual `from __future__ import annotations` deprecation timeline |
| https://peps.python.org/pep-0750/ | PEP (Final) | 3.14 | t-strings, safe-string-construction rationale and examples |
| https://peps.python.org/pep-0654/ | PEP (Final) | 3.11 | `except*`/`ExceptionGroup` semantics and restrictions |
| https://peps.python.org/pep-0702/ | PEP (Final) | 3.13 | `@warnings.deprecated` |
| https://peps.python.org/pep-0735/ | PEP (Final) | Oct 2024 spec | `[dependency-groups]` |
| https://peps.python.org/pep-0751/ | PEP (Final) | Mar 2025 spec | `pylock.toml` lock-file standard |
| https://peps.python.org/pep-0740/ | PEP (Final, historical/migrated) | Jul 2024 | Index attestations; now superseded operationally by PyPA specs + PyPI docs |
| https://docs.astral.sh/uv/ | Official uv docs | current, 2026 | What uv replaces, `uv tool` vs pipx, confirms no built-in audit in the base docs (see `uv audit` blog post below) |
| https://docs.astral.sh/ruff/formatter/ | Official ruff docs | current, 2026 | Documented black-divergence list (f-strings, extra config surface, method-chain layout) |
| https://docs.astral.sh/ruff/faq/ | Official ruff docs | current, 2026 | Which legacy tools ruff's rule families replace |
| https://docs.astral.sh/ruff/rules/ (individual rule pages: `non-pep695-generic-class`, `non-pep695-generic-function`, `non-pep695-type-alias`, `non-pep585-annotation`, `non-pep604-annotation-union`, `non-pep604-annotation-optional`, `deprecated-import`) | Official ruff rule reference | current, 2026 | Ground truth for every exact rule code cited in the "Use X not Y" table — fetched individually after a full-list fetch proved unreliable/truncated |
| https://docs.pypi.org/trusted-publishers/ | Official PyPI docs | current, 2026 | Trusted Publishing mechanics and why it replaces API tokens |
| https://docs.pytest.org/en/stable/deprecations.html | Official pytest docs | current, 2026 | Ground truth for pytest deprecation/removal versions (nose-style, yield tests, `pytest.warns(None)`, `importorskip`) |
| https://astral.sh/blog/uv-audit | Astral engineering blog | 2026 | `uv audit` / `UV_MALWARE_CHECK` preview announcement, direct from the tool's own maintainers |
| https://py-free-threading.github.io/testing/ | Community free-threading guide (CPython-core-dev-adjacent) | 2025-2026 | `pytest-run-parallel` purpose and usage, distinct from `pytest-xdist` |
| https://anyio.readthedocs.io/en/stable/testing.html | Official AnyIO docs | current, 2026 | AnyIO's own pytest plugin, and the documented conflict with pytest-asyncio auto mode |
| https://syrupy-project.github.io/syrupy/ | Official syrupy docs | current, 2026 | Snapshot-testing plugin semantics (fails on missing snapshot, matchers for non-deterministic data) |

Secondary/dated-blog sources used only for triangulating a fast-moving 2026 status claim (free-threading real-world benchmarks, `ty`/Pyrefly maturity, and the 2026 PyPI supply-chain incident pattern), never as the sole source for a version number or PEP claim: multiple 2026 free-threading benchmark writeups (Medium/personal blogs, cross-checked against each other for the "~5-10% single-thread overhead, 2-4x multi-core speedup" range); InfoWorld's `ty` beta coverage; danilchenko.dev's Pyrefly/ty/mypy comparison; CSOonline and Security Boulevard's 2026 PyPI supply-chain-campaign reporting; pydevtools.com's `pre-commit-uv`/`sync-with-uv` coverage; dasroot.net's `prek` writeup.
