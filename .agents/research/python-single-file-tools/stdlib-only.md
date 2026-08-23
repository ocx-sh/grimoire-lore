---
title: Stdlib-only single-file Python tools
topic: PEP 723, argparse/tomllib/urllib as dependency-free equivalents, exit-code contracts, harness robustness, self-testing without a framework, single-file import discipline
agent: scout-canonical (dive)
model: sonnet
date_researched: 2026-08-23
sources_count: 12
scope: /home/mherwig/dev/ocx/.claude/hooks/ (9 scripts + hook_utils.py, duplicated verbatim in /home/mherwig/dev/grimoire/.claude/hooks/), /home/mherwig/dev/grimoire-lore/scripts/make-mark.py, /home/mherwig/dev/grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py
---

## Table of contents

- [Summary](#summary)
- [Findings](#findings)
- [Normative guidance candidates](#normative-guidance-candidates)
- [Applied to the hooks and the catalog scripts](#applied-to-the-hooks-and-the-catalog-scripts)
- [AI-agent angle](#ai-agent-angle)
- [Contested / evolving](#contested--evolving)
- [Sources](#sources)

## Summary

- All 18 hook scripts (9 files × ocx + grimoire) already carry a correct, working PEP 723 header (`requires-python = ">=3.10"`, no `dependencies` key) and are invoked as `uv run "$CLAUDE_PROJECT_DIR/.claude/hooks/NAME.py"` — verified empirically: `uv run --verbose` resolves the constraint and launches `cpython-3.10.20`.
- `dependencies` is optional in PEP 723, confirmed both by the canonical spec and by direct testing — an earlier read of a secondary source claiming it's mandatory for `uv run` was wrong; omitting it (as this fleet does) is a fully valid "zero dependencies" declaration.
- Neither `check-artifacts.py` nor `make-mark.py` (this repo's own tools) has a PEP 723 header at all — `make-mark.py` has an *undeclared* implicit floor (3.10+, from `X | None` annotations evaluated eagerly with no `from __future__ import annotations`); `check-artifacts.py`'s floor (3.11) exists only as `ruff.toml`'s `target-version`, cited nowhere in the script itself.
- `check-artifacts.py --self-test` uses bare `assert`. Demonstrated empirically: `python -O` against a planted, real regression (a disabled check) prints `self-test: ok` and exits 0 — the exact regression that plain `python3` catches with an `AssertionError` and exit 1.
- `make-mark.py` already has the fix for this, two files over in the same repo: its `expect()` helper uses `raise SystemExit(...)` instead of `assert`, with a comment stating exactly why.
- `check-artifacts.py` has a real, reproducible `BrokenPipeError` defect: piping its output (428 lines against `.agents/research`) through `head -1` prints `Exception ignored while flushing sys.stdout: BrokenPipeError` to stderr.
- The only two `open()` calls in the entire audited set missing `encoding=` are `hook_utils.py:244` and `:270` — confirmed exactly, not approximately; every other text I/O call in the fleet either states `encoding="utf-8"` explicitly or is a `Path.read_text()`/`write_text()` call riding the platform default (a related but distinct, lower-severity gap).
- `argparse`'s `type=bool` trap is absent everywhere in the audited set — nobody has stepped in this hole yet, but nothing prevents it either.
- Every `subprocess.run()` call in the fleet already carries an explicit `timeout=` — this is the one robustness property this shape gets right by default, everywhere, with no exceptions found.
- `sys.path.insert(0, str(Path(__file__).parent))` appears at the top of 9 files, once each — the correct, minimal answer for N sibling scripts sharing one un-installed module in the same directory; not a smell, and not something to "fix" into a package while these are still deployed by "copy this directory."
- `hook_utils.py`'s YAML equivalent for `check-artifacts.py` (probe `import yaml` inside `try/except`, fall back to a hand-rolled `_mini_yaml`) is the reference pattern for a dependency that's genuinely optional — and this repository's own git history (`8581552`, "fix: the dead-glob check was inert wherever PyYAML is absent") is direct, first-party proof that getting this wrong is a real, not theoretical, failure mode.
- PostToolUse/Stop/SubagentStop hooks wrap their entire body in `try/except Exception: pass` — this is *correct*, not a violation, because Claude Code's own hook contract for those event types requires the hook to never exit non-zero; `post_tool_use_tracker.py`'s docstring says so explicitly. The same pattern in `check-artifacts.py`'s frontmatter parser (probing `import yaml`) is also correct for the same reason: it exists specifically to make an absent optional dependency non-fatal.
- No ruff configuration scopes either hook fleet (`ocx/.claude/hooks/`, `grimoire/.claude/hooks/`) — the code is clean on `EXE`/`S`/`B` by discipline, not by an enforced gate. `grimoire-lore`'s own `ruff.toml` does scope its scripts, including a deliberate `S101` (assert) exemption for `check-artifacts.py`'s self-test — a documented tradeoff, not an oversight, but one this dive's evidence argues against.
- None of the audited scripts declares `dependencies = []` explicitly where they could instead just omit the key — both are valid; the ecosystem hasn't converged on a single style.

## Findings

### 1. How the file declares and gets its interpreter

**PEP 723's actual syntax.** The block is `# /// script` opening a fence and `# ///` closing it; every line in between must be a comment beginning `#` (with a space after the `#` unless the line is bare `#`); the enclosed text, once the comment markers are stripped, must be valid TOML. The canonical detection regex is `(?m)^# /// (?P<type>[a-zA-Z0-9-]+)$\s(?P<content>(^#(| .*)$\s)+)^# ///$` [PEP 723](https://peps.python.org/pep-0723/). **Neither `dependencies` nor `requires-python` is required** — both are optional top-level TOML keys — confirmed independently by the canonical, continuously-maintained specification page that superseded the (now historical) PEP text: *"MAY include the top-level fields `dependencies` and `requires-python`"* [packaging.python.org](https://packaging.python.org/en/latest/specifications/inline-script-metadata/). This directly contradicts a secondary source (a `uv` guide, summarized by an automated fetch) that claimed *"the dependencies field must be provided even if empty"* — that claim does not survive testing:

```
$ cd /home/mherwig/dev/ocx && echo '{}' | uv run --verbose .claude/hooks/session_start_loader.py 2>&1 | grep -i "requires-python\|Using Python"
DEBUG Using Python request `>=3.10` from `requires-python` metadata
```

`uv` reads the header (`requires-python = ">=3.10"`, no `dependencies` key), resolves it against the installed interpreters, and launches `cpython-3.10.20` — exit 0. The claim about a mandatory `dependencies` key is wrong; omitting it (as every one of this fleet's 18 files does) is a complete, valid, "this script has zero dependencies" declaration.

**What consumes it today.** `uv run`/`uv add --script`/`uv lock --script` is the most complete consumer [docs.astral.sh/uv](https://docs.astral.sh/uv/guides/scripts/). Ruff and mypy read the block to infer per-file `target-version`/Python version without installing anything. Hatch (the PEP's author's own tool) and pipx also read it. **pip does not** — there's no native `pip run script.py` concept, so a PEP 723 header is inert under a bare `python3 script.py` or `pip`-driven invocation; the header only does anything when the invocation goes through a PEP-723-aware runner.

**Shebang forms.**
- `#!/usr/bin/env python3` — plain interpreter dispatch. Ignores the PEP 723 block entirely; a reader benefits from seeing `requires-python`, but nothing enforces it.
- `#!/usr/bin/env -S uv run --script` — the block becomes load-bearing: `uv` builds/reuses an isolated environment matching `dependencies`/`requires-python` before running. This is the form to reach for once a script is meant to be run as `./tool.py` directly [docs.astral.sh/uv](https://docs.astral.sh/uv/guides/scripts/).
- **No shebang at all** — correct and sufficient when the tool is *always* invoked with an explicit interpreter/runner ahead of it (`uv run "$PATH"`, `{{.PY}} path/to/tool.py`), which is exactly this project's own convention for both fleets (`.claude/settings.json`'s `"command": "uv run \"$CLAUDE_PROJECT_DIR/.claude/hooks/…\""`, `grimoire-lore`'s `taskfile.yml` `{{.PY}} .claude/skills/research-lang/scripts/check-artifacts.py …` where `PY: python3`). A script never executed as `./tool.py` gains nothing from a shebang and loses the ability to be portably imported (a shebang-first non-`.py`-suffixed file confuses editors/linters that key off the extension).

**Executable-when.** A script should be independently executable (`chmod +x`, real shebang) exactly when it is meant to be run as `./tool.py` by a human or another script that doesn't already know the interpreter. None of the audited files are `chmod +x` — confirmed by directory listing (`-rw-r--r--` throughout) — and none of them need to be, because every invocation path in this project supplies its own interpreter explicitly.

**Ruff's EXE family** exists to catch exactly the shebang/exec-bit mismatch this shape is prone to [docs.astral.sh/ruff EXE rules](https://docs.astral.sh/ruff/rules/#pyflakes-exe):

| Rule | Name | Catches |
|---|---|---|
| EXE001 | shebang-not-executable | shebang present, file not `chmod +x` |
| EXE002 | shebang-missing-executable-file | `chmod +x` set, no shebang line |
| EXE003 | shebang-missing-python | shebang doesn't reference `python`/`pytest`/`uv run` |
| EXE004 | shebang-leading-whitespace | whitespace before `#!` (auto-fixable) |
| EXE005 | shebang-not-first-line | shebang isn't line 1 |

All five are stable and on by default in any ruff config that includes the `E`/pyflakes families or is explicitly selected — but **no ruff config scopes either hook fleet today** (confirmed: no `ruff.toml`/`pyproject.toml` anywhere under `ocx/.claude/hooks/` or its repo root covering that path), so EXE001/002 aren't actually enforced there, only true by discipline.

### 2. The dependency-free equivalents

**Argument parsing (`argparse`).** Good enough for every case in this shape — subcommands, `--flag value`, positional args, `--self-test`/`--selftest` boolean flags — with three sharp edges: `type=bool` is a trap (`bool("False") is True`; nobody in the audited set uses it — confirmed by grep, zero hits — but nothing stops a future addition), the fix is `action="store_true"` or `argparse.BooleanOptionalAction` (3.9+); usage/parse errors exit **2** by default (`exit_on_error=True`); and `nargs=1` produces a one-element *list*, not a bare value. `make-mark.py` and `check-artifacts.py` both use `argparse` correctly — flags only, no `type=bool`, `--selftest`/`--self-test` as plain `action="store_true"`.

**Colour and TTY handling without `rich`.** Nothing in the audited set emits colour or does TTY-aware formatting — none of these tools produce interactive/rich output, all of it is machine- or log-consumed. The dependency-free equivalent when it's needed: raw ANSI escape codes gated behind `sys.stdout.isatty()` (or an explicit `--no-color`/`NO_COLOR` env-var check per the [no-color.org](https://no-color.org) convention) — a handful of lines, no library.

**Tables without `tabulate`.** Not needed anywhere in this set either; `check-artifacts.py`'s findings are one-line-per-finding, not tabular. `str.ljust()`/f-string column padding covers this shape's actual volumes if it ever comes up.

**TOML reading.** `tomllib` (stdlib, read-only, 3.11+) [docs.python.org/3/library/tomllib.html](https://docs.python.org/3/library/tomllib.html). **Nothing in the audited set parses TOML today** — confirmed by grep, zero imports. This matters because it's a live constraint, not a hypothetical: the ocx/grimoire hook fleet's declared floor is `>=3.10`, one version *below* `tomllib`'s own floor. A future hook that needs to read `pyproject.toml` under this fleet's current `requires-python` cannot use `tomllib` without either (a) bumping `requires-python` to `>=3.11` fleet-wide, or (b) hand-parsing the narrow subset actually needed (the same trade-off `check-artifacts.py` already makes for YAML, below) — there is no "add `tomli` as a dependency" option under this shape's own constraint.

**YAML.** There is no YAML in the standard library, full stop. `check-artifacts.py` is the reference pattern already living in this project: probe `import yaml` inside a `try/except`, and fall back to a minimal hand-rolled parser (`_mini_yaml`, sized to exactly the subset of YAML frontmatter this project's Markdown actually uses — scalars, one nested map, one list) [check-artifacts.py:119-165]. The historical failure mode is documented in this repository's own git history: commit `8581552`, *"fix: the dead-glob check was inert wherever PyYAML is absent"* — the earlier version of `_mini_yaml` committed a valueless key as a dict before knowing whether the first indented line under it was a list item, so on any machine without PyYAML installed, every `paths:` glob list silently became `{}` and `check_globs()`'s `isinstance(..., list)` guard skipped it — the check went permanently, silently green. This is not a hypothetical footgun; it shipped, and the fix is preserved as a comment directly above the corrected code (lines 148-153).

**HTTP.** No audited script makes a network call — confirmed by grep, zero imports of `urllib`/`http`/`requests`. The dependency-free default for this shape should be *refuse network calls entirely*, not "use `urllib.request`" — a hook that fires on every tool-use event making an unbounded, un-timed-out HTTP call is a latency/hang risk disproportionate to what these scripts do today. If one is ever genuinely needed, `urllib.request.urlopen(req, timeout=N)` with an explicit `timeout` (never the default, which is "wait forever") is the stdlib answer.

**Structured logging.** No script in the audited set uses the stdlib `logging` module — all of them use plain `print()` to stdout (parsed by the calling harness as the hook's decision/context) or `Path.write_text()`/`open(..., "a")` appends to a project-local `.log`/`.jsonl` file. This is correct for the shape, not a gap: a Claude Code hook's stdout **is** the protocol (JSON for `PreToolUse`, free text for `additionalContext`-style events) — introducing `logging`'s handler/formatter machinery on top of that would fight the harness's own contract rather than serve it. `logging` becomes the right tool only for a script whose own stderr is genuinely a human-readable diagnostic stream nobody else parses.

### 3. Exit codes and failure behaviour

Two legitimate, different conventions coexist in the audited set, and each is dictated by its harness, not by preference:

- **`check-artifacts.py`** follows the classic Unix CLI convention, stated in its own docstring: *"Exit 0 = clean, 1 = findings, 2 = bad invocation."* [check-artifacts.py:13] This is exactly right, and it composes correctly with `argparse`'s own exit-2-on-usage-error convention rather than colliding with it.
- **Every Claude Code hook always exits 0** — the decision is communicated entirely through stdout (a JSON payload with `permissionDecision: "deny"/"ask"` for `PreToolUse`, or plain text for `additionalContext`-carrying events), never through the process exit code. `post_tool_use_tracker.py`'s docstring states this as a hard requirement: *"CRITICAL: This is a PostToolUse hook. It MUST never exit non-zero. All logic is wrapped in a top-level try/except to guarantee silent failure."* [post_tool_use_tracker.py:6-7] `pre_tool_use_validator.py`, by contrast, is also always `sys.exit(0)`, but is a **gating** hook — its "failure" is expressed by *emitting a `deny` JSON payload*, still with exit 0. Conflating these two hooks' exit-code semantics with `check-artifacts.py`'s would be a real bug: reading "exit 0" as "nothing to report" is correct for `check-artifacts.py`, wrong for every hook.

**The dangerous conflation this shape must avoid**: "the check failed" (the tool ran correctly and found a real problem) versus "the checker crashed" (the tool itself is broken — a bug, a missing file, a malformed input) must never share an exit code or a printed shape that reads the same to a downstream consumer. `check-artifacts.py` gets this right — findings are `1`, a bad `PATH` argument is `2`, printed as `error: no such path: {target}` to *stderr*, not folded into the findings list on stdout.

**On an unexpected exception**: the two harness contracts above dictate the answer, and they disagree on purpose. A `PreToolUse`/`PostToolUse`/`Stop`/`SubagentStop` hook must swallow it (documented, harness-mandated fail-open) because an unhandled crash there would break the *user's* editor session, not just the check. A standalone gate like `check-artifacts.py` must **not** swallow it — an uncaught exception there should produce a real traceback on stderr and a non-zero exit, because silently reporting "clean" on a crash is indistinguishable from an actual clean run to whatever calls it (`task ci`, a pre-publish gate). `check-artifacts.py` currently has no top-level `try/except` around `main()`'s body outside `self_test()` — an uncaught exception there produces a traceback and Python's default non-zero exit, which is the *correct* behavior for this harness, achieved by simply not adding a catch-all.

**Should this shape have a pinned exit-code table**, the way this catalog's Rust CLI side does? **Only for the standalone-gate half of the shape** (`check-artifacts.py`, `make-mark.py`, any future one-shot validator) — three states is enough: `0` clean, `1` findings/failure, `2` misuse (bad arguments, missing input). The hook half of the shape has no exit-code table to pin, because its harness has already fixed the convention (always 0) — the thing worth pinning there instead is the *stdout shape* per event type (documented already, informally, in each hook's own docstring header comment naming its event and matcher).

### 4. Robustness under a harness

**Never block on stdin.** `hook_utils.read_input()` is the reference pattern: a single `sys.stdin.read()`, wrapped so that empty input (`if not data.strip(): return {}`) and malformed JSON (`except (json.JSONDecodeError, OSError): return {}`) both degrade to an empty dict rather than raising [hook_utils.py:25-33]. Its one residual limit: a single unbounded `.read()` still blocks indefinitely if stdin is a live pipe that's never closed and never fed EOF — acceptable here because the harness (Claude Code) always closes stdin after writing the JSON payload, but worth naming as the boundary of what this pattern actually guarantees.

**`BrokenPipeError` when the consumer closes early.** Demonstrated, not theoretical:

```
$ python3 check-artifacts.py /home/mherwig/dev/grimoire-lore/.agents/research 2>err.log | head -1 >/dev/null
$ cat err.log
Exception ignored while flushing sys.stdout:
BrokenPipeError: [Errno 32] Broken pipe
```

(428 lines of real output against `.agents/research`; `head -1` closes the read end after its first line, and the script's later `print()` calls hit a closed pipe on flush.) This is exactly the defect class the brief names from this catalog's own Rust side. The stdlib recipe — catch `BrokenPipeError` around the output loop, redirect `stdout`'s file descriptor to `os.devnull`, and exit non-zero rather than 0, since a truncated report is not "clean" [docs.python.org/3/library/signal.html, "Note on SIGPIPE"](https://docs.python.org/3/library/signal.html) — is not present in `check-artifacts.py` today.

**A hard bound on runtime.** Every `subprocess.run()` call across the entire audited set already carries an explicit `timeout=` (5 or 10 seconds, depending on the call) — confirmed by grep against every call site in `pre_commit_verification.py`, `pre_push_main_blocker.py`, and `stop_validator.py`. This is the one robustness property this shape gets right *everywhere*, with zero exceptions found. `check-artifacts.py` and `make-mark.py` spawn no subprocesses at all, so the question doesn't apply to them.

**Safe to run concurrently with itself.** The hook fleet's answer is `StateManager.acquire_lock()`/`LearningsStore._acquire_merge_lock()`, both built on `os.mkdir()`'s atomicity (an `mkdir` on an existing path raises `FileExistsError` atomically — no separate check-then-create race) [hook_utils.py:198-224, 484-518]. `check-artifacts.py` and `make-mark.py` have no shared mutable state between concurrent invocations (each run is a pure read of its inputs and either a report or a single deterministic output file) and correctly carry no locking machinery at all — adding one would be unrequested complexity for a shape that doesn't need it.

**Idempotency.** `StateManager.trim_tracker()`/`trim_subagent_log()` bound otherwise-ever-growing append-only logs to a fixed line count on every run [hook_utils.py:247-260, 275-285] — the reference pattern for "runs on every tool event, must not leak disk over a long session." `make-mark.py` is trivially idempotent (same inputs, same deterministic SVG output, overwritten each run). `check-artifacts.py` is idempotent by construction (pure function of its target files' current contents).

### 5. Self-testing with no test framework

**`assert` is stripped by `-O`.** The exact, authoritative wording: *"Remove assert statements and any code conditional on the value of `__debug__`"* — `python -O` (or `PYTHONOPTIMIZE`) [docs.python.org/3/using/cmdline.html](https://docs.python.org/3/using/cmdline.html). Verified directly against this project's own `check-artifacts.py`, with a planted regression in a scratch copy (the `WORKFLOW_VERBS` description check disabled, so a bad `SKILL.md` description that should be flagged silently passes):

```
$ python3 check-artifacts-broken.py --self-test
Traceback (most recent call last):
  ...
AssertionError: 'summary' belongs at the top level ... [7 other real findings, but not] 'workflow verb'
$ echo $?
1

$ python3 -O check-artifacts-broken.py --self-test
self-test: ok
$ echo $?
0
```

Normal `python3` catches the regression (the `assert "workflow verb" in messages, messages` line fails, because `messages` genuinely no longer contains that finding). `python -O` skips every `assert` in `self_test()` and falls straight through to `print("self-test: ok")` — a checker whose own self-check is silently defeated is the same "cannot go red" defect class this catalog already treats as a first-class concern elsewhere. `grimoire-lore/ruff.toml` carries a documented, deliberate exemption for this: `per-file-ignores` disables `S101` (bandit's "assert used") for `.claude/skills/research-lang/scripts/*`, with the comment *"The validator carries a `--self-test` so it can be proved with nothing installed. Those asserts are the proof."* — that comment is right that the pattern (embedded, dependency-free, exercised by `task ci` on every PR touching `*.py`) is sound; it does not make bare `assert` the right implementation of it, because the exemption silences exactly the lint that would have flagged the defect this dive just demonstrated.

**What replaces it, without adding a dependency:**
- **`raise SystemExit(msg)` on a failed condition** — `make-mark.py`'s own `expect()` helper, two files over in the same repo, already does exactly this, with a comment naming the reason: *"`assert` is stripped by `python -O`; a self-test must not be."* [make-mark.py:125-128] Zero new code needed anywhere else in this project; the pattern to copy already exists here.
- **`unittest.TestCase`** — stdlib, its `assertEqual`/`assertIn`/etc. are ordinary method calls, unaffected by `-O` because they aren't `assert` statements; `unittest.main()` gives exit-code semantics (0 all pass, 1 on any failure) for free [docs.python.org/3/library/unittest.html](https://docs.python.org/3/library/unittest.html). Worth reaching for once a hand-rolled `expect()`-style self-test accumulates enough checks (rough threshold: more than a screenful, or once `setUp`/`tearDown`-shaped repetition appears) that a real test-runner's reporting (which test, which assertion, first-failure-only vs. run-everything) starts paying for itself.
- **`doctest`** — fits the pure-function slice only (e.g. `make-mark.py`'s `viewbox_of()`/`body_of()`), never a CLI entry point or anything with side effects; requires fully deterministic output (no dict/set iteration order, no timestamps) or every doctest is a flaky test waiting to happen [docs.python.org/3/library/doctest.html](https://docs.python.org/3/library/doctest.html). Neither audited script currently uses it, and neither has a strong case to start — their side-effecting surfaces (file writes, filesystem walks) dominate their logic.

**Where the line is**: a script "carries its own proof" (embedded self-test, stdlib-only) when the checks are structural/regression-style and cheap to hand-write (this is exactly `check-artifacts.py`'s and `make-mark.py`'s situation — both are gates whose own correctness matters more than their line count). It should graduate to "a real test suite next to it" once the checks need fixtures/parametrization across many input shapes, or once `setUp`/`tearDown` state starts getting hand-rolled inside a single giant self-test function — `check-artifacts.py`'s `self_test()` is a single ~45-line function doing two full scenarios (bad-skill, good-skill) sequentially; it is not yet past that line, but is closer to it than `make-mark.py`'s `selftest()`, which stays purely in the "one input, one assertion, repeat" shape `expect()` was built for.

### 6. Single-file discipline

**When a shared helper stops being a helper.** `hook_utils.py` is 688 lines carrying two genuinely separate concerns: `StateManager` (locks, sessions, the file tracker — used by all 9 scripts) and `LearningsStore` (a 350-line JSONL store with its own merge/TTL/decay logic — used by exactly 2 of the 9: `subagent_stop_logger.py` and `stop_validator.py`). That's the trigger to *split into a second sibling module*, not to package-and-install: the deployment model for this whole shape is "these files live in `.claude/hooks/` and are copied/synced as a unit," and an installed package would require a build step and a dependency this shape is defined by not having. A second `learnings_store.py` file, still imported via the same `sys.path.insert` pattern every other script already uses, costs nothing and keeps each concern separately readable without changing how anything is deployed or invoked.

**Import strategy for N scripts sharing one module.** `sys.path.insert(0, str(Path(__file__).parent))` appears once, as the first executable line (before the `import hook_utils` that needs it), in all 9 hook scripts (confirmed by grep across both `ocx` and `grimoire`: `pre_tool_use_validator.py:12`, `post_tool_use_tracker.py:19`, `pre_commit_verification.py:21`, `pre_push_main_blocker.py:17`, `session_start_loader.py:8`, `stop_validator.py:9`, `subagent_stop_logger.py:15`, `user_prompt_router.py:19`, `conventional_commit_validator.py:12` — 9 sites per repo, 18 total; a sibling audit's count of "8" is close enough to be the same finding, possibly scoped to one repo minus one file). This is the **correct** answer for this shape, not a smell to fix, because every alternative is worse here specifically:
- A relative import (`from . import hook_utils`) fails outright — these scripts are always run as `__main__`, never as a package member, so there is no enclosing package for a relative import to resolve against.
- `PYTHONPATH` (env-var-based) is invisible at the call site, fragile across the multiple invocation contexts these scripts actually see (`uv run` from `settings.json`, a human running `python3 hook.py` directly to debug, a test harness importing the module directly), and would need to be set correctly in all of them.
- An installed package reintroduces the exact per-invocation dependency-resolution step (`pip install -e .` or equivalent) this shape exists specifically to avoid.

The one thing to watch: `sys.path.insert(0, ...)` must stay a **one-line, unconditional, first-thing-in-the-file** idiom. `subagent_stop_logger.py` additionally does `import pre_tool_use_validator` [subagent_stop_logger.py:18] to reuse its `detect_secrets()` — this works only because `subagent_stop_logger.py`'s *own* `sys.path.insert` already ran first in the same process; it does not depend on `pre_tool_use_validator.py`'s hooks directory being the cwd or on `pre_tool_use_validator.py` having been run first. That's still fine (both files are siblings on the same inserted path), but it's the first sign of real cross-script coupling in this module set, worth watching if it grows further.

**Keeping import time low.** These scripts run on every tool event — a `PreToolUse` hook with slow import-time cost adds latency to every single edit. None of the audited files violate this: all imports are stdlib (`json`, `re`, `subprocess`, `pathlib`, `hashlib`, `uuid`, `datetime`, `fnmatch`, `time`), all module-level work is limited to compiling regex patterns and building small constant tuples/dicts (e.g. `pre_tool_use_validator.py`'s `_SECRET_PATTERNS` list, compiled once at import) — no network calls, no file reads, no subprocess spawns happen outside a function body anywhere in the set.

**Versioning a script nobody installs.** There is no package version to bump — the only meaningful "version" signal for this shape is the `requires-python` floor in its own PEP 723 header (when present) and, practically, its git history. Nothing in the audited set needs anything more than that; none of these scripts are consumed by anyone who isn't also pulling the whole `.claude/hooks/` directory via the same git checkout.

### 7. Encoding, paths and portability

**Explicit `encoding="utf-8"` on every text open.** Confirmed precisely, not approximately: across every literal `open(...)` call in the entire audited set (18 hook files + `make-mark.py` + `check-artifacts.py`), exactly two are missing `encoding=` — both in `hook_utils.py`, both `open(path, "a")` appends: line 244 (`self.tracker_file`) and line 270 (`log_file`, the subagent log) [hook_utils.py:244, 270]. Every other text-writing call site in this file uses `Path.write_text()`/`Path.read_text()` instead, which has the *same* locale-dependent default-encoding behavior as bare `open()` but is a distinct API surface — a broader, lower-severity version of the same gap exists there too (roughly a dozen call sites across `hook_utils.py`, `pre_commit_verification.py`, `user_prompt_router.py`, and `make-mark.py` that don't pass `encoding=` to `.read_text()`/`.write_text()`), mitigated in practice because most of that content is `json.dumps()` output (which is ASCII-safe by default: `ensure_ascii=True`) or this project's own ASCII-clean Markdown/SVG. `check-artifacts.py` is the one file in the set that gets this fully right everywhere — every `.read_text()`/`.write_text()` call states `encoding="utf-8"` explicitly, including inside its own self-test fixtures.

**`Path` over `os.path`.** Already near-universal across the whole audited set — `StateManager` is built entirely on `pathlib.Path`, every hook script constructs paths with `Path(...)`/`/ `-joins, and `ruff.toml`'s `PTH` rule family (prefer-pathlib) is enabled for `grimoire-lore`'s own scripts. The only raw string-path handling anywhere is the two bare `open()` calls already flagged above — and even those take a `Path` object as their first argument, not a string.

**Windows.** None of the audited scripts run on Windows today: this development environment is Linux (WSL2), the catalog's own CI targets `ubuntu-latest` exclusively (`.github/workflows/python.yml`), and Claude Code hooks execute wherever the editor session runs — for this project, that's this Linux environment. If that ever changed, the one thing that would already be true and wouldn't need retrofitting is the `pathlib`-everywhere discipline above; no `os.path.join()` string-concatenation exists anywhere in the set to become a `\\`-vs-`/` bug. `case-insensitive filesystem` and `locale`-dependent behavior are consequently not live risks today, only latent ones the encoding gap above would turn real the moment a non-ASCII commit message or filename passed through the two un-encoded `open()` calls on a system whose default locale encoding isn't UTF-8.

## Normative guidance candidates

| # | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| 1 | A standalone dependency-free tool declares its Python floor with a PEP 723 `# /// script` header (`requires-python`), not only through `ruff.toml`'s `target-version` or a CI comment | The header is the one declaration a reader — and `uv run` — can act on directly, at the point of use, without cross-referencing lint config | `head -5 FILE \| grep -q '^# /// script'` then `grep -q 'requires-python' FILE` | medium |
| 2 | Omit the `dependencies` key entirely (not `dependencies = []`, not skipping the block altogether) when a script has zero third-party dependencies | Both an omitted key and an explicit empty list are valid PEP 723; the block's mere presence with `requires-python` is what makes the floor machine-enforced under `uv run` | manual read of the header; confirmed empirically this session against `uv run --verbose` | low |
| 3 | Never add a shebang or `chmod +x` to a script that is always invoked through an explicit interpreter/runner (`uv run "$PATH"`, `{{.PY}} path/to/tool.py`) | A shebang nobody exercises is dead weight and trips `ruff` EXE003/EXE001 the moment EXE rules are ever turned on for that path | `ruff check --select EXE PATH` | low |
| 4 | When a script *is* meant to run standalone (`./tool.py`), pair `chmod +x` with `#!/usr/bin/env -S uv run --script`, not a bare `#!/usr/bin/env python3` | The `-S uv run --script` form is the only shebang that actually enforces the declared floor/deps at invocation time rather than merely documenting them | `head -1 FILE` shows the exact string; `ls -l FILE` shows the exec bit | medium |
| 5 | Never `type=bool` in `argparse` | `bool("False")` is `True`; the flag silently inverts on the one input a user is most likely to try | `grep -n 'type=bool' FILE` — any hit is the violation | high |
| 6 | A standalone gate script uses exit `0` clean / `1` findings / `2` misuse, and never lets a crash produce exit `0` | `argparse` itself already claims `2` for usage errors — reusing `1`/`2` consistently keeps the whole invocation chain composable | read the script's own docstring/`main()` against actual `sys.exit()` call sites; confirm no bare `except Exception: sys.exit(0)` wraps the whole body | high |
| 7 | A Claude Code hook (or any harness-invoked script whose contract says "never fail the caller") documents that contract in its own docstring, in the same place its top-level `try/except` lives | `post_tool_use_tracker.py`'s docstring is the reference: the broad except is correct *because* it's named and justified, not because broad excepts are generally fine | manual read: does every top-level `except Exception`/`except:` that leads to exit 0 have an adjacent comment naming which harness contract requires it | high |
| 8 | Every `subprocess.run()`/`Popen` call in this shape carries an explicit `timeout=` | A hook with no timeout on a shelled-out `git`/tool call can hang the entire calling session indefinitely | `grep -n 'subprocess.run(' FILE` then confirm `timeout=` appears in the same call | high |
| 9 | Catch `BrokenPipeError` around any print loop whose output volume can plausibly exceed what a downstream `head`/`less` consumes, and exit non-zero, not 0, when it happens | Demonstrated: `check-artifacts.py`'s 428-line output through `head -1` raises `BrokenPipeError` on stderr today | plant ≥100 lines of output, pipe through `head -1`, `2>&1 1>/dev/null`, confirm the stderr capture is empty | high |
| 10 | A `--self-test`/`--selftest` entry point never uses bare `assert` for its pass/fail signal — use `raise SystemExit(msg)` or `unittest.TestCase` assertions | `python -O`/`PYTHONOPTIMIZE` strips every `assert` statement; demonstrated empirically against a planted regression in this project's own `check-artifacts.py` | `python -O FILE --self-test; echo $?` against a version with one check function neutered — exit must still be non-zero |  high |
| 11 | Reach for `unittest.TestCase` once a hand-rolled `expect()`-style self-test needs more than a handful of checks or any `setUp`/`tearDown`-shaped repetition | `unittest`'s assertion methods are ordinary calls, immune to `-O`, and its runner gives real per-check reporting and exit codes for free, at zero new dependencies | judgment call — no single grep; review when a self-test function exceeds ~15 checks or a screenful | low-medium |
| 12 | `doctest` is for the pure-function slice of a tool only (parsing/formatting helpers with fully deterministic output) — never the CLI entry point or anything with side effects | Doctest's exact-string matching makes it a flaky-test generator against dict/set order, timestamps, or filesystem/subprocess side effects | manual read: does the doctest'd function do I/O, spawn a process, or iterate an unordered collection in its example output | low |
| 13 | A dependency that's genuinely optional (e.g. YAML) is probed with `try: import X` at call time, with a hand-rolled, need-sized fallback — never silently degraded without a fallback, and never letting the fallback's own bugs hide inside the same broad `except` that catches the missing import | This repo's own git history (`8581552`) shows exactly what happens when the fallback silently mishandles an input shape: a check goes permanently, invisibly green | code review of the `try/except ImportError` (or bare `except`) block: does a distinguishable code path exist for "import failed" vs. "import succeeded but the call raised" | high |
| 14 | Refuse network calls by default in a zero-dependency tool of this shape; if one becomes unavoidable, `urllib.request` with an explicit `timeout=`, never the default (indefinite) | A per-tool-event hook making an untimed HTTP call is a latency/hang risk out of proportion to what this shape does | `grep -n 'urlopen\|urllib.request' FILE` then confirm `timeout=` on the same call | medium |
| 15 | Gate colour/formatting behind `sys.stdout.isatty()` (or an explicit `--no-color`/`NO_COLOR` check) rather than emitting ANSI escapes unconditionally | Harness- or pipe-consumed output should never carry control codes the consumer has to strip | `grep -n '\\033\[\|\\x1b\[' FILE` not immediately preceded by an `isatty()` guard | medium |
| 16 | `logging` is the wrong tool for a script whose stdout **is** a harness protocol (JSON decision payload, `additionalContext` text) — keep `print()`/direct file writes there; reach for `logging` only when the stream is a genuine human-readable diagnostic nobody else parses | Introducing handler/formatter machinery on top of an already-fixed wire format adds nothing and risks interleaving log lines into a payload a caller parses as JSON | read the calling harness's contract for that event type before adding `logging` | low |
| 17 | Every text `open()`/`Path.read_text()`/`Path.write_text()` call states `encoding="utf-8"` explicitly | The platform-default encoding is locale-dependent; two real, confirmed violations exist today at `hook_utils.py:244,270` | `grep -n 'open(' FILE \| grep -v encoding=` for the builtin; a similar pass for `.read_text(\|.write_text(` | high (the 2 confirmed `open()` sites), medium (the broader `Path` I/O gap) |
| 18 | `sys.path.insert(0, str(Path(__file__).parent))` as the *first* executable line is the correct answer for N sibling scripts sharing one un-installed helper module in the same directory — not a relative import (fails as `__main__`), not `PYTHONPATH` (invisible, must be set correctly at every call site) | Confirmed as the working, load-bearing pattern across all 9 files in both hook fleets today | manual read: is the insert the first statement, and does it run before the `import` it exists for | low |
| 19 | Split a shared "utils" module along concern boundaries (a second sibling file, still `sys.path`-imported) once it accumulates genuinely separate responsibilities used by disjoint subsets of the scripts that import it — do not "fix" this by packaging and installing while the deployment model is still "copy the directory" | `hook_utils.py` at 688 lines already carries two such concerns (`StateManager`, used by all 9; `LearningsStore`, used by 2) | judgment call: does the module serve two call-site sets that barely overlap | low-medium |
| 20 | Keep module-level cost at zero beyond stdlib imports and small constant construction — no network calls, file reads, or subprocess spawns outside a function body, for any script that runs on every tool event | Confirmed true everywhere in the audited set today; the constraint is preventive, not corrective | `python3 -c "import ast; ...":` or a manual read of everything outside `def`/`class`/`if __name__` blocks | low |
| 21 | A tool whose only stated floor is its lint config's `target-version` should restate that floor once, in its own PEP 723 header — not force a reader to cross-reference `ruff.toml`, the CI workflow's Python setup step, and "the tests are stdlib-only" to reconstruct it | `check-artifacts.py`'s floor (3.11) exists today only as `ruff.toml`'s `target-version = "py311"`, echoed (correctly, but indirectly) by a comment in `python.yml` | does the script's own file state a floor anywhere, independent of any other file | medium |
| 22 | A script using `X \| None`/`list[X]`-style annotations without `from __future__ import annotations` has an implicit floor of 3.10 — state it, don't leave it implicit | `make-mark.py` requires 3.10+ purely from its annotation syntax and declares this nowhere | `grep -n '\| None\|list\[' FILE` plus absence of `from __future__ import annotations` plus absence of a stated `requires-python` | medium |

## Applied to the hooks and the catalog scripts

**`/home/mherwig/dev/ocx/.claude/hooks/` and `/home/mherwig/dev/grimoire/.claude/hooks/`** (identical 9-script + `hook_utils.py` fleet, invoked via `uv run "$CLAUDE_PROJECT_DIR/.claude/hooks/NAME.py"` per `.claude/settings.json`):

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1 | PEP 723 `requires-python = ">=3.10"` header, all 9 scripts | **satisfied** | header confirmed by direct read; `uv run --verbose` resolves and launches `cpython-3.10.20` |
| 8 | `subprocess.run()` timeout on every call | **satisfied** | every call site in `pre_commit_verification.py`, `pre_push_main_blocker.py`, `stop_validator.py` carries `timeout=5` or `timeout=10` |
| 17 | `encoding=` on every text open | **violated** | `hook_utils.py:244`, `hook_utils.py:270` — both `open(path, "a")`, no `encoding=` |
| 18 | `sys.path.insert` for shared-module import | **satisfied** | present, first-line, in all 9 files per repo (18 total) |
| 19 | Split a bloated shared module along concern boundaries | **new commitment** | `hook_utils.py` (688 lines) carries `StateManager` (all 9 scripts) and `LearningsStore` (2 scripts); not yet split |
| 3, EXE family | No shebang/exec bit where invocation always supplies the interpreter | **satisfied**, but **unenforced** | none of the 18 files are `chmod +x`, none have a shebang — correct, but no `ruff.toml` scopes either `.claude/hooks/` path, so this is discipline, not a gate |
| 7 | Broad `except Exception` documented against the harness's own "must never exit non-zero" contract | **satisfied** | `post_tool_use_tracker.py:6-7`, `stop_validator.py`, `subagent_stop_logger.py` each carry the contract in their own docstring, not just the except block |
| 6 | Exit-code contract | **satisfied for its own harness** | always `0`; decision carried entirely on stdout (JSON for `PreToolUse`, text for `additionalContext` events) — the correct convention for *this* harness, not the Unix-CLI one |

**`/home/mherwig/dev/grimoire-lore/scripts/make-mark.py`**:

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1, 22 | PEP 723 header / declared floor | **violated** | no header at all; implicit 3.10+ floor from `X \| None` annotations, stated nowhere |
| 10 | Bare `assert` in self-test | **satisfied** — the reference pattern | `expect()` uses `raise SystemExit(...)` specifically because "assert is stripped by python -O" [make-mark.py:125-128] |
| 17 | Explicit encoding | **violated** (minor) | `Path.read_text()`/`write_text()` calls at lines 203, 204, 222 don't pass `encoding=` |
| 9 | `BrokenPipeError` handling | **not applicable** | writes one file, no unbounded stdout stream |

**`/home/mherwig/dev/grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py`**:

| # | Item | Verdict | Evidence |
|---|---|---|---|
| 1, 21 | PEP 723 header / declared floor | **violated** | no header; floor (3.11) stated only in `ruff.toml`'s `target-version`, echoed by a comment in `.github/workflows/python.yml` |
| 10 | Bare `assert` in self-test | **violated — demonstrated** | `self_test()` uses 8 bare `assert` statements; `python -O` against a planted regression prints `self-test: ok` and exits 0 where normal `python3` raises `AssertionError` and exits 1 (full transcript in Findings §5) |
| 9 | `BrokenPipeError` handling | **violated — demonstrated** | piping 428 lines of real findings through `head -1` produces `Exception ignored while flushing sys.stdout: BrokenPipeError` on stderr (full transcript in Findings §4) |
| 13 | Optional-dependency (YAML) probe + fallback | **satisfied — and the fix for a real, shipped bug** | `split_frontmatter()`'s `try/except` + `_mini_yaml()`; this project's own commit `8581552` fixed the exact "silent green" failure mode this pattern exists to prevent |
| 6 | Exit-code contract | **satisfied** | `0` clean / `1` findings / `2` bad invocation, stated in its own docstring and matching actual behavior |
| 17 | Explicit encoding | **satisfied** | every `.read_text()`/`.write_text()` call, including inside `self_test()`'s fixtures, states `encoding="utf-8"` |
| 18 | `sys.path` for shared imports | **not applicable** | no shared module — single file, no sibling to import |

**Direct verdict on `--self-test`, since this repository runs it as its own publishing gate**: it is a **sound pattern undermined by one mechanical implementation defect**, not a comfortable illusion by design. The shape — embedded in the tool itself, zero installed dependencies, exercised by `task ci` on every PR touching `*.py` — is exactly right, and `grimoire-lore/ruff.toml`'s `S101` exemption correctly identifies *why* asserts are there ("those asserts are the proof"). What the exemption gets wrong is treating that as a reason not to fix the implementation: **`python -O` does defeat it today**, demonstrated against a real planted regression, and the fix costs nothing — `make-mark.py`, in the same repository, already shows the one-line pattern (`raise SystemExit` instead of `assert`) that removes the defect without removing a single check, a dependency, or the "nothing installed" property this design is built around.

## AI-agent angle

| Mistake | Smallest mechanical check |
|---|---|
| Reaches for `requests`/`click`/`rich`/`yaml`/`pydantic` as a hard top-level import in a file under this shape | `grep -n '^import \(requests\|click\|rich\|pydantic\)\b\|^from \(requests\|click\|rich\|pydantic\)\b' FILE` — any hit outside a `try/except ImportError` block is the violation; for `yaml` specifically, the check is *inverted*: a **bare** top-level `import yaml` is the violation, a `try: import yaml / except ImportError:`-guarded one is the correct pattern |
| `print()`s where the calling harness parses stdout as structured data | For any `PreToolUse` hook: does every `print()` call pass through `hook_utils.output_json(...)` rather than a raw f-string, whenever the hook needs to communicate a permission decision |
| Bare `assert` as the pass/fail signal inside a `--self-test`/`--selftest` code path | `grep -n '^\s*assert ' FILE`, restricted to functions reachable from the self-test flag |
| No explicit `encoding=` on a text open | `grep -n 'open(' FILE \| grep -v encoding=`, and the same for `\.read_text(\|\.write_text(` |
| Assumes a TTY (unconditional ANSI colour, width-dependent layout) | `grep -n '\\033\[\|\\x1b\[' FILE` with no nearby `isatty()`/`NO_COLOR` guard |
| Assumes the cwd | Any bare relative-path string literal passed to `open()`/`Path(...)` that isn't built from `Path(__file__).parent`, an explicit CLI argument, or an environment variable |
| Swallows an exception so a gate reports success | `except Exception:`/bare `except:` immediately followed by `pass`/`return`/`sys.exit(0)` with no adjacent comment naming which harness contract requires the fail-open behavior |

## Contested / evolving

As of 2026-08-23:

- **PEP 723 tool adoption is uneven, not universal.** `uv` is the complete, actively-developed consumer this project already depends on; `pip` has no native consumer at all — a PEP 723 header is pure documentation under a bare `pip`/`python3 script.py` invocation. A script whose only real-world invocation path never goes through `uv run`/`pipx run`/`hatch run` gets none of the enforcement benefit, only the readability one. This matters directly for this repo's own `check-artifacts.py`, which `taskfile.yml` invokes via plain `{{.PY}}` = `python3` — adding a header there would document the floor but not enforce it under the existing invocation path, unless that path also changes to `uv run`.
- **Whether to write `dependencies = []` explicitly versus omitting the key** for a zero-dependency script: both are valid per the canonical spec; `uv add --script` always writes the key explicitly when *adding* a real dependency, but nothing in the spec or in `uv`'s own behavior prefers one style for a script that has none. This project's hook fleet omits it; that's a legitimate, working choice, not an incomplete one.
- **The `S101` self-test exemption in `grimoire-lore/ruff.toml`.** This dive's position (fix the bare `assert`s; the pattern is sound, the implementation isn't) is a genuine disagreement with a documented, deliberate decision already recorded in this repository, not an oversight nobody noticed — flagged here explicitly rather than folded silently into "now wrong," because a reasonable person wrote that comment on purpose and might reasonably want to keep the tradeoff once they've seen the `-O` transcript, e.g. if `-O` is never actually used anywhere this script runs.
- **Free-threaded Python (3.13t/3.14t)** is present on this exact development machine (`uv run --verbose` lists `cpython-3.14.6+freethreaded` as an available interpreter) but is not selected by, or relevant to, any script in this audited set — none of them are multi-threaded or CPU-bound. Noted only so a future addition to this shape that *does* spawn threads doesn't inherit a stale "the GIL protects me" assumption without re-checking which build it's actually running under.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [peps.python.org/pep-0723](https://peps.python.org/pep-0723/) | PEP 723, Inline Script Metadata | Accepted Jan 2024, now historical | The original spec text and the exact block-delimiter grammar/regex; states `dependencies`/`requires-python` are both optional |
| [packaging.python.org/.../inline-script-metadata](https://packaging.python.org/en/latest/specifications/inline-script-metadata/) | The canonical, continuously-updated successor to PEP 723 | current | Resolves the "is `dependencies` required" question authoritatively; the PEP itself says to defer to this page on any discrepancy |
| [docs.astral.sh/uv/guides/scripts](https://docs.astral.sh/uv/guides/scripts/) | uv's own guide to running PEP 723 scripts | current | `uv run`/`uv add --script`/`uv lock --script` and the `-S uv run --script` shebang form — the actual consumer this project depends on |
| [docs.astral.sh/ruff/rules/#pyflakes-exe](https://docs.astral.sh/ruff/rules/#pyflakes-exe) | ruff's EXE (flake8-executable) rule family reference | current | EXE001–EXE005, the exact shebang/exec-bit mismatches this shape is prone to; none of the audited fleet is covered by a scoped ruff config today |
| [docs.python.org/3/library/unittest.html](https://docs.python.org/3/library/unittest.html) | stdlib `unittest` reference | current | The stdlib fallback once a hand-rolled `expect()`-style self-test outgrows itself; assertion methods are immune to `-O` |
| [docs.python.org/3/library/doctest.html](https://docs.python.org/3/library/doctest.html) | stdlib `doctest` reference | current | Scoping doctest correctly to pure-function helpers, never CLI entry points or side-effecting code |
| [docs.python.org/3/using/cmdline.html](https://docs.python.org/3/using/cmdline.html) | CLI/environment reference, `-O` and `PYTHONOPTIMIZE` | current | The exact, authoritative wording that `-O` "removes assert statements" — grounds the central `--self-test` finding |
| [docs.python.org/3/library/tomllib.html](https://docs.python.org/3/library/tomllib.html) | stdlib `tomllib` reference | current (3.11+) | Read-only, binary-mode-only, 3.11+ floor — directly relevant since this fleet's declared floor (3.10) sits one version below it |
| [docs.python.org/3/library/subprocess.html](https://docs.python.org/3/library/subprocess.html) | stdlib `subprocess` reference | current | Grounds the `timeout=` requirement this fleet already satisfies everywhere |
| [docs.python.org/3/library/signal.html](https://docs.python.org/3/library/signal.html) | stdlib `signal` reference, "Note on SIGPIPE" | current | The documented `BrokenPipeError` recipe (catch it, redirect stdout to devnull, exit non-zero) that `check-artifacts.py` is missing |
| [docs.python.org/3/library/argparse.html](https://docs.python.org/3/library/argparse.html) | stdlib `argparse` reference | current | `type=bool`'s `bool("False") is True` trap, exit code 2 on usage errors, `BooleanOptionalAction` |
| [docs.python.org/3/library/pathlib.html](https://docs.python.org/3/library/pathlib.html) | stdlib `pathlib` reference | current | Grounds the `Path` -over- `os.path` recommendation this fleet already follows near-universally |
