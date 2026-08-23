---
title: "Annotation evaluation policy: PEP 563/649/749 and the undefined-forward-ref bug class"
topic: "from __future__ import annotations, PEP 649/749 deferred evaluation, and which runtime consumers evaluate annotations"
agent: dive-annotations-evaluation
model: sonnet
date_researched: 2026-08-23
sources_count: 15
scope: |
  Covers: what `__annotations__`/`get_type_hints`/`annotationlib` actually do at
  3.10, 3.12, 3.13, 3.14 with and without `from __future__ import annotations`;
  which stdlib/ecosystem consumers evaluate annotations at runtime and what
  they raise; a specific bug class (forward ref naming a name never bound at
  module scope) found live in this project's own repos, reproduced and
  root-caused; and whether adopting ruff's `TC` rule family manufactures that
  bug class at scale. Does NOT cover PEP 695 generic syntax, PEP 646/673/675,
  or any typing feature unrelated to annotation *evaluation timing*.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

---

## Summary

- `from __future__ import annotations` (PEP 563) is opt-in, has been since 3.7, was never made the language default — a plan to default it in 3.10 was reverted in 2021, and it is now formally `Status: Superseded` in favor of PEP 649/749 ([peps.python.org/pep-0563](https://peps.python.org/pep-0563/)).
- PEP 649/749 (deferred evaluation via `__annotate__`) is the *default behavior* only on 3.14+, and only when the future import is **not** used ([docs.python.org/3.14/whatsnew/3.14.html](https://docs.python.org/3.14/whatsnew/3.14.html)).
- Neither of this project's floors (`>=3.10` for the pytest harnesses, `>=3.12` for the SDK) reaches 3.14, so PEP 649's laziness is not in effect on either floor today, with or without the future import.
- Under the future import, *every* annotation becomes a plain string, unconditionally — there is no live expression left to evaluate, so plain `__annotations__` access **never** raises, no matter how broken the forward reference is. Verified empirically on both 3.12 and 3.14.
- Under native 3.14 (no future import), a bad forward reference raises `NameError` the moment anything touches `__annotations__` in `VALUE` format — earlier and more visibly than under the future import, not later. Verified empirically.
- `typing.get_type_hints()` raises `NameError` on an unresolvable forward reference in **all four** modes (3.12/3.14 × future-import on/off) — it always forces evaluation, regardless of PEP 649 laziness. This is documented behavior, not a bug: `docs.python.org/3/library/typing.html#typing.get_type_hints` names `if TYPE_CHECKING` imports as its own canonical example of what triggers this.
- A real instance of this bug class exists today in `grimoire/test/conftest.py:355` (`-> "GrimRunner"`, `GrimRunner` imported one line later inside the fixture body) plus 9 more in `test_agents.py`/`test_render_clients.py` (`-> "src.registry.PublishedArtifact"`) — 10 `reportUndefinedVariable` hits total, confirming the other worker's count. `ocx/test` has one more (`test_doc_scripts_cast.py:441`, already `# noqa: F821`-suppressed).
- The bug is currently **runtime-silent forever** under this project's actual usage: `pytest` matches fixtures by parameter *name*, never evaluates annotations, and neither repo calls `get_type_hints`/`inspect.signature(eval_str=True)` anywhere. Reproduced: an equivalent fixture passes cleanly under `pytest` on both 3.12 and 3.14.
- `ruff check` with **zero configuration** already flags every one of these via `F821` (`undefined-name`), right now, on the real files — confirmed by running it directly. Neither `ocx/test` nor `grimoire/test` runs `ruff` in CI today (no CI workflow references it), so nothing currently enforces this.
- There is a second, sneakier variant: **quoting** an annotation that's already under the future import double-stringizes it (`-> "Thing"` becomes the raw text `"'Thing'"`). `inspect.signature(fn, eval_str=True)` on that does **not** raise — it silently evaluates to the harmless string literal `'Thing'` instead of the class. Only `get_type_hints()` (which re-evaluates the string as a name) still raises. Reproduced.
- Adopting ruff's `TC` rule family (moving type-only imports into `if TYPE_CHECKING:`) does not fix or worsen the exact bugs found (those are local-import, not module-level-import, so TC's mover wouldn't touch them) — but it **manufactures the identical failure mode at scale** for every import it *does* move, because a `TYPE_CHECKING`-only import is, by design, never bound at runtime, and the official `get_type_hints()` docs name exactly this as their worked example of what raises `NameError`.
- Ruff's `runtime-evaluated-base-classes`/`runtime-evaluated-decorators` settings do not close this gap — they solve a different, narrower problem (a decorator/base class needing the class *at class-definition time*), not "something calls `get_type_hints`/`eval_str` on this symbol later."
- No consumer that would trip on this exists in the codebase today: no pydantic, attrs, cattrs, typeguard, beartype, or FastAPI anywhere in `ocx-sdk-python`, `ocx/test`, or `grimoire/test`; `Sybil` (used by the SDK) processes docstring code blocks, not function signatures. The risk is latent, not live — but `index/bot` already has 30 files using `TYPE_CHECKING`, so the pattern is already present at meaningful scale in at least one of the four shapes.
- Migration cost of "keep the future import, gate it with F821" is a lint-config change plus fixing the 11 existing violations — **not** a mass edit: 171/190 (`ocx/test`), 73/76 (`grimoire/test`), 12/13 (`ocx-sdk-python/src`), and 84/93 (`index/bot`) files keep the future import unchanged either way.

---

## Findings

### 1. What actually happens, per floor and per mode

Behavior of `SomeClass` (the forward ref) when nothing but a **local import inside the function body** binds it — i.e. it is never visible in module `__dict__` — measured directly (`annrepro/repro_native_pep649.py`, `repro_bug2.py`, run under `/home/mherwig/.local/bin/python3.12` and `/usr/sbin/python3.14`):

| Access path | 3.10–3.13, no future import (PEP 3107 eager, pre-649) | 3.10–3.13, `from __future__ import annotations` (PEP 563) | 3.14, no future import (PEP 649/749 native) | 3.14, `from __future__ import annotations` (PEP 563, still supported) |
|---|---|---|---|---|
| `def`/`class` statement itself | Raises `NameError` immediately at import time if the name genuinely doesn't exist anywhere reachable | Never raises — annotation is stored as source text | Never raises — evaluation is deferred to an `__annotate__` closure | Never raises — same as PEP 563 column |
| Plain `fn.__annotations__` / `Format.VALUE` | N/A (already evaluated at def-time, or already raised) | Returns the string, unconditionally, never raises | **Raises `NameError`** the first time it's accessed | Returns the string, unconditionally, never raises |
| `annotationlib.get_annotations(fn, format=FORWARDREF)` (3.14 only) | — | — | Returns a `ForwardRef` object, does **not** raise | Returns the same plain string as `VALUE` — the format request is a no-op under the future import |
| `annotationlib.get_annotations(fn, format=STRING)` (3.14 only) | — | — | Returns the source text, does not raise | Same string as above |
| `typing.get_type_hints(fn)` | Raises `NameError` | Raises `NameError` (re-evaluates the string) | Raises `NameError` | Raises `NameError` |
| `inspect.signature(fn, eval_str=True)` on a **bare** forward ref (`-> Thing`) | N/A | Raises `NameError` | N/A (bare annotation already lazy, same NameError path as `__annotations__`) | Raises `NameError` |
| `inspect.signature(fn, eval_str=True)` on a **quoted** forward ref (`-> "Thing"`) | N/A | Silently returns `() -> 'Thing'` — evaluates to the harmless *string* `'Thing'`, no error | N/A | Silently returns `() -> 'Thing'` — same silent-string result |

Primary sources for the top table rows: [PEP 749 §"The future of `from __future__ import annotations`"](https://peps.python.org/pep-0749/) states verbatim — *"If the future import is active, the `__annotate__` function of objects with annotations will return the annotations as strings when called with the `VALUE` format, reflecting the behavior of `__annotations__`."* This is exactly the column-4 behavior measured above: requesting `FORWARDREF` or `STRING` format under the future import degrades to the same plain string as `VALUE`, because the compiler never emitted a live expression to format differently in the first place. [whatsnew/3.14 §"What's New"](https://docs.python.org/3.14/whatsnew/3.14.html) confirms PEP 649/749 land as the 3.14 default and that `annotationlib` is new in 3.14.

The `get_type_hints` row is documented directly, not just observed: [`docs.python.org/3/library/typing.html#typing.get_type_hints`](https://docs.python.org/3/library/typing.html) — *"If `Format.VALUE` is used and any forward references in the annotations of obj are not resolvable, a `NameError` exception is raised. For example, this can happen with names imported under `if TYPE_CHECKING`."* Note this is version-independent: `get_type_hints` has always forced eager re-evaluation of the string form, so PEP 649's laziness changes *nothing* about whether `get_type_hints` raises — only about whether *plain, unrequested* introspection (`__annotations__`) raises before you ask for full resolution.

### 2. The recommendation, per floor, as a decision

**Shape 1 (pytest black-box harnesses, `>=3.10`, already 90–96% adopted): keep `from __future__ import annotations`.** It buys forward references and quieter `X | Y` syntax on a floor where PEP 649 isn't available regardless (3.10–3.13 have no native deferred evaluation; the future import is the *only* way to get lazy annotations there). The bug found is not caused by having the future import — it is caused by an annotation naming something that is genuinely unbound at module scope, which is exactly as broken with or without the future import (compare table columns 2 and 4: both are silent on plain access, both raise identically under `get_type_hints`). The fix is a lint gate (§3 below), not removing the import.

**Shape 2 (SDK, `>=3.12`, pyright strict, 100% coverage, Sybil): keep it too, with the same gate.** 92% already adopted; nothing in the audited codebase calls `get_type_hints`/`eval_str`, and Sybil operates on docstring code blocks, not function signatures, so there is no live consumer to protect against yet — but pyright strict already benefits from the future import's forward-reference convenience, and dropping it selectively would fragment the org's style for no measured gain.

**Neither floor should treat "upgrade to 3.14" as a trigger to remove the future import.** PEP 749's own migration plan (quoted above) keeps it fully working through 3.14 and says the `DeprecationWarning` won't even start until *"no sooner than the first release after Python 3.13 reaches its end-of-life"* — years out from a floor that hasn't even reached 3.12→3.14 yet. Removing it early only re-exposes eager-evaluation-time `NameError`s this project has been deliberately avoiding since Python 3.7. The answer does not flip when either floor reaches 3.14; it flips only when the deprecation warning actually starts firing, which is a separate, later signal to watch for.

### 3. Runtime consumers that evaluate annotations — audited against this codebase

| Consumer | Evaluates annotations? | When | Raises on bad forward ref? | Present in these 4 shapes? |
|---|---|---|---|---|
| `typing.get_type_hints` | Yes, always (forces `Format.VALUE` + its own re-eval of strings) | On call | Yes, `NameError` — reproduced §1 | Not called anywhere (`grep -rn get_type_hints` over `ocx-sdk-python`, `ocx/test`, `grimoire/test` → 0 hits) |
| `dataclasses` (field construction, `dataclasses.fields()`) | **No** — `field.type` stays the raw (possibly stringized) annotation, never resolved | Never, unless you separately call `get_type_hints`/`get_annotations` on the dataclass | No — reproduced: `Order(item=...)` constructs fine, `dataclasses.fields()` returns the string `'Item'` unresolved | No `@dataclass` classes with this pattern found; dataclasses used elsewhere are unaffected since this is a per-field, not blanket, risk |
| `pydantic` | Yes — pydantic resolves field types at model-class-creation time via its own `get_type_hints`-equivalent, to build its validators | At class definition | Yes | Not used anywhere in the four shapes (`grep -i pydantic` → 0 hits outside the word "pydantic" in a comment example) |
| `attrs`/`cattrs` | `attrs` itself: no (like dataclasses). `cattrs` structuring/destructuring: yes, via `get_type_hints`-style resolution | `cattrs`: at (de)serialization call time | `cattrs`: yes | Not used anywhere |
| `typeguard`/`beartype` | Yes — both resolve annotations to build the runtime check | At decoration/first-call time | Yes | Not used anywhere |
| `functools.singledispatch` | Only for `@fn.register` with a bare type annotation instead of an explicit type argument — it calls `typing.get_type_hints` on the implementation | At `.register()` call time | Yes, for the annotation-inference path only | Not used with the annotation-inference form anywhere found |
| pytest fixture resolution | **No** — matches by parameter *name* only | N/A | No — reproduced §4 (equivalent fixture with a broken forward ref passes on 3.12 and 3.14) | This is the load-bearing case: shape 1 relies on this staying true |
| `Sybil` (doctests, used by the SDK) | Parses/executes code blocks embedded in docstrings; does not introspect the annotations of the surrounding function/class | N/A | No evidence of evaluation found | Used in `ocx-sdk-python` (`sybil>=9` in `pyproject.toml`) |
| `inspect.signature(obj, eval_str=True)` | Yes, on demand | On call | Bare ref: yes. Quoted-under-future-import ref: **no** — silently yields a string, see §1 | Not called anywhere in the audited code |
| FastAPI-style route signature inspection | Yes — resolves parameter/return annotations to build request/response models | At route registration | Yes | Not present in any of the four shapes |

### 4. The specific bug class — reproduced and root-caused

Exact production instance, `grimoire/test/conftest.py:354-356`:

```python
@pytest.fixture()
def grim(grim_binary: Path, grim_home: Path) -> "GrimRunner":
    from src.runner import GrimRunner

    return GrimRunner(grim_binary, grim_home)
```

`GrimRunner` is never imported anywhere in this module's top-level scope — only inside the fixture's own body, one line after the annotation that names it. Nine more instances of the same shape (`-> "src.registry.PublishedArtifact"`, `src` never imported at module scope, only inside sibling helper functions) live in `grimoire/test/tests/test_agents.py:98` and `grimoire/test/tests/test_render_clients.py` (6 occurrences: lines 81, 90, 109, 126, 841, 845, 857, 864 — some are call sites of the same undefined name, not distinct annotations). `ocx/test/tests/test_doc_scripts_cast.py:442` has the same shape but is already `# noqa: F821`-suppressed with a comment acknowledging it (`ocx: "OcxRunner",  # noqa: F821 — forward ref; resolved at runtime`) — that suppression's claim that it's "resolved at runtime" is not accurate for any consumer except pytest's name-based matching; it is never resolved as a *type*, by anything, ever, in this codebase.

**Is it silent forever, or does something evaluate it eventually?** Under this project's actual toolchain today: silent forever. Reproduced directly — an equivalent `pytest_repro/conftest.py` fixture (same shape: quoted return annotation, class imported only inside the fixture body) passes cleanly:

```
$ uv run --python 3.12 --with pytest --no-project -- pytest -q .
1 passed in 0.01s
$ uv run --python 3.14 --with pytest --no-project -- pytest -q .
1 passed in 0.01s
```

**Does 3.14's deferred evaluation make it *more* dangerous?** No — measured the opposite. Native 3.14 (no future import) surfaces this *earlier*: plain `__annotations__` access raises immediately (§1 table, column 3), where under the future import (what this codebase actually uses) nothing raises on plain access at all, ever — only an explicit re-evaluator like `get_type_hints` surfaces it. The future import is the *more* silence-prone of the two, not 3.14's native laziness. What *does* make things worse over time is unrelated to 3.14: it's the accumulation of more `if TYPE_CHECKING:`-guarded and locally-scoped imports (see §5), because each one is a fresh landmine for whichever tool eventually calls `get_type_hints` on it.

**Exact detection command, run against the real file, red today:**

```
$ ruff check --select F821 --no-cache conftest.py
F821 Undefined name `GrimRunner`
   --> conftest.py:355:50
    |
354 | @pytest.fixture()
355 | def grim(grim_binary: Path, grim_home: Path) -> "GrimRunner":
    |                                                  ^^^^^^^^^^
356 |     from src.runner import GrimRunner
    |

Found 1 error.
```

Run with **zero ruff configuration** — `grimoire/test/pyproject.toml` has no `[tool.ruff]` section at all, so this is ruff's out-of-the-box default rule set. Confirmed with `ruff 0.16.1`. A full `ruff check` (no `--select`) on that file reports `Found 9 errors` total, of which this is one. `F821` (`undefined-name`) is pyflakes' own long-standing check and is enabled by default in every ruff configuration that hasn't explicitly deselected `F`; [`docs.astral.sh/ruff/rules/undefined-name`](https://docs.astral.sh/ruff/rules/undefined-name/) is the rule reference. No cheaper grep beats this: F821 already needs full-file AST + scope analysis to avoid false positives (it correctly does *not* flag `Path` or `pytest` in the same file), so a naive grep for "quoted-annotation-name-not-imported-at-module-level" would either miss cases or false-positive constantly; ruff's own resolver is the right tool and it is already present in this toolchain (`ruff` is on `PATH` in this environment). Neither `ocx/test` nor `grimoire/test` runs `ruff` in any GitHub Actions workflow today (`grep -rl ruff .github/workflows/` → no hits in either repo), so this is not "ruff already caught it and someone ignored it" — it is "ruff was never asked."

### 5. Interaction with `TC` (flake8-type-checking) rules — the decision-relevant question

**Adopting `TC` without a runtime-evaluation audit does not fix or worsen the 10 bugs found in this codebase specifically** — those are local, in-function imports, not module-level imports, and `TC`'s mover only acts on module-level imports that are unused outside annotations. `TC` is silent on this exact shape.

**But adopting `TC` at scale manufactures the identical failure mode, systematically, for every import it *does* move.** `TC`'s entire purpose is to take an import used only in annotations and relocate it into `if TYPE_CHECKING:` — which means, by construction, that name is *never bound at runtime, under any circumstance*, for the lifetime of that code. The official `typing.get_type_hints()` documentation ([docs.python.org/3/library/typing.html](https://docs.python.org/3/library/typing.html)) does not describe this as a theoretical edge case — it uses it as *the* worked example: *"For example, this can happen with names imported under `if TYPE_CHECKING`."* Anything that later calls `get_type_hints`, or adds a `pydantic`/`attrs`/`cattrs`/`typeguard`/`beartype`/FastAPI-style dependency that resolves annotations internally, turns every `TC`-moved import into a live `NameError` the instant it touches that symbol — with no code change at the call site that used to be safe.

Ruff's own mitigation, quoted directly from its docs, only covers a *different* problem:

> `runtime-evaluated-base-classes` — *"A list of base classes that should be treated as runtime-evaluated. Imports used exclusively for these base classes will not be moved into `TYPE_CHECKING` blocks."* Example: `runtime-evaluated-base-classes = ["pydantic.BaseModel"]`
>
> `runtime-evaluated-decorators` — same mechanism for decorators, e.g. `runtime-evaluated-decorators = ["dataclass", "attrs.define"]`
>
> ([docs.astral.sh/ruff/settings/](https://docs.astral.sh/ruff/settings/))

These settings stop `TC` from moving an import that a decorator or base class needs **at class-definition time** — i.e. they prevent `TC` from being *wrong* about whether the class can even be constructed. They do nothing for the broader case this dive is about: a class that *can* still be constructed fine (nothing needs it at class-definition time) but whose *type* becomes unresolvable the moment anything asks `get_type_hints` for it later. There is no ruff setting that closes that gap, because closing it would mean not moving the import at all — i.e., not using `TC` for that symbol.

**The safe combination, stated as policy rather than config:** `TC` is safe to adopt broadly *only* in a codebase that guarantees nothing ever calls `get_type_hints`/`eval_str`-style introspection on `TYPE_CHECKING`-guarded symbols — true for all four shapes **today** (verified: no pydantic/attrs/cattrs/typeguard/beartype/FastAPI anywhere, no `get_type_hints` calls anywhere), but not a guarantee that survives unmonitored. `index/bot` already has 30 files using `TYPE_CHECKING`, so the pattern is not hypothetical — it is already the largest surface of the four shapes for this exact risk if a future dependency ever changes the picture. A recommendation to adopt `TC` should ship paired with a recommendation to *forbid* introducing any annotation-resolving runtime library (pydantic, attrs+cattrs, typeguard, beartype, a FastAPI-style framework) without first sweeping `TYPE_CHECKING` blocks for anything that library would need to resolve.

### 6. Migration cost, measured

Files carrying `from __future__ import annotations` today (excluding `.venv`/`__pycache__`), against the total `.py` file count per shape:

| Shape / repo path | Files with the future import | Total `.py` files | % |
|---|---|---|---|
| `ocx/test` (shape 1) | 171 | 190 | 90% |
| `grimoire/test` (shape 1) | 73 | 76 | 96% |
| `ocx-sdk-python/src` (shape 2) | 12 | 13 | 92% |
| `index/bot` | 84 | 93 | 90% |

Under the recommendation in §2 (**keep** the future import everywhere, add the `F821` gate), the migration cost is **not** a mass edit to these 340 future-import files — it is:

1. Turn on `ruff check` (or just `--select F821` at minimum) in CI for `ocx/test` and `grimoire/test` (currently absent from both repos' workflows).
2. Fix the **11 real violations** found: 10 in `grimoire/test` (1 `conftest.py` fixture + 9 in two test files, same root cause: a locally-imported class named in a quoted return/parameter annotation with no module-level import) and 1 in `ocx/test` (already `noqa`-suppressed; the suppression comment's rationale should be corrected even if the suppression itself stays, since "resolved at runtime" is not true for any tool that would actually resolve it).
3. No changes required to `ocx-sdk-python/src` or `index/bot` — pyright's own `reportUndefinedVariable` pass over `ocx-sdk-python` found zero (the two failing pyright runs there were `reportMissingImports`/`reportAttributeAccessIssue`, unrelated to this bug class) and `index/bot` was not run under pyright in this pass (out of scope for the reproduction budget), but nothing in the `TYPE_CHECKING`-usage audit (§5) flagged an existing violation there.

---

## Normative guidance candidates

1. **Keep `from __future__ import annotations` as the default for every new Python module across all four shapes.** *Rationale:* it is already 90–96% adopted, buys forward references and `X | Y` syntax on the 3.10 floor where PEP 649 isn't available, and removing it does not fix the bug class found (§2, §4) — it only reintroduces eager-evaluation-time failures this project has avoided since 3.7. *Verify:* `grep -L "^from __future__ import annotations" **/*.py` should print nothing new relative to the current baseline (171/190, 73/76, 12/13, 84/93) without an explicit, reviewed exception.

2. **Require `ruff check --select F821` (or full default `ruff check`) to pass in CI for every repo in all four shapes, including `ocx/test` and `grimoire/test`, which do not run it today.** *Rationale:* it already catches every instance of this bug class with zero configuration (§4), and currently doesn't run at all in the two repos where the 11 real violations live. *Verify:* `ruff check --select F821 --no-cache <path>` exits 0; empty output is the pass — any printed line is a real, currently-shipping bug.

3. **Ban quoting an annotation that is already covered by `from __future__ import annotations` in the same module.** *Rationale:* it double-stringizes the annotation (`-> "Thing"` under the future import becomes the raw text `"'Thing'"`), and `inspect.signature(fn, eval_str=True)` on that silently "succeeds" by evaluating to the harmless string `'Thing'` instead of raising or resolving the real class — the single most dangerous outcome found in this dive, because it produces *wrong* data with no error at all, not even a delayed one (§1, §4). *Verify:* grep for a quoted string literal (`-> "..."` or `: "..."`) in any file whose top of file also has `from __future__ import annotations`; ruff has no dedicated rule for this specific *combination* as of this research — `nothing automated` beyond the grep.

4. **Every quoted or bare forward-referenced annotation must name something reachable from module scope by the time anything could plausibly call `get_type_hints`/`get_annotations(format=VALUE)`/`inspect.signature(eval_str=True)` on it — a local import inside the annotated function's own body does not count.** *Rationale:* this is the exact, root-cause shape of all 11 real violations found (§4); "the import happens one line below" reads as fine to a human and to Python's own execution model, but is invisible to every annotation-evaluating consumer. *Verify:* `F821` (rule 2) is the mechanical proxy for this — it already flags every instance found.

5. **Before adopting ruff's `TC` (flake8-type-checking) rule family repo-wide, add an explicit, written policy: no dependency that resolves annotations at runtime (pydantic, attrs+cattrs, typeguard, beartype, a FastAPI-style framework) may be introduced without first auditing every `TYPE_CHECKING` block that library's decorators/base classes would need to see.** *Rationale:* `TC` systematically creates names that are never bound at runtime by design (§5); ruff's `runtime-evaluated-base-classes`/`runtime-evaluated-decorators` settings only cover the class-definition-time case, not the "someone calls `get_type_hints` later" case, and no ruff setting can close that second gap because closing it means not using `TC` for that name. *Verify:* at the point any such dependency is proposed, `grep -rn "TYPE_CHECKING" <affected files>` combined with a manual check of what that dependency's decorator/base class actually needs at runtime — not currently automatable end-to-end.

6. **Do not treat a floor's eventual move to 3.14 as a signal to remove `from __future__ import annotations`.** *Rationale:* PEP 749's own deprecation plan keeps the future import fully functional through 3.14 and says its `DeprecationWarning` won't start until *"no sooner than the first release after Python 3.13 reaches its end-of-life"* — a floor move to 3.14 is not that signal (§2). *Verify:* re-check `peps.python.org/pep-0749` (or the then-current whatsnew page) for whether the deprecation warning has actually started before writing a removal rule.

7. **When a `# noqa: F821`-style suppression exists on a forward-ref annotation, its comment must state which consumer is actually expected to leave it unresolved (typically: "pytest matches by parameter name, this annotation is documentation-only") rather than an inaccurate claim like "resolved at runtime."** *Rationale:* `ocx/test/tests/test_doc_scripts_cast.py:442`'s existing suppression comment says "resolved at runtime," which this dive's reproductions show is false for every actual runtime resolver (§3, §4) — it is only ever resolved by a human reading it. *Verify:* manual review of `noqa: F821` comments; not automatable.

---

## AI-agent angle

- **The exact bug class this dive found is a pattern an LLM reproduces confidently, because it looks correct by every signal a model is trained to trust:** the code runs, pytest passes, the class name is *right there* one line below the annotation, and the pattern ("annotate with a string, import for real inside the function to avoid a real dependency/circular import") is a common, often-legitimate idiom when the import genuinely *is* only usable inside the function (e.g., to dodge a circular import). The smallest mechanical check: run `ruff check --select F821` (or default `ruff check`) on any file it just wrote or edited before calling the task done — this is the single cheapest, already-available check and it caught every real instance in this codebase.
- **A model asked to "move type-only imports under `TYPE_CHECKING`" (the literal `TC` autofix) will do so correctly by ruff's own definition of correct, and will not know that doing so quietly creates a `get_type_hints`-time landmine** — because nothing in the local diff looks wrong; pyright stays clean, the file still imports and runs. The mechanical check here is organizational, not a single command: before applying a `TC` autofix at scale, check whether the repo (or a dependency about to be added) ever calls `typing.get_type_hints`, `inspect.signature(..., eval_str=True)`, or uses pydantic/attrs+cattrs/typeguard/beartype/FastAPI-style decorators anywhere (`grep -rn "get_type_hints\|eval_str=True\|pydantic\|cattrs\|typeguard\|beartype"`); if that grep is empty today, note in the commit/PR that it must be re-checked before any of those libraries are ever introduced.
- **A model asked "should I add `from __future__ import annotations` to this new file" will often say yes reflexively because it's true 90%+ of the time in a training-data sense** — but the actually load-bearing question in a codebase with a mixed 3.10/3.12 floor is not "does this file need it" but "is every forward reference in this file resolvable from module scope," which the future import's presence or absence does not answer either way (§1, §2). The mechanical check is the same `F821` run, not a policy debate about the import line itself.
- **A model asked to fix a `NameError` surfaced by `get_type_hints` on this bug class will often "fix" it by adding the missing name to a `TYPE_CHECKING` block** (since that satisfies pyright and looks like the idiomatic 2026 pattern) **rather than noticing that `TYPE_CHECKING` blocks are exactly as unresolvable to `get_type_hints` as the original bug** (§5) — the `NameError` will still fire, just from a different-looking, more "correct-looking" source line. The mechanical check: after such a fix, re-run whatever originally raised the `NameError` (e.g., `python -c "import typing, mod; typing.get_type_hints(mod.fn)"`) rather than trusting that `pyright`/`ruff` going clean means the runtime call now succeeds — they check a different thing.

---

## Contested / evolving

- **Whether `from __future__ import annotations` should still be added to new code in 2026 is genuinely unsettled across the wider Python community**, and trending toward "stop adding it, PEP 649 makes it unnecessary once your floor is 3.14" — but that trend line assumes a 3.14 floor, which neither shape here has, and PEP 749's own text explicitly rejected making the future import a no-op even *on* 3.14 specifically because of this exact case (code with eagerly-evaluated forward refs under decorators) — see the "Rejected alternatives" section of [PEP 749](https://peps.python.org/pep-0749/). As of August 2026, the deprecation warning has not started (gated to "after 3.13 EOL," and 3.13 has not reached EOL).
- **Whether `TC`/`TCH`-style import hygiene is worth the runtime-fragility tradeoff is itself an open question in the ecosystem**, not just in this project — ruff added the `runtime-evaluated-*` escape hatches specifically because early adopters hit exactly the class of breakage this dive describes (pydantic/attrs use cases), and the settings' existence is itself evidence the tradeoff is still being actively patched around rather than solved. Trend: ruff keeps adding narrower carve-outs (base classes, decorators) rather than a general "anything that might call `get_type_hints`" flag, because that's undecidable statically.
- **Whether `annotationlib`'s `FORWARDREF`/`STRING` formats are "the" fix for defensive introspection is new enough (3.14, Oct 2025) that no ecosystem convention exists yet** for when a library should switch from `get_type_hints` to `annotationlib.get_annotations(format=FORWARDREF)` to avoid raising on an intentionally-deferred name. This dive found no library in the four shapes doing so yet, and no external guidance beyond the PEP text itself as of this research.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://peps.python.org/pep-0563/ | PEP (Superseded) | 2017, Python 3.7 | Confirms `from __future__ import annotations` origin, opt-in-since-3.7 status, and its formal supersession by PEP 649 |
| https://peps.python.org/pep-0649/ | PEP (Final) | Targets 3.14 | Deferred evaluation mechanism (`__annotate__`), states it supersedes PEP 563 |
| https://peps.python.org/pep-0749/ | PEP (Final) | 3.14 | The exact future-import interop text quoted in §1/§6; `annotationlib` design and the `FORWARDREF`/`STRING`/`VALUE` formats; the "rejected alternatives" section explaining why the future import wasn't made a no-op |
| https://docs.python.org/3.14/whatsnew/3.14.html | Official What's New | 3.14, Oct 2025 | Confirms PEP 649/749 land as 3.14's default, `annotationlib` is new in 3.14 — fetched as raw HTML via curl after a summarizing WebFetch truncated it, per this session's established working method |
| https://docs.python.org/3/library/typing.html#typing.get_type_hints | Official stdlib docs | current, 2026 | The single most load-bearing citation in this dive — verbatim documents `get_type_hints` raising `NameError` and names `if TYPE_CHECKING` imports as its own canonical trigger example; fetched raw via curl after a summarizing WebFetch truncated it |
| https://docs.astral.sh/ruff/settings/ | Official ruff docs | current, 2026 | Verbatim text and examples for `runtime-evaluated-base-classes`/`runtime-evaluated-decorators`, quoted in §5 |
| https://docs.astral.sh/ruff/rules/typing-only-standard-library-import/ | Official ruff rule reference | current, 2026 | `TC003` semantics and its own `future-annotations` auto-add behavior |
| https://docs.astral.sh/ruff/rules/undefined-name/ | Official ruff rule reference | current, 2026 | Confirms `F821`/`undefined-name` is the rule that caught every real instance in §4 |
| https://docs.pytest.org/en/stable/explanation/fixtures.html | Official pytest docs | current, 2026 | Confirms fixtures are matched to test functions by parameter *name*, not by type annotation — the reason pytest itself never trips on this bug class |
| https://bugs.python.org/issue38605 | CPython bug tracker (bpo) | 2019–2021 | Primary record of the original "make PEP 563 default in 3.10" plan and its reversal |
| https://lwn.net/Articles/858576/ | LWN.net technical writeup | 2021 | "When and how to evaluate Python annotations" — clear synthesis of why the 3.10-default plan was reverted, corroborating the bpo record |
| `annrepro/repro_native_pep649.py`, `repro_bug2.py`, `repro_dataclass.py`, `pytest_repro/` (this session's own reproductions) | First-party reproduction scripts | run 2026-08-23 | Every claim in §1/§3/§4 about actual raised/not-raised behavior was executed, not recalled, under `/home/mherwig/.local/bin/python3.12` and `/usr/sbin/python3.14` (deleted after this report was written, per instructions) |
| `grimoire/test/conftest.py`, `grimoire/test/tests/test_agents.py`, `grimoire/test/tests/test_render_clients.py`, `ocx/test/tests/test_doc_scripts_cast.py` (read-only) | This project's own source, read via `pyright`/`ruff` | current checkout, 2026-08-23 | The actual production evidence for the bug class — file:line citations in §4 point here |
| `pyright 1.1.411` (via `uv tool run pyright --outputjson .`) | Static type checker, run against `ocx/test`, `grimoire/test`, `ocx-sdk-python` | run 2026-08-23 | Source of the `reportUndefinedVariable` counts (1 in `ocx/test`, 10 in `grimoire/test`, 0 in `ocx-sdk-python`) confirming the other worker's finding independently |
| `ruff 0.16.1` (CLI, default config) | Linter, run against the same real files | run 2026-08-23 | Source of the `F821` detection-command evidence in §4 |
