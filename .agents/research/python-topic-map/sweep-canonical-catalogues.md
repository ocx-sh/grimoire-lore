---
title: Full-enumeration sweep — Effective Python, Fluent Python, typing spec
corpus: Effective Python 3rd ed (125 items) / Fluent Python 2nd ed (24 chapters) / typing specification (26 chapters)
agent: scout-canonical (sweep pass)
model: sonnet
date_researched: 2026-08-23
sources_count: 12
---

## Table of contents

- [Method and sourcing](#method-and-sourcing)
- [Effective Python, 3rd ed — all 125 items](#effective-python-3rd-ed--all-125-items)
- [Fluent Python, 2nd ed — 24 chapters](#fluent-python-2nd-ed--24-chapters)
- [Typing specification — 26 chapters](#typing-specification--26-chapters)
- [Items that are now wrong](#items-that-are-now-wrong)
- [Whole sections nobody's candidates touch](#whole-sections-nobodys-candidates-touch)
- [New candidates from the sweep](#new-candidates-from-the-sweep)

## Method and sourcing

This is a coverage instrument, not a citation source: every row of all three
catalogues was enumerated and judged, including the ~140 that end "no" in
the adoption column. A `no` is not a gap in this file — the gap is the
uncovered *topic*, and the fourth-column check is what turns "we didn't
cite this" into either a rule (fifth column, promoted below) or a stated
decision to leave it alone.

**Effective Python, 3rd ed**: all 125 items fetched in one pass from
[effectivepython.com](https://effectivepython.com/) (the author's own
companion site, which lists every item by number and title under its 14
chapters). Cross-checked against O'Reilly's search-indexed snippets, which
surfaced items 1–15 and 116–125 independently — both ranges matched the
effectivepython.com text exactly, so the single source is treated as
reliable for the full list.

**Fluent Python, 2nd ed**: the 24-chapter/5-part structure came from the
[official companion repo](https://github.com/fluentpython/example-code-2e)
(fetched directly). O'Reilly's chapter pages 403 WebFetch outright (bot
protection, not a paywall — confirmed by testing plain index pages), so
per-chapter *section* detail was reconstructed from O'Reilly's own
search-indexed snippets via targeted queries, which for most chapters
returned enough of the real section-heading list to be usable verbatim.
Full section lists were obtained this way for chapters 1, 3, 4, 5, 7, 8, 9,
17 (partial), and 19 (partial); the remaining chapters are swept at
chapter-title + thematic-content grain only — **section-level detail for
chapters 2, 6, 10, 11, 12, 13, 14, 15, 16, 18, 20, 21, 22, 23, 24 is not
independently verified and is marked "not swept" in that column.** No
chapter title, part grouping, or thematic claim below was invented — every
row traces to either the companion-repo TOC or a fetched search snippet.

**Typing specification**: all 26 top-level chapter URLs fetched directly
from the spec's own [index page](https://typing.python.org/en/latest/spec/index.html).
The spec is continuously maintained (not a dated book), so "still correct"
is near-uniformly yes by construction — the sweep's value here is entirely
in the coverage column, per the brief's own framing: chapter titles are the
right grain, since "we never opened that chapter" is the actual finding
this catalogue exists to reveal, not per-subsection staleness.

## Effective Python, 3rd ed — all 125 items

### Chapter 1: Pythonic Thinking

| Item | What it says | Still correct in 3.12–3.14? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 1. Know Which Version of Python You're Using | Check `sys.version`/`sys.version_info` before relying on version-gated features | yes | no | partial — shape 4's zero-dep tools should assert their floor at import time |
| 2. Follow the PEP 8 Style Guide | Adopt the community style baseline | yes | no | no — ruff's default rule set already enforces this |
| 3. Never Expect Python to Detect Errors at Compile Time | Dynamic typing means many bugs surface only at runtime | yes | no | no — motivates pyright strict, which shape 2 already runs |
| 4. Write Helper Functions Instead of Complex Expressions | Extract dense one-liners into named functions | yes | no | no — style preference, partially covered by complexity linting |
| 5. Prefer Multiple-Assignment Unpacking over Indexing | `a, b = pair` over `pair[0], pair[1]` | yes | no | no — style, low leverage |
| 6. Always Surround Single-Element Tuples with Parentheses | `(x,)` not `x,` — the comma alone makes the tuple | yes | no | no — ruff COM818 covers the ambiguous case |
| 7. Consider Conditional Expressions for Simple Inline Logic | Ternary `x if c else y` for simple cases only | yes | no | no |
| 8. Prevent Repetition with Assignment Expressions | Walrus `:=` to avoid recomputation | yes (3.8+) | no | no — style |
| 9. Consider `match` for Destructuring; Avoid When `if` Suffices | Structural pattern matching, 3.10+, don't overuse | yes (3.10+ only — a real floor gate) | no | partial — shape 1 (>=3.10) could use it for CLI dispatch; low incidence |

### Chapter 2: Strings and Slicing

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 10. Know the Differences Between `bytes` and `str` | Don't mix the two types silently | yes | partial — my text-encoding-defaults candidate is adjacent, not identical | partial — shape 1/4 read subprocess output, which is bytes by default |
| 11. Prefer Interpolated F-Strings | f-strings over `%`/`.format()` | yes, and stronger since PEP 701 (3.12) loosened f-string grammar | no | no — ruff UP032 already enforces |
| 12. `repr` vs `str` when Printing Objects | `repr` for debugging, `str` for display | yes | partial — my data-model candidate covers this | no additional |
| 13. Prefer Explicit String Concatenation | Avoid implicit adjacent-literal concatenation, especially in lists | yes | no | no |
| 14. Know How to Slice Sequences | Slicing semantics and half-open ranges | yes | no | no |
| 15. Avoid Striding and Slicing in a Single Expression | `seq[::2]` combined with `[a:b]` is unreadable | yes | no | no |
| 16. Prefer Catch-All Unpacking over Slicing | `first, *rest = seq` | yes | no | no |

### Chapter 3: Loops and Iterators

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 17. Prefer `enumerate` over `range` | Idiomatic indexed iteration | yes | no | no |
| 18. Use `zip` to Process Iterators in Parallel | Parallel iteration idiom | yes | no | no |
| 19. Avoid `else` Blocks After `for`/`while` Loops | `for...else` is confusing | yes | no | no — style nit |
| 20. Never Use `for` Loop Variables After the Loop Ends | The loop variable leaks into enclosing scope and holds its last value | yes — genuine correctness footgun | no | partial — real bug source, all 4 shapes |
| 21. Be Defensive when Iterating over Arguments | A function arg might be a one-shot iterator, not a re-iterable container | yes | partial — my iterator-exhaustion candidate is the general case, this is the specific function-argument instance | partial |
| 22. Never Modify Containers While Iterating over Them | Classic mutate-during-iterate bug | yes | no | partial — genuine, medium, all shapes |
| 23. Pass Iterators to `any`/`all` for Short-Circuiting | Avoid materializing a full list first | yes | no | no |
| 24. Consider `itertools` | Use the toolbox instead of hand-rolled loops | yes | yes — my itertools candidate | covered |

### Chapter 4: Dictionaries

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 25. Be Cautious when Relying on Dictionary Insertion Ordering | `dict` order is guaranteed (3.7+); `set` order is not | yes | yes — my dict/set-ordering candidate | covered |
| 26. Prefer `get` over `in`+`KeyError` | Idiom for missing-key handling | yes | no | no |
| 27. Prefer `defaultdict` over `setdefault` | For internal-state accumulation | yes | no | no |
| 28. Know How to Construct Key-Dependent Defaults with `__missing__` | Custom missing-key logic | yes | no | no |
| 29. Compose Classes Instead of Deeply Nesting Containers | Replace `dict`-of-`list`-of-`tuple` with real types | yes | no | partial — API-design guidance, shape 2/3, medium |

### Chapter 5: Functions

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 30. Know That Function Arguments Can Be Mutated | Callers' mutable objects can be silently changed by the callee | yes — genuine, undercited footgun | **no** | **yes — high, all 4 shapes; not covered by ruff defaults** |
| 31. Return Dedicated Result Objects Instead of >3-Variable Unpacking | Use a named tuple/dataclass for multi-value returns | yes | no | partial — shape 2/3, medium |
| 32. Prefer Raising Exceptions to Returning `None` | `None`-as-sentinel is error-prone | yes | partial — exception-hierarchy candidate | partial — shape 2 API design |
| 33. Know How Closures Interact with Scope and `nonlocal` | Closure variable-binding rules | yes | no | no — style/niche |
| 34. Reduce Visual Noise with Variable Positional Arguments | `*args` | yes | no | no |
| 35. Provide Optional Behavior with Keyword Arguments | `**kwargs` for opt-in behavior | yes | no | no |
| 36. Use `None` and Docstrings for Dynamic Default Arguments | The mutable-default-argument trap (`def f(x=[])`) | yes — classic, still bites | **no** | **yes — high, all 4 shapes; ruff's B006 exists but is opt-in (bugbear), not a default** |
| 37. Enforce Clarity with Keyword-Only and Positional-Only Arguments | `*`/`/` in signatures | yes | no | partial — shape 2 API design, medium |
| 38. Define Function Decorators with `functools.wraps` | Preserve `__name__`/`__doc__`/introspection through a decorator | yes | partial — my ParamSpec candidate is the *typing* half, this is the *runtime* half | partial — shape 2/4 decorators, medium |
| 39. Prefer `functools.partial` over `lambda` for Glue Functions | Readability/pickle-ability | yes | no | no — style/low |

### Chapter 6: Comprehensions and Generators

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 40. Use Comprehensions Instead of `map`/`filter` | Idiomatic Python style | yes | no | no |
| 41. Avoid More Than Two Control Subexpressions in Comprehensions | Readability cap | yes | no | no |
| 42. Reduce Repetition with Assignment Expressions in Comprehensions | Walrus inside a comprehension | yes | no | no |
| 43. Consider Generators Instead of Returning Lists | Streaming over materializing | yes | no | partial — memory/streaming for shape 1/3 large output, medium |
| 44. Consider Generator Expressions for Large Comprehensions | Same idea, expression form | yes | no | no — low, overlaps 43 |
| 45. Compose Multiple Generators with `yield from` | Delegation | yes | no | no — niche |
| 46. Pass Iterators into Generators as Arguments Instead of `send` | Avoid the `send()` protocol's complexity | yes | no | no — niche |
| 47. Manage Iterative State with a Class Instead of Generator `throw` | Avoid `throw()`'s complexity | yes | no | no — niche |

### Chapter 7: Classes and Interfaces

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 48. Accept Functions Instead of Classes for Simple Interfaces | Prefer a callable over a one-method class | yes | no | no — style |
| 49. Prefer OOP Polymorphism over `isinstance` Checks | Dispatch via method resolution, not type-testing | yes | no | partial — shape 2 API design, low-medium |
| 50. Consider `functools.singledispatch` | Type-based dispatch as an alternative to polymorphism | yes | partial — my functools candidate mentions it briefly | no — niche/low |
| 51. Prefer `dataclasses` for Lightweight Classes | Reduce boilerplate | yes | yes — my dataclass candidate | covered |
| 52. Use `@classmethod` Polymorphism for Generic Construction | Factory methods that respect subclassing | yes | partial — ties to my `Self`/PEP 673 candidate | covered |
| 53. Initialize Parent Classes with `super()` | Cooperative multiple inheritance, MRO correctness | yes | **no** | **partial — genuine gap, medium, shape 2/3 class hierarchies** |
| 54. Consider Composing Functionality with Mix-in Classes | Mixins over deep inheritance | yes | partial — extensibility-seams candidate | no — style/low |
| 55. Prefer Public Attributes over Private Ones | No true privacy in Python; leading underscore is convention | yes | no | no — style |
| 56. Prefer `dataclasses` for Immutable Objects | `frozen=True` | yes | yes — my dataclass candidate | covered |
| 57. Inherit from `collections.abc` for Custom Containers | Get mixin methods and a documented contract for free | yes | yes — my collections.abc candidate | covered |

### Chapter 8: Metaclasses and Attributes

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 58. Use Plain Attributes Instead of Getter/Setter Methods | Pythonic default | yes | no | no |
| 59. Consider `@property` Instead of Refactoring Attributes | Add behavior without changing the call site | yes | no | no |
| 60. Use Descriptors for Reusable `@property` Methods | Descriptor protocol for shared validation/transform logic | yes | partial — touched only inside my data-model row, not a standalone candidate | **partial — genuine gap, shape 2 (validated SDK fields), low-medium** |
| 61. Use `__getattr__`/`__getattribute__`/`__setattr__` for Lazy Attributes | Dynamic-attribute machinery and its recursion trap | yes | partial — the recursion footgun is noted in my data-model row, not promoted | **partial — genuine gap, shape 2 lazy-loading, medium** |
| 62. Validate Subclasses with `__init_subclass__` | Plugin/registration hook without a metaclass | yes | yes — my extensibility-seams candidate | covered |
| 63. Register Class Existence with `__init_subclass__` | Same mechanism, registry use case | yes | yes | covered |
| 64. Annotate Class Attributes with `__set_name__` | Descriptor learns its own field name | yes | partial — dataclass descriptor-field footgun | no additional — niche |
| 65. Consider Class Body Definition Order for Relationships | Ordering-dependent class-body metaprogramming | yes | no | no — low/niche |
| 66. Prefer Class Decorators over Metaclasses | Simpler composition | yes | partial | no — style/low |

### Chapter 9: Concurrency and Parallelism

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 67. Use `subprocess` to Manage Child Processes | Baseline subprocess guidance | yes | yes — my subprocess candidate | covered |
| 68. Use Threads for Blocking I/O; Avoid for Parallelism | GIL means threads don't parallelize CPU-bound work | **partly** — true for the default GIL build; free-threaded 3.13t/3.14t builds change this (PEP 703) | partial — my threading candidate notes races-despite-GIL, not the free-threading shift | partial — worth a caveat, low-medium (no shape targets free-threaded builds yet) |
| 69. Use `Lock` to Prevent Data Races | Mutex discipline | yes | yes — my threading candidate | covered |
| 70. Use `Queue` to Coordinate Work Between Threads | Producer/consumer pattern | yes | no | no — low, only if shape 3 grows worker queues |
| 71. Know How to Recognize When Concurrency Is Necessary | Judgment call, not a rule | yes | no | no — too judgment-based for a lint |
| 72. Avoid New `Thread` Instances for On-Demand Fan-Out | Use a pool instead | yes | partial — concurrent.futures candidate | covered |
| 73. Understand How `Queue`-Based Concurrency Requires Refactoring | Migration guidance | yes | no | no — niche |
| 74. Consider `ThreadPoolExecutor` When Threads Are Necessary | Pool over raw threads | yes | yes | covered |
| 75. Achieve Highly Concurrent I/O with Coroutines | asyncio for I/O-bound fan-out | yes | yes — my asyncio candidates | covered |
| 76. Know How to Port Threaded I/O to `asyncio` | Migration guidance | yes | no | no — situational |
| 77. Mix Threads and Coroutines to Ease the `asyncio` Transition | Migration guidance | yes | no | no — niche |
| 78. Maximize Event-Loop Responsiveness with Async-Friendly Worker Threads | `to_thread`/executor for blocking calls | yes | yes — my blocking-in-event-loop candidate | covered |
| 79. Consider `concurrent.futures` for True Parallelism | `ProcessPoolExecutor` for CPU-bound work | **partly** — Python 3.14 added `InterpreterPoolExecutor` (subinterpreters) as another true-parallelism route this item predates | partial — my concurrent.futures candidate doesn't mention it | partial — the core advice stands, note is informational, low |

### Chapter 10: Robustness

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 80. Take Advantage of Each Block in `try`/`except`/`else`/`finally` | Use all four blocks for their distinct purpose | yes | no | partial — general, low-medium |
| 81. `assert` Internal Assumptions, `raise` Missed Expectations | `assert` is for invariants, not for validating untrusted input — it's stripped under `-O` | yes | **no** | **partial — genuine gap, medium; shape 1/4 must not rely on `assert` for real validation** |
| 82. Consider `contextlib`/`with` for Reusable `try`/`finally` | Context managers over hand-rolled cleanup | yes | yes — my contextlib candidate | covered |
| 83. Always Make `try` Blocks as Short as Possible | Narrow the blast radius of what's caught | yes | no | no — style |
| 84. Beware of Exception Variables Disappearing | `except X as e:` deletes `e` when the block exits (Python 3-specific) | yes — genuine, undercited footgun | **no** | **yes — medium, all 4 shapes use `except...as`** |
| 85. Beware of Catching the `Exception` Class | Bare `except Exception` swallows bugs | yes | partial — my exception-hierarchy candidate | covered mostly |
| 86. Understand the Difference Between `Exception` and `BaseException` | `KeyboardInterrupt`/`SystemExit` are `BaseException`, not `Exception` | yes | partial | **partial — genuine, medium: shape 1 CLI harness / shape 3 daemon Ctrl-C handling** |
| 87. Use `traceback` for Enhanced Exception Reporting | Richer diagnostics | yes | no | no — low/niche |
| 88. Consider Explicitly Chaining Exceptions | `raise X from Y` to preserve cause | yes | partial | no additional — ruff B904 (bugbear) already lints this |
| 89. Always Pass Resources into Generators; Callers Clean Up Outside | Generator resource-ownership discipline | yes | partial — resource-cleanup candidate | no additional — low/niche |
| 90. Never Set `__debug__` to `False` | Don't rely on `-O` semantics for correctness-critical logic | yes | no | no additional — folded into item 81's new candidacy |
| 91. Avoid `exec`/`eval` Unless Building a Developer Tool | Injection/arbitrary-code-execution risk | yes | **no** | **yes — medium-high, security-adjacent; shape 3 (bot) processes external input** |

### Chapter 11: Performance

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 92. Profile Before Optimizing | Measure first | yes | no | no — philosophy, not lintable |
| 93. Optimize with `timeit` Microbenchmarks | Right tool for small, targeted measurement | yes | no | no |
| 94. Know When/How to Replace Python with Another Language | Judgment call | yes | no | no |
| 95. Consider `ctypes` for Native Libraries | FFI without an extension module | yes | no | no — no shape needs this today |
| 96. Consider Extension Modules for Max Performance | Compiled extensions | yes | no | no — ties to my C-ABI tripwire candidate, still low |
| 97. Rely on Precompiled Bytecode and Filesystem Caching | `.pyc` caching is mostly automatic | yes | no | no — largely automatic already |
| 98. Lazy-Load Modules with Dynamic Imports | Reduce startup time | yes | partial — import-time-side-effects candidate | partial — shape 4 hooks run per-invocation, startup latency matters, low-medium |
| 99. Consider `memoryview`/`bytearray` for Zero-Copy | Avoid `bytes` copies | yes | no | no — no shape is byte-manipulation-heavy today |

### Chapter 12: Data Structures and Algorithms

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 100. Sort by Complex Criteria Using `key` | Idiomatic sort customization | yes | no | no |
| 101. Know the Difference Between `sort` and `sorted` | In-place vs new-list | yes | no | no |
| 102. Consider Searching Sorted Sequences with `bisect` | O(log n) lookup | yes | no | no — niche/low |
| 103. Prefer `deque` for Producer–Consumer Queues | O(1) append/pop at both ends | yes | no | no — low unless shape 3 grows queueing |
| 104. Know How to Use `heapq` for Priority Queues | Priority-queue idiom | yes | no | no — niche |
| 105. Use `datetime` Instead of `time` for Local Clocks | Correct tool for wall-clock/timezone display | yes | partial — my timezone candidate covers this from the other direction; the *duration/timeout* half (monotonic vs wall clock) is a distinct concern surfaced by another scout | covered — the two nuances (display vs duration) are complementary, both now in the aggregate set |
| 106. Use `decimal` When Precision Is Paramount | Avoid float rounding error for money/exact quantities | yes | no | partial — low, only if shape 2 ever handles precise units |
| 107. Make `pickle` Serialization Maintainable with `copyreg` | Versioning pickle formats | yes | no | no — niche/low |

### Chapter 13: Testing and Debugging

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 108. Verify Related Behaviors in `TestCase` Subclasses | `unittest`-style test organization | yes, though the project's shapes are pytest-idiomatic, not `TestCase`-based | no | no — organizational principle transfers, not the API |
| 109. Prefer Integration Tests over Unit Tests | Test through the real interface | yes | yes — my candidate | covered, validates shape 1's architecture |
| 110. Isolate Tests with `setUp`/`tearDown`/`setUpModule`/`tearDownModule` | Test isolation discipline | yes (pytest fixtures are the idiomatic equivalent) | yes — via my pytest-fixture-scope candidate and another scout's test-isolation/xdist findings | covered |
| 111. Use Mocks to Test Code with Complex Dependencies | When and how to mock | yes | yes — my unittest.mock candidate | covered |
| 112. Encapsulate Dependencies to Facilitate Mocking and Testing | Design for testability (seams/DI) | yes | partial | partial — shape 1 CLI-wrapper testability, medium |
| 113. Use `assertAlmostEqual` to Control Float Precision | Never `==` on floats in tests | yes (pytest idiom: `pytest.approx()`) | **no** | **yes — medium, shape 1/2 numeric assertions; easy grep-for-`==`-on-floats verification** |
| 114. Consider Interactive Debugging with `pdb` | Workflow tool | yes | no | no — not a code rule |
| 115. Use `tracemalloc` to Understand Memory Usage and Leaks | Diagnostic tool | yes | no | no — niche, ties loosely to lru_cache-leak candidate |

### Chapter 14: Collaboration

| Item | What it says | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 116. Know Where to Find Community-Built Modules | PyPI discovery | yes | no | no — not a code rule |
| 117. Use Virtual Environments for Reproducible Dependencies | Isolation discipline | yes | partial — packaging candidate | no additional |
| 118. Write Docstrings for Every Function, Class, and Module | PEP 257 baseline | yes | yes — my Sybil-doctests candidate | covered |
| 119. Use Packages to Organize Modules, Provide Stable APIs | Package-layout discipline | yes | partial | covered mostly |
| 120. Consider Module-Scoped Code to Configure Deployment Environments | Environment-conditional module code | yes | no | no — situational/low |
| 121. Define a Root Exception to Insulate Callers from APIs | One root exception per library | yes | yes — direct match, my exception-hierarchy candidate | covered |
| 122. Know How to Break Circular Dependencies | Restructure or lazy-import | yes | yes — my import-time-side-effects candidate | covered |
| 123. Consider `warnings` to Refactor and Migrate Usage | Deprecation-path discipline | yes | yes — my deprecated-decorator candidate | covered |
| 124. Consider Static Analysis via `typing` to Obviate Bugs | Type checkers catch bugs before runtime | yes | yes — the whole typing-PEP cluster | covered |
| 125. Prefer Open Source Projects for Bundling over `zipimport`/`zipapp` | Don't roll your own app-bundler | **partly** — the tooling landscape has shifted since publication (e.g. `uv`'s rise); the underlying principle (don't reinvent bundling) still holds | no | no — not directly relevant to any of the 4 shapes' packaging needs |

## Fluent Python, 2nd ed — 24 chapters

| Chapter | Major sections (where fetched) | Still correct in 3.12–3.14? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 1. The Python Data Model | Pythonic Card Deck, Special Methods, Emulating Numeric Types, String Repr, Boolean Value, Collection API, Overview of Special Methods, Why `len` Isn't a Method | yes — PEP 649/annotationlib (3.14) changes annotation *evaluation timing*, not this chapter's core content | yes — my data-model candidate is built directly from this chapter's structure | covered |
| 2. An Array of Sequences | not swept (search returned confirmation, not the section list) | yes, presumed | no | partial — sequence-type-choice (list/array/deque/tuple-as-record) guidance, low-medium |
| 3. Dictionaries and Sets | Modern `dict` Syntax, Comprehensions, Unpacking, Merging with `\|`, Pattern Matching with Mappings, Standard API, Hashable, `__missing__` | yes — `\|` merge (3.9+) and pattern-matching (3.10+) are real version floors | partial — my dict/set-ordering + TypedDict candidates | covered mostly; version-floor note extends my typing-syntax-version-floor candidate to non-typing syntax too |
| 4. Unicode Text versus Bytes | Character Issues, Byte Essentials, Encoders/Decoders, Encode/Decode Problems, Text Files, Normalizing Unicode, Sorting Unicode Text | yes | yes — my text-encoding-defaults candidate | covered |
| 5. Data Class Builders | Overview, Classic/Typed Named Tuples, Type Hints 101, `@dataclass` details, Field Options, Post-init, Data Class as Code Smell/Scaffolding/IR, Pattern Matching Class Instances | **partly** — predates dataclass `slots=True`/`kw_only` (3.10) and the 3.13 per-field `__eq__` semantics change | yes — my dataclass candidate | covered, version gap noted |
| 6. Object References, Mutability, and Recycling | Variables Are Labels not Boxes, Identity/Equality/Aliases, Copies, Parameters as References, `del`/gc, Weak References | yes | partial — resource-cleanup/`__del__` candidate touches gc/weakref | covered mostly |
| 7. Functions as First-Class Objects | Treating a Function Like an Object, Higher-Order Functions, Anonymous Functions, Nine Flavors of Callable Objects, Positional-Only Params, `operator` module, `functools.partial` | yes | no | no — style/idiom, low |
| 8. Type Hints in Functions | Gradual Typing, Types Usable in Annotations, `Any`, Generic Collections, Abstract Base Classes, Parameterized Generics/`TypeVar`, Static Protocols, `Callable`, `NoReturn`, Imperfect Typing and Strong Testing | **partly** — predates PEP 695 (3.12) generic syntax; its `TypeVar`-based examples are now the legacy form | yes — directly the gap my typing-syntax-version-floor candidate names | covered |
| 9. Decorators and Closures | Decorators 101, Registration Decorators, Scope Rules, Closures, `nonlocal`, Memoization with `functools.cache`/`lru_cache`, Single Dispatch, Parameterized Decorators | yes | partial — my functools candidate | covered mostly; doesn't cover typing decorators with `ParamSpec` (my separate candidate fills that) |
| 10. Design Patterns with First-Class Functions | not swept | yes, timeless (GoF patterns via functions) | no | no — philosophy, not lintable |
| 11. A Pythonic Object | not swept (thematically: object representations, alt constructors, `__slots__`, hashable, format) | yes | yes — my data-model candidate | covered |
| 12. Special Methods for Sequences | not swept (thematically: `Vector` example, `__getitem__`/slicing, `__iter__`, arithmetic ops, `__bool__`) | yes | yes — my data-model candidate | covered |
| 13. Interfaces, Protocols, and ABCs | Four typing approaches: duck / goose / static / static-duck typing | yes — still the standard mental model | yes — my structural-typing candidate | covered |
| 14. Inheritance: For Better or For Worse | not swept (thematically: `super()`, MRO, multiple inheritance, mixins, "favor composition") | yes | no | **partial — genuine gap alongside Effective Python item 53, medium, shape 2/3** |
| 15. More About Type Hints | not swept (thematically: `@overload`, `TypedDict`, runtime `Protocol`, variance) | **partly (incomplete)** — predates PEP 695/696/698/702/727/728/742, all landed 2023–2025, after this 2022 book | yes — my typing-PEP-cluster candidates are exactly what this chapter would now need to add | covered, flagged explicitly |
| 16. Operator Overloading | not swept (thematically: unary/binary ops, augmented assignment, `NotImplemented`, mixed-type ops, rich comparison) | yes | yes — my data-model candidate | covered |
| 17. Iterators, Generators, and Classic Coroutines | Sentence Take #2–#5 (classic iterator → lazy generator → lazy generator expression), How a Generator Works, Classic Coroutines | yes — the chapter itself frames "classic coroutines" as historical, so this isn't drift | partial — my iterator-exhaustion candidate | covered mostly; generator-as-coroutine pattern is low relevance (no shape uses it over asyncio) |
| 18. `with`, `match`, and `else` Blocks | not swept (thematically: context managers, `match` 3.10+, loop/`try`-`else`) | yes | yes — my contextlib candidate + Effective Python item 9 | covered |
| 19. Concurrency Models in Python | A Bit of Jargon, Processes/Threads/the GIL, A Concurrent Hello World, Spinner with Threads/Processes/Coroutines | **partly** — this is the chapter most exposed to free-threading (PEP 703); its GIL-as-fixed-constraint framing is now build-conditional | partial — my threading candidate notes races-despite-GIL, not the free-threading shift | **yes — an explicit "free-threading changes the GIL-parallelism story" caveat, medium, forward-looking** |
| 20. Concurrent Executors | not swept (thematically: `ThreadPoolExecutor`/`ProcessPoolExecutor` via `concurrent.futures`, `executor.map`, `as_completed`) | **partly** — predates 3.14's `InterpreterPoolExecutor` (same gap as Effective Python item 79) | yes — my concurrent.futures candidate | covered, version gap noted |
| 21. Asynchronous Programming | not swept (thematically: async/await, asyncio fundamentals) | **no — predates `asyncio.TaskGroup` and `asyncio.timeout()`, both Python 3.11 (Oct 2022), after this book's April 2022 publication.** Its structured-concurrency guidance necessarily relies on the older `gather()`/`wait_for()` idioms these two features now supersede | yes — my asyncio-cancellation-timeout and asyncio-fire-and-forget candidates cover the replacement | covered, this is the sweep's clearest "now outdated" finding |
| 22. Dynamic Attributes and Properties | not swept (thematically: `__getattr__`, `property`, JSON-derived dynamic objects) | yes | partial — Effective Python item 61's gap | covered by that new candidate |
| 23. Attribute Descriptors | not swept (thematically: descriptor protocol deep dive) | yes | partial — Effective Python item 60's gap | covered by that new candidate |
| 24. Class Metaprogramming | not swept (thematically: metaclasses, `__init_subclass__`, class decorators, PEP 487) | yes | yes — my extensibility-seams candidate | covered |

## Typing specification — 26 chapters

| Chapter | What it covers | Still correct? | Already reflected? | Worth adopting? |
|---|---|---|---|---|
| 1. The Python Type System | Purpose, non-goals, interpretation of the whole spec | yes | n/a | n/a — framing chapter |
| 2. Meta-topics | About/changing the spec itself | yes | n/a | n/a |
| 3. Type system concepts | Static/dynamic/gradual typing, subtyping, materialization, consistency | yes | partial | no — theory, not directly lintable |
| 4. Type annotations | Meaning of annotations, string annotations, generator/coroutine and method annotation | yes — reflects current (3.14) lazy-evaluation semantics | partial | partial — annotation-evaluation timing bites shape 2's 100%-coverage/pyright-strict code, medium |
| 5. Type forms | `TypeForm`, valid type expressions, assignability | yes, but bleeding-edge | no | no — low current relevance, too advanced for these 4 shapes today |
| 6. Special types in annotations | `Any`, `None`, `Never`/`NoReturn`, `type[]` | yes | no | **partial — `Never` vs `NoReturn` is a commonly confused pair, low-medium** |
| 7. Generics | `TypeVar`, variance, inference | yes | yes — my PEP 695/696 candidates | covered |
| 8. Type qualifiers | `@final`, `Final`, `Annotated` | yes | **no** | **partial — `Final` for immutability/API-stability contracts, medium, shape 2** |
| 9. Class type assignability | `ClassVar`, `@override` | yes | yes — `@override` candidate; `ClassVar` via PEP 526 | covered |
| 10. Type aliases | `TypeAlias`, `type` statement, `NewType` | yes | partial — PEP 695 `type`-statement candidate covers half | **partial — `NewType` for distinct-but-structurally-identical types is a cheap, undercited win, low-medium** |
| 11. Literals | `Literal`, `LiteralString` | yes | **no** | **partial — `LiteralString` (PEP 675) is an injection-safety typing tool, medium-high for shape 1/3 subprocess/bot command construction** |
| 12. Protocols | Explicit/implicit, runtime-checkable, callback protocols (12 subsections) | yes | yes — my structural-typing candidate | covered |
| 13. Callables | Callable typing forms (9 subsections) | yes | partial — my ParamSpec candidate | covered mostly |
| 14. Constructors | `__init__`/`__new__` typing, metaclass typing (8 subsections) | yes | no | no — niche for this project |
| 15. Overloads | `@overload` rules (5 subsections) | yes | yes | covered |
| 16. Exceptions | Exception typing + context managers | yes — includes `except*`/`ExceptionGroup` typing (PEP 654, 3.11), which directly matters since `asyncio.TaskGroup` raises `ExceptionGroup` | yes — via exception-hierarchy and asyncio-TaskGroup candidates | covered, worth an explicit cross-reference |
| 17. Dataclasses | `dataclass_transform` for third-party dataclass-like decorators | yes | no | partial — low, only if shape 2 ships its own dataclass-like decorator |
| 18. Typed dictionaries | `TypedDict` full spec (6 subsections) | yes | yes — my TypedDict candidate | covered |
| 19. Tuples | Fixed/variadic tuple typing (3 subsections) | yes | partial — PEP 646 candidate | covered |
| 20. Named Tuples | `NamedTuple` typing (3 subsections) | yes | no | partial — low, dataclass candidate largely substitutes |
| 21. Enumerations | `Enum` typing (6 subsections) | yes | yes | covered |
| 22. Type narrowing | `TypeGuard`, `TypeIs` | yes | yes — PEP 742 candidate | covered |
| 23. Type checker directives | `# type: ignore`, `reveal_type`, `assert_type`, `no_type_check` (8 subsections) | yes | yes — "dead suppressions" surfaced by another scout | covered via aggregate, this chapter is the citation source |
| 24. Distributing type information | `py.typed` marker, stub-only packages (4 subsections) | yes | **no** | **yes — HIGH, direct hit on shape 2: without `py.typed`, downstream type checkers treat the whole SDK as untyped** |
| 25. Historical and deprecated features | Legacy forms (`typing.List`/`Union[X,Y]` etc.) vs current | yes — accurately documents its own history | partial | yes — citation source for "prefer PEP 585/604 forms," low-medium, mostly already implied |
| 26. Glossary | Reference terms | yes | n/a | n/a |

## Items that are now wrong

Six findings where a primary/canonical source states something that
current (3.12–3.14) behavior has changed, made conditional, or superseded.
None of these are "the item is bad advice" — all are "the item predates a
Python change that qualifies or supersedes it," which is exactly the kind
of thing an agent quoting from training data would get wrong.

1. **Fluent Python ch. 21, Asynchronous Programming** — the chapter
   necessarily predates `asyncio.TaskGroup` and `asyncio.timeout()` (both
   Python 3.11, Oct 2022; book published April 2022). Its structured-
   concurrency guidance relies on the older `gather()`/`wait_for()`
   idioms these two now supersede. Superseded by
   [asyncio-task.html](https://docs.python.org/3/library/asyncio-task.html).
2. **Effective Python item 68 / Fluent Python ch. 19** — "threads don't
   parallelize CPU-bound work" is true only for the standard GIL build;
   [PEP 703](https://peps.python.org/pep-0703/) (Final, accepted Oct 2023,
   targeting 3.13) makes free-threading (`--disable-gil`) an official,
   gradually-rolled-out build configuration, so the claim is now
   conditional on which build runs the code, not a language constant.
3. **Effective Python item 79 / Fluent Python ch. 20** — "use
   `concurrent.futures.ProcessPoolExecutor` for true parallelism"
   predates `InterpreterPoolExecutor`, confirmed added in Python 3.14 on
   [concurrent.futures.html](https://docs.python.org/3/library/concurrent.futures.html) —
   each worker gets its own interpreter and its own GIL, giving true
   multi-core parallelism with less overhead than separate processes. The
   core advice stands; it's now incomplete, not wrong.
4. **Fluent Python ch. 5, Data Class Builders** — predates `@dataclass`'s
   `slots=True`/`kw_only` (3.10) and the Python 3.13 change to `__eq__`
   generation (per-field comparison instead of tuple comparison, which
   changes NaN-field equality results). Cited in
   [dataclasses.html](https://docs.python.org/3/library/dataclasses.html).
5. **Fluent Python ch. 8, Type Hints in Functions** — predates PEP 695
   (3.12), so its generic-class examples use the pre-695 `TypeVar` form
   as the only way to write a generic, which is now the legacy spelling.
6. **Effective Python item 125** — "prefer open source bundling projects
   over zipapp/zipimport" is still sound in principle, but the tooling
   landscape it implicitly assumes (2021-era) has shifted (e.g. `uv`
   didn't exist yet); the specific project recommendations, if any inside
   the item body, would need re-checking — not independently verified
   here since only the title was swept.

## Whole sections nobody's candidates touch

- **Typing spec ch. 24, Distributing type information (`py.typed`)** — zero
  coverage across all five scouts until this sweep. **Answer: a rule.**
  Promoted below — this is a direct, mechanically-checkable requirement
  for shape 2 (`ocx-sdk-python` ships as a typed library; no `py.typed`
  marker means every downstream `pyright`/`mypy` run treats it as `Any`).
- **Typing spec ch. 11, Literals (`LiteralString`)** — zero coverage.
  **Answer: a rule.** `LiteralString` is specifically an injection-safety
  typing tool (distinguishes literally-authored strings from
  runtime-assembled ones) and nothing in the aggregate candidate set names
  it, despite subprocess/shell-command construction being core to shape 1.
- **Typing spec ch. 5, Type forms (`TypeForm`)** and **ch. 14, Constructors**
  — zero coverage. **Answer: documented decision to leave uncovered.**
  Both are genuinely advanced/bleeding-edge typing-system internals with
  no plausible near-term use in any of the 4 shapes; revisit only if the
  SDK starts building its own typing-aware metaprogramming.
- **Effective Python ch. 11, Performance (items 92–99: `ctypes`, extension
  modules, `memoryview`/`bytearray`)** — essentially zero coverage except
  my own low-priority C-ABI tripwire candidate. **Answer: documented
  decision to leave uncovered.** None of the 4 shapes do numeric or
  compiled-extension work today; the tripwire candidate already covers
  "notice when this changes."
- **Effective Python ch. 12, bisect/heapq/deque items (102–104)** — zero
  coverage. **Answer: documented decision to leave uncovered.** Low
  incidence, standard-library-idiom level, not correctness-critical.
- **Fluent Python ch. 10, Design Patterns with First-Class Functions** —
  zero coverage. **Answer: documented decision to leave uncovered.**
  Design-pattern philosophy, not independently lintable or verifiable.

## New candidates from the sweep

| Topic | Why it matters | Source | Already-covered? | Priority |
|---|---|---|---|---|
| `py.typed` marker required for typed distribution | Without this marker file, every downstream type checker treats the whole package as untyped (`Any`) regardless of how well-annotated the code is — silently defeats the entire point of shipping a typed SDK | [typing spec ch. 24, Distributing type information](https://typing.python.org/en/latest/spec/distributing.html) | no | high — direct, mechanical hit on shape 2 (`ocx-sdk-python`), the one shape whose entire value proposition is being typed |
| Mutable function-argument defaults and aliasing | `def f(x=[])` shares one list across every call with no explicit default; separately, callers' mutable objects can be silently mutated by a callee that doesn't copy them — both undercited, and ruff's B006 check is opt-in (bugbear), not a default | [Effective Python items 30, 36](https://effectivepython.com/) | no | high — classic footgun, hits all 4 shapes, cheap to verify (`ruff --select B006` or a grep for mutable-typed default params) |
| `LiteralString` for injection-safety typing | Distinguishes literally-authored strings from runtime-assembled/untrusted ones at the type level — a static tripwire for shell/SQL-injection-shaped bugs before they reach `subprocess`/`exec` | [typing spec ch. 11, Literals](https://typing.python.org/en/latest/spec/literal.html) | no | medium-high — shape 1 (subprocess arg construction) and shape 3 (bot command handling) both build command strings from mixed-trust input |
| `assert` is stripped under `-O`; never use it for real validation | Assertions vanish under Python's optimization flag — using `assert` to validate untrusted input or enforce a real invariant produces code that silently stops checking anything | [Effective Python items 81, 90](https://effectivepython.com/) | no | medium — shape 1's test harness and shape 4's validation scripts must not lean on `assert` as their only guard |
| `exec`/`eval` as an injection/arbitrary-code-execution vector | Direct code-execution risk when the input isn't fully trusted; the item's own framing ("unless you're building a developer tool") is the right bar | [Effective Python item 91](https://effectivepython.com/) | no | medium-high — security-adjacent; shape 3 (bot) is the one shape that plausibly touches external/webhook input |
| Exception variable scope deletion (`except X as e:`) | Python 3 auto-deletes the bound name `e` when the `except` block exits — referencing it afterward (including from a nested closure) raises `UnboundLocalError`/`NameError`, a genuinely surprising, undercited footgun | [Effective Python item 84](https://effectivepython.com/) | no | medium — all 4 shapes handle exceptions with `as e` |
| `Exception` vs `BaseException`, and what bare `except:` actually swallows | `KeyboardInterrupt`/`SystemExit` derive from `BaseException`, not `Exception`; getting this backwards either fails to catch them where you should, or (worse) accidentally swallows Ctrl-C in a bare `except:` | [Effective Python item 86](https://effectivepython.com/) | no | medium — shape 1's CLI harness and shape 3's long-running bot both need clean interrupt handling |
| `super()`/MRO correctness in multiple inheritance and mixins | Cooperative `super()` calls and Python's C3 linearization MRO are easy to get subtly wrong once more than one base class is involved | [Effective Python item 53](https://effectivepython.com/) · [Fluent Python ch. 14](https://github.com/fluentpython/example-code-2e) | no | medium — shape 2/3 class hierarchies, especially any mixin-based extension points |
| `pytest.approx()` (never bare `==`) for float assertions | Bare floating-point equality in a test is a flaky-test generator waiting to happen; the stdlib/unittest equivalent (`assertAlmostEqual`) doesn't even apply to this project's pytest-based test shapes | [Effective Python item 113](https://effectivepython.com/) | no | medium — shape 1 (265k+ LOC of assertions) and shape 2's numeric SDK surfaces |
| Free-threading (PEP 703) changes the GIL-parallelism calculus | "Threads don't give CPU parallelism" is now conditional on the build (default GIL vs free-threaded 3.13t/3.14t), not a language constant — any performance-guidance rule that states the old framing as absolute is already slightly wrong | [PEP 703](https://peps.python.org/pep-0703/) · [Effective Python items 68, 79](https://effectivepython.com/) · [Fluent Python ch. 19–20](https://github.com/fluentpython/example-code-2e) | no | medium — forward-looking caveat; no shape targets free-threaded builds today, but a rule stated as an absolute today ages badly |
| `__getattr__`/`__getattribute__` recursion and lazy-attribute footguns | Calling `self.x` inside `__getattribute__` (or unguarded inside `__getattr__`) re-triggers the same method — an infinite-recursion trap that's easy to introduce when building dynamic/lazy-loading attribute access | [Effective Python item 61](https://effectivepython.com/) · [Data Model, Attribute Access & Descriptors](https://docs.python.org/3/reference/datamodel.html) | partial — noted inside the data-model candidate's footgun list, not promoted | medium — shape 2 if the SDK does lazy/dynamic attribute loading |
| Descriptor protocol for reusable validated `@property` logic | A hand-written descriptor centralizes get/set/validate logic that would otherwise be copy-pasted across many `@property` definitions; also the mechanism behind `dataclasses`' descriptor-typed-field interaction already noted in the first artifact | [Effective Python item 60](https://effectivepython.com/) | no | low-medium — shape 2, only if the SDK has many similarly-validated fields |
| `Final`/`ClassVar` for immutability and API-stability contracts | `Final` statically prevents reassignment or subclass override of a name — a cheap, undercited correctness tool for constants and API-stability guarantees in a shipped library | [typing spec ch. 8, Type qualifiers](https://typing.python.org/en/latest/spec/qualifiers.html) | no | medium — shape 2's public constants and non-overridable methods |
| `NewType` for distinct-but-structurally-identical primitive types | Wrapping `UserId = NewType("UserId", int)` catches "passed a raw `int` where a `UserId` was expected" at type-check time for zero runtime cost — cheap correctness win nothing in the candidate set names | [typing spec ch. 10, Type aliases](https://typing.python.org/en/latest/spec/aliases.html) | no | low-medium — shape 2, wherever the SDK has multiple same-typed IDs/handles that shouldn't be interchangeable |
