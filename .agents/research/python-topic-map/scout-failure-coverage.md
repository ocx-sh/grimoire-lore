---
title: Python failure corpus — "nothing catches this" verification pass
corpus: coverage audit of the 32 "nothing"-prefixed rows (+3 differently-phrased) from scout-failure.md
agent: scout-failure-coverage
model: sonnet
date_researched: 2026-08-22
sources_count: 12
---

Method: every verdict below was produced by running the named tool (ruff 0.16.1 installed locally;
pylint, bandit, pyright, slotscheck run via `uvx <tool>` — ephemeral, nothing installed persistently)
against a snippet in a scratch directory, or by citing the exact doc page when no snippet could
settle it. Every row marked `genuinely-uncaught` with a hand-written check was proven red on a
snippet first, then run against `/home/mherwig/dev/ocx/test` (1156 .py files) and
`/home/mherwig/dev/ocx-sdk-python` (1287 .py files). All scratch snippets were deleted after use;
none of the audited repos were modified.

## Table of contents

- [Verification table](#verification-table)
- [Collapsed into config](#collapsed-into-config)
- [Still genuinely uncaught, ranked](#still-genuinely-uncaught-ranked)
- [Stale-belief corrections](#stale-belief-corrections)

## Verification table

Empty check output = PASS unless noted otherwise. Hit counts are call/occurrence counts, not files.

| Failure | Verdict | Check / citation | Fleet hits (ocx/test, sdk) |
|---|---|---|---|
| Shallow vs deep copy confusion | genuinely-uncaught | No AST-level distinguisher exists between "meant shallow" and "bug" — semantic, not syntactic. Marked `unverified` per instructions rather than guessing a check. | n/a |
| `list * n` aliasing | genuinely-uncaught | `rg -n --pcre2 '\[\s*(\[\]|\{\})\s*\]\s*\*' -g '*.py' <path>` — red on `[[]] * 3`; empty = pass. Confirmed no ruff rule (`ruff check --select ALL --preview`, ALL 900+ rules, no hit). | 0, 0 |
| `dict`/`set` mutation during iteration | **caught-by-ruff-B909** | `loop-iterator-mutation` (preview). Ran `ruff check --select ALL --preview` on `for k in d: del d[k]` → fired `B909: Mutation to loop iterable 'd' during iteration`. **Corrects scout-failure.md**, which said "nothing (no static lint catches all cases)." | — |
| Float formatting / `Decimal` for money | genuinely-uncaught | No syntactic signature (any float use might be money or might not). `unverified`. | n/a |
| DST / naive datetime arithmetic | genuinely-uncaught (partial overlap) | ruff DTZ family also fires `DTZ005` on bare `datetime.now()`, not just `DTZ003` on `utcnow()` — confirmed via snippet. That stops naive-datetime *creation*, not DST-crossing *arithmetic* on an already-aware datetime, which remains uncaught. `unverified` for the arithmetic-specific case. | n/a |
| `__del__` and object resurrection | genuinely-uncaught | `rg -n 'def __del__\(' -g '*.py' <path>` — inventory of classes worth a manual resurrection-safety read, not a violation detector. Red on `class Resource: def __del__(self): pass`. | 0, 0 |
| Circular imports | **caught-by-pylint-R0401** | `cyclic-import`, mainline pylint (not an extension). `uvx pylint --disable=all --enable=cyclic-import a.py b.py` on a two-file cycle → `R0401: Cyclic import (a -> b)`. **Corrects scout-failure.md**, which said "nothing static." | — |
| `__init__.py` / namespace-package shadowing | **caught-by-ruff-INP001** (partial) | `implicit-namespace-package` fired on a `.py` file with no sibling `__init__.py`. Catches the *precondition* (an accidental implicit namespace package existing at all); does NOT detect the actual shadowing collision between two same-named implicit packages on `sys.path` — that needs a full-environment check no static tool performs. **Corrects scout-failure.md** for the common case. | — |
| `sys.path` manipulation for imports | genuinely-uncaught | `rg -n 'sys\.path\.(insert|append)\(' -g '*.py' <path>`. Red on `sys.path.insert(0, "../lib")`. Checked ruff (no hit) and pylint `--enable=all` (no hit). | **8**, 0 |
| Generator cleanup and `GeneratorExit` | genuinely-uncaught | `rg -n 'except GeneratorExit' -g '*.py' <path>` — inventory (flags handlers worth reading for a swallowed `GeneratorExit`, not itself proof of a bug). Red on `except GeneratorExit: pass`. No ruff/pylint hit. | 0, 0 |
| `contextlib.suppress` over-broad | genuinely-uncaught | `rg -n 'suppress\((Exception|BaseException)\)' -g '*.py' <path>`. Red confirmed. Ruff's only related rule (`SIM105`) nudges the *opposite* direction (turn narrow try/except into suppress) and does not flag suppress(Exception) as too broad. | 0, 0 |
| `functools.lru_cache` on instance methods | **caught-by-ruff-B019** | `cached-instance-method`. Fired on `class Foo: @functools.lru_cache\n def bar(self, x): ...`. **Corrects scout-failure.md**, which said "ruff has no rule for this." | 0, 0 (no `@lru_cache`/`@cache` at all in either repo) |
| Class-attribute vs instance-attribute mutation | **caught-by-ruff-RUF012** | `mutable-class-default`. Fired on `class Base: items = []`. **Corrects scout-failure.md**, which said "nothing automated." | — |
| `super()`/MRO surprises | genuinely-uncaught | No syntactic signature — MRO "surprise" is a property of the whole class graph vs. the reader's expectation, not a pattern. `unverified`. | n/a |
| `@staticmethod`/`@classmethod` inheritance surprises | genuinely-uncaught | Tested a base `@classmethod` overridden by a subclass `@staticmethod` of the same name against `ruff --select ALL --preview` and `pylint --enable=all`: no hit from either. `unverified` check (no crisp pattern beyond "overridden method changes decorator type," which is legitimate in some designs). | 0 hit from either tool on the snippet |
| `__slots__` + multiple inheritance conflict | **self-enforced-by-interpreter** | Not a lint target: `class C(A, B)` with two non-empty, overlapping `__slots__` bases raises `TypeError: multiple bases have instance lay-out conflict` immediately at class-body evaluation — confirmed by running the snippet directly. `slotscheck` couldn't even reach it (`ERROR: Failed to import`) because the import already crashes. Also confirmed `dataclass(slots=True)` + `field(default_factory=list)` **now works cleanly** in 3.14 (printed `[]`, no error) — the "cannot combine" claim is stale for current Python; scout-failure.md already hedged this correctly with "in older versions." | n/a |
| `dataclass(eq=True, frozen=False)` unhashable-by-default | **caught-by-pyright** (`reportUnhashable`, default severity, not just strict) | `uvx pyright` on `s = {Point(1, 2)}` for a plain `@dataclass` → `error: Set entry must be hashable ... reportUnhashable`. Ruff itself still has no rule. Since ocx-sdk-python runs pyright strict, this is already enforced there. **Corrects scout-failure.md** for pyright users. | — |
| `Enum` identity across module reload | genuinely-uncaught | Only manifests under `importlib.reload()`, which neither repo uses (`rg -c 'importlib\.reload'` → 0/0). No static check possible (it's a runtime-reload property). Low priority given zero reload usage. | 0, 0 (reload usage) |
| Fire-and-forget `asyncio.create_task()` GC'd mid-flight | **caught-by-ruff-RUF006** | `asyncio-dangling-task`. Fired on `asyncio.create_task(asyncio.sleep(1))` with no assignment. **Corrects scout-failure.md**, which said "Documented mitigation only ... no lint." | — |
| `asyncio.gather()` swallows sibling cancellation | genuinely-uncaught | `rg -c 'asyncio\.gather\(' -g '*.py' <path>`. Confirmed via ruff docs: no ASYNC rule prefers `TaskGroup` over `gather`. | 0, 0 |
| Catching `CancelledError` without re-raising | genuinely-uncaught | `rg -n 'except (asyncio\.)?CancelledError' -g '*.py' <path>`. No ruff/flake8-async rule exists for the re-raise requirement (checked the full ASYNC1xx/2xx table). The one real hit was manually inspected — see below, it's handled correctly. | 0, **1** (correct) |
| `run_in_executor` with thread-unsafe libraries | genuinely-uncaught | Thread-safety of an arbitrary library is not a syntactic property. `unverified`. | n/a |
| GIL removal changes correctness assumptions | genuinely-uncaught | Forward-looking; no fleet code targets free-threaded builds. `unverified`, deprioritized. | n/a |
| `subprocess` pipe deadlock without `communicate()` | genuinely-uncaught | `checks/check_popen_deadlock.py` (below) — file-level heuristic: `Popen(` + `PIPE` present, `communicate` absent anywhere in file. Proven red on a 4-line snippet. | **5**, **2** |
| `subprocess.run`/`check_output`/`check_call` missing `timeout=` | genuinely-uncaught | `checks/check_subprocess_timeout.py` (below) — AST walk flagging calls with no `timeout=` keyword. Proven red (2/3 lines flagged, the `timeout=5` line correctly silent). | **610**, **46** |
| Blocking subprocess call inside an async event loop | **caught-by-ruff-ASYNC221/ASYNC222** | `run-process-in-async-function` / `wait-on-process-in-async-function`. Fired on `async def f(): subprocess.run(["ls"])`. **Corrects scout-failure.md**, which said "caught only by load/chaos testing or manual review." | — |
| `zipfile` decompression / zip-bomb DoS | genuinely-uncaught | `rg -n '\.extractall\(' -g '*.py' <path>` — red on `zf.extractall("out_dir")`. Confirmed via `uvx bandit` on the same snippet: zero issues (bandit has no size/ratio check for zip extraction; its only related rule, B202, is tarfile-only, already credited in scout-failure.md). | 0, 0 |
| Symlink following during file ops | genuinely-uncaught | `rg -n '(os\.symlink|\.readlink\(|is_symlink\(\))' -g '*.py' <path>` — inventory, not a violation detector (most hits are legitimate symlink handling, not path-traversal bugs). Confirmed via `uvx bandit`: zero issues on an `os.symlink`+`readlink` snippet. | **13**, **1** |
| Terminal ANSI escape-sequence injection | genuinely-uncaught | No crisp pattern: distinguishing "printing untrusted text" from "printing a literal" requires taint tracking, not grep. `unverified`. | n/a |
| `unittest.mock.patch` targeting wrong namespace | genuinely-uncaught | Correctly detecting this needs cross-referencing the patch target's dotted path against the patched module's *own* imports — not a single-file syntactic check. `unverified` as a check; measured actual usage instead: `rg -c '(mock\.patch|@patch)\('` → **zero hits in both repos**. The project's black-box subprocess-driving test style doesn't lean on `unittest.mock` at all, so this row is currently moot for this fleet. | 0, 0 |
| pytest-xdist shared mutable/global state races | genuinely-uncaught | Confirmed via pytest-xdist docs: xdist provides no isolation guarantee itself, it's an opt-in discipline. `rg -c 'scope=.(session|module).' -g '*.py' <path>` — inventory of fixtures worth an isolation audit, not proof of a race. | **11**, **3** |
| `coverage.py` 100% gamed via `# pragma: no cover` | genuinely-uncaught | `rg -c 'pragma: no cover' -g '*.py' <path>` — inventory (presence isn't proof of gaming, but every instance is a manual-justification candidate). | **1**, **2** |
| Flat layout hides packaging bugs | genuinely-uncaught (not applicable to this fleet) | Structural check: `ls -d <repo>/src`. **Both repos already use `src/` layout** — this row is a non-issue for the current fleet. | n/a (already src-layout) |
| PyPI typosquatting / dependency confusion | genuinely-uncaught (mitigated structurally) | Confirmed scope gap via docs: `pip-audit`/`uv audit` check known CVEs against installed versions, not name-similarity — a fresh typosquat with no CVE sails through either tool. No source-level check is possible (it's a resolution-time attack). Both repos already pin via `uv.lock`, which is the actual mitigation (blocks silent version/name drift on `uv sync`, though not a first install of a typosquat). | n/a (lockfiles present in both) |
| `setup.py` arbitrary code execution at install | genuinely-uncaught (not applicable) | `find <repo> -maxdepth 1 -iname setup.py`. **Neither repo has a `setup.py`** — both are `pyproject.toml`-only. Non-issue for this fleet today. | 0, 0 (absent) |

## Collapsed into config

Ready-to-enable rules — no hand-written check needed for these eight rows.

```toml
# pyproject.toml — [tool.ruff.lint]
select = [
  # ... existing selection ...
  "B909",    # loop-iterator-mutation (preview) — dict/set mutated during iteration
  "B019",    # cached-instance-method — @lru_cache/@cache on a bound method leaks self
  "RUF012",  # mutable-class-default — class-attribute mutable default
  "RUF006",  # asyncio-dangling-task — unreferenced asyncio.create_task()
  "ASYNC221", "ASYNC222",  # blocking subprocess .run()/.wait() inside async def
  "INP001",  # implicit-namespace-package — missing __init__.py (root cause of shadowing)
]
preview = true  # required for B909; the rest are stable
```

```toml
# pyproject.toml — [tool.pylint."messages control"]
enable = ["cyclic-import"]  # R0401 — mainline pylint, no plugin needed
```

pyright: no config change needed — `reportUnhashable` fires at default (non-strict) severity, and ocx-sdk-python already runs `pyright --strict`, so `@dataclass(eq=True)` used as a dict key/set member is already caught there today.

`__slots__` multiple-inheritance layout conflicts and dataclass `slots=True` + `default_factory` need **no tooling at all** — CPython itself raises `TypeError` at class-body evaluation before any code using the broken class can run.

## Still genuinely uncaught, ranked

By fleet hit count, then blast radius (shape 1 = 190/76-file pytest CLI harness replicated across ~8 repos is the widest blast radius; shape 2 = ocx-sdk-python).

| Rank | Failure | ocx/test | sdk | Why it ranks here |
|---|---|---|---|---|
| 1 | `subprocess.run`/`check_output`/`check_call` missing `timeout=` | 610 | 46 | By far the largest count found anywhere in this audit; every hit is a hang risk in the CLI-driving harness that shape (1) replicates across ~8 repos |
| 2 | pytest-xdist unsafe session/module-scoped fixtures (candidates) | 11 | 3 | Inventory only, but each is a plausible parallel-CI race; worth a manual audit pass |
| 3 | Symlink API usage (inventory, not proven unsafe) | 13 | 1 | High raw count but mostly legitimate use; still the widest "read these" list |
| 4 | `subprocess.Popen(...PIPE...)` without `.communicate()` in file | 5 | 2 | Small count, but each hit is a concrete deadlock risk, not just an inventory candidate |
| 5 | `# pragma: no cover` present | 1 | 2 | Low count now, but `ocx-sdk-python` runs `fail_under=100` — every pragma is a manual-justification gate |
| 6 | `sys.path.insert`/`.append` | 8 | 0 | Import-fragility smell, confined to ocx/test |
| 7 | Catching `CancelledError` w/o re-raise (inventory) | 0 | 1 | Only instance found is already correct — flag stays low priority until more async code lands |
| 8 (tied, zero hits — deprioritize) | `list * n` aliasing, `contextlib.suppress(Exception)`, `def __del__`, `except GeneratorExit`, `asyncio.gather(`, `zipfile.extractall(`, `mock.patch(`, `Enum`/`importlib.reload` | 0 | 0 | Real gaps in tooling, but zero occurrences in 2400+ files today — write the rule as a reading heuristic/PR-review checklist item, not a blocking CI gate, until they appear |
| n/a | Flat-layout packaging bugs, `setup.py` code execution, PyPI typosquatting | — | — | Structurally already mitigated in this fleet (src-layout, no setup.py, lockfiles present) — track as a "don't regress" note, not a new rule |

Unverified (no crisp static/syntactic check exists; semantic or design-level judgment only — do **not** convert into an automated gate, use as a code-review reading heuristic instead): shallow-vs-deep-copy confusion, float/`Decimal` for money, DST-crossing arithmetic on aware datetimes, `super()`/MRO surprises, `@staticmethod`/`@classmethod` inheritance overrides, thread-safety of libraries run via `run_in_executor`, GIL/free-threading correctness assumptions, terminal ANSI-escape injection, `unittest.mock.patch` wrong-namespace targeting.

## Stale-belief corrections

Eight rows in `scout-failure.md` asserted "nothing catches this" from memory; empirical testing found a real tool for six of them and a language-level guarantee for a seventh:

1. **`functools.lru_cache` on instance methods** — ruff `B019` exists and fires. Was: "ruff has no rule for this."
2. **Class-attribute mutable default** — ruff `RUF012` exists and fires. Was: "nothing automated."
3. **`dict`/`set` mutation during iteration** — ruff `B909` (preview) fires on the common case. Was: "no static lint catches all cases" (true only for the residual aliased-reference case now).
4. **Circular imports** — pylint `R0401` (`cyclic-import`) is mainline, not a plugin, and fires. Was: "nothing static."
5. **Fire-and-forget `asyncio.create_task()`** — ruff `RUF006` exists and fires. Was: "Documented mitigation only ... no lint."
6. **Blocking subprocess call inside async** — ruff `ASYNC221`/`ASYNC222` fire directly on this pattern. Was: "caught only by load/chaos testing or manual review."
7. **Implicit namespace-package shadowing** — ruff `INP001` catches the missing-`__init__.py` precondition (not the full collision). Was: "nothing automated," now "partial."
8. **`dataclass(eq=True, frozen=False)` unhashable** — pyright's default `reportUnhashable` catches it (ruff still does not). Was: "nothing automated," now "caught for pyright users."

No new corrections needed to the *positively-caught* rows from scout-failure.md — spot-checked a further three (`datetime.utcnow`/DTZ003, blocking-call-in-async/ASYNC251, `dataclass` mutable-default field-rejection) and all held up exactly as described.
