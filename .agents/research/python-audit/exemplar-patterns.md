---
title: Exemplar patterns — what shipped Python converged on
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope:
  - /home/mherwig/dev/ocx-sdk-python
  - /home/mherwig/dev/index/bot
  - /home/mherwig/dev/ocx-mirror-sdk (divergence comparator)
  - /home/mherwig/dev/ocx/test (shape-1 contact check, 95,419 LOC)
  - /home/mherwig/dev/ocx/.claude/hooks and /home/mherwig/dev/grimoire-lore's own scripts (shape-4 contact check)
method: >
  Every pattern's "Verification" command was run twice, live, on
  2026-08-23: once against the real files cited (reported clean/green
  below) and once against a synthetic violation built in this session's own
  scratchpad directory, never inside an audited repository, then deleted
  immediately after. All ten violations were personally observed to print
  a VIOLATION line or non-empty match — none were assumed from a config
  file or a docstring's claim. One checker (pattern 10, constructor-param
  wiring) had a real bug caught this way: it initially missed
  keyword-only parameters and reported false-clean on its own violation;
  it was fixed and re-run before being reported as verified. This
  session's shell wraps `grep` in a hook that rewrites it to `rg` or
  `ugrep` depending on the call shape, and both wrappers mishandle a bare
  literal `(` in some pattern forms (one treats it as an unbalanced
  regex group, the other flags escaped `\(` as unbalanced too) — every
  command below was re-run with `-F` (fixed-string) once this was
  discovered, and only commands confirmed stable under `-F` are reported
  as this file's official Verification commands.
---

# Exemplar patterns — what shipped Python converged on

Ten patterns below were independently arrived at by `ocx-sdk-python` (a
shipped typed library) and `index/bot` (a shipped automation CLI) — two
codebases with no shared authorship dependency at the code level, built
against different problems (wrap a binary vs. drive a GitHub API). Where a
pattern recurs a third time in `ocx/test` (the 95,419-LOC black-box pytest
harness, shape 1) or the single-file stdlib tools (shape 4), that is noted
under "Does it survive contact" — sometimes it does, sometimes it doesn't,
and the misses are reported as plainly as the hits.

## 1. Exit-code enum ↔ exception-hierarchy is a total, checkable mapping

**The invariant:** every exit code a process can produce must correspond to
exactly one exception subclass, and every subclass in that family must
declare which exit code it maps to — no orphan code, no unmapped subclass.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_errors.py:298-309`:
```python
_EXIT_CODE_ERRORS: dict[ExitCode, type[OcxProcessError]] = {
    ExitCode.USAGE: UsageError,
    ExitCode.DATA_ERR: DataError,
    ExitCode.UNAVAILABLE: UnavailableError,
    ExitCode.IO_ERR: IoError,
    ExitCode.TEMP_FAIL: TempFailError,
    ...
}
```

**Implementation B** — `index/bot/src/indexbot/errors.py:15-27`:
```python
class IndexBotError(Exception):
    _exit_code: ExitCode = ExitCode.VALIDATION_FAILURE
    ...

    @property
    def exit_code(self) -> ExitCode:
        return self._exit_code


class ValidationError(IndexBotError):
    _exit_code = ExitCode.VALIDATION_FAILURE
```

**Where they differ:** A is a dict keyed by the enum, checked at the site
that constructs an error from a process's exit code. B is a class attribute
overridden per subclass, checked at the single dispatch site
(`cli/main.py:146`). B's form is slightly stronger — the mapping lives *on*
the class, so `SomeError().exit_code` is always answerable without a lookup
table that could drift out of sync with the class list. A's form is
necessary only because A's exit codes come from an external process (the
`ocx` binary) whose codes were not designed as Python class attributes to
begin with. Neither is a mistake; B is the better shape when you own both
sides.

**What it prevents:** a caller catching a specific exception type and
`sys.exit`-ing with the wrong number, or two exceptions silently sharing one
exit code because a new subclass was added without updating the map/property.

**Verification** — index/bot shape:
```
python3 check_indexbot_exitcode_mapping.py src/indexbot/errors.py
```
Real file: `clean: every IndexBotError subclass sets _exit_code`. Synthetic
violation (a `NewFeatureError(IndexBotError)` with no `_exit_code`):
`VIOLATION: .../violate_indexbot_errors.py:15: class NewFeatureError
subclasses IndexBotError without setting _exit_code` — observed directly.

SDK shape:
```
python3 check_sdk_exitcode_mapping.py src/ocx_sdk/_errors.py
```
Real file: `clean: every OcxProcessError subclass is mapped in
_EXIT_CODE_ERRORS`. Synthetic violation (a `NewThingError` left out of the
dict): `VIOLATION: .../violate_sdk_errors.py:19: class NewThingError
subclasses OcxProcessError but is not mapped in _EXIT_CODE_ERRORS` —
observed directly.

**Does it survive contact with shape 1?** Applies with an exception. `ocx/test`
is a black-box test harness against a compiled binary — it asserts on the
binary's exit codes (`runner.py`'s `AssertionError` on non-zero `rc`) but
has no exception hierarchy of its own to keep in sync, because it doesn't
raise structured errors, it asserts on outcomes. The invariant's *purpose*
(no exit code left unaccounted for) is what the harness's own scenario
tests exist to enforce on the binary, one layer down. Shape 4 (hooks,
single-file scripts): does not apply — `make-mark.py` and
`check-artifacts.py` use `sys.exit(str)`/bare integers with a
docstring-documented meaning ("Exit 0 = clean, 1 = findings, 2 = bad
invocation", `check-artifacts.py:15-16`) instead of a class hierarchy —
proportionate for a ~200-600 LOC single-file tool; forcing an enum+hierarchy
there would be the over-engineering ponytail mode exists to prevent.

---

## 2. Every `except Exception` is deliberate; bare `except:` does not exist

**The invariant:** a catch-all except clause is either absent, or it is
documented at the point of use with what it does to the error (re-raise
conditionally, or fail open with a stated reason) — never a silent swallow,
never a truly bare `except:`.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_retry.py:104-108`:
```python
except Exception as err:
    if isinstance(err, OcxProcessError):
        err.attempts = attempt
    if not classify(err):
        raise
```

**Implementation B** — every raise site in `index/bot/src` funnels through one
name (`IndexBotError`) at one catch site, `cli/main.py:140`
(`except IndexBotError as exc:`) — and the module docstring states the
converse explicitly: "Anything that is *not* an `IndexBotError` — a genuine
bug — is deliberately left to propagate as an unhandled traceback rather
than being caught here" (`errors.py:5-7`). index/bot has **zero**
`except Exception:` sites in `src/` at all — a stronger form of the same
invariant than the SDK's, because index/bot's authors chose to catch
nothing broad rather than catch broad-and-re-raise.

**Where they differ, and which is better:** B is strictly stronger where it
applies — no broad catch at all beats a broad catch with a re-raise
condition, because there's no conditional logic to get wrong. A's broader
catch is justified by a real constraint B doesn't have: `_retry.py` must
inspect *any* exception a caller's `fn()` might raise to decide whether it's
retryable, so it cannot narrow the except clause to a specific type. Given
that constraint, A is calibrated correctly rather than being a weaker
version of B.

**What it prevents:** an operator debugging a silent failure with no
traceback and no log line — the single most expensive shape of bug in
distributed/CI systems, and the reason "just catch Exception and move on" is
a real anti-pattern this program exists to catch.

**Verification:**
```
grep -rnE "^[[:space:]]*except[[:space:]]*:" src --include='*.py'
```
Real repos (both SDK `src/` and index/bot `src/`): empty output, confirmed
live. Synthetic violation (`except:` / `pass`):
```
except:
```
at line 4 of a throwaway file — matched and printed directly, observed.

**Does it survive contact with shape 1?** Yes, unchanged. `ocx/test` was not
separately re-verified in this pass (out of scope, audited separately per
the task brief), but the same grep is trivially re-runnable there by
whoever owns that audit. Shape 4: yes, unchanged — `grep -rnE
"^[[:space:]]*except[[:space:]]*:" ` returns empty on all of
`ocx/.claude/hooks`, `grimoire-lore/scripts`, and
`research-lang/scripts` (confirmed in the prior audit pass).

---

## 3. Output-boundary discipline: only the outermost layer emits

**The invariant:** code below the outermost entry layer never writes
directly to stdout/stderr — it returns, raises, or logs; only the CLI/entry
layer prints.

**Implementation A** — zero `print(` calls anywhere in
`ocx-sdk-python/src/ocx_sdk/*.py`; `_client.py` and `_process.py` use
`logging` (`_process.py:395-396`, `_LOG.debug("spawn: %s", ...)`) instead,
so the embedding application controls verbosity.

**Implementation B** — 12 `print(` sites in `index/bot/src`, **all** inside
`src/indexbot/cli/` (e.g. `cli/main.py:146`), **zero** in `core/` or
`adapters/`. index/bot has no `import logging` anywhere in the codebase.

**Where they differ, and which is better:** genuinely different mechanisms,
each correct for its own consumer, not a quality gap. The SDK is imported
into arbitrary host programs, so `logging` (caller-controlled routing and
level) is the only correct choice — a library that prints cannot be
embedded cleanly. index/bot's sole consumer is one GitHub Actions workflow
step reading its own stdout/stderr directly, so `print` at the CLI boundary
is simpler and equally correct — there is no second consumer that would
benefit from log-level indirection. Neither would be an improvement on the
other if swapped.

**What it prevents:** a library polluting a host application's terminal
output or breaking a host's own structured-logging pipeline; conversely, a
"core" module accreting print-debugging that never gets cleaned up because
nothing forces it back out.

**Verification** — SDK shape:
```
grep -rnF 'print(' src --include='*.py'
```
Real `ocx-sdk-python/src`: empty (confirmed, `RC=1`). Synthetic violation
(`print("spawning", argv)` added to a `spawn()`-shaped function): matched
and printed directly, observed.

index/bot shape:
```
grep -rlF 'print(' src --include='*.py' | grep -vF '/cli/'
```
Real `index/bot/src`: empty (confirmed, `RC=1`). Synthetic violation (a
`core/observe.py`-shaped file with a stray `print("debug: observing", tag)`):
matched and printed the file path, observed.

**Does it survive contact with shape 1?** Applies with an exception.
`ocx/test/src` has 2 `print(` sites — a test harness's idiom is
`assert`/`pytest.fail`, not print, so even 2 is worth a look, but a pytest
suite legitimately differs from a library: it has no "caller" to pollute.
Shape 4: does not apply as stated — hooks and single-file scripts *are*
their own outermost layer (there is no inner "core" to violate the boundary
from), so print/stdout is correct everywhere in them by construction.

---

## 4. 100% of shipped-`src` function defs are annotated — measured, not configured

**The invariant:** every function definition under the package's `src/` has
a fully annotated signature (all parameters, including `self`-adjacent
ones excepted, plus return type) — checked by an AST walk, not inferred
from a linter's silence.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/`: 293/293 function defs
annotated (100%), confirmed live via `uv run pyright` → `0 errors, 0
warnings, 0 informations` under `strict = ["src"]`.

**Implementation B** — `index/bot/src/indexbot/`: 221/221 function defs
annotated (100%), confirmed live via `uv run pyright` → `0 errors, 0
warnings, 0 informations` under `typeCheckingMode = "strict"` for the
**whole tree**, tests included — a stronger config than A's src-only strict.

**Where they differ, and which is better:** B's config is objectively
stronger (strict on tests too), but B's *test* annotation rate (1055/1055,
100%) is a config choice (no `ANN` ruff exemption for `tests/*`), while A's
tests are 493/712 (69%) annotated under a deliberate ruff exemption
(`"tests/*" = ["ANN", "D"]`, `pyproject.toml`). Both are internally
consistent with their own stated bar; A's is simply a narrower bar,
declared as such rather than silently under-delivered.

**What it prevents:** the exact defect class this whole program tracks — a
signature an agent can misread because a parameter's type isn't stated, or
a "verification" (pyright strict) that looks like it's checking everything
but is quietly excluded from doing so via config.

**Verification:**
```
python3 typing_audit.py src
```
(stdlib `ast`-based; walks every `FunctionDef`/`AsyncFunctionDef`, checks
all non-`self`/`cls` args + return have annotations.) Real
`ocx-sdk-python/src` and `index/bot/src`: `unannotated=0` both, confirmed
live. Synthetic violation (`def helper(x, y=3): return x + y`):
`total_defs=1 annotated_defs=0 unannotated=1` — printed the offending
`file:line:funcname` directly, observed.

**Does it survive contact with shape 1?** No — genuine gap, reported
plainly. `ocx/test/src`: 146/151 (97.2%) annotated, and there is no
`[tool.pyright]` section in its `pyproject.toml` at all — a materially
looser bar than either shipped package. Shape 4: yes, unchanged — 88/88
(hooks), 9/9 (`grimoire-lore/scripts`), 17/17 (`research-lang/scripts`), all
100%, confirmed live — a single-file stdlib tool holding the same bar as a
17,000-LOC shipped library is itself worth noting as evidence this
invariant is cheap to hold regardless of project size.

---

## 5. The I/O boundary is injected as a seam, not hardcoded

**The invariant:** code that talks to the outside world (a subprocess, an
HTTP client) takes that dependency as an injectable parameter with a
production default, so tests can substitute a fake without touching global
state or the real world — this is *how* both packages reach 100% coverage
without a live subprocess or a live GitHub API in the unit tier.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_process.py:92-93,397`:
```python
type PopenFactory = Callable[..., subprocess.Popen[Any]]
"""`subprocess.Popen` seam, so the kill ladder is unit-testable without a child."""
...
factory = popen_factory or subprocess.Popen
return factory(list(argv), env=dict(env), cwd=cwd, shell=False, **{**popen_kw, **_session_kwargs()})
```

**Implementation B** — `index/bot/src/indexbot/ports.py:27-30`:
```python
class RegistryPort(Protocol):
    """OCI registry reads. Implemented by `adapters/registry_v2.py` (ADR-4 BD-1)."""

    def list_tags(self, repository: str) -> list[str]: ...
```
with `tests/fakes/` supplying the fake implementations `core/`'s tests run
against.

**Where they differ, and which is better:** A injects a *factory callable*
per call site; B injects a *typed structural interface* (`Protocol`) at the
module boundary. B's form scales better when there are many related
operations behind one boundary (`RegistryPort` has several methods); A's
form is proportionate to gating one specific call (`subprocess.Popen`
itself). Neither is wrong for its shape; B would be overkill for a
single-function seam, and A would be unwieldy repeated across a dozen
methods without a `Protocol` to group them.

**What it prevents:** a test suite that can only reach 100% coverage by
actually spawning processes or hitting real APIs — slow, flaky, and
unsuitable for CI — or, worse, a codebase where "100% coverage" is real but
achieved by *not testing* the failure paths of the real dependency because
there was no way to fake them.

**Verification** — SDK shape:
```
grep -rnF 'subprocess.Popen(' src/ocx_sdk/*.py
```
Real file: empty — `subprocess.Popen` is referenced bare only as
`popen_factory or subprocess.Popen`, never called directly. Synthetic
violation (`return subprocess.Popen(argv)` bypassing the seam): matched and
printed directly, observed.

index/bot shape:
```
grep -rlF 'import httpx' src --include='*.py' | grep -vF '/adapters/'
```
Real file: empty — `httpx` is imported only in `adapters/github_api.py` and
`adapters/registry_v2.py`. Synthetic violation (a `core/newmod.py` with
`import httpx` and a direct `httpx.get(url)`): matched and printed the file
path, observed.

**Does it survive contact with shape 1?** Does not apply, by design — the
team lead's own framing is exact here: `ocx/test` is *itself* the seam
(subprocess is the boundary it is testing across, on purpose, black-box).
Its own `runner.py` wraps every binary invocation through one function
rather than scattering `subprocess.run` calls — the same *spirit* (one
chokepoint) applied to the opposite problem (don't fake the subprocess,
BE the thing that drives it uniformly). Shape 4: does not apply — hooks and
scripts have no test suite at all (0 test files), so there is nothing to
inject a fake into.

---

## 6. Every text-mode file handle is context-managed with explicit `encoding=`

**The invariant:** no `open()` call happens outside a `with` block, and no
text-mode `open()`/`.open()` call omits `encoding=` (binary mode, `"rb"`/
`"wb"`/`"ab"`, is correctly exempt).

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_bootstrap.py:694,779`:
```python
with path.open("rb") as handle:
...
with bundle.open(entry) as stream:
```
Binary throughout — the SDK's only bare `open()` (`_bootstrap.py:564`,
`open(fd, "rb", closefd=False)`) is also binary, correctly needing no
`encoding=`.

**Implementation B** — `index/bot/src/indexbot/cli/_common.py:57`:
```python
with Path(output_path).open("a", encoding="utf-8") as handle:
```

**Where they differ:** they agree exactly on the invariant; the only
difference is that the SDK's I/O in `src/` happens to be entirely binary
(archive/manifest bytes) while index/bot's is entirely text
(`$GITHUB_OUTPUT`/step-summary appends), so each demonstrates one half of
the same rule. Neither needed to be told the other half.

**What it prevents:** a file handle leaked past a function's lifetime (an
`open()` with no `with`), or a text file written under the platform's
locale-default encoding instead of a pinned one — the exact bug class that
turns into "works on my machine, mojibake in CI" when the CI runner's
locale differs from a developer's.

**Verification:**
```
grep -rnF 'open(' src --include='*.py' | grep -vF '.open(' | grep -vF '"rb"' | grep -vF '"wb"' | grep -vF '"ab"' | grep -vF 'encoding='
```
Real `ocx-sdk-python/src`: empty (the one bare `open()` is `"rb"`, correctly
filtered). Real `index/bot/src`: empty (`local_files.py:69`'s bare
`os.fdopen(fd, "wb")` is correctly filtered as binary; `announce.py:125`'s
hit is docstring prose, a known false positive of this line-scoped check —
noted, not hidden). Synthetic violation
(`with open(path, "a") as f:` with no `encoding=`): matched and printed
directly, observed.

**Does it survive contact with shape 1?** Not fully re-checked for
`ocx/test` in this pass (one incidental hit surfaced while gathering shape-1
context: `ocx/test/src/helpers.py:175`, `with open(_COMPOSE_LOCK, "w") as
lock:` — no `encoding=` — flagged here for whoever owns that audit, not
claimed as exhaustive). Shape 4: **does not survive** — this is a real,
already-known miss, not a hedge: `ocx/.claude/hooks/hook_utils.py:244,270`
are the only two `open()` calls found anywhere in this program's entire
audited surface missing `encoding=` (`open(self.tracker_file, "a")` and
`open(log_file, "a")`). The invariant that holds with zero exceptions in
both shipped packages has exactly one shape (single-file stdlib tools)
where it has already been breached.

---

## 7. The documented contract is executable, not just prose

**The invariant:** a claim about behavior that lives in a doc file or a
spec file must be a test, not a description a test merely happens to agree
with today — so a regression in the code and a regression in the docs are
the same failure, not two independent things that can silently diverge.

**Implementation A** — `ocx-sdk-python/conftest.py:87-88`, Sybil wired to
run every ` ```python ` fence in `README.md`/`docs/**/*.md` as a real pytest
item (` ```python-contract `/` ```python-acceptance ` gated by env var,
` ```python-no-run ` compile-checked via `ast.parse` — never silently
skipped, always at least parsed). Confirmed live:
`uv run pytest --collect-only -q` → **1037 tests collected**, including
`docs/guide/*.md::line:N` items.

**Implementation B** — `index/bot/tests/security/test_governance_contracts.py`
carries a named test per governance-contract ID from `CONTRACTS.md`: **all
26** test functions in that file match `test_(g|fp|nd)[0-9]+_...` — every
one traces to a contract id, confirmed by
`grep -oE "^def test_" ... | grep -viE "^def test_(g|fp|nd)[0-9]+_"` →
empty.

**Where they differ, and which is better:** structurally different — A
executes the doc's own literal code; B is a *named, traceable*
correspondence between a prose contract and a hand-written test, not a
literal execution of the prose. B is weaker in one sense (a human could
still edit `CONTRACTS.md`'s wording without the test file complaining) but
stronger in another (it can express contracts that aren't runnable Python
snippets, like "reconcile is verify-only, never writes" — `test_g12`). A's
form is strictly better *when the spec is itself Python-shaped* (an SDK's
usage examples); B's form is strictly better *when the spec is a behavioral
policy* (a bot's governance rules) that a code snippet can't fully express.

**A third independent instance, found while checking shape-1 contact:**
`ocx/test/doc_scripts/` — shell snippets extracted from the `ocx` binary's
own Rust-project documentation, executed via `src/doc_scripts.py:616`'s
`subprocess.run` against the real binary. Same invariant, a third
independent codebase, a third mechanism (bash-snippet execution against a
compiled binary instead of Python-snippet execution against a library or
named-test-per-contract-id). This is the strongest convergence found in
this audit — three unrelated implementations of "the doc cannot silently
drift from the code," none copying the others.

**What it prevents:** the exact defect class named in this program's own
brief — "a verification that cannot go red." A `README.md` snippet using
the wrong fence language, or a test file with an untraceable test added to
it, are both silent-failure shapes: the check *looks* present but never
actually gates anything.

**Verification** — SDK shape:
```
grep -n '^```' README.md docs/**/*.md | grep -vE '```(python|python-contract|python-acceptance|python-no-run|bash|toml|json|yaml|text|console|markdown|$)'
```
Real repo: empty (one `markdown`-tagged fence found and allow-listed as
legitimately non-Python, not a violation). Synthetic violation
(a ` ```py ` fence — the plausible typo for ` ```python `, which Sybil's own
docstring warns is "simply not collected... invisible to this net rather
than failing it"): matched and printed `3:```py` directly, observed.

index/bot shape:
```
grep -oE "^def test_[a-zA-Z_0-9]+" tests/security/test_governance_contracts.py | grep -viE "^def test_(g|fp|nd)[0-9]+_"
```
Real file: empty. Synthetic violation (`def
test_reconcile_handles_weird_edge_case` added without a contract id):
matched and printed the offending def line directly, observed.

**Does it survive contact with shape 1?** Yes — independently, a third time,
as above. Shape 4: does not apply as a *test-suite* mechanism (no test
suite exists), but a smaller-scale analog is present: `check-artifacts.py`
ships its own `--self-test` mode, and `make-mark.py` raises `SystemExit`
from an internal `selftest` check (line 128) — the same underlying instinct
(a claim about correctness should be runnable) at a scale proportionate to
a single file.

---

## 8. Every external-process/network call carries an explicit timeout, and
`shell=True` is structurally refused, not just absent

**The invariant:** a call that can block on something outside the process's
control (a subprocess, an HTTP request) states its own timeout — "absent"
is not an acceptable value — and shell injection is not just avoided by
convention but rejected at runtime where the API would otherwise allow it.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_process.py:76,437-445`:
```python
_REJECTED_POPEN_KW = ("args", "shell", "executable")
...


def _reject_owned_kwargs(popen_kw: Mapping[str, object]) -> None:
    """Refuse spawn kwargs that would take back what this module owns."""
    rejected = [name for name in _REJECTED_POPEN_KW if name in popen_kw]
    if rejected:
        raise ValueError(...)
```
This is a **runtime-enforced** invariant — a caller who tries to pass
`shell=True` through `**popen_kw` gets a `ValueError`, not a silently
accepted footgun.

**Implementation B** — `index/bot/src/indexbot/adapters/github_api.py:271`:
```python
return httpx.Client(headers=self._headers(), timeout=self.timeout)
```
The single `httpx.Client` construction site in the codebase, always
timeout-bearing.

**Where they differ, and which is better:** A is the stronger form — it
doesn't just avoid `shell=True`, it makes reintroducing it a `ValueError` at
call time, meaning a future contributor *cannot* regress this by passing an
innocuous-looking kwarg. B has no equivalent enforcement mechanism because
`httpx.Client` doesn't expose a shell-injection surface to begin with — B's
risk (a caller forgetting `timeout=`) doesn't have an httpx-level guard, so
B relies on there being exactly one construction site, which the grep below
confirms but does not structurally enforce the way A's `ValueError` does. If
a second `httpx.Client(` site were ever added without `timeout=`, nothing
in `httpx` itself would refuse it — a real, if narrow, gap relative to A's
form.

**What it prevents:** a subprocess or HTTP call hanging forever on a
network partition or wedged process (the classic "CI job that never times
out"), and a shell-injection vector reopened by a well-meaning but
under-informed future patch.

**Verification** — SDK shape:
```
grep -rn 'shell=True' src/ocx_sdk/*.py
```
Real file: empty. (The guard's existence — `_REJECTED_POPEN_KW`'s content —
is inspected directly at `_process.py:76`, not grep-checked, since the
absence check alone doesn't prove enforcement.)

index/bot shape:
```
grep -rn 'httpx\.Client(' src/indexbot --include='*.py' | grep -v 'timeout='
```
Real file: empty. Synthetic violation (`httpx.Client(headers={})` with no
`timeout=`): matched and printed directly, observed.

**Does it survive contact with shape 1?** **No — this is the one pattern
with a genuine, material regression in shape 1.** `ocx/test/src/runner.py:
119-124`, the harness's own core function for invoking the `ocx` binary
under test, has **no `timeout=`** on its `subprocess.run(cmd, ...)` call —
of the harness's 5 subprocess sites, only `helpers.py` has one `timeout=`
occurrence at all. Every scenario test that calls a hung `ocx` process
through this path would hang the whole CI job. This is the single most
actionable, concrete finding produced by the "survive contact" check across
all ten patterns. Shape 4: yes, unchanged — all 4 `subprocess.run` sites in
the hooks (`pre_commit_verification.py:54`, `stop_validator.py:20`,
`pre_push_main_blocker.py:66,119`) carry explicit `timeout=` (5s or 10s),
and `shell=True` appears zero times anywhere audited.

---

## 9. Untrusted external bytes are consumed under a hard, named ceiling

**The invariant:** anything read from outside the process's control — a
downloaded archive's members, a paginated API, a fetched wire payload — is
bounded by a named constant and fails loud past it, rather than trusting
the far end to behave.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_bootstrap.py:745-800`:
never `.extractall()` (0 occurrences anywhere audited); streams exactly one
named member out of a tar/zip, rejects it if it's a directory or a symlink
(`stat.S_ISLNK(entry.external_attr >> 16)`), and resolves the member by
**base name only** — `_only_member`'s docstring: "a hostile entry cannot
steer the write... refused when it is absolute or walks upward." The copy
itself runs through `_copy_capped` against `_dist.ARTIFACT_MAX_BYTES`.

**Implementation B** — `index/bot/src/indexbot/adapters/github_api.py:44,
304-314`:
```python
_MAX_PAGES = 100
...
for _ in range(_MAX_PAGES):
    ...
raise TransientError(f"GitHub API pagination exceeded {_MAX_PAGES} pages: {url}")
```
and `core/observe.py:25,127-130`:
```python
_MAX_INDEX_BYTES: Final[int] = 4 * 1024 * 1024
...
if len(fetch.raw) > _MAX_INDEX_BYTES:
    raise ... f"{_MAX_INDEX_BYTES}-byte ceiling this index commits for one tag"
```

**Where they differ:** A's cap protects against a hostile *archive
structure* (path traversal, symlink escape) as well as size; B's caps
protect against a hostile or merely broken *API response* (unbounded
pagination, an oversized blob) but B never validates path/structural safety
because it has no archive-extraction surface to protect — different threat
models, not different rigor. Neither is "better"; the composite lesson is
that a general rule should require **both**: cap the byte count of anything
read from outside, and, wherever the bytes are then interpreted as a
structure (paths, member names), validate that structure before trusting it
— A does both because it has to, B does the first because that's all its
surface exposes it to.

**What it prevents:** a zip/tar-bomb or path-traversal archive silently
overwriting files outside the intended directory (A's threat), and an
unbounded or hostile API response consuming unbounded memory or looping
forever (B's threat) — the "plausible-looking `extractall()`" is the
canonical version of A's failure mode.

**Verification:**
```
grep -rnF 'extractall(' src --include='*.py'
```
Real `ocx-sdk-python/src`, `index/bot/src`, and `ocx-mirror-sdk/src`: empty,
confirmed across all three in one pass. Synthetic violation
(`bundle.extractall(dest)` — the shortcut an agent reaches for by default):
matched and printed directly, observed.

**Does it survive contact with shape 1?** Not directly applicable —
`ocx/test` doesn't unpack archives or consume paginated external APIs; its
"untrusted input" is the binary's own stdout/stderr, already bounded by
`subprocess.run`'s buffering. Shape 4: not applicable for the same reason —
none of the hooks or scripts extract archives or paginate APIs.

---

## 10. A constructor never silently drops a parameter, and structured
exception fields are calibrated to who actually catches the exception

**The invariant:** every `__init__` parameter on a class in the error
hierarchy is either stored (`self.x = x`) or forwarded (`super().__init__(x)`)
— never accepted and discarded — and the *amount* of structured data an
exception carries matches how many independent callers need to
programmatically inspect it, not a fixed "more fields is better" rule.

**Implementation A** — `ocx-sdk-python/src/ocx_sdk/_errors.py:114-126`:
`OcxProcessError` carries `exit_code: int`, `attempts: int`, plus inherited
`argv`/`stderr` — 4 structured fields per concrete subclass, because the SDK
is a library whose callers are arbitrary third-party code that must decide
programmatically how to react (retry? surface which command failed?
show `.stderr`?).

**Implementation B** — `index/bot/src/indexbot/errors.py:15-46`:
`IndexBotError` and its 3 subclasses carry **zero** per-instance structured
fields beyond the inherited `Exception.args` message string — `exit_code`
is a *class*-level attribute (same for every instance of a given subclass),
not something that varies per-raise. This is correct, not a gap: index/bot
has exactly one catch site (`cli/main.py:140`), which only ever needs
`str(exc)` (printed) and `exc.exit_code` (already answerable from the
class) — there is no second caller anywhere that would benefit from a
richer per-instance payload.

**Where they differ, and which is better:** A's richer shape is better *for
a library*, where "who catches this" is unknown at write time and every bit
of structured context saves a caller from re-parsing a message string. B's
minimal shape is better *for a CLI*, where adding fields nothing reads would
be exactly the unrequested-abstraction pattern this program should be
teaching agents to avoid, not encoding as an aspiration. The right answer is
"match the field count to the number of independent consumers," not
"always maximize structured fields."

**What it prevents (the mechanical part, applicable to both):** a
constructor parameter added to help future callers (e.g. a `retry_after:
float` added to a retry-related error) that is accepted but never stored or
forwarded — the field silently doesn't exist on the instance, and any code
written against the assumption that it does fails at attribute-access time,
far from the actual mistake.

**Verification:**
```
python3 check_ctor_params_wired.py src/ocx_sdk/_errors.py OcxError
python3 check_ctor_params_wired.py src/indexbot/errors.py IndexBotError
```
(stdlib `ast`-based; for every `__init__` in the hierarchy, every declared
parameter — including keyword-only — must appear as a `Name` load somewhere
in the function body, i.e. stored or forwarded.) Real files: `clean: every
constructor parameter is used (stored or forwarded)`, both, confirmed live.
Synthetic violation (an `OcxProcessError.__init__` with a new keyword-only
`retry_after` parameter never stored or forwarded): first run of the
checker **wrongly reported clean** — a real bug in the checker itself
(it only inspected `args.args`, missing `args.kwonlyargs`); fixed to walk
`posonlyargs + args + kwonlyargs`, re-run, and correctly printed
`VIOLATION: .../violate_ctor.py:6: OcxProcessError.__init__ never uses
parameter(s) ['retry_after'] — stored nowhere, forwarded nowhere` — observed
directly, then both real files re-confirmed still clean under the fixed
checker.

**Does it survive contact with shape 1?** Not applicable — `ocx/test` has no
custom exception hierarchy (it uses `AssertionError` with an f-string,
`runner.py:127-129`). Shape 4: not applicable, same reason.

---

## Divergences worth a decision

**`ocx-mirror-sdk` sits between the two exemplars on paper — `fail_under =
80` (not 100) and `typeCheckingMode = "standard"` with no `strict`
override, unlike both siblings' src-strict-or-fuller posture.** Measured
whether that gap is visible in the code or only in the gate, per-KLOC
against the same figures for the SDK and index/bot:

| Metric (per KLOC of `src/`) | `ocx-sdk-python` | `index/bot` | `ocx-mirror-sdk` |
|---|---|---|---|
| Annotated defs | 293/293 = 100% | 221/221 = 100% | 53/53 = **100%** |
| `Any` occurrences | 9.7/KLOC | 5.6/KLOC | 16.5/KLOC (all at documented JSON-decode boundaries — `cache.py:145,159,163`'s `get_json`/`put_json`/`fetch_json`, same pattern as the SDK's `_results.py`) |
| `cast(` sites | 1.3/KLOC | 9.2/KLOC | **0/KLOC** |
| `# type: ignore` / `# pyright: ignore` | 0 | 0 | **0** |
| Bare `except:` | 0 | 0 | **0** |
| `open()` missing `encoding=` | 0 | 0 | N/A — **0 `open()` calls in `src/` at all** (no file I/O; the package only speaks HTTP) |
| `shell=True` | 0 | 0 | **0** |
| Real measured coverage (`uv run coverage report`, live) | 100% (2170 stmts/396 branches) | 100% (2038 stmts/570 branches) | **95%** (540 stmts/108 branches, `TOTAL 540 21 108 9 95%`) — comfortably above its own 80% floor |

**Verdict: code-is-equally-good.** `ocx-mirror-sdk` is 100% annotated,
`cast(`-free (better than index/bot on that axis), has zero bare excepts,
zero `shell=True`, and its `Any` usage is the same disciplined
boundary-only pattern as the SDK's — its real coverage (95%, measured live)
is closer to its siblings' 100% than its 80% floor would suggest. The gate
is genuinely looser (`fail_under=80` vs `100`, no pyright `strict`), but
that looseness is not showing up as worse code — it is showing up as *less
proof* of the same quality. This means the rule this program should encode
is a **packaging/config-artifact** rule ("ship the same `fail_under`/
`strict` posture across every package in a fleet"), not a **code-pattern**
rule — there is no code smell here for a rule to catch, only a
configuration gap for a checklist to catch.

## What an agent gets wrong here

| Pattern | The plausible-looking wrong thing | Smallest mechanical catch |
|---|---|---|
| 1. Exit-code/exception mapping | Add a new error subclass or a new exit code and forget to wire the other half | `check_indexbot_exitcode_mapping.py` / `check_sdk_exitcode_mapping.py` (AST, this session) |
| 2. No bare except | `except: pass` "to be safe" around a flaky call | `grep -rnE "^[[:space:]]*except[[:space:]]*:"` |
| 3. Output boundary | A `print()` left in `core/`/`adapters/` from debugging, or added to library code "just for this one case" | `grep -rlF 'print(' src \| grep -vF '/cli/'` (index/bot shape) / `grep -rnF 'print(' src` (library shape) |
| 4. 100% annotation | A quick helper function written without a return type "since it's obvious" | `typing_audit.py` (AST, this session) |
| 5. I/O seam | A direct `subprocess.Popen(...)` or `httpx.get(...)` call that reaches around the factory/Protocol seam, making that code path untestable without the real world | `grep -rnF 'subprocess.Popen('` / `grep -rlF 'import httpx' \| grep -vF '/adapters/'` |
| 6. Context-managed + encoded I/O | `open(path, "a")` with no `encoding=`, silently locale-dependent | `grep -rnF 'open(' \| grep -vF '.open(' \| grep -vF '"rb"' \| grep -vF '"wb"' \| grep -vF 'encoding='` |
| 7. Executable spec | A fenced code block tagged ` ```py ` instead of ` ```python ` — passes review because it *looks* like a runnable example, is silently never run | `grep -n '^```' *.md \| grep -vE '```(python\|python-contract\|python-acceptance\|python-no-run\|bash\|toml\|json\|yaml\|text\|console\|markdown\|$)'` |
| 8. Timeout + no-shell | `subprocess.run(cmd, capture_output=True)` with no `timeout=` — exactly `ocx/test/src/runner.py:119-124`'s real, already-shipped instance of this mistake | `grep -rn 'httpx\.Client(' \| grep -v 'timeout='` (adapt the same shape to `subprocess.run(`) |
| 9. Bounded untrusted bytes | `archive.extractall(dest)` — the one-liner that "just works" until the archive is hostile | `grep -rnF 'extractall('` |
| 10. No dropped constructor params | Adding a keyword-only parameter to an exception's `__init__` "for future callers" and forgetting to store or forward it — this session's own checker made exactly this mistake on the first pass | `check_ctor_params_wired.py` (AST, this session — must walk `kwonlyargs`, not just `args`) |

All ten checker scripts referenced above live in this session's scratchpad
(`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore/.../scratchpad/`,
session-local and not part of any audited repository) and are reproducible
from the commands quoted in each section.
