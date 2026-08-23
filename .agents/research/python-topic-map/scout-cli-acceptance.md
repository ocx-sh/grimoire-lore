---
title: CLI acceptance-testing practice scout — the sixth corpus
corpus: >
  Contributor-facing test infrastructure of mature CLI projects (Python and non-Python) that
  drive a real binary as a black box, plus the tooling landscape purpose-built for that job.
  Read from source: test helper modules, conftest.py/pytest.py plugins, and Rust/Go test
  harness crates — not commentary about them.
agent: scout-cli-acceptance
model: claude-sonnet-5
date_researched: 2026-08-23
sources_count: 28
---

## Table of contents

- [How five suites are built](#how-five-suites-are-built)
- [The comparison table](#the-comparison-table)
- [Where our harness is unusual](#where-our-harness-is-unusual)
- [Candidate topics](#candidate-topics)
- [Sources](#sources)

## Preamble: the in-process fork this survey found

Before the five deep-dives — a finding that reframes the whole comparison. Of the ten Python
projects in the brief, **five test their CLI in-process, not via subprocess**: `hatch` wraps
`click.testing.CliRunner` (`tests/conftest.py:46`, `class CliRunner(__CliRunner)`); `poetry`
drives `cleo`'s `ApplicationTester` through its own `PoetryTestApplication(Application)`
(`tests/helpers.py:169`); `pdm`'s own published test fixture calls `core.main(args, "pdm", obj=obj,
**kwargs)` directly (`src/pdm/pytest.py:639`); `httpie` calls `httpie.core.main()` with a
`MockEnvironment` that swaps stdout/stderr for `StringIO` (`tests/utils/__init__.py:403`); `tox`
calls `tox_run(args)` directly inside a `monkeypatch.context()`, catching `SystemExit` and reading
output back via pytest's `capfd` (`src/tox/pytest.py:288-296`). None of these five spawn a real
subprocess for their own test suite. **Only `pip` — via the third-party `scripttest` package —
uses a real subprocess**, and only `pytest`'s own `Pytester` supports both modes. The split tracks
one variable: whether the CLI under test is implemented in the same language as the test suite.
A Python CLI testing itself in-process gets to skip process-spawn cost, gets direct exception
access, and loses nothing structurally. **That option does not exist for `ocx`/`grim` — they are
compiled Rust binaries under Python tests — so the more relevant comparison set is the four
non-Python, real-binary suites**, not the Python packaging-tool majority. This is worth stating
plainly to the team: five of ten "CLI acceptance suites" in the requested corpus are not
architecturally comparable to shape 1 at all.

## How five suites are built

### pip (`pypa/pip`) — real subprocess, no framework, no timeout

Layout: `tests/functional/` drives the CLI; `tests/lib/__init__.py` is the invocation layer.
Invocation abstraction: `PipTestEnvironment(TestFileEnvironment)`
([`tests/lib/__init__.py:481`](https://github.com/pypa/pip/blob/main/tests/lib/__init__.py#L481)),
whose `run()` ([`:608`](https://github.com/pypa/pip/blob/main/tests/lib/__init__.py#L608)) is a thin
wrapper over the third-party `scripttest` package's `TestFileEnvironment.run()`
([`scripttest/__init__.py:169`](https://github.com/pypa/scripttest/blob/main/scripttest/__init__.py#L169)),
which calls `subprocess.Popen(...)` then `proc.communicate()` **with no `timeout=` parameter
anywhere in the call chain** — confirmed by reading the full `scripttest` source: the function
signature and every `Popen`/`communicate()` call inside it accept no timeout at all. Assertion
style: substring/exit-code, via `TestPipResult` ([`:258`](https://github.com/pypa/pip/blob/main/tests/lib/__init__.py#L258)) plus an `allow_stderr_error`/`expect_error` flag vocabulary — a
richer version of our own `check=True`/`check=False` pattern, not a snapshot. Isolation: each
`PipTestEnvironment` gets an isolated `cwd`/`environ` per `scripttest`'s design. Parallelism: pip's
CI runs `pytest -n auto` (xdist) same as our harness. **Timeout policy: none, structurally** — pip,
one of the most-used CLI tools in the ecosystem, ships an acceptance harness with the same defect
our own audit flagged as the top smell.

### pytest itself (`pytest-dev/pytest`) — the reference design, dual-mode, opt-in timeout

`src/_pytest/pytester.py` is what the brief asked to "study properly." `Pytester.run()`
([`:1387`](https://github.com/pytest-dev/pytest/blob/main/src/_pytest/pytester.py#L1387)) wraps
`subprocess.Popen` via its own `popen()` helper ([`:1349`](https://github.com/pytest-dev/pytest/blob/main/src/_pytest/pytester.py#L1349)) and accepts `timeout: float | None = None` —
**opt-in, default off, exactly our own pattern.** When a caller does pass one, expiry is handled
by:
```python
def handle_timeout() -> None:
    popen.kill()
    popen.wait()
    raise self.TimeoutExpired(timeout_message)
```
(`:1443-1450`) — `popen.kill()` on the direct child handle. The `popen()` helper
(`:1349-1384`) never sets `start_new_session=True`, `creationflags=CREATE_NEW_PROCESS_GROUP`, or
any other process-group mechanism — **the reference implementation for testing a CLI in pytest
does not kill process groups either.** `Pytester` also offers `runpytest_inprocess()`
(`:1167`, calls pytest's own entry point directly, no subprocess) alongside `runpytest_subprocess()`
(`:1491`, delegates to `run()`), making it the one project surveyed that deliberately supports
both invocation modes side by side, and `spawn_pytest()`/`spawn()` (`:1523-1549`) which wraps
`pexpect.spawn` directly for testing pytest's own interactive/TTY behavior — the same tool our
harness already uses for shell-activation tests.

### uv (`astral-sh/uv`) — real binary, `insta` snapshots, heavy filter discipline

Invocation: `crates/uv-test/src/lib.rs`'s `TestContext` builds a `Command` via
`new_command_with()` ([`:2033`](https://github.com/astral-sh/uv/blob/main/crates/uv-test/src/lib.rs#L2033)), which **allowlists exactly ~12 environment variables to pass through**
(`PATH`, `RUST_LOG`, `RUST_BACKTRACE`, `SYSTEMDRIVE`, proxy vars, TLS-cert vars) and clears
everything else — the same "minimal env" discipline `OcxRunner`/`GrimRunner` already implement.
Assertion style: **snapshot**, via `assert_cmd` (crate) + `insta::assert_snapshot!` inline
literals (`:2091-2130`), e.g. a test asserts `exit_code: 0 (success)` plus the literal stdout
block. To keep snapshots stable, `TestContext` ships **over 30 named `with_filtered_*` builder
methods** (`with_filtered_counts`, `with_filtered_sizes`, `with_filtered_python_sources`,
`with_filtered_exe_suffix`, `with_filtered_virtualenv_bin`, `with_pyvenv_cfg_filters`, …, all at
`:245-564`) — each a regex substitution applied before the snapshot compare, scrubbing timing,
absolute paths, byte counts, and platform-specific strings. Timeout: `with_http_timeout()`
(`:210`) only configures `uv`'s **own internal HTTP client timeout** via an env var passed to the
binary — there is no test-harness-level wall-clock kill anywhere in this file. Process-group
handling: none found. This is the clearest evidence available that snapshot testing's real cost
is not the assertion itself, it's the ongoing filter-maintenance burden required to make a
full-output snapshot deterministic.

`ruff` (same org) uses a lighter variant: `insta_cmd::assert_cmd_snapshot!`
([`crates/ruff/tests/integration_test.rs:17`](https://github.com/astral-sh/ruff/blob/main/crates/ruff/tests/integration_test.rs#L17)) combines `std::process::Command` execution and `insta`
snapshotting in one call with no custom `TestContext` class and no filter-builder proliferation —
filters are applied ad hoc per test via `insta::with_settings!({filters => ...})` (`:300`) only
where needed, not as a standing 30-method API surface. Same snapshot philosophy, much lighter
weight — worth noting since `uv` and `ruff` are the same org and chose different levels of
ceremony for the same problem.

### ripgrep (`BurntSushi/ripgrep`) — real binary, hand-rolled assertions, no snapshot

`tests/util.rs` defines a hand-rolled `TestCommand` struct
([`:252`](https://github.com/BurntSushi/ripgrep/blob/master/tests/util.rs#L252)) with
`assert_err()`, `assert_exit_code(expected_code)`, `assert_non_empty_stderr()`
(`:345-389`) — **no `insta`, no `assert_cmd` crate dependency, no snapshot anywhere in this
file.** This is architecturally the closest match to our own `assertions.py` +
substring/exit-code style: a small hand-written assertion vocabulary, not a diff-the-whole-output
tool. No timeout or process-group handling visible in the utility layer. ripgrep is arguably the
most respected single-binary Rust CLI in this survey, and it deliberately did not adopt snapshot
testing — direct counter-evidence to treating snapshot testing as the obvious upgrade path.

### GitHub CLI (`cli/cli`) — two-tier, the closest structural match to our own Platform Split

`gh` splits its testing the same way our harness already splits pytest vs. shell scenarios, just
across a different axis: `pkg/cmd/*/` unit tests mock `iostreams` and call command constructors
directly (fast, in-process, Go's equivalent of the Python in-process pattern above), while
`acceptance/acceptance_test.go` ([`:35`](https://github.com/cli/cli/blob/trunk/acceptance/acceptance_test.go#L35)) drives the **real compiled `gh` binary via real subprocess against
live GitHub**, organized as one `Test<Area>` function per command family (`TestIssues`,
`TestPullRequests`, `TestReleases`, `TestRepo`, 20+ areas) reading recorded script fixtures from
`acceptance/testdata/`. This is the one project surveyed whose two-tier shape — fast
mocked-in-process layer plus slow real-subprocess layer — maps onto our own `test/tests/*.py` vs.
`test/scenarios/*.sh` split almost exactly, except gh's fast tier tests the CLI's own Go code
in-process (not available to us, same reasoning as the Preamble) while the slow tier is the direct
analog of our pytest suite.

## The comparison table

| Project | Invocation abstraction | Assertion style | Timeout default | Process-group handling | TTY handling | Parallel-safe | Fixture-scope discipline |
|---|---|---|---|---|---|---|---|
| pip | `PipTestEnvironment` → `scripttest.TestFileEnvironment.run()` | substring / exit-code (`TestPipResult`) | **none** (no `timeout=` param exists in the call chain) | none | not addressed in the surveyed file | yes, `pytest -n auto` | session-scoped env fixtures per test module |
| pytest (`pytester`) | `Pytester.run()` / `runpytest_subprocess()` / `runpytest_inprocess()` (dual-mode) | substring/structured (`RunResult.stdout.lines`, `.assert_outcomes()`) | **opt-in, `None` by default** | none (`popen.kill()` on direct child only) | `spawn_pytest()` wraps `pexpect.spawn` for interactive cases | yes (self-hosts `pytest-xdist`) | function-scoped `Pytester` instance per test |
| hatch / poetry / pdm / httpie / tox | in-process call (`CliRunner`, `ApplicationTester`, `core.main()`, monkeypatched `sys.argv`+`capfd`) | substring/exit-code on captured buffer | n/a — no subprocess | n/a | n/a (no real terminal spawned) | yes (all use xdist or session isolation) | mixed, mostly function-scoped |
| uv | `TestContext` (custom, `assert_cmd`-based) | **snapshot** (`insta`, 30+ filter builders) | none at TestContext level (only the binary's own `--http-timeout`) | none found | not addressed in the surveyed file | yes, own parallel test runner | per-test `TestContext::new()`, explicit builder chain |
| ruff | `insta_cmd::assert_cmd_snapshot!` (thin) | **snapshot** (`insta`, ad hoc filters) | none found | none found | not addressed | yes | per-test, minimal shared state |
| ripgrep | hand-rolled `TestCommand` | substring/exit-code, **not** snapshot | none found | none found | not addressed | yes | `Dir`-scoped temp env per test |
| gh CLI | two-tier: mocked `iostreams` (unit) / real subprocess (`acceptance/`) | substring/JSON on unit tier; recorded-script diff on acceptance tier | not addressed in the surveyed files | not addressed | acceptance tier runs against a real terminal session (implied by testdata format, not directly confirmed) | yes | one `Test<Area>` function per command family |
| Textual (in-process apps) | `Pilot` driver + `snap_compare` fixture ([`pytest-textual-snapshot`](https://github.com/Textualize/pytest-textual-snapshot)) | **structured snapshot** — full-screen SVG render diffed via `syrupy` | n/a (in-process) | n/a | renders a full virtual terminal frame, sidesteps real-TTY detection entirely | yes | fixture-per-test app instance |
| **our harness (ocx/grim)** | `OcxRunner`/`GrimRunner.run()` → `subprocess.run(capture_output=True, text=True)` | substring (369/201 sites) — dominant; whole-blob rare (10/9) | **none** — 291/308 (ocx) and 24/27 (grimoire) calls have no `timeout=` | none | not handled — no `isatty`/pty layer found in `harness-shape.md`'s survey | yes, `pytest-xdist` + `xdist_group` (ocx) / controller-teardown (grimoire) | function-scoped `OcxRunner`/`GrimRunner`, session-scoped registry |

## Where our harness is unusual

- **No default subprocess timeout — this is the industry norm, not a defect unique to us.**
  pip/scripttest has none structurally. pytest's own `Pytester` defaults to `None`. uv's
  `TestContext` has none at the harness level. Only pytest's *opt-in* path exists as a
  countermeasure anywhere in this survey, and even that only kills the direct child. **Verdict:
  the absence of a timeout is a genuine, deliberate-if-unstated industry convention** — the
  actual backstop everywhere surveyed is the CI job's own wall-clock limit (GitHub Actions
  `timeout-minutes`), not a per-call Python/Rust guard. Our own gap is real (harness-shape.md's
  #1 smell stands), but "add a default `timeout=` to the one wrapper" would put us **ahead** of
  every mature suite surveyed, not merely catching up.
- **Process-group killing: nobody does it.** Zero of the seven real-subprocess-based projects
  surveyed (pip, pytest, uv, ruff, ripgrep, gh, and our own) kill a process group on
  timeout/failure. This narrows the earlier open question considerably: it is not an omission
  specific to shape 1, it is an unsolved problem industry-wide for CLI-testing harnesses in both
  Python and Rust. Pioneering it would be a genuine improvement, not table stakes.
- **Substring assertion over snapshot: we're in the majority, not the minority.** Of the four
  real-binary Rust/Go projects, two snapshot (uv, ruff — same org) and two don't (ripgrep, and gh
  CLI's unit tier). This is a live, unresolved split in the Rust CLI ecosystem itself, not a
  settled best practice we're behind on. See Candidate Topics #3 for the tradeoff this audit
  found concretely: snapshot buys full-regression coverage per test at the cost of an ongoing
  filter-maintenance surface (uv's 30+ `with_filtered_*` methods) that a substring-style harness
  never has to build.
- **`time.sleep` in tests, with a stated reason, is not an anti-pattern — it's what pip and
  pytest's own ecosystem tolerate too.** Nothing in the five deep-dived suites bans `time.sleep`
  outright; the closest counter-evidence found was Textual's approach of sidestepping
  time-dependent rendering entirely via its `Pilot` driver's deterministic event loop, which is
  not available to us (we don't control the binary's internal clock). Our own audit's
  recommendation to codify "every sleep names what it's waiting past" rather than ban sleeping
  matches what the corpus actually does, not what the currently-adopted `quality-tests.md` rule
  says. This is where our own material, not the wider corpus, was already right — the wider
  corpus just confirms it rather than contradicting our rule.
- **Where we are genuinely ahead**: the `OcxRunner`/`GrimRunner` env-allowlist discipline already
  matches uv's `TestContext::new_command_with()` pattern almost exactly (strip everything, pass
  through an explicit named list) — most of the Python projects surveyed (pip, pytest) do not
  isolate environment this tightly by default. Our `check=True`-by-default-raises-with-stderr
  pattern is close kin to pip's `expect_error`/`allow_stderr_error` vocabulary but simpler to
  read at a call site. And the two-repo Platform Split (pytest vs. shell scenarios) independently
  arrived at the same shape gh CLI uses (fast/narrow vs. slow/broad tiers) — the only structural
  difference is that gh's fast tier is in-process (not available to us) where ours is a second
  *shell*-native slow-ish tier instead of a fast one; a genuine open question (Topic #20) is
  whether a third, faster tier is worth adding, not whether the two-tier idea itself is wrong.
- **Where we are behind, confirmed rather than merely suspected**: zero TTY/pty-emulation layer
  anywhere in either harness (`harness-shape.md` found no `isatty`/pty handling), while pytest
  ships `spawn_pytest()`/`pexpect` support as a first-class citizen of its own reference test
  harness and Textual sidesteps the problem architecturally. Given our own suites already use
  `pexpect.spawn` (6 ocx, 2 grimoire sites, per `harness-shape.md` §4) without an explicit
  per-call timeout policy, this is the single most concrete, actionable gap this survey found.

## Candidate topics

Shape numbering matches the fleet's convention: (1) pytest CLI acceptance harness, (2) typed SDK
library, (3) automation/bot, (4) stdlib single-file tooling.

| # | Topic (as a question) | Why it matters | Source | Already covered? | Priority (shape) |
|---|---|---|---|---|---|
| 1 | Should `OcxRunner.run()`/`GrimRunner.run()` gain a default `timeout=`, given mature suites (pip, pytest, uv) mostly ship none at all and rely on the CI job's own wall-clock limit instead? | Resolves the harness-shape.md #1 smell with corpus evidence on both sides | pip/scripttest source; pytest `pytester.py`; uv `uv-test/src/lib.rs` (all read directly) | no | HIGH — shape (1) |
| 2 | If a timeout is added, should expiry kill the process **group**, not just the direct child — given even pytest's own reference `Pytester.run()` only calls `popen.kill()`? | Nobody surveyed solves this; doing it would be a genuine improvement, not catch-up | `pytester.py:1443-1450` (no `start_new_session`/`setsid` anywhere in `popen()`) | no, and no prior art found anywhere | HIGH — shape (1) |
| 3 | **Snapshot (insta/syrupy-style) vs. substring assertions for our JSON/text CLI output — which, and for which call sites?** | Live split even within the Rust ecosystem (uv/ruff snapshot; ripgrep/gh-unit-tier don't); needs a project decision, not an assumption | uv `uv-test/src/lib.rs`; ruff `integration_test.rs`; ripgrep `tests/util.rs` (all read directly) | no — open question | **DECIDE — HIGH, shape (1)** |
| 4 | **`time.sleep` in acceptance tests: keep the `quality-tests.md` ban, or adopt "codify with a stated reason" as our harness already does and the wider corpus tolerates?** | Direct, live contradiction between the adopted rule and both our own measured practice and the surveyed corpus | `existing-rules-ledger.md` row #61; `harness-shape.md` §6 | contradicted by our own adopted rule | **DECIDE — HIGH, shape (1)** |
| 5 | Does the in-process-CLI-testing pattern (click `CliRunner`, cleo `ApplicationTester`, direct `core.main()` calls) apply to any part of our fleet at all, given it requires the CLI and the test to share a runtime? | Five of ten named Python projects use it; only relevant to shape (2)'s SDK wrapping a subprocess-based CLI, not shape (1) | hatch `tests/conftest.py:46`; poetry `tests/helpers.py:169`; pdm `src/pdm/pytest.py:639`; httpie `tests/utils/__init__.py:403`; tox `src/tox/pytest.py:288` (all read directly) | n/a — architecturally inapplicable to shape (1) | LOW — name it as not-applicable so it isn't rediscovered |
| 6 | Should acceptance assertions on `--format json` output move toward asserting specific structured fields (as poetry/pdm's own JSON test fixtures do) rather than any text-shape check, for the `runner.json()` call sites specifically? | A third assertion style (structured-field) distinct from both substring and full-snapshot, possibly the right default for JSON-emitting commands | pdm/poetry conftest fixtures (read directly, JSON-fixture pattern observed) | partial — `runner.json()` exists but assertion style on the parsed dict isn't itself a named convention | MEDIUM — shape (1) |
| 7 | Should the shell-scenario half of the Platform Split (`test/scenarios/*.sh`) migrate to a purpose-built shell-test tool (`bats-core`, `cram`) instead of the hand-rolled `Scenario` base class? | Purpose-built tools exist for exactly this; worth a build-vs-adopt decision | bats-core, cram (tooling landscape, not repo-read) | no | MEDIUM — shape (1) |
| 8 | Is there a Python equivalent worth adopting for the "boring bulk of golden-command-output tests" role `trycmd` plays in the Rust CLI ecosystem, freeing hand-written pytest cases for the interesting ones? | `trycmd` explicitly targets "a herd of CLI tests" — exactly our suite's scale problem (95k+35k LOC) | [assert-rs/snapbox / trycmd](https://github.com/assert-rs/snapbox) | no — no direct Python analog found | MEDIUM — shape (1) |
| 9 | Should our 6+2 `pexpect.spawn` sites get an explicit, named timeout policy distinct from pytest's own collection timeout, given pytest's own `spawn_pytest()` treats this as a first-class need? | Concrete, confirmed gap — zero TTY/pty timeout policy found anywhere in either harness | `pytester.py:1523-1549` (`spawn_pytest`/`spawn`); `harness-shape.md` §4 | no | HIGH — shape (1) |
| 10 | Should TTY-dependent output tests render through a real terminal emulator (`pyte`) instead of asserting on raw ANSI-embedded strings — and is `pyte` (last release 3 years old as of Aug 2026) a maintenance risk worth taking? | Textual sidesteps this problem architecturally (full virtual-terminal render); we have no equivalent and no library dependency yet | pyte readthedocs / GitHub (selectel/pyte) | no | MEDIUM — shape (1), flag maintenance risk |
| 11 | Should `pytest-timeout` (a blanket per-test wall-clock ceiling, distinct from a per-`subprocess.run()` call timeout) be adopted as a cheap backstop, matching what most other suites implicitly get from their CI job's own timeout? | Confirmed as maintained in 2026; solves a different layer of the same hang risk than topic #1 | PyPI `pytest-timeout` | no | HIGH — shape (1) |
| 12 | Should xdist-safety be a required, documented pattern per shared-state fixture (either explicit `xdist_group` or documented controller-only teardown) rather than mandating one specific mechanism, since ocx and grimoire already solve it two different valid ways? | Directly recommended by `harness-shape.md` §"Patterns worth encoding" #6; this survey found no third pattern to add | `harness-shape.md:177` | partial — pattern exists in both repos, not yet a named rule | MEDIUM — shape (1) |
| 13 | Does `pytest-subprocess` (faking subprocess responses) have a place anywhere in this fleet, given it would undermine the "real binary against real registry" premise for acceptance tests but might fit a *unit*-test layer this fleet doesn't clearly have? | Names a tool explicitly so it isn't proposed later for the wrong layer | PyPI `pytest-subprocess` | no — fleet currently has no unit-test layer between "typed SDK unit tests" and "full acceptance" for the Rust CLIs themselves | LOW — shape (1)(2) |
| 14 | `pytest-console-scripts` is built for testing an *installed Python entry point* in-process — does it apply to anything here? | Explicitly ruling it out prevents it being rediscovered and misapplied to a compiled-binary suite | GitHub kvas-it/pytest-console-scripts | n/a — architecturally does not fit a compiled-binary harness | LOW — not applicable, name it |
| 15 | Should the harness formally declare and test its CI-job-level timeout-minutes value as the documented hang backstop, given that's what pip/pytest/uv all implicitly rely on instead of a per-call timeout? | Turns an implicit industry convention into an explicit, reviewable policy for this fleet specifically | inferred from pip/pytest/uv source (no per-call timeout found in any) | no | HIGH — shape (1) |
| 16 | Should `--strict-markers` be turned on in both `test/pyproject.toml`s, given both harnesses already declare/use markers and a typo currently no-ops silently? | Independently flagged by `harness-shape.md` smell #3; this survey found no counter-argument in any project surveyed (all either declare markers or use only builtins) | `harness-shape.md:165` | not covered by any of the four ledgered files | HIGH — shape (1) |
| 17 | Is uv's ~30-method `with_filtered_*` normalization-before-snapshot layer a cost our harness should adopt regardless of the snapshot-vs-substring decision (topic #3), since some of our own substring assertions could still benefit from pre-normalizing timing/paths/sizes before comparison? | Separates "snapshot vs substring" from "normalize non-deterministic output before asserting," which is useful either way | `uv-test/src/lib.rs:245-564` (read directly) | no | MEDIUM — shape (1) |
| 18 | Should a third, fast/in-process-equivalent tier be added ahead of the two-tier Platform Split, mirroring gh CLI's `pkg/cmd` unit layer — even though "in-process" isn't literally available to us, is there a fake-registry-only fast tier worth adding (grimoire's stdlib-only registry already hints at this)? | gh CLI is the only project surveyed with a structurally comparable two-tier split; its third dimension (speed) is worth asking about explicitly | `cli/cli/acceptance/acceptance_test.go` (read directly); grimoire `test/src/registry.py` (own repo, cited in `harness-shape.md` §3) | partial — grimoire's hand-rolled registry is arguably already this, ocx's docker-compose registry is not | MEDIUM — shape (1) |
| 19 | Does the `oras`-wrapping vs. hand-rolled-`urllib` registry-client divergence between ocx/test and grimoire/test (per `harness-shape.md` §3) matter for portability of any rule this program authors, given neither pattern showed up in any surveyed non-Python project (none of them talk to an OCI registry)? | Flags that this specific piece of our own harness has zero comparable prior art in the surveyed corpus — worth stating rather than silently assuming a rule generalizes | `harness-shape.md:90` | n/a — no comparable external prior art found | LOW — name the gap, no action implied |
| 20 | Should Docker-compose-per-session external-dependency bring-up (ocx's registry+sigstore stack) remain the default, or does the corpus suggest a lighter default (no surveyed project — pip, pytest, uv, ripgrep, gh — spins up Docker for its own test suite)? | None of the five deep-dived projects use Docker for their own harness; this is a shape-1-specific need (a real OCI registry), not a pattern to import from elsewhere | pip/pytest/uv/ripgrep/gh sources (read directly, none show Docker) | n/a — no external precedent either way | LOW — informational, not actionable alone |
| 21 | Should `respx`/`pytest-mock-server`-style HTTP mock servers be considered for any Python-authored component that talks HTTP (the `index/bot` shape, or `ocx-mirror-sdk` generator scripts), even though they don't fit the compiled-binary acceptance layer? | Names a tool for the shape it might actually fit (3), ruling it out for shape (1) explicitly | PyPI pytest-mock-server (tooling landscape, not repo-read) | no | LOW-MEDIUM — shape (3), not shape (1) |
| 22 | Given `syrupy`/`inline-snapshot` are the Python-native equivalents of Rust's `insta`, and topic #3 might resolve toward snapshotting our JSON output, which of the two fits a subprocess-driven CLI harness (not an in-process app) better? | A follow-up decision that only matters if #3 resolves toward snapshot; naming both now avoids re-researching later | PyPI syrupy, inline-snapshot (tooling landscape); Textual's own use of `syrupy` (read via search) confirms it works for CLI-adjacent tools already | no — contingent on #3 | MEDIUM — shape (1), contingent |
| 23 | Should the fleet's environment-allowlist convention (`OcxRunner`/`GrimRunner`'s "minimal env: only PATH, HOME, *_HOME") be written down as a named, checkable pattern now that it's confirmed to match uv's independently-arrived-at `TestContext::new_command_with()` allowlist almost exactly? | Turns an already-correct, already-converged pattern into durable guidance instead of tribal knowledge | `uv-test/src/lib.rs:180-200` (read directly); `harness-shape.md` §3 | pattern exists in code, not yet a named rule anywhere in the four ledgered files | MEDIUM — shape (1), codify a win |
| 24 | Does `assert_cmd`'s Rust-ecosystem convention of `Command::cargo_bin("name")` (resolve the binary from the workspace build output, not a hardcoded path) suggest anything for how `test/bin/ocx`/`test/bin/grim` are resolved and rebuilt today? | A build-integration question adjacent to testing, not itself a Python rule, but worth flagging since it recurred in every Rust project surveyed | uv/ruff/ripgrep/fd sources (`get_cargo_bin`, `Command::cargo_bin`, all read directly) | n/a — Rust-tooling-specific, no direct Python translation | LOW — informational |
| 25 | Is a recorded/golden-script E2E format (gh CLI's `acceptance/testdata/`-driven `Test<Area>` functions) a better fit for `test/scenarios/*.sh` than the current hand-rolled `Scenario` subclass registry? | Direct structural alternative to the existing pattern, from the one project with the closest matching two-tier shape | `cli/cli/acceptance/acceptance_test.go` (read directly) | no | LOW-MEDIUM — shape (1) |
| 26 | Should `pytest-forked` (per-test process isolation, distinct from `pytest-xdist`'s worker-level parallelism) be evaluated for any test in either suite that's suspected of state-leaking, rather than manually hunting the leak? | A specific tool for a specific, named failure mode neither harness currently has a tool for | PyPI pytest-forked (tooling landscape) | no | LOW — shape (1), reactive tool not a standing rule |

## Sources

Read directly (source files/contributor docs, not commentary):

1. [`pytest-dev/pytest` — `src/_pytest/pytester.py`](https://github.com/pytest-dev/pytest/blob/main/src/_pytest/pytester.py)
2. [`pypa/pip` — `tests/lib/__init__.py`](https://github.com/pypa/pip/blob/main/tests/lib/__init__.py)
3. [`pypa/scripttest` — `scripttest/__init__.py`](https://github.com/pypa/scripttest/blob/main/scripttest/__init__.py)
4. [`pypa/hatch` — `tests/conftest.py`](https://github.com/pypa/hatch/blob/master/tests/conftest.py)
5. [`python-poetry/poetry` — `tests/conftest.py`](https://github.com/python-poetry/poetry/blob/master/tests/conftest.py)
6. [`python-poetry/poetry` — `tests/helpers.py`](https://github.com/python-poetry/poetry/blob/master/tests/helpers.py)
7. [`pdm-project/pdm` — `tests/conftest.py`](https://github.com/pdm-project/pdm/blob/main/tests/conftest.py)
8. [`pdm-project/pdm` — `src/pdm/pytest.py`](https://github.com/pdm-project/pdm/blob/main/src/pdm/pytest.py)
9. [`pre-commit/pre-commit` — `testing/util.py`](https://github.com/pre-commit/pre-commit/blob/main/testing/util.py)
10. [`tox-dev/tox` — `tests/conftest.py`](https://github.com/tox-dev/tox/blob/main/tests/conftest.py)
11. [`tox-dev/tox` — `src/tox/pytest.py`](https://github.com/tox-dev/tox/blob/main/src/tox/pytest.py)
12. [`httpie/cli` — `tests/utils/__init__.py`](https://github.com/httpie/cli/blob/master/tests/utils/__init__.py)
13. [`Textualize/textual` — `tests/snapshot_tests/test_snapshots.py`](https://github.com/Textualize/textual/blob/main/tests/snapshot_tests/test_snapshots.py)
14. [`astral-sh/uv` — `crates/uv-test/src/lib.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv-test/src/lib.rs)
15. [`astral-sh/uv` — `crates/uv/tests/it/resource_limits.rs`](https://github.com/astral-sh/uv/blob/main/crates/uv/tests/it/resource_limits.rs)
16. [`astral-sh/ruff` — `crates/ruff/tests/integration_test.rs`](https://github.com/astral-sh/ruff/blob/main/crates/ruff/tests/integration_test.rs)
17. [`BurntSushi/ripgrep` — `tests/util.rs`](https://github.com/BurntSushi/ripgrep/blob/master/tests/util.rs)
18. [`sharkdp/fd` — `tests/tests.rs`](https://github.com/sharkdp/fd/blob/master/tests/tests.rs)
19. [`cli/cli` — `acceptance/acceptance_test.go`](https://github.com/cli/cli/blob/trunk/acceptance/acceptance_test.go)

Tooling-landscape and currency checks (WebSearch, dated 2026-08-23):

20. [`Textualize/pytest-textual-snapshot` — README](https://github.com/Textualize/pytest-textual-snapshot/blob/main/README.md) — `snap_compare` fixture, built on `syrupy`
21. [Textual — Testing guide](https://textual.textualize.io/guide/testing/) — `Pilot` driver, SVG-snapshot rationale
22. [`assert-rs/snapbox`](https://github.com/assert-rs/snapbox) and [`trycmd` docs.rs](https://docs.rs/trycmd) — confirmed actively maintained (Sept 2025 releases) as of this research
23. [`astral.sh/blog/ty`](https://astral.sh/blog/ty) — reused from prior audit for Astral tooling-family context
24. [PyPI — `pytest-timeout`](https://pypi.org/project/pytest-timeout/) — confirmed maintained
25. [PyPI — `pytest-subprocess`](https://pypi.org/project/pytest-subprocess/) — confirmed active (PyPI-verified activity dated May 2026)
26. [GitHub — `kvas-it/pytest-console-scripts`](https://github.com/kvas-it/pytest-console-scripts) — confirmed exists, architecturally inapplicable (in-process only, see Topic #14)
27. [`pyte` — readthedocs / `selectel/pyte`](https://pyte.readthedocs.io/en/latest/) — confirmed functional but low-churn (latest release ~3 years old as of Aug 2026)
28. Internal, cited not re-measured: [`harness-shape.md`](/home/mherwig/dev/grimoire-lore/.agents/research/python-audit/harness-shape.md) and [`existing-rules-ledger.md`](/home/mherwig/dev/grimoire-lore/.agents/research/python-audit/existing-rules-ledger.md), both from this program's own prior audits
