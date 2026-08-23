---
title: Logging, Diagnostics and Output Discipline for Unattended Python Agents
topic: python-observability/logging-and-output
agent: dive-observability
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 22
scope: >
  Library-vs-application logging configuration; lazy log formatting and G004;
  level semantics for an unattended CI bot; exception logging (logger.exception,
  exc_info, LOG004/TRY400/TRY401); stdout/stderr discipline, JSON output modes,
  TTY/NO_COLOR/FORCE_COLOR; secrets in logs (CWE-532) and terminal escape
  injection (CWE-150); warnings.warn vs logging; stdlib-only fallback for a
  no-dependency hook toolchain. Audited: /home/mherwig/dev/index/bot,
  /home/mherwig/dev/ocx-sdk-python, /home/mherwig/dev/ocx/.claude/hooks.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Library versus application](#1-library-versus-application)
   2. [Lazy formatting and why it's not just performance](#2-lazy-formatting-and-why-its-not-just-performance)
   3. [Levels that mean something](#3-levels-that-mean-something)
   4. [Exceptions in logs](#4-exceptions-in-logs)
   5. [stdout vs stderr, machine-readable output](#5-stdout-vs-stderr-machine-readable-output)
   6. [Secrets and injection](#6-secrets-and-injection)
   7. [warnings vs logging](#7-warnings-vs-logging)
   8. [The stdlib-only constraint](#8-the-stdlib-only-constraint)
   9. [What an LLM gets wrong](#9-what-an-llm-gets-wrong)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Applied to the bot, the SDK and the hooks](#applied-to-the-bot-the-sdk-and-the-hooks)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **Correction to the brief**: the brief that seeded this dive called the bot "the one logging-heavy shape." That premise is false — re-measured directly (`grep -rlF "import logging"` / `"getLogger"`, explicit path per subject): `bot` (93 files, `src/`) has **zero**, `ocx-sdk-python/src` has **2 files / 3 `getLogger()` sites**, `.claude/hooks` (10 files) has **zero**, and the Rust CLI's 190 real (non-`.venv`) test files under `/home/mherwig/dev/ocx/test` also have **zero** — every other hit there (31) was vendored `rich`/`pytest`/`urllib3`/`oras` code inside `.venv/lib/`, not project code. `ocx-sdk-python` is the *only* place in this entire audited fleet that imports `logging` at all. What replaced the false premise: the bot reports failures through a typed exception hierarchy, rich f-string messages at the raise site, a typed 4-value exit-code contract, and a GitHub Actions step-summary write — not through the `logging` module, and not by accident. See [Applied § bot](#applied-to-the-bot-the-sdk-and-the-hooks) for the traced failure path and the verdict on whether that's a defect.
- A library gets `logging.getLogger(__name__)` and, optionally, a `NullHandler`; it never calls `basicConfig()` or `addHandler()` — that is the application's job, done once at the entry point ([Python docs](https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library)).
- `logger.info(f"...")` is a MUST-fix wherever `logging` is actually in use, not a style nit: it forces eager formatting on every call regardless of level, and it destroys the unformatted message template that structured-logging handlers and log aggregators key on — ruff `G004` catches it (stable since v0.0.236). But scope that MUST to where it binds: fleet-wide the real `G004` count is **zero** (`ruff check --select G001,G002,G003,G004` on `ocx-sdk-python/src` — the only place with any logging calls at all — reports "All checks passed!"; `bot` and the hooks have no logging calls to violate it). It is a MUST for any file that has a logger, not a fleet-wide gap to close — there is currently nothing fleet-wide to close.
- Level semantics for an unattended CI bot: DEBUG = internals nobody reads unless replaying a failure; INFO = a state transition happened, expected; WARNING = degraded-but-continuing (an event a human should eventually see, not act on now); ERROR = this run's job did not complete; CRITICAL = the process itself cannot continue. Two mechanical smells: `logger.error(...)` immediately followed by `raise` in the same frame (double-reporting — the caller will see it too), and `logger.warning(...)` inside an `except` block for a failure that isn't actually recovered from.
- `logger.exception()` is `logger.error()` plus an automatic traceback, and it is *only* correct inside an `except` block — ruff `LOG004` flags it outside one, `TRY400` flags `logger.error()` inside one where `logger.exception()` was meant, `TRY401` flags passing the caught exception object into the message when `.exception()` already attaches it.
- For a CLI: the answer/data goes to stdout, diagnostics/progress/prompts go to stderr, because piping sends stdout to the next process — mixing them breaks `| jq` ([clig.dev](https://clig.dev/#the-basics)). This project's own domain is a package index; `indexbot validate | jq` is a real workflow, and the bot already gets the stdout/stderr split right in `cli/` (verified below).
- TTY-gate color and progress: `sys.stdout.isatty()`, suppress by default off a TTY, honor `NO_COLOR` (any non-empty value disables color; [no-color.org](https://no-color.org/)) and `FORCE_COLOR` (non-empty value forces it; [force-color.org](https://force-color.org/)) — none of the three audited projects implement this because none of them currently emit color at all, which is a fine reason not to build the switch yet.
- Never log credentials, tokens, or `Authorization`/`Proxy-Authorization` headers. This is not hypothetical: httpx's own DEBUG/INFO logging has shipped basic-auth credentials embedded in a logged URL ([encode/httpx#2765](https://github.com/encode/httpx/discussions/2765)), and urllib3's `connectionpool` logger has emitted pre-signed URLs carrying auth query parameters at DEBUG ([databricks-sql-python#340](https://github.com/databricks/databricks-sql-python/issues/340)). `ocx-sdk-python` already threads a `redact` callable through every subprocess log/error path specifically to close this (CWE-532) — see `src/ocx_sdk/_process.py:22`.
- Terminal escape-sequence injection (CWE-150) is in scope, not academic: a sibling Rust binary in this catalog already shipped exactly this defect. Any string that can contain attacker-influenced bytes (a package name, a PR-supplied path, an error message that interpolates one) and reaches a real TTY via `print`/log output needs its C0 control bytes stripped or escaped first. None of the three audited projects do this anywhere today.
- `warnings.warn()` is for "the *caller's code* should change" (a deprecated argument, an unsafe config combination); `logger.warning()` is for "a runtime event happened, no code change implied." `stacklevel` is almost always wrong at its default of 1 inside a wrapper — it should point at the caller, not at the warn() call site itself ([docs.python.org](https://docs.python.org/3/library/warnings.html#warnings.warn)). `ocx-sdk-python` has exactly one call site (`_config.py:170`) and gets `stacklevel=3` right for its two-frames-deep wrapper.
- `DeprecationWarning` is silently swallowed everywhere except code run as `__main__` — a library that wants its users to see a deprecation in tests must either use a different category or rely on pytest's own warning capture, which enables all warnings by default in test collection.
- `hook_utils.py` (stdlib-only, 688 LOC, shared by every hook) can get real structured logging without a dependency: `logging.Formatter` subclass around `json.dumps(record.__dict__ subset)`, `extra=` for structured fields (reserved-key list is fixed and documented), `logging.Filter` for redaction. `structlog`/`rich` are not needed for the *mechanism*, only for ergonomics this constraint has no room for.
- `ocx-sdk-python` names its module loggers with a hardcoded string (`logging.getLogger("ocx_sdk")`) rather than `__name__` — this is the one clear violation found in the inventory, and it is deliberate (the package root, not a submodule logger) rather than an oversight, but it is exactly the shape ruff `LOG002` exists to catch.
- The bot's print/logging boundary (all 12 `print()` calls confined to `src/indexbot/cli/`, zero in `core/` or `adapters/`, 19 files) holds up under an independent, path-scoped check — see [Applied](#applied-to-the-bot-the-sdk-and-the-hooks). It would regress the moment any `core/` or `adapters/` module needs to report progress and someone reaches for the nearest working example instead of adding a logger.
- The hooks toolchain has no lint configuration at all governing it (no `pyproject.toml`/`ruff.toml` anywhere under `/home/mherwig/dev/ocx`) — the absence of `G`/`LOG`/`T20` there is a gap, not a decision.

## Findings

### 1. Library versus application

The stdlib logging HOWTO states the rule in its own words, twice — once for handlers, once for the root logger:

> "It is strongly advised that you *do not add any handlers other than* `NullHandler` *to your library's loggers*. This is because the configuration of handlers is the prerogative of the application developer who uses your library." ([Configuring Logging for a Library](https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library))

> "It is strongly advised that you *do not log to the root logger* in your library. Instead, use a logger with a unique and easily identifiable name, such as the `__name__` for your library's top-level package or module." (same page)

And the canonical library-side code:

```python
import logging

logging.getLogger("foo").addHandler(logging.NullHandler())
```

> "should have the desired effect" (i.e., no `sys.stderr` fallback output in the absence of application configuration). Same source.

The module-level convention is separate and applies everywhere, library or application:

```python
logger = logging.getLogger(__name__)
```

> "This means that logger names track the package/module hierarchy, and it's intuitively obvious where events are logged just from the logger name." ([Logging HOWTO — Logging from multiple modules](https://docs.python.org/3/howto/logging.html))

**Wrong (library code):**
```python
# somelib/_client.py
import logging

logging.basicConfig(level=logging.DEBUG)  # configures the whole app's root logger
logger = logging.getLogger("somelib")  # hardcoded name, not __name__
```

**Right (library code):**
```python
# somelib/_client.py
import logging

_LOG = logging.getLogger(__name__)  # e.g. "somelib._client"
```
No `basicConfig`, no handler, nothing else — the package's top-level `__init__.py` may add a single `NullHandler()` once, and that's the library's entire logging footprint.

**Right (application entry point, exactly once):**
```python
# app/__main__.py
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
```

**Check** — a library module never calls `basicConfig` or adds a handler:
```
grep -rnF "basicConfig(" src/somelib --include="*.py"
grep -rnF "addHandler(" src/somelib --include="*.py"
```
Empty output on both is a pass; any hit is the violation (file:line names the offending call). Watched red against a planted `logging.basicConfig(...)` + `logger.addHandler(logging.StreamHandler())` in a throwaway package — both greps reported the exact line.

### 2. Lazy formatting and why it's not just performance

The HOWTO's own reasoning for `%`-style deferred arguments:

> "Formatting of message arguments is deferred until it cannot be avoided. However, computing the arguments passed to the logging method can also be expensive, and you may want to avoid doing it if the logger will just throw away your event." ([Optimization](https://docs.python.org/3/howto/logging.html#optimization))

That's the performance half. The half people miss is structural: ruff's own rationale for `G004` names it explicitly —

> "Using f-strings to format a logging message requires that Python eagerly format the string, even if the logging statement is never executed... The use of `extra` will ensure that the values are made available to all handlers, which can then be configured to log the values in a consistent manner." ([ruff — logging-f-string (G004)](https://docs.astral.sh/ruff/rules/logging-f-string/))

Concretely: `logger.info(f"{user} logged in")` produces one opaque string per user; a log aggregator (structured JSON handler, Datadog, Loki) that wants to group "user X logged in" events by *template* has nothing to group on — every message is unique text. `logger.info("%s logged in", user)` keeps `"%s logged in"` as the stable message and `user` as a separate field a `Formatter`/`extra=`-aware handler can key on independently.

**Wrong:**
```python
logger.info(f"processed {count} packages in {elapsed:.2f}s")
```
**Right:**
```python
logger.info("processed %d packages in %.2fs", count, elapsed)
```

Rule code and stability: `G004` (`logging-f-string`), part of `flake8-logging-format`, added in ruff v0.0.236, stable (not preview).

**Measured, re-verified against the corrected premise** (§Summary): `ocx-sdk-python/src` is the only place in the audited fleet with any `logging` calls at all (14, all `.debug()`), and `ruff check --select G001,G002,G003,G004 --no-cache --isolated src/ocx_sdk/` reports `All checks passed!` — the real fleet-wide `G004` count is **zero**, not "cheap to fix," because there is nothing to fix. `bot` and the hooks toolchain have no `getLogger()` call anywhere, so `G004` has no surface there at all — it isn't a gap in those two, it's inapplicable. **Verdict: MUST, but scoped** — mandatory the instant a module imports `logging` (which is why the SDK is already clean and should stay that way, enforced by adding `G004` to its own `select`), and simply not a live concern for `bot` or the hooks unless one of them adopts `logging` in the future, at which point this rule travels with that adoption rather than needing to be invented afresh. A MUST framed as an urgent fleet-wide gap here would be manufacturing urgency the measurement doesn't support.

### 3. Levels that mean something

Per the HOWTO's own table ([When to use logging](https://docs.python.org/3/howto/logging.html#when-to-use-logging)):

| Level | Stdlib definition |
|---|---|
| DEBUG | "Detailed information, typically of interest only when diagnosing problems." |
| INFO | "Confirmation that things are working as expected." |
| WARNING | "An indication that something unexpected happened, or indicative of some problem in the near future... The software is still working as expected." |
| ERROR | "Due to a more serious problem, the software has not been able to perform some function." |
| CRITICAL | "A serious error, indicating that the program itself may be unable to continue running." |

> "The default level is `WARNING`, which means that only events of this severity and higher will be tracked, unless the logging package is configured to do otherwise." (same page)

Applied to an unattended CI bot specifically (this is a judgment call the stdlib doesn't make for you):

- **DEBUG**: subprocess argv, raw response bodies, retry/backoff internals, cache hits — noise a human only wants when replaying a specific failed run.
- **INFO**: a package was verified/announced/reconciled; a job started and finished; counts. The default-visible narrative of a successful run.
- **WARNING**: something recoverable but worth a human's eventual attention — a stale mirror, an `--allow-reserved-namespace` carve-out being used, a registry that returned a soft 5xx and got retried successfully. The run still succeeds.
- **ERROR**: this invocation could not complete its job (a validation failed, an announce could not open a PR). The process may still exit 0 for "ran successfully but found problems" vs. a nonzero exit for "the tool itself broke" — that distinction is the bot's own exit-code contract, not a logging concern, but the *log level* should match "this unit of work failed," independent of exit code.
- **CRITICAL**: reserved for "the process itself cannot continue" — an unrecoverable config error before any work starts, not a per-package validation failure.

**Two mechanical smells, with a reading heuristic** (this is not fully mechanizable — a reviewer has to read the frame):

1. **Double-reporting**: `logger.error(...)` (or `.exception()`) immediately before a `raise` (bare or re-raise) *in the same function*, where the caller's own exception handler will also log it. Heuristic: if the very next line is `raise`/`raise ... from ...` and nothing between the log call and the raise does anything the caller couldn't do itself (no cleanup, no re-classification), it's the same failure logged twice as it unwinds the stack. Fix: log at the frame that *handles* the exception (stops the propagation), not at every frame that merely observes it.
2. **Swallowed-but-still-broken**: `except SomeError as e: logger.warning(...)` where the code path after the `except` block returns normally / continues as if the operation succeeded, but the operation's actual result is now missing or wrong. WARNING implies "still working as expected" per the stdlib table above; if the surrounding code can no longer deliver its contract (a value defaults to `None` where a real value was expected, a package silently drops out of `checked`), that's an ERROR being reported as a WARNING to avoid a scary-looking log line. Heuristic: ask "does anything downstream of this except block now behave differently than it would have on success?" — if yes, WARNING is a mislabel.

### 4. Exceptions in logs

> "`Logger.exception()` creates a log message similar to `Logger.error()`. The difference is that `Logger.exception()` dumps a stack trace along with it. Call this method only from an exception handler." ([Python docs — Logger.exception](https://docs.python.org/3/library/logging.html#logging.Logger.exception))

Ruff enforces exactly this constraint plus the two related shapes:

| Code | Name | Enforces |
|---|---|---|
| `LOG004` | `log-exception-outside-except-handler` | `.exception()` called with no enclosing `except` — traceback is misleading or absent. |
| `TRY400` | `error-instead-of-exception` | `.error(...)` used inside an `except` block where `.exception(...)` would capture the traceback that's actually useful. |
| `TRY401` | `verbose-log-message` | The caught exception object is redundantly interpolated into the message string passed to `.exception()`, which already attaches it automatically. |
| `LOG007` | `exception-without-exc-info` | `logging.exception(...)` called with a falsy `exc_info=` — defeats the point of using `.exception()` at all. |

`logger.exception()` outside an `except` block is a bug specifically because it calls `sys.exc_info()` internally to find the active exception; with none active, it either logs `NoneType: None` or (depending on interpreter/version state) the traceback of a stale, unrelated exception still referenced by the frame — misleading either way. `LOG004`'s planted-violation demo (below) shows exactly this shape.

`logger.error(..., exc_info=True)` and `logger.exception(...)` are equivalent — the latter is `error(..., exc_info=True)` with the flag hardcoded ([Python docs, logging.Logger.exception](https://docs.python.org/3/library/logging.html#logging.Logger.exception)); prefer `.exception()` for readability inside a genuine handler, and reach for `error(..., exc_info=True)` only when the level itself needs to vary (e.g., logging a caught-but-not-fatal condition at WARNING with a traceback attached).

**Whether the traceback belongs in the log for an *expected* error**: not always. A traceback is for "how did we get here," valuable when the failure is a bug or an unexpected external fault (a registry timeout, malformed upstream data). For an *expected*, already-modeled failure — `ValidationError` raised deliberately because a contributor's PR violates a documented rule — the traceback is noise; the message text already says what's wrong and a full Python stack trace just for `raise ValidationError(...)` obscures the actual finding. Reserve `.exception()`/`exc_info=True` for genuinely unexpected faults; log expected, already-typed errors at their level (commonly ERROR or WARNING) without a traceback.

**Wrong:**
```python
def load(path):
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        logger.exception(
            f"bad json in {path}"
        )  # TRY401: path already in traceback context is fine, but f-string is G004 too
        raise
```
**Right:**
```python
def load(path):
    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError:
        logger.exception(
            "bad json in %s", path
        )  # traceback attached automatically, no double-report if caller doesn't also log
        raise
```

**Check:**
```
ruff check --select LOG004 --no-cache --isolated <path>
ruff check --select TRY400 --no-cache --isolated <path>
ruff check --select TRY401 --no-cache --isolated <path>
```
Empty output on all three is a pass. Watched red (planted violations, raw output):
```
LOG004 `.exception()` call outside exception handlers
 --> violation.py:13:5
13 |     logger.exception("called with no active exception")

TRY400 Use `logging.exception` instead of `logging.error`
 --> violation.py:20:9
20 |         logger.error("failed")
```

### 5. stdout vs stderr, machine-readable output

> "The primary output for your command should go to `stdout`. Anything that is machine readable should also go to `stdout`—this is where piping sends things by default." ... "Log messages, errors, and so on should all be sent to `stderr`. This means that when commands are piped together, these messages are displayed to the user and not fed into the next command." ([clig.dev — The Basics](https://clig.dev/#the-basics))

This is context-dependent, not universal: the Twelve-Factor App's Logs factor tells a *long-running service* the opposite-sounding thing — "each running process writes its event stream, unbuffered, to stdout" ([12factor.net/logs](https://12factor.net/logs)) — because a daemon's *entire* output **is** its log stream; there's no separate "answer" being piped downstream. A CLI tool like this bot has both a result (the verification summary, JSON) and a running commentary about producing it, so clig.dev's split — not 12-factor's — is the applicable model here. (Flagged again under [Contested](#contested--evolving).)

**JSON output modes**: for a package-manager-shaped tool where `| jq` is a normal user action, a `--json`/`--format json` mode should exist, be versioned or at least schema-stable across patch releases, and never drift from the human-readable mode's *substance* — the fix for drift is to generate both from one internal result object rather than building two independent string-formatting code paths. clig.dev frames this as a stability contract: "Encourage your users to use `--plain` or `--json` in scripts to keep output stable" — i.e., the machine mode is the one you promise not to reformat on a whim; the human mode is free to evolve.

**TTY detection and color/progress suppression:**
> "Human-readable output is paramount... The most simple and straightforward heuristic for whether a particular output stream (`stdout` or `stderr`) is being read by a human is *whether or not it's a TTY*." ... "If `stdout` is not an interactive terminal, don't display any animations." (clig.dev, Output section)

Mechanically: `sys.stdout.isatty()` (or `sys.stderr.isatty()` for progress written there) gates color codes and spinners; anything piped, redirected to a file, or run in CI (no TTY) gets plain text and no animation by default.

**NO_COLOR / FORCE_COLOR:**
> "Command-line software which adds ANSI color to its output by default should check for a `NO_COLOR` environment variable that, when present and not an empty string (regardless of its value), prevents the addition of ANSI color." ([no-color.org](https://no-color.org/))

> "Command-line software which outputs colored text should check for a `FORCE_COLOR` environment variable. When this variable is present and not an empty string (regardless of its value), it should force the addition of ANSI color." ([force-color.org](https://force-color.org/)) — `NO_COLOR` is checked first (disables), `FORCE_COLOR` checked after (re-enables), so an explicit `FORCE_COLOR` wins over a blanket `NO_COLOR` in the user's shell profile.

**Check** (proxy, not fully mechanizable — flags for human review rather than asserting a verdict): every `print(` call site in a CLI module whose line lacks `file=sys.stderr` is *claiming* to be primary/data output; confirm by reading it.
```
grep -rn "print(" src/indexbot/cli --include="*.py" | grep -v "file=sys.stderr"
```
This does not print a pass/fail — it prints every stdout-claiming call site so a reviewer can confirm each one really is the answer, not a stray diagnostic that should have had `file=sys.stderr`.

### 6. Secrets and injection

**Never log credentials, tokens, or auth headers.** This is a real, shipped-software problem, not a hypothetical:

- httpx: the project's own docs enable DEBUG logging with no caveat about what it exposes — "If you need to inspect the internal behaviour of `httpx`, you can use Python's standard logging to output information about the underlying network behaviour" ([python-httpx.org/logging](https://www.python-httpx.org/logging/)) — and in practice that internal behaviour has included credentials: a maintainer-confirmed report showed request logging at INFO emitting `HTTP Request: GET https://username:password@www.example.com`, with follow-up reports of the same leak for bearer tokens carried in query strings, and credentials also appearing in exception messages on failed requests. As of the report, no fix had shipped. ([encode/httpx discussion #2765](https://github.com/encode/httpx/discussions/2765))
- urllib3: `urllib3.connectionpool`'s DEBUG-level logger has been reported emitting pre-signed URLs — which carry auth query parameters — verbatim, with a request to redact query strings before logging. ([databricks/databricks-sql-python#340](https://github.com/databricks/databricks-sql-python/issues/340))
- Adjacent, same family of failure: `requests` shipped CVE-2023-32681, where a `Proxy-Authorization` header (built from credentials embedded in a proxy URL) was re-attached on redirect to an HTTPS destination — not a *log* leak, but the same "credential material treated as opaque and forwarded/printed without a boundary check" root cause. Fixed in `requests` 2.31.0. ([GHSA-j8r2-6x86-q33q](https://github.com/psf/requests/security/advisories/GHSA-j8r2-6x86-q33q))

Root cause definition: CWE-532, *Insertion of Sensitive Information into Log File* — "The product writes sensitive information to a log file," with credentials, tokens, and connection strings named as canonical examples ([cwe.mitre.org/532](https://cwe.mitre.org/data/definitions/532.html)). Practical consequence for this fleet: turning on `httpx`'s or `urllib3`'s own DEBUG logger (e.g., to diagnose a connection issue) is not safe by default in a codebase that also handles registry credentials — it must go through a redaction layer or not be enabled in a context where its output is persisted.

**Redaction: filter versus call-site.** A `logging.Filter` can mutate or replace a `LogRecord` before it reaches a handler (`Changed in version 3.12: You can now return a LogRecord instance from filters to replace the log record rather than modifying it in place` — [docs.python.org](https://docs.python.org/3/library/logging.html#logging.Filter.filter)), which centralizes redaction for every call site that shares the filtered logger/handler — good for a blanket "never let `Authorization:` reach a handler" net. Call-site redaction (scrub before calling `.debug(...)`) is precise and cheap but only as complete as every call site remembers to apply it. `ocx-sdk-python` uses call-site redaction deliberately and by design: a `redact: Callable[[str], str]` is threaded as an explicit parameter through `spawn`/`spawn_async`/`run_command`/`run_command_async` (`src/ocx_sdk/_process.py`), applied to the argv before it's DEBUG-logged, to captured stderr, and to error text — with the module's own docstring naming the CWE:

> "Redaction runs on every outbound surface — captured stderr, `on_log` lines, the argv in DEBUG records, and the argv and stderr carried on raised errors — so a token that reached argv or the child env cannot escape through a log (CWE-532)." (`src/ocx_sdk/_process.py:22`)

The same docstring records a deliberate, documented exception: captured **stdout is never redacted**, because it's the raw JSON payload a caller parses and a string substitution inside it would corrupt the document — the redaction boundary is drawn at "diagnostic channel" (stderr/logs), not at "every byte the process touches." That is the filter-vs-call-site tradeoff resolved correctly for a case where a *blanket* filter (redacting anything matching a secret pattern anywhere) would have broken the data contract.

**Terminal escape-sequence injection (CWE-150).** The weakness: "The product receives input from an upstream component but fails to neutralize... special elements that could be interpreted as escape, meta, or control character sequences when sent to a downstream component" ([cwe.mitre.org/150](https://cwe.mitre.org/data/definitions/150.html)) — concretely, ANSI escape codes embedded in attacker-influenced text (a package name, a commit message, a registry-returned string) that reach a real terminal via `print()`/log output can rewrite the terminal title, move the cursor, clear the screen, or render a fake prompt. A sibling Rust binary in this catalog has already shipped exactly this defect, so it is a known-live class here, not academic.

**Check** — none of the three grep/ruff-style checks above catch this one; "is this string attacker-influenced" is not syntactically decidable. The mechanizable form is a runtime assertion on the project's own output sink: feed it a string containing `\x1b` and assert the byte does not reach captured stdout unstripped. Demonstrated and watched red against a planted naive `print(text)` sink:
```
AssertionError: VIOLATION: raw ESC byte reached stdout: '\x1b]0;pwned\x1b\\safe-looking package description\n'
```
and green against a `"".join(ch for ch in text if ch.isprintable() or ch in "\n\t")` sink. None of `bot`, `ocx-sdk-python`, or the hooks toolchain currently run any such check, and none currently strip control characters anywhere in their output paths — this is a fleet-wide gap, not a per-project finding.

Adjacent: CWE-117, *Improper Output Neutralization for Logs* (log injection / log forging) — unsanitized newlines in logged external input can forge fake log lines (`%0a%0aINFO:+User+logged+out=badguy`) that mislead anyone reading the log file itself ([cwe.mitre.org/117](https://cwe.mitre.org/data/definitions/117.html)). Same root cause (untrusted text reaching an output sink verbatim), different downstream victim (the log reader vs. the terminal emulator).

### 7. warnings vs logging

`warnings.warn()` is for "the calling code should change" — a deprecated argument, an unsafe configuration the caller constructed, a usage pattern that will break later. `logger.warning()` is for "a runtime event happened, no code change is implied" — a flaky network call succeeded on retry, a mirror is stale. The stdlib's own cross-reference makes the two systems' relationship explicit: `logging.captureWarnings()` exists specifically to *route* `warnings.warn()` output into the logging system for applications that want one sink ([docs.python.org/3/library/warnings.html](https://docs.python.org/3/library/warnings.html)) — they are complementary, not interchangeable defaults.

**`stacklevel`** — default `1`, meaning "blame the `warn()` call site itself," which is almost never what you want inside a wrapper:

> "The `stacklevel` argument can be used by wrapper functions written in Python... This makes the warning refer to `deprecated_api`'s caller, rather than to the source of `deprecated_api` itself (since the latter would defeat the purpose of the warning message)." ([docs.python.org — warnings.warn](https://docs.python.org/3/library/warnings.html#warnings.warn))

`stacklevel=2` blames the immediate caller of the function containing `warn()`; every additional wrapper frame between the warning and the user's code needs another `+1`. `ocx-sdk-python` gets this right at `_config.py:170`: the `warnings.warn(...)` call sits inside `OcxConfig.__post_init__`, itself called from `OcxConfig(...)` construction — two frames removed from the user's own call site — and uses `stacklevel=3`, correctly attributing the warning to the line that actually constructed the misconfigured object rather than to a line inside the SDK's own dataclass machinery.

**`DeprecationWarning` is invisible by default outside `__main__`:**
> "Base category for warnings about deprecated features when those warnings are intended for other Python developers (ignored by default, unless triggered by code in `__main__`)." Default filter: `default::DeprecationWarning:__main__` / `ignore::DeprecationWarning` (same page). A library that emits `DeprecationWarning` and expects its own test suite to see it needs either a test framework that opts back in (pytest enables all warnings during collection by default) or a `warnings.simplefilter("always")` in the test itself.

**Asserting a warning fired, in a test:**
```python
import warnings
import pytest


def test_warning():
    with pytest.warns(UserWarning, match="carry credentials"):
        warnings.warn("Registries carry credentials...", UserWarning)
```
> "You can check that code raises a particular warning using `pytest.warns()`, which works in a similar manner to `raises`... The test will fail if the warning in question is not raised." ([docs.pytest.org — capturing warnings](https://docs.pytest.org/en/stable/how-to/capture-warnings.html)) `match=` asserts against the message text/regex; `pytest.warns(...) as record` additionally returns the list of captured `WarningMessage` objects for count/content assertions.

### 8. The stdlib-only constraint

Everything above has a no-dependency answer that works in `hook_utils.py` (688 LOC, shared by every single-file hook, stdlib-only per the project's own constraint):

- **Library discipline** (§1): `logging.getLogger(__name__)`, no `basicConfig`/handler — pure stdlib, no change needed.
- **Lazy formatting / levels / exception logging** (§2–4): all pure `logging` module behavior — no dependency required at all.
- **Structured/JSON output** (§8 specifically): the stdlib's `extra=` plus a custom `logging.Formatter` is genuinely sufficient, not a compromise:
  ```python
  import json, logging


  class JsonFormatter(logging.Formatter):
      def format(self, record: logging.LogRecord) -> str:
          payload = {
              "level": record.levelname,
              "logger": record.name,
              "message": record.getMessage(),
          }
          if hasattr(record, "session_id"):  # populated via extra={"session_id": ...}
              payload["session_id"] = record.session_id
          if record.exc_info:
              payload["exc_info"] = self.formatException(record.exc_info)
          return json.dumps(payload, separators=(",", ":"))
  ```
  `extra=` keys populate arbitrary attributes on the `LogRecord.__dict__`, with a fixed, documented set of reserved names that must not be reused (`name`, `msg`, `args`, `levelname`, `levelno`, `pathname`, `filename`, `module`, `exc_info`, `exc_text`, `stack_info`, `lineno`, `funcName`, `created`, `msecs`, `relativeCreated`, `thread`, `threadName`, `processName`, `process`, `taskName`, `message` — [docs.python.org](https://docs.python.org/3/library/logging.html#logging.Logger.debug)) — a mechanical constraint a formatter/filter can check against at startup.
- **Redaction** (§6): a `logging.Filter` (or the same call-site-`redact()`-callable pattern `ocx-sdk-python` already uses) is plain stdlib — `Filter.filter(record)` can mutate or replace the record before any handler sees it.
- **`structlog`/`rich` are not needed for the mechanism.** Where they earn their keep is ergonomics `hook_utils.py` has no room for anyway: structlog's pitch is bound key-value context across calls and pluggable renderers ("binding and re-binding key-value pairs... they are present in every following logging call," [structlog — why](https://www.structlog.org/en/stable/why.html)) — a convenience, not a capability the stdlib Filter/extra= combination lacks. `rich` buys colored/TTY-aware rendering the hooks toolchain doesn't currently use at all (§5's TTY/color guidance is unimplemented everywhere in this fleet, not blocked by the dependency ban).
- **Verdict**: stdlib `extra=` + a JSON `Formatter` + a redaction `Filter` is a complete, sufficient answer for `hook_utils.py`. Nothing in this fleet's logging/output requirements needs a third-party dependency — the shipped SDK (`ocx-sdk-python`, zero runtime deps) already proves the pattern works at production quality with 14 real DEBUG call sites and a working redaction layer, entirely stdlib.

One caveat specific to the hooks' actual protocol (not a dependency issue): Claude Code hooks communicate back to the harness via **stdout**, not stderr (`hook_utils.output_json` at `hook_utils.py:38` writes JSON to stdout by design). Introducing `logging` there would need its own handler pointed at stderr (or a file) so log output never collides with the hook's stdout protocol contract — see [Applied](#applied-to-the-bot-the-sdk-and-the-hooks) for the concrete gap this currently leaves.

### 9. What an LLM gets wrong

| Mistake | Smallest mechanical check |
|---|---|
| `print()` in library/core code | `ruff check --select T201 --no-cache --isolated <lib_or_core_path>` (watched red: `T201 print found`) |
| `logging.basicConfig()` inside a library module | `grep -rnF "basicConfig(" <libsrc>` (watched red, §1) |
| f-string (or `%`/`.format()`/`+`) in a log call | `ruff check --select G001,G002,G003,G004 --no-cache --isolated <path>` (G004 watched red, §2) |
| `logger.error(...)` immediately before `raise` in the same frame (double-reporting) | Manual read per the heuristic in §3; no syntactic check distinguishes "the caller will also log this" from "this is the terminal handler." |
| `logger.exception(...)` and then still re-raising, where the *caller's* handler logs it again | Same as above — grep can find `.exception(` calls followed by `raise`, but not decide whether the raise reaches another logger. |
| Inventing `logging.getLogger("myapp")` instead of `logging.getLogger(__name__)` | `ruff check --select LOG002 --no-cache --isolated <path>` |
| Configuring logging (handler/level/format) at import time, in module-global code | `grep -rnF "basicConfig(" <path>` plus a read of any module-level (non-`if __name__ == "__main__":`) statement calling `logging.config.*` |
| `logger.exception()` outside an `except` block | `ruff check --select LOG004 --no-cache --isolated <path>` (watched red, §4) |

## Normative guidance candidates

1. **Rule**: Every module-level logger is `logging.getLogger(__name__)`; never a hardcoded string.
   **Rationale**: keeps logger names tracking the real package/module hierarchy so verbosity and handlers can be tuned per-subsystem ([HOWTO](https://docs.python.org/3/howto/logging.html)).
   **Verify**: `ruff check --select LOG002 --no-cache --isolated <path>`.

2. **Rule**: A library package (anything importable and reused, not the application entry point) never calls `logging.basicConfig()` and never adds a handler to any logger.
   **Rationale**: handler/format/level configuration is the application's decision; a library that configures it "under the hood" breaks the application's own logging setup and its tests ([HOWTO](https://docs.python.org/3/howto/logging.html#configuring-logging-for-a-library)).
   **Verify**: `grep -rnF "basicConfig(" <libsrc>` and `grep -rnF "addHandler(" <libsrc>`, each scoped to the library path; empty is a pass (watched red, §1).

3. **Rule**: No f-string, `%`-operator, `.format()`, or string concatenation as a log message — pass arguments positionally (or via `extra=`) and let the logger format lazily.
   **Rationale**: eager formatting runs even when the level is filtered out, and destroys the stable message template that structured handlers/aggregators key on ([G004](https://docs.astral.sh/ruff/rules/logging-f-string/)).
   **Verify**: `ruff check --select G001,G002,G003,G004 --no-cache --isolated <path>` (G004 watched red, §2). **MUST**, given the current fleet-wide cost is zero.

4. **Rule**: `logger.exception()` is called only from inside an `except` block that is actually handling the exception it names.
   **Rationale**: outside an active exception, `.exception()` logs a misleading or empty traceback ([Python docs](https://docs.python.org/3/library/logging.html#logging.Logger.exception)).
   **Verify**: `ruff check --select LOG004 --no-cache --isolated <path>` (watched red, §4).

5. **Rule**: Inside an `except` block, use `logger.exception(...)` (or `logger.error(..., exc_info=True)`) rather than a bare `logger.error(...)`, unless the traceback is deliberately omitted because the error is already fully described and expected (§4).
   **Rationale**: a bare `.error()` in a handler silently drops the traceback that made the failure diagnosable ([TRY400](https://docs.astral.sh/ruff/rules/error-instead-of-exception/)).
   **Verify**: `ruff check --select TRY400 --no-cache --isolated <path>` (watched red, §4).

6. **Rule**: Never re-interpolate the caught exception object into the message passed to `logger.exception(...)`.
   **Rationale**: `.exception()` already attaches the traceback/exception text automatically; doing it again is redundant and can duplicate large tracebacks in the log ([TRY401](https://docs.astral.sh/ruff/rules/verbose-log-message/)).
   **Verify**: `ruff check --select TRY401 --no-cache --isolated <path>`.

7. **Rule**: `print()` is confined to the process's designated output boundary (a CLI's `cli/`-shaped layer, or a hook's single stdout-JSON writer) and forbidden everywhere else (core/domain/adapter code).
   **Rationale**: `print()` is unconfigurable by callers and bypasses every logging control (level, redaction, format) a caller might need ([T201](https://docs.astral.sh/ruff/rules/print/)).
   **Verify**: `ruff check --select T201 --no-cache --isolated <non_boundary_path>` (watched red, §9), scoped explicitly to the non-boundary directories (e.g. `src/indexbot/core src/indexbot/adapters`).

8. **Rule**: In a CLI, the command's primary/data result goes to `stdout`; diagnostics, progress, and prompts go to `stderr`.
   **Rationale**: this is what makes `cmd | jq` and any other pipeline composition work at all ([clig.dev](https://clig.dev/#the-basics)).
   **Verify**: `grep -rn "print(" <cli_path> --include="*.py" | grep -v "file=sys.stderr"` — lists every stdout-claiming call site for manual confirmation each one really is a result, not a diagnostic (§5; not a pass/fail check).

9. **Rule**: Any string that can carry attacker- or third-party-influenced bytes (a package/repo name, a PR-supplied path, upstream registry text) is stripped of C0 control/escape bytes before it reaches a real TTY via `print()` or a log handler.
   **Rationale**: unstripped control bytes reaching a terminal are CWE-150 (terminal escape injection) — already a shipped defect in a sibling Rust binary in this catalog.
   **Verify**: runtime assertion on the project's own output sink — feed it text containing `\x1b` and assert it doesn't reach captured stdout; watched red against a planted naive sink (§6).

10. **Rule**: Any secret/token/credential that reaches a subprocess argv, an HTTP header, or an env var is redacted (call-site `redact()` or a `logging.Filter`) before it can reach a log record, a raised error's text, or captured stderr.
    **Rationale**: CWE-532 — shipped, real leaks in both httpx and urllib3's own debug logging ([httpx#2765](https://github.com/encode/httpx/discussions/2765), [databricks-sql-python#340](https://github.com/databricks/databricks-sql-python/issues/340)).
    **Verify**: project-specific — for `ocx-sdk-python`, `grep -n "_LOG.debug\|_PROCESS_LOG.debug" src/ocx_sdk/_process.py` then confirm every hit's arguments are wrapped in `redact(...)` (all 14 are, per inventory).

11. **Rule**: `warnings.warn()` for "the caller's code should change" (bad argument, unsafe config); `logger.warning()` for "a runtime event occurred, no code change implied." A wrapper function calling `warn()` sets `stacklevel` to point at the real caller, not at itself.
    **Rationale**: conflating the two loses the ability to route deprecations separately from runtime telemetry, and a wrong `stacklevel` makes the warning point at library internals instead of the user's own code ([warnings.warn docs](https://docs.python.org/3/library/warnings.html#warnings.warn)).
    **Verify**: `grep -rn "warnings.warn(" <path> --include="*.py" -A3` — manual review; not fully mechanizable (§7).

12. **Rule**: A hook/tool that must never fail its host process (`except Exception: pass`-shaped code) still leaves *some* breadcrumb on failure — a single `stderr` line gated by an env var, or an append to a local debug file — never truly zero trace.
    **Rationale**: "must never fail" is a legitimate constraint (a broken hook shouldn't break the whole agent turn), but "must never fail" and "must never be diagnosable" are different requirements; the latter isn't required by the former.
    **Verify**: for each `except Exception: pass`, confirm at least one sibling line writes *something* observable before the `pass` — currently absent everywhere in `.claude/hooks` (§Applied).

13. **Rule**: A single-shot batch CLI whose every invocation is one CI step does not need to adopt the `logging` module to be observable. It needs, instead: (a) a typed exception hierarchy with one exit code per failure class the caller can act on differently; (b) every raised message built with the specific values that made it fail (ids, statuses, digests, counts) inline at the raise site, not deferred to a separate log call; (c) exactly one top-level handler that maps modeled exceptions to their exit code and prints their message to stderr, while genuinely unmodeled exceptions are left to propagate as a full, un-caught traceback; (d) where the platform offers a durable, human-facing surface beyond the raw log (a CI job's rendered step summary), a deliberate write to it for operator-visible failures, in addition to stderr, not instead of it.
    **Rationale**: this is not "print is fine for small tools" as a general excuse — it is the specific, provable shape that makes `indexbot`'s no-`logging` design correct rather than an oversight (traced in [Applied § bot](#applied-to-the-bot-the-sdk-and-the-hooks)): no concurrent internal stream to disentangle, an already-exhaustive typed failure taxonomy substituting for level-based filtering, a free full traceback for the unmodeled case, and a capture-everything execution environment with no routing/storage decision left for the program to make. The trigger that would flip this verdict is concrete, not vibes: an interactive/long-lived mode a human runs many times a day, where a quieter default (i.e., levels) would earn its keep.
    **Verify**: for a candidate CLI, confirm all four sub-parts are present — a typed exception/exit-code hierarchy (`grep -rn "IntEnum\|class.*Error" <errors_path>`), rich messages at raise sites (manual read — not mechanizable), exactly one top-level catch-and-map in the entry point (`grep -n "except.*Error" <entrypoint>` should return exactly one hit), and any CI-native summary surface actually being written on the failure path. Missing (a)–(c) with `logging` also absent is the actual defect shape (silent, undiagnosable failure) that this rule exists to distinguish from the pattern above.

## Applied to the bot, the SDK and the hooks

**Bot** (`/home/mherwig/dev/index/bot`, `src/indexbot/{adapters,core,cli}`, 19 files in `adapters/`+`core/`):

*The failure path, traced from `core`/`adapters` to whatever a CI operator actually sees* — the question the corrected premise (§Summary) turns this into:

Every failure `core/` or `adapters/` code deliberately anticipates is raised as a typed exception from `indexbot.errors`: `ValidationError` (exit 1), `AnomalyError` (exit 65, "never auto-healed"), `TransientError` (exit 75, "caller may retry later") — `IndexBotError` subclasses over a 4-value `ExitCode(IntEnum)` (`src/indexbot/exit_codes.py`), explicitly *not* the full sysexits catalog, "because only four are meaningfully distinct here." Every raise site inspected carries the diagnostic payload inline, in the message, at the point of failure — not deferred to a separate log call a reader has to correlate by timestamp:
```python
# src/indexbot/adapters/registry_v2.py:377
raise TransientError(f"backoff exhausted for {method} {url} (status {response.status_code})")
# src/indexbot/core/validate_entry.py:445
raise AnomalyError(
    f"content digest self-consistency violated: claimed {digest!r}, "
    f"object bytes hash to {computed!r}"
)
```
`cli/main.py`'s single top-level `try/except IndexBotError` (the *only* exception handler in the whole CLI dispatch path) does three things on catch: `print(str(exc), file=sys.stderr)`, `write_github_step_summary(f"indexbot {command} failed", str(exc))` (appends a rendered markdown block to `$GITHUB_STEP_SUMMARY` — "the page a publisher actually reads," per its own docstring, not the raw scrollable job log — falling back to a second stderr line if that env var is unset, e.g. a local run), then returns `exc.exit_code`. The docstring on `main()` states the other half of the design explicitly: *"anything else propagates as an unhandled traceback — this file never swallows a bug."* An exception nobody anticipated (a real bug, not a modeled failure) is **not** caught here at all — it reaches CPython's default unhandled-exception handler, which prints the **full traceback**, every frame, every line number, to stderr, for free, uniformly, for any exception type including ones nobody wrote a handler for.

**Verdict: this is a considered, correct architecture for this specific program shape, not a gap.** Four structural reasons, all specific to what this program actually is rather than "logging is overkill for CLIs" as a blanket claim:
1. It is a single-shot batch CLI — one process, one exit, per invocation. There is no concurrent internal stream to disentangle, which is the problem timestamps/levels/logger-names exist to solve.
2. The failure taxonomy that would normally justify log *levels* is already fully typed and exhaustive: 4 `ExitCode` values, one `IndexBotError` subclass per value, checked by the workflow via `$GITHUB_OUTPUT`/exit code — a machine already branches on "what kind of failure was this" without parsing a log line.
3. An unhandled traceback from an unmodeled bug is strictly more diagnostic than a hand-rolled `logger.exception()` call could be here, because it requires nobody to have anticipated the failure and wrapped that specific call site — CPython provides it uniformly, for every exception, everywhere, with zero code.
4. GitHub Actions already captures 100% of stdout+stderr verbatim per step, with retention and access control handled by the platform — there is no routing/storage decision left for the program to make (the [12-Factor logs](https://12factor.net/logs) argument, actually landing here rather than for the CLI's stdout/stderr *split*, which follows [clig.dev](https://clig.dev/#the-basics) instead — see [Contested](#contested--evolving)).

The one honest limitation: there is no verbosity control (no `--verbose`/`DEBUG` tier) — every run always emits the same fixed detail. For a program whose entire output is already captured every time regardless, and whose per-invocation runtime is a CI step rather than a long-lived service someone tails, that costs little; it would start to cost something if the bot grew a mode a human runs interactively many times a day (`--watch`, a REPL) where a quieter default became valuable. That is the concrete trigger for revisiting this, not "add logging because CLIs generally should have it."

| Rule | Status | Evidence |
|---|---|---|
| R1/R2 (library discipline) | N/A | Zero `import logging` anywhere in `src/` — the project has no logging module usage to be a library or application about. |
| R3 (lazy formatting) | N/A | No logging calls exist. |
| R4–R6 (exception logging) | N/A | No logging calls exist. |
| R7 (print confined to boundary) | **Satisfied, verified independently** | `grep -rnF "print(" src/indexbot/core/` → empty. `grep -rnF "print(" src/indexbot/adapters/` → empty. All 12 `print()` calls are in `src/indexbot/cli/` (`governance_check.py:127`, `validate.py:224,245,354,356,358`, `reconcile.py:289,293`, `_common.py:78`, `announce.py:247`, `seed_import.py:317`, `main.py:146`). This is the exact claim the brief flagged as "reportedly exemplary" — confirmed by direct, path-scoped grep, not accepted on faith. |
| R8 (stdout = answer, stderr = diagnostics) | **Satisfied** | 8 of 12 sites write `file=sys.stderr` (per-package OK/FAIL/WARN lines in `validate.py`, the malformed-maintainers notice in `governance_check.py`, the top-level exception text in `main.py:146`). The 4 stdout sites are genuine results: `reconcile.py:289/293` prints the verification summary (the actual answer of a `reconcile` run — confirmed by reading the surrounding function, which also raises/returns based on the same `summary` value), and `announce.py:247` prints the one-line "unchanged, nothing to announce" outcome. |
| R9 (escape-sequence stripping) | **New commitment — gap** | `validate.py`'s `Report.error`/`warning` text interpolates `path`/`package_id` values, which trace back to filenames in a public, PR-submitted index; nothing anywhere strips control bytes before these reach `print(..., file=sys.stderr)`. Latent, not confirmed-exploited (most CI consumption of this output goes to a captured log, not an interactive TTY), but a maintainer running `indexbot validate` locally is a real TTY-attached path. |
| R10 (secret redaction) | N/A | The bot has no logging and does not appear to spawn subprocesses carrying secrets in this inventory (httpx is its one runtime dependency, used for registry calls, not subprocess argv). |
| R13 (print-and-typed-exit-code architecture) | **Satisfied, exemplary** | All four sub-parts present: (a) `IndexBotError`→`ExitCode(IntEnum)` hierarchy, 4 values (`errors.py`, `exit_codes.py`); (b) every inspected raise site (`registry_v2.py:267,285,348,364,377`, `github_api.py:290,294,296,314,353,401,412`, `validate_entry.py:445,478`) builds its message from the specific failing values, not a generic string; (c) exactly one `except IndexBotError` in the whole CLI (`main.py:143`), with unmodeled exceptions deliberately left to an unhandled traceback per its own docstring; (d) `write_github_step_summary()` (`cli/_common.py:61`) writes the failure to `$GITHUB_STEP_SUMMARY` in addition to stderr, with an explicit stderr-only fallback when that var is unset. This is the fleet's reference implementation of rule 13, arrived at independently of this research (predates it), not built to satisfy it. |
| Ruff config | **Confirms the gap, not a violation** | `select = ["E","F","W","I","UP","B","C4","SIM","RUF","S","ANN"]` (`pyproject.toml`) — no `T20`, no `G`, no `LOG`, matching the brief's fleet-wide observation. Since the project has zero logging calls, `G`/`LOG` are currently inert either way; `T20` is the rule that would actually bite if `core/`/`adapters/` ever grew a `print()` — it is not enabled today. |
| **What would make R7 regress** | — | The boundary holds only because nobody has needed progress/diagnostic output from inside `core/` or `adapters/` yet. The first person (human or agent) who needs one, under time pressure, with `T20` not enabled and no logger anywhere in the codebase to reach for, will add a `print()` at the point of need — the path of least resistance is exactly the regression. Enabling `T201` scoped to `core/`+`adapters/` (rule 7 above) converts "nobody has needed one yet" into "the boundary is enforced," independent of who's under pressure. |

**SDK** (`/home/mherwig/dev/ocx-sdk-python`, `src/ocx_sdk/`, zero runtime deps, pyright strict, 100% coverage):

| Rule | Status | Evidence |
|---|---|---|
| R1 (`__name__`, not a string literal) | **Violated** | `_client.py:89`: `_LOG: Final = logging.getLogger("ocx_sdk")`; `_process.py:61`: `_LOG = logging.getLogger("ocx_sdk")`; `_process.py:64`: `_PROCESS_LOG = logging.getLogger("ocx_sdk.process")`. All three use hardcoded strings. Likely deliberate — `"ocx_sdk"` names the package root logger by design, and `"ocx_sdk.process"` is a genuine second logger separating the SDK's own DEBUG trace from raw untrusted child-process stderr — but it is exactly the shape `LOG002` exists to flag, and `__name__` inside `_client.py` would have produced `"ocx_sdk._client"` (still a fine, arguably more consistent, root-scoped name) without hardcoding. |
| R2 (no basicConfig/handler) | **Satisfied** | Zero `basicConfig`, zero `addHandler`, zero `NullHandler` anywhere in `src/`. (`NullHandler` is optional per the HOWTO — its absence only matters if the SDK's logger name would otherwise print a "no handlers found" warning to stderr in an unconfigured application; worth adding as a one-line, zero-risk hardening.) |
| R3 (lazy formatting) | **Satisfied** | All 14 logging calls (all at DEBUG) use `%`-style lazy args, e.g. `_LOG.debug("spawn: %s", shlex.join(...))` (`_process.py:396,432`). Zero f-strings in any logging call. |
| R4–R6 (exception logging) | N/A | Zero `.exception()`, zero `exc_info=` calls anywhere — the SDK logs no exceptions at all today (it raises typed errors instead, redacted, per `_errors.py`). Nothing to violate; nothing to regress either, since there's no exception-logging surface yet. |
| R7 (print confined) | **Satisfied** | Zero `print()` anywhere in `src/`. |
| R10 (secret redaction) | **Satisfied, exemplary** | A `redact: Callable[[str], str]` (built by `_make_redactor` in `_env.py:362`) is threaded as an explicit parameter through every subprocess entry point (`spawn`, `spawn_async`, `run_command`, `run_command_async` in `_process.py`) and applied before argv reaches a DEBUG log record (`_process.py:396,432`), before captured stderr is decoded (`_decode`, `_process.py:678-685`), and before text reaches raised error objects. The module docstring names CWE-532 explicitly (`_process.py:22`) and documents the one deliberate exception (stdout is never redacted, since it's the parsed data payload) — this is the fleet's reference implementation for rule 10. |
| R11 (`warnings.warn` + `stacklevel`) | **Satisfied** | One call site, `_config.py:170`, two frames inside a dataclass `__post_init__`, correctly uses `stacklevel=3` to attribute the warning to the caller who constructed the misconfigured object. |
| Ruff config | **Partial gap** | `select = ["E","W","F","I","B","UP","ANN","RUF"]` (`pyproject.toml:62-70`) — no `T20`, no `G`, no `LOG`, and notably no `S` (flake8-bandit) either, despite the codebase visibly caring about exactly the CWE classes `S`/`LOG` cover. Adding `LOG002` here would surface the three hardcoded-string `getLogger()` calls immediately (all currently latent). |

**Hooks** (`/home/mherwig/dev/ocx/.claude/hooks`, 10 single-file scripts + `hook_utils.py`, 688 LOC, stdlib-only, no lint config anywhere in the repo):

| Rule | Status | Evidence |
|---|---|---|
| R1/R2 (library discipline) | N/A | Zero `import logging` in any of the 10 files. |
| R3–R6 (logging-call hygiene) | N/A | No logging calls exist. |
| R7 (print confined to boundary) | **Satisfied, by protocol necessity** | 7 `print()` sites total (`hook_utils.py:38`, `post_tool_use_tracker.py:301`, `session_start_loader.py:60`, `stop_validator.py:92`, `user_prompt_router.py:138`); each individual script's `main()` picks exactly one output shape (structured JSON via `hook_utils.output_json`, or plain human-readable text) and exits — never both in the same invocation, so the two shapes never interleave or drift against each other within a run. |
| R8 (stdout/stderr split) | **Does not apply as stated — protocol inverts it** | Zero `sys.stderr` writes anywhere in the repo; *all* output, both the machine-readable JSON decision and the human-readable reminder text, goes to stdout via bare `print()`. This is correct for Claude Code's hook protocol (hooks return their result to the harness via stdout), not a violation of §5 — but it means the harness itself owns the routing distinction clig.dev assumes the CLI author would build. |
| R9 (escape stripping) | **New commitment — gap** | No control-byte stripping anywhere. `post_tool_use_tracker.py`'s reminder text and `user_prompt_router.py`'s route suggestion both interpolate repo-local strings (paths, skill names) that are lower risk than the bot's PR-submitted-content case, but the pattern (no sanitizer exists in this toolchain at all) is the same gap. |
| R10 (secrets) | **Partially present** | `pre_tool_use_validator.py`'s `detect_secrets()` (regex set, `pre_tool_use_validator.py:87-95`) scans content an agent is about to *write* and blocks/warns before the write — a real secrets guard, but for the write path, not the log/output path; there is nothing redacting hook *output* itself before it's printed. |
| R12 (breadcrumb on forced-silent failure) | **Violated** | `post_tool_use_tracker.py:7`: "All logic is wrapped in a top-level try/except to guarantee silent failure" — `except Exception: pass` at lines 189 and 303, with zero diagnostic trace of any kind on the failure path. The "must never fail" constraint is legitimate and explicitly documented; the total absence of even an opt-in breadcrumb (e.g., one `stderr` line behind an env var, since stderr is otherwise unused here) is the gap — a failing hook is currently undiagnosable from its own output. |
| Ruff config | **Absent entirely** | No `pyproject.toml`, no `ruff.toml`, no `.ruff.toml` anywhere under `/home/mherwig/dev/ocx` (confirmed by directory search); the `.ruff_cache/` present in `hooks/` is leftover from unconfigured ad-hoc runs, not evidence of an enforced ruleset. Every "no violation found" result in this table for the hooks toolchain reflects an absence of surface area (no logging calls to violate), not enforcement — there is currently zero lint gate that would catch a regression here. |
| Naming note | — | `subagent_stop_logger.py` is not stdlib-logging-shaped despite its name — it appends structured JSON records to `.state/learnings-pending.jsonl` via `hook_utils.LearningsStore`. A false-friend for a future reader (human or agent) searching this repo for "the logging module usage" by filename. |

## AI-agent angle

Each mistake below is a shape an LLM reaches for reflexively because it's the most common pattern in its training distribution, not because it's wrong in isolation — the check is what turns "plausible-looking" into "caught before merge":

- **`print()` in library code**: `ruff check --select T201 --no-cache --isolated <lib_path>`.
- **`basicConfig()` inside a module** (not the one true entry point): `grep -rnF "basicConfig(" <libsrc>`.
- **f-strings in log calls**: `ruff check --select G004 --no-cache --isolated <path>`.
- **`logger.error(...)` immediately before `raise`** (double-reporting): no reliable syntactic check — read the frame per the §3 heuristic (does the caller's own handler also log this?).
- **Logging the exception and then re-raising it, caught again upstream and logged again**: same limitation — greppable candidates (`.exception(` or `.error(` followed within a few lines by `raise`), but the actual double-report only exists if a caller's handler also logs; that requires reading the call graph, not just the file.
- **Inventing `logging.getLogger("myapp")`** instead of `logging.getLogger(__name__)`: `ruff check --select LOG002 --no-cache --isolated <path>`.
- **Configuring logging at import time** (module-level `logging.config.dictConfig(...)` or `basicConfig(...)` outside `if __name__ == "__main__":`): `grep -rnF "basicConfig(" <path>` plus a manual check that any `logging.config.*` call sits inside a function guarded by an explicit entry-point condition, not at module scope.

## Contested / evolving

As of 2026-08-23:

- **stdout-for-everything vs. stdout-for-data-only** is not a bug in either camp, it's two standards solving different shapes of program. 12-Factor's "write everything to stdout" ([12factor.net/logs](https://12factor.net/logs)) is written for long-running services with no "answer" to pipe; clig.dev's stdout/stderr split ([clig.dev](https://clig.dev/#the-basics)) is written for exactly the CLI shape this bot and these hooks are. Applying 12-Factor's rule to a CLI (or vice versa) produces confidently-wrong advice — worth stating explicitly in any rule doc so it doesn't get cargo-culted from the wrong source.
- **`G004`'s two "good" alternatives disagree with each other in practice**: ruff's own docs show both `extra=dict(user_id=user)` and plain `"%s - Something happened", user` as equally endorsed fixes ([ruff G004](https://docs.astral.sh/ruff/rules/logging-f-string/)), but they produce different downstream shapes (structured fields vs. a formatted string) — a project adopting `G004` still has to separately decide which of the two it standardizes on, which ruff itself does not prescribe.
- **`NullHandler` in a library's `__init__.py`** is stated as best practice in the current HOWTO, but its only observable effect since Python 3.2 (when the stdlib logging module started providing an implicit `lastResort` handler on the root logger) is suppressing one specific case — the "no handlers configured" warning message that no longer fires the way it did pre-3.2 in most default configurations. It remains cheap, harmless, and documentation-endorsed, but "strongly advised" is doing more rhetorical than functional work today than it did when the guidance was first written.
- **FORCE_COLOR/NO_COLOR are community conventions, not an IETF/POSIX standard** — widely honored (Node, Rust's `clap`/`console`, many Python CLIs) but not universal, and `force-color.org`/`no-color.org` are advocacy sites, not a spec body; a project adopting them is following convention, not a mandated interface.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.python.org/3/howto/logging.html](https://docs.python.org/3/howto/logging.html) | Official Python Logging HOWTO | Current (3.x) | Canonical source for library-vs-application config, `__name__` convention, level table, lazy formatting rationale. |
| [docs.python.org/3/howto/logging-cookbook.html](https://docs.python.org/3/howto/logging-cookbook.html) | Official Python Logging Cookbook | Current (3.x) | Multi-module logger naming patterns, filter mechanics, structured-logging pointers. |
| [docs.python.org/3/library/logging.html](https://docs.python.org/3/library/logging.html) | Official `logging` module reference | Current (3.x) | Exact `extra=` contract, reserved `LogRecord` attribute names, `Filter.filter()` semantics (including the 3.12 record-replacement change), `Logger.exception()` definition. |
| [docs.python.org/3/library/warnings.html](https://docs.python.org/3/library/warnings.html) | Official `warnings` module reference | Current (3.x) | Exact `warnings.warn()` signature, `stacklevel` semantics with the wrapper-function example, `DeprecationWarning` default-filter behavior. |
| [docs.astral.sh/ruff/rules/logging-f-string](https://docs.astral.sh/ruff/rules/logging-f-string/) | Ruff rule page, G004 | ruff v0.0.236+ (current) | Primary source for the exact G004 rationale (eager formatting + structured-logging `extra=` argument) used to justify MUST vs SHOULD. |
| [docs.astral.sh/ruff/rules/error-instead-of-exception](https://docs.astral.sh/ruff/rules/error-instead-of-exception/) | Ruff rule page, TRY400 | Current | Confirms exact code/name/behavior for "log `.error()` in an except block instead of `.exception()`." |
| [docs.astral.sh/ruff/rules/verbose-log-message](https://docs.astral.sh/ruff/rules/verbose-log-message/) | Ruff rule page, TRY401 | Current | Confirms exact code/name/behavior for redundant exception-object interpolation. |
| [docs.astral.sh/ruff/rules/print](https://docs.astral.sh/ruff/rules/print/) | Ruff rule page, T201 | Current | Confirms exact code/rationale for flagging `print()`. |
| [docs.astral.sh/ruff/rules/](https://docs.astral.sh/ruff/rules/#flake8-logging-format-g) | Ruff full rule index | Current (ruff 0.16.x installed locally) | Source for the complete G-family and LOG-family code table (G001-G202, LOG001-LOG015). |
| [no-color.org](https://no-color.org/) | NO_COLOR convention spec | Ongoing community standard | Exact normative text for the NO_COLOR check (non-empty presence triggers it, value ignored). |
| [force-color.org](https://force-color.org/) | FORCE_COLOR convention spec | Ongoing community standard | Exact normative text for FORCE_COLOR and its precedence over NO_COLOR. |
| [clig.dev](https://clig.dev/#the-basics) | Command Line Interface Guidelines | Community reference, actively maintained | Primary source for the stdout=data/stderr=diagnostics rule, TTY-detection heuristic, `--json`/`--plain` stability framing. |
| [12factor.net/logs](https://12factor.net/logs) | The Twelve-Factor App, Logs factor | 2011-era, still widely cited | The competing "everything to stdout" model for services — cited specifically to bound where clig.dev's split does and doesn't apply. |
| [cwe.mitre.org/data/definitions/532.html](https://cwe.mitre.org/data/definitions/532.html) | CWE-532, Insertion of Sensitive Information into Log File | MITRE, current | Canonical definition for the secrets-in-logs rule; examples of what counts as sensitive. |
| [cwe.mitre.org/data/definitions/150.html](https://cwe.mitre.org/data/definitions/150.html) | CWE-150, Improper Neutralization of Escape/Meta/Control Sequences | MITRE, current | Canonical definition for terminal escape-sequence injection — the class the sibling Rust binary already shipped. |
| [cwe.mitre.org/data/definitions/117.html](https://cwe.mitre.org/data/definitions/117.html) | CWE-117, Improper Output Neutralization for Logs | MITRE, current | Log-forging/log-injection definition, adjacent to CWE-150 with a different victim (the log reader). |
| [python-httpx.org/logging](https://www.python-httpx.org/logging/) | Official httpx documentation | Current | httpx's own guidance for enabling DEBUG logging via stdlib `logging` — cited to show the docs carry no warning about what that logging exposes. |
| [github.com/encode/httpx discussion #2765](https://github.com/encode/httpx/discussions/2765) | Real bug report | 2023, open as of research date | Concrete, confirmed instance of a widely used HTTP library leaking credentials via its own request logging — grounds §6's "this is not hypothetical" claim. |
| [github.com/databricks/databricks-sql-python issue #340](https://github.com/databricks/databricks-sql-python/issues/340) | Real bug report | 2024 | Concrete instance of `urllib3.connectionpool`'s DEBUG logger emitting pre-signed URLs with embedded credentials. |
| [github.com/psf/requests security advisory GHSA-j8r2-6x86-q33q](https://github.com/psf/requests/security/advisories/GHSA-j8r2-6x86-q33q) | CVE-2023-32681 advisory | 2023 | Adjacent, same-family real CVE for credential material mishandled across a boundary (proxy header on redirect) — same root cause pattern as the log leaks. |
| [structlog.org — why](https://www.structlog.org/en/stable/why.html) | Structlog project rationale page | Current | Grounds the §8 comparison of what a dependency buys over stdlib `extra=`/`Filter` (ergonomics, not new capability). |
| [docs.pytest.org — capturing warnings](https://docs.pytest.org/en/stable/how-to/capture-warnings.html) | Official pytest how-to | Current | Exact `pytest.warns()`/`recwarn` API and example for asserting a warning fired. |
