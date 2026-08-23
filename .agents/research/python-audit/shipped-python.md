---
title: Shipped Python — numbers-first audit
agent: general-purpose (sonnet)
model: claude-sonnet-5
scope:
  - /home/mherwig/dev/ocx-sdk-python
  - /home/mherwig/dev/index/bot
  - /home/mherwig/dev/ocx-mirror-sdk
  - /home/mherwig/dev/ocx/.claude/hooks
  - /home/mherwig/dev/grimoire-lore/scripts
  - /home/mherwig/dev/grimoire-lore/.claude/skills/research-lang/scripts
excluded: [.venv/, node_modules/, .agents/worktrees/, dist/, build/, __pycache__/]
method: >
  All counts were produced by commands run against the working trees on
  2026-08-22 and are re-runnable verbatim; each number below is annotated
  with the exact command inline. Three command families were used
  repeatedly: `find <dir> -name '*.py' -not -path '*/.venv/*' | xargs wc -l`
  for file/LOC counts; a small stdlib-only `ast`-based script
  (typing_audit.py, walks every `FunctionDef`/`AsyncFunctionDef`, checks
  arg+return annotations, greps for `Any`/`cast(`/`# type: ignore`/
  `# pyright: ignore`/`TYPE_CHECKING`/class-kind decorators) for the typing
  posture in §3; and `grep -rn` for contract/security greps in §4-6. `uv run
  pyright` and `uv run --extra dev coverage run -m pytest` (or `uv run
  pytest` where pytest-cov is wired via addopts) were executed live against
  each subject's own pinned toolchain — not assumed from config — to verify
  the strict-typing and 100%-coverage claims in §3 and §7.
---

# Shipped Python — numbers-first audit

The team-lead's shape hypothesis (SDK = shipped typed library, index/bot =
automation, hooks/scripts = stdlib-only single-file tools) mostly holds, with
two real corrections: `ocx/.claude/hooks/hook_utils.py` (688 LOC) is a
**shared library** nine of the ten hook scripts import — they are not ten
independent single-file tools, they are nine thin scripts plus one shared
runtime. And a sixth, unlisted-in-the-framing shipped package,
`ocx-mirror-sdk`, exists at `/home/mherwig/dev/ocx-mirror-sdk` (34 files,
4104 LOC) — included per the task's explicit subject list, and it runs a
visibly lower rigor bar (`fail_under = 80`, `typeCheckingMode = "standard"`
with no `strict` override) than the other two shipped packages. Every other
part of the hypothesis — 100% coverage being real, pyright strict actually
passing, Sybil actually executing — was verified live, not assumed, and
held up in every case tested.

## 1. Per-subject file count, LOC, modules

```
find <dir> -name '*.py' -not -path '*/.venv/*' -not -path '*/__pycache__/*' | wc -l
find <dir> -name '*.py' -not -path '*/.venv/*' -not -path '*/__pycache__/*' -print0 | xargs -0 wc -l | tail -1
```

| Subject | Files | LOC | src/lib | tests |
|---|---|---|---|---|
| `ocx-sdk-python` | 38 | 17,006 | 13 files / 7,921 LOC | 24 files / 8,995 LOC |
| `index/bot` | 93 | 20,542 | 35 files / 6,112 LOC | 58 files / 14,430 LOC |
| `ocx-mirror-sdk` | 34 | 4,104 | 17 files / 1,701 LOC | 11 files / 2,111 LOC (+6 examples / 292 LOC) |
| `ocx/.claude/hooks` | 10 | 2,099 | — (flat, 1 shared + 9 scripts) | none |
| `grimoire-lore/scripts` | 1 | 227 | — | none |
| `grimoire-lore/.claude/skills/research-lang/scripts` | 1 | 588 | — | none |

Test LOC exceeds src LOC in both large shipped packages (SDK 8,995 > 7,921;
index/bot 14,430 > 6,112) — the tests are the larger artifact by volume in
both, not an afterthought.

### ocx-sdk-python — largest 5 (`src/`)

`find ocx-sdk-python/src -name '*.py' | xargs wc -l | sort -rn`

| File | LOC | Cohesion |
|---|---|---|
| `src/ocx_sdk/_client.py:1` | 2,204 | One file, five public classes (`Ocx`, `Project`, `ConfigCommands`, `PackageCommands`, `PatchCommands`) — large by design: "the API is these five classes," each method a 1:1 wrap of one `ocx` subcommand. Cohesive by purpose, not by size. |
| `src/ocx_sdk/_results.py:1` | 1,262 | "Every `json.loads` in this SDK happens here" (docstring, line 6) — one result dataclass per `ocx` JSON envelope, deliberate single chokepoint. |
| `src/ocx_sdk/_dist.py:1` | 903 | Manifest resolution, download, and archive extraction for bootstrap — one concern, several stages. |
| `src/ocx_sdk/_bootstrap.py:1` | 856 | Binary fetch/verify/extract/install — cohesive, adjacent to `_dist.py`. |
| `src/ocx_sdk/_process.py:1` | 817 | Subprocess primitives (spawn, kill ladder, retry-aware exec, sync+async twins) — cohesive. |

### index/bot — largest 5 (`src/`)

`find index/bot/src -name '*.py' | xargs wc -l | sort -rn`

| File | LOC | Cohesion |
|---|---|---|
| `src/indexbot/core/validate_entry.py:1` | 675 | Single semantic-validation entrypoint — cohesive, matches its name. |
| `src/indexbot/adapters/registry_v2.py:1` | 443 | One adapter, one external system (registry v2 format). |
| `src/indexbot/cli/seed_import.py:1` | 433 | One CLI subcommand. |
| `src/indexbot/adapters/github_api.py:1` | 413 | One adapter, GitHub REST — the sole HTTP client in the codebase (see §5: no `subprocess` calls anywhere in `index/bot/src`). |
| `src/indexbot/cli/validate.py:1` | 403 | CLI wrapper around `core/validate_entry.py`. |

### ocx-mirror-sdk — largest 5 (`src/`)

| File | LOC | Cohesion |
|---|---|---|
| `src/ocx_mirror_sdk/github/_graphql.py:1` | 297 | GitHub GraphQL client — cohesive. |
| `src/ocx_mirror_sdk/github/_rest.py:1` | 229 | GitHub REST client — cohesive, split cleanly from GraphQL. |
| `src/ocx_mirror_sdk/errors.py:1` | 174 | Error taxonomy — cohesive. |
| `src/ocx_mirror_sdk/cache.py:1` | 174 | On-disk response cache — cohesive. |
| `src/ocx_mirror_sdk/gitlab/_rest.py:1` | 166 | GitLab REST client, parallel to `github/_rest.py`. |

### ocx/.claude/hooks — all 10, by LOC

`wc -l ocx/.claude/hooks/*.py | sort -rn`

| File | LOC | Note |
|---|---|---|
| `hook_utils.py` | 688 | Shared library — `LearningsStore`, tracker I/O, glob matching. Imported by 9 of the other 9 files (`grep -l "import hook_utils\|from hook_utils" *.py` → all 9). Not a single-file tool itself. |
| `post_tool_use_tracker.py` | 311 | |
| `pre_commit_verification.py` | 218 | |
| `pre_tool_use_validator.py` | 194 | |
| `pre_push_main_blocker.py` | 164 | |
| `user_prompt_router.py` | 144 | |
| `conventional_commit_validator.py` | 114 | |
| `subagent_stop_logger.py` | 102 | |
| `stop_validator.py` | 98 | |
| `session_start_loader.py` | 66 | |

## 2. SDK public API surface (`ocx_sdk.__all__`)

`grep -c '^    "' ocx-sdk-python/src/ocx_sdk/__init__.py` → 91 entries (90
names + `__version__`, one const of which is the version string itself).
Introspected live via `uv run python` importing `ocx_sdk` and classifying
each `__all__` member with `inspect`/`dataclasses`/`typing.is_typeddict`:

| Kind | Count | Names (sample where long) |
|---|---|---|
| class (plain) | 1 | `Ocx` |
| dataclass | 46 | `Project`, `ConfigCommands`, `PackageCommands`, `PatchCommands`, `CommandResult`, `RetryPolicy`, … |
| exception (subclass of `BaseException`) | 22 | see §4 hierarchy |
| enum (`IntEnum`/`Enum`) | 3 | `ExitCode`, `Channel`, `InstallEnv` |
| `TypedDict` | 1 | `ConfigOverrides` |
| `Protocol` | 0 | — |
| `NamedTuple` | 0 | — |
| function | 1 | `ensure` |
| module | 1 | `bootstrap` |
| const / type alias | 15 | 4 literal/version constants, 10 PEP-695 `type X = ...` aliases, `__version__` |

`@overload` sets: 0 (`grep -n "@overload" src/ocx_sdk/*.py` → no hits).
`class X[T]`-style PEP-695 generic classes: 0. `TypeVar(...)` assignments:
0. PEP-695 `type X = ...` alias statements (not in `__all__`'s repr but
present in source): 15, at `_types.py:39,96,209,250`, `_results.py:67,70`,
`_client.py:116,119,141,144`, `_process.py:83,86,89,92,95` (`grep -rn "^type "
src/ocx_sdk/*.py`). The SDK's generics story is 100% PEP 695 `type`
statements, 0% classic `TypeVar` — a real, measured preference, not
incidental.

Sync/async split (`_client.py:231-2102`, `grep -c "    async def \| def "`):
70 `def`, 9 `async def`. Every subprocess-touching operation is offered
twice under a naming convention, not overloading: `invoke`/`invoke_async`
(`_client.py:458,492`), `spawn`/`spawn_async` (`:525,548`, `:1194,1228`,
`:1529,1564`), `finish`/`finish_async` (`_process.py:652,682`),
`launch`/`launch_async` (`_process.py:706,711`), `run`/`run_async`
(`_client.py:1112,1155`), `exec`/`exec_async` (`_client.py:1444,1488`). Both
sync and async are offered for every I/O operation — confirmed, not assumed.

## 3. Typing posture (measured, `ast`-based)

Script: stdlib-only, walks every `FunctionDef`/`AsyncFunctionDef`, checks
all args (skipping a leading `self`/`cls`) + return have annotations.

| Subject (src only) | Total defs | Annotated | `Any` | `cast(` | `# type: ignore` | `# pyright: ignore` | future-annotations files | `TYPE_CHECKING` blocks |
|---|---|---|---|---|---|---|---|---|
| `ocx-sdk-python/src` | 293 | 293 (100%) | 77 | 10 | 0 | 1 (`reportPrivateUsage`) | 12/13 | 3 |
| `index/bot/src` | 221 | 221 (100%) | 34 | 56 | 0 | 0 | 31/35 | 19 |
| `ocx-mirror-sdk/src` | 53 | 53 (100%) | 28 | 0 | 0 | 0 | 12/17 | 0 |
| `ocx/.claude/hooks` | 88 | 88 (100%) | 1 | 0 | 0 | 0 | 1/10 | 0 |
| `grimoire-lore/scripts` | 9 | 9 (100%) | 0 | 0 | 0 | 0 | 0/1 | 0 |
| `research-lang/scripts` | 17 | 17 (100%) | 0 | 0 | 1 bare | 0 | 1/1 | 0 |

Every shipped src tree is 100% annotated, measured — not just configured.
Test trees are looser: `ocx-sdk-python/tests` is 493/712 (69%) annotated
(per-file ruff ignore `"tests/*" = ["ANN", "D"]`, `pyproject.toml:` confirms
this is deliberate, not drift) and carries most of that subject's
`pyright: ignore` volume (`reportAttributeAccessIssue` ×9,
`reportArgumentType` ×3, `reportIndexIssue` ×3, at
`ocx-sdk-python/tests/unit/*`). `index/bot/tests` is 1055/1055 (100%) —
its ruff config has no test exemption for `ANN`.

`Protocol`/ABC/dataclass split (from the class-kind pass in the same
script): `index/bot/src` has 4 `Protocol` classes, 0 `ABC` subclasses, 24
`@dataclass` classes — ports are `Protocol`-typed structural interfaces
(`src/indexbot/ports.py:1`), not inheritance. `ocx-sdk-python/src` has 1
`Protocol`, 0 `ABC`, 51 `@dataclass`/enum/TypedDict classes combined.
Neither subject uses `abc.ABC` anywhere in shipped code — duck typing via
`Protocol`, not classical inheritance, is the house style in both.

`py.typed`: present at `ocx-sdk-python/src/ocx_sdk/py.typed` and
`ocx-mirror-sdk/src/ocx_mirror_sdk/py.typed` (`find … -name py.typed`).
**Absent** from `index/bot` — consistent with it being an internal CLI/bot,
never imported as a library, not a gap.

**Pyright strict — run live, not assumed** (`uv run pyright`, each
subject's own pinned toolchain, 2026-08-22):

| Subject | `pyproject.toml` posture | Live result |
|---|---|---|
| `ocx-sdk-python` | `typeCheckingMode = "standard"`, `strict = ["src"]` — src strict, tests standard | `0 errors, 0 warnings, 0 informations` |
| `index/bot` | `typeCheckingMode = "strict"` — src **and** tests, no exemption | `0 errors, 0 warnings, 0 informations` |
| `ocx-mirror-sdk` | `typeCheckingMode = "standard"`, **no `strict` override at all** | `0 errors, 0 warnings, 0 informations` (clean, but under a materially weaker bar than the other two) |

The `index/bot` claim of strict pyright is the strongest of the three: full
strict mode, zero errors, on both src and tests. `ocx-mirror-sdk` passes
cleanly but was never actually configured for strict checking — its "0
errors" is a weaker signal than the same result from the other two subjects.

## 4. Contracts the code actually honours

### Exit codes

**`ocx-sdk-python`**: 0 `sys.exit`/`SystemExit` calls anywhere in `src/`
(`grep -rn "sys\.exit\|SystemExit" ocx-sdk-python/src` → empty) — it is a
library, not a CLI, so it never exits the process. Its `ExitCode` enum
(`src/ocx_sdk/_errors.py:28-47`) instead *classifies* the exit codes the
`ocx` **binary** returns: `OK=0, FAILURE=1, USAGE=64, DATA_ERR=65,
UNAVAILABLE=69, IO_ERR=74, TEMP_FAIL=75, NO_PERM=77, CONFIG=78, NOT_FOUND=79,
AUTH=80, POLICY_BLOCKED=81, DIRTY_RC_BLOCK=82` — sysexits.h plus ocx's own,
each mapped 1:1 to an exception subclass via `_EXIT_CODE_ERRORS`
(`_errors.py:298-309`).

**`index/bot`**: exactly one `sys.exit` call in all of `src/`
(`src/indexbot/cli/main.py:152`, `sys.exit(main())`). Its own
`ExitCode(IntEnum)` (`src/indexbot/exit_codes.py:14-27`) is deliberately a
4-member subset of sysexits, not the full catalog: `OK=0,
VALIDATION_FAILURE=1, ANOMALY=65, TRANSIENT=75` — the docstring states why
("only four are meaningfully distinct here"). `main()` (`cli/main.py:126`)
returns `int`; the module docstring documents that argparse's own exit(2)
for a missing/unknown subcommand is left unchanged, and that anything not an
`IndexBotError` is deliberately left to propagate as an unhandled traceback
rather than being caught (`cli/main.py:17-20`, confirmed in code at
`:138-146` — the `try` only catches `IndexBotError`).

**Hooks / scripts**: `ocx/.claude/hooks` calls `sys.exit(0)` explicitly after
every swallowed exception (e.g. `subagent_stop_logger.py:96`,
`post_tool_use_tracker.py:306`) — hooks must never fail the parent tool
call, by design. `grimoire-lore/scripts/make-mark.py` uses `sys.exit("msg")`
(implicit code 1, message to stderr) at lines 41 and 221, plus a
`--selftest` mode that raises `SystemExit(f"selftest: {what}")` at line 128.
`research-lang/scripts/check-artifacts.py:588` documents its contract in
the module docstring: "Exit 0 = clean, 1 = findings, 2 = bad invocation."

### Error taxonomy

**`ocx-sdk-python`** (`src/ocx_sdk/_errors.py`): base `OcxError(Exception)`
(`:63`) with `_hint` per subclass appended to every message
(`__str__` at `:76-77`); `__reduce__` implemented (`:80-81`) so an error
survives a `ProcessPoolExecutor`/`pytest-xdist` process boundary intact — a
deliberate, documented reason (`:22-24`), not incidental complexity. Two
subtrees: `OcxExecutionError` (process failed/timed out — `OcxProcessError`
at `:103` carries `argv`, `stderr`, `exit_code: int` (not `ExitCode`,
because a signal-killed process exits with a code ocx never assigns —
`:128-130` documents this), `attempts`, `retryable` property; 10 concrete
subclasses map 1:1 to the 10 non-generic exit codes) and `BootstrapError`
(provisioning failures — 4 subclasses). Plus two independent leaves,
`OcxNotFoundError` and `VersionCompatError` (carries `found`/`minimum`
fields). All 22 are exported in `__all__` (public). 0 bare `except:` in
`src/` (`grep -rn "^\s*except\s*:"` → empty everywhere audited). 2
`except Exception as err:` sites, both in `_retry.py:104,159` — both
re-raise (`if not classify(err): raise`) unless the error is retry-eligible;
neither swallows.

**`index/bot`** (`src/indexbot/errors.py`): base `IndexBotError(Exception)`
(`:15`) with a class-level `_exit_code` default and an `exit_code` property;
3 public subclasses (`ValidationError`, `AnomalyError`, `TransientError`,
`:31,39,45`) each overriding `_exit_code`, mapping 1:1 to the 4 `ExitCode`
members — same one-hierarchy-one-enum pattern as the SDK, independently
arrived at. `grep -rn "raise .*Error(" index/bot/src` → 102 raise sites
across 16 files. 0 bare `except:`, 0 `except Exception:` anywhere in
`index/bot/src` — every catch in the codebase is either `IndexBotError` at
the single chokepoint (`cli/main.py:140`) or a named concrete exception.

**Cross-subject `except Exception:` sites** (6 total, all read for
disposition): `ocx-mirror-sdk/src/ocx_mirror_sdk/http.py:39` — narrows a
response-text decode failure to `None`, doesn't swallow the actual HTTP
error. `ocx/.claude/hooks/post_tool_use_tracker.py:189,303` and
`stop_validator.py:65` and `subagent_stop_logger.py:93` — all four are
documented fail-open ("PostToolUse must never fail — swallow all exceptions
silently", `:303-304`) — deliberate, commented, not accidental.
`research-lang/scripts/check-artifacts.py:132` — falls back from
`yaml.safe_load` to a hand-rolled `_mini_yaml` parser when PyYAML import or
parse fails, not a silent swallow.

### Output streams

`grep -rn "print(" ocx-sdk-python/src` → **0 hits**. The SDK never prints;
`_client.py` and `_process.py` use `logging` instead (`grep -rln
"import logging\|logger\."` → both files). `index/bot`: 12 `print(` sites,
**all** inside `src/indexbot/cli/` (`cli/validate.py:224,245,354,356,358`,
`cli/announce.py:247`, `cli/seed_import.py:317`,
`cli/governance_check.py:127`, `cli/_common.py:78`, `cli/main.py:146`,
`cli/reconcile.py:289,293`) — **0** in `core/` or `adapters/`
(`grep -rn "print(" index/bot/src` confirms none outside `cli/`). The
hexagonal boundary is real, not aspirational: the print/no-print line
matches the architectural layer line exactly. `index/bot` has no `logging`
module usage anywhere (`grep -rln "logging" index/bot/src` → empty) — pure
stdout/stderr, appropriate for a GitHub Actions-invoked CLI whose output is
captured by the workflow. Machine-readable JSON output: `core/render.py:146`
emits `json.dumps({"format_version": format_version, "packages": packages},
...)` — versioned. `core/validate_entry.py:581` and
`cli/seed_import.py:264` also emit JSON but without a version key in the
lines inspected.

### On-disk / wire formats

SDK: reads `ocx`'s JSON stdout via `json.loads` at a single chokepoint
(`_results.py:131`, docstring at `:6` states this explicitly) and a dist
manifest via `json.loads` at `_dist.py:384`. No file it writes carries a
version field beyond what the manifest itself supplies. `index/bot`'s
rendered index (`core/render.py:146`) is the one on-disk/wire format found
carrying an explicit `format_version` field.

## 5. I/O and resource discipline

`open(` calls not wrapped in a `with` statement, across every subject
audited: **0** (`grep -rn "open(" <dir> | grep -v "with "` → only false
positives from docstrings, e.g. `index/bot/src/indexbot/cli/announce.py:125`
which is prose inside a docstring, not a call). Every file handle in every
subject is context-managed.

`pathlib` vs `os.path`: `os.path.*` appears in exactly one subject,
`ocx/.claude/hooks` (2 files); every other subject is 100% `pathlib`
(`grep -rln "os\.path\."` → 0 hits in `ocx-sdk-python/src`,
`index/bot/src`, `ocx-mirror-sdk/src`, `grimoire-lore/scripts`,
`research-lang/scripts`).

`open(` calls missing explicit `encoding=` on text mode: **2**, both in
`ocx/.claude/hooks/hook_utils.py:244,270`
(`open(self.tracker_file, "a")` and `open(log_file, "a")` — no `encoding=`
kwarg, relies on locale default). All other text-mode `open(`/`.open(`
calls across every subject carry `encoding="utf-8"` explicitly
(`cli/_common.py:57,81`, `hook_utils.py:445,475`,
`post_tool_use_tracker.py:187`). Binary-mode opens (`"rb"`, `tarfile.open`,
`zipfile.ZipFile`) correctly omit `encoding=` — not counted as findings.

Atomic-write / temp-file pattern: `index/bot/src/indexbot/adapters/
local_files.py:69` — `with os.fdopen(fd, "wb") as handle:` (paired with a
`tempfile.mkstemp`-style fd, the safe pattern; `mktemp` itself — the unsafe,
race-prone one — appears **0** times anywhere audited).

Archive extraction — the one place a written contract is worth quoting in
full: `ocx-sdk-python/src/ocx_sdk/_bootstrap.py:745-780` streams exactly one
named member out of a tar or zip via `tarfile.extractfile`/`zipfile.open`
(never `.extractall()` — 0 hits for `extractall(` anywhere audited),
rejects the member if `entry.is_dir()` or a symlink
(`stat.S_ISLNK(entry.external_attr >> 16)`, `:775`), and resolves the member
strictly **by base name**, never by path — `_only_member`
(`:783-800`) documents: "a hostile entry cannot steer the write... refused
when it is absolute or walks upward." The copy itself is capped
(`_copy_capped`) against `_dist.ARTIFACT_MAX_BYTES`.

Subprocess sites (`grep -rn "subprocess\.\(run\|Popen\|call\)" `): `0` in
`index/bot/src` (confirmed — it never shells out; its only external calls
are `httpx` to the GitHub API), `0` in `ocx-mirror-sdk/src`, 4 in
`ocx/.claude/hooks` (`pre_commit_verification.py:54`,
`stop_validator.py:20`, `pre_push_main_blocker.py:66,119`) — all four carry
explicit `timeout=` (5s or 10s) and none use `shell=True`
(`grep -rn "shell=True"` → 0 hits everywhere audited). SDK's `subprocess.Popen`
sites take `argv: Sequence[str]` (list form, no shell).

Network calls: SDK's own download path (`_dist.py:889`,
`with client.open(request, timeout=timeout) as response:`) is
explicitly timeout- and size-bounded — reads in `_CHUNK`-sized pieces and
raises `DownloadError` past `limit` (`:891-894`), so "unbounded remote read"
is not a finding here, it's the opposite: a deliberately bounded one.
`index/bot`'s `httpx.Client(headers=..., timeout=self.timeout)`
(`adapters/github_api.py:271`) and `ocx-mirror-sdk`'s
`httpx.Client(timeout=30.0, ...)` (`http.py:27-28`) both configure an
explicit timeout at client construction — no bare `httpx.get`/`.post` calls
found.

## 6. Security-sensitive paths

`yaml.load(` (unsafe form): **0** occurrences anywhere audited.
`yaml.safe_load`: 1 use, `research-lang/scripts/check-artifacts.py:131`,
with a stdlib fallback parser (`_mini_yaml`) when PyYAML isn't importable —
optional dependency handled safely either way. `pickle`: 0 occurrences.
`eval(`/`exec(` (the Python builtins): 0 — the one `exec` hit in the SDK
(`_client.py:112,1444`) is the public method name `Project.exec()`, which
runs `ocx package exec` as a subprocess, not the builtin. `extractall(`: 0
(see §5 — the SDK deliberately avoids it). `tempfile.mktemp`: 0. `shell=True`:
0. Secrets: `ocx-mirror-sdk/src/ocx_mirror_sdk/github/_auth.py:13` reads
`GITHUB_TOKEN` from `os.environ.get`, never hardcoded; `_graphql.py:224`
raises `ConfigurationError` rather than silently proceeding unauthenticated.
No secret value was found written to a print/log call in the files
inspected.

## 7. Docs-vs-code (ocx-sdk-python)

Every checkable claim in `README.md` was verified against the code, live,
not just read:

| Claim (README.md line) | Verified |
|---|---|
| "Zero runtime dependencies. Stdlib only" (`:41-42`) | `dependencies = []` in `pyproject.toml:22` — true. |
| "`py.typed` ships" (`:44`) | `src/ocx_sdk/py.typed` exists — true. |
| "100% test coverage" (`:46`) | `uv run --extra dev coverage run -m pytest && coverage report` → `TOTAL 2170 0 396 0 100%`, 996 passed / 41 skipped (skips are the gated contract/acceptance tiers, not exclusions) — true, and the `fail_under = 100` gate actually enforces it. |
| Compatibility doc's `TESTED_OCX_VERSION == MIN_SUPPORTED` assertion (`docs/guide/concepts/compatibility.md:18`) | Matches `_types.py:30,33` (`"0.5.8"` both) — and this claim is itself a Sybil-executed doc snippet, so drift would fail CI, not just this audit. |

Sybil actually executes the snippets: `uv run pytest --collect-only -q` →
**1037 tests collected**, including `docs/guide/*.md::line:N` and
`README.md`-derived items (`conftest.py:87-88` wires `PythonCodeBlockParser`
for plain ` ```python ` fences to run unconditionally, gates
` ```python-contract `/` ```python-acceptance ` behind env vars, and
compile-checks ` ```python-no-run ` via `ast.parse` rather than skipping it
outright — `conftest.py:47-63`). This is the strongest evidence available
that docs and code cannot silently diverge here: the README's own code
block is a pytest item. Where docs and code could in principle disagree,
**code wins in practice** only because the doc snippets are executed against
it on every test run — there is no unchecked doc path in this repo's
`README.md` or `docs/guide/**`.

## Smells, ranked

1. **`index/bot/src` casts 56 times in 6,112 LOC** (`grep -rn "\bcast(" index/bot/src` → 56, vs. 10 in the 2.6× larger `ocx-sdk-python/src` and 0 in `ocx-mirror-sdk/src`) — roughly 1 cast per 109 lines. Every other typing signal in this subject is exemplary (100% annotated, full strict pyright, 0 `Any` outside 34 legitimate uses); this is the one place strictness is bought with `cast(` rather than a narrower type. Worth a follow-up pass at `adapters/registry_v2.py` and `cli/*.py`, its likely concentration point.
2. **`ocx/.claude/hooks/hook_utils.py:244,270`** — the only two `open(` calls in the entire audited surface missing an explicit `encoding=` kwarg (text-mode append). Trivial, one-line fix each, but the single crack in an otherwise universal (0 elsewhere) discipline.
3. **`ocx-mirror-sdk`'s rigor bar is real but lower** — `fail_under = 80` (not 100) and no `[tool.pyright] strict` override (vs. the other two subjects' strict-on-shipped-code posture). Not a bug, but a genuine gap between this package and its two siblings if it's meant to be held to the same bar going forward.
4. **`ocx/.claude/hooks` is not ten independent single-file tools** — `hook_utils.py` (688 LOC) is imported by 9 of the other 9 files. If the eventual Python rule set assumes hook scripts are trivially copy-pasteable single files, this subject contradicts that.
5. **Un-versioned JSON at two of three write sites** — `core/validate_entry.py:581` and `cli/seed_import.py:264` emit JSON without a `format_version`-style field, unlike `core/render.py:146`'s sibling output. Minor, and may be intentional (one is an artifact meant to be read only by the writer's own next run), but inconsistent within the same codebase.

## Patterns worth encoding

1. **Exit-code-enum → exception-hierarchy 1:1 mapping.** Both `ocx-sdk-python/src/ocx_sdk/_errors.py` and `index/bot/src/indexbot/errors.py` independently arrived at the same shape: one `IntEnum` of exit codes, one exception base class with a `_exit_code`/`exit_code` field, and concrete subclasses that are literally the enum's members spelled out as types. This is exactly the "verification that cannot go red" defect class's antidote — the mapping is total and mechanically checkable (`_EXIT_CODE_ERRORS` dict in the SDK; the `_exit_code` class attribute in index/bot).
2. **The single-chokepoint decode/dispatch comment.** `_results.py:6` ("Every `json.loads` in this SDK happens here") and `cli/main.py:138-146`'s sole `except IndexBotError` are both self-documenting invariants stated once and then true by construction. Worth encoding as a rule: "state and enforce a single point of contact for [decode / exit / catch], don't scatter it."
3. **Archive extraction: stream one named member, never `extractall()`.** `_bootstrap.py:745-800` — base-name resolution (never a path), symlink/dir rejection, size cap. This is the exact shape a Python security rule should require for any code unpacking a downloaded archive.
4. **Bounded remote reads with an explicit byte cap**, not just a timeout: `_dist.py:889-894`'s chunked read against `limit` — a rule that "network calls have a timeout" is necessary but not sufficient; this shows the stronger, still-cheap version.
5. **print()/logging boundary tracks the architecture boundary, not habit.** `index/bot`: 12 `print(` sites, all in `cli/`, 0 in `core/`/`adapters/`. `ocx-sdk-python`: 0 `print(` anywhere in `src/`, `logging` instead. A rule enforcing "library code never prints; only the outermost CLI layer may" is directly checkable with the same grep used here.
6. **Doc snippets as pytest items, with a compile-only escape hatch for the genuinely unreachable.** `ocx-sdk-python/conftest.py`'s four-marker Sybil setup (`python` runs, `python-contract`/`python-acceptance` gated by env var, `python-no-run` compile-checked via `ast.parse`) is a complete, reusable pattern for "docs cannot silently drift from code" — and its own docstring records a real Sybil `Path.match()` gotcha (`**` matches exactly one segment, not "any depth") that a naively-authored rule would reproduce.
7. **`--self-test` / `selftest` built into single-file stdlib tools.** `grimoire-lore/scripts/make-mark.py:128` and the ponytail-mode "leave one runnable check" convention converge on the same shape independently — worth codifying as the default expectation for any single-file Python tool this program recommends.
