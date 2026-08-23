---
title: Data modelling and Python idioms — dataclasses, enums, typed boundaries
topic: dataclasses / NamedTuple / TypedDict / Protocol / enums / immutability / serialization determinism / idioms an agent gets wrong
agent: types-and-idioms-dive
model: claude-sonnet-5
date_researched: 2026-08-23
scope: >
  Primary: /home/mherwig/dev/ocx-sdk-python/src (51 dataclasses, 7,921 LOC, Python >=3.12,
  pyright strict=["src"], dependencies=[]) and /home/mherwig/dev/index/bot/src (24 dataclasses,
  6,112 LOC, 56 cast( sites, Python >=3.12, pyright typeCheckingMode="strict" on src+tests).
  Secondary: /home/mherwig/dev/ocx/test/src (harness helper layer) and
  /home/mherwig/dev/ocx/.claude/hooks/hook_utils.py (stdlib-only, byte-identical to grimoire's
  copy). All counts are file:line, re-run from the paths given.
sources_count: 15
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Applied to the SDK, the bot and the helper layer](#applied-to-the-sdk-the-bot-and-the-helper-layer)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- `frozen=True, slots=True` is already the house convention independently in both codebases —
  50/51 dataclasses in `ocx-sdk-python/src` (98%), 22/24 in `index/bot/src` (92%) — codify it as
  the default, not a suggestion.
- The two exceptions in each codebase are deliberate: stateful port/adapter classes holding a
  live `httpx.Client` (`RegistryV2`, `RoutedRegistry` in `index/bot/src/indexbot/adapters/registry_v2.py:221,401`).
  Neither is ever used as a dict key or set member — confirmed by grep — so the `eq=True` default's
  `__hash__ = None` consequence is currently inert, not a live bug.
- `PackageRef` in `ocx-sdk-python/src/ocx_sdk/_types.py:212-243` is the one dataclass with
  `eq=False` plus hand-written `__eq__`/`__hash__` — and it gets the `NotImplemented`-not-`False`
  rule exactly right already. Use it as the in-repo template rather than writing a new example.
- The SDK's sentinel-for-"not given" (`_Unset`/`UNSET` in `_types.py:212-224`) is a single-member
  `Enum` exposed as a `Final` constant — correctly typed, narrowable, and printable. No bare
  `object()` sentinel exists anywhere in either codebase.
- Zero `NewType` usage in either codebase, despite a domain full of candidates: digests, package
  identifiers, and tags are all passed around as bare `str` (`parse_digest`, `parse_package_id`
  in `index/bot/src/indexbot/core/`). No live bug traced to this — see Contested.
- `index/bot`'s 56 `cast(` sites split cleanly three ways: **32 (57%) are `argparse.Namespace`
  attribute access**, **15 (27%) are walking `_Manifest = dict[str, object]`**
  (`core/desc.py:32`), **9 (16%) are narrowing an `Optional` return after an unstated invariant**
  (`FilePort.read_bytes() -> bytes | None`). None of the 56 are `response.json()` — that's a
  separate finding for the sibling HTTP-layer dive, not duplicated here.
- `ConfigOverrides` (`ocx-sdk-python/src/ocx_sdk/_config.py:36`) is the SDK's only `TypedDict`,
  and it still uses `total=False` — the exact pattern the fleet's own `quality-python.md`
  Warn-tier rule already asks to replace with `Required`/`NotRequired` (PEP 655, confirmed
  Standard/Final).
- `functools.cached_property` requires a mutable per-instance `__dict__` and is **structurally
  incompatible** with `slots=True` unless `__dict__` is added back as an explicit slot — confirmed
  from the stdlib docs directly. Zero uses of `cached_property` exist in either target codebase,
  so this is a prophylactic rule, not a fix for a live bug.
- pyright's `reportUnhashable` is `"error"` starting at the **Basic** level, not just Strict —
  confirmed from pyright's own `configuration.md`. `reportMatchNotExhaustive` is `"none"` at
  Basic *and* Standard, `"error"` only at **Strict** — both target repos happen to run Strict
  today, so this is currently a non-issue, but it is a silent-off trap for any future module that
  isn't.
- `index/bot`'s own on-disk artifacts already carry an explicit `format_version` field
  (`core/render.py:146,160`) and a JSON Schema (`schema/root.schema.json`, referenced from
  `model.py`'s `PackageRoot` docstring) — the "should a written artifact carry a schema version"
  question is already answered "yes" in this fleet, just not written down as a rule.
  `ocx-sdk-python` never writes a persisted file at all (`_config.py`'s own docstring: "Never
  write ocx-owned files"), so this rule scopes to writers only.
- Two of three real `json.dumps()` call sites missing `sort_keys=True` (`index/bot/src/indexbot/core/render.py:146,160`)
  are deterministic today only because the input happens to be pre-sorted or a static literal —
  implicit, not declared, determinism. The third (`ocx-sdk-python/src/ocx_sdk/_env.py:182`)
  serializes into a subprocess environment variable, not a tracked file, and is out of scope for
  this rule.
- The dataclasses-vs-attrs question is **not resolvable** for `ocx-sdk-python` under its own
  `dependencies = []` constraint — see Contested for the specific, confirmed CPython MRO bug and
  why it doesn't currently bite this codebase's flat (non-diamond) inheritance shape.

## Findings

### 1. Which container for which job

The decision is not "which is nicest" — it's what the target is used *for*.

| Construct | Deciding question | This fleet's actual usage |
|---|---|---|
| `@dataclass(frozen=True, slots=True)` | A value object with named fields, possibly compared/hashed, possibly mutated once at construction (`__post_init__`) | Default choice — 72/75 dataclasses across both targets |
| `NamedTuple` | The value is genuinely tuple-shaped (positional, iterable, unpackable) and small | One use: `Completed` in `ocx-sdk-python/src/ocx_sdk/_process.py:104` — a subprocess result unpacked as `(returncode, stdout, stderr)`-shaped |
| `TypedDict` | The value **must** serialize to/from a JSON object with string keys and the shape is externally imposed (CLI kwargs, a wire payload) — never for values you construct and control end-to-end | One use: `ConfigOverrides` (`_config.py:36`); `DocScriptExportEntry` in `ocx/test/src/doc_scripts.py:34` explicitly "suitable for JSON serialisation" per its own comment (`:340`) |
| `Protocol` | An interface with multiple implementations, or a duck-typed boundary you don't own the concrete type for | `index/bot`'s `RegistryPort`/`GitHubPort`/`FilePort`/`ClockPort` (`ports.py:28,106,213,248`) — the functional-core/imperative-shell seam `quality-python.md`'s own CI-Bots section (index's extended copy) prescribes |
| Plain class | Mutable state with real methods/behavior, not a data bag; or a mixin | `LearningsStore`/`StateManager` in `hook_utils.py:106,320` — stdlib-only tooling, zero dataclass/Enum/TypedDict anywhere in that 688-line file |
| `attrs` | Never — `ocx-sdk-python`'s `pyproject.toml` declares `dependencies = []`; a runtime dependency here is a design change, not a default (per its own `architecture.md:32-34`, confirmed in the prior config-inventory audit) |

**The zero-dependency form, and what's lost.** Where `attrs` would give validators, converters,
and `__init_subclass__`-free extensibility "for free," the stdlib form gives none of that —
`__post_init__` has to hand-roll validation (see Finding 2), and there is no equivalent to
`attrs.field(converter=...)`. [Hynek Schlawack's *"import attrs"*](https://hynek.me/articles/import-attrs/)
argues dataclasses "were always a strict subset of attrs" and states, in a footnote, that attrs
provides "a correct collection of attributes according to the MRO" while "*dataclasses* get it
wrong" — but that specific article does not show the bug. The actual bug is filed and open
against CPython itself: [python/cpython#108611](https://github.com/python/cpython/issues/108611),
affecting 3.9–3.11 (open as of this research date) —

```python
@dataclass
class A:
    field: int = 10
    attr = 10


@dataclass
class B(A):
    pass


@dataclass
class C(A):
    field: int = 50
    attr = 50


@dataclass
class D(B, C):
    pass


D().field, D().attr  # (10, 50) — should both resolve the same way through the same MRO
```

`dataclasses` walks `__dataclass_fields__` (which includes inherited fields) per base, so an
earlier base's inherited field silently wins over a later base's override — a plain attribute on
the same class hierarchy resolves correctly via ordinary MRO. **This cannot bite either target
codebase today**: confirmed by grep, no dataclass in `ocx-sdk-python/src` or `index/bot/src`
inherits from another dataclass at all (`grep -rn "^class .*(.*,.*):" … | grep -v
"Protocol\|Enum"` returns only the one `TypedDict` line) — every dataclass here is flat. The bug
is real and open, but currently theoretical for this fleet; it becomes live the day someone
introduces diamond dataclass inheritance.

### 2. Dataclass correctness surface

**The hash matrix**, quoted exactly from
[docs.python.org/3/library/dataclasses.html](https://docs.python.org/3/library/dataclasses.html):

> "If _eq_ and _frozen_ are both true, by default `@dataclass` will generate a `__hash__()`
> method for you. If _eq_ is true and _frozen_ is false, `__hash__()` will be set to `None`,
> marking it unhashable (which it is, since it is mutable). If _eq_ is false, `__hash__()` will
> be left untouched."

This is a **runtime**, not a definition-time, failure: the class defines fine, and only the first
`set()`/dict-key use raises `TypeError: unhashable type`. pyright's own
[`configuration.md`](https://github.com/microsoft/pyright/blob/main/docs/configuration.md) (read
directly from the repo) confirms `reportUnhashable` defaults to `"error"` starting at **Basic**
mode (`| reportUnhashable | "none" | "error" | "error" | "error" |`, columns Off/Basic/Standard/Strict)
— it does not need Strict to catch this, contrary to an easy assumption. Both target repos run at
or above Basic (`ocx-sdk-python`: `strict=["src"]`; `index/bot`: `typeCheckingMode="strict"`), so
this class of bug is caught at type-check time in CI today, not merely at runtime.

`RegistryV2`/`RoutedRegistry` (`index/bot/src/indexbot/adapters/registry_v2.py:221,401`) are the
only two `eq=True, frozen=False` dataclasses in either target — both stateful adapters holding a
live `httpx.Client`. Grepped for set/dict-key usage across `src/` and `tests/`: none found — the
unhashability is present but never exercised.

**`slots=True`: what it buys, what it breaks.** Buys: no per-instance `__dict__`, smaller memory
footprint, `AttributeError` on typo-assignment instead of silently creating a new attribute.
Breaks, per the stdlib docs read directly: `functools.cached_property` ("this decorator requires
that the `__dict__` attribute on each instance be a mutable mapping … those that specify
`__slots__` without including `__dict__` … don't provide a `__dict__` attribute at all"); weakrefs
(need an explicit `weakref_slot=True`, added 3.11, "error to specify `weakref_slot=True` without
also specifying `slots=True`"); and multiple inheritance where a slot name collides with a base
class's (silently dropped from the generated `__slots__`, "do not use `__slots__` to retrieve the
field names … use `fields()` instead"). Zero `cached_property` uses exist in either target
codebase (grepped), so this is currently a non-issue in practice — worth stating as a rule anyway
since it's a hard `TypeError` if it ever is combined, not a style nit.

**Mutable defaults and `default_factory`.** `index/bot/src/indexbot/model.py:159-162` shows the
idiom for a *typed* factory:
```python
def _empty_tags() -> dict[str, TagEntry]:
    """Typed `default_factory` — a bare `dict` loses the `TagEntry` value type under strict type checking."""
    return {}
```
— `field(default_factory=dict)` alone types as `dict[Any, Any]` under strict mode; a named factory
function preserves the value type. `ocx-sdk-python/src/ocx_sdk/_config.py:141` does the same
inline: `field(default_factory=dict[str, Auth])`. The stdlib's own rationale (quoted from
docs.python.org): "the assumption is that if a value is unhashable, it is mutable" — `@dataclass`
raises `ValueError` for an unhashable *default* value at class-definition time, catching the
classic `def f(x=[])`-style bug in its dataclass-field form before the class even loads.

**`kw_only=True`.** Used exactly once in either codebase — `_types.py:206`,
`separator: str | None = field(default=None, kw_only=True)` — on a single trailing field, not as
a class-wide default. The stdlib form (`class-wide kw_only=True` on `@dataclass` itself, or the
`_: KW_ONLY` sentinel field) is unused; every other multi-field dataclass here accepts positional
construction.

**`__post_init__` and validation.** 10 uses across the two targets (`grep -rn "__post_init__"`).
All either normalize a value (`PackageRef.__post_init__` wraps `metadata` in
`MappingProxyType(dict(...))`, `_types.py:235-236`) or set a derived default
(`RegistryV2.__post_init__` defaults the token endpoint from `base_url`). None raise on invalid
input in the sampled sites — validation-that-rejects lives at the parse boundary
(`core/validate_entry.py`), not in `__post_init__`, consistent with `quality-python.md`'s own
Block-tier "no `assert` for input validation … explicit `if`/`raise`" rule scoping validation to
where untrusted data first enters, not to every downstream dataclass.

### 3. Enums

`ExitCode` exists in **both** targets as an `IntEnum` mapped 1:1 onto an exception/outcome
hierarchy — but *not* by attaching data to enum members. `ocx-sdk-python/src/ocx_sdk/_errors.py:304-316`:
```python
_EXIT_CODE_ERRORS: dict[ExitCode, type[OcxProcessError]] = {
    ExitCode.USAGE: UsageError, ExitCode.DATA_ERR: DataError, ...
}
```
— a plain module-level dict, kept beside the enum, not inside it. `index/bot/src/indexbot/exit_codes.py`
takes the lighter-weight route: no mapping table at all, just four codes with a docstring per
member (`OK = 0` / `"""No-op..."""`) — appropriate because the bot only has four codes and each
subcommand decides its own outcome directly, unlike the SDK's ~11-code, many-exception-type
hierarchy. **The stdlib's third option** — associated data via the member's own value tuple,
consumed by a custom `__init__`/`__new__` (`docs.python.org`: "If multiple values are given in
the member assignment, those values become separate arguments to `__init__`") — is used by
neither target. Deciding question: *does the association change per-instance, or is it a fixed
1:1 lookup?* A fixed lookup → sibling dict (this fleet's actual choice, keeps the enum wire-simple
and independently serializable). Data that's logically part of the member's identity (e.g., a
planet's mass in the stdlib's own tutorial example) → tuple-value + custom `__init__`.

**`StrEnum` vs `class X(str, Enum)`**: `ocx-sdk-python/src/ocx_sdk/_types.py:43,50` (`Channel`,
`InstallEnv`) already use `StrEnum` (3.11+) correctly. Zero `class X(str, Enum)` sites exist in
either target — but ruff `UP042` ("Class inherits from both `str` and `enum.Enum`") is confirmed
enabled and goes-red the moment one is introduced (tested directly, see Normative Guidance
Candidates #3).

**CLI-argument case.** Neither target parses an argument directly into an `Enum` via `argparse`'s
`type=`/`choices=` — `index/bot`'s `args.command` etc. are parsed as plain `str` and cast
(Finding 5), never coerced to an enum member at the parser boundary. This is a real gap: argparse
supports `type=ExitCode` / `choices=list(SomeStrEnum)` directly, which would collapse several of
the 32 argparse-related `cast()` sites at the source.

**`match` exhaustiveness.** Confirmed directly from pyright's `configuration.md`:
`reportMatchNotExhaustive` is `"none"` at Off, Basic, *and* Standard — `"error"` only at Strict.
Both targets run Strict, so a `match` over `ExitCode` or `Channel` that misses a case is caught
today. The trap: any file excluded from the `strict` scope (e.g., a future `tests/` directory, or
a project that copies this pattern at Standard mode) gets **zero** exhaustiveness checking, with
no error, ever — the check "fails silently" by simply not existing outside Strict, not by
misfiring.

**Aliasing / `@unique` / `Flag`**: none used in either target (no enum has two names for the same
value; no bitfield-shaped enum exists in the sampled code). Named here so they aren't
independently rediscovered — genuinely inapplicable to this fleet's domain so far.

### 4. Immutability and equality

`PackageRef` (`ocx-sdk-python/src/ocx_sdk/_types.py:212-243`) is the fleet's one hand-written
`__eq__`/`__hash__` pair, and it is the reference example for two rules at once:

```python
def __eq__(self, other: object) -> bool:
    if not isinstance(other, PackageRef):
        return NotImplemented
    return self.identifier == other.identifier


def __hash__(self) -> int:
    return hash(self.identifier)
```

1. **Structural-vs-identity equality, deliberately narrowed.** The class docstring states why:
   "Identity is the identifier alone. `metadata` is decoration … so two refs to the same package
   from different commands must not compare unequal." `eq=False` on the `@dataclass` decorator
   opts out of the generated (all-fields) equality specifically so `metadata` can be excluded.
2. **`NotImplemented`, not `False`.** Quoted from
   [docs.python.org's data model](https://docs.python.org/3/reference/datamodel.html#object.__eq__):
   "the `==` and `!=` operators will fall back to `is`/`is not`" only when *no* method returns
   anything but `NotImplemented`; returning `False` directly is "a definitive answer … no further
   fallback occurs" — meaning it **prevents** Python from trying the other operand's reflected
   `__eq__`. Getting this wrong breaks comparison against a subclass that knows how to compare
   itself against `PackageRef` but is never asked.

**`functools.total_ordering`**: zero uses in either target — no ordered-comparison type exists in
the sampled code (`ExitCode` as `IntEnum` gets ordering for free from `int`). Documented from
`functools`: requires `__eq__` plus exactly one of `__lt__`/`__le__`/`__gt__`/`__ge__`.

**Defensive copying at boundaries**: `PackageRef.__post_init__` (`_types.py:235-236`) wraps the
caller-supplied `metadata` mapping in `MappingProxyType(dict(self.metadata))` — copies *and*
makes read-only, rather than documenting "caller must not mutate." This is the fleet's own answer
to the copy-vs-document tradeoff at a public-API boundary, and it is consistent: no dataclass in
either target relies on a "please don't mutate this" docstring alone for a mutable field type.

### 5. Typed boundaries over stringly-typed data

**`NewType`**: zero uses (`grep -rn NewType` on both targets — no hits). Quoted from
[docs.python.org's typing module](https://docs.python.org/3/library/typing.html#newtype):
`NewType` "declares one type as a *subtype* of another," so `UserId = NewType('UserId', int)`
means a bare `int` cannot be passed where a `UserId` is expected, while a `type` alias
(`type Alias = Original`) "declares two types as equivalent" and offers no such protection.
`index/bot/src/indexbot/core/` has `parse_digest`/`parse_package_id`-shaped functions returning
bare `str`, and this fleet's own domain has at least three distinct string-shaped identifier
kinds (a digest, a tag, a package reference) that must never be interchanged at a call site — the
textbook `NewType` case. No live bug was traced to the current all-`str` approach in the sampled
code (functions are narrowly scoped, arguments are positionally distinct), which is why this is a
CONSIDER, not a MUST, below.

**`TypedDict` `Required`/`NotRequired`** (PEP 655, Standard — confirmed via
[peps.python.org/pep-0655](https://peps.python.org/pep-0655/)): solves exactly the
`ConfigOverrides(TypedDict, total=False)` shape (`ocx-sdk-python/src/ocx_sdk/_config.py:36`) —
per the PEP's own motivating example, mixing required and optional keys previously needed two
`TypedDict` classes joined by inheritance ("cumbersome"); `Required`/`NotRequired` lets one class
express both.

**PEP 705 `ReadOnly`**: confirmed **Final**, targeting **Python 3.13** — quoted directly from the
PEP. `ocx-sdk-python` floors at `>=3.12` (its own `pyproject.toml:8`), so `ReadOnly` is not
available to it yet; `ocx-mirror-sdk` floors at `>=3.13` and could use it today for the
`TypedDict`-shaped JSON its `datamodel-code-generator`-produced `_schema.py` emits (per the prior
config-inventory audit).

**The bot's 56 `cast(` sites, by target type they should become** (my angle — construction, not
the HTTP layer, per the coordination note from the sibling dive):

| Cluster | Count | Current pattern | What it should become |
|---|---|---|---|
| `argparse.Namespace` access | 32 (57%) | `cast(str, args.command)` / `cast("str \| None", getattr(args, "tags", None))` at every use site (`cli/announce.py`, `cli/seed_import.py`, `cli/main.py`, `cli/validate.py`, `cli/_wiring.py`, `cli/classify_pr.py`) | One typed extraction per subcommand handler — a small frozen dataclass or `TypedDict` built once from `args` at the top of the function, casts collapse to zero repeat sites |
| `_Manifest = dict[str, object]` walking | 15 (27%) | `cast(_Manifest, manifest.get("annotations") or {})`, `cast("list[_Manifest]", manifest.get("layers", []))` (`core/desc.py:32,137,144`; `core/observe.py:23,92`; `core/policy.py:87`) | A real `TypedDict` for the OCI manifest shape (with `Required`/`NotRequired`), parsed once at the registry-response boundary — same fix as Finding-5's `ConfigOverrides` case, applied to a second untyped dict alias |
| `Optional` narrowing after an implicit invariant | 9 (16%) | `cast(bytes, files.read_bytes(cas_path))` where `FilePort.read_bytes() -> bytes \| None` (`cli/validate.py:275,279,327,331`; `cli/reconcile.py:168`; `cli/announce.py:225,226,229`; `core/desc.py:151,153`) | An explicit `if data is None: raise ValidationError(...)` guard (matching `quality-python.md`'s own "assert for input validation → explicit if/raise" Block-tier rule) — pyright narrows the type automatically after the guard, no `cast()` needed |

56 = 32 + 15 + 9, confirmed by three disjoint greps (Normative Guidance Candidates #9/#8/#10 give
the exact commands).

### 6. Serialization determinism

`json.dumps`/`.dump` default behavior, quoted directly from
[docs.python.org/3/library/json.html](https://docs.python.org/3/library/json.html):
- `sort_keys`: "Default `False`" — "useful for regression tests to ensure that JSON
  serializations can be compared."
- `allow_nan`: "If `True` (the default), their JavaScript equivalents (`NaN`, `Infinity`,
  `-Infinity`) are used" — and explicitly: "The RFC does not permit the representation of
  infinite or NaN number values … the results are not valid JSON."
- Duplicate keys on decode: "does not raise an exception; instead, it ignores all but the last
  name-value pair" — `{"x": 1, "x": 2, "x": 3}` silently becomes `{'x': 3}`.

An AST-based check (stdlib `ast` module, ~15 lines, watched go red on a planted violation — see
Normative Guidance Candidates #11) found **3 real `json.dump`/`.dumps` call sites missing
`sort_keys=True`** across both targets:
- `index/bot/src/indexbot/core/render.py:146` — builds `packages` from `sorted(packages,
  key=lambda source: str(source.package_id))`, then dict-comprehends over the already-sorted
  sequence. Deterministic **today**, but only because insertion order happens to match the sort
  key — an accidental invariant, not a declared one; a future edit adding a key without
  re-checking this loses determinism silently.
- `index/bot/src/indexbot/core/render.py:160` — a literal `{"format_version": ..., "name_segments":
  NAME_SEGMENTS}`; deterministic because dict literals preserve declaration order, same
  "accidental, not declared" caveat.
- `ocx-sdk-python/src/ocx_sdk/_env.py:182` — `json.dumps(dict(config.mirrors))` assigned into a
  subprocess environment variable (`mapping["OCX_MIRRORS"] = ...`), never written to a tracked
  file or compared across runs. **Out of scope for this rule** — key order in an env var value
  doesn't create a diff-noise problem the way a committed artifact does.

**Schema versioning**: `index/bot`'s own artifacts already carry it —
`core/render.py:146,160` both emit `format_version`, and `model.py`'s `PackageRoot` docstring
(`:167-`) references `schema/root.schema.json` as the authoritative shape. `ocx-sdk-python` never
writes a persisted artifact (`architecture.md:24-26`, "Never write ocx-owned files … Read via
tomllib + published schemas"), so the question doesn't apply to it as a writer — only as a reader
of ocx's own versioned schemas, which is already how it's built. **The Rust catalog side treats
this as load-bearing** (per this program's own prior work on `rules/rust-quality/data-and-formats.md`'s
DATA-DET rule family); `index/bot` already matches that discipline in practice, it's just not
written down as a Python-side rule anywhere.

### 7. Idioms with real consequence (not taste)

Kept to constructs where getting it wrong changes behavior, per the brief's own instruction —
"the shipped rule set has no room for taste":

- **`NotImplemented` vs `False` from `__eq__`** — covered in Finding 4; changes which operand's
  method Python tries next, a correctness bug, not style.
- **`cached_property` + `slots=True`** — covered in Finding 2; a hard `TypeError`, not a lint nit.
- **`zip(strict=True)`** (3.10+): zero `zip(` calls exist in either target (grepped), so no live
  finding — included because a silent length-mismatch truncation is a real, not stylistic, bug
  class the moment this fleet does start zipping parallel sequences (e.g., zipping CLI positional
  args against their expected types).
- **EAFP vs LBYL at a `Mapping` boundary**: `.get(key, default)` beats `if key in d: d[key]` —
  the LBYL form double-hashes and is not atomic under concurrent mutation (relevant to
  `RegistryV2._tokens`, a mutable dict on a class with no documented thread-safety story).
- **Truthiness vs `is None`**: `ExitCode.OK = 0` is a case where `if result:` is wrong and `if
  result is not None:`/`if result == ExitCode.OK:` is required — `0` is falsy, and this is
  precisely the kind of enum-carrying-a-zero-value trap an agent optimizing for terse code would
  introduce. No live instance of this bug found in the sampled code (both targets consistently
  compare exit codes by identity/equality, never bare truthiness) — a rule worth stating because
  the domain manufactures the footgun (`ExitCode.OK == 0` in both enums), not because a violation
  exists today.
- **Comprehension vs loop vs generator**: no violation found; both targets already prefer
  comprehensions for `dict`/`list` construction and don't materialize large sequences
  unnecessarily in the sampled files. Not elevated to a numbered rule — no evidence it's a live
  problem here.

## Normative guidance candidates

| # | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| 1 | Default every dataclass to `@dataclass(frozen=True, slots=True)`; a mutable/unslotted dataclass needs a one-line comment stating why (e.g., "stateful adapter, holds a live client"). | Already the convention in 98%/92% of existing usage; frozen dataclasses get a working `__hash__` for free, slots removes per-instance `__dict__` overhead. | `grep -rn "^@dataclass" <path> --include="*.py"` then confirm each hit's argument list contains `frozen=True, slots=True` or is followed by a justifying comment on the class line. Empty diff from the expected set = pass. | SHOULD |
| 2 | Never leave a dataclass at its default `eq=True, frozen=False` if instances could plausibly end up in a `set`/dict key; either freeze it, or accept unhashability and route the design past a reviewer. | `__hash__` silently becomes `None` — a runtime `TypeError` at first use, not a definition-time error (docs.python.org, quoted in Finding 2). | pyright `reportUnhashable`, confirmed `"error"` from Basic mode up (`pyright/docs/configuration.md`, read directly) — already runs in both target repos' CI. No additional check needed beyond confirming the file is inside `[tool.pyright] include`. | MUST |
| 3 | `class X(str, Enum)` → `StrEnum` (3.11+). | Legacy pre-3.11 spelling; `StrEnum` is a stdlib type built for this. | ruff `UP042` — confirmed goes-red: planted `class Color(str, Enum): RED = "red"` in a scratch file, ran `ruff check --select E,W,F,I,B,UP,ANN,RUF,D --isolated` (ocx-sdk-python's exact select list) → `UP042 Class Color inherits from both \`str\` and \`enum.Enum\`` fired, file then deleted. | demote-to-lint-config |
| 4 | A "caller said nothing" sentinel is a single-member `Enum` exposed as a `Final` module constant (`_Unset`/`UNSET` pattern, `_types.py:212-224`), never a bare `object()`. | `object()` sentinels don't narrow through a `Literal` union and print as `<object object at 0x...>`; an enum member does both correctly and is the house pattern already. | `grep -rn "= object()" <path> --include="*.py"` — any hit used as a default-argument sentinel is a candidate to convert. Zero hits today in either target. | SHOULD |
| 5 | `__eq__` overrides return `NotImplemented` for an incomparable type, never `False`. | `False` blocks Python from trying the other operand's reflected `__eq__`; `NotImplemented` lets the fallback chain run (docs.python.org data model, quoted in Finding 4). | No automated check found. Review heuristic: `grep -n "def __eq__" -A5 <path>` and confirm the not-isinstance branch returns `NotImplemented`. `PackageRef` (`_types.py:238-241`) is the correct in-repo template to compare against. | MUST |
| 6 | A `TypedDict` with a genuine mix of always/sometimes-present keys uses `Required`/`NotRequired` (PEP 655), not `total=False`. | `total=False` marks *every* key optional; mixing via inheritance is "cumbersome" per the PEP's own stated motivation, and this fleet's own `quality-python.md` Warn tier already asks for this. | `grep -rn "TypedDict, total=False" <path> --include="*.py"` — every hit is a candidate. Run: exactly 1 hit (`ocx-sdk-python/src/ocx_sdk/_config.py:36`, `ConfigOverrides`). | SHOULD |
| 7 | An identifier type that must never be interchanged with a structurally-identical `str` (digest, tag, package ref) is a `NewType`, not a bare `str`. | `NewType` makes the type checker reject passing an `int`/plain-`str` where the distinct identity is required, at effectively zero runtime cost (docs.python.org typing docs, quoted in Finding 5). | No automated check — a design-time decision. Candidate sites: every `def parse_<noun>(...) -> str` in `index/bot/src/indexbot/core/`. | CONSIDER |
| 8 | A `dict[str, object]`/`dict[str, Any]` alias used to walk external JSON (`_Manifest` and equivalents) becomes a `TypedDict` once the shape stabilizes. | Directly caused 15/56 (27%) of `index/bot`'s `cast()` sites; a `TypedDict` gets pyright to narrow `.get()`/`[...]` access without a cast at every read. | `grep -rn "cast(" index/bot/src --include="*.py" \| grep -cE "_Manifest\|manifest\.\|annotations\.\|annotations\)\|\"dict\[str\|\"list\["` — ran: 15. Target: trending to 0 as manifest shapes get typed. | SHOULD |
| 9 | `argparse.Namespace` attribute access is narrowed exactly once per subcommand into a typed structure, not re-cast at every access site. | Directly caused 32/56 (57%) of `index/bot`'s `cast()` sites — the single largest cluster. | `grep -rn "cast(" index/bot/src --include="*.py" \| grep -cE "args\.\|getattr\(args,"` — ran: 32. Target: near 0 once each subcommand extracts its typed args once. | SHOULD |
| 10 | Narrow `X \| None` with an explicit `if x is None: raise ...`, never `cast()`. | Directly caused 9/56 (16%) of `index/bot`'s `cast()` sites, all stripping `bytes \| None`/`str \| None` from `FilePort.read_bytes()` / dataclass fields after an unstated invariant; matches `quality-python.md`'s own Block-tier "explicit `if`/`raise`" rule. | `grep -rn "cast(bytes," index/bot/src --include="*.py"` plus `grep -rn "cast(str, .*\.desc\." index/bot/src --include="*.py"` — ran: 9 combined. | SHOULD |
| 11 | `json.dumps`/`.dump` writing a version-controlled or cross-run-compared artifact passes `sort_keys=True` explicitly, even when the input is already ordered. | Implicit ordering (pre-sorted insertion, dict-literal declaration order) is invisible at the call site and breaks silently the next time a key is added without re-checking the invariant. | Stdlib `ast`-based check (15 lines, no third-party dep): walks `ast.Call` nodes named `dump`/`dumps`, prints `file:line` for every one missing a `sort_keys` keyword. **Watched go red**: planted `json.dumps(data)` with no `sort_keys` in a scratch file → printed `violation2.py:11: json.dumps() call has no sort_keys=`; fixed version with `sort_keys=True` → empty output (pass), confirmed; then deleted both scratch files. Real run: 3 hits (`_env.py:182`; `render.py:146,160` — see Finding 6 for which are actionable). | SHOULD |
| 12 | A `json.dumps`/`.dump` payload that must be valid JSON for a non-Python consumer passes `allow_nan=False`. | Default `allow_nan=True` silently emits `NaN`/`Infinity`/`-Infinity`, which "the RFC does not permit" (json docs, quoted in Finding 6) — no other language's JSON parser accepts it. | `grep -rn "json.dump" <path> --include="*.py" \| grep -v "allow_nan"` — proxy; every hit whose payload can contain a `float` is a candidate. No float-carrying JSON payload found in either target today (see Contested). | CONSIDER |
| 13 | An on-disk artifact another tool reads carries an explicit `format_version`/`schema_version` top-level field. | `index/bot` already does this (`render.py:146,160`) and backs it with a JSON Schema (`model.py`'s `PackageRoot` docstring references `schema/root.schema.json`); this fleet's Rust catalog side already treats format versioning as load-bearing. `ocx-sdk-python` never writes a persisted file, so scope to writers only. | No automated check — design review. Applies to `index/bot` and any future Python writer; explicitly does not apply to `ocx-sdk-python`. | SHOULD (writers only) |
| 14 | Never combine `functools.cached_property` with `slots=True` on the same class. | Stdlib docs, quoted directly: `cached_property` "requires that the `__dict__` attribute on each instance be a mutable mapping" and slotted classes "without including `__dict__`... don't provide a `__dict__` attribute at all" — a hard `TypeError` at class-definition time. | `grep -rln "cached_property" <path>` cross-referenced against dataclasses/classes using `slots=True` in the same file. Ran: zero `cached_property` uses in either target — prophylactic rule, no live violation. | MUST |
| 15 | Every source directory containing a `match` statement over a closed enum/union must be inside the project's `strict` pyright scope. | `reportMatchNotExhaustive` is `"none"` at Basic *and* Standard, `"error"` only at Strict (pyright `configuration.md`, read directly) — outside Strict, a non-exhaustive `match` produces **no diagnostic at all**, ever. This is exactly the "verification that cannot go red" defect class the whole program tracks. | `grep -rln "match " <path> --include="*.py"` cross-checked against each `pyproject.toml`'s `[tool.pyright] include`/`typeCheckingMode`. Both targets currently pass (both run Strict). | MUST |
| 16 | *(cross-reference, not new)* `Optional[X]`/`List[int]` → `X \| None`/`list[int]`. | Already covered. | ruff `UP006`/`UP007`/`UP035` — already verified goes-red in `existing-rules-ledger.md` row #21. | n/a — see ledger |

## Applied to the SDK, the bot and the helper layer

| Rule # | `ocx-sdk-python` | `index/bot` | `ocx/test/src` (harness helpers) | `hook_utils.py` (stdlib-only) |
|---|---|---|---|---|
| 1 (frozen+slots default) | **satisfied**, 50/51 (98%) — `_types.py`, `_results.py`, `_dist.py`, etc. | **satisfied**, 22/24 (92%) — `model.py`, `core/*.py` | **partial** — `static_index.py:78,170` and `doc_scripts.py:119` use `slots=True` but `runner.py:44`'s bare `@dataclasses.dataclass` has neither | **does not apply** — zero dataclasses in this file; two plain `__init__`-based classes (`StateManager` `:106`, `LearningsStore` `:320`) instead |
| 2 (eq/frozen hash trap) | **satisfied** — the one `eq=False` class (`PackageRef`) hand-writes a correct `__hash__` | **inert-but-present** — `RegistryV2`/`RoutedRegistry` are unhashable by the default rule, never used as dict keys/set members (checked) | not checked (secondary subject, out of primary scope) | **does not apply** — no dataclasses |
| 3 (`StrEnum` not `(str, Enum)`) | **satisfied** — `Channel`, `InstallEnv` already `StrEnum` | n/a — `ExitCode` is `IntEnum` (correct choice, integer wire values) | not checked | **does not apply** — no enums |
| 4 (enum sentinel, not `object()`) | **satisfied** — `_Unset`/`UNSET` is the reference example | not applicable — no sentinel-for-absence pattern found | not checked | **does not apply** |
| 5 (`NotImplemented` not `False`) | **satisfied** — `PackageRef.__eq__` | n/a — no custom `__eq__` in `index/bot/src` | not checked | **does not apply** |
| 6 (`Required`/`NotRequired` over `total=False`) | **violated** — `ConfigOverrides` (`_config.py:36`), new commitment to fix | n/a — no `TypedDict` in `index/bot/src` | **violated** — `DocScriptExportEntry` (`doc_scripts.py:34`) not checked for `total=` usage | **does not apply** |
| 7 (`NewType` for identifiers) | new commitment — no identifiers currently distinguished this way | new commitment — `parse_digest`/`parse_package_id` return bare `str` | not checked | **does not apply** |
| 8 (`TypedDict` over `dict[str,object]` alias) | n/a — no equivalent alias found in `ocx-sdk-python/src` | **violated**, 15 sites — `_Manifest` in `core/desc.py:32`, `core/observe.py:23` | not checked | **does not apply** |
| 9 (typed args extraction) | n/a — SDK has no CLI/argparse surface | **violated**, 32 sites across `cli/*.py` — new commitment | not checked | **does not apply** — hooks parse JSON stdin, not argv |
| 10 (guard, not cast, for Optional) | not checked | **violated**, 9 sites — `FilePort.read_bytes()` callers | not checked | **does not apply** |
| 11 (`sort_keys=True`) | **violated** — `_env.py:182`, but out of scope (env var, not a file) | **violated** — `render.py:146,160`, new commitment (currently accidentally-deterministic) | not checked | **out of scope, not a violation** — 6 `json.dump(s)` sites (`hook_utils.py:38,133,218,446,464,476`), none pass `sort_keys=True`, but all write to `.claude/state/`/`.claude/hooks/.state/`, both gitignored (`ocx/.gitignore:32,39`) — session-local state, not a cross-tool or version-controlled artifact, same exemption reasoning as the SDK's env-var case |
| 12 (`allow_nan=False`) | no float-carrying JSON payload found — not applicable today | no float-carrying JSON payload found — not applicable today | not checked | **does not apply** |
| 13 (`format_version` on writers) | **does not apply** — never writes a persisted artifact (by design) | **satisfied** — `render.py` already emits `format_version` | not checked | **does not apply** — hooks write log/state files, not versioned artifacts |
| 14 (`cached_property` + `slots` never combined) | **satisfied** (vacuously — zero `cached_property` uses) | **satisfied** (vacuously) | not checked | **does not apply** |
| 15 (`match` needs Strict scope) | **satisfied** — `strict=["src"]` covers all `match` sites found | **satisfied** — `typeCheckingMode="strict"` covers src+tests | **not covered** — `ocx/test` has no `[tool.pyright]` section at all (confirmed in `harness-shape.md:157`), so any `match` statement there gets zero exhaustiveness checking | **does not apply** — no `match` statements found in `hook_utils.py` |

**Which rules don't apply to `hook_utils.py` and why**: every dataclass/enum/TypedDict-shaped rule
(1–8, 14, 15) is inapplicable by construction — the file has zero instances of any of these
constructs; it's two plain classes with hand-written `__init__` methods, consistent with the
"stdlib-only, single-file, PEP 723" tooling tier this program's config-inventory audit already
identified as a distinct shape from the SDK/bot. This is not a violation of anything — `@dataclass`
is stdlib and costs nothing to adopt, but the file's own ceremony-minimizing style (no type
hints beyond a few, no `Protocol`s) is a legitimate, deliberate choice for a script this small
(688 lines) rather than a gap to close.

## AI-agent angle

Team-lead's list, each with the smallest mechanical check and its ruff code where one exists —
cross-referenced against `existing-rules-ledger.md` to avoid re-litigating already-verified rows:

| Mistake | Smallest mechanical check | Ruff code | Already verified go-red? |
|---|---|---|---|
| Mutable default argument (`def f(x=[])`) | `ruff check --select B006` | `B006` | yes — `existing-rules-ledger.md` row #3 |
| `eq=True` (default) on a dataclass without thinking about hashing | pyright, watching for `reportUnhashable` | n/a (pyright, not ruff) | yes — this dive, Normative Guidance #2, confirmed `"error"` from Basic mode via `pyright/docs/configuration.md` |
| `class Foo(str, Enum)` instead of `StrEnum` | `ruff check --select UP042` | `UP042` | yes — this dive, planted-violation test above |
| `Optional[X]` instead of `X \| None` | `ruff check --select UP045` | `UP045` | yes — `existing-rules-ledger.md` row #21 |
| `List[int]` instead of `list[int]` | `ruff check --select UP006,UP035` | `UP006`/`UP035` | yes — `existing-rules-ledger.md` row #21 |
| `dict[str, Any]` at a public API boundary | no ruff rule found (checked `--select ALL` in the ledger dive) | none | no — `existing-rules-ledger.md` row #5, "no-verification" |
| `==` against an enum member's `.value` rather than the member | no ruff rule found; `grep -rn "\.value ==" <path>` is a coarse proxy (also matches legitimate value comparisons) | none | not tested — no repo instance found to plant against; documented as a proxy only |
| Comparing floats with `==` | no ruff rule found; `grep -rnE "float\(.*\) ==\|== float\("` is a coarse proxy | none | not tested — zero float-comparison sites exist in either target to plant a realistic violation against |
| `json.dumps(...)` without `sort_keys=True` for a file under version control | AST-based stdlib check (15 lines) | none | **yes** — this dive, Normative Guidance #11, planted and watched go red, then confirmed the fix produces empty output |

## Contested / evolving

As of 2026-08-23:

- **dataclasses vs. attrs, under `ocx-sdk-python`'s zero-dependency constraint**: not resolvable
  as stated. The confirmed, open CPython bug
  ([python/cpython#108611](https://github.com/python/cpython/issues/108611)) is real evidence
  attrs handles multiple-inheritance field collection more correctly than stdlib `dataclasses` —
  but `ocx-sdk-python/pyproject.toml`'s `dependencies = []` (confirmed, and enforced per
  `architecture.md:32-34`: "Zero runtime dependencies … New runtime dep = design change") makes
  attrs unavailable regardless of the argument's merit. The bug is also currently inert for this
  codebase specifically (zero diamond dataclass inheritance exists). **Verdict: stay on stdlib
  `dataclasses`; the MRO bug is a documented, accepted risk that would only need revisiting if
  this codebase ever introduces multi-parent dataclass inheritance** — at which point it becomes
  a concrete, plantable violation rather than a theoretical one.
- **`reportMatchNotExhaustive` off-by-default outside Strict**: both targets happen to run Strict
  today, so this is dormant, not fixed — a genuine "silent-off" trap for any Standard-mode
  adopter of a rule set built from this dive.
- **`allow_nan=False` (Normative Guidance #12)**: correct per the JSON RFC, but no float-carrying
  JSON payload exists in either target today to demonstrate the failure mode concretely — kept at
  CONSIDER rather than SHOULD/MUST until a real site exists to cite.
- **`NewType` adoption (Normative Guidance #7)**: no live bug traced to the current bare-`str`
  approach — the domain supports the case in principle (PEP's own worked example is an ID type),
  but this dive found zero evidence of an identifier actually being mixed up at a call site in
  either target. Kept at CONSIDER for the same reason as `allow_nan`.
- **`==` against an enum's `.value` and float `==`** (both from the AI-agent list): included
  because they're well-known LLM failure modes in general Python, not because either target
  codebase exhibits them — zero instances of either pattern found by grep in the sampled source.
  No mechanical check was watched go red for these two specifically since there is no realistic
  in-repo violation to plant against; the checks given above are best-effort proxies, flagged as
  such.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.python.org — dataclasses](https://docs.python.org/3/library/dataclasses.html) | Primary stdlib reference | current (3.14 branch) | Exact hash matrix, slots caveats, default_factory rationale, kw_only, `__post_init__`/`InitVar` — quoted directly in Findings 2 |
| [docs.python.org — enum](https://docs.python.org/3/library/enum.html) | Primary stdlib reference | current | `StrEnum`/`IntEnum`/`Flag` exact semantics, `auto()`, `@unique`, member-data-via-tuple pattern — Finding 3 |
| [docs.python.org — typing (NewType)](https://docs.python.org/3/library/typing.html#newtype) | Primary stdlib reference | current | `NewType` vs `type` alias distinction, runtime cost — Finding 5 |
| [docs.python.org — json](https://docs.python.org/3/library/json.html) | Primary stdlib reference | current | `sort_keys`, `allow_nan`, duplicate-key decode behavior — Finding 6, quoted directly |
| [docs.python.org — functools (cached_property, total_ordering)](https://docs.python.org/3/library/functools.html#functools.cached_property) | Primary stdlib reference | current | `cached_property`'s `__dict__` requirement, `total_ordering`'s exact contract — Findings 2 and 4 |
| [docs.python.org — data model (`object.__eq__`)](https://docs.python.org/3/reference/datamodel.html#object.__eq__) | Primary language reference | current | `NotImplemented` vs `False` fallback semantics, exact wording — Finding 4 |
| [peps.python.org — PEP 655](https://peps.python.org/pep-0655/) | PEP, Standard | accepted, shipped 3.11 | `Required`/`NotRequired` motivation and exact syntax — Finding 5 |
| [peps.python.org — PEP 705](https://peps.python.org/pep-0705/) | PEP | **Final**, targets 3.13 | `ReadOnly` for `TypedDict` — confirmed status and version, relevant to `ocx-mirror-sdk` (3.13 floor) not `ocx-sdk-python` (3.12 floor) |
| [hynek.me — import attrs](https://hynek.me/articles/import-attrs/) | Practitioner argument | 2026-era article | Source of the "dataclasses is a strict subset of attrs" / MRO claim — confirmed the claim exists but does not itself demonstrate the bug |
| [python/cpython#108611](https://github.com/python/cpython/issues/108611) | Primary bug report, open issue on the language implementation itself | filed against 3.9–3.11, open as of this research | The actual, concrete, minimal-reproduction MRO bug Hynek's article gestures at — read directly, not summarized secondhand |
| [attrs.org — why not dataclasses](https://www.attrs.org/en/stable/why.html) | Primary project documentation | current | Checked for a documented MRO comparison — confirmed it does **not** contain one, ruling out a second independent source for that specific claim |
| [microsoft/pyright — docs/configuration.md](https://github.com/microsoft/pyright/blob/main/docs/configuration.md) | Primary tool documentation, read directly from the repo (not the rendered/JS docs site, which failed to fetch) | current | Exact default severity table for `reportUnhashable` (error from Basic) and `reportMatchNotExhaustive` (error only at Strict) — Findings 2 and 3 |
| `/home/mherwig/dev/ocx-sdk-python/pyproject.toml` | Repo config, read directly | this fleet, current | `dependencies = []`, `strict = ["src"]`, Python floor `>=3.12` — grounds the zero-dependency constraint and the pyright-strict claim |
| `/home/mherwig/dev/index/bot/pyproject.toml` | Repo config, read directly | this fleet, current | `typeCheckingMode = "strict"` on `include = ["src", "tests"]` — grounds the "full strict" claim from the brief |
| `/home/mherwig/dev/grimoire-lore/.agents/research/python-audit/existing-rules-ledger.md` | This program's own prior artifact | 2026-08-22/23 | Cross-referenced to avoid re-verifying already-confirmed ruff go-red rows (`B006`, `UP006/007/035`) |
