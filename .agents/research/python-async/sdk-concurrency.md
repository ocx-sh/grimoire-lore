---
title: Async correctness and structured concurrency for a typed SDK
topic: python-async-concurrency
agent: dive-async-concurrency
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 20
scope: >
  Covers structured concurrency (TaskGroup vs gather vs create_task), cancellation
  semantics, timeout composition, blocking-in-loop detection, sync/async API-twin
  drift, and pytest-asyncio/anyio testing, grounded in a line-by-line inventory of
  ocx-sdk-python/src (the only asyncio codebase in the fleet) and index/bot (pure
  sync httpx, zero asyncio surface — included as the negative case). Does not cover
  uvloop, multiprocessing, or asyncio network-protocol/transport internals.
---

## Table of contents

1. [Structured concurrency as the default](#1-structured-concurrency-as-the-default)
2. [The fire-and-forget hazard](#2-the-fire-and-forget-hazard)
3. [Cancellation](#3-cancellation)
4. [Timeouts that compose](#4-timeouts-that-compose)
5. [Blocking inside the event loop](#5-blocking-inside-the-event-loop)
6. [Sync and async twins](#6-sync-and-async-twins)
7. [Testing: asyncio_mode="auto" and cancellation coverage](#7-testing-asyncio_modeauto-and-cancellation-coverage)
8. [What an LLM gets wrong here by default](#8-what-an-llm-gets-wrong-here-by-default)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Applied to the SDK and the bot](#applied-to-the-sdk-and-the-bot)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- This fleet has exactly one asyncio codebase: `ocx-sdk-python/src` (17 `async def`, 27 `await`). `index/bot` (93 files, 20,542 LOC) has **zero** `async def`, `await`, or asyncio import anywhere — confirmed by full-tree grep. Every async-specific rule below is N/A for bot as written today.
- `asyncio.TaskGroup` gives first-failure sibling cancellation and `ExceptionGroup` aggregation; `gather()` (default `return_exceptions=False`) propagates the first exception but does **not** cancel the other awaitables — [docs.python.org](https://docs.python.org/3/library/asyncio-task.html).
- `asyncio.create_task()` without a kept strong reference can be GC'd mid-flight — this is the asyncio docs' own documented warning, not a folk theory — [docs.python.org](https://docs.python.org/3/library/asyncio-task.html).
- `CancelledError` inherits `BaseException`, not `Exception`, since Python 3.8 — verified empirically on 3.14.5 in this session (`CancelledError.__mro__ == (CancelledError, BaseException, object)`). Consequence: a bare `except Exception:` **cannot** swallow a cancellation; only `except BaseException:` or a bare `except:` can, and ruff has no rule specific to `except CancelledError` — B036 only catches the coarser `except BaseException`.
- `asyncio.timeout()` (3.11+) is the recommended boundary primitive over `wait_for()`; `wait_for()` itself is reimplemented on top of `timeout()` since 3.12, not deprecated but no longer primitive — [docs.python.org](https://docs.python.org/3/library/asyncio-task.html#asyncio.timeout).
- Nathaniel Smith's argument holds precisely: a per-call `timeout=` cannot bound total wall-clock time across nested layers because each layer resets its own clock; a scope wrapping the call composes correctly regardless of nesting depth — [vorpus.org](https://vorpus.org/blog/timeouts-and-cancellation-for-humans/).
- `ocx-sdk-python` already resolves this tension in practice: `timeout: float | None` is a public **parameter** at the outermost API surface (matching the pattern ASYNC109 flags as an anti-pattern), but internally it is enforced with `asyncio.timeout(timeout)` at `_process.py:554` and `_process.py:752` — the parameter is the contract, the context manager is the mechanism.
- Ruff's `ASYNC` family is not selected in either project's `pyproject.toml`; running it manually against the SDK finds 6 real hits (`ASYNC109` × 6, one per public `timeout:` parameter) and 0 against bot (no asyncio to flag) — this surface is currently unguarded by CI in both repos.
- No ruff rule flags blocking calls that aren't in its curated stdlib/httpx list; `subprocess.run`, `time.sleep`, `open()` are covered (`ASYNC221`, `ASYNC251`, `ASYNC230`), but a slow synchronous `logging.Handler.emit` or a third-party blocking SDK call is invisible to it.
- CPython does not terminate a child process when the awaiting task is cancelled — this is an open, migrated bug ([gh-88050](https://github.com/python/cpython/issues/88050)) — and `ocx-sdk-python` works around it explicitly with `_terminate_group(proc)` inside its `except asyncio.CancelledError` handler at `_process.py:566-574`, with **no `await`** in that branch.
- httpx hand-duplicates `Client`/`AsyncClient` rather than generating one from the other (confirmed by reading `httpx/_client.py` directly on GitHub — no `unasync` tooling in that repo); `httpcore`, one layer down, does use `unasync` (`scripts/unasync.py` present in that repo) — two mature libraries, two different answers, both deliberate.
- `ocx-sdk-python` deliberately duplicates its sync/async drivers rather than bridging them: `_retry.py`'s own docstring states "the drivers are deliberate duplicates rather than a sans-io bridge: the bridge would be more code than the thing it abstracts."
- A signature-diff check across every `f`/`f_async` pair in `_process.py` finds real divergence (`popen_factory` vs `exec_factory`, and `_run_once_async` dropping `on_log`) — both are *intentional*, documented in the async twin's own docstring (`Raises: ValueError: on_log is unsupported on async paths...`), not drift. The check is a triage filter, not a hard gate.
- `pytest-asyncio`'s `asyncio_mode = "auto"` runs each async fixture's setup/teardown phases in **separate tasks**, breaking contextvar propagation across the phases; `anyio`'s pytest plugin runs the whole fixture+test lifecycle in one task, which is why it composes correctly with cancel scopes — [anyio.readthedocs.io](https://anyio.readthedocs.io/en/stable/testing.html).
- `auto` mode is still the documented right choice for an asyncio-only project with no trio/anyio dependency, which is exactly what `ocx-sdk-python` is (zero runtime deps) — switching to anyio would be solving a multi-backend problem this SDK doesn't have.
- The SDK's own cancellation tests (`tests/unit/test_process.py:787-802`, `:907-921`) are the positive example this program keeps looking for: they don't just assert `pytest.raises(CancelledError)`, they assert the *induced side effect* — `assert killpg == [(999, signal.SIGTERM)]` and `assert caught.value.__notes__ == [...]` — which is what "meaningful" cancellation coverage looks like, not just a line hit.
- `asyncio.sleep(0)` is not a language-level guaranteed checkpoint (it's an asyncio scheduler implementation detail); ruff's `ASYNC115` looks like it covers this but only fires on `trio.sleep(0)` / `anyio.sleep(0)` — verified empirically, it does **not** fire on `asyncio.sleep(0)`. There is no lint for the asyncio case.

## 1. Structured concurrency as the default

**The core argument.** Nathaniel J. Smith's "Notes on structured concurrency, or: Go statement considered harmful" draws a direct analogy to Dijkstra's case against `goto`: a bare `create_task`/`go`/thread-spawn is a jump with no matching return — the function that spawned it can complete while the spawned work is still running, so "functions are no longer black boxes with respect to control flow." Concretely, this breaks resource-scoped code: if a function opens a file in a `with` block and spawns a background task that touches the file, the file can close while the task is still using it — the `with` block's core promise ("closed immediately afterward") is void. It breaks error handling the same way: "if an error occurs in a background task, and you don't handle it manually, then the runtime just... drops it on the floor" ([vorpus.org](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/)).

A nursery (Trio) / `TaskGroup` (asyncio 3.11+) restores the black-box property: control enters at the top, and the scope cannot exit until every child has finished — success, failure, or cancellation. Four guarantees fall out of that one invariant: (1) a function that returns has no orphaned background work; (2) tasks can still be spawned dynamically inside the block (an accept-loop spawning a handler per connection is fine — the constraint is on when the scope *exits*, not on knowing the task list upfront); (3) one child's exception cancels its siblings and then propagates, rather than vanishing; (4) resource-scoped code (`with` blocks around a scope) is trustworthy again.

**`TaskGroup` vs `gather` vs bare `create_task`, precisely.** Per the asyncio docs:

- **`asyncio.TaskGroup`** (added 3.11): "The first time any of the tasks belonging to the group fails with an exception other than `asyncio.CancelledError`, the remaining tasks in the group are cancelled... Once all tasks have finished, if any tasks have failed with an exception other than `CancelledError`, those exceptions are combined in an `ExceptionGroup`... which is then raised." `KeyboardInterrupt`/`SystemExit` are special-cased: the group still cancels and waits, but re-raises the original exception, not a group ([docs.python.org](https://docs.python.org/3/library/asyncio-task.html)).
- **`asyncio.gather()`**, default `return_exceptions=False`: "the first raised exception is immediately propagated to the task that awaits on `gather()`. Other awaitables in the `aws` sequence **won't be cancelled** and will continue to run." They become orphaned background work with no scope watching them — exactly the failure mode Smith describes. If `gather()` itself is cancelled, its children are cancelled; but a child cancelling on its own is absorbed as if it had raised `CancelledError` rather than propagating the cancellation to `gather()`'s siblings ([docs.python.org](https://docs.python.org/3/library/asyncio-task.html)).
- **`return_exceptions=True`** changes `gather()`'s failure handling from "propagate first" to "collect all," treating every exception (including ones from cancelled children if not otherwise handled) as a normal result element in the returned list — no exception reaches the caller unless they inspect the list.
- The docs state the comparison directly: `TaskGroup` "provides stronger safety guarantees than `gather` for scheduling a nesting of subtasks: if a task... raises an exception, `TaskGroup` will, while `gather` will not, cancel the remaining scheduled tasks."
- **Bare `create_task`** with no group at all has neither guarantee — see [§2](#2-the-fire-and-forget-hazard).

**Decision for this SDK:** `TaskGroup` is already the sole concurrent-spawn primitive in the codebase (`_process.py:559-561`, draining stdout/stderr concurrently) and should stay the only one. `gather()` has zero call sites in `src/` today — good, keep it that way; it is the wrong default whenever siblings must not silently outlive a failed one, which is every case this SDK has.

## 2. The fire-and-forget hazard

The asyncio `create_task()` docs carry this exact warning, verbatim, under "Important":

> "Save a reference to the result of this function, to avoid a task disappearing mid-execution. The event loop only keeps weak references to tasks. A task that isn't referenced elsewhere may get garbage collected at any time, even before it's done." ([docs.python.org](https://docs.python.org/3/library/asyncio-task.html))

The docs' own recommended pattern — a `background_tasks` set plus a `done_callback` that discards the entry — is presented with a caveat: "this approach never awaits the tasks, so if a task fails, its exception is never retrieved," which is why the same paragraph recommends `TaskGroup` instead whenever the tasks can be scoped: it "keeps a strong reference to each task, awaits them and propagates their exceptions."

**Detection command:**

```
ruff check --select RUF006 src/
```

`RUF006` ("asyncio-dangling-task") fires on exactly this: "Checks for `asyncio.create_task` and `asyncio.ensure_future` calls that do not store a reference to the returned result" ([docs.astral.sh](https://docs.astral.sh/ruff/rules/asyncio-dangling-task/)). Verified live: `ruff check --select RUF006` on a planted `for i in range(3): asyncio.create_task(worker(i))` fires; on `ocx-sdk-python/src` (which stores every task via `group.create_task(...)` inside a `TaskGroup`) it is clean.

**What RUF006 does not catch, by inspection of its own description and by testing:** it is a syntactic check on the call site, not a lifetime analysis. It will not catch a task stored into a variable that is then dropped before the task finishes (`t = asyncio.create_task(x); del t`), a task stored into a mutable collection that is later cleared without being awaited, or a task handed off to another function that doesn't retain it either. `TaskGroup.create_task()` calls are not flagged because the group itself holds the strong reference — that is the correct behavior, and it is why `_process.py:560-561` is clean.

## 3. Cancellation

**`CancelledError` is `BaseException`, and this is precise, not folklore.** Verified in this session on Python 3.14.5:

```
>>> asyncio.CancelledError.__mro__
(<class 'asyncio.exceptions.CancelledError'>, <class 'BaseException'>, <class 'object'>)
```

The docs confirm the version: "Changed in version 3.8: `CancelledError` is now a subclass of `BaseException` rather than `Exception`" ([docs.python.org](https://docs.python.org/3/library/asyncio-exceptions.html)). **Consequence, stated precisely because a sibling worker in this program almost shipped the inverse claim:** since 3.8, `except Exception:` **cannot** swallow a cancellation — it never matches `BaseException` subclasses that aren't also `Exception` subclasses. The actual hazard is the *opposite* shape: `except BaseException:` or a bare `except:` with no re-raise, which does match and will silently absorb a cancellation request. There is no ruff rule specific to `except CancelledError`; the closest is `B036` (`except BaseException` without a top-level `raise`), which is coarser — it does not fire on `except asyncio.CancelledError:` specifically, so a targeted AST check is needed (see [Normative guidance, rule 5](#normative-guidance-candidates)).

**Re-raising after cleanup.** The docs' canonical example is `try: await sleep(...) except CancelledError: cleanup(); raise` — re-raise is mandatory unless the cancellation is deliberately absorbed, in which case `uncancel()` must also be called: "in cases when suppressing `asyncio.CancelledError` is truly desired, it is necessary to also call `uncancel()` to completely remove the cancellation state" ([docs.python.org](https://docs.python.org/3/library/asyncio-task.html#task-cancellation)).

**Shielding.** `asyncio.shield(awaitable)` protects the *inner* task from a cancellation of the *outer* awaiter — "if the coroutine containing it is cancelled, the Task running in `something()` is not cancelled... However, the caller is still cancelled, so the `await` expression still raises `CancelledError`." It does not make the call uncancellable; it decouples the two lifetimes.

**`uncancel()` / cancel-scope semantics (3.11+).** `Task.cancelling()` returns "the number of calls to `cancel()` less the number of `uncancel()` calls" — cancellation is a *count*, not a boolean. This is the mechanism `asyncio.timeout()` and `TaskGroup` use internally to "isolate cancellation to the respective structured block": an inner scope's timeout can fire, `uncancel()` the task once its own `except TimeoutError` has absorbed the signal, and let outer code continue unaffected. Changed in 3.13: reaching zero pending cancellations now also rescinds any pending cancellation request outright.

**gh-88050: cancellation does not kill subprocesses for you.** [python/cpython#88050](https://github.com/python/cpython/issues/88050), "Cannot cleanly kill a subprocess using high-level asyncio APIs" (open since 2021, migrated from bpo-43884). `ocx-sdk-python` is written with full awareness of this — the module docstring at `_process.py:290-292` cites it by number, and the `except asyncio.CancelledError` branch at `_process.py:566-574` is deliberately synchronous-only:

```python
except asyncio.CancelledError as cancelled:
    # gh-88050: CPython leaves the child running when the awaiting task is
    # cancelled. No grace wait and no awaits at all here — awaiting inside a
    # cancellation handler is how a caller that asked to stop ends up
    # hanging instead.
    _terminate_group(proc)
    if err:
        cancelled.add_note(f"partial ocx stderr before cancellation: {_decode(err, redact)}")
    raise
```

This is the answer to "what does correct cleanup look like when the cleanup itself is async?" for this SDK's own hardest case: **it doesn't let it be.** On the `CancelledError` path specifically, cleanup is a bare signal (`_terminate_group`, synchronous, non-blocking) with zero `await`s, so the cancellation is never delayed. Cleanup that genuinely must be async (the `TimeoutError` and generic `BaseException` paths, `_process.py:564` and `:578`) is wrapped in its own bounded `asyncio.timeout(grace)` inside `_kill_ladder_async` (`_process.py:748-754`) rather than run unbounded in a `finally`.

## 4. Timeouts that compose

Smith's argument, precisely: a `timeout=` parameter threaded into every layer resets independently at each layer, so it bounds *each call*, not the *total* time. His example: `requests.get(url, timeout=10)` still cannot guarantee termination in bounded time, because "if a malicious or misbehaving server sends at least 1 byte every 10 seconds, then our requests call above will keep resetting its timeout over and over and never return" ([vorpus.org](https://vorpus.org/blog/timeouts-and-cancellation-for-humans/)). Threading a timeout budget through every function by hand (recompute remaining budget at each call site) is exactly the boilerplate most libraries skip — which is why the naive advice ("add a timeout parameter everywhere") produces libraries that still hang.

The resolution is a scope, not a parameter: `with trio.move_on_after(10): await requests.get(...)` (or `async with asyncio.timeout(10): ...` in asyncio) applies the deadline to every blocking primitive underneath it, at whatever depth, with zero changes to the intervening code. Nesting is safe — the innermost deadline that actually expires wins, and 3.11's `uncancel()` machinery is what keeps an inner scope's expiry from also killing the outer one (see [§3](#3-cancellation)).

**What this SDK should do, and what it does.** It depends on whether the timeout is a value a *caller* needs to set per call (yes here — `ocx pull` and `ocx status` have genuinely different acceptable durations) or an internal implementation detail (no — nothing inside `_run_once_async` should be separately configurable). The SDK's actual design threads exactly one public `timeout: float | None` parameter down from the caller-facing API (`ClientHandle.invoke_async`, `run_async`, `exec_async` — `_client.py:498,688,1166,1500`) to `_process.py`'s `run_command_async`/`_run_once_async` (`_process.py:277,528`), and enforces it with a single `asyncio.timeout(timeout)` scope wrapping the whole attempt (`_process.py:554`) — read, both stream drains, and the exit wait. This is "both," resolved correctly: **one** public parameter as the contract, **one** scope as the mechanism, no manual budget recomputation anywhere in between. Ruff's `ASYNC109` (see [§5](#5-blocking-inside-the-event-loop) and [Contested](#contested--evolving)) flags the public parameter shape as if it were the naive per-call-threading anti-pattern; it is not, here, because nothing downstream re-derives a sub-budget from it.

## 5. Blocking inside the event loop

Enumerated hazards and their detectability:

| Hazard | Detected by | Not detected |
|---|---|---|
| `time.sleep(n)` in an `async def` | `ASYNC251` | — |
| `subprocess.run`/`Popen().wait()`/`.communicate()` in an `async def` | `ASYNC220`/`ASYNC221`/`ASYNC222` | a hand-rolled subprocess wait via `os.waitpid` |
| `open()` / blocking file read in an `async def` | `ASYNC230` | a file-like object that isn't `open()` itself (e.g. a third-party blocking stream) |
| `pathlib.Path.read_text()`/`.write_text()` etc. in an `async def` | `ASYNC240` | — |
| blocking `requests.get`/`httpx.Client` call in an `async def` | `ASYNC210`/`ASYNC212` | a bespoke blocking HTTP client not in ruff's curated list |
| `input()` in an `async def` | `ASYNC250` | — |
| CPU-bound work (hashing, parsing, compression) with no I/O | **nothing** — this is invisible to every rule above; it blocks the loop just as badly as `time.sleep` but has no lint signature | everything |
| slow synchronous `logging.Handler.emit` (e.g. a network log handler) called from an `async def` via `logger.info(...)` | **nothing** — logging calls are never flagged, regardless of handler | everything |

The full stable `ASYNC` family, keyed by code, from ruff's own docs ([docs.astral.sh](https://docs.astral.sh/ruff/rules/#flake8-async-async)): `ASYNC100` (cancel-scope-no-checkpoint), `ASYNC105` (trio-sync-call), `ASYNC109` (async-function-with-timeout), `ASYNC110` (async-busy-wait — prefer `Event` over polling `sleep` in a `while`), `ASYNC115` (async-zero-sleep, **trio/anyio only**, see below), `ASYNC116` (long-sleep-not-forever), plus the `ASYNC2xx`/`ASYNC3xx` blocking-call family in the table above.

**Measured, unguarded today.** Neither `ocx-sdk-python`'s nor `index/bot`'s `pyproject.toml` selects `ASYNC` (`ocx-sdk-python` selects `E,W,F,I,B,UP,ANN,RUF,D`; `bot` selects `E,F,W,I,UP,B,C4,SIM,RUF,S,ANN` — checked directly against both files). Running it manually:

```
ruff check --select ASYNC --no-fix src/     # inside ocx-sdk-python
```
→ 6 hits, all `ASYNC109`, at `_client.py:498,688,1166,1500` and `_process.py:277,528` (every public `timeout:` parameter — see [§4](#4-timeouts-that-compose) and [Contested](#contested--evolving) for why these are not real bugs).

```
ruff check --select ASYNC --no-fix src/     # inside index/bot
```
→ 0 hits (no `async def` exists to check — bot is not "clean," it's not applicable).

## 6. Sync and async twins

Three real answers from three mature libraries, verified against their actual source rather than assumed:

- **httpx: hand-duplicated, not generated.** `httpx/_client.py` defines `Client` and `AsyncClient` as separate hand-written classes in the same file (confirmed by reading the file directly via the GitHub API) — no `unasync`-style build step exists in that repository (`gh api repos/encode/httpx/contents/scripts` shows `build`, `check`, `clean`, `coverage`, `install`, `lint`, `publish`, `test`; no `unasync.py`).
- **httpcore: generated via `unasync`.** One layer below httpx, `httpcore`'s repository has `scripts/unasync.py` — it maintains one async source tree and mechanically produces the sync tree from it.
- **`unasync` itself** is token-substitution, not AST rewriting: it processes a source tree (conventionally `_async/`), applying a configurable list of literal replacements (`async def`→`def`, `await `→``, `AsyncClient`→`Client`, etc.) to emit a `_sync/` tree at build time. Elasticsearch's Python client is another documented user ([github.com/python-trio/unasync](https://github.com/python-trio/unasync)).
- **asgiref's `sync_to_async`/`async_to_sync`** (Django) are a third shape entirely: not code generation, a runtime bridge. `sync_to_async` runs the sync function in a thread pool (`thread_sensitive=True` pins it to one worker thread, required because "many libraries, specifically database adapters, require that they are accessed in the same thread that they were created in"); `async_to_sync` spins up (or reuses) an event loop — "essentially a more powerful version of `asyncio.run()`." Both preserve `contextvars`/threadlocals across the boundary ([docs.djangoproject.com](https://docs.djangoproject.com/en/stable/topics/async/)).

**`ocx-sdk-python`'s answer: deliberate duplication, explicitly reasoned in the source.** `_retry.py`'s module docstring: "A pure delay generator plus two small drivers, one sync and one async. The drivers are deliberate duplicates rather than a sans-io bridge: the bridge would be more code than the thing it abstracts." This is the same choice httpx made (hand-duplicate) and the opposite of httpcore's (generate) — both are legitimate; the deciding factor here is that the async twin isn't a mechanical transform of the sync one (different subprocess primitives, different cancellation branch, different I/O-pumping strategy), so a generator would be fighting the real divergence rather than eliminating accidental divergence.

**What keeps them from drifting, and the check that they haven't.** There is no build-time generator to fall back on, and no test currently runs the sync and async twins through one shared parametrized assertion set — the test suite instead uses a **naming convention**: every `test_run_with_retry_*` in `tests/unit/test_retry.py` has a `test_run_with_retry_async_*` counterpart (verified: `run_with_retry`'s 9 sync tests are named 1:1, or near-1:1, against 9 async tests). That convention makes an *added* sync test with no async counterpart visually obvious in a diff, but it does not catch signature drift on the source functions themselves. A targeted check for that:

```
python3 check_twin_signatures.py src/ocx_sdk/_process.py src/ocx_sdk/_retry.py src/ocx_sdk/_client.py
```
(AST-based: for every `def foo(...)` with a sibling `def foo_async(...)` in the same file, diff their parameter-name lists; empty output = pass, any line = a candidate to review — not a hard failure, see below.)

Verified live against the real source: it fires on `_process.py`, flagging `run_command`/`run_command_async` (`popen_factory` vs `exec_factory` — a necessary rename, the seams are different factory *types*, not the same thing under two names) and `_run_once`/`_run_once_async` (`_run_once_async` drops `on_log` entirely — deliberate: `run_command_async`'s own docstring documents `Raises: ValueError: on_log is unsupported on async paths in v0.1 — a blocking callback would stall the event loop it fires on`). Both flagged pairs are *intentional*, both are *already documented at the point of divergence*. The check is therefore correctly scoped as a **triage filter that forces a human look**, not a CI gate that blocks on any diff — the real anti-drift mechanism in this codebase is that every asymmetry carries its own docstring explanation, and the check's job is only to make sure no asymmetry escapes without one.

**`index/bot` has no twins to drift.** It is sync-only by construction (`httpx.Client`, never `httpx.AsyncClient`; no subprocess calls of either kind) — this question does not apply to it today.

## 7. Testing: asyncio_mode="auto" and cancellation coverage

**What `auto` changes.** In `auto` mode, pytest-asyncio "automatically marks all asynchronous test functions with the asyncio marker and takes control of all async fixtures," regardless of decorator; in `strict` mode only explicitly `@pytest.mark.asyncio`/`@pytest_asyncio.fixture`-marked items are touched, which is what lets `strict` "coexist with other async testing plugins in the same codebase" ([pytest-asyncio docs](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html)). The docs are explicit about the tradeoff: "this mode is intended for projects that use asyncio as their only asynchronous programming library" — which is exactly `ocx-sdk-python`'s situation (zero runtime dependencies, no trio, no anyio).

**The failure mode `auto` doesn't warn about, and why `anyio` is the alternative in 2026.** pytest-asyncio "runs the setup and teardown phases of each async fixture in a new async task per operation" — the setup half and teardown half of an async generator fixture execute in *different* tasks. This breaks `contextvars` propagation across that boundary and, more importantly for this document's scope, means a fixture cannot reliably set up a cancel scope that the test body's assertions can trust — the scope and the code using it may not even share a task. AnyIO's pytest plugin instead "runs all async fixtures and tests in the same task," which is precisely why testing a `TaskGroup`/`asyncio.timeout()` interaction from a fixture is reliable under anyio and fragile under pytest-asyncio ([anyio.readthedocs.io](https://anyio.readthedocs.io/en/stable/testing.html); corroborated independently at [github.com/agronholm/anyio#614](https://github.com/agronholm/anyio/issues/614)).

**Verdict for this SDK specifically:** stay on `asyncio_mode = "auto"`. The SDK has no multi-backend requirement (no trio/anyio dependency, `requires-python = ">=3.12"` with zero runtime deps), so the documented purpose of `auto` mode is met exactly, and the contextvar/task-splitting hazard above only bites a project that spans backends or that leans on fixture-scoped cancel scopes — this SDK's cancellation tests set up their own tasks inline inside the test body (`task = asyncio.create_task(...)`, `_process.py` tests), not through a fixture, so they never hit the failure mode. Re-evaluate only if the SDK grows a trio/anyio-dependent consumer test or starts building cancel scopes inside fixtures.

**Does this SDK test cancellation and timeout paths, and meaningfully?** Yes, and it is the strongest evidence in this whole inventory that "100% line coverage" and "meaningfully tested" are different claims. `tests/unit/test_process.py:787-802` (`test_run_command_async_cancellation_terminates_the_child`) and `:907-921` (`test_run_command_async_cancellation_keeps_the_partial_stderr`) both drive real cancellation (`task = asyncio.create_task(...); await asyncio.sleep(0); task.cancel(); await task`) and assert the *induced side effect*, not just that an exception type was raised:

```python
task.cancel()
with pytest.raises(asyncio.CancelledError):
    await task

assert killpg == [(999, signal.SIGTERM)]  # the kill signal actually fired
assert caught.value.__notes__ == [
    "partial ocx stderr before cancellation: resolving uv\n"
]  # partial output survived
```

A branch-coverage tool would mark the `except asyncio.CancelledError` line "covered" the moment any test reaches it with any assertion (or none) — it cannot distinguish this from a test that merely does `with pytest.raises(CancelledError): await task` and stops. **Mechanical check for "meaningfully covered," since coverage tooling itself cannot answer this:**

```
grep -A6 -n "def test.*cancel" tests/unit/test_process.py | grep -c "assert "
```
Empty or a bare `pytest.raises` with no trailing `assert` = the finding (coverage without a behavioral check); any `assert` beyond the `raises` context = pass. Verified manually against both cancellation tests above — both pass.

## 8. What an LLM gets wrong here by default

See [AI-agent angle](#ai-agent-angle) for the full table with checks; summarized here: stale `get_event_loop()`, `wait_for` reached for out of habit where a `timeout()` scope is already the right shape, `gather()` used where TaskGroup's fail-fast semantics are actually wanted, `except Exception`/`except BaseException` confusion around `CancelledError`, `asyncio.run()` nested inside a running loop, a coroutine built and never awaited, and `asyncio.sleep(0)` treated as a yield-point guarantee it doesn't have.

## Normative guidance candidates

1. **Spawn concurrent children only inside `asyncio.TaskGroup`; never bare `create_task` outside one, never `gather()` for anything where a sibling should be cancelled on first failure.** Rationale: `gather()`'s default leaves failed siblings running with no scope watching them ([§1](#1-structured-concurrency-as-the-default)). Verification: `grep -n "asyncio\.gather(" <path>` — empty = pass, any hit is a candidate needing a stated reason (e.g. deliberate `return_exceptions=True` fan-out with no fail-fast requirement) or a rewrite to `TaskGroup`.

2. **Every `asyncio.create_task()` call must bind its result — a variable, a set, or a `TaskGroup.create_task()` call — never a bare statement.** Rationale: unreferenced tasks are only weakly held by the loop and can be GC'd mid-flight ([§2](#2-the-fire-and-forget-hazard)). Verification: `ruff check --select RUF006 <path>` — empty = pass, any finding is the violation. Watched red in this session against a planted `asyncio.create_task(worker(i))` loop with no binding.

3. **Every `except CancelledError:` (and every `except BaseException:`, bare `except:`) block must contain a `raise` in its own body, or call `.uncancel()` if the suppression is deliberate.** Rationale: since 3.8 these are the *only* clauses that can catch a cancellation; not re-raising silently converts a stop request into a normal return ([§3](#3-cancellation)). Verification: an AST walk over every `ExceptHandler` whose caught type includes `CancelledError`/`BaseException`/bare, checking for a `Raise` node anywhere in the body; empty output = pass, one line per offending handler = the finding. Watched red against a planted `except asyncio.CancelledError: return "gave up"`; watched clean against `ocx_sdk/_process.py` (both of its matching handlers re-raise — `CancelledError` at `_process.py:574`, `BaseException` at `_process.py:579`).

4. **No `await` inside a `CancelledError`-handling branch beyond what is strictly required to release the resource being torn down — and none at all if the resource can be released synchronously.** Rationale: an `await` here delays the cancellation the caller already asked for; CPython does not terminate subprocesses on task cancellation for you (gh-88050), so this branch is often the only place a synchronous kill call belongs ([§3](#3-cancellation)). Verification: reading heuristic — for every `except (asyncio.)?CancelledError` handler, list every `await` inside it and require a one-line comment justifying each; `ocx_sdk/_process.py:566-574` has zero.

5. **A public async API that accepts `timeout:` may keep it as its *external* contract, but must enforce it with exactly one `asyncio.timeout()`/`asyncio.timeout_at()` scope wrapping the whole operation internally — never by hand-threading a shrinking budget through nested calls.** Rationale: per-call threading cannot bound total time across layers; a scope does, regardless of nesting depth ([§4](#4-timeouts-that-compose)). Verification: for a flagged `ASYNC109` site, grep the function body (and everything it calls in-module) for `asyncio.timeout(` — a hit means the parameter is the contract and the scope is the mechanism (suppress with `# noqa: ASYNC109 <why>`); no hit is the real finding. `ocx-sdk-python`'s 6 `ASYNC109` sites all resolve to the single `asyncio.timeout(timeout)` at `_process.py:554`.

6. **Select `ASYNC` in ruff for any file containing `async def`; do not leave it unselected because the project also touches sync code.** Rationale: every blocking-call rule in the family (`ASYNC210/220/221/222/230/240/250/251`) is invisible without it, and this fleet's one asyncio codebase currently ships with none of them enabled. Verification: `ruff check --select ASYNC --no-fix src/` — empty = pass. Currently 6 findings in `ocx-sdk-python` (all `ASYNC109`, all resolved by rule 5's verification), 0 in `bot` (not applicable — no `async def` exists).

7. **Never call a known-blocking sync primitive (`time.sleep`, `subprocess.run`/`.wait()`/`.communicate()`, `open()`, `Path.read_*`/`write_*`, `input()`, a blocking HTTP client) from inside `async def`.** Rationale: each one stalls every other task on the loop for its full duration ([§5](#5-blocking-inside-the-event-loop)). Verification: `ruff check --select ASYNC210,ASYNC212,ASYNC220,ASYNC221,ASYNC222,ASYNC230,ASYNC240,ASYNC250,ASYNC251 <path>` — empty = pass. Watched red in this session against a planted function combining `time.sleep`, `subprocess.run`, and `open()` inside one `async def` — all three fired (`ASYNC251`, `ASYNC221`, `ASYNC230`).

8. **Do not treat `await asyncio.sleep(0)` as a guaranteed cooperative-yield point in a busy loop; use it only where any scheduler tick is acceptable, and prefer an `Event`/condition for anything that needs to actually wait on a signal.** Rationale: it is an asyncio scheduler implementation detail, not a language guarantee, and ruff's lookalike rule doesn't cover it. Verification: `grep -rn --include='*.py' "asyncio\.sleep(0)" <path>` — empty = pass. Watched red against a planted `while True: await asyncio.sleep(0)`; note `ruff check --select ASYNC115` does **not** fire on this (verified empirically — `ASYNC115` only matches `trio.sleep(0)`/`anyio.sleep(0)`), so the grep is not redundant with a lint rule, it is the only check.

9. **A sync/async twin pair (`f`/`f_async`) may have different parameter names only when the divergence is explained in the async twin's own docstring at the point of difference.** Rationale: mature libraries choose either hand-duplication (httpx) or generation (httpcore) for twins, but both keep them from drifting through an explicit anti-drift mechanism, not by hoping they stay in sync ([§6](#6-sync-and-async-twins)). Verification: the AST signature-diff check described in §6 — treat every finding as "needs a docstring line," not as an automatic failure; `_process.py`'s two real findings both already have one.

10. **Cancellation- and timeout-path tests must assert an induced side effect, not just the exception type.** Rationale: coverage tooling cannot distinguish `pytest.raises(CancelledError)` alone from a test that also verifies the cleanup actually happened ([§7](#7-testing-asyncio_modeauto-and-cancellation-coverage)). Verification: for every test function whose name contains `cancel` or `timeout`, require at least one `assert` line after the `pytest.raises`/`except` block that inspects a mock call, a captured signal, a note, or a similar observable — not merely that control reached past the `with` block.

11. **Stay on `pytest-asyncio` `asyncio_mode = "auto"` only while the project has no trio/anyio runtime dependency and builds no cancel scopes inside fixtures; re-evaluate toward `anyio`'s pytest plugin the moment either becomes true.** Rationale: `auto` mode's own docs scope it to asyncio-only projects; its task-per-fixture-phase behavior breaks contextvar/cancel-scope correctness the moment a test relies on state surviving a fixture's setup→teardown boundary ([§7](#7-testing-asyncio_modeauto-and-cancellation-coverage)). Verification: `grep -rn "anyio\|trio" pyproject.toml` — a hit while `asyncio_mode = "auto"` is still set is the flag to re-evaluate; today it is clean in `ocx-sdk-python`.

12. **Never call `asyncio.get_event_loop()`; use `asyncio.get_running_loop()` inside a coroutine/callback, `asyncio.run()` at the application entry point.** Rationale: `get_event_loop()`'s own docs mark `get_running_loop()` as "preferred... in coroutines and callbacks," and as of 3.14 it raises `RuntimeError` if there is no current loop rather than silently creating one — behavior an LLM trained on pre-3.10 examples routinely gets wrong ([docs.python.org](https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.get_event_loop)). Verification: `grep -rn --include='*.py' "get_event_loop(" <path>` — empty = pass. Clean in both `ocx-sdk-python` and `bot` today.

13. **Every `asyncio.subprocess.Process` obtained inside a task that can be cancelled must be explicitly signalled (terminate/kill) from within the `CancelledError` handler that wraps it — do not rely on cancellation alone to end the child.** Rationale: gh-88050 — this is not fixed by CPython at any current version ([§3](#3-cancellation)). Verification: for every `except (asyncio.)?CancelledError` handler in a module that also calls `asyncio.create_subprocess_exec`/`_shell`, require a `terminate`/`kill`/process-group-signal call in the same block. `ocx_sdk/_process.py:566-574` satisfies this (`_terminate_group(proc)`); no other module in `src/` spawns subprocesses.

## Applied to the SDK and the bot

| # | Rule | ocx-sdk-python | index/bot |
|---|---|---|---|
| 1 | TaskGroup-only spawning | **Satisfied.** `_process.py:559-561`; `gather(` has 0 hits in `src/`. | N/A — no async code. |
| 2 | Bound `create_task` references | **Satisfied.** Both call sites are `group.create_task(...)` (`_process.py:560-561`); `RUF006` clean. | N/A. |
| 3 | Re-raise/uncancel in cancellation handlers | **Satisfied.** `_process.py:566-574` re-raises after `_terminate_group`; the sibling `except BaseException:` at `:575-579` re-raises too. The only two matching handlers in `src/`. | N/A. |
| 4 | No unjustified `await` in cancellation branch | **Satisfied.** Zero `await`s in the branch, by design and by comment. | N/A. |
| 5 | Single `asyncio.timeout()` scope backing a public `timeout:` param | **Satisfied.** All 6 `ASYNC109`-flagged params (`_client.py:498,688,1166,1500`; `_process.py:277,528`) resolve to `asyncio.timeout(timeout)` at `_process.py:554`. **New commitment:** add `# noqa: ASYNC109` with this rationale at each site once rule 6 is adopted, so the lint can be turned on without 6 permanent false positives. | N/A. |
| 6 | `ASYNC` selected in ruff | **Violated.** Not in `[tool.ruff.lint] select` (checked directly — `E,W,F,I,B,UP,ANN,RUF,D`, no `ASYNC`). 6 latent findings, all pre-triaged by rule 5. | **Violated in the sense of "missing," but moot** — 0 findings possible with 0 `async def`. Lower priority than the SDK. |
| 7 | No blocking sync calls in `async def` | **Satisfied.** 0 findings from the full `ASYNC2xx` blocking family against `src/`. | N/A — no `async def` to check. |
| 8 | No `asyncio.sleep(0)` as a yield guarantee | **Satisfied.** 0 hits for `asyncio\.sleep(0)` in `src/`. | N/A. |
| 9 | Documented sync/async twin divergence | **Satisfied, with a gap.** `run_command_async`'s `on_log` rejection is documented in its own `Raises:` block; the AST diff check flags it and one factory-seam rename correctly as intentional. **New commitment:** add a one-line comment at the `popen_factory`/`exec_factory` divergence too, since today only the `on_log` asymmetry is explained in prose — the factory rename is discoverable only by reading both signatures side by side. | N/A — no twins exist (sync-only by construction). |
| 10 | Cancellation/timeout tests assert side effects | **Satisfied.** `tests/unit/test_process.py:787-802,907-921` assert `killpg` contents and `__notes__`, not just the raised type. | N/A — no cancellation paths to test. |
| 11 | `asyncio_mode="auto"` justified | **Satisfied.** Zero runtime deps, no trio/anyio in `pyproject.toml`; cancellation tests build their own tasks inline rather than through fixtures, so the fixture-task-splitting hazard doesn't apply even latently. | N/A — pytest-asyncio isn't installed; `asyncio` doesn't appear in `bot`'s `pyproject.toml` at all. |
| 12 | No `get_event_loop()` | **Satisfied.** 0 hits in `src/`. | N/A. |
| 13 | Subprocess terminated on cancellation | **Satisfied.** `_process.py:566-574`, the only subprocess-spawning module in `src/`. | N/A — `bot` has no subprocess usage anywhere (confirmed by the task brief and by this session's grep). |

**Reading the table:** 11 of 13 rules are already satisfied in `ocx-sdk-python`'s existing code; the two violations are both "the CI gate doesn't exist yet, not that the code is wrong" (rule 6) and "one of two documented divergences should also be documented" (rule 9, a one-line gap). `index/bot` is N/A across the board — it is the fleet's example of a codebase that correctly has no asyncio surface, and these rules should only be *adopted* by bot if it ever grows one (e.g. parallel GitHub API calls), not applied preemptively to a codebase with nothing to check.

## AI-agent angle

| Default LLM mistake | Why it happens | Smallest mechanical check |
|---|---|---|
| `asyncio.get_event_loop()` inside a coroutine | Trained on pre-3.10 examples; the function still exists and still "works" outside a running loop, so it doesn't error during a quick manual test | `grep -rn --include='*.py' "get_event_loop(" <path>` |
| `asyncio.wait_for(coro, timeout=N)` reached for reflexively instead of `async with asyncio.timeout(N):` | `wait_for` is the pattern in nearly every pre-2022 tutorial; `timeout()` is 3.11+ and underrepresented in training data relative to its recency | `grep -rn --include='*.py' "wait_for(" <path>` — not a hard fail (wait_for is not deprecated), a prompt to check whether the call site is a single-awaitable timeout (fine) or should be a scope wrapping multiple statements (rewrite) |
| `asyncio.gather(*tasks)` reached for where a `TaskGroup` is actually wanted | `gather` predates `TaskGroup` by a decade and dominates training data; the two look interchangeable at a glance | `grep -rn --include='*.py' "asyncio\.gather(" <path>` — review each hit for whether `return_exceptions` is set and whether sibling-cancel-on-failure is actually wanted |
| `except Exception:` assumed to swallow `CancelledError` (or, the inverse mistake, added defensive re-raise code assuming it does) | Confuses `CancelledError`'s pre-3.8 behavior (was `Exception`) with current behavior (`BaseException` since 3.8); this SDK's own contributors nearly shipped the inverse claim | Empirically settled, not a grep: `python3 -c "import asyncio; print(asyncio.CancelledError.__mro__)"` prints `BaseException` in the MRO, not `Exception` |
| `asyncio.run(coro())` called from inside a function that is itself already running under `asyncio.run()` | LLM writes a convenience wrapper ("just run this async thing") without tracking whether the call site is already inside a loop | Empirically: raises `RuntimeError: asyncio.run() cannot be called from a running event loop` (message verified live on 3.14.5 in this session) — static proxy: `grep -rn --include='*.py' "asyncio\.run(" <path>` combined with checking none of the hits are inside another `async def` |
| A coroutine is constructed and never `await`ed (`result = fetch_data()` instead of `result = await fetch_data()`) | The call *looks* like it ran — Python happily constructs the coroutine object and moves on; nothing raises at the call site | Not a static-lint problem in general (no ruff rule for it); run the test suite with `-W error::RuntimeWarning` (or add `filterwarnings = ["error::RuntimeWarning"]` to `pytest.ini_options`) — CPython already emits `RuntimeWarning: coroutine '...' was never awaited` at GC time, verified live in this session; promoting it to an error turns a silent no-op into a hard test failure |
| `await asyncio.sleep(0)` treated as "yield to the scheduler and guarantee fairness" | Reads as an idiomatic explicit-yield pattern, and it *is* one in practice on today's default event loop — the mistake is trusting it as a language guarantee that generalizes across loop implementations | `grep -rn --include='*.py' "asyncio\.sleep(0)" <path>` — flag for manual review; note `ruff --select ASYNC115` will **not** catch this (asyncio isn't in its scope, only trio/anyio), verified empirically in this session |

## Contested / evolving

- **`ASYNC109` vs. a deliberately public `timeout:` parameter.** The rule's stated rationale — "async functions should remain unaware of timeout logic; callers manage it via context managers" — is sound advice for an *internal* helper, and actively wrong advice for a *public library entry point* where the caller cannot be expected to reach for `asyncio.timeout()` themselves; a typed SDK's whole job is to make a foot-gun-free surface. `ocx-sdk-python` resolves this by keeping the parameter and enforcing it with the scope internally (§4, rule 5) — this is a case where the rule's own docs concede the escape hatch exists ("false positives from this rule can be avoided by using a different parameter name") without endorsing the actually-correct fix (suppress with a documented reason). As of this research (August 2026), ruff has not added a way to mark a `timeout:` parameter as "the public contract, enforced internally" — the honest fix today is a `# noqa: ASYNC109` with a comment, not a rule change.
- **pytest-asyncio vs. anyio's pytest plugin** is trending toward anyio for any project that either needs multi-backend testing or leans on fixture-scoped structured concurrency; pytest-asyncio's maintainers have not resolved the per-fixture-phase task-splitting behavior as of the docs read in this session, and it is a known, filed issue upstream (agronholm/anyio#614), not a rumor. For an asyncio-only, zero-dependency SDK like this one, the tradeoff currently still favors staying put — but this is the kind of decision that should be revisited on a fixed cadence (e.g. at the next major Python or pytest-asyncio version bump), not decided once and forgotten.
- **`wait_for()`'s status is genuinely ambiguous.** It is not deprecated, and as of 3.12 it is implemented *in terms of* `asyncio.timeout()` internally — the docs neither recommend nor discourage it for new code, they simply describe both. Treat "prefer `timeout()`" as this document's judgment call for multi-statement scopes, not as an official deprecation `wait_for()` does not carry.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful](https://vorpus.org/blog/notes-on-structured-concurrency-or-go-statement-considered-harmful/) | Nathaniel J. Smith's essay, primary source | 2018, still the canonical reference | Origin of "structured concurrency" as a term and the goto analogy that motivated `TaskGroup` |
| [vorpus.org/blog/timeouts-and-cancellation-for-humans](https://vorpus.org/blog/timeouts-and-cancellation-for-humans/) | Same author, primary source | 2018 | The exact argument this document's §4 resolves for the SDK |
| [trio.readthedocs.io/en/stable/design.html](https://trio.readthedocs.io/en/stable/design.html) | Trio's own design-rationale docs, primary source | current (stable channel) | Nursery/cancel-scope rationale from the library that originated both, independent of Smith's blog framing |
| [docs.python.org/3/library/asyncio-task.html](https://docs.python.org/3/library/asyncio-task.html) | CPython stdlib docs, primary source | current, 3.14-era | `TaskGroup`, `create_task`'s strong-reference warning, `gather()` semantics, `timeout()`/`timeout_at()`, `uncancel()` |
| [docs.python.org/3/library/asyncio-exceptions.html](https://docs.python.org/3/library/asyncio-exceptions.html) | CPython stdlib docs, primary source | current | `CancelledError`'s `BaseException` change (3.8) and `TimeoutError` aliasing (3.11) |
| [docs.python.org/3/library/asyncio-eventloop.html#asyncio.get_event_loop](https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.get_event_loop) | CPython stdlib docs, primary source | current, notes a 3.14 behavior change | Confirms `get_running_loop()` is the documented replacement, not folklore |
| [peps.python.org/pep-0654](https://peps.python.org/pep-0654/) | PEP 654, primary source | 2021, accepted (3.11) | States directly that asyncio's `TaskGroup` design was "the main motivation" for `ExceptionGroup`/`except*` |
| [docs.astral.sh/ruff/rules/#flake8-async-async](https://docs.astral.sh/ruff/rules/#flake8-async-async) | Ruff rule index, primary source (tool vendor docs) | current (ruff 0.16.x, matches installed version) | Full `ASYNC` code list used to build §5's table |
| [docs.astral.sh/ruff/rules/asyncio-dangling-task](https://docs.astral.sh/ruff/rules/asyncio-dangling-task/) | Ruff `RUF006` page, primary source | current | Exact rule text quoted in §2 |
| [docs.astral.sh/ruff/rules/async-function-with-timeout](https://docs.astral.sh/ruff/rules/async-function-with-timeout/) | Ruff `ASYNC109` page, primary source | current | Basis for the Contested section's discussion of public-API timeout params |
| [pytest-asyncio.readthedocs.io/en/latest/concepts.html](https://pytest-asyncio.readthedocs.io/en/latest/concepts.html) | pytest-asyncio docs, primary source | current | `auto` vs `strict` mode semantics, scoping `auto` to asyncio-only projects |
| [anyio.readthedocs.io/en/stable/testing.html](https://anyio.readthedocs.io/en/stable/testing.html) | anyio docs, primary source | current | Same-task fixture execution, the basis for §7's testing-cancellation argument |
| [github.com/agronholm/anyio/issues/614](https://github.com/agronholm/anyio/issues/614) | GitHub issue, primary source (upstream maintainer discussion) | open as of this research | Independent corroboration of the pytest-asyncio contextvar/fixture-task issue |
| [github.com/python/cpython/issues/88050](https://github.com/python/cpython/issues/88050) | CPython issue tracker, primary source | opened 2021, open | The exact bug `ocx-sdk-python`'s cancellation handler is written to work around |
| [github.com/python-trio/unasync](https://github.com/python-trio/unasync) | Tool source/README, primary source | current | Confirms `unasync`'s token-substitution mechanism and its known users |
| [github.com/encode/httpx](https://github.com/encode/httpx) (`httpx/_client.py`, `scripts/`) | Library source, primary source | current (`master`) | Verified directly, not from a summary: no `unasync` tooling, hand-duplicated `Client`/`AsyncClient` |
| [github.com/encode/httpcore](https://github.com/encode/httpcore) (`scripts/unasync.py`) | Library source, primary source | current (`master`) | Verified directly: `httpcore` does generate its sync tree via `unasync`, the opposite choice from httpx one layer up |
| [docs.djangoproject.com/en/stable/topics/async](https://docs.djangoproject.com/en/stable/topics/async/) | Django docs, primary source | current | `sync_to_async`/`async_to_sync` as the third sync/async-bridging shape, contrasted with duplication and generation |
| [python-httpx.org/async](https://www.python-httpx.org/async/) | httpx user docs | current | Usage-level confirmation that `Client`/`AsyncClient` are presented as two distinct, complete APIs |
| Empirical: `python3 -c "..."` on this machine, Python 3.14.5 | Direct interpreter verification, primary source | this session, 2026-08-23 | `CancelledError.__mro__` and the exact `asyncio.run()` nested-loop `RuntimeError` message, checked rather than assumed |
