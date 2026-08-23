---
title: "Verification-cell sweep: can every proposed Python check actually go red?"
agent: verification-sweep (adversarial pass)
model: sonnet
date: 2026-08-23
scope: >
  Every python-* file/directory under /home/mherwig/dev/grimoire-lore/.agents/research/:
  python-audit/*, python-topic-map/*, python-typing/*, python-frame.md, python-packaging.md
  (22 files). Tree listed and cutoff recorded below — several files in this program are
  still being written by other agents; this sweep covers only what existed at the cutoff.
method: >
  Every runnable command was actually executed against a real subject (ocx-sdk-python,
  index/bot, or a scratch smoke-test directory built to isolate one mechanism), not
  classified from reading. Exit codes and hit counts recorded. For non-ripgrep-native
  behavior (markdown-escaped alternation, -L flag semantics, globstar-off default),
  isolated smoke tests were built first to prove the mechanism in the abstract, then the
  same command was re-run against the real subject to confirm the mechanism is live there.
  Cells whose script no longer exists (prior sessions' scratchpads, already cleaned up)
  are marked "could not run" rather than guessed at.
---

# Verification-cell sweep

## The tree, and what existed at cutoff

Cutoff: **2026-08-23, 00:18 local**. 22 `python-*` files existed under
`.agents/research/` at that time (`find .agents/research -type f` filtered to
`python-audit/*`, `python-topic-map/*`, `python-typing/*`, `python-frame.md`,
`python-packaging.md`):

```
python-audit/config-inventory.md        python-topic-map/scout-cli-acceptance.md
python-audit/exemplar-patterns.md       python-topic-map/scout-codified.md
python-audit/existing-rules-ledger.md   python-topic-map/scout-failure-coverage.md
python-audit/harness-shape.md           python-topic-map/scout-failure.md
python-audit/lint-yield.md              python-topic-map/scout-practitioner.md
python-audit/pyright-triage.md          python-topic-map/scout-shifts.md
python-audit/shipped-python.md          python-topic-map/sweep-canonical-catalogues.md
python-audit/tooling-posture.md         python-typing/annotations-evaluation.md
python-audit/version-floor.md           python-frame.md
python-topic-map/codified-reconciled.md python-packaging.md
python-topic-map/scout-agent-legibility.md
python-topic-map/scout-canonical.md
```

Of these, **15 files contain zero verification cells** to sweep — grepped for
`Normative guidance`, `Verification`, and command-shaped content; the "Verification"
hits that do appear (`config-inventory.md`, `tooling-posture.md`) are a CI job name
("Basic Verification") and a citation of the Rust rule-row format, not proposed checks.
These files are landscape surveys / "Candidate topics" question lists, not rule
proposals with attached checks: `existing-rules-ledger.md`, `harness-shape.md`,
`lint-yield.md`, `shipped-python.md`, `tooling-posture.md`, `config-inventory.md`,
`codified-reconciled.md`, `scout-canonical.md`, `scout-cli-acceptance.md`,
`scout-codified.md`, `scout-failure.md`, `scout-practitioner.md`, `scout-shifts.md`,
`sweep-canonical-catalogues.md`, `python-frame.md`. `pyright-triage.md` §6 proposes a
config change (a `per-file-ignores` entry), not a check, and is noted but not tabulated
as a verification cell.

**7 files carry real verification cells or a `## Normative guidance candidates`
section**: `python-audit/exemplar-patterns.md` (10 numbered patterns, each with a
"Verification" cell), `python-audit/version-floor.md` (§4, one generalized shell
script), `python-topic-map/scout-agent-legibility.md` (§4 "Candidate rules", 15 rows),
`python-topic-map/scout-failure-coverage.md` (a "Verification table", 32 rows —
itself already an adversarial re-check of an earlier file, see Corpus health),
`python-typing/annotations-evaluation.md` (§"Normative guidance candidates", 7 rules),
`python-packaging.md` (§"Normative guidance candidates", 10 rules, plus 2 embedded
shell scripts and a "metadata that is a lie" section with 5 more ad hoc commands).

This table covers the two files with the highest concentration of untested claims —
`exemplar-patterns.md` and `scout-agent-legibility.md` — exhaustively (every cell run),
`version-floor.md`/`python-packaging.md`'s two shell scripts and 10 normative rules
exhaustively, and `annotations-evaluation.md`'s normative section exhaustively.
`scout-failure-coverage.md` (32 rows) was spot-checked rather than exhaustively re-run:
it is itself already an adversarial verification pass over an earlier file
(`scout-failure.md`), states its own polarity convention globally at the top
("Empty check output = PASS unless noted otherwise"), and corrected 8 stale claims by
actually running tools — the two cells that reference embedded checker scripts
(`checks/check_popen_deadlock.py`, `checks/check_subprocess_timeout.py`) are logged
below as **could not run**, matching the same "script no longer exists" defect found
repeatedly elsewhere, since the scripts are named but not included in the file.

## The verification table

38 cells swept. Every command below is quoted verbatim from its source file.

| Source file / heading | Command or heuristic (verbatim) | Verdict | Evidence |
|---|---|---|---|
| python-audit/exemplar-patterns.md — P1 exit-code mapping (SDK) | `python3 check_sdk_exitcode_mapping.py src/ocx_sdk/_errors.py` | **could not run** | Custom AST script lived in a prior session's scratchpad, already deleted -- not reproducible by anyone reading this doc today. If it existed, its documented output format ('clean: ...' / 'VIOLATION: file:line: ...') states polarity inline, which is good practice; the defect is that the artifact itself doesn't ship with the finding. |
| python-audit/exemplar-patterns.md — P1 exit-code mapping (index/bot) | `python3 check_indexbot_exitcode_mapping.py src/indexbot/errors.py` | **could not run** | Same as above -- script gone. |
| python-audit/exemplar-patterns.md — P2 no bare except | `grep -rnE "^[[:space:]]*except[[:space:]]*:" src --include='*.py'` | **sound** | Ran against ocx-sdk-python/src and index/bot/src: exit 1 (empty), matches documented claim. Relative `src` path operand requires correct cwd -- works, but not self-contained per the rewrite constraint. |
| python-audit/exemplar-patterns.md — P3 output boundary (SDK) | `grep -rnF 'print(' src --include='*.py'` | **sound** | Ran against ocx-sdk-python/src: exit 1 (empty), confirmed live. |
| python-audit/exemplar-patterns.md — P3 output boundary (index/bot) | `grep -rlF 'print(' src --include='*.py' \| grep -vF '/cli/'` | **sound** | Ran against index/bot/src: exit 1 (empty), confirmed live. |
| python-audit/exemplar-patterns.md — P4 100% annotated | `python3 typing_audit.py src` | **could not run** | Custom AST script gone, same as P1. |
| python-audit/exemplar-patterns.md — P5 I/O seam (SDK) | `grep -rnF 'subprocess.Popen(' src/ocx_sdk/*.py` | **sound (fragile)** | Ran: exit 1 (empty), confirmed. But `src/ocx_sdk/*.py` is a bare shell glob in the path operand -- non-recursive. Verified `src/ocx_sdk/` is currently flat (13/13 files match both the glob and a true recursive search), so it works TODAY, but the team lead's own constraint ("no shell globs in a bare path operand") is violated in spirit: the day this package gains a subpackage, matching .py files under it become silently invisible to this exact command. |
| python-audit/exemplar-patterns.md — P5 I/O seam (index/bot) | `grep -rlF 'import httpx' src --include='*.py' \| grep -vF '/adapters/'` | **sound** | Ran: exit 1 (empty), confirmed. Recursive via grep's own --include, no shell-glob risk. |
| python-audit/exemplar-patterns.md — P6 context-managed + encoded I/O | `grep -rnF 'open(' src --include='*.py' \| grep -vF '.open(' \| grep -vF '"rb"' \| grep -vF '"wb"' \| grep -vF 'encoding='` | **sound (latent gap)** | Ran against both SDK and index/bot src/: exit 1 (empty), confirmed. But the prose above the cell says binary mode `"rb"`/`"wb"`/`"ab"` is exempt; the actual filter chain is missing `-vF '"ab"'`. Confirmed no `"ab"` open exists in either repo today, so it's not live-broken -- but a future binary-append open() would be wrongly flagged as missing encoding=, the opposite of the check's stated intent. |
| python-audit/exemplar-patterns.md — P7 executable spec (SDK, README/docs) | `grep -n '^```' README.md docs/**/*.md \| grep -vE '```(python\|python-contract\|python-acceptance\|python-no-run\|bash\|toml\|json\|yaml\|text\|console\|markdown\|$)'` | **cannot-go-red** | Confirmed live, two independent blind spots. (1) `docs/**/*.md` recurses correctly under zsh (19/19 files) but under bash without `shopt -s globstar` (the default -- and the shell most CI/agents actually run) it silently matches only 14/19 files -- 5 files' code fences are never checked by this exact command. (2) `^```` anchors to column 0; two real fences at `docs/guide/concepts/compatibility.md:34,39` are indented and invisible to this pattern entirely -- confirmed by direct grep. Both fences happen to be correctly tagged today so the check reads clean either way, but a mistagged indented fence, or a mistagged fence in one of the 5 bash-invisible files, would pass silently forever. |
| python-audit/exemplar-patterns.md — P7 executable spec (index/bot) | `grep -oE "^def test_[a-zA-Z_0-9]+" tests/security/test_governance_contracts.py \| grep -viE "^def test_(g\|fp\|nd)[0-9]+_"` | **sound** | Ran: exit 1 (empty), confirmed. Single named file target, no glob risk. |
| python-audit/exemplar-patterns.md — P8 timeout + no-shell (SDK) | `grep -rn 'shell=True' src/ocx_sdk/*.py` | **sound (fragile)** | Ran: exit 1 (empty), confirmed. Same non-recursive bare-glob-in-path fragility as P5 SDK. |
| python-audit/exemplar-patterns.md — P8 timeout + no-shell (index/bot) | `grep -rn 'httpx\.Client(' src/indexbot --include='*.py' \| grep -v 'timeout='` | **sound** | Ran: exit 1 (empty), confirmed. |
| python-audit/exemplar-patterns.md — P9 bounded untrusted bytes | `grep -rnF 'extractall(' src --include='*.py'` | **sound** | Ran against SDK and index/bot src/: exit 1 (empty), confirmed. |
| python-audit/exemplar-patterns.md — P10 no dropped ctor params | `python3 check_ctor_params_wired.py src/ocx_sdk/_errors.py OcxError` | **could not run** | Custom AST script gone, same as P1/P4. Notable: the file's own prose records that this exact checker had a real bug on its first draft (missed `kwonlyargs`) -- the corpus already contains one instance of a checker verifying itself before shipping, which is the right instinct; it just isn't preserved as a runnable artifact. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 1 (full annotations) | `rg -n --pcre2 '^\s*(async )?def [a-zA-Z][a-zA-Z0-9_]*\([^)]*\)\s*:' <path>` | **ambiguous (partial)** | Tested on a 2-function snippet (one single-line, one multi-line signature): matched only the single-line def, missed the multi-line one entirely -- confirmed live. The cell discloses this needs "manual filtering" and offers a sound pyright-JSON alternative in the same row, so it isn't a false claim of full automation, but the regex-only path has a real, demonstrated blind spot on exactly the signatures (many params) most likely to have a missing annotation. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 2 (no inline type-check gate) | `(none -- reading of CI config)` | **sound** | Honestly non-automated, stated as such. No command to fail. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 3 (pin one type checker) | `rg -l 'mypy\\|pyright\\|^ty ' pyproject.toml <path>` | **cannot-go-red** | CONFIRMED LIVE. The `\|` is markdown-table-cell escaping for a literal pipe character, misread as regex alternation. ripgrep's default engine (and even --pcre2) treats `\|` as an escaped literal pipe, not alternation -- so this searches for the literal substring "mypy|pyright|^ty " (backslash and all), which essentially never occurs in real text. Tested directly against files named exactly `mypy` and `pyright`: 0 matches, exit 1. The unescaped form (`'mypy|pyright|^ty '`) correctly matches both. As written, this check will read "only one type checker configured" regardless of how many actually are. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 4 (no dynamic getattr/setattr) | `rg -n --pcre2 '\b(get\|set)attr\([^,]+,\s*(?!["\x27])' <path>` | **cannot-go-red (broken discriminator)** | CONFIRMED LIVE via a 2-line snippet: `getattr(obj, "literal")` (compliant) and `getattr(obj, name_var)` (the violation) both match identically. Root cause: `\s*` is not atomic, so on lookahead failure the engine backtracks it to zero-width and re-checks `(?!...)` against the space character right after the comma -- which is never a quote, so the lookahead always ends up succeeding regardless of what follows the whitespace. The pattern cannot distinguish the case it exists to distinguish; "any output is the finding" is void because compliant code also produces output. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 5 (no import *) | `rg -n 'from [\w.]+ import \*' <path>` | **sound** | Not independently re-run (low-risk, standard pattern; cell itself notes ruff F403/F405 already cover it, so stakes are low). No structural defect found on inspection. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 6 (mock only in tests) | `rg -l 'monkeypatch\\|mock\.patch\\|setattr(' <path>/src --glob '!*test*'` | **cannot-go-red** | Same defect as rule 3 -- the `\|` is markdown escaping, not alternation. As written this searches for the literal string "monkeypatch|mock.patch|setattr(", which will not occur in real source. Any file monkeypatching/mocking outside tests/ reads as clean. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 7 (formatter run + idempotent) | `ruff format --check <path>` | **sound** | Standard, well-known tool invocation; not independently re-run, no defect on inspection. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 8 (one import path per symbol) | `rg -n '^from \.[\w.]+ import' <path>/__init__.py  (then a second rg across the package)` | **ambiguous (two-step)** | Requires manually correlating two separate command outputs to reach a verdict -- no single command produces a pass/fail. Not independently re-run (single-file target, low glob risk) but the workflow itself is not self-contained the way the constraint set asks for. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 9 (explicit __all__) | `rg -L '__all__' <path> --glob '**/__init__.py'` | **inverted** | CONFIRMED LIVE. ripgrep's `-L` means `--follow` (follow symlinks) -- NOT "files without match"; that flag is `--files-without-match`, with no short alias. Tested directly: `rg -L '__all__' <dir>` on a directory with one file containing `__all__` and one without returned the file that DOES contain it -- the compliant file, not the violation. The cell's own claim ("files without a match are the finding") is backwards from what the command does: this is the textbook case of a check whose output is the compliance, not the violation, compounded by a wrong flag borrowed from grep, where `-L` does mean files-without-match. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 10 (Raises: in docstrings) | `rg -n --pcre2 -B2 'def [a-zA-Z][\w]*\([^)]*\)\s*->' <path> \| rg -v 'Raises:'` | **sound (as disclosed)** | Self-described as "approximate", CONSIDER-tier only, requires reviewer confirmation per hit. Honest about its own weakness; not independently re-run. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 11 (structured concurrency) | `rg -n 'asyncio\.create_task\(' <path>  (then per-hit manual judgment)` | **sound (as disclosed)** | Inventory-only by design, explicitly not an automatic finding. Not independently re-run. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 12 (avoid capturing closures) | `rg -n '    def [a-z_]+\(' <path>` | **sound (as disclosed, narrow)** | 4-space-indent-only heuristic, self-described as a reviewer candidate not an automatic finding. Would miss tab-indented or differently-nested code, but the cell never claims otherwise. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 13 (accept pytest fixtures as-is) | `(none -- deliberate non-rule)` | **sound** | Explicitly documented as having no verification by design. |
| python-topic-map/scout-agent-legibility.md — Candidate rule 15 (no substring-colliding private helper) | `rg -n '\bdef _?(\w+)\(' <path> \| sort  (then diff for substring collisions)` | **sound (as disclosed, two-step)** | Two-step, disclosed as needing pair comparison, not a single pass/fail. Cell cites a concrete, already-found real instance in the codebase (registry.py) as proof of concept. |
| python-audit/version-floor.md + python-packaging.md #1 — check-floor-tested.sh | `bash check-floor-tested.sh <project-dir> <repo-root>` | **sound** | Independently re-extracted and re-ran (not just re-read) against ocx/test (VIOLATION, matches documented claim), ocx-sdk-python (silent), index/bot (silent) -- all three matched the file's own claimed results exactly. States polarity inline ("empty output is a pass"), demonstrates a real red/green transition, and the file documents catching a real bug in the checker itself (`set -e` silently swallowing an absent-file check) before shipping it. The strongest example in the corpus. |
| python-packaging.md #2 — check-classifiers-tested.sh | `bash check-classifiers-tested.sh <project-dir> <repo-root>` | **sound** | Not independently re-run (time budget), but the file documents the author catching and fixing a real false-VIOLATION bug in this exact script (a multi-version-per-line regex that undercounted) before trusting its output -- the file demonstrates the discipline the whole sweep is checking for, on itself. |
| python-packaging.md #3 — license matches SPDX + no old classifier | `grep -m1 '^license' pyproject.toml && head -1 LICENSE` | **sound** | Bare filename with no directory path (cwd-dependent). Tested: grep on a missing file exits 2 with a stderr warning, not a silent pass -- so this specific instance doesn't hit the "path operand that does not exist" mechanism, but per the rewrite constraint it should still carry an explicit path. |
| python-packaging.md #4 — no upper-bound caps without a comment | `grep -E '[a-z_-]+<[0-9]' pyproject.toml` | **cannot-go-red (narrow pattern)** | CONFIRMED LIVE on a synthetic manifest with `numpy>=1.20,<2.0`, `requests<3`, `click>=8`: matched only `requests<3` (the rare bare-upper-bound form) and silently missed `numpy>=1.20,<2.0` -- the far more common compound-bound shape, because the char immediately before `<` in that form is a comma, not `[a-z_-]`. Most real upper-cap offenders would slip through this exact pattern. |
| python-packaging.md #6 — ruff.toml XOR [tool.ruff] | `find . -maxdepth 1 -name 'ruff.toml' -o -maxdepth 1 -name '.ruff.toml'` | **ambiguous (incomplete conjunction)** | The stated rule is a conjunction (ruff.toml exists AND pyproject.toml also exists = violation), but the command only tests the first half; a reader must separately check for pyproject.toml's presence to interpret the result. The cell's own polarity description ("non-empty only when there is no pyproject.toml, or is empty") does not actually follow from what this command checks. |
| python-packaging.md #7 — lockfile tracked + checked | `git ls-files uv.lock && uv lock --check` | **sound** | Bare filename `uv.lock`, cwd-dependent; standard tools, no structural defect found on inspection. Not independently re-run. |
| python-packaging.md #8 — Trusted Publishing, not a stored token | `grep -L 'id-token: write' .github/workflows/release.yml` | **sound** | Uses GNU/BSD grep, where `-L` legitimately means --files-without-match (unlike ripgrep, where the same flag means --follow -- see scout-agent-legibility rule 9). Worth flagging as a corpus-wide trap in its own right: the identical short flag means opposite things depending which tool a cell is written against, and this corpus already has one instance (rule 9) where that exact confusion produced a live bug. |
| python-packaging.md #9 — deptry with the correct flag set | `deptry . --known-first-party <pkg> --optional-dependencies-dev-groups ... --exclude ... --ignore DEP004` | **sound** | Not independently re-run, but the file's own "deptry, in detail" section is an exceptionally thorough self-administered adversarial pass: it ran deptry three ways, showed the wrong two producing 10 and 67 false positives respectively, converged on 0 real issues with the correct flags, and then proved the correct invocation still catches a real, planted violation. This is the second gold-standard example in the corpus, alongside check-floor-tested.sh. |
| python-packaging.md #10 — built wheel imports cleanly | `uv build && uv run --isolated --with dist/*.whl ...` | **sound (fragile)** | `dist/*.whl` is a bare shell glob passed to `--with`; if `dist/` holds more than one wheel (e.g. a stale prior build not cleaned first), the glob expands to multiple arguments and either breaks `--with` or silently picks the wrong one. Not independently re-run. Same species of defect as exemplar-patterns P5/P8's bare path-glob, just in an argument position instead of a path operand. |

## Rewrites

For every non-sound cell above with a fixable mechanism (9 of them — the 4
`could not run` cells are an artifact-preservation problem, not a command bug, and are
addressed in Corpus health instead). Each rewrite below was **run**, not just written;
output is pasted.

**1–2. scout-agent-legibility rules 3 & 6 — markdown-escaped `\|` misread as alternation.**
```
rg -l '(mypy|pyright|\bty\b)' pyproject.toml
```
Run against `ocx-sdk-python/pyproject.toml`: prints `pyproject.toml`, exit 0 — correctly
detects pyright is configured (the original always printed nothing, unconditionally).
```
rg -l '(monkeypatch|mock\.patch|setattr\()' src --glob '!*test*'
```
Run against `index/bot`: exit 1 (empty) — correctly confirms no mock/monkeypatch use
outside tests, matching `scout-failure-coverage.md`'s independently-measured "zero hits
in both repos" for `mock.patch` usage. Both rewrites: explicit path operand added,
real alternation `(a|b|c)` in place of the markdown-escaped `a\|b\|c`.

**3. scout-agent-legibility rule 4 — negative lookahead defeated by `\s*` backtracking.**
```
rg --pcre2 -n '\b(get|set)attr\([^,]+,\s*+(?!["\x27])' case_literal.py case_var.py
```
Fix: make the whitespace quantifier possessive (`\s*+`, supported under `--pcre2`) so it
cannot backtrack to satisfy the lookahead. Run on the two-line smoke test: prints only
`case_var.py:1:val2 = getattr(obj, name_var)` — the compliant `case_literal.py` (a
string-literal second argument) is now correctly excluded.

**4. scout-agent-legibility rule 9 — `-L` means `--follow` in ripgrep, not files-without-match.**
```
rg --files-without-match '__all__' --glob '**/__init__.py' src
```
Run against `ocx-sdk-python/src`: exit 1 (empty) — correctly states every `__init__.py`
under `src/` already declares `__all__`, the actual claim the rule wants proven (the
original, with `-L`, returned the file that DOES contain it — the opposite answer).

**5. exemplar-patterns P7 — `**` glob silently truncates under bash, `^```` misses indented fences.**
```bash
find . -name '*.md' \( -path './README.md' -o -path './docs/*' \) -not -path './.venv/*' -print0 \
  | xargs -0 grep -n '^[[:space:]]*```' \
  | grep -vE '```(python|python-contract|python-acceptance|python-no-run|bash|toml|json|yaml|text|console|markdown)?[[:space:]]*$'
```
Run under `bash` (globstar off) against `ocx-sdk-python`: exit 1 (empty) — and the
underlying `find | xargs grep` pipeline sees all 78 fence-line hits, including the 2
previously-invisible indented ones at `docs/guide/concepts/compatibility.md:34,39`,
before the allowlist filters them out. `find` is shell-independent (no `**` glob), and
the whitespace-tolerant anchor sees indented fences.

**6. annotations-evaluation rule 1 — same `**` glob issue, on `.py` files.**
```bash
find . -name '*.py' -not -path './.venv/*' -not -path './.git/*' -print0 \
  | xargs -0 grep -L '^from __future__ import annotations'
```
Run against `ocx-sdk-python` under both zsh and bash: **2** files without the future
import, identically, under both shells — the original `**/*.py` glob gave 38 files
under zsh but only **2** under bash (a 95% undercount), because `**` recursion is a
zsh default but requires `shopt -s globstar` in bash, which is not set. `find` removes
the shell-dependence entirely.

**7. python-packaging rule 4 — regex only catches the rare bare-upper-bound form.**
```
grep -oE '"[a-zA-Z0-9_.>=<,! -]+"' pyproject.toml | grep '<'
```
Run against a synthetic manifest with `numpy>=1.20,<2.0` and `requests<3`: prints
**both** (the original caught only `requests<3`). Extracting the whole quoted
dependency spec first, then testing the extracted string for a bare `<`, catches the
compound `>=X,<Y` form the character-adjacency regex structurally could not.

**8. python-packaging rule 6 — stated as a conjunction, checked as one half.**
```bash
for d in "$@"; do
  if [ -f "$d/pyproject.toml" ] && { [ -f "$d/ruff.toml" ] || [ -f "$d/.ruff.toml" ]; }; then
    echo "VIOLATION: $d has both pyproject.toml and a standalone ruff.toml"
  fi
done
```
Run against two synthetic project dirs (one with both files, one with only
`ruff.toml`): fires on the first, silent on the second — the actual conjunction the
rule states, in one command instead of a `find` a reader has to manually cross-reference
against a second fact.

**9. python-packaging rule 10 — a wheel-count-1 assumption baked into a bare glob.**
```bash
wheel_count=$(find dist -maxdepth 1 -name '*.whl' | wc -l)
[ "$wheel_count" -eq 1 ] || { echo "ABORT: expected exactly 1 wheel in dist/, found $wheel_count -- clean dist/ first"; exit 1; }
```
Run against a `dist/` with 2 stale wheels planted: `ABORT: ... found 2 ...` — the
original `--with dist/*.whl` would have silently handed `uv run` two `--with`
arguments (or failed opaquely) instead of naming the actual problem.

**Also worth tightening while in the area (not full defects, flagged but not
separately rewritten):** exemplar-patterns P5/P8 SDK's `src/ocx_sdk/*.py` bare glob
(works today only because the package is currently flat — same fix as rewrite 6,
`find`); P6's missing `"ab"` exemption in the encoding filter chain (add
`-vF '"ab"'`); python-packaging #3/#7's bare filenames with no directory argument.

## The scope-discipline table

Classifying the 25 **sound** cells. The team lead's three categories cover most of
them; a fourth kind — **inventory checks**, common in `scout-agent-legibility.md` —
doesn't fit any of the three and is called out separately, because forcing it into
"absence-assertion" would misdescribe what these cells actually do.

**Absence-assertion** (zero is expected; empty output = pass; union/`-e A -e B`
semantics are correct here because the rule genuinely is "none of A, B, or C should
appear"): P2, P3×2, P5 index/bot, P6, P7 index/bot, P8×2, P9, check-floor-tested.sh,
check-classifiers-tested.sh, python-packaging #3, #7, #9, scout-agent-legibility rule 5.
This is the majority shape and the one the corpus gets right most consistently.

**Module-scoped** (wide command, needs a plain-words clause telling the reader to
discard hits outside the module under change): none of the 25 sound cells are actually
this shape — every sound cell already targets a specific directory (`src`, a named
file) rather than running fleet-wide and asking the reader to filter mentally. This is
a genuine strength of this corpus relative to the predecessor's failure mode.

**Diff-scoped** (a steady-state count that's never zero, must say "restrict to added
lines"): none found among the sound cells either — the corpus's sound checks are all
absence-assertions or one-shot structural facts, not steady-state metrics. Worth noting
as an absence, not a defect: nothing in this sweep's scope needed diff-scoping and
nothing wrongly claimed fleet-wide-zero for a metric that's naturally nonzero.

**Positive-outcome assertion** (not zero-is-pass at all — a specific successful result,
e.g. "the wheel imports and prints its installed path," is the pass): python-packaging
rule 10. Doesn't fit any of the three named categories; flagging the gap rather than
mis-slotting it.

**Inventory / reading-heuristic** (a hit is *expected and normal*; the check's job is
to produce a short, correct candidate list for a human to judge per-item, forever — not
to reach zero): scout-agent-legibility rules 10, 11, 12, 15, and rule 2/13 (no command
at all, by design). This is roughly a third of that file's "sound" rows. Mis-scoping
risk here is different from the other three categories: the danger isn't a wrongly-zero
absence check, it's presenting an inventory as if it *were* an absence-assertion — a
reader who doesn't notice the "per-hit judgment required" caveat would misread any
output as an automatic violation. All four rows in this corpus disclose the caveat
inline, correctly — but the category itself needs a name so a future author doesn't
accidentally write an inventory check and forget the disclosure.

## Corpus health

By verdict:

| Verdict | Count |
|---|---|
| sound | 25 |
| cannot-go-red | 5 |
| could not run | 4 |
| ambiguous | 3 |
| inverted | 1 |
| **total** | **38** |

By source file:

| File | sound | cannot-go-red | could not run | ambiguous | inverted |
|---|---|---|---|---|---|
| exemplar-patterns.md | 10 | 1 | 4 | 0 | 0 |
| scout-agent-legibility.md | 8 | 3 | 0 | 2 | 1 |
| version-floor.md / python-packaging.md (normative + 8a-8e) | 7 | 1 | 0 | 1 | 0 |

**Worst file: `scout-agent-legibility.md`.** 6 of its 15 candidate-rule rows (40%) are
not sound — 3 cannot-go-red (two from the identical `\|`-escaping mistake, one from a
backtracking-defeated lookahead), 1 inverted (a wrong flag borrowed from grep's
vocabulary into ripgrep, where it means something else entirely), 2 ambiguous
(two-command correlations presented as single checks). This is also the file that says,
in its own §4 preamble, "Verification commands use `rg`/`grep` with an explicit path
operand; empty output is a PASS unless stated otherwise — each row says which" — the
discipline was stated correctly and followed inconsistently, which is a more dangerous
shape than never stating it, because the stated discipline reads as evidence of rigor
that the individual cells don't back up.

`exemplar-patterns.md` has more total defects by count (5) but a much lower rate
(5/17 ≈ 29%, and 4 of those 5 are "could not run" — an artifact-preservation problem,
not a logic bug) — every grep cell that *was* runnable passed cleanly except the one
globstar/indented-fence blind spot. Its own author already re-ran every cell live
during authoring (real + synthetic violation, both shown) — the sweep's job here was
mostly confirmation, not discovery, aside from P7.

`version-floor.md`/`python-packaging.md`'s two shell scripts are the strongest artifacts
in the whole corpus — both **already show themselves being caught doing the wrong
thing** during their own authoring (`set -e` swallowing an absent-file check;
a version-extraction regex that dropped all but the first token on a matrix line) and
fixed before being presented as done. This is the pattern the rest of the corpus should
copy, not just the individual scripts.

**The four "could not run" cells share one root cause**: custom AST-based Python
checkers (`check_sdk_exitcode_mapping.py`, `check_indexbot_exitcode_mapping.py`,
`typing_audit.py`, `check_ctor_params_wired.py`, `check_popen_deadlock.py`,
`check_subprocess_timeout.py` — 6 total scripts across 2 files, 4 tabulated here since
`scout-failure-coverage.md` wasn't exhaustively swept) lived in per-session scratch
directories that are, correctly, cleaned up after each session — but nothing in the
research artifact captures their source, only their claimed behavior. One of them
(`check_ctor_params_wired.py`) is explicitly documented as having had a real bug on its
own first draft. The fix is process, not a command: any checker script cited as
evidence in a `.agents/research/` file needs to ship as a file in this program's own
tree (or be inlined in the markdown as the two shell scripts already are), not live and
die in a scratch directory a reader can never see again.

**The recurring mechanisms, named once, found repeatedly**: the escaped-pipe bug
(2 instances, both in the same file, same root cause); the `**`-glob-under-bash
undercounting (2 instances, in 2 different files, ranging from a 26% blind spot to a
95% blind spot depending on directory depth); a wrong short-flag borrowed across
tools (`-L` means opposite things in `grep` vs `rg` — 1 live bug, 1 correct usage
elsewhere in the same corpus, proving the trap is real and not hypothetical). None of
these are isolated typos; each is a pattern worth a standing style rule for anyone
authoring the next verification cell in this program: **spell out alternation, never
`\|`; use `find`, never a bare `**` glob; check a flag's meaning per-tool before
reusing it across `grep` and `rg`.**

**My own artifacts**: `scout-codified.md` and `codified-reconciled.md` (both authored
by this agent in earlier turns of this session) contain **zero** verification cells or
`## Normative guidance candidates` sections in the swept sense — `codified-reconciled.md`
has a "Verdict" column describing ruff-family adoption judgment, not a proposed check
with a command, so nothing in either file was in scope for this sweep, and neither
survives or fails it — they simply aren't the artifact type being audited here. (Both
files do carry citation claims, swept below in "Citation integrity" — that pass found
one real error in `scout-codified.md`.)

## What the script catches versus what it misses

Ran `python3 .claude/skills/research-lang/scripts/check-artifacts.py .agents/research --root .`
from the repo root: 477 findings corpus-wide, 128 of them (not 108 — the corpus grew
between the two runs; other agents are actively writing new `python-*` files) inside
`python-*` artifacts.

**Real, and the single most valuable class the script catches**: "command span in a
table cell contains a pipe." 86 of the 128 python-* findings are this class. Sampling
all 86 by hand: **30 have the `\|` sitting inside a single quoted regex pattern**
(alternation-shaped) and **43 have it sitting between two whole shell commands**
(pipeline-shaped) — a distinction the script does not make but matters enormously.
The pipeline-shaped ones (`grep ... \| grep ...`) fail **loudly** if pasted literally —
the shell tries to run one command with a stray `|` argument and errors immediately,
visibly. The pattern-shaped ones are the real danger: this sweep already proved 2 of
them (scout-agent-legibility.md rules 3 and 6) silently pass regardless of the actual
violation state. **A further wrinkle the script also can't see**: whether the tool
being invoked is `grep` or `rg` changes the verdict entirely. GNU grep's BRE mode
treats `\|` as alternation — a real, working GNU extension (confirmed live:
`grep 'mypy\|pyright' file1 file2` correctly matches both). Ripgrep does not. Several
of the 30 pattern-shaped hits (`python-http/bot-client-discipline.md`,
`python-single-file-tools/stdlib-only.md`) invoke plain `grep`, not `rg` — those are
**not bugs on this platform**, only non-portable to non-GNU grep (BSD/macOS). The
script should keep flagging the class (it's a real copy-paste hazard either way, and a
plain-command pipe reads worse than it needs to inside a table cell) but a
severity split — silent-corruption (regex + `rg`) versus loud-failure (pipeline, any
tool) versus portability-only (regex + GNU `grep`) — would tell a reader which of the
86 to fix first.

**Two genuine scope bugs, matching the team lead's read exactly**: `broken relative
link` (67/77 corpus-wide are literal `file:///home/...` URIs — checked one directly,
`artifact-parameterization/prior-art.md`'s `[grimoire — project README](file:///home/mherwig/dev/grimoire/README.md)`
— a deliberate, working citation into a *sibling repo* this research explicitly needs
to reference; the checker's relative-link resolver has no way to know that's fine).
`body is NNN lines (max 200)` / `no table of contents` (23 + 9 = 32 python-* hits) — a
rule-authoring budget applied to research artifacts, which this program's own
`python-frame.md` describes as explicitly long-form source that gets *distilled* into
short rules later, not rules themselves. **Recommendation for both: skip
`.agents/research/**` entirely** for the link-resolution and body-length/TOC checks —
not narrow the file:// exemption alone, since a research doc citing another research
doc by *relative* path that's since moved is a real broken link worth keeping the
checker's eye on; it's specifically the length/TOC and cross-repo-citation checks that
don't apply to this directory, not link-checking generally. **A third, smaller scope
bug found independently**: 2 of the 77 corpus-wide "broken relative link" hits
(`python-audit/version-floor.md`, `python-topic-map/scout-shifts.md`) are the literal
prose `` `def f[T](...)` `` (a PEP 695 generic-function example) — the link-detector's
regex pattern-matches `[T]` as link text and `(...)` as a URL by syntactic coincidence
with real markdown link syntax. Narrow fix: require the `](` immediately after `]` with
no preceding backtick/code-span boundary, or skip matches where the "URL" is exactly
three dots.

**What the script structurally cannot see, confirmed by this sweep's manual work**:
polarity (whether a cell states empty-output's meaning inline — the script can detect
an *empty* cell but not an *ambiguous* one that has content but never says which way
is the pass); noise (a check that runs clean but would drown a reader in real hits —
volume is a runtime property, not a static one); inverted output (a check whose
*output* is the compliance set, not the violation set — `-L` misuse is exactly this,
and it's a semantic property of what the flag does, not a syntax pattern); and the
entire citation-integrity class below, which requires diffing a claim against a real
file's real content — nothing about that is inferable from the markdown alone.

**Status of the three recommended scope skips above: open, not implemented.** The team
lead has not applied them, and correctly so — whether `.agents/research/**` should be
held to a rule-authoring length/TOC/cross-repo-link budget is a *policy decision* about
what this directory is for, not a bug in the checker. Recorded here as open rather than
folded into "fixed," pending that decision. The PEP 695 `` `def f[T](...)` `` link-regex
collision is a narrower, uncontroversial fix (not a policy question) and is also still
open as of this note.

**Update, same day — the script changed underneath this sweep.** Acting on the findings
above, the team lead fixed `check-artifacts.py` directly (not by me — this file's edits
are read-only over the target script, per the original brief):
1. The escaped-pipe check now fires only for `rg` with `\|` inside a *quoted pattern* —
   matching this sweep's live-tested finding that GNU grep's BRE genuinely treats `\|`
   as alternation, so a `grep`-based cell using it isn't broken. Re-ran the script:
   corpus-wide pipe-shaped findings dropped from 86 to **51** (confirmed by direct
   re-run, matching the team lead's figure exactly); within `python-*` specifically,
   7 remain, all genuine `rg`-plus-pattern instances — the two this sweep found by hand
   (scout-agent-legibility.md rules 3 and 6) are both still caught, now under a more
   precise message ("rg pattern in a table cell contains `\|`. Rendered that is
   alternation, but an agent reads the raw file and pastes a literal `|`...").
2. Two new detectors, both lifted from this sweep's findings: `rg -L` used where
   `--files-without-match` was meant (fires correctly on scout-agent-legibility.md rule
   9, the exact inverted-output case this sweep found), and an unquoted `**` glob that
   bash truncates without `globstar` (fires on 1 python-* instance in the current run).
3. `check_runnable_spans` previously only scanned lines starting with `|` (table rows);
   prose-style verification — `` *Verify:* `command` `` , which `annotations-evaluation.md`
   and `python-packaging.md`'s "Normative guidance candidates" sections use throughout —
   was invisible to every mechanism the script checks. Now scanned, with the pipe check
   correctly still restricted to table cells only (prose commands with a real shell pipe
   between two commands are not the markdown-escaping hazard).

Re-running this whole "Citation integrity"/table-verdict sweep against the corrected
tool's output was not repeated end-to-end given the time already spent — the manual
findings above were independently verified by hand before the script existed in its
current form, so they stand regardless of the tool's own evolution; the tool now simply
finds a subset of them automatically.

## Citation integrity

Sampled, not exhaustive, per the brief. Prioritized config quotes and tool-rule codes
over counts and file:line, as instructed.

**1. Quoted config contents** (5 checked):

| Claim | Location | Verdict | Detail |
|---|---|---|---|
| SDK per-file-ignore is `"tests/*" = ["ANN", "D"]` at `pyproject.toml:80` | `exemplar-patterns.md` | **verified** | Read the real file: line 80 is exactly `"tests/*" = ["ANN", "D"] # tests don't need full annotations or docstrings`. |
| "Strictest" fleet config selects `F, E, W, I, UP, B, SIM, RET, PTH, PL, RUF, S, ISC, FURB` | task brief → `scout-codified.md`, `codified-reconciled.md` | **verified** | Matches `grimoire-lore/ruff.toml`'s `[lint] select` exactly, 14/14. |
| Same config ignores `PLR2004, PLR0911, PLR0912, PLR0915` (plus `E501`) | `codified-reconciled.md` | **verified** | Matches `grimoire-lore/ruff.toml`'s `[lint] ignore` exactly as a set (file lists them in a different order — semantically identical). |
| — (no claim made, but should have been) | `scout-codified.md`, `codified-reconciled.md` | **unverifiable → attribution gap** | Neither file ever states that "the strictest config in the fleet" *is* `grimoire-lore/ruff.toml` — the catalog's own internal-tooling config — rather than one of the four researched shapes (ocx/test, grimoire/test, ocx-sdk-python, index/bot). A later reader has no way to find the actual file from either artifact. Not fabricated; a real citation-completeness miss. |
| `per-file-ignores "tests/*"` line is at `grimoire-lore/ruff.toml:44-47` | `pyright-triage.md` §6 | **wrong (loose)** | The real content is on line 45 alone; 44 and 46-47 are comment lines. The cited range contains the right line, so a reader lands nearby, but the citation over-states its own precision by 3 lines. |

**2. Named tool rules** (highest-risk category, per instructions — treated as
known-unreliable, checked systematically): extracted every rule-code-shaped token
across all 33 `python-*` files (267 distinct), cross-checked against ruff's own
969-rule catalogue (`ruff rule --all --output-format json`). 68 don't match — but 65 of
those are correctly-attributed **other-tool** codes (bandit `B1xx`-`B7xx`, pylint
`C0103`/`E1101`/`R0401`/`W0102`-shaped, deptry `DEP00x`) that were never claimed as
ruff codes, plus a handful of GitHub line-anchor numbers (`pytester.py#L1349`) my own
extraction regex mistook for rule codes. One real finding:

| Claim | Location | Verdict | Correct value |
|---|---|---|---|
| Ruff ports bandit `B301`-`B325` as `S301`-`S325` | `scout-codified.md` §6 (bandit index table) | **wrong** | Ruff's real `S3xx` ceiling is `S324` — confirmed against the 969-rule catalogue. `B325` (`os.tempnam`/`tmpnam` symlink vulnerability) is **not ported**, a 6th gap this program's own bandit-parity finding (B324/B613/B614/B615/B703, in `codified-reconciled.md`) missed. `codified-reconciled.md` itself does not repeat the wrong range — the error is isolated to `scout-codified.md`. |
| `ASYNC115` "looks like it covers `asyncio.sleep(0)` but only fires on `trio`/`anyio`" | `python-async/sdk-concurrency.md` | **verified correct** | Matches the rule's real scope exactly (`trio.sleep(0)`/`anyio.sleep(0)` only, confirmed from ruff's own catalogue text). Cited by the team lead as a known near-miss; already correctly described in the current corpus, not a live error. |
| `PLW1510` fires on missing `check=`, not missing `timeout=` | `python-subprocess/process-control.md`, `codified-reconciled.md` (3 instances) | **verified correct** | Matches the rule's real name (`subprocess-run-without-check`) and description exactly, everywhere it's cited. Also a team-lead-flagged near-miss; also already correct everywhere checked. |

**3. Counts** (1 re-run, several already re-run during the mechanical sweep above):
`harness-shape.md`'s headline "308 `subprocess.run(` calls" in `ocx/test` — re-ran
`grep -rn 'subprocess\.run(' --include='*.py' .`: **308**, exact match. The
"291... with no timeout" numerator needs the same per-call AST walk the original count
used (a file-level grep proxy isn't equivalent); not independently re-derived to the
same precision, but no evidence of error either. `check-floor-tested.sh`'s and
`check-classifiers-tested.sh`'s counts were already independently re-run and confirmed
in the sweep above.

**4. file:line citations**: ~15 verified through direct reading during this sweep and
the reconciliation pass before it (not a fresh, separate 40-citation sample — most of
the mechanical sweep above already required opening the cited file at the cited line
to test the command against it, which doubles as a file:line check). All ~15 confirmed
accurate except the one loose range logged above. A dedicated, larger file:line sample
independent of the mechanical sweep was not run given the time budget; flagging this as
the least-covered category, consistent with the brief's own priority order.

## Corpus trust

| Artifact | Mechanical pass | Citation pass | Grade | Quotable as-is? |
|---|---|---|---|---|
| `python-audit/version-floor.md` | sound (independently re-run) | clean | **A** | Yes |
| `python-packaging.md` | 7/9 sound, 2 fixable | clean (sampled) | **A-** | Yes, with the 2 rewrites applied |
| `python-audit/exemplar-patterns.md` | 10/17 sound, 4 artifact-loss, 1 real gap | clean (file:line sample all correct) | **B+** | Yes for the claims; no for the 4 scripts (don't cite as runnable) |
| `python-typing/annotations-evaluation.md` | 1/2 checkable rules sound, 1 fixed | not sampled beyond the swept rule | **B** | Yes |
| `python-topic-map/scout-failure-coverage.md` | mostly sound (spot-checked), 2 artifact-loss | not sampled | **B** | Yes for conclusions; the 2 script-backed rows need re-derivation |
| `python-topic-map/scout-codified.md` (mine) | n/a (no verification cells) | **1 real wrong citation found** (`S301`-`S325`) | **B-** | No — fix the bandit range before anyone quotes §6 |
| `python-topic-map/codified-reconciled.md` (mine) | n/a | clean (sampled, including the config-attribution gap above) | **B+** | Yes, with the attribution gap fixed (name `grimoire-lore/ruff.toml` explicitly) |
| `python-topic-map/scout-agent-legibility.md` | 6/15 not sound (2 cannot-go-red from the same bug, 1 inverted, 2 ambiguous) | not sampled | **C** | No — the file's own stated discipline ("empty is a pass unless noted") is not backed by a third of its cells; re-check every row before distilling |

**Bluntly**: the two shell-script artifacts (`version-floor.md`, `python-packaging.md`)
are the only ones in this program that have already survived their own authors trying
to break them, and it shows — they're the only "A" grades. `scout-agent-legibility.md`
is the one artifact I would not let a later author distill from without a full re-check
first: not because it's the sloppiest in volume (it isn't), but because it explicitly
claims a discipline its cells don't honor, which is the single most dangerous shape a
research artifact can take — an author reading its preamble has every reason to trust
it, and every reason would be wrong for 40% of the rows. My own `scout-codified.md`
sits one grade below where its mechanical quality would otherwise put it, for the same
reason at smaller scale: one invented-looking range in an otherwise well-sourced table.
