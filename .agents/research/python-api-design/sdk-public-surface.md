---
title: Designing, Typing, and Evolving a Public Python API
topic: python-api-design
agent: dive-python-api-design
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 18
scope: >
  Public API surface of /home/mherwig/dev/ocx-sdk-python (src/ocx_sdk, 13 files,
  7,921 LOC, requires-python >=3.12, pyright strict on src, ruff+pydocstyle,
  coverage fail_under=100, Sybil doc-snippet execution, zero runtime deps,
  v0.1.0, Apache-2.0), contrasted against /home/mherwig/dev/index/bot
  (93 files, 20,542 LOC, pyright full strict, application not library).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [What is public](#1-what-is-public)
   2. [Signature design that survives](#2-signature-design-that-survives)
   3. [Types at the boundary](#3-types-at-the-boundary)
   4. [Errors as API](#4-errors-as-api)
   5. [Evolution and deprecation](#5-evolution-and-deprecation)
   6. [Docstrings as contract](#6-docstrings-as-contract)
   7. [Stability mechanics](#7-stability-mechanics)
   8. [What an LLM gets wrong](#8-what-an-llm-gets-wrong)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Applied to the SDK](#applied-to-the-sdk)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- The SDK's three definitions of "public" (no-underscore convention, `__all__`, actually-importable) disagree in exactly **one** place today: `ocx_sdk.PackageNotFoundError` leaks from `__init__.py:28` because it's imported without `as` or `__all__` membership — verified independently by a `vars(module)` diff and by pyright's `reportPrivateImportUsage` against an isolated consumer project.
- `import X as Y` only re-exports when `Y == X` (redundant alias); a plain `from .x import Y` re-exports **only** via `__all__` — this rule is identical for `.py` and `.pyi` under the typing spec, not stub-only as commonly assumed.
- `reportPrivateImportUsage` defaults to **error** in pyright's basic, standard, *and* strict modes — it fires for any consumer, not just strict ones — but `reportDeprecated` defaults to **none** in basic/standard and only **error** in strict, so a `@deprecated` marker is silently invisible to most downstream consumers unless they too opt into strict.
- The SDK's `UNSET` sentinel (`_client.py:127-145`) is the correct current form: a private single-member `Enum`, a `Final` alias to its member, and `Literal[_Unset.TOKEN]` folded into the public type alias — this is genuinely awkward to discover but is exactly what PEP 586 `Literal` was built to carry (enum members are valid `Literal` arguments).
- `ruff --select FBT001,FBT002` finds exactly 5 hits in the SDK — all five are on underscore-prefixed private helpers; the entire public surface already keeps booleans keyword-only. Selecting FBT project-wide would cost nothing and lock in the discipline for future additions; it currently catches zero true API smells because there are none left to catch.
- `ruff --preview --select DOC` (pydoclint) finds 122 hits, but 40 of them (`DOC502`) are false positives on `_retry.py`'s two functions that correctly document a generic re-raised `Exception` — ruff's static analysis can't see through the `raise` inside a broad `except`. Only `DOC501` (7 hits, missing-exception) looks trustworthy today; `DOC201` (75 hits, missing-Returns) is noise against Google convention, which permits omitting Returns when it's obvious. Verdict: not ready to select wholesale.
- `griffe check ocx_sdk -s src` against the only tag (`v0.1.0`) is clean today, and genuinely catches a full symbol removal (`Public object was removed`) — but it does **not** catch a name silently dropping out of `__all__` while remaining importable, so it cannot substitute for the "three definitions agree" check above.
- The exit-code ↔ exception 1:1 mapping (`ExitCode` IntEnum + `_EXIT_CODE_ERRORS` dict, `_errors.py:28-48,304-317`) is real and complete (verified: every non-generic `ExitCode` member has a mapped `OcxProcessError` subclass) — but it is a *reverse* lookup the SDK genuinely needs (an external process hands back a bare int, and the SDK must pick a class), unlike `index/bot`'s `errors.py`, which only needs the *forward* direction (application code already knows which exception to raise, so `_exit_code` lives as a class attribute with no external table). The pattern looks identical on the surface; the coupling it buys is not — do not port bot's flat class-attribute style onto the SDK, and do not port the SDK's external-dict style onto bot.
- `httpx` maintainer confirmation (GitHub Discussion #3436): the stated policy "API exists in 0.x, deprecate in 0.y, then remove in 0.z" was applied inconsistently in practice — a real-world caution that an informal 0.x deprecation window is not self-enforcing without a mechanical gate.
- `stacklevel` is nearly always wrong when a `warnings.warn` call sits inside a helper called by the public function, because the frame count depends on the call depth from the *actual* call site, which a library author can't fully control; `_config.py:170-174`'s `stacklevel=3` is correct precisely because it is computed for its one specific call path (`__post_init__` ← generated `__init__` ← caller), and the same constant would be wrong from any other call site.
- No `@overload`, `Self`, `@final`, `@override`, `TypeIs`, `TypeGuard`, legacy `TypeVar`, or `Generic[]` exist anywhere in the SDK — a genuinely overload-free, override-free public surface; every PEP 695 opportunity that exists (16 `type` statements across 4 files) is already taken, and nothing calls for `@override` because there is no inheritance-based polymorphism in the public API at all.
- `py.typed` is present (`src/ocx_sdk/py.typed`); pyright run against `src` reports **0 errors, 0 warnings, 0 informations** (verified directly, not taken on faith).
- Sybil doc-snippet execution covers 12 `>>>` doctests and 4 fenced ` ```python ` examples across 13 source files — real but thin: most public dataclasses and the `Ocx`/`Project` command methods carry no executable example, only a prose `Args:`/`Returns:`/`Raises:` contract.

## Findings

### 1. What is public

The typing spec is unambiguous and applies identically to `.py` and `.pyi`:

> "The following import forms re-export symbols: `import X as X` (a redundant module alias): re-exports `X`... `from Y import X as X` (a redundant symbol alias): re-exports `X`... Imported symbols are considered private by default. A module can expose an `__all__` symbol at the module level that provides a list of names that are considered part of the interface. This overrides all other rules above." — [typing spec, Import conventions](https://typing.python.org/en/latest/spec/distributing.html)

pyright enforces the "private by default" half of that rule through `reportPrivateImportUsage`, described as:

> "Generate or suppress diagnostics for use of a symbol from a 'py.typed' module that is not meant to be exported from that module." — default severity **error** in basic, standard, *and* strict — [pyright configuration.md](https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md)

I verified this against the live SDK, not from the docs alone. `src/ocx_sdk/__init__.py:28-29` does:

```python
from importlib.metadata import PackageNotFoundError
from importlib.metadata import version as _pkg_version
```

`PackageNotFoundError` is bound with no `as` alias and is absent from `__all__` (`__init__.py:138-229`). Two independent mechanisms confirm it leaks:

```
$ python3 -c "import ocx_sdk; print('PackageNotFoundError' in vars(ocx_sdk), 'PackageNotFoundError' in ocx_sdk.__all__)"
True False
```

```
$ pyright consumer_probe.py   # `from ocx_sdk import PackageNotFoundError`, isolated project, no include restriction
reportPrivateImportUsage - "PackageNotFoundError" is not exported from module "ocx_sdk"
```

`version as _pkg_version` on the line above is done correctly — the underscore alias both satisfies the private-by-default rule *and* self-documents intent. `PackageNotFoundError` is the one name in the whole package that skipped this step. Everything else — `bootstrap.py`'s own `__all__` (`ensure`, `DistSource`, `bootstrap.py:26-29`), and all 79 other names in the top-level `__all__` — agrees exactly with the underscore convention and with what's actually bound (verified by walking `vars(ocx_sdk)` and `vars(ocx_sdk.bootstrap)` and diffing against each `__all__`; `from __future__ import annotations` also binds a public-looking `annotations` name in every module using it — a known wart, not a violation, and must be excluded by name from any such check or it reads as a false positive on literally every module in the package).

### 2. Signature design that survives

**Keyword-only for growth.** Every method on `Ocx`/`Project`/`PackageCommands`/etc. that takes more than its one or two structural arguments puts everything else behind a bare `*` — `Ocx.login()` (`_client.py:382-390`) takes `registry: str | None = None` positionally, then `*`, then `username`, `token`, `allow_insecure_store: bool = False`, `verify: bool = True`, `timeout`, `retry` all keyword-only. This is the mechanism that makes adding a tenth optional parameter next release a non-breaking change: existing call sites that never named the ninth parameter positionally can't be broken by insertion order, because there is no positional order past the first argument or two.

**Positional-only is absent, deliberately or not.** Zero `/` markers anywhere in the package. Given the keyword-only-heavy style, this reads as consistent rather than incomplete — the SDK's philosophy is "name almost everything," not "hide the parameter name." A case *for* adding positional-only markers exists only where a parameter name is genuinely an implementation detail a caller shouldn't rely on (there are candidates — `compose_argv`'s `exe`, `global_flags`, `command` in `_process.py:132-139` are internal and could be positional-only — but that function is itself private, so the marker would buy nothing extra there).

**Boolean parameters are not a trap here, structurally.** `ruff --select FBT001,FBT002` against `src/ocx_sdk` finds exactly 5 hits, all on underscore-prefixed private helpers (`_child_argv`, `_exec_argv`, `_switch`, `_toggle` — `_client.py:1272-1290,1980-2000,2136-2145`). Every public boolean (`login()`'s `verify`, `run()`'s `check`/`capture`, `pull()`'s `dry_run`, etc. — 57 occurrences of `: bool = True/False` across the file) is already keyword-only, which is exactly what FBT's own fix suggests: "Make the argument a keyword-only argument, to force callers to be explicit" ([ruff FBT001](https://docs.astral.sh/ruff/rules/boolean-type-hint-positional-argument/)). FBT is currently unselected in `pyproject.toml`'s `[tool.ruff.lint] select` (`E,W,F,I,B,UP,ANN,RUF,D`); selecting it would cost 0 present violations and gate future regressions for free — see [NG-2](#normative-guidance-candidates).

**Sentinel typing, the awkward part done right.** `_client.py:127-145`:

```python
class _Unset(Enum):
    """The sentinel type for "the caller said nothing"."""

    TOKEN = "unset"


UNSET: Final = _Unset.TOKEN
type MaybeRetry = RetryPolicy | Literal[_Unset.TOKEN] | None
type MaybeTimeout = float | Literal[_Unset.TOKEN] | None
```

This is the current best-known form for a three-state "not given / None / value" sentinel typed precisely: PEP 586 `Literal` explicitly permits enum members as arguments, so `Literal[_Unset.TOKEN]` denotes exactly one value, not "any `_Unset`." A bare `SENTINEL = object()` (the older idiom) cannot be spelled in a type expression at all — `type X = int | object` doesn't narrow to the sentinel, it just unions in every object — so mypy/pyright users of that idiom are usually stuck typing the parameter as `int | object` and manually narrowing with `is UNSET`, or reaching for a private class the type checker still can't distinguish from any other instance without an explicit `Literal`/`Final` singleton trick. The SDK's form lets `MaybeTimeout` mean exactly `float | None | Literal[UNSET]` and nothing else, and `_config.py`'s docstring explicitly calls out that `UNSET` is `Final` and public precisely so a wrapper SDK can declare `retry: MaybeRetry = UNSET` itself without inventing a second sentinel.

**Mutable defaults.** Zero instances of a mutable literal (`[]`, `{}`, `set()`) as a default anywhere in `src/` — `ruff --select B006` returns clean, and `B` is already selected project-wide.

### 3. Types at the boundary

**`Sequence`/`Iterable`/`Mapping` in, concrete out.** Method parameters accept `Sequence[str]`, `Iterable[str]`, `Mapping[str, EnvValue]`; return types are concrete `tuple[str, ...]`, `dict`-shaped frozen dataclasses, or `str`. `compose_argv` (`_process.py:132-171`) is the clean example: `Sequence[str]` in, `tuple[str, ...]` out.

**`Protocol` for a duck-typed slice, `NamedTuple` for a plain product type.** `_process.py:104-129`:

```python
class Completed(NamedTuple):
    exit_code: int
    stdout: str
    stderr: str


class _Killable(Protocol):
    @property
    def pid(self) -> int: ...
    @property
    def returncode(self) -> int | None: ...
    def terminate(self) -> None: ...
    def kill(self) -> None: ...
```

`_Killable` is structural on purpose — it's the shared shape between `subprocess.Popen` and `asyncio.subprocess.Process`, which share no common base class, so nominal typing (ABC) genuinely cannot express "either kind of child handle." `Completed` is a plain 3-field product with no behavior — `NamedTuple` over a dataclass here buys tuple-unpacking and immutability for free with less boilerplate than `@dataclass(frozen=True, slots=True)`, and it's stdlib rather than a project convention, so it costs a reader nothing extra to learn.

**`Unpack[TypedDict]` for `**kwargs`, PEP 692.** `_config.py:36-83`, `ConfigOverrides(TypedDict, total=False)`, consumed as `def with_config(self, **overrides: Unpack[ConfigOverrides]) -> Ocx`. This is the textbook use case PEP 692 was written for — "checkers should provide as much support for `**kwargs: Unpack[TypedDict]` as they already do for `**kwargs: SomeType`" — and the SDK's own docstring explains *why* over `**overrides: Any`: "so a misspelled field is a type error rather than a `TypeError` at runtime." The one real subtlety, called out explicitly in the SDK's own docstring, is that `NotRequired[...]` inside a `from __future__ import annotations`-postponed string annotation is invisible to `__required_keys__` at runtime — which is why `ConfigOverrides` uses class-level `total=False` rather than per-field `NotRequired[...]`.

**PEP 695 is fully adopted, no legacy `TypeVar`/`Generic[]`.** 16 `type` statements across `_client.py` (4), `_process.py` (5), `_results.py` (3), `_types.py` (4) — e.g. `type LogLevel = Literal["off", "error", ...]`, `type EnvValue = str | ConstVar | PathVar | ListVar`, `type PackageLike = str | PackageRef`. Zero `TypeVar(...)` or `Generic[...]` calls anywhere in `src/`. Since the floor is 3.12, this needs no `typing_extensions` fallback and no runtime shim.

**`Never` for an always-raising method, gated from the type checker on purpose.** `Ocx.__getattr__` (`_client.py:265-284`):

```python
if not TYPE_CHECKING:  # pragma: no branch - always taken at runtime

    def __getattr__(self, name: str) -> Never:
        ...
        raise AttributeError(...)
```

The comment explains the trade-off precisely: a *visible* `__getattr__` tells pyright every attribute name resolves, which "silently retires unknown-attribute reporting for the SDK's central handle." Hiding it behind `if not TYPE_CHECKING` keeps strict attribute checking for legitimate typos while still giving a helpful runtime message for the two specific traps (`ocx.run`, `ocx.exec`) people reach for first.

**Not present, and correctly absent:** `@overload` (zero — the SDK never needed one, which is itself a data point: an overload set is warranted when a function's return type or required-argument set genuinely varies with an input type/literal, and nothing here does that), `Self` (zero — no method returns "an instance of whatever subclass called this"; `HostEnv.ambient() -> HostEnv` uses the concrete name because the class is never subclassed), `@final` (zero — nothing in the hierarchy needs to forbid subclassing, and the dataclasses are already `frozen`+`slots` which makes uncontrolled subclassing awkward in practice anyway), `@override`/PEP 698 (zero opportunities — no method in the public surface overrides a base class method other than dunders), `TypeIs`/`TypeGuard` (zero — no `is_x()` narrowing helpers exist in the public API).

### 4. Errors as API

Single root, `OcxError(Exception)` (`_errors.py:62-83`). Verified by grep that no other class in the module subclasses `Exception`/`BaseException` directly — every leaf routes through `OcxError`, `OcxExecutionError`, `OcxProcessError`, or `BootstrapError`. `_hint: str = ""` is a class attribute every subclass overrides with "the next step a caller can actually take," appended in `__str__`. `__reduce__` (`_errors.py:81-82`) is a deliberate, documented public-surface commitment: "Errors cross process boundaries intact — a `ProcessPoolExecutor` worker or a pytest-xdist node has to be able to hand one back," which matters because these exceptions carry non-`args` state (`exit_code`, `attempts`, `argv`) that default exception pickling loses.

**Exception chaining and PEP 678.** No `add_note` usage in the SDK today (nothing yet needs it — the hint-in-`__str__` pattern already carries the "what to do" context inline, so there's no gap `add_note` would fill for a currently-raised exception). `from` chaining isn't used because nothing in `src/` catches-and-reraises-as-a-different-type; every raise is a fresh, first-cause raise.

**Exception groups (PEP 654) — not warranted.** PEP 654 targets "raise and handle multiple unrelated exceptions simultaneously," concurrent/parallel failure aggregation (`asyncio.TaskGroup` is its flagship consumer). The SDK spawns one ocx process per call and reports one failure per call; nothing here fans out into independent concurrent failures that need aggregating. `except*` would be pure ceremony over a single-exception-per-call model.

**The exit-code ↔ exception 1:1 mapping — argued, not just admired.**

```python
class ExitCode(IntEnum):  # _errors.py:28-48
    OK = 0; FAILURE = 1; USAGE = 64; DATA_ERR = 65; UNAVAILABLE = 69
    IO_ERR = 74; TEMP_FAIL = 75; NO_PERM = 77; CONFIG = 78; NOT_FOUND = 79
    AUTH = 80; POLICY_BLOCKED = 81; DIRTY_RC_BLOCK = 82

_EXIT_CODE_ERRORS: dict[ExitCode, type[OcxProcessError]] = {  # _errors.py:304-317
    ExitCode.USAGE: UsageError, ExitCode.DATA_ERR: DataError, ...
}
```

I verified completeness mechanically: every `ExitCode` member other than the two generic ones (`OK`, `FAILURE`) has a mapped subclass, and every mapped class is an `OcxProcessError` subclass (see [NG-5](#normative-guidance-candidates)). This is a genuinely good pattern *here*, for a specific structural reason: `_process.py` observes a bare `int` handed back by an external binary and must pick which exception type to construct — that's a reverse lookup (code → class) that has to live *somewhere* outside the classes themselves, because the classes can't introspect "which code am I for" without one.

Compare `index/bot`'s `errors.py`/`exit_codes.py` (`/home/mherwig/dev/index/bot/src/indexbot/errors.py`):

```python
class IndexBotError(Exception):
    _exit_code: ExitCode = ExitCode.VALIDATION_FAILURE

    @property
    def exit_code(self) -> ExitCode:
        return self._exit_code


class AnomalyError(IndexBotError):
    _exit_code = ExitCode.ANOMALY
```

Bot's application code always knows up front which exception it's about to raise — it constructs `AnomalyError(...)` directly — so it only ever needs the *forward* direction (class → code), which a class attribute answers with no external table at all, and no chance of the table and the class list drifting apart. **This is not a matter of taste**: porting the SDK's dict-mapping style onto bot would add an unused reverse lookup; porting bot's class-attribute style onto the SDK would leave `_process.py` with no way to go from "ocx exited 81" to `PolicyBlockedError` without either an `if/elif` chain or reconstructing the same dict by another name. Verdict: 1:1 exit-code↔exception mapping is a good pattern *when a raw external status code must be classified into a class*, and unnecessary machinery when application code always originates its own exception.

### 5. Evolution and deprecation

SemVer for 0.x is unambiguous and, on its own, offers no promise at all: "Major version zero (0.y.z) is for initial development. Anything MAY change at any time. The public API SHOULD NOT be considered stable." ([semver.org](https://semver.org/)). The SDK is at `0.1.0`; strictly, nothing here obligates a deprecation period before any change. `CHANGELOG.md` confirms this is the *first* release — there is no deprecation history yet to audit, only a policy to design prospectively.

`warnings.warn`'s `stacklevel` is the mechanism, and it is genuinely fragile: `stacklevel=1` (the default) blames the `warn()` call site itself; `stacklevel=2` blames *that function's* caller — [docs.python.org](https://docs.python.org/3/library/warnings.html#warnings.warn) gives the canonical one-hop example, `deprecated_api()` calling `warn(..., stacklevel=2)` so the warning "refer[s] to `deprecated_api`'s caller, rather than to the source of `deprecated_api` itself." The SDK's one live example, `_config.py:170-174`, needs `stacklevel=3` specifically because the call path is `warnings.warn` ← `OcxConfig.__post_init__` (frame 2) ← the dataclass-generated `__init__` (frame 3) ← the actual caller who wrote `OcxConfig(...)`. A constant `stacklevel=2` — correct for the textbook single-hop case — would blame `__init__` itself here, which is useless (it's SDK-generated code, not user code). **This is why `stacklevel` "is nearly always wrong": it isn't a property of the warning, it's a property of the specific call chain from the public entry point to `warn()`, and every helper frame in between shifts the required number by exactly one.** For cases where a constant can't be maintained across multiple call paths, `warnings.warn` as of newer Python versions also accepts `skip_file_prefixes=`, which counts frames by *file* rather than by a hardcoded integer.

**PEP 702 `@deprecated`** ships in stdlib `warnings` at Python 3.13 (`typing_extensions>=4.5.0` covers 3.12). It "will also raise a runtime `DeprecationWarning`" by default (suppressible via `category=None`), and type checkers "must produce diagnostics for deprecated usage" through direct calls, attribute access, and `from ... import *`. Critically, **pyright's `reportDeprecated` defaults to `none` in basic and standard modes, and only `error` in strict** ([pyright configuration.md](https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md)) — so shipping `@deprecated` in the SDK is a strong signal to *strict* consumers and an invisible no-op to everyone else unless they also opt into strict pyright. This matters concretely here because the SDK's own `[tool.pyright]` only elevates `strict = ["src"]`, not the whole repo — a downstream project that copies that exact pattern would get zero deprecation diagnostics for its own non-strict code even while consuming a properly `@deprecated`-marked SDK symbol.

**Deprecating a parameter, not a function** — the harder, more common case — has no PEP 702 syntax at all (the decorator only targets whole functions/classes/overloads). The mechanical answer is: keep the parameter accepting a sentinel (reuse the `UNSET`-style pattern from §2) and manually `warnings.warn(..., DeprecationWarning, stacklevel=N)` inside the function body when the caller passed something other than the sentinel — there is no static-checker-visible alternative for a single parameter today.

**The maintainer-review reality check.** httpx's own maintainer (`lovelydinosaur`) confirmed in [GitHub Discussion #3436](https://github.com/encode/httpx/discussions/3436), responding to a user who hit a breaking change in a 0.x point release: the intended policy was "API exists in 0.x, deprecate in 0.y, then remove in 0.z," but conceded it "wasn't cautious or clearly communicated enough" — and the project's own recommendation to users, post-incident, is to pin the dependency and manually read the changelog. `docs/compatibility.md` gives concrete, successfully-migrated examples (`data=` deprecated in favor of `content=` for raw uploads; `response.next` renamed to `response.next_request`) — real precedent that a deprecate-then-remove window *can* work, alongside real precedent (the discussion thread) that an unenforced, undocumented window silently doesn't. The gap between the two outcomes is exactly whether a mechanical gate — not a stated intention — blocks the removal PR. See [NG-11](#normative-guidance-candidates) for the shape of that gate.

### 6. Docstrings as contract

Google convention is configured (`[tool.ruff.lint.pydocstyle] convention = "google"`), with `D105`/`D107` (magic methods, `__init__`) ignored because those are "merged into class doc." 73 `Raises:` sections exist across the package. `Args:`/`Returns:`/`Raises:` are the load-bearing sections; a `Note:` block appears occasionally for a genuinely surprising behavior (`_results.py:1257-1260`'s note about `lock --check`/`update --check` emitting no body).

Whether `Raises:` staying accurate is checkable: **partially, and not cleanly today.** `ruff --preview --select DOC` (pydoclint) returns 122 hits, broken down as `DOC201` (missing-Returns) ×75, `DOC502` (extraneous-exception) ×40, `DOC501` (missing-exception) ×7. I inspected the DOC502 hits by hand: both are on `_retry.py`'s `run_with_retry`/`run_with_retry_async`, which correctly document `Raises: Exception: The final failure, re-raised...` — the code re-raises whatever `classify` rejected, which genuinely can be any `Exception` subtype, so the docstring is *accurate*, and DOC502 is flagging it as extraneous only because ruff's static analysis sees no literal `raise Exception(...)` in the function body and can't trace a bare re-raise through a caught `except Exception as e: raise`. That's a real false-positive class, not a nitpick. `DOC201` (75 hits) is largely noise against Google convention specifically, which permits omitting `Returns:` when the return is self-evident from the summary line — ruff's rule doesn't know that convention allows the omission. `DOC501` (7 hits) looked genuinely useful on inspection: `_client.py:631-645`'s `compose_child` calls `compose_argv`, which is documented to `raise ValueError` on a leading-dash positional (`_process.py:158-160`), and `compose_child`'s own docstring has no `Raises:` section at all — a real, traceable gap. Given `DOC` is `--preview`-only (`ruff check --select DOC` alone emits "Selection `DOC` has no effect because preview is not enabled" — confirmed by running it), and given the DOC502 false-positive rate on this exact codebase, **selecting it wholesale today would fail CI on accurate documentation** — see [NG-9](#normative-guidance-candidates) for the narrower, worth-it-today subset.

Sybil executes doc snippets as real tests (`pytest.ini_options` `testpaths` includes `"docs", "README.md", "src"`, driven by a Sybil hook the SDK's own `conftest.py` wires up). This changes the calculus for what a docstring example is *for*: since it's a test, it should demonstrate a genuinely representative call and its real return value, not a contrived minimal case — because a contrived example that happens to pass is functionally a snapshot test with a misleading pedagogical purpose. Counted directly: 12 `>>>` doctests (`_config.py` ×2, `_dist.py` ×1, `_envmodel.py` ×2, `_results.py` ×2, `_types.py` ×5) and 4 fenced ` ```python ` examples (`bootstrap.py`, `_client.py` ×2, `_config.py`, `__init__.py`). Against 148 public `def`s in the package, that's a thin fraction with an *executed* example — most public methods on `Ocx`/`Project` rely on the `Args:`/`Returns:`/`Raises:` contract alone, with the module-level docstring's one runnable example (`__init__.py:10-17`) standing in for all of them.

### 7. Stability mechanics

`py.typed` is present at `src/ocx_sdk/py.typed` (confirmed via `find`). A `--strict` consumer gets no `Unknown`-typed exports: `pyright src/ocx_sdk` run directly reports **0 errors, 0 warnings, 0 informations** — verified by executing it, not asserted from the brief.

**`griffe check` exists and is directly runnable here.** `griffe check ocx_sdk -s src -f verbose`, run against the repo's only tag (`v0.1.0`, the CLI's default `--against` target), returns clean — no output, exit 0. I planted two different violations to characterize what it actually catches:

- Fully removing `Ocx` from `__init__.py` (both the import and the `__all__` entry) → `griffe check` correctly reports `src/ocx_sdk/__init__.py:0: Ocx: Public object was removed`.
- Removing `Ocx` from `__all__` **only** (still imported, still bound in the module, just no longer advertised) → `griffe check` reports **nothing**.

This is the load-bearing distinction for whether `griffe check` can substitute for the "three definitions of public agree" check in §1: it can't. Griffe's breakage detector operates on actual module reachability, not on `__all__` membership, so a regression identical in kind to the SDK's one real violation today (a name quietly falling out of `__all__` while staying importable) would sail through `griffe check` in CI without a flag. `griffe check`'s value is real and complementary — it's the tool for "did a signature/return-type/parameter-order change under an unchanged name" — but it needs the separate `__all__`-agreement check ([NG-1](#normative-guidance-candidates)) beside it, not instead of it.

### 8. What an LLM gets wrong

See [AI-agent angle](#ai-agent-angle) for the per-mistake mechanical check; the categories themselves, cross-referenced against what this specific codebase already defends against:

- Inventing kwargs on a call to an SDK method it hasn't actually read the signature for — the SDK's own `**overrides: Unpack[ConfigOverrides]` (§3) exists specifically so a *misspelled* keyword becomes a static type error rather than a silent `TypeError` at runtime, which helps, but only for callers with type checking on.
- Widening a return type to `Any` "to make the error go away" instead of narrowing the actual call site — the SDK has exactly two legitimate `-> Any` returns (`_results.py:111,163`, both private JSON-decoding leaves that must accept truly untyped input) and zero on the public surface.
- Adding a boolean flag parameter to an existing public function instead of a second function or an enum, when the two behaviors don't compose — nothing currently in the SDK does this (§2), but it's the single easiest regression an agent-driven diff could introduce.
- Breaking a public signature (removing/renaming/reordering a parameter) without any deprecation step — trivially possible today since `0.1.0` carries no deprecated symbols to imitate; an agent has no local example to pattern-match against, which is itself a risk (see [NG-11](#normative-guidance-candidates)).
- `Optional[X]`/`List[X]`/`Dict[X, Y]` instead of `X | None`/`list[X]`/`dict[X, Y]` — already fully caught by `ruff UP006/UP007/UP035/UP045`, which are selected (`UP` in `[tool.ruff.lint] select`) and verified clean against `src/`.
- A docstring `Args:`/`Raises:` section drifting from the actual signature after an edit — partially caught (`DOC501` looks trustworthy; see §6), not gated in CI yet.

## Normative guidance candidates

Each rule below was tested against a planted violation in an isolated scratch file, not merely asserted. Every check prints only violations; empty output is the pass state unless the check's own text says otherwise. No `-e A -e B` conjunctions, no `$(...)`, one explicit path operand per invocation.

**NG-1 — Every non-underscore module-level name must be either bound with a redundant `as` alias or listed in `__all__`.**
Rationale: this is the actual mechanism a type checker uses to decide "public"; anything else is convention without enforcement.
Verification (Python, no dependencies beyond the package itself):
```
python3 -c "
import importlib, sys
mod = importlib.import_module(sys.argv[1])
declared = set(getattr(mod, '__all__', []))
public = {n for n in vars(mod) if not n.startswith('_')} - {'annotations'}
for n in sorted(public - declared):
    print(f'VIOLATION: {n!r} is public but missing from __all__')
for n in sorted(x for x in declared if x not in vars(mod)):
    print(f'VIOLATION: {n!r} is in __all__ but not bound')
" ocx_sdk
```
Watched red (planted): a synthetic package with `def helper(): ...` and `__all__ = []` → `VIOLATION: 'helper' is public (no leading underscore) but missing from __all__`.
Watched red (live, real): run as above against `ocx_sdk` → `VIOLATION: 'PackageNotFoundError' is public (no leading underscore) but missing from __all__`. This is a genuine finding, not a drill.
`ocx_sdk.bootstrap` passes clean.

**NG-2 — Select `FBT001`/`FBT002` in ruff; keyword-only booleans are exempt by construction.**
Rationale: forces every new boolean parameter to be either keyword-only (self-documenting at call sites) or split into two functions/an enum; costs nothing against the current codebase.
Verification: `ruff check --select FBT001,FBT002 src/ocx_sdk`.
Watched red: `def deploy(target: str, dry_run: bool = False) -> None: ...` in a scratch file → `FBT001 Boolean-typed positional argument in function definition` + `FBT002 Boolean default positional argument in function definition`.
Watched green on the real package after excluding `_`-prefixed names by AST/regex on the def line: all 5 raw hits are on private helpers (`_child_argv`, `_exec_argv`, `_switch`, `_toggle`); zero on public defs.

**NG-3 — No mutable literal as a default argument value.**
Rationale: the single most classic Python footgun; shared mutable state across calls.
Verification: `ruff check --select B006 src/ocx_sdk` (already selected via `B` in `[tool.ruff.lint] select`).
Watched red: `def f(items: list = []) -> None: ...` → `B006 Do not use mutable data structures for argument defaults`.
Watched green: `src/ocx_sdk` returns "All checks passed!".

**NG-4 — A "not given" sentinel must be a typed singleton (private `Enum` + `Final` + `Literal[member]`), never a bare `object()`.**
Rationale: a bare `object()` sentinel cannot be spelled precisely in a type expression; `Literal[EnumMember]` can (PEP 586 permits enum members as `Literal` arguments).
Verification:
```
grep -nE '^[A-Z_][A-Z0-9_]*\s*=\s*object\(\)' src/ocx_sdk/*.py
```
Watched red: `SENTINEL = object()` at module scope in a scratch file → matched, flagged.
Watched green: zero matches in `src/ocx_sdk`.

**NG-5 — Every non-generic `ExitCode` member must map to exactly one `OcxProcessError` subclass, and the mapping table must not drift from the enum.**
Rationale: this is the SDK's actual reverse-lookup contract (§4); a gap means an external process exit code silently falls back to a generic, less actionable exception.
Verification (run inside the package's own venv, `cwd` = repo root):
```
python3 -c "
import sys; sys.path.insert(0, 'src')
from ocx_sdk._errors import ExitCode, OcxProcessError, _EXIT_CODE_ERRORS
skip = {ExitCode.OK, ExitCode.FAILURE}
for code in ExitCode:
    if code in skip:
        continue
    cls = _EXIT_CODE_ERRORS.get(code)
    if cls is None:
        print(f'VIOLATION: {code!r} has no mapped exception class')
    elif not issubclass(cls, OcxProcessError):
        print(f'VIOLATION: {code!r} maps to {cls.__name__}, not an OcxProcessError subclass')
"
```
Watched red: deleting the `ExitCode.DIRTY_RC_BLOCK` entry from a copy of the mapping → `VIOLATION: <ExitCode.DIRTY_RC_BLOCK: 82> has no mapped exception class`.
Watched green: real SDK, empty output.

**NG-6 — Every public (non-underscore) dataclass must be `frozen=True`.**
Rationale: matches the SDK's own stated design ("Handles hold no mutable state"); a mutable public dataclass invites aliasing bugs across calls that share one.
Verification:
```
awk '/^@dataclass/ { fr = ($0 ~ /frozen=True/); getline nl; if (nl ~ /^class [A-Z_][A-Za-z0-9_]*/ && !fr) { n = nl; sub(/^class /, "", n); sub(/[(:].*/, "", n); print "VIOLATION: public dataclass " n " is not frozen=True" } }' src/ocx_sdk/*.py
```
Watched red: `@dataclass\nclass Report:\n    value: int` in a scratch file → `VIOLATION: public dataclass Report is not frozen=True`.
Watched green: zero matches across `src/ocx_sdk` (every one of the 51 `@dataclass` occurrences is `frozen=True, slots=True`).

**NG-7 — No `typing.Optional`/`List`/`Dict`/`Tuple` (legacy generic aliases); use `X | None`/`list`/`dict`/`tuple`.**
Rationale: PEP 585/604 forms are available unconditionally at the 3.12 floor and ruff auto-fixes them.
Verification: `ruff check --select UP006,UP007,UP035,UP045 src/ocx_sdk`.
Watched red: `def f(x: Optional[int]) -> List[str]: ...` → 3 findings (`UP035`, `UP045`, `UP006`), 2 auto-fixable.
Watched green: `src/ocx_sdk` clean.

**NG-8 — No legacy `TypeVar(...)`/`Generic[...]`; use PEP 695 `type` statements and `class Foo[T]:` syntax.**
Rationale: floor is 3.12; PEP 695 syntax needs no import and is strictly less code.
Verification:
```
grep -rnE '\bTypeVar\(|\bGeneric\[' src/ocx_sdk/*.py
```
Watched red: a scratch file with `T = TypeVar("T")` / `class Box(Generic[T]):` → both lines matched.
Watched green: zero matches in `src/ocx_sdk` (16 `type` statements cover every current need).

**NG-9 — Select `ruff --preview --select DOC501` alone (missing-exception), not the full `DOC` group.**
Rationale: `DOC501` found 7 real, traceable gaps on inspection; `DOC502` (40 hits) has a confirmed false-positive class against a correct generic re-raise, and `DOC201` (75 hits) fights Google convention's permitted Returns omission. Selecting the full group today fails CI on accurate documentation.
Verification: `ruff check --preview --select DOC501 src/ocx_sdk`.
Watched red/green: already run against the live package — 7 real hits, one hand-verified as genuine (`_client.py:631` `compose_child` can propagate `ValueError` from `compose_argv` and documents no `Raises:`).

**NG-10 — Every `warnings.warn(..., DeprecationWarning` call must pass an explicit `stacklevel=`.**
Rationale: the default (`stacklevel=1`) blames the `warn()` call site itself, inside the library — useless to the caller who needs to know *their own* call site.
Verification:
```
python3 -c "
p = 'src/ocx_sdk/_config.py'
lines = open(p).readlines()
for i, l in enumerate(lines):
    if 'warnings.warn(' not in l:
        continue
    window = ''.join(lines[i:i+6])
    if 'stacklevel=' not in window:
        print(f'VIOLATION: {p}:{i+1}: warnings.warn(...) has no explicit stacklevel=')
"
```
Watched red: a scratch `warnings.warn("use new_api() instead", DeprecationWarning)` with no `stacklevel` → flagged.
Watched green: the SDK's one call (`_config.py:170`) carries `stacklevel=3`.

**NG-11 — A removal PR must not land unless the symbol it removes was `@deprecated` (or carried a `DeprecationWarning`) in at least one prior published release.**
Rationale: this is the mechanical version of what httpx's stated policy ("deprecate in 0.y, then remove in 0.z") failed to enforce in practice per the maintainer's own admission ([Discussion #3436](https://github.com/encode/httpx/discussions/3436)) — a stated intention without a gate is not a policy.
Verification (repo-level, not yet applicable to `ocx-sdk-python` — no removal has shipped since `0.1.0` is the first release): diff `CHANGELOG.md`'s prior release notes for a `Deprecated` entry naming the same symbol a `Removed` entry in the current release names; fail the release if a `Removed` entry has no matching prior `Deprecated` entry. Concretely: `grep -B0 -A0 "^- " CHANGELOG.md` per released section, cross-referencing symbol names between adjacent `### Deprecated` and `### Removed` blocks — this needs a small script once there is a second release to check, not a one-liner today.

**NG-12 — Only the package's single root exception class may subclass `Exception`/`BaseException` directly.**
Rationale: every other exception must route through the root so a bare `except OcxError` (or the package's equivalent) is a complete catch-all; a stray `class NetworkError(Exception)` bypasses it silently.
Verification:
```
awk '/^class [A-Za-z_][A-Za-z0-9_]*\((Exception|BaseException)\)/ { n = $0; sub(/^class /, "", n); sub(/\(.*/, "", n); if (n != "OcxError") print "VIOLATION: " FILENAME ":" NR ": " n " subclasses Exception directly" }' src/ocx_sdk/_errors.py
```
Watched red: a scratch file with both `class OcxError(Exception)` and `class NetworkError(Exception)` → only `NetworkError` flagged.
Watched green: real `_errors.py`, empty output (16 exception classes, one root).

**NG-13 — `griffe check <pkg> -s src` against the latest tag runs in CI on every PR, but is not treated as sufficient proof the public surface is stable — pair it with NG-1.**
Rationale: verified directly (§7) that `griffe check` catches a full symbol removal but not an `__all__`-only drift; the two checks cover disjoint failure modes.
Verification: `griffe check ocx_sdk -s src -f verbose`; exit 0 with no output is a pass, any output is a break. Confirmed both states by planting and reverting a full removal of `Ocx` from `__init__.py`.

## Applied to the SDK

| Rule | Status | Evidence |
|---|---|---|
| NG-1 (public-surface agreement) | **Violated** (1 instance) | `__init__.py:28` `PackageNotFoundError` leaks — not in `__all__`, no `as` alias |
| NG-2 (FBT on public API) | Satisfied, unselected | 5 raw FBT hits, all private (`_client.py:1277,1985,1986,2136,2141`); zero on public defs |
| NG-3 (no mutable defaults) | Satisfied | `ruff --select B006` clean; `B` already selected |
| NG-4 (typed sentinel) | Satisfied | `_client.py:127-145`, `_Unset`/`UNSET`/`Literal[_Unset.TOKEN]` |
| NG-5 (exit-code↔exception completeness) | Satisfied | `_errors.py:28-48,304-317`, verified complete by script |
| NG-6 (public dataclass frozen) | Satisfied | all 51 `@dataclass` occurrences `frozen=True, slots=True` (`_results.py` ×31, `_types.py` ×8, `_dist.py` ×4, `_client.py` ×5, others ×1 each) |
| NG-7 (no legacy generics) | Satisfied | `ruff --select UP006,UP007,UP035,UP045` clean |
| NG-8 (PEP 695 mandate) | Satisfied | 16 `type` statements, 0 `TypeVar`/`Generic[]` |
| NG-9 (DOC501 only) | **New commitment** | not currently run in CI; 7 candidate hits exist, 1 spot-verified genuine (`_client.py:631` `compose_child`) |
| NG-10 (stacklevel required) | Satisfied | `_config.py:170`, `stacklevel=3`, correct for its 3-frame call path |
| NG-11 (deprecate-before-remove gate) | **New commitment**, not yet testable | `0.1.0` is the first release; no removal has happened yet to check against |
| NG-12 (single exception root) | Satisfied | `_errors.py`, verified by script — 16 classes, 1 root |
| NG-13 (griffe check in CI) | **New commitment** | not currently wired into CI (no `.github/workflows` step found referencing `griffe check`); run manually here, clean against `v0.1.0` |

**Library vs. application — rules that apply to one and not the other**, using `ocx-sdk-python` (published library) against `index/bot` (`/home/mherwig/dev/index/bot`, application):

- **NG-1, NG-13 (public-surface agreement, `griffe check`) apply only to the library.** `index/bot` has no `__all__` anywhere worth auditing and no consumers importing it as a package — its "public surface" is its CLI argv contract, not its Python symbols. Running `griffe check` against an application with no external importers checks nothing real.
- **§4's exit-code↔exception *dict* mapping is SDK-specific; bot's flat class-attribute style is bot-specific**, for the structural reason argued in §4: the SDK needs a reverse lookup from an *external* process's raw exit int; bot's own code always originates the exception it raises, so the forward direction (`_exit_code` class attribute, `errors.py:14-47`) is sufficient and simpler. Neither pattern should be copied onto the other codebase.
- **NG-9/DOC and the `D` ruff category generally apply only to the library.** `index/bot`'s `pyproject.toml` `[tool.ruff.lint] select` is `["E","F","W","I","UP","B","C4","SIM","RUF","S","ANN"]` — no `D` at all. That's correct for an application: nobody consumes bot's docstrings as an API contract the way ocx-sdk's are executed by Sybil and read by IDE tooltips for external callers.
- **`S` (flake8-bandit) is selected in bot and not in ocx-sdk-python.** Bot handles GitHub tokens, webhook payloads, and untrusted registry data directly; the SDK's `_types.py` docstring states its own security posture inline ("Secrets never repr... CWE-532") rather than leaning on a lint category, and the SDK's actual attack surface (subprocess argv construction, `CWE-88` in `compose_argv`) is narrower and hand-audited rather than bandit-covered.
- **`typeCheckingMode = "strict"` repo-wide (bot) vs. `strict = ["src"]` glob-scoped (SDK)** is exactly the library/application split: bot has no "public src vs. internal tests" boundary worth relaxing — the whole application is the product. The SDK relaxes `tests/` to `typeCheckingMode = "standard"` because tests aren't shipped and don't need `reportDeprecated`, `reportPrivateUsage`, etc. at strict severity.
- **NG-6 (frozen dataclasses) generalizes to both**, but for different reasons: the SDK freezes because its dataclasses cross a public API boundary (§2, "Handles hold no mutable state"); an application can have good reasons for a *mutable* internal dataclass (accumulating state during a single run) that would be a bug if it were public API.

## AI-agent angle

| Mistake | Smallest mechanical check |
|---|---|
| Inventing a kwarg name on a call | `ruff check --select ANN` (already selected) plus running pyright against the diff — a misspelled `Unpack[TypedDict]` keyword is a type error, not a runtime surprise, wherever the SDK's own `ConfigOverrides` pattern (§3) is followed |
| Widening a return type to `Any` | `grep -n -- '-> Any' src/ocx_sdk/*.py` then manually confirm each hit is on an underscore-prefixed function (today: only `_results.py:111,163`, both private) |
| Adding a boolean flag instead of a second function/enum | NG-2, `ruff check --select FBT001,FBT002` |
| Breaking a signature with no deprecation step | NG-11 (once a second release exists) |
| `Optional[X]`/`List[X]`/`Dict[X, Y]` | NG-7, `ruff check --select UP006,UP007,UP035,UP045` (already selected via `UP`) |
| Docstring `Raises:`/`Args:` drifting from the signature | NG-9 (`DOC501` only) plus `ruff check --select ANN,D417` (`D417`, "missing argument description," already covered by `D`) |
| Mutable default argument | NG-3, `ruff check --select B006` (already selected) |
| Bare `object()` sentinel instead of a typed singleton | NG-4 |
| Positional boolean on a *public* function | NG-2, filtered to non-underscore def names |
| A new public dataclass shipped mutable | NG-6 |
| A new exception subclassing `Exception` directly instead of the package root | NG-12 |
| A name silently dropped from `__all__` while staying importable | NG-1 (`griffe check` alone, per §7, will not catch this) |

## Contested / evolving

As of 2026-08-23:

- **`ruff`'s `DOC` (pydoclint) rule set is still preview-only** (`ruff check --select DOC` alone: "Selection `DOC` has no effect because preview is not enabled" — confirmed by running it against this exact ruff 0.16.3) and, per §6, carries a real false-positive class on this codebase. Not yet safe to gate CI on wholesale; `DOC501` alone looks closer to ready.
- **Whether `FBT` should be selected project-wide is genuinely a judgment call, not settled by ruff's docs.** The argument for: locks in a discipline the SDK already follows everywhere on the public surface, at zero present cost. The argument against: it will keep flagging the 5 private-helper hits found here forever unless those are individually `# noqa`'d or ruff grows a way to scope FBT to non-underscore names — there's no per-visibility scoping in ruff's rule engine today, only per-file (`per-file-ignores`), which is too coarse (the same file has both public and private defs).
- **`@deprecated` (PEP 702) enforcement is split by pyright mode in a way most projects haven't internalized yet** — `reportDeprecated` is `none` outside strict, so a library can ship a fully PEP-702-compliant deprecation and the majority of its consumers (anyone on pyright basic/standard, or on mypy without deprecated-symbol support configured) will see nothing. This is a live gap between "the PEP is implemented" and "the PEP protects anyone by default."
- **httpx's own deprecation policy is, by its lead maintainer's admission, aspirational rather than enforced** (Discussion #3436) — the "X/X+1/X+2/X+3" framing exists in project lore and partial documentation, but the 0.27→0.28 incident shows it wasn't gated. Whether a mechanical CHANGELOG-diff gate (NG-11) is worth building before it's needed, versus after the first incident, is an open call every 0.x library makes differently.
- **Positional-only parameters (`/`) are absent from this SDK entirely.** Whether that's a gap or a coherent choice is arguable both ways and the research here didn't find a settled community answer for "should a library's internal-implementation-detail parameters (e.g., `compose_argv`'s `exe`) be marked positional-only even when the function itself is private" — the marker's value (freedom to rename without breaking callers) is much lower for a function with no external callers at all.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [typing.python.org — distributing.html](https://typing.python.org/en/latest/spec/distributing.html) | Official typing spec, "Distributing type information" / import conventions | current (2026) | Primary, exact rule for what counts as re-exported; confirmed identical for `.py` and `.pyi` |
| [pyright configuration.md (raw, GitHub)](https://raw.githubusercontent.com/microsoft/pyright/main/docs/configuration.md) | Pyright's own diagnostic-rule reference | current | Primary source for `reportPrivateImportUsage` and `reportDeprecated` exact text and per-mode default severities |
| [pyright type-stubs.md (raw, GitHub)](https://raw.githubusercontent.com/microsoft/pyright/main/docs/type-stubs.md) | Pyright docs on the export-ambiguity problem | current | Primary; states the underlying problem the `__all__`/alias convention solves |
| [PEP 695](https://peps.python.org/pep-0695/) | Type Parameter Syntax | accepted, Python 3.12 | Primary; the `type` statement and `class Foo[T]` syntax the SDK uses throughout |
| [PEP 698](https://peps.python.org/pep-0698/) | `@override` decorator | accepted, Python 3.12 | Primary; explains why the SDK has zero legitimate uses of it today (no inheritance-based overriding in the public API) |
| [PEP 702](https://peps.python.org/pep-0702/) | `@deprecated` decorator | accepted, Python 3.13 (`typing_extensions` for 3.12) | Primary; exact runtime/type-checker semantics for deprecation |
| [PEP 692](https://peps.python.org/pep-0692/) | `Unpack[TypedDict]` for `**kwargs` | accepted, Python 3.12 | Primary; exactly the pattern behind `ConfigOverrides`/`with_config` |
| [PEP 742](https://peps.python.org/pep-0742/) | `TypeIs` | accepted, Python 3.13 | Primary; explains why `TypeIs` (not present here) would be the right choice over `TypeGuard` for a future `is_x()` helper |
| [PEP 678](https://peps.python.org/pep-0678/) | `Exception.add_note` | accepted, Python 3.11 | Primary; evaluated and found not currently warranted by the SDK's error model |
| [PEP 654 (via docs.python.org 3.11 What's New)](https://docs.python.org/3/whatsnew/3.11.html#pep-654-exception-groups-and-except) | Exception groups / `except*` | accepted, Python 3.11 | Primary; confirms the concurrent/parallel-aggregation use case the SDK's single-process-per-call model doesn't have |
| [docs.python.org — warnings.warn](https://docs.python.org/3/library/warnings.html#warnings.warn) | Stdlib `warnings` reference | current | Primary; exact `stacklevel` semantics used to verify `_config.py`'s `stacklevel=3` |
| [semver.org](https://semver.org/) | Semantic Versioning 2.0.0 spec | current | Primary; the exact 0.y.z clause governing what `0.1.0` actually promises |
| [httpx Discussion #3436](https://github.com/encode/httpx/discussions/3436) | Real maintainer thread on a 0.x breaking-change incident | 2024–2026 era | Primary; maintainer's own words that the stated deprecation policy wasn't enforced in practice |
| [httpx docs/compatibility.md](https://github.com/encode/httpx/blob/master/docs/compatibility.md) | httpx's own migration/compatibility doc | current | Concrete successful deprecate-then-remove examples (`data=`→`content=`, `.next`→`.next_request`) |
| [ruff rules — boolean-type-hint-positional-argument (FBT001)](https://docs.astral.sh/ruff/rules/boolean-type-hint-positional-argument/) | Ruff rule doc | ruff 0.16.x era | Primary; confirms keyword-only is the documented fix, matching the SDK's actual style |
| [ruff rules index — pydoclint (DOC)](https://docs.astral.sh/ruff/rules/#pydoclint-doc) | Ruff rule doc | ruff 0.16.x era | Rule catalog; cross-checked against this session's own `--preview --select DOC` run for real hit counts and false positives |
| [mkdocstrings/griffe — main docs](https://mkdocstrings.github.io/griffe/) | Griffe project docs | current | Primary; `griffe check` overview, cross-checked against this session's own `griffe check --help` and live runs |
| [sethmlarson.dev — Deprecations via warnings don't work for Python libraries](https://sethmlarson.dev/deprecations-via-warnings-dont-work-for-python-libraries) | Practitioner essay (Seth M. Larson, Python security/packaging contributor) | recent | Secondary; independent confirmation that `DeprecationWarning` is filtered out by default outside `__main__`, reinforcing why an explicit, correctly-`stacklevel`'d warning is not automatically visible to callers either |

Also read directly (not web sources, primary evidence from the audited repos and this session's own tool runs, not re-listed above): `/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/*.py` (all 13 files, full read), `pyproject.toml`, `CHANGELOG.md`; `/home/mherwig/dev/index/bot/src/indexbot/errors.py`, `exit_codes.py`, `pyproject.toml`; this session's own `pyright`, `ruff`, and `griffe check` invocations against both repos.
