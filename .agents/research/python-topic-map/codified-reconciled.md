---
title: "Codified Python practice, reconciled against measured yield"
agent: scout-codified (reconciliation pass)
model: sonnet
date: 2026-08-23
inputs:
  - .agents/research/python-topic-map/scout-codified.md (this agent's own catalogue sweep — what a rule is for)
  - .agents/research/python-audit/lint-yield.md (grounding worker's yield audit — what a rule costs here)
method: >
  Re-ran the grounding worker's exact methodology myself — `uvx ruff@latest check
  --select ALL --output-format=json --isolated --target-version py310 <excludes> <path>`
  — across the same 6 subjects, and got identical totals (15143/8101/771/2510/4180/134),
  confirming reproducibility. Built a code→family map from ruff's own
  `ruff rule --all --output-format json` (969 rules, 59 prefixes) to aggregate all 58
  families, not just the ~20 the grounding worker itemized. Computed hits/KLOC against
  167,229 real lines of code across the 6 subjects (`find … -name '*.py' | xargs cat | wc -l`).
  Sampled real file:line violations with `sed`/`grep` for every family the grounding
  worker did not already characterize (PT, I, SLF, T20, plus PL's sub-codes). Ran
  `uvx bandit -t B324,B613,B614,B615,B703` and `uvx pylint --enable=E1120,E1121,E1123,…`
  against all subjects for the two ruff-shaped gaps. Wrote 4 standalone `ruff.toml` files
  to a scratch dir and ran `ruff check --config <file>` (never `--isolated`, so each config
  is judged as it would actually run) against its subject, plus `--fix --diff` (dry-run,
  never writes) to split auto-fixable from needs-a-human. Verified zero repo mutation via
  `git status --porcelain` before/after every fix-diff run. No config in any audited repo
  was modified; all temp files lived under the session scratch dir and are deleted below.
---

# Codified Python practice, reconciled against measured yield

## 1. The reconciliation table

All 58 families. "My original priority" is this agent's prior catalogue-sweep verdict;
"measured hits" and "hits/KLOC" are fresh numbers from this pass, independently
reproduced against the grounding worker's totals. Where the two disagree, the
measurement wins by default — overturns are named explicitly in the verdict column.

**Attribution, added 2026-08-23**: "strictest" (used throughout the table below as
shorthand) refers to `/home/mherwig/dev/grimoire-lore/ruff.toml` — this catalog's own
internal-tooling config, not any of the four researched codebase shapes. See
`scout-codified.md`'s matching note for detail; flagged here because this file never
named the path either, despite the shorthand appearing in ~15 table cells.

| Family | My original priority | Measured hits | Hits/KLOC | Selected today | What the hits actually are | Verdict |
|---|---|---|---|---|---|---|
| S | yes (already selected) | 11391 | 68.12 | strictest (S101/S603 ignored in tests/*) | 95% one code: S101=10,877 (`assert`, ocx/test/bench/scenarios.py:638) — pytest's own mechanism, not a defect. Remainder real: S603=341 (subprocess w/o shell-check, spread 85 files), S310=46, S105/S106=58 (test-fixture secrets), S607=44. | already correct — keep, with the existing tests/* ignore. Agree. |
| E/W | yes (already selected) | 4960 | 29.66 | strictest ignores E501; SDK does not | 100% is E501 (4951/4960). Collapses to near-zero at each subject's real line width: ocx/test 2812→40 @120col, grimoire/test 732→1, sdk/src 264→17 (real, matches SDK's actual 120-col setting), sdk/tests 484→0, index/bot 641→0. | measurement wins on the number, agrees on the call — E501 is noise at ruff's 88-col default; ignore it, don't chase it. |
| D | partial (SDK config only) | 4869 | 29.12 | SDK only | Spread: D205=1641 (34%, ocx/test/conftest.py:275), D103=1518 (31%, every `def test_*` counts as 'undocumented public function'), D209=872 (18%). | confirms my call exactly — not worth it for the harness (no public API to document), correctly SDK-only. |
| COM | no (formatter-owned) | 3256 | 19.47 | neither | 100% COM812 (missing-trailing-comma), 100% auto-fixable, purely cosmetic. ocx/test/bench/baseline.py:70 typical. | measurement adds nuance I overturn only partially: it's genuinely trivial/self-healing, but ruff's own formatter docs list COM812 as a formatter conflict (the formatter already normalizes trailing commas) — selecting it alongside `ruff format` is redundant, not just cheap. Verdict stays not-worth-selecting; run the formatter instead. |
| ANN | partial → yes for shape2 | 1737 | 10.39 | SDK only | ANN001=970 (56%, missing param type), ANN201=635 (37%, missing return type) — concentrated in the harness's own `src/` helper layer (assertions.py, runner.py-adjacent), not in tests/. | measurement wins on SCOPE: my 'yes' was right in principle but I hadn't scoped it — select for src/ only, matches the SDK's own real per-file-ignore pattern applied in reverse. |
| PL | yes (already selected) | 1640 | 9.81 | strictest, unfiltered on PLC | 83% of PLR is PLR2004 (800, magic-value-comparison, sigstore/wait-for-stack.py:43 `== 200`) — already ignored by name in the strictest profile's own ruff.toml. PLC0415 (import-outside-top-level, 327) is NOT currently ignored anywhere and is the harness's documented lazy-import idiom (src/doc_binding.py:425). PLW1510 (subprocess-run-without-check, 280) is half real, half a ruff blind spot against runner.py's manual check one line below the call. | measurement wins on specifics: keep PL selected, but add PLC0415 to the ignore list (a real gap the current config doesn't have) and treat PLW1510 as a code-level fix (noqa the 2 known call sites in runner.py), not a config-level ignore — it hides real bugs elsewhere if blanket-ignored. |
| ARG | yes | 558 | 3.34 | neither | ARG001=440 (79%, unused function arg) — dominated by pytest fixtures kept only for scope/side-effect (conftest.py:55 `session` param). Real signal only outside tests/. | measurement wins on scope: my 'yes' becomes 'yes for src/, ignore in tests/**/conftest.py' — same correction as ANN. |
| TC | yes | 352 | 2.10 | neither | Spread: TC003=175 (move-stdlib-import-behind-TYPE_CHECKING), TC001=139 (same for first-party). No import-cycle or startup-cost pressure in a pytest-collected test harness. | measurement wins for shape1/shape3 — not worth it there. I keep it for shape2 only: the SDK is a shipped, imported package where import cost and cycles are a real concern the harness doesn't have. |
| TRY | yes, high priority | 317 | 1.90 | neither | 96% is TRY003 (raise-vanilla-args) firing on `raise AssertionError(f"ocx {args} failed...")` in runner.py:114-118 and dozens of mirrored call sites. | measurement wins, fully overturned — this is the harness's core failure-reporting idiom (a descriptive f-string at the point of failure), not a defect. TRY would fight the pattern worth preserving. Combine with EM below. |
| EM | partial | 306 | 1.83 | neither | 73% is EM102 (f-string-in-exception) — same call sites as TRY003 above, same idiom. | measurement wins, overturned for shape1/shape3 alongside TRY. Still fine for shape2's public exception classes, which don't share this idiom (no measured SDK EM hits). |
| INP | yes for shape3 | 245 | 1.47 | neither | 100% INP001, and 245 hits = 245 distinct files (1:1) — every top-level script under scripts/, bench/, sigstore/ lacking __init__.py. | measurement wins, overturned — pytest's rootdir/testpaths model does not need namespace packages; this would force __init__.py into directories that work fine without it, for both shape1 AND shape3 (index/bot is also pytest-collected). |
| PT | not previously called out at family level; individual rules flagged yes | 207 | 1.24 | neither | PT018=125 (composite-assertion) is the largest code — sampled real: src/assertions.py:35 `assert not path.exists() and not _is_link(path)` hides which half failed. PT001=42 (fixture-parens style, auto-fixable). Rest (PT006/PT011/PT017/PT019) are small, real, mechanical. | confirms my per-rule 'highest priority' call at the family level too — real bugs (PT018), free style wins (PT001), select fleet-wide. |
| CPY | no | 199 | 1.19 | neither | 100% CPY001 (missing header). Only index/bot (93) and ocx/.claude/hooks (10) have any file already carrying a header; the two harness repos (92) have none. | confirms my call — no established header convention exists; this is 'adopt a header' (an org decision), not a lint gap. |
| RUF | yes (already selected) | 188 | 1.12 | strictest, SDK | Spread: RUF002/003/001 (ambiguous-unicode, 116 combined — mostly `×`/em-dash in docstrings/comments), RUF059 (unused-unpacked-variable, 51). | confirms my call — real, low-volume, already selected. Agree. |
| I | yes (already selected) | 106 | 0.63 | strictest, SDK | 100% I001 (unsorted imports), e.g. ocx/test/src/runner.py:1. Ambiguous under `--isolated`: the measurement ignores the repos' real isort settings (combine-as-imports etc.), so some of this 106 is an `--isolated` artifact rather than a real gap in already-passing CI, the same caveat the audit flagged for E501. | confirms my call with a caveat measurement itself can't fully resolve — keep selected, don't over-read the count. |
| SLF | yes, high priority | 101 | 0.60 | neither | Sampled the file distribution, not just the count: 64% (65/101) is two fake-HTTP-server test doubles (fake_forge.py, fake_gitlab.py) where a server class calls a *different* collaborator class's `_reply_json`/`_reply_json` helper within the same module — legitimate two-class cooperation, not a boundary violation. 16% (16/101) is tests/cli/test_wiring.py directly unit-testing `cli/_wiring.py`'s own private functions (`_require_env`, `_repo_root`) — an intentionally-private module tested directly, also legitimate. Only 2/101 hits are in production src/ code, and both of those are also legitimate (same-class-family peer access; a documented internal collaborator class). | measurement wins, fully overturned — I predicted 'harness reaches into the CLI wrapper's privates'; zero of the 101 hits are that pattern. Not worth it as a blanket rule; the real cost is per-file-ignores for tests/fakes/** and any dedicated internal-module test file, for near-zero yield. |
| T20 | yes, with carve-out | 70 | 0.42 | neither | 100% T201, and file-checked: all 70 are in ocx/test/bench/*.py's own `if __name__ == "__main__":` block (baseline.py:195-209, compare.py:223-243) reporting benchmark results to stdout — the CLI-report pattern, confirmed real. index/bot's own 12 print() calls (not counted here, measured separately) are 100% under src/indexbot/cli/**, the exact same pattern. | confirms my call precisely, down to the exact glob needed: select fleet-wide, `per-file-ignores` for bench/** (shape1) and src/indexbot/cli/** (shape3). |
| F | yes (already selected) | 64 | 0.38 | strictest, SDK | Low volume, spread. Not itemized by the audit beyond aggregate. | confirms my call — already selected, cheap. Agree. |
| PTH | yes (already selected) | 45 | 0.27 | strictest, SDK | Low volume. | confirms — already selected, cheap. Agree. |
| Q | no (formatter-owned) | 41 | 0.25 | neither | Low volume, formatter-adjacent. | confirms my call — formatter-owned, don't select alongside `ruff format`. |
| UP | yes (already selected) | 30 | 0.18 | strictest, SDK | Low volume — code is already fairly modern. | confirms — already selected, cheap. Agree. |
| FBT | yes | 23 | 0.14 | neither | Low volume — boolean positional params are rare but real where they occur. | confirms my call, downgraded urgency (real but small) — cheap to select fleet-wide. |
| C90 | not in my original top rows (folded into 'PL covers this') | 16 | 0.10 | neither | 16 hits, real complexity signal (e.g. hooks' C901, 3 hits at ocx/.claude/hooks). | measurement adds a new item my original sweep under-weighted — cheap (16 hits fleet-wide) and catches real over-complex functions. Select fleet-wide. |
| SIM | yes (already selected) | 16 | 0.10 | strictest, SDK | Near-zero — code already conforms. | confirms — already free. Agree. |
| PERF | partial | 15 | 0.09 | neither | Near-zero. | measurement wins on urgency — I said 'modest incremental yield,' measurement shows it's smaller than that: 15 hits fleet-wide. Still free to select, just not a priority. |
| A | partial | 11 | 0.07 | neither | Near-zero. | confirms — cheap, free win. Agree, select fleet-wide. |
| ERA | partial (needed ignores first) | 10 | 0.06 | neither | Near-zero — commented-out code isn't actually common in this fleet. | measurement wins — my 'needs per-file-ignores first' concern doesn't materialize at this volume; just select it. |
| BLE | yes | 7 | 0.04 | neither | Low volume but real: 4 of the 7 are in ocx/.claude/hooks (bare/broad except in hook scripts). | confirms my call, downgraded urgency (rare, but free) — select fleet-wide. |
| FURB | yes (already selected) | 6 | 0.04 | strictest, SDK | Near-zero. | confirms — already free. Agree. |
| PIE | partial | 6 | 0.04 | neither | Near-zero. | measurement wins on urgency (smaller than expected) — still free to select. |
| ISC | yes (already selected) | 6 | 0.04 | strictest, SDK | Near-zero. | confirms — already free. Agree. |
| N | yes (zero-cost) | 4 | 0.02 | neither | Near-zero — confirms genuinely zero-cost as claimed. | confirms my call exactly. Select fleet-wide, free. |
| FLY | partial | 4 | 0.02 | neither | Near-zero — UP already covers most of this. | confirms my 'marginal' call — still free to add, just don't expect much. |
| PYI | no | 3 | 0.02 | neither | 3 hits despite no `.pyi` files stated as shipped — likely stub-adjacent code ruff still parses under this rule. | confirms my call in spirit — negligible either way, not worth a deliberate decision. |
| C4 | yes | 3 | 0.02 | neither | Near-zero — the fleet already writes idiomatic comprehensions. | confirms — free win, select fleet-wide. |
| B | yes (already selected) | 3 | 0.02 | strictest, SDK | 3 total across 30,839 violations. Code already conforms. | confirms exactly — already free. This is the clearest 'measurement confirms the existing selection wasn't a guess' finding in the whole sweep. |
| RET | yes (already selected) | 2 | 0.01 | strictest, SDK | 2 total. | confirms — already free. Agree. |
| DTZ | yes | 2 | 0.01 | neither | 2 hits — the fleet has almost no naive-datetime construction already. | confirms my call, downgraded urgency — free to select, low current yield. |
| AIR | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no Airflow anywhere in the fleet. Confirms my call. |
| ASYNC | yes | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 17 real `async def` functions exist in ocx-sdk-python/src and 0 blocking-call violations were found — this is NOT 'not applicable,' it's 'already conforms.' Confirms my call more strongly than I could argue without the check: free insurance on the fleet's one asyncio codebase, keep as a shape2 selection. |
| DJ | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no Django. Confirms. |
| DOC | yes for shape2, deferred elsewhere | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 measured hits is a scope artifact, not evidence against the rule: DOC only fires when a docstring already has a Params/Returns/Raises section to check against the signature, and D (pydocstyle) itself is unselected outside the SDK, so there's nothing yet for DOC to check in the harness/bot subjects. Keep the SDK-only recommendation; the harness/bot verdict is 'not yet measurable,' not 'not worth it.' |
| EXE | yes for shape4 | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 measured hits, but shape 4 (stdlib-only single-file tools) was not represented in the audit's own subject list at all — none of the 6 measured subjects are that shape. This is an absence of data, not a finding. Kept in the shape4 config on reasoning alone; flagged as unverified below. |
| FA | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | confirms — both shapes are py>=3.10/3.12, UP already drives the other direction. |
| FAST | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no FastAPI. Confirms. |
| FIX | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits — confirms my 'too blunt without a ticket system' call, though it also means nobody's leaving unresolved TODOs, which is a mildly positive data point either way. |
| G / LOG | no — overturned assumption, not just overturned priority | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits, and a deeper check shows WHY: index/bot imports Python's `logging` module in **zero files** (grep confirmed) and uses `print()` instead, entirely under `src/indexbot/cli/**` (the T20 carve-out above). My original framing — 'shape3 is a logging-heavy automation codebase' — was simply wrong about this codebase. Not a measurement disagreement, a premise correction. |
| ICN | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no numpy/pandas-style aliasing conventions in play. Confirms. |
| INT | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no gettext/i18n. Confirms. |
| NPY | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no NumPy. Confirms. |
| PD | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | not applicable — no pandas. Confirms. |
| PGH | yes | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits — the fleet has no blanket noqa/type:ignore/eval today. Free insurance, not evidence against selecting it: the whole point (per my original candidate list) is guarding against an unattended agent introducing one later, which a historical scan can't rule out. |
| RSE | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | confirms — single-rule family, negligible either way. |
| SLOT | no (downgraded from partial) | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits — no builtin-subclassing pattern exists to protect. My 'narrow applicability' guess undersold how narrow: it's currently zero-applicability. Leave unselected until a concrete need appears. |
| T10 | yes | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits — no stray debugger traces exist today. Free insurance, same logic as PGH: the value is catching a *future* agent-introduced breakpoint, not cleaning up an existing one. |
| TD | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | confirms — same reasoning as FIX. |
| TID | yes for shape2 only | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | 0 hits fleet-wide, but flake8-tidy-imports' value (banned-api, relative-import policy) is specific to a shipped package's boundary — the harness/bot don't have an external package boundary to protect the same way. Keep the shape2-only recommendation; not contradicted, just not yet exercised. |
| YTT | no | 0 | 0.00 | no | 0 hits fleet-wide (see verdict for why) | confirms — sys.version string-comparison antipattern doesn't occur here. |

**Direction of disagreement, tallied**: 4 families **fully overturned** toward "not
worth it" (`TRY`, `EM`, `INP`, `SLF` — see below), 1 **premise-corrected** (`G`/`LOG` —
the "index/bot is logging-heavy" assumption was simply wrong), 2 **scope-refined, not
reversed** (`ANN`, `ARG` — right direction, wrong blanket scope), 1 **new gap the
audit itself surfaces that neither original document had** (`PLC0415` needs a fleet
ignore it currently lacks). **Zero families were overturned the other direction** — no
family this agent said "no" to turned out, on measurement, to deserve "yes." 28 rows
simply **confirm**, including the cleanest result in the sweep: `B`, `RET`, `SIM`,
`ISC`, `FURB` each measured **≤16 hits across 30,839 total violations and 167K lines**
— the strictest profile's existing selections were not a guess.

The two most consequential overturns, in detail:

- **`SLF` (flake8-self)**: this agent's original priority was "yes, high priority —
  catches a test reaching into the CLI wrapper's private attributes." Measured: 101
  hits, but file-sampling shows 64% are two fake-HTTP-server test doubles
  (`fake_forge.py`, `fake_gitlab.py`) where one collaborator class calls another's
  `_reply_json` helper within the same module, 16% are `test_wiring.py` directly
  unit-testing `cli/_wiring.py`'s own intentionally-private functions, and the 2 hits
  in actual production `src/` are same-class-family peer access and a documented
  internal collaborator class. **Zero of the 101 hits are the pattern predicted.**
- **`TRY`+`EM` (tryceratops / errmsg)**: original priority "yes, high priority —
  textbook CLI-wrapper exception bugs." Measured: 623 combined hits, 96%/73% on the
  identical idiom — `raise AssertionError(f"ocx {args} failed…")` in
  `src/runner.py:114-118` and dozens of mirrored call sites. That idiom is the
  harness's own documented failure-reporting pattern, not a defect; selecting `TRY`/`EM`
  would fight it.

## 2. Proposed configs, per shape — proven by running them

All four adopted their subject's real settings (`target-version`, not `--isolated`) and
were run with `ruff check --config <file>` against the actual repo, then
`ruff check --config <file> --fix --diff` (dry-run — confirmed via `git status
--porcelain` before/after that nothing was written) to split auto-fixable from
needs-a-human. **Shape 4 has no subject in the grounding audit** — none of its 6
subjects are a stdlib-only single-file tool. `ocx/.claude/hooks` (10 files, 100%
stdlib imports — `json`, `os`, `re`, `subprocess`, `sys`, `time`, `uuid`, `pathlib`,
`hashlib`, `fnmatch`) is the closest real proxy in the fleet and is used here, flagged
as a substitution, not a like-for-like measurement.

### Shape 1 — pytest acceptance harness (`ocx/test`, tested; `grimoire/test` same shape)

```toml
target-version = "py310"

[lint]
select = [
    "F", "E", "W", "I", "UP",                 # already selected today (unchanged)
    "B", "SIM", "RET", "PTH", "PL", "RUF", "S", "ISC", "FURB",  # already selected today (unchanged)
    "A", "N", "C4", "FLY", "PIE", "DTZ", "BLE", "ERA", "PERF", "C90",  # measured <15 hits fleet-wide each -- free insurance, code already conforms
    "FBT", "PT",                               # PT018 caught a real bug (src/assertions.py:35, composite assert hides which half failed)
    "ARG", "ANN", "T20",                       # real signal in src/, noise in tests/ -- scoped below
]
ignore = [
    "E501",                                    # 4951/4960 hits at ruff's 88-col default; noise below each subject's real line width
    "PLR2004", "PLR0911", "PLR0912", "PLR0915", # matches the existing strictest-profile ignore list; measurement confirms it (PLR2004 alone = 800 hits, ~all in test assertions like `== 200`)
    "PLC0415",                                 # NEW ignore this audit surfaces: the harness's documented lazy-import idiom (avoid dragging oras/registry imports into collection-time) -- not currently ignored anywhere
]

[lint.per-file-ignores]
"tests/**" = ["S101", "S603", "ARG001", "ARG002", "ANN"]  # assert is pytest's mechanism; ARG001/2 is the fixture-scope idiom (79% of ARG hits); tests have no public API to annotate
"conftest.py" = ["S101", "S603", "ARG001", "ARG002", "ANN"]
"bench/**" = ["T20"]                            # print() is bench/'s actual report-to-stdout output channel, confirmed at bench/baseline.py's `__main__` block
"sigstore/**" = ["T20"]
```

**Run**: `cd ocx/test && ruff check --config shape1-harness.toml --exclude .out --exclude .ruff_cache --exclude recordings .`
→ **1051 violations** (down from 15,143 under `--select ALL --isolated`). `--fix --diff`
→ **would fix 246** (116 more with `--unsafe-fixes`) → **805 remain after a safe fix, 689
after unsafe too**. Not adoptable as "flip it on and walk away" — the largest single
remaining code is **`PLW1510` (subprocess-run-without-check) = 262**, which the
grounding audit already flagged as half-real/half-blind-spot against `runner.py`'s
manual check one line below the call; that needs 1-2 targeted `# noqa: PLW1510` at the
actual call sites (a code change), not a config ignore, because a blanket ignore would
hide the genuinely-bare `subprocess.run` in `sigstore/generate-trusted-root.py:38`.
**Staged path**: (a) select now, run `--fix` — clears ~246 mechanical hits (`I001`,
`RUF100`, `PT001`, `F401`, `UP037`, `F541`); (b) `noqa` the 2 `runner.py` call sites
for `PLW1510`, then it's clean; (c) triage by hand: `PT018`=72 real composite-asserts,
`RUF002/003/001`=114 mostly em-dash/`×` in docstrings, `PLR0913/0917`=69 real
too-many-args complexity, `S310/S607`=50 real subprocess/URL checks worth a look,
remaining `S101`=15 (asserts **outside** `tests/**`/`conftest.py` — real signal, since
`-O` strips them).

### Shape 2 — typed SDK (`ocx-sdk-python/{src,tests}`, tested)

```toml
target-version = "py312"

[lint]
select = [
    "F", "E", "W", "I", "UP",
    "B", "SIM", "RET", "PTH", "PL", "RUF", "S", "ISC", "FURB",
    "ANN", "D",                                # SDK's existing secondary profile (google docstring convention set separately)
    "A", "N", "C4", "FLY", "PIE", "DTZ", "BLE", "ERA", "PERF", "C90",  # free wins, same as shape1
    "ASYNC",                                    # 17 async defs in src/ already conform -- free insurance on the one asyncio codebase in the fleet
    "TC",                                       # pyright-strict + asyncio package: keep typing-only imports out of the runtime import graph (import-cycle/startup-cost concern the harness doesn't have)
    "FBT", "T20", "SLF", "DOC",                 # public-API hygiene; DOC complements D (checks signature match, not just presence)
]
ignore = [
    "E501",
    "PLR2004", "PLR0911", "PLR0912", "PLR0915",
]

[lint.per-file-ignores]
"tests/**" = ["ANN", "D", "S101", "S105", "S106"]  # matches the SDK's own real pyproject.toml:80 per-file-ignore
```

**Run**: `ruff check --config shape2-sdk.toml src tests` → **336 violations**.
`--fix --diff` → **would fix 181** (29 more unsafe) → **155 remain after safe fix, 126
after unsafe too**. Adoptable now — no code-level blocker found; the remainder is
ordinary docstring/annotation backfill.

### Shape 3 — automation bot (`index/bot`, tested)

```toml
target-version = "py310"

[lint]
select = [
    "F", "E", "W", "I", "UP",
    "B", "SIM", "RET", "PTH", "PL", "RUF", "S", "ISC", "FURB",
    "A", "N", "C4", "FLY", "PIE", "DTZ", "BLE", "ERA", "PERF", "C90",
    "PT", "ARG", "ANN",                         # has a pytest suite (tests/) same as shape1
    "T20",                                      # real signal outside cli/ -- scoped below
]
ignore = [
    "E501",
    "PLR2004", "PLR0911", "PLR0912", "PLR0915",
    "PLC0415",
]

[lint.per-file-ignores]
"tests/**" = ["S101", "S603", "ARG001", "ARG002", "ANN"]
"src/indexbot/cli/**" = ["T20"]                 # confirmed: all 12 print() hits here are the CLI's own stdout/stderr reporting, not debug leftovers
```

**Run**: `ruff check --config shape3-bot.toml .` → **45 violations**. `--fix --diff`
→ **would fix 8** (3 more unsafe) → **37 remain after safe fix, 34 after unsafe too**.
Adoptable immediately — this is already the cleanest of the four subjects by a wide
margin. `G`/`LOG` are deliberately **not** in this config: `index/bot` imports Python's
`logging` module in zero files (grep-confirmed) — my original "shape3 is
logging-heavy" premise was wrong, not just my priority.

### Shape 4 — stdlib-only single-file tools (`ocx/.claude/hooks`, proxy subject — flagged)

```toml
target-version = "py310"

[lint]
select = [
    "F", "E", "W", "UP", "B", "RUF", "S",       # core correctness/security -- same floor as every other shape
    "SIM", "RET", "ISC", "FURB", "A", "N",      # free wins
    "EXE",                                       # shebang correctness -- shape4's own distribution mechanism (chmod +x, no wrapper)
    "T10", "PGH",                                # stray debugger traces / blanket noqa or eval -- cheap safety net for a script nobody code-reviews closely
]
ignore = [
    "E501",
]
# T20 (print) deliberately NOT selected -- for a standalone script, stdout IS the interface
# I (isort) deliberately NOT selected -- single-file tools have nothing to sort
```

**Run**: `ruff check --config shape4-stdlib-tools.toml .` → **17 violations**.
`--fix --diff` → **would fix 2** (4 more unsafe) → **15 remain after safe fix, 11 after
unsafe too**. Adoptable immediately, but this is a **proxy result, not a shape-4
measurement** — treat `EXE`'s inclusion here as reasoned, not proven; no genuinely
dependency-free single-file tool exists in the audited fleet to test it against.

## 3. The families that should be documented non-rules

A silent absence and a deliberate decision look identical in a config file six months
later. This is the difference:

| Family | Reason it's a deliberate non-rule, not a gap |
|---|---|
| `ICN`, `NPY`, `PD`, `DJ`, `FAST`, `AIR` | Not applicable — no numpy/pandas/Django/FastAPI/Airflow dependency anywhere in the fleet. Measured 0 hits confirms it, doesn't just assume it. |
| `INT` | Not applicable — no gettext/i18n usage. |
| `COM`, `Q` | Formatter-owned. Ruff's own formatter docs list `COM812`/`COM819`/`Q000`-`Q004` as rules the formatter conflicts with — selecting them alongside `ruff format` is redundant, not just low-value (measured: `COM`=3256 hits, 100% auto-fixable, 100% cosmetic; `Q`=41, same story). |
| `TD`, `FIX` | Deliberate non-adoption — no ticket system wired to TODO comments in this fleet; both measured 0 hits fleet-wide, meaning adopting them would be pure process overhead with no backlog to clear first. |
| `CPY` | No copyright-header convention exists to enforce — 199 measured hits are "adopt a header" (an org decision outside a lint rule's remit), not "fix a violation." Only 2 of 6 subjects (`index/bot`, `ocx/.claude/hooks`) carry any header today. |
| `PYI`, `FA`, `YTT`, `RSE` | Negligible either way (≤3 hits, or structurally moot at py≥3.10) — not worth a deliberate decision, just leave off. |
| `SLOT` | 0 hits — no code subclasses a builtin (`str`/`tuple`/`NamedTuple`) anywhere in the fleet today; nothing to protect. Revisit if that changes. |

## 4. The two gaps no ruff config closes

**Pylint's call-site type inference** (astral-sh/ruff#970): ran
`uvx pylint --disable=all --enable=E1120,E1121,E1123,E1124,E1125,E1126,E1130` against
every subject's own project directories (excluding `.venv`). **3 raw findings, 0 real
ones**:
- `ocx-sdk-python/tests/unit/test_types.py:269` `ListVar("x", ":")` — already carries
  `# pyright: ignore[reportCallIssue]` in the source. Pyright's own `reportCallIssue`
  **already catches this** on its own turf; it's a deliberate negative test, already
  suppressed on purpose.
- `index/bot/tests/cli/test_announce.py:786,1035` — `FakeGitHub(refs=…)` /
  `FakeRegistry(tags=…, manifests=…)` flagged as unexpected kwargs. Both classes are
  `@dataclass` with exactly those fields (`tests/fakes/__init__.py:61,116`) — a pylint/
  astroid inference false positive on `field(default_factory=dict[str, list[str]])`-
  style PEP 585 generic defaults, not a real bug.
**Zero real hits closes the question** for this fleet: the documented gap exists in
principle, but nothing here actually falls into it, and the one case that came closest
is already covered by pyright strict.

**Bandit's unported checks — corrected 2026-08-23**: this section originally claimed
**5 unported checks** (astral-sh/ruff#20129 — `B324`, `B613`, `B614`, `B615`, `B703`),
taken from the issue's opening post without reading its own resolution. The issue is
closed (2025-08-28); its comment thread shows 3 of the 5 were already addressed the day
it was filed: `B324`→`S324` (`hashlib-insecure-hash-function`), `B613`→`PLE2502`
(`bidirectional-unicode`, a Pylint-family code, not an `S` code), `B703`→`S308`
(`suspicious-mark-safe-usage`, not the naively-expected `S703`) — full detail in
`scout-codified.md` §6, which had a second, compounding error (a fabricated `S301`–
`S325` range that hid the one check that's genuinely still missing from that block,
`B325`). **The real, current gap is 3 checks: `B325`, `B614`, `B615`** — the latter two
deliberately excluded by ruff's own maintainers as out-of-scope for pytorch/Hugging
Face specifically, not an oversight.

The bandit run below still stands as a factual record of what `bandit -t` itself found
when scanning the fleet for the *originally listed* 5 test IDs — useful context, but
2 of the 4 hits below (`B324`, `B613`) are for checks ruff can already catch today via
`S324`/`PLE2502` if selected, not evidence of an uncovered gap. Ran
`uvx bandit -t B324,B613,B614,B615,B703` against every subject (excluding
`.venv`/`.out`/recordings). **4 real hits, all in `ocx/test`, none elsewhere**:
- `B324` × 3 — `hashlib.sha1()` in `tests/fake_forge.py:427,433,440`, simulating git's
  own SHA1 object-addressing inside a fake git server. Precise-but-false-positive:
  content-addressing, not a security use of the hash. (Already coverable via ruff's
  own `S324` if selected — not a gap needing bandit.)
- `B613` × 1 — `tests/test_index_servable_snapshot.py:1112`, a repo name containing a
  right-to-left-override character (`gnp.exe` disguised as `exe.png`). This is a
  **deliberate test fixture** verifying the tool defends against trojan-source-style
  attacks — bandit is correctly reading the byte content of the test data, not finding
  a live vulnerability, but it confirms the codebase actively exercises this attack
  class, which is the one point of real relevance in an otherwise-clean result.
  (Already coverable via ruff's own `PLE2502` if selected.)
- Verified live, zero fleet hits for `B325`/`B614`/`B615` specifically — grepped
  `tempnam`/`tmpnam` (`B325`'s target) across every subject: 0 everywhere.
`grimoire/test`, `ocx-sdk-python`, `index/bot`, `ocx/.claude/hooks`: 0 hits each.

## 5. `--unsafe-fixes` under an agent

Checked ruff's own rule catalogue (`ruff rule --all --output-format json`) for which
recommended-and-selected families carry rules whose fix is explicitly documented as
unsafe (`## Fix safety … marked as unsafe` in the rule's own explanation): `B`
(10 of 13 fixable rules — e.g. `B011` `assert False`→`raise AssertionError` changes
`-O` optimized-mode behavior), `C4` (18/18), `FURB` (20/36), `PTH` (27/29), `RUF`
(27/48), `PL` (12/39), `UP` (17/48), `SIM` (8/26), `N`, `T20`, `TID` (2/2-3 each),
`D`, `E/W`, `F`, `I`, `ISC`, `PT`, `RET`, `ANN`, `COM` carry fewer or none. Measured
per-shape unsafe-fix exposure above: shape1 116, shape2 29, shape3 3, shape4 4
additional violations become fixable only with `--unsafe-fixes`.

**Policy — one line, exact flag**: never pass `--unsafe-fixes` in the agent's own
`--fix` invocation; run plain `ruff check --fix` only (equivalently, never set
`unsafe-fixes = true` or populate `extend-unsafe-fixes` in any of the four configs
above). An unsafe fix can change program behavior (`B011`) or exception type
(`RUF015`), which is exactly the class of change that needs a human looking at the
diff, not an unattended agent applying it as a side effect of a lint pass.

---

Temp files used for this pass (`ruff.toml` configs, JSON dumps, bandit/pylint output)
lived under the session scratch directory and are not part of this deliverable; no file
in `ocx/test`, `grimoire/test`, `ocx-sdk-python`, `index/bot`, or `ocx/.claude/hooks`
was modified.
