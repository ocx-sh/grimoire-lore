---
title: "Process failure contract: exit codes, signals, streams, and crash-vs-failure across the Python CLI shapes"
topic: "What a Python process does when it fails — exit codes, uncaught exceptions, stdout/stderr, BrokenPipeError, argparse, signals, and atomic writes"
agent: dive-errors-exit-codes
model: sonnet
date_researched: 2026-08-23
sources_count: 14
scope: |
  Covers the PROCESS side of failure: what integer a Python process exits
  with, what stream a message lands on, what happens on SIGINT/SIGTERM/a
  broken pipe, and how a caller (shell, CI step, or the Claude Code hook
  harness) is supposed to read the result. Subjects: index/bot's `cli/`,
  the ocx/grimoire `.claude/hooks/` scripts + `hook_utils.py`,
  grimoire-lore's `scripts/make-mark.py` and
  `.claude/skills/research-lang/scripts/check-artifacts.py`, and the
  harness `test/scripts/`/`test/bin/` trees. Does NOT cover the SDK's
  exception *hierarchy design* — what's public, `@deprecated`, whether the
  1:1 exit-code-enum-to-exception mapping is good API shape — that is
  `python-api-design/sdk-public-surface.md`'s subject. Where the SDK's
  exceptions matter here, they are treated as a given input and the only
  question asked is how they turn into a process exit code.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [The exit-code table](#the-exit-code-table)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Applied to the subjects](#applied-to-the-subjects)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

---

## Summary

- `index/bot` already has a **pinned, ADR-backed exit-code contract** (`src/indexbot/exit_codes.py`, `errors.py`) using `IntEnum` values `0/1/65/75` — 65 and 75 are drawn directly from `sysexits.h` (`EX_DATAERR`, `EX_TEMPFAIL`), cited in the module docstring as "ADR-4 BD-2, sysexits family." This dive did not invent the sysexits recommendation — it found it already shipping, and evaluated whether the rest of this catalog's Python tools should match it.
- **The same integer means different things across these subjects, but only for `0`.** In the 9 Claude Code hook scripts, `sys.exit(0)` fires unconditionally on every path, including a `deny` decision — the verdict lives in stdout JSON (`hookSpecificOutput.permissionDecision`), not the exit code. In `check-artifacts.py`, `make-mark.py`, and `index/bot`, `0` means "nothing wrong was found." No other exit-code collision exists across the subjects: `65`/`75` are unique to `index/bot`; no subject uses `3`–`63` at all.
- `check-artifacts.py` already models the crash-vs-failure split cleanly (`0` clean, `1` findings, `2` bad invocation) and has zero top-level exception handling — a genuine bug is left to crash with a bare traceback, deliberately. `index/bot`'s `errors.py` states the same philosophy explicitly: *"Anything that is not an `IndexBotError` — a genuine bug — is deliberately left to propagate as an unhandled traceback rather than being caught here."*
- **For Claude Code hooks specifically, exit code 1 does not block anything.** Per the official hooks reference: *"exit code 2 is the only exit code that blocks through the code alone. Without valid JSON on stdout, Claude Code treats exit code 1 as a non-blocking error and proceeds with the action, even though 1 is the conventional Unix failure code."* This makes `post_tool_use_tracker.py`'s documented `except Exception: pass` policy ("CRITICAL: This is a PostToolUse hook. It MUST never exit non-zero.") technically redundant for blocking purposes but still correct for a different reason: an uncaught traceback would still surface as a `<hook name> hook error` transcript notice and would abort the hook's own bookkeeping mid-write.
- **`check-artifacts.py` is demonstrably vulnerable to `BrokenPipeError`.** Piped into `head -1` against this repo's own `.claude`/`.agents` trees, it printed `Exception ignored while flushing sys.stdout: BrokenPipeError: [Errno 32] Broken pipe` and exited **120** — not a traceback in the conventional sense, but `sys.exit()`'s own documented degenerate case for when *cleanup after* a caught `SystemExit` itself fails. `make-mark.py` and `doc_scripts_list.py` were not reproducible as vulnerable in practice — their entire stdout output is one short line, too small to fill the pipe buffer before the writer finishes.
- **No subject uses a `--json` mode**, so the "does a fatal error respect `--json`" question has a uniform, simple answer: no such mode exists anywhere in the four Python subjects audited.
- **`index/bot`'s CLI already gets the stdout/stderr split right almost everywhere**: every status/error `print()` in `validate.py`, `governance_check.py`, `seed_import.py`, and `main.py`'s top-level handler goes to `file=sys.stderr`; the sole stdout `print()`s are single-line human summaries (`announce.py`, `reconcile.py`), not data meant for parsing.
- **`index/bot` also already has the correct atomic-write idiom** (`adapters/local_files.py:64`, `_write_atomic`: `tempfile.mkstemp` in the target's own directory, write, `Path.replace()`, with `except BaseException: tmp.unlink(missing_ok=True); raise`). `hook_utils.py`'s six `.write_text()` call sites (session files, lock files, tracker/subagent logs) and `make-mark.py`'s `out.write_text(composed)` are all non-atomic — a process kill mid-write can leave a torn file, which matters most for the hook lock files since a concurrent agent session reads them for consistency.
- **No subject installs a signal handler, uses `atexit`, or overrides `type=bool`.** Confirmed by direct grep across every subject; not a single hit for `signal.signal`, `atexit`, or `type=bool`.
- **`index/bot` already answers the "test a CLI's exit code without a subprocess" question by example** (`tests/cli/test_main.py`): `main(argv: Sequence[str] | None = None) -> int` never calls `sys.exit()` itself — only the `if __name__ == "__main__":` guard does — so tests call `main_module.main([...])` directly, use `pytest.raises(SystemExit)` for the argparse-driven exits, and read `capsys.readouterr()` for stream assertions.
- **`sys.exit("message")` behaves exactly as documented and is used twice in `make-mark.py`**: prints to stderr, exits 1. This is not a bug in `make-mark.py` — it is the officially documented idiom (*"`sys.exit("some error message")` is a quick way to exit a program when an error occurs"*) — but it is worth flagging because it surprises readers who expect either "prints to stdout" or "exits 0."
- **Reproduced, in this session's own temp dir, the exact "return `bool` from `main()`" inversion**: `def main() -> bool: ...; return True` fed to `sys.exit(main())` exits with code **1** despite the author's own "no errors" comment, because `True == 1` as an int. Deleted after capture.
- **Reproduced SIGINT's exit code precisely**: an unhandled `KeyboardInterrupt` in a bare Python script exits **130** (128 + `SIGINT`=2), with a full traceback printed to stderr by default — confirmed via `timeout --preserve-status -s INT`, not assumed from convention.
- **sysexits-vs-Python-convention verdict, stated as a decision (not a derivation): keep argparse's own `2` for CLI usage errors; adopt the rest of `sysexits.h` (or a documented subset of it, as `index/bot` already has) for every application-level failure category a tool defines beyond "you typed the command wrong."** Overriding `argparse`'s hard-coded `2`→`64` remapping is nonstandard, adds real code, and fights a framework default every Python reader already recognizes; the cross-tool agreement this catalog actually needs is on the failure categories a Rust sibling and a Python sibling both encode deliberately (validation failure, integrity anomaly, transient/retriable failure), which is exactly the part `index/bot` already got right.

---

## Findings

### 1. What the numbers mean, subject by subject

Full inventory — every `sys.exit`, `raise SystemExit`, `argparse` error path, `def main` return contract, and top-level `try`/`except` found, with file:line:

**`index/bot/src/indexbot/cli/main.py`**
- `main.py:41` imports `ExitCode` (`IntEnum`: `OK=0`, `VALIDATION_FAILURE=1`, `ANOMALY=65`, `TRANSIENT=75`) from `indexbot/exit_codes.py:14-27`.
- `main.py:117` — `subparsers = parser.add_subparsers(dest="command", required=True)` — a missing/unknown subcommand raises `SystemExit(2)` from inside `parser.parse_args()` itself, never reaching `main()`'s own code.
- `main.py:116` — `parser.add_argument("--version", action="version", ...)` — argparse's own `version` action prints and exits `0`.
- `main.py:126-148` — `def main(argv=None) -> int`: `return int(handler(args))` on success; `except IndexBotError as exc: ... return int(exc.exit_code)` — the single chokepoint mapping `IndexBotError` subclasses to `1`/`65`/`75`. Anything else (a genuine bug) is not caught here and propagates as a bare traceback (documented at `main.py:17-22` and `errors.py:1-6`).
- `main.py:152` — `sys.exit(main())` only under `if __name__ == "__main__":`.
- `indexbot/errors.py:32-46` — `ValidationError` → `VALIDATION_FAILURE` (1); `AnomalyError` → `ANOMALY` (65); `TransientError` → `TRANSIENT` (75).

**`index/bot/src/indexbot/cli/validate.py`** — `_print_report` (`validate.py:350-358`): `OK`/`FAIL`/`WARN` lines all to `file=sys.stderr`. `run()` catches `AnomalyError`/`ValidationError` per-file and folds them into a `FileReport`, not a raw process exit — the aggregate `ExitCode` is decided by the caller.

**`index/bot/src/indexbot/cli/reconcile.py:201`** — `except ValidationError as error:`; `reconcile.py:289,293` — the only two stdout `print()`s in the whole `cli/` package, both single-line human summaries, not structured output.

**`grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py`**
- Docstring (`check-artifacts.py:11-13`): *"Exit 0 = clean, 1 = findings, 2 = bad invocation."*
- `check-artifacts.py:570` — `parser.error("give at least one PATH, or --self-test")` → argparse's own `SystemExit(2)`, bypassing `main()`'s `return` entirely.
- `check-artifacts.py:576-577` — a bad `--root`/path target: hand-written `return 2` (not argparse-mediated) — same integer, same meaning ("bad invocation"), different mechanism.
- `check-artifacts.py:584` — `return 1 if findings else 0`.
- `check-artifacts.py:544` — `self_test()` returns `0` on success, raises `SystemExit` via `expect()`'s `raise SystemExit(f"selftest: {what}")` (line 128) on a failed internal assertion — i.e. the self-test's own failure path does not go through the `0/1/2` contract at all; it's a distinct, undocumented fourth shape.
- No top-level `try`/`except` anywhere in the file — a genuine bug is a bare traceback (exit `1`, default Python behavior), same philosophy as `index/bot`.

**`grimoire-lore/scripts/make-mark.py`**
- `make-mark.py:41` — `sys.exit("glyph has neither a viewBox nor numeric width/height")` → stderr, exit `1`.
- `make-mark.py:128` — `raise SystemExit(f"selftest: {what}")` inside `expect()`, a self-test-only helper (mirrors `check-artifacts.py`'s pattern, independently).
- `make-mark.py:196` — `p.error("name and glyph are required")` → argparse `SystemExit(2)`.
- `make-mark.py:220-221` — `except ET.ParseError as e: sys.exit(f"{a.glyph}: composed mark is not well-formed XML: {e}")` → stderr, exit `1`.
- `main()` has **no return-value/exit-code contract at all**: `if __name__ == "__main__": main()` — the bottom of the file does not call `sys.exit(main())`; the process's exit code is decided solely by whether an exception (or explicit `sys.exit`) occurred, never by a returned value. This is a third distinct entrypoint shape in this catalog, next to `index/bot`'s `sys.exit(main())` (return-value-driven) and `check-artifacts.py`'s identical `sys.exit(main(...))` shape.

**`ocx/test/scripts/doc_scripts_list.py`** — no `sys.exit`, no `try`/`except`, no argparse, anywhere. A failure of any kind (missing file, bad JSON) is a bare traceback with Python's default exit code `1`. This is the one subject with **no deliberate exit-code contract whatsoever** — worth naming plainly rather than glossing over.

**The 9 hook scripts (`ocx/.claude/hooks/`, byte-identical in contract to `grimoire/.claude/hooks/` — `hook_utils.py` itself diffs as byte-identical between the two repos; the individual hook files differ only in unrelated content, e.g. an added `release` conventional-commit type)**:

| File | Every `sys.exit` call found |
|---|---|
| `conventional_commit_validator.py:85,89,94,110` | `sys.exit(0)` ×4 |
| `post_tool_use_tracker.py:271,274,279,307` | `sys.exit(0)` ×4, inside a documented top-level `except Exception: pass` (line 189, 303 area; docstring line 7) |
| `pre_commit_verification.py:186,190,194,202,207,214` | `sys.exit(0)` ×6 |
| `pre_push_main_blocker.py:137,141,153,160` | `sys.exit(0)` ×4 |
| `pre_tool_use_validator.py:124,128,142,152,162,177,188,190` | `sys.exit(0)` ×8 |
| `session_start_loader.py:56,62` | `sys.exit(0)` ×2 |
| `stop_validator.py:82,88,94` | `sys.exit(0)` ×3, one `except Exception:` at line 65 |
| `subagent_stop_logger.py:84,88,98` | `sys.exit(0)` ×3, `except Exception:` at line 93 |
| `user_prompt_router.py:120,122,126,130,134,140` | `sys.exit(0)` ×6 |

**Every single `sys.exit` call in all 9 hook scripts, across both repos, is `sys.exit(0)`.** None uses `2`, none uses any other code. The verdict (allow/deny/ask) is carried entirely by `hook_utils.output_json()` (`hook_utils.py:36-38`, `print(json.dumps(data, ...))`) building a `{"hookSpecificOutput": {"permissionDecision": "deny"/"ask", "permissionDecisionReason": ...}}` object via `hook_utils.deny()`/`hook_utils.ask()` (`hook_utils.py:46-66`). This is a deliberate architectural choice, not an oversight — see Finding 2.

### 2. Crash vs. failure, and what the hook harness actually does with each code

`check-artifacts.py`'s `0`/`1`/`2` split is the right pattern and the other three "gate" subjects (`index/bot`, `make-mark.py`'s `p.error()` path) already follow its shape, whether or not they say so explicitly: **`0` = nothing to report, `1` = the tool ran correctly and found a real problem, `2` (or an `IndexBotError`-mapped code) = the tool couldn't even start meaningfully, and anything else = the tool itself is broken.** The fourth bucket is enforced by omission, not by a catch-all handler: neither `check-artifacts.py` nor `index/bot/cli/main.py` wraps the dispatch in `except Exception` — both explicitly document that a genuine bug should crash loud.

The harness this pattern is written *against* is not a shell pipeline for these hook scripts — it's Claude Code's own hook contract, fetched directly from [code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks):

> "Exit 0 means success, and is the intended exit code when you print JSON for structured control."
>
> "Exit 2 means a blocking error... even a JSON `permissionDecision` of `"allow"` can't override it."
>
> "For most hook events, exit code 2 is the only exit code that blocks through the code alone. Without valid JSON on stdout, Claude Code treats exit code 1 as a non-blocking error and proceeds with the action, even though 1 is the conventional Unix failure code."
>
> Per-event behavior: `PreToolUse` — "Blocks the tool call"; `PostToolUse` — "Shows stderr to Claude; the tool already ran"; `Stop` — "Prevents Claude from stopping, continues the conversation"; `SessionStart`/`Setup` — "Shows stderr to user only."

This resolves the "how does the caller tell crash from failure" question precisely for this subject group: **the hooks never rely on exit-code-driven blocking at all.** They always exit `0` and let `permissionDecision: deny` do the blocking through the JSON channel — none of the 9 scripts uses the code-`2` blocking lever the harness offers. Given the doc's own warning that plain exit `1` is silently non-blocking, this is the *safer* of the two available designs, not a missed opportunity: a hook author who forgot to check a JSON-schema-validation edge case and let an exception fall through to a plain nonzero exit would, under this harness, produce a swallowed non-blocking error rather than a blocked tool call either way — so the `except Exception: pass; sys.exit(0)` pattern and pure-JSON-only blocking are two expressions of the same underlying fact: **exit code alone cannot reliably communicate "deny" here except via literal `2`, which none of these scripts use.**

### 3. Uncaught exceptions, precisely

`BaseException` is the root of `SystemExit`, `KeyboardInterrupt`, and `Exception` — not the reverse — specifically so that `except Exception:` (used deliberately in `post_tool_use_tracker.py`, `stop_validator.py`, `subagent_stop_logger.py`) does **not** accidentally swallow a `Ctrl-C` or an in-flight `sys.exit()`. Per [docs.python.org/3/library/exceptions.html](https://docs.python.org/3/library/exceptions.html):

> `KeyboardInterrupt`: *"The exception inherits from `BaseException` so as to not be accidentally caught by code that catches `Exception` and thus prevent the interpreter from exiting."*
>
> `SystemExit`: *"It inherits from `BaseException` instead of `Exception` so that it is not accidentally caught by code that catches `Exception`. This allows the exception to properly propagate up and cause the interpreter to exit. When it is not handled, the Python interpreter exits; no stack traceback is printed."*

This makes `except Exception:` at the top of `main()` — exactly the shape used in the three hook scripts above — defensible specifically *because* it cannot suppress a genuine interrupt or an already-decided exit; a `catch-all except BaseException:` would be the actual mistake, since it would also eat `KeyboardInterrupt` and `SystemExit`, and no subject in this audit does that. **`SystemExit` printing no traceback is itself notable**: a `parser.error()`/`p.error()` call is *silent* about the fact that it exited via exception at all — the only visible output is argparse's own usage message on stderr, which is correct and expected.

An unhandled `KeyboardInterrupt`, by contrast, **does** print a full traceback by default — reproduced directly (`timeout --preserve-status -s INT 1 python3 <script that sleeps>` → `KeyboardInterrupt` traceback on stderr, exit `130`). None of the four non-hook Python subjects catches `KeyboardInterrupt` anywhere, so a `Ctrl-C` mid-run on any of them today produces a traceback, not a clean one-line message — a legitimate, low-severity gap (see Normative guidance §5).

### 4. Streams

`index/bot`'s CLI is the reference case: every error/status `print()` outside the two single-line stdout summaries (`announce.py:247`, `reconcile.py:289,293`) is explicitly `file=sys.stderr` — confirmed by direct grep of every `print(` call in `cli/*.py`. This matches the standard rationale (stdout is for the tool's actual output — the thing a downstream consumer parses or redirects to a file; stderr is for messages about the run itself) without needing to invent a new rule for this catalog. No subject has a `--json` mode, so there is no divergent "does the fatal path respect `--json`" behavior to reconcile — the answer is uniformly "there is no `--json` mode in any of these four Python tools today."

`check-artifacts.py` also gets this right: findings and the final "N finding(s)"/"clean" line go to stdout (`check-artifacts.py:581-584` — this *is* the tool's actual output, meant to be read or piped), while `"error: no such path"` (line 576) goes to stderr. `make-mark.py`'s two `sys.exit(f"...")` calls are stderr by construction (§ per `sys.exit`'s documented behavior below); its one success message (`print(f"wrote {out...}")`, line 223) is stdout, correctly, since it is the tool's actual output confirmation.

### 5. `BrokenPipeError` — demonstrated, not theoretical

The official fix, quoted verbatim from [docs.python.org/3/library/signal.html#note-on-sigpipe](https://docs.python.org/3/library/signal.html):

```python
import os
import sys


def main():
    try:
        for x in range(10000):
            print("y")
        sys.stdout.flush()
    except BrokenPipeError:
        devnull = os.open(os.devnull, os.O_WRONLY)
        os.dup2(devnull, sys.stdout.fileno())
        sys.exit(1)  # Python exits with error code 1 on EPIPE


if __name__ == "__main__":
    main()
```

The same page explains *why* this shape is required and not optional: CPython sets `SIGPIPE` to `SIG_IGN` at startup specifically *"so write errors on pipes and sockets can be reported as ordinary Python exceptions"* rather than killing the process outright with an uncatchable signal — which is also why the observed failure below is a Python exception, not a signal death.

**Reproduced against the real subject**, from this repo's own root:

```
$ python3 .claude/skills/research-lang/scripts/check-artifacts.py .claude .agents --root . | head -1
.claude/skills/ai-config-authoring/references/updating.md: 106 lines but no table of contents or routing table
```

stderr (captured separately, same run):
```
Exception ignored while flushing sys.stdout:
BrokenPipeError: [Errno 32] Broken pipe
```
Exit code of the left-hand process (via `PIPESTATUS`): **120**.

`check-artifacts.py`'s full output against `.claude`/`.agents` is 73,631 bytes — comfortably past the ~64KB Linux pipe buffer, so `head -1` reliably closes its read end while the writer is still mid-stream. `check-artifacts.py` has no `try/except BrokenPipeError` anywhere in the file: **it is vulnerable, confirmed by direct reproduction, not by inspection alone.**

The `120` is not arbitrary — it is `sys.exit()`'s own documented behavior for exactly this situation, per [docs.python.org/3/library/sys.html#sys.exit](https://docs.python.org/3/library/sys.html):

> "Changed in version 3.6: If an error occurs in the cleanup after the Python interpreter has caught `SystemExit` (such as an error flushing buffered data in the standard streams), the exit status is changed to 120."

The causal chain, fully explained: `check-artifacts.py:588` calls `sys.exit(main(sys.argv[1:]))`; `main()` returns normally (`0` or `1`); the interpreter catches that `SystemExit` and proceeds to its own shutdown sequence, which flushes `sys.stdout` — and *that* flush is where the buffered, not-yet-written tail of the findings output finally hits the closed pipe and raises `BrokenPipeError`, which Python cannot cleanly propagate at that point, so it reports it as an "Exception ignored" message and overrides the exit status to `120`.

`make-mark.py` (`wrote assets/lore-<set>.svg`, one line) and `doc_scripts_list.py` (one JSON line) were checked and are not practically reproducible as vulnerable — their entire output is far under the pipe buffer size, so the writer finishes before `head -1` closes the pipe, in every run observed. This does not make them permanently safe (a future change that loops output would reintroduce the same class of bug with no warning), but there is nothing to demonstrate against them today.

### 6. `argparse` as a contract

- **`exit_on_error` (default `True`, added 3.9)**: *"Normally, when you pass an invalid argument list to the `parse_args()` method of an `ArgumentParser`, it will print a message to `sys.stderr` and exit with a status code of 2."* Setting it `False` converts that into a catchable `argparse.ArgumentError` instead. None of the four subjects sets this — all four rely on the default exit-on-error behavior. [docs.python.org/3/library/argparse.html#exit-on-error](https://docs.python.org/3/library/argparse.html)
- **`ArgumentParser.error(message)`**: *"This method prints a usage message, including the message, and terminates the program with a status code of 2."* Both `check-artifacts.py:570` and `make-mark.py:196` call this directly for their own "you didn't give me enough" case — this is the "custom `error()` override" the brief asked about, except neither actually *overrides* it; both just *call* the existing one, which is the right move when `2` is already the correct code (a missing required argument genuinely is a usage error). No subject was found overriding `error()` to change the code — there was no case in this audit where `2` was the *wrong* code for an argparse-driven failure.
- **The `bool` trap**: *"The `bool()` function is not recommended as a type converter. All it does is convert empty strings to `False` and non-empty strings to `True`."* Official example: `parser.add_argument('--verbose', type=bool)` then `parser.parse_args(['--verbose', 'False'])` → `Namespace(verbose=True)`. Confirmed no subject uses `type=bool` (grep, zero hits across all four Python subjects).
- **Mutually exclusive groups**: `add_mutually_exclusive_group()` / `add_mutually_exclusive_group(required=True)` — `index/bot/cli/announce.py:121-123`'s docstring references this pattern directly ("mutually exclusive at the argparse layer") for `--tags`/`--tags-file`.
- **`--version`**: only `index/bot` declares one (`main.py:116`, `action="version"`, prints `0`). `check-artifacts.py` and `make-mark.py` have no `--version` flag at all.
- **Testing without a subprocess**: `index/bot/tests/cli/test_main.py:27-42` is the answer, sourced from this codebase's own precedent — `main(argv)` returns an `int` and only the `if __name__ == "__main__":` guard calls `sys.exit()`, so a test calls `main_module.main([...])` directly: `pytest.raises(SystemExit)` + `exc_info.value.code` for the argparse-driven paths (`--version`, missing/unknown subcommand — both exit via `SystemExit` raised inside `parse_args()`), and a plain `assert main_module.main([...]) == ExitCode.X` would work for the normal-return dispatch path. `capsys.readouterr()` asserts on stdout/stderr in the same test, no subprocess spawned.

### 7. Signals and cancellation

No subject — hook, CLI, or script — installs a `signal.signal()` handler, and none uses `atexit` (confirmed by grep, zero hits across every audited path). Every subject that needs cleanup on the happy path uses ordinary `try`/`finally` or (for `index/bot`'s atomic writes) an `except BaseException:` cleanup block scoped to the one operation that needs it — not a global signal handler. This matches the standard guidance that a signal handler can only safely do very little (set a flag, write to a self-pipe) — none of these tools is long-running enough in a way that needs that; the closest candidate, `index/bot`, runs as a one-shot CI step per invocation, not a persistent process, so "what should a long-running bot do on `SIGTERM` in CI" is, today, a question with no live subject to answer it — `index/bot` is not long-running in the sense the question implies (it is `indexbot validate`/`indexbot render`/etc., one subcommand, one exit, per process).

### 8. Idempotency and partial failure

`index/bot/src/indexbot/adapters/local_files.py:64-73` is the reference implementation:

```python
def _write_atomic(self, target: Path, data: bytes) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(dir=target.parent, prefix=f".{target.name}.", suffix=".tmp")
    tmp = Path(tmp_name)
    try:
        with os.fdopen(fd, "wb") as handle:
            handle.write(data)
        tmp.replace(target)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise
```

Same directory (so `Path.replace()` is a same-filesystem rename, which POSIX guarantees atomic), narrow `except BaseException` scoped only to "clean up my own temp file," then re-raise unconditionally — this is correct on every count, including using `BaseException` here specifically because cleanup-on-the-way-out must run even for a `KeyboardInterrupt` mid-write, unlike the top-level `except Exception:` case in §3.

Contrast: `hook_utils.py` has six `.write_text()` call sites (`hook_utils.py:133,218,256,283,382,465` — session files, lock files, the file-modification tracker log, the subagent log, a day-30 sentinel, and a generic path writer) and none goes through an atomic-write helper; `make-mark.py:224`'s `out.write_text(composed)` is the same direct-write pattern. For the hook lock files specifically, this is the more consequential of the two: `pre_tool_use_validator.py`'s own docstring says it *"Acquires a lock on success so other agents can detect concurrent edits"* — a torn write to that lock file (process killed mid-`write_text`) could leave a truncated or invalid JSON lock that a concurrent agent session's `json.loads()` then fails to parse (already guarded, per `hook_utils.py:187,195` — `except (json.JSONDecodeError, OSError):` around the *read* side — but a torn write is still a state loss the read-side guard papers over rather than prevents).

---

## The exit-code table

**This is a pinned project decision, not a derived rule** — it exists to be agreed on across languages, not to be independently re-derived per tool.

| Code | Meaning here | Source convention | Status in this catalog today |
|---|---|---|---|
| `0` | Success / nothing to report. **Exception**: in a Claude Code hook script, `0` means only "the hook process itself ran to completion" — the actual allow/deny/ask verdict is carried by stdout JSON, not this code. | Universal / Python (`sys.exit()` docs: "zero is considered 'successful termination'") | Used everywhere; the hook-script meaning is a documented divergence, not a bug (§2) |
| `1` | General failure — "the tool ran correctly and found a real problem," or an uncaught bug's default fallback. | Python/Unix convention ("Unix programs generally use... 1 for all other kinds of errors," `sys.exit()` docs) | `check-artifacts.py` (findings), `index/bot` (`ExitCode.VALIDATION_FAILURE`), `make-mark.py` (`sys.exit("message")` paths). **Silently non-blocking for a Claude Code hook** regardless of intent (§2) — no hook script relies on it |
| `2` | Bad invocation / usage error — argparse's own hard-coded default, kept deliberately rather than remapped. | Python/Unix convention + `argparse`'s own hard-coded default (docs: *"exit with a status code of 2"*) — **differs from `sysexits.h`'s `EX_USAGE=64`** | `check-artifacts.py` (both `parser.error()` and its own hand-written `return 2` for a bad path — same meaning, two mechanisms), `make-mark.py` (`p.error(...)`). `index/bot` inherits it for free from `required=True` subparsers |
| `65` | `EX_DATAERR` — integrity/data violation, requires a human, never auto-healed. | `sysexits.h` | `index/bot`'s `ExitCode.ANOMALY` — the one deliberate sysexits adoption in this catalog's Python side today |
| `75` | `EX_TEMPFAIL` — transient/retriable failure, caller may retry. | `sysexits.h` | `index/bot`'s `ExitCode.TRANSIENT` |
| `120` | Not a chosen code — Python's own runtime signal that cleanup-after-`SystemExit` itself failed (e.g. the `BrokenPipeError`-at-shutdown case in §5). | Python interpreter internal, since 3.6 | Observed, not designed; treat any `120` in CI logs as "add a `BrokenPipeError` handler here," never as an intentional signal |
| `126` | Command found but not executable. | POSIX shell | Not produced by any Python subject directly — relevant only to the shell wrapping them |
| `127` | Command not found. | POSIX shell (*"If a command is not found, the exit status shall be 127"*) | Same — shell-level, not Python-level |
| `128+N` | Terminated by signal `N` (e.g. `130` = `SIGINT`, `143` = `SIGTERM`). | POSIX (*"The exit status of a command that terminated because it received a signal shall be reported as greater than 128"*) | Reproduced directly for `SIGINT` → `130` (§3); no subject currently catches or cleans up on this path |

**The sysexits-vs-Python-convention verdict:** agree with the Rust siblings on the *application-level failure categories* (`sysexits.h`'s `65`/`70`/`75`/etc., wherever a tool defines a bespoke error type it fully controls — `index/bot`'s `IndexBotError` subclasses are the model), because that's where a shared CI orchestration script or retry wrapper actually needs the two ecosystems to agree. **Do not fight `argparse`'s own hard-coded `2` for usage errors** by hand-rolling a `64` remap — it is nonstandard within Python, adds real code and test surface for a case (`argparse`'s own `parse_args()`-raised `SystemExit`) that isn't easily interceptable without `exit_on_error=False` and a wrapper anyway, and every Python reader's convention already reads `2` as "you typed the command wrong." If a pipeline genuinely needs to treat "usage error" uniformly across a Rust `64` and a Python `2`, that reconciliation belongs at the orchestration layer (check for either code), not by forcing Python tools away from their own ecosystem's idiom.

---

## Normative guidance candidates

1. **Every new Python CLI entrypoint must have `main(argv=None) -> int` (or an `IntEnum`-typed `ExitCode`) as its return contract, with `sys.exit(main())` (or `sys.exit(int(main()))`) appearing exactly once, under `if __name__ == "__main__":`.** *Rationale:* this is the one pattern in the catalog (`index/bot`) that is independently testable without a subprocess (§6) and that cannot fall into the bool-return inversion (§ AI-agent angle). *Verify:* `grep -n "^def main(" <file>` then confirm the signature's return annotation is `int`/an `IntEnum`, never `bool`/`None`; `grep -c "sys.exit(main(" <file>` should be exactly `1`. Severity: **high** — a violation silently inverts pass/fail.
2. **A tool that produces more than a handful of lines of stdout output must handle `BrokenPipeError` using the documented idiom** (§5). *Rationale:* demonstrated, not theoretical — `check-artifacts.py` reproduces it today. *Verify:* `<tool> <args that produce >64KB of output> | head -1` and confirm no `BrokenPipeError`/`Exception ignored` text appears on stderr; empty stderr is the pass. Severity: **medium** — cosmetic today (the tool still "worked," the consumer got its one line), but noisy in CI logs and turns into a real bug the day someone adds `set -o pipefail` plus a stricter log-scraper.
3. **Every `print()` that is not the tool's own intended output must carry `file=sys.stderr`.** *Rationale:* `index/bot`'s `validate.py`/`governance_check.py` already do this consistently; it is what makes the tool pipeline-safe. *Verify:* no fully mechanical check exists (a grep for "error"/"fail" in a `print(` call both over- and under-matches); the workable proxy is `grep -n "print(" <file>` followed by a one-line-per-call manual classification into "this is the output" vs. "this is a message about the run." Severity: **medium**.
4. **Any lock/state file a concurrent process reads (the hook harness's `.locks/*.lock`, session files, tracker logs) must be written via the same atomic temp-then-`Path.replace()` pattern `index/bot/adapters/local_files.py:_write_atomic` already uses**, not a direct `.write_text()`. *Rationale:* a torn write to a file another process is concurrently reading is a real, if rare, correctness bug, and the fix already exists in this codebase — it just isn't shared into `hook_utils.py`. *Verify:* `grep -n "\.write_text(" hook_utils.py` — every hit is currently a finding; the check passes once each is replaced by a call through a shared atomic-write helper (none exists yet in `hook_utils.py` — this guidance implies adding one, mirroring `_write_atomic`). Severity: **low-medium** — the read side already guards against a malformed result (`hook_utils.py:187,195`), so today's exposure is "occasional silent lock loss," not corruption that propagates.
5. **A tool whose main loop can run long enough for a human to `Ctrl-C` it should catch `KeyboardInterrupt` at the top level and print one line to stderr, not let the default traceback through** — but must never wrap it in a bare `except Exception:` (§3 explains why that's structurally impossible to get wrong by accident, but the *intentional* equivalent, `except (Exception, KeyboardInterrupt):`, is the mistake to avoid). *Rationale:* today's default (a raw traceback on `Ctrl-C`, confirmed in §3) is not wrong, just unpolished, for every subject in this audit — none is long-running enough to make this urgent. *Verify:* `timeout --preserve-status -s INT 1 <tool that runs >1s>` and check whether stderr shows a Python traceback (current default, acceptable-but-crude) or a clean one-liner (nicer, not yet present anywhere). Severity: **low**.
6. **Do not hand-roll an `argparse` `error()` override to change `2` to something else** unless the tool defines a failure category `argparse` itself cannot express (i.e., not a parsing failure at all) — in which case raise/return the tool's own code from inside the handler, after `parse_args()` has already succeeded, exactly as `index/bot`'s `IndexBotError` mapping already does; never inside `error()` itself. *Rationale:* stated in the exit-code table's verdict above. *Verify:* `grep -n "class.*ArgumentParser" <file>` — a subclass overriding `error()` is the smell to look for; none exists in this catalog today, so the check should stay empty. Severity: **low** (preventive; no current violation).

---

## Applied to the subjects

| Subject | `0`/`1`/`2`+ contract | Crash-vs-failure split | `BrokenPipeError` | Atomic writes | Verdict |
|---|---|---|---|---|---|
| `index/bot/src/indexbot/cli/*` | **Satisfied** — `ExitCode` `IntEnum`, `0/1/65/75`, `main.py:126-148` single chokepoint | **Satisfied** — `errors.py:1-6` documents "genuine bug... left to propagate" | Not reproducible as vulnerable — no multi-line `print()` loop found on any stdout path | **Satisfied** — `adapters/local_files.py:64-73`, the reference implementation | Reference implementation for the other three |
| `.claude/skills/research-lang/scripts/check-artifacts.py` | **Satisfied**, documented in its own docstring (`0`/`1`/`2`) | **Satisfied** — no top-level `try`/`except` | **Violated** — reproduced, exit `120` under `| head -1` (§5) | Not applicable (writes nothing; read-only gate) | New commitment: add the `BrokenPipeError` handler from §5's normative guidance #2 |
| `grimoire-lore/scripts/make-mark.py` | **Partially satisfied** — `sys.exit("msg")`/`p.error()` used correctly, but `main()` has no `-> int` return contract and no `sys.exit(main())` wrapper (§1) | **Satisfied** — no top-level catch-all | Not reproducible as vulnerable today (single-line output) | **Violated** — `out.write_text(composed)` at line 224, direct, non-atomic | New commitments: give `main()` an explicit `-> None`-is-fine-but-document-it contract or switch to the `-> int`/`sys.exit(main())` shape (guidance #1); atomic-write the output SVG (guidance #4's pattern, generalized) |
| `ocx/test/scripts/doc_scripts_list.py` | **Absent** — no `sys.exit`, no contract at all | Not applicable — nothing to distinguish; any failure is Python's bare default | Not reproducible as vulnerable (single JSON line) | Not applicable (prints, doesn't write a file) | New commitment: lowest priority of the four — it's a single-purpose CI-glue script with one failure mode (crash), which is arguably already the right amount of ceremony for what it does; flagging only so the absence is a documented choice, not an oversight |
| 9 hook scripts + `hook_utils.py` (`ocx`/`grimoire` `.claude/hooks/`) | **Satisfied for their actual harness** — always `sys.exit(0)`, verdict via JSON (§1, §2), matches the documented Claude Code hooks contract exactly | **Satisfied** — `post_tool_use_tracker.py`'s documented `except Exception: pass` is the correct shape given the harness's own "exit 1 is non-blocking anyway" behavior | Not applicable — hook stdout is a single JSON object, never a multi-line stream | **Violated** — six `.write_text()` sites in `hook_utils.py` (§8) | New commitment: atomic-write the lock/session/tracker files (guidance #4); everything else about this group is already correct for its actual contract |

---

## AI-agent angle

- **`sys.exit(main())` where `main() -> bool` returns `True` for success.** This is the single most dangerous mistake in this whole area because it inverts pass/fail silently — reproduced directly: `def main() -> bool: print("work done, no errors"); return True` then `sys.exit(main())` exits **`1`** despite the success message. Smallest mechanical check: `grep -n "^def main(.*-> bool" <file>` — any hit combined with that function feeding `sys.exit()` is the bug; empty output is the pass. Confirmed the check discriminates correctly against both the planted violation (red) and `index/bot`'s/`make-mark.py`'s real `main()`s (clean, since neither is `-> bool`).
- **`exit()`/`quit()` instead of `sys.exit()` in a script.** `exit()`/`quit()` are `site`-module conveniences meant for the interactive REPL and are not guaranteed to exist when Python is invoked with `-S`; they also don't accept the same non-integer-message convenience as cleanly in every context. Smallest mechanical check: `grep -n "\bexit(\|	quit(" <file>` that isn't `sys.exit(` or `parser.exit(`/`p.exit(` — none of the four Python subjects does this today (confirmed by grep), so the check should stay empty.
- **`os._exit()` used where a normal `sys.exit()` would do.** `os._exit()` skips `finally` blocks, `atexit` handlers, and stream flushing — appropriate only after `fork()` in a child that must not run parent cleanup, never as a normal CLI's exit path. No subject uses it (confirmed). Smallest mechanical check: `grep -n "os\._exit(" <file>`; empty is the pass.
- **`sys.exit("message")` assumed to print to stdout or exit `0`.** It does neither — confirmed both by the official docs (§5/§6 citations) and by `make-mark.py`'s own real, correct usage. The mechanical check here isn't "forbid it" (it's a legitimate, documented idiom, used correctly in this codebase) — it's a review-time reminder: when reading a `sys.exit("...")` call, confirm the author actually wanted stderr+`1`, since an LLM asked to "print a friendly message and stop" will sometimes reach for this not realizing it changes the stream and the exit code simultaneously.
- **Catching `Exception` around the entire body of `main()` and returning/exiting `0` regardless.** The three hook scripts that do this are *correct* because they document why (§2, §3) and because the harness they run under makes it the safer choice. The mechanical check that tells these apart from an accidental swallow: `grep -n "except Exception" <file>` then confirm the containing module either (a) has a docstring stating why a nonzero exit must never happen (as all three hook scripts do), or (b) logs/re-raises before falling through — a bare `except Exception: pass` with no comment and no logging, outside that documented-hook context, is the actual smell.
- **No `BrokenPipeError` handler on a tool with a print loop.** Covered fully in §5/guidance #2 — this is the finding an LLM is least likely to think to check for on its own, since the tool "works" in every normal invocation and only breaks under a specific piping pattern that most manual testing never exercises.
- **Inventing an exit code with no table.** An LLM extending `index/bot`'s `ExitCode` enum, or writing a new tool from scratch, may reach for an arbitrary integer (`3`, `42`, whatever reads as "distinct") instead of consulting §"The exit-code table" above. Smallest mechanical check: any new integer literal passed to `sys.exit()`/used in an `ExitCode`-like enum that is not in `{0, 1, 2, 65, 75}` (this catalog's current, pinned set) should trigger a manual "why isn't this one of the pinned codes, and if it's genuinely new, should the table be updated" review — not automatable as a lint rule without a project-specific ruff/AST plugin that does not exist today.

---

## Contested / evolving

- **Whether Python CLIs should adopt `sysexits.h` at all is genuinely unsettled in the wider ecosystem** — most Python CLI frameworks (`click`, `typer`) don't ship sysexits support out of the box, and the prevailing practice outside this catalog remains plain `0`/`1`/`2`. This dive's verdict is scoped deliberately narrow (agree on the *bespoke application failure categories*, not on replacing `argparse`'s own `2`) precisely because the broader "just use sysexits everywhere" position is not, in fact, the industry default as of 2026 — `index/bot`'s adoption is a local, deliberate choice (ADR-4), not evidence of a wider trend.
- **The Claude Code hooks exit-code contract itself is a moving target** — the fetched documentation ([code.claude.com/docs/en/hooks](https://code.claude.com/docs/en/hooks), read 2026-08-23) already distinguishes per-event blocking behavior (`PreToolUse` blocks, `PostToolUse` doesn't, `Stop` re-prompts) and explicitly calls out `WorktreeCreate`'s different rule ("any non-zero exit code causes worktree creation to fail") — a newer or different hook event type added to this harness in the future may not follow the same "only `2` blocks" rule the 9 audited scripts currently rely on. Any guidance here should be re-checked against the current docs before being applied to a hook event type not covered by this audit.
- **Whether `BrokenPipeError` handling belongs in every small script or only in ones expected to produce long output is a judgment call, not a settled rule** — this dive recommends it only for tools whose output can plausibly exceed the pipe buffer (§ guidance #2's "more than a handful of lines" framing), not universally, to avoid boilerplate on genuinely single-line tools like `make-mark.py`.

---

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://code.claude.com/docs/en/hooks | Official Claude Code docs (hooks reference) | current, 2026 | The exact contract the 9 hook scripts are written against — exit-code-vs-JSON precedence, per-event blocking table, the "exit 1 is non-blocking" warning quoted in §2 |
| https://man.freebsd.org/cgi/man.cgi?query=sysexits&sektion=3 | FreeBSD man page for `sysexits.h` | canonical, unchanged since BSD 4.3 | Ground truth for every `EX_*` constant and value used in the exit-code table |
| https://docs.python.org/3/library/sys.html#sys.exit | Official stdlib docs | current, 2026 | `sys.exit()`'s exact argument semantics, the `sys.exit("message")` behavior, and the documented `120`-on-shutdown-cleanup-failure case that explains the `BrokenPipeError` reproduction in §5 |
| https://docs.python.org/3/library/signal.html#note-on-sigpipe | Official stdlib docs | current, 2026 | The canonical `BrokenPipeError` handling idiom, quoted verbatim in §5, plus why CPython sets `SIGPIPE` to `SIG_IGN` at startup |
| https://docs.python.org/3/library/exceptions.html | Official stdlib docs | current, 2026 | Verbatim `KeyboardInterrupt`/`SystemExit` inherit-from-`BaseException` rationale, cited precisely in §3 |
| https://docs.python.org/3/library/argparse.html | Official stdlib docs | current, 2026 | `exit_on_error`, `ArgumentParser.error()`, the `type=bool` trap example, mutually exclusive groups — all quoted verbatim in §6 |
| https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html | POSIX (Shell & Utilities) | canonical standard | Exit status conventions for `126`/`127`/`128+signal`, quoted in the exit-code table |
| `index/bot/src/indexbot/exit_codes.py`, `errors.py`, `cli/main.py` (read-only) | This project's own source | current checkout, 2026-08-23 | The pinned `ExitCode` enum, the `IndexBotError` mapping, and the "genuine bug propagates" philosophy — the reference implementation this whole dive measures the other subjects against |
| `index/bot/src/indexbot/adapters/local_files.py:64-73` (read-only) | This project's own source | current checkout, 2026-08-23 | The atomic-write reference implementation cited in §8 |
| `index/bot/tests/cli/test_main.py` (read-only) | This project's own source | current checkout, 2026-08-23 | The subprocess-free CLI exit-code testing pattern cited in §6 |
| `grimoire-lore/.claude/skills/research-lang/scripts/check-artifacts.py`, `grimoire-lore/scripts/make-mark.py`, `ocx/.claude/hooks/*.py`, `grimoire/.claude/hooks/*.py`, `ocx/test/scripts/doc_scripts_list.py` (read-only) | This project's own source | current checkout, 2026-08-23 | The full inventory in §1; every file:line citation in this report traces back to these files as read on 2026-08-23 |
| `python3 .claude/skills/research-lang/scripts/check-artifacts.py .claude .agents --root . \| head -1` (this session's own command, run from `/home/mherwig/dev/grimoire-lore`) | First-party reproduction | run 2026-08-23 | The `BrokenPipeError`/exit-`120` proof in §5 — executed against the real subject, not simulated |
| `timeout --preserve-status -s INT 1 python3 sleepy.py` (this session's own reproduction, deleted after capture) | First-party reproduction, own temp dir | run 2026-08-23 | The `SIGINT` → `130` proof in §3, and the traceback-on-`Ctrl-C` default behavior |
| `sys.exit(main())` bool-return-inversion repro (this session's own reproduction, deleted after capture) | First-party reproduction, own temp dir | run 2026-08-23 | The exit-`1`-despite-success proof in the Summary and AI-agent angle §1 |
