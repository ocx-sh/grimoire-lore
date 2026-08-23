---
title: Supersession ledger — every discrete claim in the family's existing Python rules
agent: existing-rules-ledger-auditor
model: sonnet
scope: >
  ocx/.claude/rules/quality-python.md (md5 46b9f0ac8545b5551fa60f48d2ef2753 — identical copy
  in grimoire, ocx-sdk-python, ocx-mirror-sdk), ocx-sdk-python/.claude/rules/quality-tests.md
  (diff-identical in ocx-mirror-sdk), ocx-mirror-sdk/.claude/rules/{quality-errors,quality-enums}.md,
  and the Python-governing lines in the always-on globals (ocx/.claude/rules/product-tech-strategy.md).
  index's extended quality-python.md (the CI-Bots section) is intentionally out of scope — it is
  not one of the four named source files.
method: >
  Claims extracted by direct read of each source file (line numbers cited per row). Version
  currency checked against recalled stdlib/typing facts plus two targeted WebSearch queries
  for the two time-sensitive claims (PEP 789 status, ty/pyright standing in 2026 — both dated
  2026-08-22). Lint enforcement checked by reading each repo's `[tool.ruff.lint] select = [...]`
  in `ocx-sdk-python/pyproject.toml` and `ocx-mirror-sdk/pyproject.toml` directly. "Can it go
  red" claims were tested by writing deliberately-violating snippets to
  `/tmp/claude-.../scratchpad/ledger/*.py` and running `ruff check --select <exact repo select
  list> --no-cache --isolated <file>` (and, for disabled groups, `--select ALL` to prove the
  rule exists but is off) — all snippets deleted after the run, confirmed via `rm -f` + `rmdir`
  before this file was written. `pyright` was exercised via `uv run --with pyright pyright
  --version` (1.1.411) to confirm availability but was not needed for any row below (no claim
  in these four files names a pyright diagnostic code). Harness-floor facts (`requires-python`)
  read directly from `ocx/test/pyproject.toml:4`, `grimoire/test/pyproject.toml:4`. Findings from
  `/home/mherwig/dev/grimoire-lore/.agents/research/python-audit/harness-shape.md` are cited,
  not re-measured.
---

# Supersession ledger

94 discrete normative claims across 4 files. **12 rows verified "goes-red" against a real ruff
select list (7 distinct rule mechanisms: E722, B006, F403, B904, ANN, F632, UP006/UP035/UP045)
— those become one line of config, prose dropped. 6 more name a real ruff rule that exists and
would fire (S101, S307, A001, PGH003, PT011×2), except the rule group isn't in either SDK
repo's `select = [...]`, so today those are "cannot-go-red" despite reading like a checked
rule.** The remaining 73 rows have no automated verification at all and survive only as
reviewable heuristics — which is fine per `rule-distillation.md`'s "named reading heuristic"
clause, but means the file's own internal framing (Ruff-rule-name suffixed onto Block-tier
bullets) overstates how much of it is actually checked.

Contents: [Ledger: quality-python.md](#ledger-quality-pythonmd-32-claims) ·
[Ledger: quality-tests.md](#ledger-quality-testsmd-37-claims) ·
[Ledger: quality-errors.md](#ledger-quality-errorsmd-12-claims) ·
[Ledger: quality-enums.md](#ledger-quality-enumsmd-10-claims) ·
[Ledger: always-on globals](#ledger-always-on-globals-3-claims) ·
[Contradictions](#contradictions) · [Not covered](#what-the-existing-set-does-not-cover) ·
[Adoption risk](#adoption-risk)

Column key: **Still true?** = holds on Python 3.10–3.14 without qualification. **Enforced?** =
the exact ruff/pyright/pytest mechanism that already denies this, or "nothing". **Goes red?** =
goes-red (ran a violation, it fired) / cannot-go-red (rule named or exists but not wired) /
no-verification (nothing automated names this claim at all).

---

## Ledger: quality-python.md (32 claims)

Source: `ocx/.claude/rules/quality-python.md` (md5 `46b9f0ac8545b5551fa60f48d2ef2753`; byte-identical
in `grimoire`, `ocx-mirror-sdk`; diff-identical in `ocx-sdk-python`).

| # | Source | Claim (verbatim) | Still true? | Enforced by tool? | Goes red? | Portable/repo-specific | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | `:22` | "Bare `except:` or `except Exception:`… Always name exception(s). Ruff rule: `E722`." | yes | ruff `E722` (select group `E`, enabled both SDK repos) | **goes-red** — tested `except:` in a scratch file under the exact `ocx-sdk-python` select list; ruff flagged `E722` | portable | demote-to-lint-config |
| 2 | `:23` | "`assert` for input validation in production — asserts stripped with `python -O`. Use explicit `if`/`raise`." | yes | ruff `S101` (flake8-bandit, group `S` — **not selected** in either SDK repo) | cannot-go-red as configured (rule exists, group off) | portable | keep-verbatim; note "enable ruff `S` group" as the config fix |
| 3 | `:24` | "Mutable default arguments — `def f(x=[])`… Ruff rule: `B006`." | yes | ruff `B006` (group `B`, enabled) | **goes-red** — tested `def f(x=[])`, ruff flagged `B006` | portable | demote-to-lint-config |
| 4 | `:25` | "Wildcard imports (`from module import *`)… Ruff rule: `F403`." | yes | ruff `F403` (group `F`, enabled) | **goes-red** — tested `from os import *`, ruff flagged `F403` | portable | demote-to-lint-config |
| 5 | `:26` | "`dict[str, Any]` or untyped `TypedDict` at public API boundaries — … Use `dataclass`, fully-typed `TypedDict`, or `NamedTuple`." | yes | nothing (no static rule can distinguish "public API boundary" from internal use) | no-verification | portable | keep-verbatim (named reading heuristic) |
| 6 | `:27` | "Exception chaining dropped — … Always `raise NewError(...) from e` … Ruff rule: `B904`." | yes | ruff `B904` (group `B`, enabled) | **goes-red** — tested `raise ValueError(...)` inside `except Exception:` with no `from`, ruff flagged `B904` | portable | demote-to-lint-config |
| 7 | `:28` | "Catching then re-raising without context — `except Foo: raise Bar()` same as above; chain explicit." | yes | ruff `B904` (same rule as #6) | goes-red (same test as #6) | portable | drop — duplicate of #6, same rule, same fix |
| 8 | `:29` | "`asyncio.gather(*tasks)` for new async code — use `asyncio.TaskGroup` (3.11+) … `gather()` legacy." | true with caveat | nothing (no ruff rule prefers `TaskGroup` over `gather`) | no-verification | portable, **but requires Python 3.11+** | keep-reworded — soften "legacy": `gather(return_exceptions=True)` still has no exact `TaskGroup` equivalent, so state the TaskGroup preference as default-not-absolute |
| 9 | `:30` | "`yield` inside `asyncio.TaskGroup` or `asyncio.timeout` context managers — PEP 789: suspend inside these contexts transfer cancellation to wrong task." | **unverifiable as cited** | nothing | no-verification | portable | keep-reworded — PEP 789 is still **Draft** as of 2026-08-22 (WebSearch, peps.python.org), not accepted into the language; the underlying cancellation-transfer behavior is real, documented `asyncio` semantics independent of the PEP — cite the behavior, drop the PEP-789-as-authority framing |
| 10 | `:31` | "Missing type annotations on public functions — … Ruff rule: `ANN` group (enable selectively)." | yes | ruff `ANN001`/`ANN201`/etc. (group `ANN`, enabled both SDK repos) | **goes-red** — tested unannotated `def h(x): return x`, ruff flagged `ANN001` + `ANN201` | portable | demote-to-lint-config |
| 11 | `:32` | "`eval()` / `exec()` on user input — injection risk." | yes | ruff `S307` (group `S` — **not selected** in either SDK repo) | cannot-go-red as configured — tested `eval(expr)` under `--select ALL`, `S307` fired; under the repo's real select list, nothing fired | portable | keep-verbatim; note "enable ruff `S` group" |
| 12 | `:33` | "Shadowing built-ins (`list`, `dict`, `id`, `type`, `input`, `map`, `filter`) — cause subtle bugs, confuse readers." | yes | ruff `A001` (group `A`, flake8-builtins — **not selected** in either SDK repo) | cannot-go-red as configured — tested `def list(x): ...`, `A001` fired only under `--select ALL` | portable | keep-verbatim; note "enable ruff `A` group" |
| 13 | `:34` | "Comparing with `is` for value equality (except `None`, `True`, `False`) — `is` check identity, not equality." | yes | ruff `F632` (group `F`, enabled) | **goes-red** — tested `if x is 5:`, ruff flagged `F632` | portable | demote-to-lint-config |
| 14 | `:38` | "`type: ignore` without error code specifier — use `type: ignore[specific-error]`." | yes | ruff `PGH003` (group `PGH` — **not selected** in either SDK repo) | cannot-go-red as configured — tested bare `# type: ignore`, `PGH003` fired only under `--select ALL` | portable | keep-verbatim; note "enable ruff `PGH` group" |
| 15 | `:39` | "`@runtime_checkable` Protocol used for `isinstance` in hot paths — … `__dict__` introspection per call; O(n) in method count." | yes | nothing (perf judgment, not statically checkable) | no-verification | portable | keep-verbatim |
| 16 | `:40` | "`ABC` where `Protocol` work — prefer `Protocol` for interfaces at module boundaries + DI … Use `ABC` only when sharing implementation." | yes | nothing | no-verification | portable | keep-verbatim |
| 17 | `:41` | "`dataclass` without `slots=True` (Python 3.10+) — `__dict__` overhead. Add `@dataclass(slots=True)` unless …" | yes | nothing — tested `@dataclass` with no `slots=True` under `--select ALL`; **no ruff rule fired at all**, confirmed no lint anywhere covers this | portable | no-verification | keep-verbatim |
| 18 | `:42` | "`Self` type not used for builder/fluent methods — … Use `from typing import Self` (3.11+)." | yes | nothing | no-verification | portable, **requires 3.11+** | keep-verbatim |
| 19 | `:43` | "`match` not used for exhaustive enum dispatch — `if/elif` chains over `Enum` members should be `match` statements …" | yes | nothing | no-verification | portable, **requires 3.10+** | keep-verbatim |
| 20 | `:44` | "`contextvars.ContextVar` not used for request-scoped state in async code — … `ContextVar` propagate auto through `asyncio.Task` copies." | yes | nothing | no-verification | portable | keep-verbatim |
| 21 | `:45` | "Legacy generic syntax: `List[int]` instead of `list[int]` (3.9+); `Optional[X]` instead of `X \| None` (3.10+)." | yes | ruff `UP006`/`UP035` (List) and `UP045` (Optional) (group `UP`, enabled) | **goes-red** — tested `List[int]`/`Optional[str]`, all three fired | portable | demote-to-lint-config |
| 22 | `:46` | "`**kwargs` \"for future flexibility\" — explicit parameters safer + self-documenting." | yes | nothing | no-verification | portable | keep-verbatim |
| 23 | `:53` | "`Iterable[T]` / `Sequence[T]` over `list[T]` in function params when only iterating or indexing without mutation" | yes | nothing | no-verification | portable | keep-verbatim |
| 24 | `:54` | "`TypedDict` with `Required`/`NotRequired` (3.11+) instead of `total=False` — mark individual fields, not whole dict" | yes | nothing | no-verification | portable, **requires 3.11+** | keep-verbatim |
| 25 | `:56` | "`Final`, `Literal`, `Never` where capture intent" | yes | nothing (ruff has no "should-use-Final" rule) | no-verification | portable | keep-verbatim |
| 26 | `:65` | "Cancel safety: never swallow `asyncio.CancelledError` — always re-raise after cleanup" | yes | nothing (no ruff ASYNC rule for this even in the `ASYNC` group, which is also not selected) | no-verification | portable | keep-verbatim |
| 27 | `:67` | "`async with asyncio.timeout(…)` (3.11+) over `asyncio.wait_for`" | yes | nothing | no-verification | portable, **requires 3.11+** | keep-verbatim |
| 28 | `:76` | "**uv** — Package manager, venv, script runner — Replaces pip, virtualenv, poetry, pipx, pyenv" | yes | n/a (pinned tooling decision, confirmed actually adopted: `ocx-sdk-python`/`ocx-mirror-sdk` both use uv-managed `pyproject.toml`) | no-verification (a decision, not a lint target) | repo-specific decision, portable as a default | keep-verbatim |
| 29 | `:77` | "**ruff** — Linter + formatter — Replaces flake8, black, isort, pylint" | yes | n/a | no-verification | repo-specific decision, portable as a default | keep-verbatim |
| 30 | `:78` | "**pyright** — Type checker (production default) — Replaces mypy" | yes, confirmed by measurement — both SDK repos actually declare `pyright>=1.1` in `dev` extras and neither declares `mypy` | n/a | no-verification | repo-specific decision, portable as a default | keep-verbatim |
| 31 | `:79` | "**ty** — Type checker (Astral, Beta 2026) — 10-60x faster, lacks plugin system" | **yes, confirmed current** — WebSearch (astral.sh/blog/ty, 2026-08-22): ty is in Beta as of 2026, "10x to 60x faster than mypy and Pyright" is the vendor's own current claim | n/a | no-verification | portable fact, dated | keep-verbatim; add one line noting Meta's competing **Pyrefly** checker also entered this space in 2026 and is recommended over `ty` for new projects by some third-party comparisons (sinon.github.io) — the table is accurate but incomplete |
| 32 | `:82` | "2026 recommendation: `uv` + `ruff` + `pyright` = default stack." | yes, confirmed by measurement (both SDK repos' actual `pyproject.toml` match this exactly) | n/a | no-verification | repo-specific decision, portable as a default | keep-verbatim |

---

## Ledger: quality-tests.md (37 claims)

Source: `ocx-sdk-python/.claude/rules/quality-tests.md` (diff-identical in `ocx-mirror-sdk`,
only the module-path example differs at line 52).

| # | Source | Claim (verbatim) | Still true? | Enforced by tool? | Goes red? | Portable/repo-specific | Verdict |
|---|---|---|---|---|---|---|---|
| 33 | `:20-28` | FIRST table: "Fast … Independent … Repeatable … Self-validating … Timely" | yes | nothing (a naming/mnemonic, not individually checkable) | no-verification | portable | keep-reworded — compress the 5-row table to the one summary line, drop to depth file |
| 34 | `:30-38` | Right-BICEP table: "Boundary … Inverse … Cross-check … Error conditions … Performance characteristics" | yes | nothing | no-verification | portable | keep-reworded — same compression |
| 35 | `:40-42` | CORRECT boundary categories mnemonic | yes | nothing | no-verification | portable | keep-reworded — same compression |
| 36 | `:44-46` | "Mutation testing (`mutmut`, `cosmic-ray`) is the canonical answer to \"are my assertions strong\" — run on critical modules in a follow-up loop, not every CI push." | yes, both tools still maintained | nothing configured in either repo (`grep -n mutmut\|cosmic-ray` on both `pyproject.toml` → 0 hits) | no-verification | portable | keep-verbatim — but note it is aspirational in both repos: named, never wired (matches `architecture.md:239-240`'s own admission "documented here, wired in a follow-up PR") |
| 37 | `:66` | AAA structure: "Arrange → Act → Assert, separated by a single blank line" | yes | nothing | no-verification | portable | keep-verbatim |
| 38 | `:79-80` | "Negative paths use `pytest.raises(Exc, match=\"…\")`. **Never** bare `pytest.raises(Exc)`." | yes | ruff `PT011` (group `PT` — **not selected** in either SDK repo) | cannot-go-red as configured — tested bare `pytest.raises(ValueError)`, `PT011` fired only when `--select PT` was added manually | portable | keep-verbatim; note "enable ruff `PT` group" — this is the single highest-value config change available for this file |
| 39 | `:91-93` | "Three or more cases sharing shape → `@pytest.mark.parametrize` with `pytest.param(..., id=\"…\")`. Explicit ids are **mandatory**." | yes | nothing — tested `@pytest.mark.parametrize("x", [1,2,3])` with no `id=`, under `--select PT` (full pytest-style group): **no rule fired at all** | no-verification (checked: `ruff` has no rule that mandates explicit `id=` in parametrize) | portable | keep-verbatim (named reading heuristic only) |
| 40 | `:108` | "One-off edge cases → separate `test_*` function, not parametrize bloat." | yes | nothing | no-verification | portable | keep-verbatim |
| 41 | `:109-110` | "Property-based invariants (`hypothesis`) when you can write a property … pin regressions with `@example(...)`." | yes | nothing (neither SDK repo declares `hypothesis` as a dev dep — checked `dev = [...]` lists above, absent from both) | no-verification | portable | keep-verbatim; flag adoption gap: recommended but not a declared dependency in either repo that ships this file |
| 42 | `:116` | "Default `scope=\"function\"`. Widen only with measured cost." | yes | nothing | no-verification | portable | keep-verbatim |
| 43 | `:117-118` | "`tmp_path` for files (not legacy `tmpdir`)." | yes | nothing (no ruff rule flags `tmpdir` fixture use) | no-verification | portable | keep-verbatim |
| 44 | `:119-122` | "`monkeypatch` to **set**, `unittest.mock.patch` to **assert**" | yes | nothing | no-verification | portable | keep-verbatim |
| 45 | `:123-124` | "`conftest.py` only when ≥ 2 files share a fixture." | yes | nothing | no-verification | portable | keep-verbatim |
| 46 | `:125-126` | "`autouse=True` only when *every* reachable test needs it … Otherwise an opaque footgun." | yes | nothing | no-verification | portable | keep-verbatim |
| 47 | `:127-130` | "Factories vs `params=`: Factory function → the *test* shapes the data. `pytest.fixture(params=...)` → the *suite* defines a matrix." | yes | nothing | no-verification | portable | keep-verbatim |
| 48 | `:140-142` | "Patch where used, not where defined. When `module_under_test` does `from x import y`, patch `module_under_test.y`, never `x.y`." | yes | nothing (this is THE canonical mocking footgun, but no static tool detects it) | no-verification | portable | keep-verbatim — highest-value review heuristic in the file |
| 49 | `:143-144` | "Prefer `autospec=True` (or `spec=...`) over bare `Mock()` / `MagicMock()`." | yes | nothing | no-verification | portable | keep-verbatim |
| 50 | `:145` | "Never mock the SUT's own methods. Mock at the I/O boundary only." | yes | nothing | no-verification | portable | keep-verbatim |
| 51 | `:146-147` | "`MagicMock` chain depth ≤ 2. Deeper = the seam is wrong; refactor (DI) or write a fake." | yes | nothing | no-verification | portable | keep-verbatim |
| 52 | `:148` | "`side_effect` for sequences and exceptions; `return_value` for single replies." | yes | nothing | no-verification | portable | keep-verbatim |
| 53 | `:150-151` | "`assert_called_once_with(...)` over `assert_called_with(...)` when uniqueness matters." | yes | nothing | no-verification | portable | keep-verbatim |
| 54 | `:157-162` | "You own the interface? Write a fake, not a mock chain… Fakes survive interface drift; mocks rot silently." | yes | nothing | no-verification | portable | keep-verbatim |
| 55 | `:183-185` | "Production functions that issue HTTP accept `*, client: httpx.Client \| None = None`." | yes | nothing (DI shape, not lintable) | no-verification | **repo-specific** (assumes `httpx`; neither `ocx/test` nor `grimoire/test` use `httpx` — they use `subprocess`, per `harness-shape.md` §4) | keep-verbatim but scope the header explicitly to "if your code makes HTTP calls" — as written it reads universal but the whole `httpx` section is dead weight for a subprocess-driving CLI-test suite |
| 56 | `:200-202` | "**Do not** patch `httpx.Client.send`, `httpx.get`, or module-level `_CLIENT` globals." | yes | nothing | no-verification | repo-specific (httpx-only) | same as #55 |
| 57 | `:203-205` | "`respx` / `pytest-httpx` are not in this project. Add only when `MockTransport` handlers grow unmaintainable." | yes | nothing | no-verification | **repo-specific instance**, portable mechanism (when to add a heavier mocking dep) | drop the httpx-specific instance if generalized; keep the mechanism |
| 58 | `:213-214` | "Inject a clock, never mock `datetime.now`. Pass `now: Callable[[], datetime]` or a `Clock` protocol." | yes | nothing | no-verification | portable | keep-verbatim |
| 59 | `:215` | "Env vars → `monkeypatch.setenv` / `delenv`. Never mutate `os.environ` raw." | yes | nothing (no ruff rule for raw `os.environ[...] =` mutation in tests) | no-verification | portable | keep-verbatim — but see Contradictions: `grimoire/test` violates this 9 times in its own `conftest.py` |
| 60 | `:216` | "Seed RNGs explicitly (`random.Random(42)`). Never rely on global RNG state." | yes | nothing | no-verification | portable | keep-verbatim |
| 61 | `:217-218` | "Time-dependent logic must be triggerable without sleeping. `time.sleep` in a test is a bug." | yes | nothing | no-verification | portable | keep-verbatim — see Contradictions: `ocx/test` has 12 `time.sleep` sites, `grimoire/test` has 2 |
| 62 | `:224` | "`time.sleep`, `asyncio.sleep` — use a clock seam." (Forbidden list) | yes | nothing | no-verification, but empirically checkable by `grep -rn 'time\.sleep('` | portable | keep-verbatim — duplicate of #61's substance, different section; fold into one row if reworded |
| 63 | `:225` | "Real network — inject the client + `MockTransport`." | yes | nothing | no-verification | portable | keep-verbatim |
| 64 | `:226` | "Real disk outside `tmp_path` — never write to `~`, `/tmp`, or cwd directly." | yes | nothing | no-verification | portable | keep-verbatim |
| 65 | `:227` | "Shared mutable state between tests (module globals, class attrs, singletons)." | yes | nothing | no-verification | portable | keep-verbatim |
| 66 | `:228` | "Bare `pytest.raises(Exc)` without `match=`." (Forbidden list) | yes | ruff `PT011` (same as #38, disabled) | cannot-go-red as configured | portable | drop — exact duplicate of #38, different section |
| 67 | `:229` | "`assert True` / `assert 1 == 1` placeholder asserts." | yes | nothing (no ruff rule for tautological asserts specifically; `B015`/`SIM` groups don't cover this pattern) | no-verification | portable | keep-verbatim |
| 68 | `:235` | "`task verify` enforces `fail_under` from `pyproject.toml` (branch + line)." | true for `ocx-sdk-python` (`fail_under = 100`, confirmed `pyproject.toml:105`); **`ocx-mirror-sdk`'s own `pyproject.toml` sets `fail_under = 80`**, so the same sentence is imported into a repo where the number it references is different | ruff/coverage config (already enforced where it's true) | n/a — this is a fact claim about the repo, not a checkable code pattern | repo-specific instance | keep-reworded — the *mechanism* ("wire `fail_under` into `task verify`") is portable; the specific target number is not, and shipping this sentence unmodified into `ocx-mirror-sdk` is already slightly wrong for that repo (worth flagging to that repo's owner, out of scope for this ledger to fix) |
| 69 | `:239-240` | "Mutation testing is the next gate (`mutmut`, `cosmic-ray`) — documented here, wired in a follow-up PR." | yes | nothing (self-admittedly unwired, confirmed — see #36) | no-verification | portable | drop — duplicate of #36 |

---

## Ledger: quality-errors.md (12 claims)

Source: `ocx-mirror-sdk/.claude/rules/quality-errors.md` — **no `paths:` frontmatter, loads
always-on in that repo** (see prior audit, `config-inventory.md` row #12).

| # | Source | Claim (verbatim) | Still true? | Enforced by tool? | Goes red? | Portable/repo-specific | Verdict |
|---|---|---|---|---|---|---|---|
| 70 | `:19` | "One base class. Every exception raised from `src/ocx_mirror_sdk/**` inherits `OcxMirrorError`." | yes | nothing (no ruff rule checks an exception-hierarchy invariant) | no-verification | **mechanism portable, name repo-specific** | keep-reworded — "every SDK exception inherits one project base" as the portable rule, `OcxMirrorError` as the adopter-named instance |
| 71 | `:20` | "No bare stdlib raises from SDK code. No `raise RuntimeError`, `raise ValueError`, `raise KeyError`, `raise TypeError` inside `src/`." | yes | nothing (no ruff rule restricts which exception *types* get raised — `TRY` group doesn't cover this) | no-verification | portable mechanism | keep-verbatim |
| 72 | `:21` | "Always chain with `from e` … Ruff `B904` is enforced." | yes | ruff `B904` (group `B`, enabled in `ocx-mirror-sdk`) | **goes-red** (same test as quality-python.md #6) | portable | demote-to-lint-config — duplicate rule, different file; the prose adds the `__cause__`/traceback rationale which `B904`'s message doesn't state, so keep one sentence of rationale, drop the imperative |
| 73 | `:22` | "`from None` only to hide an implementation detail the caller can never act on. Add an inline comment explaining the choice." | yes | nothing | no-verification | portable | keep-verbatim |
| 74 | `:23` | "No bare `except:` / no unqualified `except Exception:` in library code." | yes | ruff `E722` (same as quality-python.md #1) | goes-red (same test) | portable | demote-to-lint-config — duplicate, `except Exception:` half is NOT covered by `E722` (E722 only catches the truly bare `except:`) — the unqualified-`Exception` half stays no-verification, worth splitting |
| 75 | `:24` | "Validate at the boundary, trust inward. … Internal helpers assume validated input." | yes | nothing | no-verification | portable | keep-verbatim |
| 76 | `:25` | "No `None` sentinel for exceptional cases. Return `None` *iff* the absence is expected on a healthy system." | yes | nothing | no-verification | portable | keep-verbatim |
| 77 | `:26` | "Carry typed attributes. `HttpStatusError(status_code=503, url=\"...\")` not stringly-typed `str(exc)` parsing." | yes | nothing | no-verification | portable mechanism, repo-specific example | keep-reworded |
| 78 | `:27` | "Preserve `__cause__`. Don't rewrap an already-SDK exception inside another SDK exception." | yes | nothing (a test-level assertion, not a lint) | no-verification | portable | keep-verbatim |
| 79 | `:28` | "Log once, at the public boundary. … Internal helpers never log+raise." | yes | nothing | no-verification | portable | keep-verbatim |
| 80 | `:29` | "Name everything `*Error`, not `*Exception`. No stutter." | yes | nothing (ruff `N`-group pep8-naming has no such convention rule) | no-verification | portable convention | keep-verbatim |
| 81 | `:30` | "No `ExceptionGroup` / `except*` until a real concurrent code path lands. Introducing PEP 654 is itself an API break — defer." | yes, PEP 654 is accepted and shipped in 3.11 (unlike PEP 789) — the claim is about *when to adopt it*, not its status, and that's a valid project decision | nothing | no-verification | repo-specific decision (defer until needed) | keep-verbatim as a "you may defer this" note, not a universal rule — a different adopter with real concurrent fan-out has no reason to defer |

---

## Ledger: quality-enums.md (10 claims)

Source: `ocx-mirror-sdk/.claude/rules/quality-enums.md` — **also no `paths:` frontmatter,
also always-on in `ocx-mirror-sdk`.**

| # | Source | Claim (verbatim) | Still true? | Enforced by tool? | Goes red? | Portable/repo-specific | Verdict |
|---|---|---|---|---|---|---|---|
| 82 | `:24` | "Closed set crossing the public API → `StrEnum`. Strings on the wire, enum in code." | yes | nothing | no-verification | portable, **requires 3.11+** (`StrEnum` added in 3.11) | keep-verbatim |
| 83 | `:25` | "Integer wire values → `IntEnum`." | yes | nothing | no-verification | portable | keep-verbatim |
| 84 | `:26` | "Opaque internal tokens never serialized → plain `Enum`." | yes | nothing | no-verification | portable | keep-verbatim |
| 85 | `:27` | "Pure type narrowing for a single private use → `Literal[...]` allowed. Promote to `StrEnum` once a second public callsite appears." | yes | nothing | no-verification | portable | keep-verbatim |
| 86 | `:28` | "Coerce input via the constructor: `Backend(value)`, never `Backend[value]`. … Wrong lookup mode silently picks the wrong member." | yes, verified — `EnumClass(value)` does value-lookup, `EnumClass[name]` does name-lookup; both are valid Python, this is a house convention against a real footgun (silent `KeyError`/wrong-member risk), not a bug in the language | nothing (no static rule distinguishes intended value- vs name-lookup) | no-verification | portable | keep-verbatim |
| 87 | `:29` | "Members `UPPER_SNAKE_CASE`; values lowercase matching the wire convention." | yes | nothing — checked ruff `N`-group (pep8-naming, not selected in either repo, and doesn't cover enum-member case specifically even if enabled) | no-verification | portable convention | keep-verbatim |
| 88 | `:30` | "`from enum import StrEnum, auto` — explicit import, no `import *`." | yes | ruff `F403` (same as quality-python.md #4) | goes-red (same test) | portable | drop — duplicate of quality-python.md #4, adds nothing enum-specific |
| 89 | `:31` | "No methods on enum classes beyond `__str__` … Helpers … go beside the enum as module-level functions." | yes | nothing | no-verification | portable | keep-verbatim |
| 90 | `:32` | "Enum classes are frozen by stdlib — don't subclass an enum that already has members." | true, but this is a hard `TypeError` from the language itself, not a house rule — you cannot violate it even if you try | Python runtime itself (raises `TypeError: <enum> cannot be extended` at class-definition time) | goes-red trivially and unconditionally — this isn't a check, it's a language constraint | portable (stdlib mechanics) | drop — not a rule, restates Python's own enforced behavior; the only actionable half ("mixin via `class MyEnum(str, Enum)` only if `StrEnum` unavailable") is worth one sentence, the "frozen by stdlib" framing is not |
| 91 | `:33` | "Use `auto()` only when the value is implementation-detail. If the value is a wire string, spell it out." | yes | nothing | no-verification | portable | keep-verbatim |

---

## Ledger: always-on globals (3 claims)

Source: `ocx/.claude/rules/product-tech-strategy.md:29-35` (loads every session, no `paths:`
frontmatter — one of the exactly-3 globals per `meta-ai-config.md:22-30`). Same table shape
repeats at `grimoire/.claude/rules/product-tech-strategy.md:21-27`.

| # | Source | Claim (verbatim) | Still true? | Enforced by tool? | Goes red? | Portable/repo-specific | Verdict |
|---|---|---|---|---|---|---|---|
| 92 | `:33` | "\| Runtime \| Python 3.13+ \|" | **measured false for the subsystem this claim covers** — `product-tech-strategy.md:29` headers this table "Python (Acceptance Tests)", but `ocx/test/pyproject.toml:4` declares `requires-python = ">=3.10"`, not `>=3.13` | n/a | n/a — this is a declared-floor fact, checked directly against the file it claims to describe | repo-specific, and currently **wrong** | supersede — either raise `test/pyproject.toml`'s floor to 3.13 or lower this claim to match; as written the always-on global and the file it describes disagree |
| 93 | `:34` | "\| Tooling \| uv (Manager), Ruff (Linter) \|" | **measured false for the same subsystem** — `ocx/test/pyproject.toml`'s `[dependency-groups] dev` (line 19-23) lists `pytest`, `pytest-xdist`, `pexpect`, `oras` — **no `ruff` entry anywhere**; same for `grimoire/test/pyproject.toml:11` (`pytest`, `pytest-xdist`, `pexpect`, `rich` — no ruff) | n/a | n/a | repo-specific, and currently **wrong** | supersede — ruff is not a dev dependency of the acceptance-test harness in either repo; matches `harness-shape.md:157`'s independent finding of zero lint/type config over `test/` |
| 94 | `:35` | "\| Testing \| pytest \|" | true — confirmed, `pytest>=8.0` is declared in both `test/pyproject.toml` dev groups | n/a | n/a | repo-specific, accurate | keep-verbatim |

---

## Contradictions

1. **The Python-version floor is wrong for the subsystem it's stated for.** `quality-python.md:10` self-describes as "Python 3.13+" and the always-on `product-tech-strategy.md:33` claims "Runtime | Python 3.13+" for the acceptance-test subsystem specifically — but `ocx/test/pyproject.toml:4` and `grimoire/test/pyproject.toml:4` both declare `requires-python = ">=3.10"`. Several Block/Warn-tier claims in `quality-python.md` name features that don't exist on 3.10: `asyncio.TaskGroup` (#8, 3.11+), `typing.Self` (#18, 3.11+), `TypedDict Required/NotRequired` (#24, 3.11+), `StrEnum` (used throughout `quality-enums.md`, 3.11+), `asyncio.timeout` (#27, 3.11+). If these rules are ever applied to `test/` as written, they recommend syntax that fails to import on the harness's own declared minimum.
2. **The tooling table names a linter the harness doesn't have.** `product-tech-strategy.md:34` says the acceptance-test subsystem's tooling is "uv (Manager), Ruff (Linter)" — but per row #93 above and independently per `harness-shape.md:157`, neither `test/pyproject.toml` declares `ruff` as a dependency, neither has a `[tool.ruff]` section, and no CI workflow lints `test/`. The always-on global asserts a check that does not exist over 95k+35k LOC of Python.
3. **`quality-tests.md:215`'s "never mutate `os.environ` raw" is violated by the repo the sibling rule (`subsystem-tests.md`) describes as correct.** `harness-shape.md:128` measured `grimoire/test/conftest.py` performing 9 raw `os.environ[...] =` mutations (`HOME`/`USERPROFILE`/`XDG_CONFIG_HOME` isolation for the xdist worker fork boundary) — a deliberate, load-bearing pattern in the actual harness, not an oversight, per `subsystem-tests.md`'s own description of that isolation. The `quality-tests.md` rule and the harness's own conftest disagree, and the harness — not the rule — is what ships.
4. **`quality-tests.md:217-218`'s "time-dependent logic must be triggerable without sleeping. `time.sleep` in a test is a bug" is violated 14 times across the two acceptance suites**, per `harness-shape.md:133-137`: 12 sites in `ocx/test`, 2 in `grimoire/test`. `harness-shape.md:137` independently recommends codifying the pattern actually used there ("every sleep names what it's waiting past") rather than a blanket ban — the existing rule bans the exact thing the harness does correctly.
5. **PEP 789 is cited as settled ("PEP 789: ...") for a Block-tier claim (`quality-python.md:30`) while still in Draft status** as of 2026-08-22 (confirmed by WebSearch against peps.python.org). A rule that names an unaccepted PEP as its authority is citing a moving target; if PEP 789 is amended or rejected before this ships, the citation goes stale even though the underlying TaskGroup/timeout cancellation behavior it describes remains real and worth keeping.
6. **The 100%-coverage sentence travels unmodified into a repo where it's false.** `quality-tests.md:235` ("`task verify` enforces `fail_under` from `pyproject.toml`") is diff-identical between `ocx-sdk-python` (`fail_under = 100`) and `ocx-mirror-sdk` (`fail_under = 80`, `pyproject.toml:91`) — the sentence is still literally true (it says "enforces `fail_under`", not "enforces 100%"), but it was clearly authored against the 100% repo and reads as a stronger guarantee than `ocx-mirror-sdk` actually ships.

## What the existing set does NOT cover

Checked all four files plus the always-on globals; zero claims found for:
- **Logging configuration** (structlog vs stdlib `logging`, handler setup, level policy) — `quality-errors.md:28` says "log once at the boundary" but never says with what.
- **CLI/argparse conventions** for Python-authored tools (the hooks and `index/bot` are exactly this shape; nothing here governs them — confirmed in the prior audit, `config-inventory.md` §4).
- **`pexpect` usage** — used in both acceptance harnesses (`harness-shape.md:108`, 6+2 sites) and named nowhere in any of these four files.
- **`subprocess` timeout discipline** — the harness's own largest measured defect (`harness-shape.md:163`, 291/308 + 24/27 calls with no `timeout=`) has no corresponding claim anywhere in these files to either violate or confirm; this is a genuine blind spot, not a contradiction.
- **Docstring convention** (`pydocstyle`/`D`-group `convention = "google"`, confirmed in `ocx-sdk-python/pyproject.toml:76-77`) — enforced by a configured lint that no rule file explains.
- **Packaging layout** (`src/` layout, `py.typed`, wheel packaging) beyond what `architecture.md` states as a project-specific design, never as a portable default.
- **Dependency-pinning policy** (`uv.lock`, version-range conventions) — mentioned operationally in CI rules, never as a Python-quality claim.

## Adoption risk

- Row #9 (PEP 789 supersede): dropping the PEP-789 framing and keeping only the behavioral description changes nothing enforceable — no repo currently checks for this pattern — so the risk is zero; it only prevents shipping a citation that could be embarrassing if PEP 789 is rejected.
- Row #66 (drop, duplicate of #38): removing this line from `quality-tests.md`'s Forbidden list changes nothing — the identical rule survives at line 79-80 in the same file. Zero risk.
- Row #90 (drop, "frozen by stdlib"): removing this sentence from `quality-enums.md` changes nothing checkable — no repo can violate a language constraint regardless of what the rule file says. Zero risk.
- Row #7 (drop, duplicate of #6): removing the restatement from `quality-python.md`'s Warn tier changes nothing — `B904` still fires from Block-tier claim #6 in the same file. Zero risk.
- Row #88 (drop, duplicate of quality-python's F403 claim): same reasoning — `ocx-mirror-sdk` still gets the `F403` coverage from its own `quality-python.md` copy. Zero risk.
- Rows #92/#93 (supersede, the "Python 3.13+ / uv+ruff" acceptance-test claims): this is the one real risk. `product-tech-strategy.md` is an **always-on global** in both `ocx` and `grimoire` — every session in those two repos currently reads a false claim about their own `test/` subsystem. Correcting it costs nothing functionally (no code changes forced), but changing the text is a decision for those two repos' owners, not something this ledger's authoring pass can silently fix by writing a new Python ruleset elsewhere — flagging it here is the deliverable; fixing `ocx`/`grimoire`'s own file is out of scope for a `grimoire-lore`-authored rule set.
