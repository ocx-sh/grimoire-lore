---
title: "Lint yield: which rule families are worth requiring for the Python rule set"
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope: >
  /home/mherwig/dev/ocx/test, /home/mherwig/dev/grimoire/test,
  /home/mherwig/dev/ocx-sdk-python/{src,tests}, /home/mherwig/dev/index/bot,
  /home/mherwig/dev/ocx/.claude/hooks
method: >
  Tool: `uvx ruff@latest` resolved to ruff 0.16.4 (`uvx ruff@latest --version`).
  `uvx pyright` resolved to pyright 1.1.411 (`uvx pyright --version`). Both
  worked on the first try; no grep-based approximation was needed anywhere in
  this report — every count below is real tool output.
  Ruff invocation shape, per subject: `ruff check --select ALL --statistics
  --isolated --target-version py310 <excludes> <path>` for the human-readable
  tables in §2, and the same command with `--output-format=json` in place of
  `--statistics` for the family/file aggregation in §3-4 (JSON captures
  file+line+message per violation; `--statistics` only gives per-code totals).
  `--isolated` deliberately ignores every existing `pyproject.toml`/`ruff.toml`
  in the fleet, per the commission — see the E501 caveat in §3 for what that
  costs in interpretability. Aggregation script: python3, reads the 6 JSON
  dumps, groups by leading-letter rule family, at
  /tmp/aggregate_ruff.py (ephemeral, logic reproduced inline where it drives a
  number in this report). Pyright: `pyright --outputjson --pythonpath
  <repo>/.venv/bin/python <repo>` — the first attempt without `--pythonpath`
  over-reported (see §5 caveat).
---

## 1. Tooling

`uvx ruff@latest --version` → **ruff 0.16.4**. `uvx pyright --version` → **pyright 1.1.411**. Both reachable on the first try (`ocx run ruff` was NOT available — `binding 'ruff' not found in selected groups` — but was never needed since `uvx` worked). No grep approximation was used anywhere in this report; every number below is real tool output.

## 2. Full per-rule violation tables

### `/home/mherwig/dev/ocx/test`
`cd /home/mherwig/dev/ocx/test && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 --exclude .out --exclude .ruff_cache --exclude recordings .`
**15,143 total violations**, 2,266 auto-fixable (849 more with `--unsafe-fixes`). Top 20 of 100 distinct codes:
```
5723 S101    assert                                          855 D205    missing-blank-line-after-summary
2812 E501    line-too-long                                   416 PLR2004 magic-value-comparison
1689 COM812  missing-trailing-comma                          415 ANN201  missing-return-type-undocumented-public-function
 306 S603    subprocess-without-shell-equals-true             280 PLC0415 import-outside-top-level
 275 D209    new-line-after-last-paragraph                    262 PLW1510 subprocess-run-without-check
 144 INP001  implicit-namespace-package                       129 D103    undocumented-public-function
 124 D401    non-imperative-mood                               96 TC001   typing-only-first-party-import
  92 CPY001  missing-copyright-notice                          91 ARG001  unused-function-argument
  79 D403    first-word-uncapitalized                          76 D102    undocumented-public-method
  74 I001    unsorted-imports                                  72 PT018   pytest-composite-assertion
```
(Full 100-code table archived in the run transcript; remaining 80 codes range 1-70 hits each — dominated by `SLF001`, `TC003`, `RUF002`, `TRY003`, `ANN001`, `T201`, `PLR0913`, `RUF059`, `EM102` in the 45-55 range, long tail of 1-10-hit codes below that.)

### `/home/mherwig/dev/grimoire/test`
`cd /home/mherwig/dev/grimoire/test && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 --exclude .out --exclude .ruff_cache --exclude recordings .`
**8,101 total violations**, 1,481 auto-fixable. Top 15 of 65 distinct codes:
```
3274 S101    assert                                            977 COM812  missing-trailing-comma
 784 ANN001  missing-type-function-argument                    732 E501    line-too-long
 476 D205    missing-blank-line-after-summary                  370 D209    new-line-after-last-paragraph
 335 ARG001  unused-function-argument                           282 PLR2004 magic-value-comparison
 224 D103    undocumented-public-function                        67 INP001  implicit-namespace-package
  65 TC003   typing-only-standard-library-import                 50 PLC0207 missing-maxsplit-arg
  46 PT018   pytest-composite-assertion                          45 PLC0415 import-outside-top-level
  32 D401    non-imperative-mood
```

### `/home/mherwig/dev/ocx-sdk-python/src`
`cd /home/mherwig/dev/ocx-sdk-python && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 src`
**771 total**, 230 auto-fixable. `264 E501, 173 D413, 77 TRY003, 73 EM102, 53 COM812, 38 PLR0913, 19 TC003, 17 invalid-syntax(*), 17 ANN401, 6 A002, ...` — (*) `invalid-syntax` here is ruff parsing files under `--target-version py310` that use 3.12-only syntax (SDK's real `requires-python` is `>=3.12`); not a real defect, a target-version mismatch artifact of `--isolated`.

### `/home/mherwig/dev/ocx-sdk-python/tests`
`cd /home/mherwig/dev/ocx-sdk-python && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 tests`
**2,510 total**, 46 auto-fixable. `882 S101, 501 D103, 484 E501, 211 ANN201, 131 ANN001, 42 COM812, 38 PLR2004, 34 ANN401, 24 INP001, 19 D401, 19 S105, ...` — note the SDK's own `pyproject.toml:80` sets `per-file-ignores: "tests/*" = ["ANN","D"]`, so 211+131+34+19+... of ANN/D hits here are already suppressed in the SDK's real CI; `--isolated` doesn't see that.

### `/home/mherwig/dev/index/bot`
`cd /home/mherwig/dev/index/bot && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 .`
**4,180 total**, 735 auto-fixable. `998 S101, 655 D103, 641 E501, 470 COM812, 308 D205, 227 D209, 155 TRY003, 94 EM102, 93 CPY001, 83 ARG002, 62 EM101, 62 PLR2004, 61 D401, 56 D102, 31 TC006, 30 TC001, ...`

### `/home/mherwig/dev/ocx/.claude/hooks`
`cd /home/mherwig/dev/ocx/.claude/hooks && uvx ruff@latest check --select ALL --statistics --isolated --target-version py310 .`
**134 total**, 29 auto-fixable — smallest subject by an order of magnitude. `25 COM812, 18 E501, 10 CPY001, 9 D103, 8 D102, 5 T201, 4 BLE001, 4 PERF203, 4 S607, 3 C901, 3 PTH106, 3 SIM105, 3 TRY300, ...`

## 3. Rule families ranked by yield

Aggregated across all 6 subjects (30,839 total violations), family = leading letters of the rule code, via the JSON-output aggregation described in `method`.

| family | total | distinct files | selected today? | dominated by one pattern or spread? | verdict |
|---|---|---|---|---|---|
| **S** (bandit) | 11,391 | 299 | strictest (per-file-ignored `S101`,`S603` in `tests/*`), SDK (no) | **95% is one code**: `S101` (assert) = 10,877. The other 5%: `S603` 341 (subprocess w/o `shell=True` check — spread across 85 files in ocx/test alone), `S310` 46, `S105`/`S106` 58 (hardcoded-password-string, mostly test fixture secrets), `S607` 44 | **enable with `S101`/`S603` ignored in `tests/*`** — the strictest profile already does exactly this; it's the correct call, not a guess |
| **E** (pycodestyle) | 4,960 | 311 | strictest (ignores `E501`), SDK (yes, no ignore) | **100% is `E501`** (4,951/4,960) — and at each subject's own real line-length (120 for the SDK, 100 for grimoire-lore's own profile) the count collapses: ocx/test 2,812→**40** @120col, grimoire/test 732→**1** @120col, sdk/src 264→**17** @120col (17 is real — this IS the SDK's actual configured length), sdk/tests 484→**0** @120col, index/bot 641→**0** @100col | **E501 is ~100% noise at ruff's default 88-col; not worth enabling below each subject's real line-length.** The strictest profile's decision to ignore it outright is correct, not just convenient |
| **D** (pydocstyle) | 4,869 | 351 | SDK only (ignores `D105`,`D107`; tests get blanket `ANN,D` ignore) | Spread, not one code: `D205` 1,641 (34%), `D103` 1,518 (31%), `D209` 872 (18%), rest under 5% each | **not worth it for the test-harness shape** — a black-box CLI test suite has no public API surface for docstrings to document; this is why the SDK (a shipped library) selects `D` and the harness repos don't. High count, unselected — correctly so |
| **COM** (flake8-commas) | 3,256 | 294 | neither | 100% `COM812` (trailing comma), 100% auto-fixable | **enable-with-fix**: one `ruff check --fix` run clears it; not worth hand-authoring a rule around, but cheap to turn on since it self-heals |
| **ANN** (flake8-annotations) | 1,737 | 121 | SDK only (ignores `ANN401`, tests blanket-ignored) | `ANN001` 970 (56%, missing param type), `ANN201` 635 (37%, missing return type) — spread across the harness's helper layer (`src/`) more than the `tests/` files themselves | **enable for `src/` (the helper layer), not `tests/`** — mirrors the SDK's own per-file-ignore, and matches the earlier harness-shape audit's finding that `src/runner.py`/`helpers.py` is the load-bearing shared code |
| **PLR** (pylint refactor) | 969 | 203 | strictest (ignores `PLR2004`,`PLR0912`,`PLR0915`,`PLR0911`) | 83% is `PLR2004` (magic-value-comparison, 800) — already ignored by the strictest profile's own `ruff.toml:36-38` with a stated reason ("threshold constants are named where it helps..."). Remainder: `PLR0913` (too-many-arguments) 116, `PLR0917` 33 | **matches the existing ignore list exactly** — confirms the strictest profile isn't guessing, it measured this pattern (or independently arrived at the same conclusion) |
| **ARG** (flake8-unused-arguments) | 558 | 79 | neither | `ARG001` 440 (79%, unused function arg) — largely pytest fixtures that accept a fixture for its side effect (e.g. `session` param in `conftest.py:55` used only to control fixture scope, never referenced in the body) | **enable-with-ignore**: `ARG001` in `conftest.py`/`tests/*` is mostly a real pytest idiom, not a defect — ignore there, keep for `src/` |
| **PLC** (pylint convention) | 380 | 69 | strictest (yes, unfiltered) | 86% is `PLC0415` (import-outside-top-level, 327) — this is the harness's *documented, deliberate* lazy-import pattern (ocx's `pyproject.toml:9-13` comment explains exactly why: avoid dragging `oras`/registry imports into pure-logic unit tests) | **enable-with-ignore for the harness, keep for `src/`** — the strictest profile currently has no ignore for this and would flag a pattern the harness team chose on purpose |
| **TC** (flake8-type-checking) | 352 | 204 | neither | Spread: `TC003` 175 (move-stdlib-import-behind-TYPE_CHECKING), `TC001` 139 (same for first-party) | **not worth it** — moving imports behind `TYPE_CHECKING` only pays off for import-cycle/startup-cost concerns a test harness doesn't have |
| **TRY**+**EM** (tryceratops / exception-message) | 623 | ~110 combined | neither | `TRY003` 304 (96% of TRY) + `EM102` 222 (73% of EM) — both fire on the exact same idiom: `raise AssertionError(f"ocx {args} failed...")` in `runner.py:114-118`/`GrimRunner.run` and dozens of call sites that mirror it | **not worth it** — this is the harness's core failure-reporting idiom (a descriptive f-string raised at the point of failure, cited as a *pattern worth encoding* in the companion harness-shape audit); TRY/EM would fight the thing worth preserving |
| **INP** (implicit-namespace-package) | 245 | **245** (1:1 — every hit is a distinct file) | neither | 100% `INP001` — every top-level script under `scripts/`, `bench/`, `sigstore/` lacking `__init__.py` | **not worth it for pytest-collected code** — pytest's `rootdir`/`testpaths` model does not need namespace packages; enabling this would force `__init__.py` into directories that work fine without it |
| **CPY** (copyright-notice) | 199 | 199 | neither | 100% `CPY001` — every file with no `# Copyright` header. Only `index/bot` (93) and `ocx/.claude/hooks` (10) are anywhere close to already carrying one convention; the two test harnesses (92 hits) have none | **not worth it** — no established header convention exists in the harness repos; this is a corpus-wide "adopt a header," not a "fix a violation," decision, out of scope for a lint rule |
| **RUF** (ruff-specific) | 188 | 43 | strictest, SDK | Spread: `RUF002`/`RUF003`/`RUF001` (ambiguous-unicode, 116 combined — mostly `×` in docstrings, `RUF059` unused-unpacked-variable 51 | **enable** — already selected by both existing profiles; low volume, real hits (unicode confusables in prose are a genuine readability/security-adjacent smell) |

**High-count, unselected-by-anything families that are real findings, not noise:** `D` (4,869 — correctly unselected for a harness with no public API), `ANN` (1,737 — correctly unselected for `tests/`, arguably wrong to skip for `src/`), `ARG` (558 — mostly correct pytest idiom, not a defect), `TC` (352 — genuinely low-value here), `TRY`+`EM` (623 — actively fights a pattern worth preserving), `INP` (245 — wrong tool for a pytest-collected repo), `CPY` (199 — a convention decision, not a lint gap).

**Zero-or-near-zero families that the strictest profile selects, expecting non-trivial yield, and gets almost nothing:** `B` (bugbear) = **3** total across 30,839 violations, `RET` (return-path clarity) = **2**, `FURB` (modernisation) = **6**, `ISC` (implicit-string-concat) = **6**, `SIM` (simplify) = **16**, `N` (naming) = **4**. `W` (pycodestyle warnings) = **0** — literally zero across every subject, almost certainly because `ruff format`/black-equivalent formatting already keeps whitespace/blank-line hygiene clean. **This is the actual finding of this section**: the strictest profile's non-`S`/`E`/`PL` selections (`B`,`SIM`,`RET`,`PTH`,`ISC`,`FURB`) cost almost nothing to turn on — the code already conforms — so enabling them fleet-wide is free insurance, not a cleanup project.

## 4. Spot-check: top 10 families, one real hit each, noise-or-real verdict

1. **S101** (`assert`, 10,877 hits) — `ocx/test/bench/scenarios.py:638`. Every hit is `assert` used as pytest's normal assertion mechanism. **Noise as a blanket rule; correctly scoped by per-file-ignore in `tests/*`.**
2. **E501** (`line-too-long`, 4,951 hits) — `ocx/test/bench/compare.py:216`, 99 > 88 cols. Collapses to near-zero at each subject's real width (§3). **Noise at the default threshold.**
3. **COM812** (`missing-trailing-comma`, 3,256 hits) — `ocx/test/bench/baseline.py:70`. Auto-fixable, purely cosmetic. **Real but trivial — fix via `--fix`, not a rule to author prose around.**
4. **D205** (`missing-blank-line-after-summary`, 1,641 hits) — `ocx/test/conftest.py:275`. Docstring formatting nitpick on internal-only code. **Noise for this shape.**
5. **ANN001** (`missing-type-function-argument`, 970 hits) — `ocx/test/tests/fixtures/sigstore_stack.py:114`, missing type on `tmp_path_factory` (a pytest fixture whose type is `pytest.TempPathFactory`, entirely inferrable). **Mixed — real for `src/` helper signatures, noise for fixture-consuming test functions.**
6. **D103** (`undocumented-public-function`, 1,518 hits) — every `def test_*` counts as "undocumented public function." **Noise — test function names are the documentation.**
7. **PLR2004** (`magic-value-comparison`, 800 hits) — `sigstore/wait-for-stack.py:43`, comparing an HTTP status to `200`. **Mostly noise in test assertions** (`assert result.returncode == 2` reads fine); the strictest profile's ignore is correct.
8. **PLC0415** (`import-outside-top-level`, 327 hits) — `src/doc_binding.py:425`. **Real but deliberate** — this is the harness's documented lazy-import idiom (avoid dragging heavy deps into collection-time). Not noise, but also not a defect: it's a pattern that needs a targeted ignore, not a fix.
9. **PLW1510** (`subprocess-run-without-check`, 262 hits, 73 distinct files in ocx/test) — `sigstore/generate-trusted-root.py:38` is a genuine bare `subprocess.run` with no check; but the *bulk* of the 262 (and grimoire's 16) trace back to `OcxRunner.run()`/`GrimRunner.run()` themselves (`src/runner.py:117-124` and `:100-105` in the companion harness-shape audit), which ruff can't see implements the equivalent check manually one line below via `if check and result.returncode != 0: raise AssertionError(...)`. **Half real, half a ruff blind spot** — but it independently corroborates the harness-shape audit's #1 finding (that single call site is where a `timeout=` default belongs too).
10. **ARG001** (`unused-function-argument`, 440 hits) — `ocx/test/conftest.py:55`, `session` param on a fixture, kept only to select fixture scope. **Noise for `conftest.py`/fixtures, real for anything else.**

## 5. Pyright (`standard` mode)

Both reachable: `uvx pyright --outputjson --pythonpath <repo>/.venv/bin/python <repo>`. **Caveat:** the first attempt without `--pythonpath` over-reported (ocx/test: 292 errors, 100 of them `reportMissingImports` for deps like `oras`/`pexpect` pyright couldn't locate without the project's own `.venv`); pointing at each repo's `.venv/bin/python` is the number below.

**ocx/test**: `uvx pyright --outputjson --pythonpath .venv/bin/python .` → **154 errors, 0 warnings**, 190 files analyzed.
```
69 reportAttributeAccessIssue    13 reportOptionalMemberAccess   3 reportIncompatibleVariableOverride
55 reportArgumentType             6 reportMissingImports          2 reportCallIssue
 1 reportInvalidTypeForm          1 reportGeneralTypeIssues       1 reportAssignmentType
 1 reportPossiblyUnboundVariable  1 reportUndefinedVariable       1 reportReturnType
```

**grimoire/test**: `uvx pyright --outputjson --pythonpath .venv/bin/python .` → **32 errors, 1 warning**, 76 files analyzed.
```
17 reportAttributeAccessIssue   10 reportUndefinedVariable   2 reportIncompatibleMethodOverride
 1 reportReturnType              1 reportGeneralTypeIssues   1 reportArgumentType
 1 reportUnusedExpression
```

**Real cross-repo finding, not noise**: `reportUndefinedVariable`/ruff's equivalent `F821` both catch the same live bug pattern independently — a forward-ref string return-type annotation naming a class that is only imported *inside* the function body, after the annotation. `grimoire/test/conftest.py:355` (`def grim(...) -> "GrimRunner":` with `from src.runner import GrimRunner` on line 356, one line later) is the clearest instance; 7 of grimoire's 10 `reportUndefinedVariable` hits are the identical shape (`"src" is not defined`, `tests/test_render_clients.py:82/91/110/127/842/846/858/865`). ocx has the same pattern once: `tests/test_doc_scripts_cast.py:442`, `"OcxRunner" is not defined`. **Fixing this is real value** — it doesn't break at runtime today only because Python never evaluates the string annotation, but it silently defeats any future `get_type_hints()` call or IDE hover, and is exactly the class of "verification that cannot go red" this program is hunting for.

---

## Verdict summary

- **Enable fleet-wide, cheap**: `B`, `SIM`, `RET`, `PTH`, `ISC`, `FURB`, `RUF`, `COM812` (fix-and-forget) — near-zero existing violations, already selected by the strictest profile, confirmed by measurement rather than assumed.
- **Enable with the ignores the strictest profile already has**: `S` (minus `S101`/`S603` in tests), `PL` (minus `PLR2004`/`PLR0912`/`PLR0915`/`PLR0911`) — the measurement confirms those specific ignores are exactly the noise, not a broader set.
- **New ignore this audit surfaces that the strictest profile does NOT yet have**: `PLC0415` (import-outside-top-level) should be ignored in `tests/*`/harness `src/` — it's a deliberate, documented lazy-import idiom, not a defect, and currently nothing exempts it.
- **Not worth it for this shape**: `D`, `INP`, `CPY`, `TC`, `TRY`+`EM` (actively fights a pattern the companion audit flagged as worth preserving), `E501` at any threshold below each subject's real line width.
- **Split by directory, not blanket**: `ANN` and `ARG` — real signal in `src/` (the shared helper layer), noise in `tests/`/`conftest.py` (fixture params, pytest idiom).
- **pyright, real finding worth a rule**: forward-ref return-type annotations naming a class imported after the annotation — 8 real hits across the 2 repos, same root cause each time, genuinely invisible until a type checker runs.
