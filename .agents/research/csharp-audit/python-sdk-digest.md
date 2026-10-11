---
title: "Portability digest of the reference SDK ocx-sdk-python for a C# / .NET ocx SDK"
agent: sonnet research subagent (axis: python-sdk-digest)
model: claude-sonnet-5-5
scope: "~/dev/ocx-sdk-python at 80136dde4162 (2026-10-09, tag v0.2.0 + 23 commits, pyproject 0.2.0). src/ocx_sdk/*, tests/, docs/, CLAUDE.md, .claude/rules/*, pyproject.toml, taskfile.yml, .github/workflows/*. Read-only; nothing written into that repo."
method: "Every number below is followed by the command that produced it. Shell was zsh, so loops were wrapped in `bash -c`. `/usr/bin/grep` was used because the interactive `grep` is rewritten by a token-saving proxy. Unit/coverage runs happened in a scratch COPY of the repo (tar of the tree minus .git/.venv/site) with PYTHONDONTWRITEBYTECODE=1 and COVERAGE_FILE outside the repo, using the repo's own .venv interpreter. The C# probe lives in fixtures/python-sdk-digest/ under the dotnet-tools dir. Date of measurement 2026-10-10. Line citations are file:line inside ocx-sdk-python@80136dde4162 unless another repo is named."
---

# ocx-sdk-python: portability digest for a C# SDK

Ref SHA: `git -C ~/dev/ocx-sdk-python rev-parse --short=12 HEAD` -> `80136dde4162`. Commits: `git log --oneline | wc -l` -> 50.

## 0. Verdict on the requester's framing (hypothesis, tested)

Framing: "typed handles over ocx, methods mirror CLI commands one for one, wrap the CLI rather than reimplement it, bootstrap ocx anywhere". Measured result: **true for the command surface, partly false for "wrap not reimplement" and for "anywhere".**

| Claim | Measurement | Verdict |
|---|---|---|
| Methods mirror commands one for one | 43 typed command methods (Ocx 5, Project 10, package 25, config 2, patch 1) of 62 distinct public method names; the other 19 are raw/async/accessor. `docs/reference/command-map.md` (`/usr/bin/grep -c "| T1" ...`) lists 44 T1 rows (typed), 4 T2 rows (real but `invoke`-only), 4 T3 rows (interactive/shell-session, never wrapped), 1 dead-stub row. So "one for one" holds only for the T1 subset; whole `index`, `self`, `config test/push`, `patch publish/...` groups are `invoke`-only. | Mostly true |
| Wrap, not reimplement | Python's own rule allows exactly two carve-outs (`architecture.md:15-20`): the `[env]` merge (`_envmodel.py`, 264 LOC) and `registry_slug`. But **a third reimplementation exists that the rule does not count**: `_bootstrap.py` + `_dist.py` = 1,809 LOC (15.5% of src) re-implement ocx's own setup script (manifest fetch, sha256, tar/zip unpack, cache). It is justified (nothing to wrap before ocx exists) but it is the largest trust surface. | Partly false |
| Bootstrap anywhere | Live manifest has all 8 targets for the latest release (command below): linux/macos/windows x x64/arm64, plus linux gnu and musl. SDK maps all of them (`uname_to_triple`, measured table in section 5). But **Windows is the least verified platform**: contract tier runs only on ubuntu (`ci.yml:81-91`), the Windows kill path is `pragma: no cover` (`_process.py:786,794`), and no arm64 Linux or Windows CI leg exists (`ci.yml:56`). | True in code, unverified on Windows/arm64 |
| 100% coverage | `coverage run -m pytest tests/unit tests/test_version.py` in the scratch copy -> `1844 passed in 2.53s`; `coverage report` -> `TOTAL 2839 stmts, 0 miss, 460 branches, 0 partial, 100%`. Held, but only because 10 `pragma: no cover` lines exclude platform branches (section 7). | True |
| Zero runtime deps | `pyproject.toml:22` `dependencies = []`; enforced by `tests/unit/test_public_surface.py` (metadata + import-walk). | True |

Live manifest probe: `curl -sS -A "ocx-sdk/0.2.0" https://setup.ocx.sh/dist.json` -> HTTP 200, 88,245 bytes, schema 1, latest stable `0.6.5`, 35 versions x 8 targets = 280 rows; latest-version targets: `aarch64-apple-darwin, aarch64-pc-windows-msvc, aarch64-unknown-linux-gnu, aarch64-unknown-linux-musl, x86_64-apple-darwin, x86_64-pc-windows-msvc, x86_64-unknown-linux-gnu, x86_64-unknown-linux-musl`; archives are `.tar.gz` except Windows `.zip`. Note the SDK's tested window is 0.6.2 (`_types.py:30-33`), so a default `ensure()` today already lands 3 patch versions above the tested one.

## 1. Architecture map

Commands: `wc -l src/ocx_sdk/*.py`; docstring/code split via a small `ast` script (docstring lines = Module/Class/Function docstrings + attribute docstrings; comment lines = lines starting `#`).

| Module | LOC | Docstring LOC | Code LOC | Role |
|---|---:|---:|---:|---|
| `_client.py` | 3741 | 1805 | 1497 | `Ocx`, `Project`, `PackageCommands`, `ConfigCommands`, `PatchCommands`, private `_Runner` (argv composition, gate, retry/timeout resolution) |
| `_results.py` | 3039 | 1413 | 1089 | 64 frozen result dataclasses + all JSON decode (`json.loads` only here, `_results.py:6`) |
| `_dist.py` | 935 | 470 | 293 | manifest sourcing/validation, hardened urllib transport, retry classifier |
| `_bootstrap.py` | 874 | 437 | 277 | `ensure()`, `discover()`, cache hardening, safe single-member unpack |
| `_process.py` | 844 | 278 | 391 | the only subprocess code: run/spawn, pumps, kill ladder |
| `_env.py` | 490 | 214 | 151 | the only child-env assembly + secret redaction (`build_spawn_env`) |
| `_errors.py` | 391 | 112 | 159 | `ExitCode`, 26 exception classes, exit-code map |
| `__init__.py` | 315 | 24 | 276 | curated re-exports, `__all__` (133 names) |
| `_types.py` | 299 | 119 | 96 | shared vocabulary: auth, `HostEnv`, `PackageRef`, `RetryPolicy`, constants |
| `_envmodel.py` | 264 | 114 | 92 | `[env]` merge/compose/activate |
| `_config.py` | 262 | 150 | 76 | `OcxConfig` (25 fields), `ConfigOverrides` |
| `_retry.py` | 174 | 79 | 67 | backoff generator + sync/async drivers |
| `bootstrap.py` | 29 | 16 | 3 | the one public submodule (re-exports `ensure`, `DistSource`) |
| **Total** | **11,657** | **5,231 (44.9%)** | **4,467 (38.3%)** | comments 143, blank 1,816 |

Findings: two files hold 58.2% of all source (`_client.py` 32.1% + `_results.py` 26.1%: `(3741+3039)/11657`). Docstrings outweigh code in every module; in `_client.py` docstrings are 1.2x the code. Executable statements (coverage) are 2,839, so this is a ~2.8k-statement library carrying 11.6k lines.

Dependency layering (from imports and `architecture.md:38-60`): `_errors` (leaf, stdlib only) <- `_types` <- `_retry`, `_config`, `_envmodel` <- `_env` <- `_process`; `_results` <- `_types`,`_errors`; `_client` composes all; `_bootstrap`/`_dist` import `_errors`,`_types`,`_retry` only, never `_process`/`_env`/`_client` (`architecture.md:55-60`).

### Public surface

- `__all__` has 133 names: `PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -I -c "import ocx_sdk; print(len(ocx_sdk.__all__))"` -> `133`. The list is pinned by `_EXPECTED` in `tests/unit/test_public_surface.py:29` (changing the surface means changing the test).
- 64 result dataclasses (`dataclasses.is_dataclass` over `_results`), 26 exception classes, 17 `ExitCode` members, 7 module-level `parse_*` functions, 25 `from_json` + 41 `from_dict` classmethods.
- Client public methods, counted with `ast` over `_client.py` (distinct names; overloads collapsed): `Ocx` 16, `Project` 15, `PackageCommands` 28, `ConfigCommands` 2, `PatchCommands` 1 = **62**. Breakdown: 43 typed command methods + 10 raw/async twins (`invoke`, `invoke_async`, `spawn`, `spawn_async` on `Ocx`; `exec_async`, `spawn`, `spawn_async` on `Project` and again on `package`) + 9 accessors/derivers (`exe`, `session_config`, `with_config`, `project`, `package`, `config`, `patch` on `Ocx`; `session_config`, `with_config` on `Project`).
- Overloads: `Project.pull` 3 defs (`_client.py:1083,1094,1104`), `package.sign` 4 defs (`2358-2417`), `package.attest` 4 defs (`2545-2610`) - return type switches on a flag (e.g. dry_run, sweep).
- Method to command mapping is by name and tier handle: `Ocx.project(path)` returns `Project` whose every call carries `--project <ocx.toml>` (`_client.py:360-385`, `_Runner.flags` `686-698`); `Ocx.package/config/patch` are stateless property wrappers returning namespace objects (`388-400`) built on the same frozen `_Runner` (`651-675`). Dir -> `ocx.toml` resolution is by suffix/`is_file()` (`383-385`).
- Command-name traps are runtime-guarded: `Ocx.__getattr__` returns a pointed `AttributeError` for `run`/`exec` (`_client.py:318-337`, hidden from pyright via `if not TYPE_CHECKING`).
- Presentation is pinned only for typed calls: `_JSON = ("--format","json","--color","never")` (`_client.py:119`); `invoke`/`spawn` pin nothing (`_RAW`, `125`).
- Own-rule breach: `PackageCommands` has 28 public method names and spans 1,897 lines (`ast`), against `quality-core.md` "God objects/modules with 15+ fields/methods spanning unrelated concerns" (Block tier). It mixes consumer commands (install/exec) and author commands (sign/attest/sbom/announce/claim/cascade).

## 2. Process layer (`_process.py`, 844 LOC)

Design: primitives-only (argv sequence, finished env mapping, redactor, timeout, retry policy) - `OcxConfig`/`HostEnv` never reach it (`_process.py:4-10`, `architecture.md:43-45`). Four entry points: `run_command`, `run_command_async`, `spawn`, `spawn_async` (`:12-17`).

| Concern | Python behaviour | Evidence |
|---|---|---|
| Argv | list form, `shell=False` hard-coded; spawn kwargs `args`/`shell`/`executable` rejected, `env` cannot arrive twice | `:86`, `:462-470`, `:423` |
| Argv grammar | `[exe, *globals, *command, *positionals, "--", *child]`; positional starting `-` raises `ValueError` (CWE-88); `--` emitted only when a child argv exists | `compose_argv` `:157-196` |
| Capture | `capture=True`: both streams piped, one daemon pump thread per stream (line by line) so neither pipe can fill and deadlock; capture is unbounded in memory by design | `:616-631`, `:224-227` |
| Encoding | sync: `text=True, encoding="utf-8", errors="replace"` (universal newlines); async: bytes joined then `decode("utf-8","replace")` and `\r\n` -> `\n` so both drivers are byte-identical across OS | `:514-516`, `:703-710` |
| Stdin | `input=` written once before waiting, then closed (EOF for `--password-stdin`); treated as a secret for that call; blocks if input exceeds pipe buffer and child never reads (self-documented `ponytail:` shortcut) | `:519-520`, `:264`, `:661-670` |
| Timeout | per attempt: sync `proc.wait(timeout)` -> `TimeoutExpired` -> kill ladder -> `OcxTimeoutError(timeout, redacted argv, partial stderr)`; async `asyncio.timeout()` | `:531-535`, `:579-590` |
| Kill ladder | child started in its own session (`start_new_session=True`); SIGTERM the process group, wait `KILL_GRACE=5.0`, SIGKILL the group; pid-recycling guard: never signal if `returncode is not None` (CWE-367) | `:473-481`, `:763-819`, `:68` |
| Cleanup guarantee | `finally: _reap(); _join(pumps)` on any exit (KeyboardInterrupt, callback raising); pump join bounded by `_PUMP_JOIN=5.0` because on Windows a grandchild holding the pipe prevents EOF | `:536-541`, `:634-645` |
| Async cancel | on `CancelledError`: SIGTERM group immediately, **no awaits** in the handler, partial stderr attached as exception note; other `BaseException`: full ladder. Reason: CPython gh-88050 leaves the child running on cancel | `:591-604` |
| SIGINT | `capture=False` one-shots forward SIGINT to the child group, then call the previous handler; main thread only (ValueError -> degrade) | `:713-749` |
| Env | `dict(env)` snapshot at spawn; composed upstream by `_env.build_spawn_env` | `:508`, `_env.py:132` |
| Logging | two loggers: `ocx_sdk` (redacted argv, exit, duration at DEBUG) and `ocx_sdk.process` (one redacted stderr line per record); `on_log` callback per stderr line from the pump thread, **rejected on async paths** (`ValueError`) | `:71-75`, `:683-694`, `:348-352` |
| Exit handling | `ok_codes` per call (default `(0,)`), `check=False` returns the final `Completed`; non-ok code -> `_exit_error` -> mapped exception | `:284-293`, `:822-831` |
| Retry hook | `run_with_retry(attempt, retry, _retryable(retry))`; classifier = `isinstance(err, OcxProcessError) and err.exit_code in policy.retry_on`; timeouts are not `OcxProcessError`, so never retried | `:289`, `:834-844` |
| Repr safety | `Completed.__repr__` / `CommandResult.__repr__` print sizes not bytes so tracebacks with `--showlocals`/Sentry cannot leak unredacted stdout | `:127-140`, `_results.py:484-503` |
| Windows | no process group: `proc.terminate()` (TerminateProcess) only, no graceful phase, no SIGINT forwarding; `capture=False` + `timeout` is "documented degraded" there | `:479,721,786,794` (all `pragma: no cover`), design `sdk-design.md:617-637` |

Seams for tests: `popen_factory`, `exec_factory`, `clock`, `kill_grace` parameters on every entry point (`:208-214`).

Measured trap relevant to .NET (see S1): Python `subprocess` reports a SIGKILLed child as `-9`; the SDK's comments say `137`.
`python3 -c "import subprocess;print(subprocess.run(['sh','-c','kill -9 \$\$']).returncode)"` -> `-9` (SIGTERM -> `-15`). .NET reports `137` / `143`, measured in section 8.

## 3. Error taxonomy (`_errors.py`, 391 LOC)

Principle (`_errors.py:6-8`, `architecture.md:79-112`): "The exit code of the ocx process *is* the error category ... nothing in this SDK ever classifies a failure by matching stderr text." Every `__str__` ends with an actionable hint (`_hint`, `:66-86`).

Hierarchy (26 classes, `inspect` over the module):

```
OcxError (_hint; __reduce__/_rebuild pickling, :54-86)
├─ OcxExecutionError(argv: tuple[str,...], stderr: str)          # "spawned process raised" (:89)
│  ├─ OcxProcessError(exit_code:int, argv, stderr, attempts:int, stdout:str; .retryable)   # (:118)
│  │   15 subclasses keyed by ExitCode: Usage 64, Data 65, Unavailable 69, Io 74, TempFail 75,
│  │   PermissionDenied 77, Config 78, NotFound 79, Auth 80, PolicyBlocked 81, DirtyRcBlock 82,
│  │   TransparencyLogUnavailable 83, ReferrersUnsupported 84, UnsupportedKeyBackend 85,
│  │   ForgeCapabilityUnavailable 86            # exit 1 and unknown codes -> plain OcxProcessError
│  └─ OcxTimeoutError(timeout: float, argv, stderr)                                           # (:294)
├─ BootstrapError → DownloadError, ChecksumMismatchError, DistManifestError, UnsupportedPlatformError  # (:315-345)
├─ OcxNotFoundError (no binary)                                                               # (:348)
└─ VersionCompatError(found, minimum)                                                          # (:354)
```

- Exit-code map: `_EXIT_CODE_ERRORS: dict[ExitCode, type[OcxProcessError]]` (`:373-391`); `ExitCode(int)` has 17 members (`:28-51`: OK 0, FAILURE 1, sysexits 64/65/69/74/75/77/78, ocx-owned 79-86).
- Context carried: redacted `argv` tuple, full `stderr` (message shows last 500 chars with `...` prefix, `_STDERR_EXCERPT=500`, `:24,108-115`), `exit_code` as plain `int` ("a process killed by a signal exits with a code ocx never assigns, and building an error must not itself raise", `:122-124`), `attempts`, raw `stdout`, `.retryable` fixed `True` only for 75 independent of any policy (`:158-165`).
- `stdout` is the one deliberately unredacted field: a partial failure prints a full JSON report then exits non-zero; `__str__` never reads it (`:127-135`, `architecture.md:139-148`). Recovery API: `partial_report(err)` returns the raw stdout when it is a report, `error_envelope(err)` parses the structured failure (`_results.py:380-462`); the two are mutually exclusive.
- Report-then-fail commands (`package test`, `cascade check/repair`) are handled before an exception exists: `ok_codes` includes the finding code (`_client.py:166`, `_CASCADE_OK=(0,65)`; `_RECEIPT_OK=(0,79)` -> `None`), and `tolerated_report(result)` re-raises if stdout is an envelope or non-JSON (`_results.py:506-535`).
- Non-process errors mix with the validation errors Python raises as builtins: see S3.
- Hint quality is high and specific, e.g. `TransparencyLogUnavailableError._hint` warns not to reach for `--allow-unlogged-signature` (`_errors.py:251-256`).

## 4. Results and parsing (`_results.py` 3,039 LOC, `_types.py` 299 LOC)

- **One command, one frozen slotted dataclass, one hand-written parser; no serialization framework** (`_results.py:4-7`, `architecture.md:79-112`). `@dataclass(frozen=True, slots=True)` x64 (`/usr/bin/grep -c '^@dataclass' src/ocx_sdk/_results.py` -> 64).
- Entry points: argument is always **raw stdout text**, never a pre-decoded object (`:16-17`). Single-object payloads: `Cls.from_json(stdout)` (25); keyed-map/array payloads: module `parse_*(stdout)` (7, `:2972-3039`).
- Shape helpers (`:154-316`): `_decode` (empty stdout is an error that names the two commands that legitimately emit nothing, `lock --check`/`update --check`, `:167-172`; those return `None` in the client without parsing), `_need(data,key,what)` raises `ValueError` naming the command and listing the keys it did carry plus "This SDK is tested against ocx X" (`:206-221`), `_shaped` refuses a wrong container so a bare string is not shredded into one-char entries (`:224-249`), `_table/_rows/_texts` return read-only `MappingProxyType`/tuples (`:252-292`).
- **Unknown-field tolerance:** parsers read named keys and ignore everything else, by design: "unknown keys are ignored so a newer ocx that adds a field keeps working against an older SDK" (`:6-7`). Optional fields use `.get` -> `None`; required use `_need`. Open sub-objects stay `Mapping` on purpose (e.g. `VersionInfo` build provenance, `_results.py:553-563`; `ErrorEnvelope.context`).
- **Presence rules are derived from ocx's published schema, not from samples.** `tests/fixtures/contract/reports.v1.json` (279,260 bytes: `wc -c`), generated by `cargo run -p ocx_schema -- reports`, pinned by `tests/unit/test_wire_contract.py` (5 tests, 185 parametrized cases) which fails two classes: *phantom* (parser reads a key ocx never publishes) and *unsafe* (parser `_need`s a key ocx may omit). Reason recorded: three presence-rule inversions reached `main` from hand-written fixtures, one crashed `env()` (`tests/fixtures/contract/README.md`, `test_wire_contract.py:1-18`). The table in that README (`T` always -> `_need`; `Option<T>` always, null -> `_need` typed `| None`; `Option<T>` + skip_serializing_if -> `.get`) is language-neutral and the highest-value artefact for the C# port.
- **Version-skew handling is three-layered:** (1) compat gate: first typed call probes `ocx version`; below `MIN_SUPPORTED` raise `VersionCompatError`; above `TESTED_OCX_VERSION` only a DEBUG note (`_client.py:831-857`); the comparison uses the dotted numeric head only, prerelease tail ignored. Both constants are `"0.6.2"` (`_types.py:30-33`), i.e. the supported window is a single version. (2) tolerant parsing as above. (3) nightly canary runs the acceptance suite against `latest` and compares vendored vs published schema (`acceptance.yml:38-48`, `tests/acceptance/test_schema_drift.py`). A required field going missing under skew surfaces as `ValueError` (S3).
- Binding validation depth: field *names* and container *shapes* are checked; scalar *types* are not (`_need` returns `Any` that is stored straight into the dataclass; `/usr/bin/grep -n isinstance _results.py` -> only `:146,151` plus `_shaped`). The comment "Every field on every struct is precisely typed" (`:39`) means annotations, not runtime checks. System.Text.Json would validate scalar types for free.
- Wire oddities the parser encodes (`:18-30`): three different "path" shapes (`pull` project tier `{id:{path,kind}}` + sibling `advisories`; `package which` `{id:{path,kind}}`; `package pull` bare string), two mutators returning arrays (`uninstall`, `deselect`), `package test -- CMD` prints the child's stdout even under `--format json` (not parseable), enveloped shapes `{schema_version, command, exit_code, data}` for sign/attest/verify/sbom (`_envelope` `:295-316`, error discriminator `_is_envelope` = object with an `error` key `:319-326`).
- `_types.py` vocabulary: `StrEnum` where the runtime iterates (`Channel`, `InstallEnv`), `Literal` aliases for argv-only sets (`LogLevel`, `SignatureFormat`, `LazyMode`, `Forge`, `Transport`, `Resolve`), open sets stay `str` (`architecture.md:79-112`). `PackageRef(identifier, metadata)` is "carried verbatim, never parsed"; equality and hash are identifier-only (`_types.py:217-251`). Secret-bearing types mask `__repr__` (`BasicAuth`, `BearerAuth`, `HostEnv` lists key names only, `:69-143`).

## 5. Bootstrap and distribution (`_bootstrap.py` 874, `_dist.py` 935)

**Locate** (`discover`, `_bootstrap.py:245-292`): explicit `exe=` -> `OCX_SDK_EXE` -> `PATH` scan -> ocx's own stable symlink `$OCX_HOME/symlinks/ocx.sh/ocx/cli/current/content/bin/{ocx,ocx.exe}` (`:78`). `Ocx()` resolves once at construction and pins `realpath` (`_client.py:274-281`). PATH scan is entry by entry via `shutil.which(name, path=entry)` and refuses (a) a hit inside the cwd on Windows, (b) a hit in a group/other-writable directory on POSIX (CWE-426) (`:430-484`). The home tier reads `HOME` off the env snapshot, never `Path.home()`, so narrowed envs stay hermetic (`:278-289`).

**Platform triple** (`uname_to_triple`, `:106-144`), measured by calling it:

```
Linux x86_64        -> x86_64-unknown-linux-musl      (musl default; libc_hint='gnu' -> gnu)
Linux aarch64/arm64 -> aarch64-unknown-linux-musl
Darwin arm64        -> aarch64-apple-darwin
Darwin x86_64       -> x86_64-apple-darwin  (rosetta=True -> aarch64-apple-darwin)
Windows AMD64       -> x86_64-pc-windows-msvc
Windows ARM64       -> aarch64-pc-windows-msvc
Linux armv7l / riscv64 / FreeBSD amd64 -> UnsupportedPlatformError
```
Command: `.venv/bin/python -I -c "from ocx_sdk._bootstrap import uname_to_triple as t; ..."`. It is a pure function over strings so the mapping is table-tested instead of host-mocked. Rosetta is detected through libc `sysctlbyname("sysctl.proc_translated")` via ctypes (`:295-318`).

**Download and verify** (`ensure`, `:147-242`; `_dist.py`):
1. Manifest: `https://setup.ocx.sh/dist.json` default (`_dist.py:61`). Everything in it is untrusted: fields that become path/URL parts are regex-validated (`_NAME_RE` `[A-Za-z0-9._+-]+`, `..` rejected, `_VERSION_RE`, `_SHA256_RE`, `:91-100`, `_validate_row` `:704-735`); schema version must be 1 (`:76`); body capped 1 MiB (`:67`; the in-code comment says the live manifest is ~60 KiB, measured 88,245 bytes today).
2. Pinning: off the canonical host, or with a mirror in play, a `sha256=` (or a `dist/<sha256>.json` snapshot URL, whose name is the digest, taken from the caller's string before any redirect) is **required, fail closed**, because "TLS proves reachability, not authenticity (CWE-345)" (`_dist.py:611-653`). Canonical host is the only TLS-as-authenticity exception. **There is no signature check**; sigstore verification is an open upstream item (`sdk-design.md:952-957`, www-setup#14/#15).
3. Artifact: sha256 from the manifest row is "the artifact trust boundary"; mismatch -> `ChecksumMismatchError`, never retried (`_bootstrap.py:570-583`). The download streams into an `mkstemp` fd in the destination directory, is hashed **through the fd** (no re-open window), capped at 256 MiB (`_dist.py:70`).
4. Transport hardening (`_dist.py:12-35,520-562,885-935`): stdlib `urllib`; `Authorization`/custom headers added with `add_unredirected_header` and only when scheme+host+port match the origin they were given for, so a redirected request is always anonymous; custom redirect handler refuses non-https and userinfo URLs and caps hops at 5; User-Agent `ocx-sdk/<version>` is mandatory because the CDN 403s urllib's default; `ca_bundle` replaces the trust store (PEM, for TLS-intercepting proxies); `OCX_INSTALL_*` env grammar honoured (`_types.py:53-66`).
5. Unpack: **never `extractall`**. Exactly one regular-file member whose base name equals `ocx`/`ocx.exe` is streamed to a temp fd; absolute/`..`/backslash member names, links, directories, duplicates are refused; unpacked bytes capped like downloaded ones (zip-bomb guard) (`_bootstrap.py:718-874`).
6. Publish: `os.replace(staged, binary)` after `fchmod 0o700` (POSIX), then an atomic `.sha256` sidecar holding the **extracted binary's** digest (`:589-628`).

**Cache** (`:321-428`): per-user dir `XDG_CACHE_HOME|~/.cache`, `~/Library/Caches`, `%LOCALAPPDATA%` + `ocx-sdk/<version>/<target>/`; root refused if symlink, not a dir, foreign uid, or group/other-writable (checks skipped on Windows because POSIX bits are synthesized there, `:340-365`); each level below root symlink-checked and created `0o700` one at a time; cache hit re-hashes the binary against the sidecar unless `trust_cache=True`; `OCX_INSTALL_FORCE` reinstalls (`:230`). Stated trust boundary: the cache *root*; its parent is the caller's (`:19-27`).

**Machine-mutation ban:** never `self setup`, profile edits or PATH changes (`architecture.md:77`).

## 6. Retry policy (`_retry.py` 174 LOC, `RetryPolicy` `_types.py:258-299`)

- `RetryPolicy(attempts=3, backoff=1.0, multiplier=2.0, max_backoff=30.0, max_retry_after=300.0, jitter=True, retry_on={TEMP_FAIL}, sleep=None)`; validated in `__post_init__` (attempts>=1, multiplier>=1, no negatives).
- Delay generator: capped exponential, full jitter (`uniform(0, delay)`), accumulated iteratively so a huge `attempts` cannot overflow (`_retry.py:27-48`). `attempts=3` means at most 2 waits; `timeout` is per attempt so worst case is `attempts*timeout + sum(backoff)`.
- `Retry-After`: honoured verbatim up to `max_retry_after`, never truncated to `max_backoff`; beyond it fail with an exception note rather than wait (`_retry.py:51-66,115-118`). Only the bootstrap HTTP path supplies it (`_dist._retry_after` `:798-820`, delta-seconds form only); the process path has no server hint (the `retry_after=` argument is unused in `_process.py:289`).
- Two deliberately duplicated drivers (sync/async) instead of a sans-io bridge ("the bridge would be more code than the thing it abstracts", `:6-8`). Callers own the taxonomy through a `classify(Exception) -> bool` argument: `_process` by exit code in `retry_on`; `_dist` by transport condition (`http.client.HTTPException`, `TimeoutError|ConnectionError`, HTTP 429 and 5xx, `_dist.py:778-795`). Auth failures (80), checksum mismatches, 401/403/404, size-cap aborts never retried.
- Session default `OcxConfig.retry` -> derived handle (`with_config`) -> per-call `retry=` with a three-state sentinel (`UNSET`/`None`/policy; `_client.py:186-198`, resolved `_Runner.retry_for` `:821-825`).
- **Mutating commands default to `retry=None` regardless of session config**: `login`, `clean` (unless dry-run), `package push`, `description_push`, `sign`, `attest`, `copy` (unless dry-run), `announce`, `claim`, `cascade_repair` (unless dry-run). Measured by an `ast` scan for `mutating=` in `_client.py` -> exactly those 10 call sites. `exec`/`spawn` children are never retried (`_client.py:1308`, `retry=None`). Reason: a timed-out `login` exits 75 not 80 and resending credentials is the classic auth-retry mistake (`sdk-design.md:606-611`).
- Rejected on purpose: circuit breakers and retry-budget buckets ("a spawn-per-call wrapper has no trip-state scope", `sdk-design.md:575-580`).
- Test seam: injectable `sleep` (policy field, plus async `sleep` arg) and `random_fn`; unit tests monkeypatch `_retry.time.sleep`/`asyncio.sleep` to recorders (`test_retry.py:197,364`).

## 7. Test strategy

Commands: `/usr/bin/grep -rhE "^\s*(async )?def test_" tests/<tier> --include="*.py" | wc -l`; `git ls-files tests | /usr/bin/grep "\.py$" | xargs wc -l`; run in scratch copy.

| Tier | Test defs | LOC | Gate | Real ocx? | Where it runs |
|---|---:|---:|---|---|---|
| unit (`tests/unit`, 13 files) | 672 defs -> **1,844 collected cases** (103 `parametrize` decorators, 536 `pytest.param`) | 11,524 | always | no | CI 3 OS x 3 Python = 9 legs (`ci.yml:44-71`) |
| doc snippets (Sybil over `docs/**/*.md`, `README.md`, `src` docstrings) | `pytest docs README.md src` -> 54 passed, 20 skipped | - | markers: default / `python-contract` / `python-acceptance` / `python-no-run` | contract markers need binary | unit legs run the default marker; contract job runs the 20 |
| contract (`tests/contract`) | 34 defs | 1,337 | `OCX_SDK_CONTRACT=1`, skips otherwise | **yes**, pinned 0.6.2 via `ocx-sh/setup-ocx`, throwaway `$OCX_HOME`/`DOCKER_CONFIG` | **ubuntu-latest only** (`ci.yml:81-91`) |
| acceptance (`tests/acceptance`) | 11 defs | 820 | `OCX_SDK_ACCEPTANCE=1` | yes + two `registry:2` containers (plain HTTP :5010, htpasswd+self-signed TLS :5011) | after merge to main, nightly 03:00 UTC, dispatch (`acceptance.yml:7-11`); `canary` job with `OCX_TEST_VERSIONS=latest`, `continue-on-error` |
| totals | 717 defs | 13,777 (27 py files) | | | tests : src LOC ratio 1.18 (`13777/11657`) |

- **No fake `ocx` binary exists.** Unit tests fake *Python seams*: `_FakePopen`/`_FakeProcess`/`_FakeReader`/`_FakeWriter` (`tests/unit/test_process.py:77-236`), `popen_factory` injection, and in `test_client.py` the whole `_process` layer is faked ("No test here starts a real process, and none needs an ocx binary: the exe fixture is an empty file", `test_client.py:1-18`). Real children are `[sys.executable, "-c", script]` (6 uses in `test_process.py`) - the substitute for a fake binary. Verified child-exit mapping with a shell script `exit 80` (see S2).
- **Recorded fixtures:** `tests/fixtures/cli/` 70 files (42 `*.help.txt` captured verbatim from `ocx <cmd> --help`, 27 `*.json`, 1 shell script) pin flag fidelity row by row; `tests/fixtures/results/` 51 JSON payloads (incl. `partial/` error envelopes); `slug_fixtures.json` (registry-slug corpus extracted from ocx source at the tested tag); `reports.v1.json` schema. Total `git ls-files tests/fixtures | wc -l` -> 126.
- **Mechanism -> named-test matrix** (`sdk-design.md:765`, `architecture.md:175-177`): every design mechanism has a named test row (`test_compat_gate_below_min_raises`, `test_mutating_commands_retry_disabled`, `test_leading_dash_rejected`, `test_double_dash_emitted`, ...); a mechanism without a row fails review.
- **Coverage gate:** `fail_under = 100`, `branch = true` (`pyproject.toml:89-106`). Enforced only on the Linux legs (`ci.yml:70-72`) because platform branches make 100% unreachable elsewhere. 10 `pragma: no cover` lines in src: `/usr/bin/grep -rn "pragma: no cover" src` -> 4 in `_process.py` (all Windows kill/SIGINT/session branches), 6 in `_bootstrap.py` (Rosetta, root ownership x2, trusted-location, fchmod, tar stream None). Each carries a reason. Note `codecov.yml` still says "Mirror the local fail_under=80 gate" (stale).
- **Process-test gap that matters for C#:** the Windows kill path has zero functional coverage by construction (pragma + posix-only skipif `test_process.py:42`) and `test_sigint_forwarding` is a permanent skip at the contract tier (`test_process_contract.py:114-125`, covered only through an injected signal seam). `skipif` count in tests: 6; `mark.skip` 3 (two are the tier gates).
- **Platform splits in tests:** 5 POSIX-only skips in `test_bootstrap.py` (mode bits/ownership) + `_posix_only` in `test_process.py`; `HostEnv.minimal(windows=...)` and `_which(windows=...)`/`_verify_root(posix=...)` take the platform as a parameter so both branches run on any OS ("the mapping is exercised from a table instead of from a mocked host", `_bootstrap.py:108-109`). This parameter-injection trick is worth porting.
- **CI matrix:** `ci.yml:56-57` `os: [ubuntu-latest, macos-latest, windows-latest]` x `python: ['3.12','3.13','3.14']` -> 9 legs, `fail-fast: false`, all after a Linux `verify` job (`needs: verify`). Runner architectures: ubuntu/windows x64, macos-latest arm64; **no linux-arm64 and no windows-arm64 leg**. Toolchain provisioned by dogfooding (`ocx-sh/setup-ocx` pinned by SHA, version pinned to `TESTED_OCX_VERSION`, drift guarded by `test_version_matches_the_tested_pin`). Other jobs: `contract`, `repo-checks` (actionlint, lychee, gitleaks), site build + Lighthouse (100x4) separate workflows. Actions all SHA-pinned with version comments; workflow `permissions: contents: read`; release job elevates per job. Total workflow YAML 347 lines: `wc -l .github/workflows/*.yml`.
- **Quality gate:** `task verify` = format check -> ruff lint -> pyright (strict for `src`, standard for tests, `pyproject.toml:73-77`) -> pytest under coverage -> `coverage report` (`taskfile.yml:11-18`). Ruff rule set `E,W,F,I,B,UP,ANN,RUF,D` with Google docstrings; `ANN`/`D` waived for tests.
- **Release:** tag `v*` -> check tag == `pyproject.toml` version -> `task verify` -> `uv build` -> upload wheel+sdist to GitHub Release -> PyPI Trusted Publishing via OIDC, no stored token (`release.yml:14-73`). Changelog generated by git-cliff from Conventional Commits, never hand-edited (`CLAUDE.md` Distribution). No explicit signing/SBOM step in the workflow (PyPI attestations are whatever the pinned publish action does by default; not verified here).

## 8. One C#-relevant measurement taken here (fixture `fixtures/python-sdk-digest/`)

`run.sh dotnet run -c Release` (SDK 10.0.401, net10.0, Linux x64) -> exact output:

```
SIGKILL child ExitCode = 137
SIGTERM child ExitCode = 143
exit 75 child ExitCode = 75
grandchild 3360442 alive after Kill(entireProcessTree:true) = False
Console.OutputEncoding=utf-8; ProcessStartInfo default StandardOutputEncoding = null (...)
```

Meaning: (a) .NET on Unix folds signals into `128+n` (Python gives `-n`) - an `ExitCode` enum mapper must treat 137/143 as "unknown, not ocx-assigned"; (b) `Process.Kill(entireProcessTree: true)` reaped a backgrounded grandchild on Linux without any `setsid`/P/Invoke, which covers what Python needs `start_new_session` + `killpg` for, but it has **no graceful SIGTERM phase**; (c) `StandardOutputEncoding` is null by default - set it explicitly. Not measured (no Windows host in this run): Windows default encoding and whether tree-kill reaps grandchildren there.

## 9. The repo's own CLAUDE.md and rules: normative statements

Sizes: `CLAUDE.md` 141 lines; `.claude/rules/*.md` 13 files / 1,691 lines (`wc -l`), of which `docs-quality.md` + `docs-quality/` are language-neutral docs rules (80 files / 6,539 lines under `.claude/rules` in total, `git ls-files .claude/rules | xargs wc -l`). Quoted verbatim below; `...` marks elisions inside one statement.

### 9.1 CLAUDE.md

- (`:3`) "Guide for Claude Code when working in this repo."
- "`ocx-sdk` ... is a CLI wrapper, not a reimplementation."
- "Anything reachable through an underscored module path is package-private — the only guaranteed import path is the curated re-export list in `src/ocx_sdk/__init__.py`."
- Exception hierarchy "Exit-code-mapped errors, every `__str__` names an actionable next step".
- "`task verify` | Full quality gate — run before commit".
- "`CHANGELOG.md` is git-cliff-generated (`cliff.toml`) — never edit it by hand."
- "Never edit `site/src/content/docs/`: it is generated and ignored."
- "## Stability — Pre-1.0. Breaking changes ship without migration shims. No deprecation warnings, no compatibility layers."
- Core principles: "1. **Understand first** — read before write, grep before create. 2. **Prove it works** — failing test before fix; `task verify` green before commit. 3. **Keep it safe** — no secrets in code; validate external input at boundaries. 4. **Keep it simple** — small functions, single responsibility, delete dead code. 5. **Don't repeat yourself** — extract only when duplication is real, not incidental. 6. **Ship it** — work on branches, never push to main without review. 7. **Leave a trail** — name things so the next person understands. 8. **Learn and adapt** — turn recurring feedback into rule updates."
- Rule catalog is a flat list pointing at the 9 rule files; the repo-name rationale: "Repo name carries the language (`ocx-sdk-python`) so `ocx-sdk-rust` / `ocx-sdk-go` can sit beside it."

### 9.2 `.claude/rules/architecture.md` (191 lines; `paths: src/**, tests/**, pyproject.toml`)

All normative bullets, verbatim, by section:

Positioning (`:13-31`)
- "**CLI wrapper, never reimplementation.** ocx owns resolution, verification, identifier grammar. **Exactly two bounded, contract-tested exceptions** (goal 4 carve-outs): the `[env]` merge algorithm (guarded by the printenv contract diff) and `registry_slug` canonicalization (guarded by CLI fixtures; mismatch **fails closed**, never silent-anonymous). No third carve-out without a design-doc amendment."
- "**Carry, don't parse**: identifiers (`PackageRef`), digests, pin forms carried verbatim from ocx JSON. `str(PackageRef)` round-trips byte-for-byte (tested)."
- "**Never write ocx-owned files** (`ocx.toml`, `ocx.lock`, `config.toml`). Read via tomllib + published schemas."
- "`OCX_ENV`, `OCX_PATCHES`, `OCX_BINARY_PIN`: opaque pass-through. Never parse, rewrite, or synthesize."

Dependencies / layering (`:32-60`)
- "**Zero runtime dependencies.** `dependencies = []`, stdlib only. Enforced by metadata test + import-walk test. New runtime dep = design change, only ever as an extra."
- "ALL subprocess code in `_process.py`; it receives **primitives only** (argv, finished env mapping, timeout, policy, on_log) — never an `OcxConfig`."
- "ALL spawn-env assembly AND secret redaction in `_env.build_spawn_env()` — the single choke point. No other module composes child env or touches secret values."
- "ALL JSON decode in `_results.py`."
- "`_errors.py` is the one leaf: stdlib-only, and it must never import `_types`/`_config` (`OcxProcessError.retryable` stays policy-independent: fixed True for 75)."
- "`_bootstrap`/`_dist` never import runtime modules (`_process`, `_env`, `_client`)."
- "Presentation (`--format json --color never`) pinned on typed methods only — recorded exception: `version()` reads the plain stable contract. Raw `invoke`/`spawn` paths leave presentation to the caller."

Bootstrap security, "(non-negotiable)" (`:61-78`)
- "sha256 from the manifest is the artifact trust boundary; checksum mismatch is never retried. Manifest `sha256=` is **required (fail closed)** when the host is not canonical `setup.ocx.sh` or `mirror_url` is set."
- "Manifest fields consumed into paths/URLs are regex-validated (`..`/separators/backslash/CRLF rejected). Reads are size-capped."
- "**Never `extractall`** — stream the single expected member to a temp fd after hash verification."
- "Cache: root refused if symlinked, foreign-uid, or group/other-writable; dirs `0o700`; `mkstemp` in the final dir → write → hash from fd → `fchmod 0o700` → `os.replace`. Cache hits re-hash (opt-out `trust_cache=True`)."
- "Bootstrap auth bound to (scheme, host, port): `add_unredirected_header`, https-only redirect handler with hop cap, userinfo URLs rejected."
- "No machine mutation: never `self setup`, profiles, or PATH."

API conventions (`:79-112`)
- "**Command alignment**: one ocx command = one method, named after the command ... Command groups = stateless namespace `@property` wrappers ... Raw escape hatch is `invoke`/`invoke_async` — command names are reserved."
- "**Full flag fidelity** scoped to **stable, resolution-affecting flags** (experimental surfaces like `--ci=gitlab` excluded): repeatable flags → collections, `NAME...` → `*names`/sequences. No capability-dropping subsets."
- "One rich frozen result struct per command; unknown JSON keys ignored; hand-written `from_dict`, no serialization frameworks."
- "Enums only where runtime iterates/maps values; `Literal` aliases for argv-only sets; open sets stay `str`. Single obvious arg positional, rest keyword-only."
- "All dataclasses `frozen=True, slots=True` unless a stated reason."
- "Async: `_async` suffix on execution verbs only; `spawn`/`spawn_async` return stdlib `Popen`/`asyncio.subprocess.Process`. `spawn` kwargs are filtered: `args`/`shell`/`executable`/`env` rejected; `shell=False` invariant."
- "Argv safety: positional identifiers starting with `-` rejected on every typed positional group; `--` emitted before child-argv groups (`exec`, `package exec`) ..."
- "Errors: exit code → exception subclass; never classify by stderr text. Every `OcxError.__str__` carries an actionable next step."
- "`py.typed` ships in the wheel."

State and concurrency (`:113-131`)
- "**No state caching.** Handles frozen and cache-free; the only snapshot is the exe realpath at construction (discovery runs in a factory, never in `__init__` — `with_config` derivation must never re-discover), the only memo the compat gate (benign-race, shared across derived handles)."
- "Per-call env snapshot at spawn; no loop references stored; `on_log` may fire from concurrent pump threads (rejected on async paths in v0.1)."
- "`ComposedEnv.activate()` is process-global, single-owner, diff-based revert ... Concurrent code uses `.mapping`."
- "Always neutralize ambient `OCX_PROJECT`/`OCX_GLOBAL`/`OCX_QUIET` on spawn."
- "Always write `OCX_NO_CONSENT` on spawn (`"1"` unless `OcxConfig.consent`) ... consent is config-only, never argv."

Security (`:132-158`)
- "Credentials: env-only per spawn (`OCX_AUTH_<SLUG>_*`), never persisted, never in argv. Secret dataclass fields are `field(repr=False)` with masked `__repr__`. Every secret value is exact-string-redacted from captured stderr, `on_log`, logged argv, and exception *messages* — inside the `build_spawn_env`/`_process` choke path."
- "**`OcxProcessError.stdout` is the one recorded exemption** ... never read by `_summary()` or `__str__`; callers feed it to `_results.partial_report()` and never to a log sink, a `__dict__`-serializing logger, or a pickle crossing into a lower-trust process."
- "Explicit config wins over ambient env (auth per slug; `insecure_registries=()` blocks ambient re-enable — fail-closed)."
- "`OCX_AUTH_*` reaches tools spawned via `exec` (ocx does not scrub — pinned by contract test). Credential-free pattern: pull first, then run through `with_config(auth={})`."
- "Retry: default `retry_on` = `TEMP_FAIL(75)` only. Auth errors (80), checksum mismatches, 401/403/404 never retryable. **Mutating commands ... default `retry=None`** regardless of session config. Never retry `exec`/`spawn` children. `Retry-After` honored up to its own ceiling (`max_retry_after`), never truncated to `max_backoff`."

Testing (`:159-183`)
- "**Python floor 3.12**; unit matrix 3.12/3.13/3.14 × Linux/macOS/Windows; contract tier Linux-first (other OS gated). Pyright checks the floor."
- "**100% unit coverage, use-case-first.** `fail_under = 100`; coverage is the floor, never the goal; a test written solely to color a line is a defect. Exclusions use `# pragma: no cover` with a reason (named platform branches only). **Recorded deviation**: the gate is enforced on the Linux CI legs only."
- "**Contract-first TDD, always**: stub (signatures + `raise NotImplementedError`) → specify (tests that fail on the stub) → implement. Never reversed."
- "**Every bug starts with a regression test** confirmed to FAIL on the unfixed code before the fix. No validated-failing test, no merge."
- "**Mechanism → named-test matrix** (design doc §14): every design mechanism has a named test row; a mechanism without one fails review."
- "Timing code takes an injectable sleep/clock seam — no `time.sleep` in unit tests (repo rule)."
- "**Every doc code snippet is tested**: doctest for docstrings; Sybil for markdown fences (README included) with four markers — default (unit) / `contract` (pinned binary) / `acceptance` (compose stack) / `no-run` + reason (compile-check only). Unmarked-unrunnable fails CI."

Compatibility (`:184-191`)
- "Tested window, not promised range: `TESTED_OCX_VERSION` (CI pin — not a selection default) + `MIN_SUPPORTED`; latest-ocx canary. Compat gate raises below MIN, DEBUG-notes above the window (never warns). `ensure()` default = latest stable from live dist.json."

### 9.3 Other rules (normative lines only; full text in the files)

- `quality-core.md` (169 lines, language-neutral): severity tiers Block/Warn/Suggest; universal Block: "Hardcoded secrets or credentials", "Unvalidated external input at system boundaries", "Catching/swallowing errors silently (no log, no re-raise)", "God objects/modules with 15+ fields/methods spanning unrelated concerns"; Warn: "Boolean parameters where enum/literal type clearer", "Stringly-typed APIs ...", "Missing error context"; YAGNI "Don't over-engineer error types. Callers distinguish 2 cases? Don't create 20 variants/subclasses", "No feature flags or compatibility shims when you can just change the code"; "Two Hats Rule: Never mix refactoring and optimization in same session."
- `quality-python.md` (113 lines, `paths: **/*.py`): Block - bare/unnamed `except`, `assert` for input validation, mutable defaults, wildcard imports, "`dict[str, Any]` or untyped `TypedDict` at public API boundaries", dropped exception chaining (`raise ... from e`), "`asyncio.gather(*tasks)` for new async code" (use `TaskGroup`), `yield` inside `TaskGroup`/`timeout` (PEP 789), missing annotations on public functions; Warn - `dataclass` without `slots=True`, ABC where Protocol works, "`**kwargs` 'for future flexibility'", legacy generics; async: "never swallow `asyncio.CancelledError` — always re-raise after cleanup", "`async with asyncio.timeout(…)` over `asyncio.wait_for`"; tooling stack uv + ruff + pyright.
- `quality-tests.md` (302 lines, `paths: tests/**`): FIRST/Right-BICEP/CORRECT; "`test_<unit>_<scenario>_<expected>`"; "**Never** bare `pytest.raises(Exc)` — assert the message too"; "Explicit ids are **mandatory**" for parametrize; "Never mock the SUT's own methods. Mock at the I/O boundary only"; "You own the interface? **Write a fake**, not a mock chain"; "Inject a clock, never mock `datetime.now`"; Forbidden in unit tests: `time.sleep`/`asyncio.sleep`, real network, real disk outside `tmp_path`, shared mutable state, bare `pytest.raises`, placeholder asserts. Block tier: real network in unit test; `time.sleep`; bare `pytest.raises`; asserting on private implementation details.
- `quality-security.md` (63 lines, `paths: .github/workflows/**`): generic OWASP/CWE checklist ("Never expose actual secrets in analysis output"); thin and not SDK-specific.
- `subsystem-ci.md` (126 lines): "Every check dev runs locally MUST be a Taskfile task. CI calls `task`, never raw commands"; "**SHA-pin every action**"; "**Minimal permissions** — declare at workflow level, elevate per-job"; "**OIDC for cloud auth** — not static credentials"; "**No self-hosted runners**"; concurrency block on every workflow `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`; "Linux default; gate macOS/Windows behind Linux passing"; anti-pattern `pull_request_target` + checkout of PR head.
- `subsystem-taskfiles.md` (63): "**`verify` is the contract.** `task verify` is the gate that must pass before commit (format check → lint → types → tests)."
- `workflow-git.md` (84): "Never commit on `main`"; "Never push. Push triggers CI, real cost. Human decides when push"; "Never `--no-verify`, `--no-gpg-sign`"; "Never `Co-Authored-By` in commit messages. OCX convention."; Conventional Commits (`chore:` for AI/tooling files); `Checkpoint` rolling WIP commit.
- `workflow-intent.md` (37), `workflow-feature.md` (64), `workflow-bugfix.md` (142), `workflow-refactor.md` (132): work-type router; bugfix "Test MUST fail on current code (prove bug exist)"; "Fix without RCA: 'It works now' not a fix"; refactor "Never mix refactor + behavior change in same session"; plans carry a `## Status` block.
- `docs-quality.md` + `docs-quality/` (205 + checks): language-neutral (installed by grim); out of scope here.

## 10. Smells, mistakes and known gaps (each with evidence)

| # | Smell | Evidence | Which side wins in practice |
|---|---|---|---|
| S1 | Comments claim a signal-killed ocx "exits with ... 137"; real Popen returns `-9` | `_process.py:827`, `_results.py:547`; `python3 -c ...returncode` -> `-9`; the "137" tests feed a synthetic code (`test_process.py:364,383`; `test_errors.py:165-172`) | Code wins: `ExitCode(-9)` raises `ValueError`, falls to plain `OcxProcessError(-9)`. On .NET the number really is 137 (section 8), so the port must not copy the unit-test inputs as if they were Python's reality |
| S2 | Exit-code -> exception mapping applies to the **hosted child's** exit code too: any `exec`/`invoke` goes through the same `_exit_error` | Measured: `printf '#!/bin/sh\nexit 80\n' > fakeocx; Ocx(exe=fakeocx).invoke(['anything'])` -> `AuthError ... exited 80. Set OCX_AUTH_...`. `Project.exec` passes the child's code through `finish(... check=check)` (`_client.py:1308`). A build tool exiting 80 reads as an auth failure with an auth hint | Code wins; only `docs/guide/projects.md:99` mentions "non-zero child exit", no collision warning. Port should type child failures separately (e.g. `ChildExitException` with raw code) |
| S3 | `OcxError` is documented as "Base class for every error raised by ocx-sdk" but the SDK raises builtins in 36 places: `raise ValueError` x36 (`_client` 18, `_results` 8, `_types` 3, `_envmodel` 3, `_process` 3, `_config` 1) and `TypeError` x2. **JSON-skew failures (`_need`, `_decode`, `_shaped`) are `ValueError`**, so `except OcxError` misses exactly the version-skew case the compat window is meant to explain | `/usr/bin/grep -c "raise ValueError" src/ocx_sdk/*.py`; `_results.py:167-179,215-221`; `_errors.py:66-74` | Code wins. In C# give parse/skew a first-class exception under the SDK base type |
| S4 | Async coverage is thin: 6 of 62 public methods are async (`invoke_async`, `exec_async`, `spawn_async` x3 tiers); typed calls (`lock`, `pull`, `status`, ... 36 of 43 commands) are sync-only, docs say wrap in `asyncio.to_thread` | `ast` count; `docs/guide/async.md` "Know what is async"; `finish_async` has no `input`/`cwd`/`ok_codes` (`_client.py:767-789`) so async typed calls cannot be added without widening it | Code wins. Not a design to copy: .NET needs `Task`-returning everything |
| S5 | Windows is a second-class path: timeout = `TerminateProcess` on the single pid, no tree kill, no graceful phase (grandchildren survive); SIGINT forwarding absent; all of it `pragma: no cover`; contract tier never runs on Windows; `capture=False`+`timeout` called "degraded" | `_process.py:786,794`; `sdk-design.md:623-630`; `ci.yml:81-91` | Docs and code agree; the gap is acknowledged but unmeasured on a real Windows host |
| S6 | No arm64 Linux/Windows test leg despite supporting those targets in `uname_to_triple` and in the live manifest | `ci.yml:56`; section 5 table; section 0 manifest probe | Code supports, CI does not prove |
| S7 | `HostEnv.minimal()` keeps `PATH,HOME,TMPDIR` (+ `SYSTEMROOT,TEMP` on Windows) but not `USERPROFILE`/`LOCALAPPDATA`/`APPDATA`/`PATHEXT`; `discover()`'s home tier reads `HOME` only (`env.get("HOME")`), which is normally unset on Windows, so `%USERPROFILE%\.ocx` is not found unless `OCX_HOME` is set. By reading; not run on Windows | `_types.py:104-107,160-173`; `_bootstrap.py:282-289` | Code wins; likely a latent Windows defect |
| S8 | `_envmodel` documents two Windows deviations from ocx: env keys compare case-sensitively (ocx folds on Windows) and `PATH` split does not strip quotes | `_envmodel.py:25-29` | Acknowledged; port should fix with `StringComparer.OrdinalIgnoreCase` on Windows |
| S9 | Stdin is written before waiting (deadlock if input > pipe buffer and child does not read); capture is unbounded in memory | `_process.py:661-670`, `:224-227` | Both self-documented, acceptable for `--password-stdin` |
| S10 | Docs/code disagreements (code wins in every case): (a) `codecov.yml` "Mirror the local fail_under=80 gate" vs `pyproject.toml` `fail_under = 100`; (b) `_env.py:32` names `HostEnv.current()`, real name `HostEnv.ambient()` (`_types.py:146`); (c) `_config.py:22-25` module docstring says a non-lowercase `auth` key "warns", code raises `ValueError` (`:255-262`); (d) `quality-tests.md` describes `httpx`, `tests/_fakes.py`, `tests/test_<module>.py`, "Python 3.13" - measured: 0 files mention httpx, `tests/_fakes.py` does not exist, tests live in `tests/unit/`, floor is 3.12; (e) `CLAUDE.md` "Not published yet" / "v0.1 walking skeleton" vs `pyproject.toml` 0.2.0 and `git describe` `v0.2.0-23-g80136dd`; (f) `tests/contract/_helpers.py:26` says `Ocx.project` "forwards whatever it was given verbatim" but `_client.py:383-385` resolves directories; (g) `architecture.md:153-155` lists `publish` among mutating commands (no such method) and omits `claim`, `cascade_repair`, `clean` that the code does mark mutating; (h) `sdk-design.md:559` stops the exit-code list at 82, code has up to 86; (i) `_dist.py:68` says live manifest ~60 KiB, measured 88,245 bytes | the cited lines | Code wins |
| S11 | The repo's own test rule is violated in the repo's own tests: AST scan of 190 `pytest.raises` calls -> **27 (14.2%) have no `match=`**, 17 of them in `test_process.py`; the rule calls bare `pytest.raises` Block tier | `python3 ast` over `tests/**/*.py`: `raises 190 nomatch 27` | Code wins; rule is aspirational |
| S12 | The "100% coverage" claim depends on 10 `pragma: no cover` exclusions that remove the exact platform branches (Windows kill path) where bugs are likeliest | `/usr/bin/grep -rn "pragma: no cover" src` -> 10 | Gate holds; assurance on Windows is weaker than the badge suggests |
| S13 | Compat window is a single version (MIN == TESTED == 0.6.2) while the live default is 0.6.5; comparison drops prerelease tails and uses tuple-of-int compare (`0.6` vs `0.6.0` differ in length) | `_types.py:30-33`; `_client.py:845-857`; manifest probe | Design choice, noted |
| S14 | Bootstrap trust ends at TLS-to-`setup.ocx.sh` + sha256 from the same origin: no signature check | `architecture.md:63-65`; `sdk-design.md:952-957` | Known, tracked upstream |
| S15 | God-module: `_client.py` is 3,741 lines and 32% of src; `PackageCommands` 28 public methods | section 1 | Violates the repo's own Block-tier rule |
| S16 | Dead-end ergonomics: `OcxProcessError` pickling support (`__reduce__`/`_rebuild`) exists so errors cross `ProcessPoolExecutor`/xdist (`_errors.py:54-86`); `HostEnv`/`PackageRef` are explicitly *not* picklable (`_types.py:122-124`) | | Inconsistent but harmless |

## 11. Portability table: Python decision -> C# disposition

K = keep as-is (language-neutral), T = translate (target .NET idiom named), D = drop (Python-specific).

| # | Python decision | K/T/D | C# disposition and why |
|---|---|---|---|
| 1 | Wrap the CLI; two bounded carve-outs (env merge, registry slug); carry identifiers verbatim | K | Same positioning; keep the carve-out budget and also count bootstrap as a third |
| 2 | One method per T1 command, tier handles (`Ocx`, `Project`, `package`/`config`/`patch` property namespaces), raw `invoke`/`spawn` escape hatch | T | `OcxClient` + `OcxProject` + `Package`/`Config`/`Patch` property objects; sealed classes, methods `PullAsync` etc. Keep the command-map doc with T1/T2/T3 tiers |
| 3 | Zero runtime dependencies, enforced by metadata + import-walk tests | T | BCL only on net8+ (`System.Text.Json`, `Process`, `HttpClient`, `System.Formats.Tar`). Enforce with a test over the `.nuspec`/deps.json. Targeting netstandard2.0 would add `System.Text.Json` + polyfill packages and lose `System.Formats.Tar`, `File.SetUnixFileMode`, `TimeProvider`: that cost is the data point for the open netstandard2.0 question |
| 4 | Privacy by underscore module + curated `__all__` pinned by a test | T | `internal` by default; public API baseline via PublicApiAnalyzers `PublicAPI.Shipped.txt` (replaces `_EXPECTED` test). Pre-1.0 "no shims" can stay |
| 5 | Frozen slotted dataclass per result; `Mapping` views read-only | T | `sealed record` with `init`/`required` members; `IReadOnlyDictionary`/`ImmutableArray`; open sub-objects as `JsonElement`/`JsonObject` (keep "do not model what ocx keeps open") |
| 6 | Hand-written `from_dict` per type, unknown keys ignored, required vs optional from the vendored schema | T | `System.Text.Json` source-generated `JsonSerializerContext` (AOT/trim-safe), unmapped members skipped by default, `required`/`[JsonRequired]` for `_need` fields, nullable for `Option<T>`. **Keep** the schema-diff test (phantom/unsafe classification) and the 3-row presence-rule table: it is the part that prevents regressions regardless of binder. STJ also validates scalar types, closing S-gap in section 4 |
| 7 | Parse failure as `ValueError` naming command + "tested against ocx X" | T | Dedicated `OcxParseException : OcxException` carrying command, missing key, tested version, excerpt; wrap `JsonException`. Fixes S3 |
| 8 | Exit code is the category; 15 subclasses; `exit_code` kept as raw `int`; never match stderr | K/T | Same rule. `OcxProcessException` + sealed subclasses keyed by an `ExitCode` enum; `Enum.IsDefined` before mapping (137/143 on .NET, section 8). YAGNI check against the repo's own "don't create 20 variants": 15 are justified only if callers catch them individually; otherwise a single type with `ExitCode` property plus `Retryable` |
| 9 | Hint appended to every message (`_hint`) | K | Port `Message` = summary + hint; hints are language-neutral text |
| 10 | Pickle-safe exceptions (`__reduce__`) | D | No binary serialization in modern .NET; standard exception constructors suffice |
| 11 | `stdout` on the error carries the raw partial report, never in `__str__`; `partial_report`/`error_envelope` recovery | K/T | Property `PartialReportJson`/`ErrorEnvelope` on the exception; `ToString()` must not print it; mark with `[DebuggerBrowsable(Never)]`/override `ToString` (the .NET analogue of the `__repr__` size-only trick) |
| 12 | Report-then-fail commands tolerate a finding code via `ok_codes` + `tolerated_report` | K | Port as per-call accepted-exit-code set; guard against envelope/non-JSON |
| 13 | Child exit code mapped like ocx's own (S2) | D | Do not copy: separate child-exit failure type; ocx codes only for ocx's own failures |
| 14 | `_process` takes primitives only; argv list, `shell=False` | T | internal `ProcessRunner` over `ProcessStartInfo` with `ArgumentList` (never the `Arguments` string; no quoting logic needed), `UseShellExecute=false`; keep `compose_argv` leading-dash guard and `--` rule |
| 15 | Two pump threads draining stdout/stderr; join bounded; daemon threads | T | async: `Task.WhenAll(stdout.ReadToEndAsync(ct), stderr.ReadToEndAsync(ct))` or `BeginOutputReadLine`; never read one stream synchronously then the other. Keep the "abandon a stuck pipe after N seconds" bound (Windows grandchild holds the handle) |
| 16 | UTF-8 decode with replacement, CRLF normalised so sync and async match | T | Set `StandardOutputEncoding`/`StandardErrorEncoding = new UTF8Encoding(false)` explicitly (default is null, section 8); `ReadToEnd` does not normalise `\r\n`, so normalise once at the boundary. Windows default not measured |
| 17 | Timeout: per attempt; SIGTERM group -> 5 s grace -> SIGKILL group; own session | T | `CancellationTokenSource.CancelAfter` per attempt; on cancel `Process.Kill(entireProcessTree: true)` (measured to reap a grandchild on Linux). Graceful phase needs P/Invoke `kill(-pgid, SIGTERM)` + `setsid`; decide whether ocx needs a graceful phase (ask upstream) before paying for interop. Timeout vs caller-cancel must be distinguishable (`OcxTimeoutException` vs `OperationCanceledException`) |
| 18 | Async cancel kills the child before propagating (gh-88050 workaround), no awaits in the handler | T | `ct.Register(() => Kill(...))` registered before `WaitForExitAsync(ct)`; the Python bug itself is D (not applicable), the invariant "cancellation never orphans the child" is K |
| 19 | Sync + async twins only for exec verbs | D | Async-first: every command returns `Task<T>` with `CancellationToken` (S4 shows the Python gap). Sync wrappers optional and last |
| 20 | `on_log` rejected on async paths | D | Async streaming is natural in .NET: offer `Action<string>`/`IProgress<string>` or `IAsyncEnumerable<string>` for stderr lines; redact before invoking |
| 21 | Tri-state `UNSET`/`None`/value for per-call `timeout`/`retry` | T | `CallOptions?` record (null = session defaults) with `TimeSpan? Timeout`/`RetryPolicy? Retry` and an explicit `RetryPolicy.None`; `Timeout.InfiniteTimeSpan` for "wait forever" |
| 22 | `with_config(**overrides)` derives a new frozen handle sharing binary, env, memo | T | `with` expression on a sealed `OcxConfig` record + `client.WithConfig(c => c with {...})`; keep "derivation never re-discovers the binary" |
| 23 | `RetryPolicy`: capped exp backoff, full jitter, Retry-After ceiling, exit-code classifier, per-call override, mutating commands default off, never retry child exec | K/T | Port semantics 1:1 as ~60 LOC hand-rolled; clock seam = `TimeProvider` (net8+) instead of injectable `sleep`; `Random.Shared`. Resist Polly to honour zero-dep. Keep the 10-item mutating list from code (not the architecture doc) |
| 24 | Env choke point `build_spawn_env`: neutralize ambient `OCX_PROJECT/GLOBAL/QUIET/NO_VERIFY/NO_HOOK/NO_COMPLETIONS`, always write `OCX_NO_CONSENT`/`OCX_NO_UPDATE_CHECK`/`OCX_SIGSTORE_TRUSTED_ROOT`, explicit config beats ambient, per-slug auth triples | K | Language-neutral security design; implement via `psi.Environment` (case-insensitive on Windows, case-sensitive on Unix - mirror Python's "match on `key.upper()`" rule D14 with `OrdinalIgnoreCase` comparison everywhere) |
| 25 | Exact-string redaction of every secret in stderr, `on_log`, argv logs, exception text; also base64(user:pass); stdout never redacted | K | Port verbatim incl. longest-first ordering and the "forge token" set; add a secrecy test that scans every error surface except the one declared exemption |
| 26 | Masked `__repr__` on secret types and on `Completed`/`CommandResult`/`HostEnv`/`ComposedEnv` | T | Override `ToString()` on records holding secrets or captured streams (records auto-generate `PrintMembers`: must override or `[Redacted]` fields) and use `[DebuggerDisplay]`; this is easy to get wrong with `record` |
| 27 | `registry_slug` = every non-alphanumeric to `_`, case preserved, fail closed on empty/colliding slug; `OcxConfig` rejects mixed-case auth keys | K | Pure function; reuse `slug_fixtures.json` unchanged as a test corpus |
| 28 | `[env]` merge (const replace, path move-to-front, list append-unique, separator reconcile) | K/T | Pure static functions over `IReadOnlyDictionary`; fix S8 (case-insensitive keys and quote stripping on Windows); reuse the printenv contract diff idea |
| 29 | `ComposedEnv.activate()` process-global context manager | D | Drop in v0.1: `Environment.SetEnvironmentVariable` is process-global and the Python design needed a bespoke ownership lock to be honest. Expose only `.Mapping` |
| 30 | Compat gate: once per handle family, probe `ocx version`, raise below MIN, DEBUG note above TESTED, benign race | T | `Lazy<Task>`/`SemaphoreSlim` single-flight in the shared runner (async-correct, not a benign race); keep window constants and the nightly canary. Use `System.Version`/own parse for prerelease tails |
| 31 | Discovery order: `exe=` -> `OCX_SDK_EXE` -> PATH (skip cwd on Windows, skip group-writable dirs on POSIX) -> `$OCX_HOME` symlink | T | Same order; honour `PATHEXT` on Windows; read `USERPROFILE` as well as `HOME` (S7); resolve to full path once and pin it |
| 32 | Platform triple table incl. musl default and Rosetta redirect | T | Map `RuntimeInformation.OSArchitecture` (not `ProcessArchitecture`) + `OperatingSystem.Is*`; same 8 targets; musl default; Rosetta check via `sysctlbyname` P/Invoke (or skip: `OSArchitecture` already reports the hardware). Keep the pure `(os, arch, libc) -> triple` function so it is table-tested on every host |
| 33 | Manifest hardening: https only, size caps (1 MiB / 256 MiB), regex-validated fields, caller-URL-derived pin, pin required off-canonical host or with mirror | K | Keep every rule; implement over `HttpClient` + `SocketsHttpHandler { AllowAutoRedirect = false }` with a manual bounded redirect loop that refuses non-https and strips credentials (verify .NET default redirect auth-stripping rather than assume). `SHA256.HashData(Stream)` |
| 34 | Origin-bound credentials via `add_unredirected_header` | T | Attach `Authorization` per request only when origin matches; with manual redirects this is explicit |
| 35 | Unpack exactly one regular-file member after hash verify; refuse links/traversal/duplicates; cap unpacked bytes | T | `System.Formats.Tar` (net7+) / `ZipArchive`, stream the single entry to a temp file; same refusals. Needs net7+ |
| 36 | Cache: per-user dir, root checks (symlink/uid/mode), `0o700`, `mkstemp` -> hash -> `fchmod` -> `os.replace`, sidecar digest, re-hash on hit | T | `Path.GetTempFileName` is not safe; use `File.Create` in the destination dir with `FileMode.CreateNew`, `File.SetUnixFileMode` (net7+), `File.Move(..., overwrite: true)`. Cache path: port the three-branch logic by hand; `Environment.SpecialFolder.LocalApplicationData` is `~/.local/share` on Linux, **not** the cache dir. Windows ACL checks are not equivalent to mode bits (Python skips them) |
| 37 | Logging via stdlib `logging` loggers `ocx_sdk`, `ocx_sdk.process` | T | Zero-dep choice: `System.Diagnostics.ActivitySource`/`EventSource`/callback vs `Microsoft.Extensions.Logging.Abstractions` (tiny but a dependency). Decision needed, not copied |
| 38 | `PackageRef` carried verbatim, equality by identifier only | T | `readonly record struct PackageRef(string Identifier)` with custom `Equals` ignoring metadata, `ToString() => Identifier`, implicit from string |
| 39 | Leading-dash positional guard + `--` before child argv | K | Keep in the argv composer; unit-table test |
| 40 | Test tiers: unit w/ seams, contract vs pinned binary (gated by env var), acceptance vs registry containers, nightly canary vs latest, schema-drift test | K | Same tiers; xUnit traits + env-var skip. Provide a **fake-ocx test helper** (small cross-RID console app) because the Python SDK had none and relied on `sys.executable` (cross-OS child needed on Windows) |
| 41 | 100% line+branch gate on Linux legs only, `pragma: no cover` with reason for platform branches | T | coverlet + `[ExcludeFromCodeCoverage(Justification = "...")]`; reconsider whether a numeric 100% gate is wanted given S12 |
| 42 | Doc snippets are tests (Sybil, four markers) | T | Compile docs snippets in a docs test project (or extract with MarkdownSnippets); keep the four-way run/contract/acceptance/no-run classification |
| 43 | CI matrix 3 OS x 3 Python, Linux gate first, SHA-pinned actions, least privilege | T | 3 OS x {net8.0, net10.0} **plus** `ubuntu-24.04-arm` and `windows-11-arm` runners to prove arm64 (S6); keep SHA pins and `permissions: contents: read` |
| 44 | Release: tag == version check, verify, build, Trusted Publishing (OIDC), git-cliff changelog | T | Same flow to nuget.org (trusted publishing via OIDC where available - verify), plus SourceLink/deterministic build; versioning via tag (MinVer/GitVersion) rather than hand-bumped file; keep git-cliff |
| 45 | `py.typed`, pyright strict on `src`, ruff `ANN`/`D` | T | `<Nullable>enable`, `TreatWarningsAsErrors`, `GenerateDocumentationFile` + CS1591 as error for public API, analyzers in build |
| 46 | Docstrings = 44.9% of src; Google `Args/Returns/Raises` | T | XML doc comments (`<param>`, `<returns>`, `<exception>`); keep the "why and which attack/CWE" depth |
| 47 | Design doc first, mechanism -> named-test matrix, contract-first TDD, every bug starts with a failing test | K | Process rules are language-neutral |
| 48 | `Ocx.__getattr__` pointer for removed names | D | Compile errors replace it; use `[Obsolete(error: true)]` shims only if a renamed command needs a pointer |
| 49 | SIGINT forwarding to a separate-session child | D/T | .NET does not start children in a new session by default, so a terminal Ctrl-C already reaches the child; verify before building anything |
| 50 | `ocx-sdk-<lang>` repo naming so siblings sit beside it | K | Use `ocx-sdk-dotnet` or `-csharp` consistent with fleet naming |

## 12. Patterns most worth encoding for agents writing the C# SDK

1. **Single choke points**: all subprocess code in one internal type that takes primitives; all child-env assembly plus redaction in one function; all JSON decode in one namespace. Each backed by a layering test.
2. **Exit code is the error category; hints on every message; partial-report and error-envelope recovery APIs** (and the `stdout` exemption stated and tested).
3. **Schema-derived presence rules**: pin every result type against ocx's generated `reports.v1.json`; classify phantom/unsafe/lossy; never trust hand-written fixtures for required-vs-optional.
4. **Mutating commands default to no-retry; exec children never retried; per-call override beats session default.**
5. **Fail closed on trust**: off-canonical manifest needs a pin; never extract archives wholesale; origin-bound credentials; cache dir ownership/mode checks.
6. **Injected seams for time, platform and process** (clock, sleep, `windows:` flag, spawn factory) so both platform branches run on any OS.
7. **Tested-window versioning**: tested version != selection default; gate below MIN, debug-note above; nightly canary against latest.
8. **Docs are executable**: every snippet classified run/contract/acceptance/no-run.
9. **Anti-patterns to avoid copying**: child exit codes mapped to ocx categories (S2); builtin exceptions leaking past the SDK base type (S3); sync-only typed calls (S4); god-class `PackageCommands` (S15); unverified Windows/arm64 (S5, S6, S7).
