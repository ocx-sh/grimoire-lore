---
title: requires-python floor — declared vs. computed vs. tested
agent: ground-python-audit
model: claude-sonnet-5
scope: >
  ocx/test, grimoire/test, ocx-sdk-python/src, index/bot, ocx/.claude/hooks,
  grimoire-lore/scripts (the 6 subjects named in the follow-up), plus
  ocx-mirror-sdk as a bonus once it surfaced the opposite failure mode.
method: >
  Static: `uvx vermin --no-parse-comments -vv <path>` (vermin 1.8.0), cross-
  checked with `grep` for constructs vermin's version (1.8.0) is known not to
  parse: PEP 695 `def f[T](...)` generic-function syntax and PEP 701 nested-
  same-quote f-strings (vermin only flagged the PEP 695 `type X = ...` form,
  not the generic-function form — see §1, ocx-sdk-python). Dynamic: `uv
  python install 3.10 3.11 3.12 3.13 3.14t` (report below says what was
  already present), then per subject `uv run --python <v> -m pytest
  --collect-only -q` and, where collection succeeded, `uv run --python <v>
  -m pytest <cheap paths> -q`. Deselected by path: `tests/contract` and
  `tests/acceptance` in ocx-sdk-python (need a pinned `ocx` binary /
  compose stack); `tests/integration`, `tests/golden`, `tests/security` in
  index/bot (integration hits fake HTTP servers meant for CI's isolated
  runner, golden regenerates baseline artifacts against HEAD, security runs
  bandit/pip-audit-style scans) — reasons stated at first use below, not
  repeated. ocx/test and grimoire/test have no tier split (single
  `tests/`), so `--collect-only` is the full-suite ground truth for "does it
  even load"; nothing in `tests/` was executed beyond collection since a
  full run needs a built `ocx`/`grim` Rust binary. All commands paste their
  actual output, not a paraphrase.
---

# Version floor: declared vs. computed vs. tested

## 1. Static: what floor does the code actually require

Vermin misses two constructs relevant here (confirmed by cross-check, not
assumed): PEP 701 nested-same-quote f-strings (3.12) — not in vermin 1.8.0's
grammar at all — and PEP 695 `def f[T](...)` generic *functions* — vermin
catches the `type X = ...` alias form but not this one, per below.

| Subject | Declared floor | vermin-computed | Raising constructs (file:line) |
|---|---|---|---|
| `ocx/test` | `>=3.10` | **3.11** (vermin); **3.12** once PEP 701 is counted (§2) | `bench/harness.py:48` `asyncio.TaskGroup`; `src/announce_e2e/evidence.py:311`, `tests/fixtures/adversarial.py:631` `datetime.UTC`; `tests/test_index_ocx_sh.py:1399`, `tests/test_index_selfcontained.py:1428`, `tests/test_pinned_offline.py:1993`, `tests/test_project_add.py:2039` `import tomllib`; **+ `tests/test_deps_interpolation.py:87`** `f"...{[e['key'] for e in env_result["entries"]]}"` — nested same-double-quote f-string, PEP 701, needs **3.12**, vermin does not flag it |
| `grimoire/test` | `>=3.10` | **3.11** | `tests/test_config.py`, `test_config_registry.py`, `test_fix_locking.py`, `test_fix_mcp_lifecycle.py`, `test_fix_splice_status.py`, `test_mcp_artifact.py:14` — all `import tomllib  # stdlib (Python 3.11+)` (the comment already says it) |
| `ocx-sdk-python/src` | `>=3.12` | **3.12** — matches | `_client.py:68`, `_process.py:237`, `_results.py:263`, `_types.py:305` — `type X = SomeType` (PEP 695 alias, vermin-caught); **+ `_retry.py:69`** `def run_with_retry[T](` — PEP 695 generic function, vermin does **not** flag this file at all (missing from its own 3.12 list) — caught only by the supplemental grep. Both forms are 3.12, so the computed floor is unchanged, but it means vermin under-counted the evidence for this exact subject. |
| `index/bot` | `>=3.12` | 3.11 (conservative — declared is *safer* than required) | `enum.StrEnum`/dataclasses/typing backport tips; no file forces 3.12 specifically |
| `ocx/.claude/hooks` | `>=3.10` (own PEP 723 header per file) | 3.7 (conservative) | none above 3.7 found |
| `grimoire-lore/scripts` | **none — see below** | 3.7 | none above 3.7 found |
| *(bonus)* `ocx-mirror-sdk` | `>=3.13` | 3.11 (2 versions conservative) | `github/_router.py:22` `class Backend(StrEnum)` (3.11); nothing found requiring 3.12 or 3.13 (`except*`, `Self`, `@override`, `Path.walk`, `TypeIs`, `warnings.deprecated`, `itertools.batched`, `asyncio.timeout` — all grepped, zero hits) |

**Correction to the CI workflow's own claim**: `grimoire-lore/.github/workflows/python.yml`'s
comment says *"3.11 is the floor the scripts declare in their PEP 723
headers."* That's false as written — `grep -rn "requires-python\|# ///"
grimoire-lore/scripts/*.py grimoire-lore/.claude/skills/research-lang/scripts/*.py`
returns **zero matches**. No script in this repo has a PEP 723 header at all.
The only place "3.11" is declared anywhere is `ruff.toml`'s
`target-version = "py311"` (a lint target, not a runtime requirement) and the
workflow's own `actions/setup-python: python-version: "3.11"` pin. The
workflow comment conflates "what CI happens to test" with "what the code
declares" — they're the same number by coincidence of someone setting it
correctly, not because a declaration exists to check. Code is authoritative
here (there is none); the comment is wrong.

## 2. Dynamic: does it actually run

Pythons already present: 3.11.15, 3.12.13, 3.13.12 (uv-managed), 3.14.5
(system). Installed for this check: `uv python install 3.10 3.14t` → both
downloaded clean (3.10.20, 3.14.6+freethreaded), no sandbox/network issue.

**`ocx/test` @ 3.10 (declared floor) — FAILS:**
```
$ cd ocx/test && uv run --python 3.10 -m pytest --collect-only -q
...
E     File "/home/mherwig/dev/ocx/test/tests/test_deps_interpolation.py", line 87
E       assert dep_path_entry is not None, f"DEP_PATH missing in env: {[e['key'] for e in env_result["entries"]]}"
E                                                                                                     ^^^^^^^
E   SyntaxError: f-string: unmatched '['
ERROR tests/test_announce_e2e_evidence.py
ERROR tests/test_deps_interpolation.py
ERROR tests/test_index_ocx_sh.py
ERROR tests/test_index_selfcontained.py
!!!!!!!!!!!!!!!!!!! Interrupted: 4 errors during collection !!!!!!!!!!!!!!!!!!!!
2232 tests collected, 4 errors in 2.69s
```
**@ 3.11** — down to 1 error (the same `SyntaxError`, 2318 collected — the
`tomllib`/`datetime.UTC` errors are gone, confirming those really are the
3.11 boundary). **@ 3.12** — clean: `2328 tests collected in 2.40s`, zero
errors. **Computed floor for `ocx/test`, empirically: 3.12**, not the
vermin-only 3.11 and not the declared 3.10.

**`grimoire/test` @ 3.10 (declared floor) — FAILS:**
```
$ cd grimoire/test && uv run --python 3.10 -m pytest --collect-only -q
...
tests/test_mcp_artifact.py:14: in <module>
    import tomllib  # stdlib (Python 3.11+)
E   ModuleNotFoundError: No module named 'tomllib'
ERROR tests/test_config.py
ERROR tests/test_config_registry.py
ERROR tests/test_fix_locking.py
ERROR tests/test_fix_mcp_lifecycle.py
ERROR tests/test_fix_splice_status.py
ERROR tests/test_mcp_artifact.py
!!!!!!!!!!!!!!!!!!! Interrupted: 6 errors during collection !!!!!!!!!!!!!!!!!!!!
909 tests collected, 6 errors in 1.89s
```
**@ 3.11** — clean: `1060 tests collected in 1.25s`, 0 errors. **Computed
floor: 3.11**, matching vermin exactly.

**`ocx-sdk-python` @ 3.12 / 3.13 / 3.14 — all clean**, identical collection
count and identical cheap-tier (`tests/unit` + `tests/test_version.py`,
deselecting `tests/contract` — needs a pinned `ocx` binary — and
`tests/acceptance` — needs a compose stack) pass count at every version:

| Python | Collected | Cheap-tier result |
|---|---|---|
| 3.12 | 1037 | `954 passed in 2.00s` |
| 3.13 | 1037 | `954 passed in 1.13s` |
| 3.14 | 1037 | `954 passed in 1.25s` |
| **3.14t (free-threaded)** | 1037 | `954 passed in 1.39s` |

The SDK's classifiers/CI matrix claim (3.12/3.13/3.14) is the one place in
the fleet where declared floor, CI matrix, and actual behavior all agree —
confirmed, not assumed.

**`index/bot` @ 3.12 (declared floor) — clean:**
```
$ cd index/bot && uv run --python 3.12 python -m pytest -q --ignore=tests/integration --ignore=tests/golden --ignore=tests/security
...
TOTAL                                    2038      0    570      0   100%
Required test coverage of 100.0% reached. Total coverage: 100.00%
762 passed in 3.44s
```
Same command **@ 3.14t (free-threaded)** — identical: `762 passed in 2.76s`,
100% coverage. Deselected `integration/` (fake-forge/fake-ghcr HTTP servers
— safe to run but out of scope for "cheap"), `golden/` (regenerates baseline
artifacts against HEAD — mutates state, not a pure check), `security/`
(bandit/pip-audit-shaped, network-adjacent).

**`ocx/.claude/hooks` @ 3.10 — clean**, and unlike the others this one has an
actual test suite to prove it, not just a syntax parse: `cd
ocx/.claude/tests && uv run --python 3.10 -m pytest -q` → `165 passed, 3
skipped in 1.34s`. The declared per-file `>=3.10` is real and verified.

**`grimoire-lore/scripts` @ 3.10 — n/a**, no declaration to test against
(§1) and no pytest suite (`unittest`, invoked as `python3 <script>
--self-test`); vermin's 3.7 computation stands unchallenged.

**Bonus, `ocx-mirror-sdk`**: `uv run --python 3.11 --extra dev -m pytest
--collect-only -q` doesn't even get to collect — `uv` itself refuses:
```
error: The requested interpreter resolved to Python 3.11.15, which is incompatible with the project's Python requirement: `>=3.13` (from `project.requires-python`)
```
So this subject can't silently drift to an old interpreter the way `ocx/test`
did — `uv` enforces the declared floor as a hard gate at install time. The
open question isn't "will it break," it's "is 3.13 the right number and does
anything prove it" — and nothing does (§1, §3).

## 3. Verdict

| Subject | Declared | Computed | Collection @ declared floor | Cheap-tier | Recommendation | CI change |
|---|---|---|---|---|---|---|
| `ocx/test` | 3.10 | **3.12** | **FAILS — 4 errors** | n/a (blocked at collection) | **Raise the declaration to match reality.** `>=3.10` is not aspirational, it's wrong — the suite cannot even be collected on 3.10 or 3.11 today. | `strategy:` not needed (single-version project) — replace the implicit `astral-sh/setup-uv` step with `uv python pin 3.12` committed as `.python-version`, or add `env: UV_PYTHON: "3.12"` to the acceptance job in `verify-basic.yml`. |
| `grimoire/test` | 3.10 | **3.11** | **FAILS — 6 errors** | n/a | **Raise the declaration to 3.11** (proven, not guessed) and pin it, same as above — a `.python-version` file. | `.python-version` → `3.11`, or `env: UV_PYTHON: "3.11"` in `verify-basic.yml`'s acceptance job. |
| `ocx-sdk-python` | 3.12 | 3.12 | passes | 954/954 pass at 3.12/3.13/3.14/3.14t | **Nothing to do — this is the reference case.** | *(already correct)* `python: ['3.12', '3.13', '3.14']` |
| `index/bot` | 3.12 | 3.11 (conservative) | passes | 762/762 pass, 100% cov, at 3.12 and 3.14t | **Add a floor CI check** — the declaration happens to be honest today only because nobody has lowered it; nothing proves 3.12 specifically versus 3.13/3.14 either. Low priority: it already passes. | `.python-version` exists (3.12) and is honored by `uv sync` — add one `unit-matrix`-style job at `['3.12', '3.14']` to also prove the ceiling, mirroring `ocx-sdk-python`. |
| `ocx/.claude/hooks` | 3.10 | 3.7 | passes, 165/168 pass | (same run) | **No action** — declared floor is real and passing today. | none needed |
| `grimoire-lore/scripts` | *(none declared)* | 3.7 | n/a | n/a | **Drop the false claim, don't add a matrix for a number that doesn't exist.** Either fix the `python.yml` comment to say "no floor is declared; CI pins 3.11 as a policy choice, not a technical requirement," or add real PEP 723 `requires-python` headers to the scripts if a floor is actually wanted. | *(doc fix, not a CI fix)* |
| `ocx-mirror-sdk` | 3.13 | 3.11 | uv refuses to even try below 3.13 (hard gate) | not run at 3.13 in CI at all | **Add an explicit matrix at 3.13** (cheapest — makes the existing claim honest); if 3.13 was arbitrary, lower it to 3.11 (the proven floor) instead. Either is fine; leaving it unverified is not. | ```yaml\nstrategy:\n  matrix:\n    python: ['3.13']\n``` added to `ocx-mirror-sdk/.github/workflows/ci.yml`'s `verify` job (currently has no matrix at all). |

## 4. Generalized check

```bash
#!/usr/bin/env bash
# check-floor-tested.sh <project-dir> <repo-root>
# VIOLATION if requires-python's floor is never a version CI actually pins/matrices.
set -euo pipefail
proj="$1" root="$2"
py="$proj/pyproject.toml"
[ -f "$py" ] || { echo "SKIP: no pyproject.toml at $proj"; exit 0; }

floor=$(grep -oE 'requires-python[[:space:]]*=[[:space:]]*"[^"]*"' "$py" \
  | grep -oE '[0-9]+\.[0-9]+' | head -1)
[ -n "$floor" ] || { echo "SKIP: no requires-python declared at $proj"; exit 0; }

ci_versions=$(
  { grep -rhoE "python:? *:? *\[?'?[0-9]+\.[0-9]+" "$root/.github/workflows" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+';
    grep -rhoE 'python-version:? *"?[0-9]+\.[0-9]+' "$root/.github/workflows" 2>/dev/null | grep -oE '[0-9]+\.[0-9]+';
    cat "$proj/.python-version" 2>/dev/null || true; } | sort -u
)

echo "$ci_versions" | grep -qx "$floor" && exit 0   # pass — silent, no output

seen=$(echo "$ci_versions" | tr '\n' ' ' | sed 's/ $//'); [ -n "$seen" ] || seen="none"
echo "VIOLATION: $proj declares requires-python>=$floor but CI never pins/matrices $floor (versions actually seen: $seen)"
```

**Empty output is a pass.** Any line starting `VIOLATION:` is red;
`SKIP:` means the check didn't apply (no manifest, or no declared floor —
`grimoire-lore` correctly SKIPs rather than false-passing on a floor that
doesn't exist).

Watched it go red — three known-guilty subjects, live output:
```
$ ./check-floor-tested.sh ocx/test ocx
VIOLATION: ocx/test declares requires-python>=3.10 but CI never pins/matrices 3.10 (versions actually seen: none)
$ ./check-floor-tested.sh grimoire/test grimoire
VIOLATION: grimoire/test declares requires-python>=3.10 but CI never pins/matrices 3.10 (versions actually seen: none)
$ ./check-floor-tested.sh ocx-mirror-sdk ocx-mirror-sdk
VIOLATION: ocx-mirror-sdk declares requires-python>=3.13 but CI never pins/matrices 3.13 (versions actually seen: none)
```
And clean against the two subjects that do it right — no output:
```
$ ./check-floor-tested.sh ocx-sdk-python ocx-sdk-python
$ ./check-floor-tested.sh index/bot index
$
```
One bug caught building this, worth stating because it's the same defect
class the whole audit is about: the first draft used
`[ -f "$proj/.python-version" ] && cat ...` as the last statement inside a
`$(...)` substitution under `set -e` — when the file is absent (the common
case), that line's own exit status is 1, `set -e` treats the *assignment
statement* `ci_versions=$(...)` as having failed, and the whole script exits
silently with no output at all — which looks exactly like a pass. Fixed with
`cat ... 2>/dev/null || true`. A verification script is not exempt from "a
verification that cannot go red."

## 5. Free-threading (3.14t)

`uv python install 3.14t` → clean download (`cpython-3.14.6+freethreaded`),
`sys._is_gil_enabled()` confirms `False`. Both subjects tested (`ocx-sdk-python`
— the one with real `asyncio`/`threading.Lock` production code, and
`index/bot`) import cleanly, collect the same test count as every other
version, and pass their full cheap tier with unchanged counts (§2 tables).
**Clean result — no free-threading rule is needed yet.** Worth re-checking
once `ocx-sdk-python/src/ocx_sdk/_process.py`'s pump threads or
`_envmodel.py`'s `threading.Lock` see real free-threaded production traffic,
since GIL removal is exactly where an under-locked shared counter would first
misbehave — but nothing in this measurement shows it doing so.
