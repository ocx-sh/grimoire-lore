---
title: "BZL-PY — rules_python toolchains, PyPI resolution, bootstrap, tests and BUILD generation"
topic: bazel-python
family: BZL-PY
model: opus
consolidates:
  - bazel-python/python-toolchains-and-pypi-resolution.md
  - bazel-python/python-bootstrap-imports-and-precompiling.md
  - bazel-python/python-tests-and-build-generation.md
  - bazel-followups/python-typing-ide-sdist-and-entrypoints.md
  - bazel-followups/gazelle-plugin-maturity-per-language.md
  - bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md
  - bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md
grounded_in:
  - bazel-frame.md (body + Corrections, wave 1 and the post-map decisions)
  - bazel-topic-map.md ("How to read this", "Conflicts resolved" 1-18, "The map" §J, "Staged for wave 3" §8)
  - bazel-audit/config-inventory.md
  - bazel-audit/starlark-code-shape.md
  - bazel-audit/build-contracts-and-ci-posture.md
  - bazel-audit/fleet-bazel-readiness.md
date: 2026-09-05
revised: 2026-09-06
---

# BZL-PY

## Verdict

Python under Bazel is the one language family in this programme where the
**received framing is wrong in a way that changes the rules**, and where the
fleet's strongest asset — uv everywhere — is a liability rather than a head
start. Thirty-seven rules. Thirty MUST. No fleet instance today, and four
places where a migration would violate on day one.

**Revised 2026-09-06** against three follow-up dives and one measurement run
(see "Revision log"). The revision closed all four of this file's own research
questions — typing/IDE, sdist build isolation, zipapps and console scripts, and
`PYTHONSAFEPATH` parity — three of them as *documented gaps* rather than
answers (Verdict 16-18), corrected two rules that overclaimed a failure mode
(BZL-PY-15's "silence", BZL-PY-25's Windows premise), and confirmed BZL-PY-20
by running it on both majors.

1. **Hermeticity is not opt-in, and the frame, the brief and map row M-J-01 all
   say it is.** Under Bzlmod, `rules_python` registers a hermetic
   prebuilt-standalone toolchain as a *soft default* for any root module that
   never calls `python.toolchain()` — proved from the ruleset's own
   `MODULE.bazel` and the `elif mod.name == "rules_python" and not
   default_toolchain` branch in `python/private/python.bzl`
   (`bazel-python/python-toolchains-and-pypi-resolution.md:162-226`). The
   WORKSPACE-era host-PATH fallback
   (`@bazel_tools//tools/python:autodetecting_toolchain`) is the lowest-priority
   path and is not reached on Bzlmod "unless there is a toolchain
   misconfiguration somewhere." **Correction recorded**: M-J-01's priority text
   ("hermeticity is opt-in… omitting it is the default footgun") is
   WORKSPACE-era truth and is wrong for every Bazel major this set ships for.
   The real failure is a **hermetic but unpinned rolling default** — 3.11 at
   tag 2.3.3, already 3.14 on `main` — which drifts on every `bazel_dep` bump
   with no error and no warning. BZL-PY-01 pins it; BZL-PY-04 stops an agent
   diagnosing the absence as non-hermeticity and "fixing" it with the
   deprecated autodetecting toolchain.
2. **Every `uv.lock` in this fleet is a migration cost, and the map dates the
   escape hatch wrong.** Map Conflict 4 resolves that `pip.parse` does not
   consume `uv.lock` and cites `rules_python` 2.1.0 (2026-06-17) for the
   `uv_lock=` parameter. Read against the CHANGELOG and the attribute's own
   docstring, the parameter is `versionadded 2.2.0` (2026-06-30), and the
   workspace/root-member exclusion landed at 2.3.0 (2026-08-07)
   (`bazel-python/python-toolchains-and-pypi-resolution.md:80-95,418-467`).
   **Correction recorded: 2.2.0 for existence, 2.3.0 for the members fix, not
   2.1.0.** The substance of Conflict 4 stands and hardens: `uv_lock=` is
   undocumented in every prose doc page as of 2.3.3, the maintainer calls the
   uv work experimental and would rather it lived elsewhere, and it silently
   drops workspace/root members. **Decision (pinned): the supported path is a
   generated `requirements.txt`** — via the `lock()` rule or a plain
   `uv export` outside Bazel — and full, workspace-aware `uv.lock` consumption
   is a *ruleset switch* to `aspect_rules_py`, not a `rules_python` flag
   (BZL-PY-07).
3. **The map's M-J-13 "silently fails" premise is also wrong, and the real
   silent path is elsewhere.** With `python_validate_import_statements` at its
   default `true`, an unresolvable import is a **loud** generation-time error
   printing three remediations; a missing `gazelle_python.yaml` is a loud
   `missing input file` build failure
   (`bazel-python/python-tests-and-build-generation.md:168-191`). The genuinely
   silent path is stdlib **misclassification**: gazelle plugin < 2.3.0 falls
   back to the Python 3.11 stdlib list for `python_version` 3.13/3.14, so
   `telnetlib` stays "stdlib" and `compression.zstd` becomes "third-party" —
   wrong `deps`, no error (`:193-205`). **Correction recorded.** BZL-PY-26 and
   BZL-PY-27 are written against the real failure, not the assumed one.
4. **The brief's named precompiling bug is closed; the real one is open and is
   the reason precompiling stays off.** Issue #2212 was filed 2024-09-10 and
   closed 2024-10-11 by PR #2243 — one month, not "years later." The still-open
   bug matching the docs' own third caveat is #2445 (`ActionConflictException`
   on `PyCompile` for two targets sharing `srcs` with differing
   `exec_properties`), filed 2024-11-26, last comment 2025-09-17, unfixed
   across two major versions
   (`bazel-python/python-bootstrap-imports-and-precompiling.md:194-209`).
   **Correction recorded** against the map's wave-3 staging text.
   **Decision (pinned): the shipped set does not recommend precompiling.**
   `--precompile=auto` resolves to `disabled` in the flag's own
   effective-value function, runfiles roughly double, and one of three named
   caveats has an open two-year tracker (BZL-PY-17, BZL-PY-18).
5. **The two dives conflict on `../` in `imports`, and the ban is too strong.**
   The bootstrap dive says never use a `../`/`../../` escape because it exposes
   an ancestor directory to every transitive consumer's `sys.path`
   (`bazel-python/python-bootstrap-imports-and-precompiling.md:133-161`). The
   tests dive documents that `# gazelle:python_root` makes Gazelle *generate*
   exactly `imports = [".."]` / `["../.."]` on every target under the root, and
   that omitting the directive is itself a finding
   (`bazel-python/python-tests-and-build-generation.md:154-166`). **Resolved
   for the tests dive on mechanism**: the escape is the sanctioned way a
   `src/`-layout package's absolute imports resolve. BZL-PY-16 therefore bans a
   **hand-written** `../` entry that reaches above a declared `python_root`,
   and requires a justification comment on any other; a Gazelle-generated entry
   is not a finding.
6. **The two dives also conflict on the env-var seam, and the ban is on the
   fallback, not the variable.** One candidate says never use an env var with a
   fixed-path fallback (MUST); another says keep the env-var override during a
   dual-build-system migration (SHOULD)
   (`bazel-python/python-tests-and-build-generation.md:291,298`). **Resolved:
   the defect is the fixed relative path** (`test/bin/<name>`), which silently
   serves a stale binary whenever the out-of-band `cargo build` step is skipped.
   An env-var override with **no** path fallback is a legitimate escape hatch
   for running the same file outside `bazel test`. BZL-PY-25 is written that way.
7. **The `pyproject_toml=` live-wiring the toolchains dive recommends is
   unusable in this fleet, and the rule ships guarded.** `pip.parse.pyproject_toml`
   (2.3.0) reads `requires-python` only when it is an exact `==X.Y.Z` pin
   (`bazel-python/python-toolchains-and-pypi-resolution.md:569-596`). All seven
   fleet Python projects declare a `>=` range — `>=3.10` through `>=3.13`,
   verified file by file (`grimoire/test/pyproject.toml:4`,
   `arcana/nox/pyproject.toml:6`, `ocx-sdk-python/pyproject.toml:8`,
   `ocx-indexbot/pyproject.toml:8`, `ocx-mirror-sdk/pyproject.toml:8`,
   `ocx/test/pyproject.toml:8`, `index/bot-tools/pyproject.toml:22`). Zero
   exact pins fleet-wide, so the attribute resolves nothing for any of them.
   BZL-PY-02 carries it as a conditional clause, not as the general
   recommendation the dive framed.
8. **`system_python` is the bootstrap default on every platform including
   Windows, and the two bootstraps are not feature-equal.** `script` was
   announced in 0.33.0 as becoming the default "in a subsequent release" and
   never did; `system_python` absorbed the venv-per-target model at 2.0.0 and
   is force-selected on Windows by an unconditional `select()` in the flag's
   own definition
   (`bazel-python/python-bootstrap-imports-and-precompiling.md:66-88`).
   **Decision: pin nothing — accept the default.** The single named exception
   is a debugger or REPL workflow needing `PYTHONSAFEPATH` inherited or
   disabled per invocation, which is `script`-only and has been for two years
   (BZL-PY-14, BZL-PY-15). **Correction recorded (wave 4a): that gap is
   *stalled*, not silent.** Tracking issue #2060 is open since 2024-08-15 with
   an explicit maintainer ask to extend the fix to `system_python`; PR #2122
   (switching to the `-P` interpreter flag, which would have covered both
   bootstraps) was reviewed for 14 months — including a second maintainer's
   "+1… especially +1 to set it in the script bootstrap case" on 2025-05-19 —
   and closed **unmerged** on 2025-10-22 with no closing comment, blocked on
   Bazel-6/`py_runtime` compatibility and the version-undetectable-toolchain
   case. The guidance is unchanged; citing it as settled-forever silence was
   wrong (`bazel-followups/python-typing-ide-sdist-and-entrypoints.md` Q4).
9. **`sys.path` order is `[stdlib, user paths, runtime site-packages]` under
   both bootstraps since 1.7.0, and that closed the stdlib hole without
   closing the third-party one.** Everything `imports` contributes still sits
   ahead of site-packages, so a directory sharing a name with a PyPI package
   wins silently — a wrong module, never an ImportError
   (`bazel-python/python-bootstrap-imports-and-precompiling.md:90-109`). The
   fleet already carries this shape: `ocx/test/pyproject.toml:17` sets
   `pythonpath = [".", "src"]` and both roots contain a `scenarios` directory.
10. **`py_test` on a pytest file is a false-green target forever, and that is
    the single highest-risk step in any fleet migration.** Native `py_test`
    runs `unittest` discovery inside its `srcs`; pointed at a pytest-style file
    with no entrypoint it "silently passes without running any tests," per a
    maintainer on the open request to have Gazelle generate the shim
    (`bazel-python/python-tests-and-build-generation.md:70-76`). The fleet's
    two harnesses are 156 and 67 pytest files
    (`bazel-audit/fleet-bazel-readiness.md:138-140`). BZL-PY-21 is the rule the
    whole group exists to carry.
11. **Version boundaries the decisions rest on.** `rules_python` **2.3.3**
    (2026-09-04) and `rules_python_gazelle_plugin` **2.3.3** are the floor for
    every claim here. Behaviour gates: soft default and `python.toolchain()`
    mechanism — Bzlmod, any GA release, verified at 2.3.3; `uv_lock=` — ≥2.2.0,
    members fix ≥2.3.0; `pyproject_toml=` — ≥2.3.0; `RULES_PYTHON_PYPI_HUB_RESERVED`
    — ≥2.2.0; `py_freethreaded` — ≥0.39.0 and a Python ≥3.13 build;
    `py_linux_libc`/musl variants — ≥1.0.0; venv-per-target default — ≥2.0.0;
    `sys.path` order under `system_python` — ≥1.7.0; `PYTHONSAFEPATH`
    inheritance — ≥0.35.0 and `script` only; ancestor-`conftest.py` wiring —
    ≥1.9.0; gazelle stdlib-list fix — plugin ≥2.3.0 **with** `rules_python`
    ≥1.5.0; `gazelle_python_manifest(lockfiles=)` — **unreleased**, use
    `requirements=` at ≤2.3.3. Added by the wave-4a revision:
    `py_console_script_binary` — ≥0.26.0 (the WORKSPACE-era `entry_point`
    macro it replaced was removed at 0.34.0; symbolic-macro compatible since
    1.7.0); `py_zipapp_binary` — ≥1.9.0; `configure_coverage_tool=` on
    `python.toolchain()` — ≥0.18.1; `pip.default.index_url` — ≥2.0.0, which is
    the same release that deprecated `experimental_index_url`; Windows
    `--bootstrap_impl=system_python` forced — ≥1.5.0; Windows
    `--enable_runfiles=true` forced for `py_binary`/`py_test` by a rule-level
    transition — ≥1.9.0; `rules_mypy` v0.41.0 needs `rules_python` ≥1.1.0.
    Bazel majors: everything here works on 8 and 9 except BZL-PY-20, which is a
    hard load-time failure on **9** only and merely non-portable on 8 —
    **measured on this host**: `--incompatible_autoload_externally` reads the
    full `+@rules_python,…` allowlist on 8.7.0 and 8.8.0 and `""` on 9.2.0
    (`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`
    Q1). Bzlmod is assumed throughout; BZL-PY-05 exists because the fleet's era
    still trains agents on WORKSPACE snippets.
12. **M-J-15 is decided here without a rule row, and the wave-4a dive confirmed
    the mechanism behind the decision.** `arcana/nox` — zero runtime
    dependencies by contract, shipped as a zipapp — needs nothing from this
    family. `py_zipapp_binary` (1.9.0) is now proved to be a near-exact match
    for its hand-rolled `build_pyz.py`: `tools/private/zipapp/zipper.py`
    hardcodes the same `(1980,1,1,0,0,0)` epoch and picks
    `ZIP_STORED`/`ZIP_DEFLATED` by compression level exactly as
    `arcana/nox/scripts/build_pyz.py:35-129` does. Two differences are real and
    worth naming rather than hand-waving: `build_pyz.py` honours
    `SOURCE_DATE_EPOCH` (the ruleset's zipper hardcodes 1980 unconditionally)
    and *refuses* symlinks and irregular files via `O_NOFOLLOW` where the
    zipper *packs* them with `S_IFLNK` mode bits — a different design choice,
    not a strict superset. `py_zipapp_binary` also wraps a full `py_binary`,
    so emitting one file needs the whole Bazel Python toolchain standing.
    **Decision unchanged**; what changed is the reason — "the replacement would
    work, the cost still isn't worth it" rather than "unverified"
    (`bazel-audit/fleet-bazel-readiness.md:281-284`;
    `bazel-followups/python-typing-ide-sdist-and-entrypoints.md` Q3). A rule
    saying "do not adopt Bazel here" has no verification that changes a diff
    inside a Bazel repo, so it stays a Verdict decision.
13. **Gazelle is not worth standing up at this fleet's scale.** Its fixed cost
    is three `bazel_dep`s, a `modules_mapping`/`gazelle_python_manifest` pair, a
    committed manifest, a `gazelle_binary` target and a CI-wired `.test` target
    — five moving pieces and two failure surfaces before one BUILD file is
    generated (`bazel-python/python-tests-and-build-generation.md:271-277`). No
    source states a target-count threshold; ~30-50 hand-maintained Python
    targets in one project is this project's judgment, carried as the only
    CONSIDER row in the set (BZL-PY-30) rather than as an asserted MUST. The
    wave-4a generator survey **raises** that fixed cost by one target: no
    ecosystem examined — bazel-gazelle's own root `BUILD.bazel`, rules_python
    2.3.3's install doc, gazelle_rust's example, Aspect's `aspect_gazelle()`
    macro — wires the BUILD-freshness `gazelle_test` by default, so a Python
    adopter must hand-wire **two** distinct test targets, not one (BZL-PY-37).
    The same survey rates the rules_python plugin **production, but only when
    paired with a pytest wrapper** — the one maturity label in the six-language
    table that carries a condition
    (`bazel-followups/gazelle-plugin-maturity-per-language.md` Q2, Q5, Q7).
14. **The one argued-tier claim in the group is carried as a note, not a rule.**
    The exec-group-scoped `exec_properties` workaround for #2445 rests on a
    single maintainer comment plus one corroborating report. It appears inside
    BZL-PY-18's rationale, explicitly marked, and never as its own imperative —
    the house standard forbids a MUST on argued evidence.
15. **What this group does not own.** Bazel-9 autoload in general is `BZL-FLAG`
    (BZL-PY-20 is the Python instance only); the general action-nondeterminism
    taxonomy is `BZL-HERM` (BZL-PY-19 is the Python instance only, and the
    "a repository rule shelling out to `python` must pass `-B`" candidate is
    left entirely to `BZL-HERM` as generic repository-rule hygiene); test
    sizing, sharding policy and flakiness are `BZL-TEST` (BZL-PY-23 covers only
    the `pytest-shard` runtime dependency Bazel's own contract requires);
    `pyproject.toml` / `uv.lock` hygiene is covered by `python-packaging` and
    `python-quality` and is not re-derived here. Coverage *mechanics* — that
    the collector runs inside the test's own spawn and timeout for every
    language, that an unset `--instrumentation_filter` is silently recomputed
    from the test targets' own packages, and how to read a report's `DA:`
    records — are `BZL-TEST`; BZL-PY-36 carries only the `python.toolchain()`
    attribute and the bundled-wheel range, which no other family owns. Gazelle
    freshness in general is `BZL-ARCH-12`; BZL-PY-37 is the Python instance,
    which exists only because Python is the one language with two distinct
    freshness gates. The wave-2 consolidations `bazel-hermeticity-determinism.md`
    and `bazel-starlark-and-build.md` do not exist on disk yet, so those
    cross-references name the family and the dive, not a rule ID; a later
    author must convert them to IDs.
16. **The IDE and typing gap is a finding, not an open question.** `rules_python`
    ships no first-party IDE or type-checking story and has decided not to:
    issue #1401 is open since 2023-09-04 and the maintainer's 2025-07-10
    comment scopes it out ("`aspect_rules_py` and `rules_uv` solve IDE support
    with `venv` approaches… this is fully a community-driven project"). The
    maintained **CI gate** is `rules_mypy` (bazel-contrib, v0.41.0, 2026-03-31),
    an *aspect* wired through `.bazelrc` (`--aspects=…%mypy_aspect
    --output_groups=+mypy`), not a `py_test` — and it needs **no materialised
    venv**, because it resolves imports from the providers already in the
    dependency graph. Its predecessor `bazel-mypy-integration` is archived
    (`archived: true`, `pushed_at: 2025-05-08`) and its own README redirects.
    **No maintained Pyright integration exists at all** — the three
    `rules_pyright` repositories found are personal forks, 0-1 stars, no org
    backing. *Interactive* editor resolution is a separate problem needing a
    venv on disk, and the only two paths are a ruleset switch to
    `aspect_rules_py` or `cedarai/rules_pyvenv`, which has no `MODULE.bazel`
    and no BCR entry — a `WORKSPACE`-era `http_archive` in a Bzlmod-only repo,
    the exact shape BZL-PY-05 already calls a finding. BZL-PY-31 and BZL-PY-32
    carry this; the gap itself does not close.
17. **There is no PEP 517 sdist build as a Bazel action, and the failure it
    produces is a build-tooling gap, not a sandbox bug.** Issue #2410 is open
    since 2024-11-14 and inactive since 2026-01-20, where the maintainer points
    at another ruleset's PR as the closest prior art. The concrete failure,
    proved by #1463: `pip.parse`'s repository rule shells out to
    `pip wheel --no-deps` (`whl_installer.py:61-67`) under the bare hermetic
    interpreter, in a non-sandboxed environment with no C/C++ toolchain wired
    into `PATH`, so an sdist needing a compiler dies with `error: command
    'clang' failed: No such file or directory`. **`--no-build-isolation` is two
    seams, not one**: `[tool.uv] no-build-isolation` reaches only the `lock()`
    rule's `uv pip compile` step (via the `--project <dir>` the rule
    auto-detects), while the later wheel build has its own
    `pip.parse(extra_pip_args = […])` seam that is mechanically wired and
    practically inert unless that interpreter already carries the build
    dependencies — which defeats hermeticity and is documented nowhere as
    supported. This is the mechanism BZL-PY-03 previously stated only as an
    ordering rule; BZL-PY-33 carries it.
18. **Python coverage has a silent-empty path that belongs to this family.**
    `rules_python` 2.3.3 collects coverage with coverage.py from a *bundled
    wheel set*, enabled by `python.toolchain(configure_coverage_tool = True)`
    (≥0.18.1) or a manual `py_runtime.coverage_tool`. The ruleset's own doc:
    that wheel set covers CPython **3.9 through 3.14 and not every platform
    within that range**, and when the resolved interpreter has no matching
    wheel, `bazel coverage` "emits empty lcov data" — silently, with only an
    analysis-time `py_runtime` warning as a trace. Two facts frame it, both
    owned by `BZL-TEST`: the collector runs inside the test action's own spawn
    and therefore its own `size`/`timeout` budget (a Bazel-core property of
    `TestActionBuilder`/`collect_coverage.sh`, confirmed at 8.8.0 and 9.2.0 —
    not a rules_js detail), and an unset `--instrumentation_filter` is silently
    recomputed from the *test targets' own packages*, which produces the same
    empty report for an entirely different reason. BZL-PY-36 carries the
    Python-specific half.
19. **Windows is further along for Python than this family assumed, and one
    rule overclaimed a failure because of it.** `rules_python` forces
    `--bootstrap_impl=system_python` on Windows since 1.5.0 (2025-06-11), and
    since **1.9.0** (2026-02-21) `py_binary`/`py_test` force
    `--enable_runfiles=true` on Windows through a **rule-level transition**,
    overriding Bazel's own `auto` default (which is `off` on Windows,
    byte-identically on 8.7.0 and 9.2.0). The changelog warns the
    `enable_runfiles=false` override "will soon become **required**" — i.e. may
    be removed. Consequence: the rules_js-shaped "empty coverage, PASSing test,
    `requires a runfiles tree`" failure should not reproduce for a `py_test`
    out of the box, and BZL-PY-25's secondary clause no longer rests on
    `--enable_runfiles` being off — it rests on Bazel's own make-variables
    reference calling `$(location)` legacy and ambiguous. **No Windows runner
    was exercised by any input**, so this is a source-confirmed, not
    measured, claim.

## The ruleset

**This topic owns `BZL-PY` exclusively.** Thirty-seven rules: 30 MUST, 6
SHOULD, 1 CONSIDER. Rows are grouped by the check that catches them — one read
of the root `MODULE.bazel` settles Group A, one `grep` of `BUILD`/`BUILD.bazel`
settles most of Group G — so a rule's group is *not* a function of its number,
and the seven rules added on 2026-09-06 (BZL-PY-31…37) sit in the group whose
check finds them. **pinned** marks a rule that fixes a project decision rather
than deriving a fact. Every verification states which way empty output reads.

**Every grep-based verification below is blind to generated-repo content.**
BUILD and `.bzl` text a repository rule or module extension writes into an
external repo — every `py_library` a `pip.parse` hub emits, every wheel's
`entry_points.txt`, everything under `@pypi//…` — is not on disk when a
workspace grep runs. A clean grep is a statement about checked-in source only;
reaching generated text needs `bazel query`/`cquery` or a read of the fetched
external repo, and any report must say which of the two it did.

### Group A — one read of the root `MODULE.bazel`

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-01 | Pin the root module's Python version explicitly with both `python.defaults(python_version = "X.Y")` and `python.toolchain(python_version = "X.Y")`. | `rules_python`'s soft default is hermetic but unpinned — it tracked 3.11 at tag 2.3.3 and 3.14 on `main`, so the interpreter moves on any `bazel_dep` bump with no error. | `grep -c 'python\.toolchain(' MODULE.bazel` in the root module. **Empty (0 matches) = FINDING** — the repo rides the rolling default. | MUST | Bazel 8, 9 (Bzlmod); rules_python 2.3.3 (mechanism verified at this tag) | Shapes D, F | M-J-01 |
| BZL-PY-02 | Register one `python.toolchain()` per distinct exact Python version the repo builds or tests against, and wire `pip.parse(pyproject_toml = ...)` only where that project's `requires-python` is an exact `==X.Y.Z` pin. | `rules_python` neither selects nor interpolates a toolchain from a `>=` range; `pyproject_toml=` requires an exact pin per its own docstring note, so a hand-copied `python_version` is the only option against a range and it drifts. | `grep -h requires-python **/pyproject.toml \| sort -u` for distinct floors; `grep -c 'python\.toolchain(' MODULE.bazel` for registrations; `grep -n 'pyproject_toml\s*=' MODULE.bazel`. **Two or more distinct floors with fewer registrations = FINDING**; a `pyproject_toml=` wiring against a `>=` floor = FINDING. **Empty on all three = pass only if the repo has no Python.** | MUST | Bazel 8, 9 (Bzlmod); rules_python ≥2.3.0 for the `pyproject_toml=` clause | Shapes D, F | M-J-16 |
| BZL-PY-03 | Bind every `pip.parse()` to an interpreter explicitly — a `python_version` matching a `python.toolchain()` already in the module graph, or a `python_interpreter_target`. | `pip.parse` is a repository rule; it runs in the loading phase, before analysis-phase toolchain resolution, so there is no toolchain to inherit. A missing bind resolves against the host and "works" only because the host happened to carry build tooling (rules_python#1463). | `grep -A5 'pip\.parse(' MODULE.bazel \| grep -E 'python_version\|python_interpreter'`. **Empty with a `pip.parse(` present = FINDING.** | MUST | Bazel 8, 9; rules_python 2.3.3 (mechanism unchanged since 0.7.0) | Shapes D, F | M-J-02 |
| BZL-PY-04 | Never read a missing `python.toolchain()` under Bzlmod as a host-PATH fallback, and never register `@bazel_tools//tools/python:autodetecting_toolchain` to "fix" one. | Under Bzlmod the absence yields a hermetic-but-unpinned toolchain, not a host interpreter; the autodetecting toolchain autodetects nothing — it uses `python3` from the runtime environment, the opposite of hermetic. Misdiagnosis leads directly to the wrong fix. | Reading heuristic: confirm `MODULE.bazel` exists and no `WORKSPACE`/`WORKSPACE.bazel` registers a Python toolchain ahead of it, *then* `grep -rn 'autodetecting_toolchain' MODULE.bazel WORKSPACE* 2>/dev/null`. **Empty on the grep = pass**; the correct reading of a missing `python.toolchain()` is "hermetic but unpinned" (see BZL-PY-01), never "non-hermetic". Any `autodetecting_toolchain` match = FINDING. | MUST | Bazel 8, 9 (Bzlmod); rules_python 2.3.3 | Shapes D, F | M-J-01 |
| BZL-PY-05 | Never author WORKSPACE-era `python_register_toolchains()` or `pip_parse()` in a repository that has a `MODULE.bazel`. | The macros still exist for genuine mixed-mode migrations, but in a Bzlmod-only repo they are dead weight or actively wrong. On Bazel 9 there is no way back: `--enable_workspace` and `--enable_bzlmod` are not no-ops, they are **absent from every help surface** — measured on this host, both present (`false`/`true`) at 8.7.0 and 8.8.0 and gone from `help build --long` *and* `help startup_options` at 9.2.0. | `grep -l 'python_register_toolchains\|pip_parse(' WORKSPACE WORKSPACE.bazel 2>/dev/null`. **Empty = pass.** A match alongside a `MODULE.bazel` = FINDING (either dead code, or the repo is mid-migration and must be labelled as such). Confirm the flag's fate per major with `bazel help build --long` **and** `bazel help startup_options` — a flag can live in either, and checking only the first misses startup-only options. | MUST | Bazel 9 (hard); Bazel 8 (flag-gated, still a finding); rules_python 2.3.3 | Shapes D, F | — |
| BZL-PY-06 | Set `RULES_PYTHON_PYPI_HUB_RESERVED=1` whenever two modules in the graph both create a PyPI hub named `"pypi"`. | The default (`0`) prints a warning and does **not** resolve the collision against the unified `@pypi` proxy repo; only `1` renames the colliding hub to `<module_name>_pypi`. | `grep -rn 'hub_name\s*=\s*"pypi"' MODULE.bazel` across every module you control, then `grep -rn 'RULES_PYTHON_PYPI_HUB_RESERVED' .bazelrc*`. **Zero or one hub match = pass.** Two or more with no `--repo_env=RULES_PYTHON_PYPI_HUB_RESERVED=1` anywhere = FINDING. | MUST (when a collision exists; not applicable otherwise) | Bazel 8, 9 (Bzlmod); rules_python ≥2.2.0 | Shapes D, F | M-J-10 |
| BZL-PY-34 | Configure a custom package index through `pip.default(index_url = ...)`, never through `pip.parse(experimental_index_url = ...)`, and never describe the `experimental_` spelling as the modern or opt-in mechanism. | `experimental_index_url`/`experimental_index_url_overrides` carry a `versionchanged 2.0.0` deprecation notice in `extension.bzl`'s own attribute doc; the replacement `pip.default.index_url` defaults to `https://pypi.org/simple` unconditionally, so the Bazel-downloader/Simple-API path is the **default**, not an experiment to enable. The `experimental_` prefix reads to an agent as "the new thing", which is backwards, and the Simple-API scan surfaces sdists as well as wheels — `download_only = True` is the only lever that excludes sdists (see BZL-PY-33). | `grep -n 'experimental_index_url\b' MODULE.bazel` (word-boundary, so `_overrides` is a separate hit worth its own line). **Empty = pass or not applicable.** Any hit at `rules_python` ≥2.0.0 = FINDING, migrate to `pip.default.index_url`. Confirm the attribute name at the pinned tag with `curl -sL https://raw.githubusercontent.com/bazel-contrib/rules_python/<pinned-tag>/python/private/pypi/extension.bzl \| grep -n 'index_url'` rather than from a prose doc page. | MUST | Bazel 8, 9 (Bzlmod); rules_python ≥2.0.0 | Shapes D, F | wave-4a Q2 |

### Group B — the uv, lockfile and PyPI-resolution path

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-07 **pinned** | Treat every `uv.lock` as a migration cost: feed `pip.parse()` a generated `requirements.txt` (from the `lock()` rule or `uv export`), and treat full, workspace-aware `uv.lock` consumption as a ruleset switch to `aspect_rules_py`, never a `rules_python` configuration. | The `lock()` rule runs `uv pip compile` as a build action and never reads an existing `uv.lock`; no combination of `rules_python` flags reaches parity, and the maintainer said as much on the record (2026-02-23). A reviewer seeing "uv" in a Bazel file will assume compatibility that is not there. *Added 2026-09-06*: `lock()` does reach one uv setting the `pip.parse` path cannot — because it auto-detects the `pyproject.toml` among its `srcs` and passes `--project <dir>`, `uv` reads that file's `[tool.uv]` table, `no-build-isolation` included. That covers the **locking** step only; the later wheel build is a separate seam (BZL-PY-33), and conflating the two is the common mistake. | `grep -rn 'load("@rules_python//python/uv:lock.bzl"' --include=*.bazel --include=*.bzl .` and read the matched `lock()` target's `srcs` — if `uv.lock` is not among them, the rule is not reading it, by design. **Empty = no `lock()` usage; not applicable.** A design doc or PR proposing "configure rules_python to read our uv.lock" = FINDING. | MUST | Bazel 8, 9; rules_python 2.3.3 vs aspect_rules_py 1.12.1 stable / 2.0.0-alpha.6 | Shapes D, F | M-J-03 |
| BZL-PY-08 | Never present `pip.parse(uv_lock = ...)` as `uv.lock` parity; on any use, confirm the pinned `rules_python` is ≥2.2.0 and check the lock for workspace/root members the hub will drop. | The attribute's one-line docstring ("primary source for package metadata") reads as complete; the workspace/root-member exclusion lives only in a CHANGELOG bullet, and the attribute is undocumented in every prose doc page as of 2.3.3. | `grep -rn 'uv_lock\s*=' --include=MODULE.bazel .`; for each hit, `grep -c 'virtual = "\."' <the lock>`. **Empty on the first grep = not in use, no finding.** A `uv_lock=` use over a lock containing `virtual`/editable members, without a written acceptance of the gap = FINDING. | SHOULD | Bazel 8, 9 (Bzlmod); rules_python ≥2.2.0 (existence), ≥2.3.0 (members fix) | Shapes D, F | M-J-03, M-J-04 |
| BZL-PY-09 | Never write guidance, an example, or a check that assumes `pylock.toml` (PEP 751) is consumable by `rules_python`. | PEP 751 is final upstream and widely known, so an agent assumes ruleset support followed. Support is tracked under an issue open since 2025-04-18, last touched 2026-07-16, with nothing shipped. | `gh issue view 2787 --repo bazel-contrib/rules_python --json state --jq .state`. **Output `"OPEN"` = the assumption is still false and any guidance asserting support is a FINDING;** `"CLOSED"` = re-verify this rule's dating before trusting it. | MUST | All Bazel majors; rules_python 2.3.3 | Shapes D, F | M-J-04 |
| BZL-PY-10 | Set `project =` explicitly on every uv `lock()` target once the repository holds more than one `pyproject.toml`. | Project-root auto-detection picks the shortest directory path; the ruleset's own doc names the exact failure ("monorepos with multiple independent sub-projects") and the exact fix, and the wrong project is picked silently, with no error. | `find . -name pyproject.toml \| wc -l`; if >1, `grep -B2 -A6 'lock(' **/*.bazel` and confirm each `lock()` carries `project =`. **Empty on the `lock()` grep = no usage; not applicable.** A `lock()` with no `project=` in a multi-`pyproject.toml` repo = FINDING. | MUST | Bazel 8, 9 (Bzlmod only — `lock()` is bzlmod-only); rules_python 2.3.3 | Shapes D, F | M-J-05 |
| BZL-PY-33 | Never assume a `pip.parse` hub can build an sdist-only dependency hermetically: before adding a package with no matching wheel, either pin a pre-built wheel, set `download_only = True` and choose a package that has one, or accept an out-of-band build — and never diagnose the failure as a Bazel sandboxing bug. | `pip.parse`'s repository rule shells out to `pip wheel --no-deps` (`whl_installer.py:61-67`) running under the bare hermetic interpreter, in the loading phase, with no C/C++ toolchain wired into `PATH` and no declared exec-toolchain dependency to give it one — so an sdist whose `setup.py build_ext` needs a compiler fails with `error: command 'clang' failed: No such file or directory` (#1463). There is no PEP 517 build-as-a-Bazel-action: #2410 has been open since 2024-11-14 and inactive since 2026-01-20. `extra_pip_args = ["--no-build-isolation"]` reaches this pip invocation mechanically but changes nothing, because "the current environment" it then builds in is that same bare interpreter, which carries no `setuptools`/`wheel`/`cython`. | On a `pip.parse` failure: `grep -nE "Failed to build\|did not run successfully\|command '.*' failed" <the bazel error log>` — a hit alongside a wheel-build step confirms this root cause, not a sandbox or hermeticity defect. **Empty on that grep = a different failure mode; do not apply this rule.** Preventively: `grep -n 'download_only' MODULE.bazel` and, for each requirement with no `--only-binary` guarantee, check PyPI for a wheel matching the target platform. A repo with no `pip.parse` at all = not applicable. | MUST | Bazel 8, 9 (Bzlmod); rules_python 2.3.3 (mechanism unchanged since the `whl_installer` path existed) | Shapes D, F | wave-4a Q2 |
| BZL-PY-11 | Pair every uv `lock()` target with an explicit drift-check test (`diff_test` from `bazel_skylib` over its `out`). | Unlike `compile_pip_requirements`, `lock()` auto-creates **no** test target; a stale `requirements_lock.txt` next to a changed `pyproject.toml` goes undetected until resolution breaks somewhere downstream. | For each `lock(name = X, ...)`: `bazel query 'tests(//...)' \| grep "${X}"`, or find a `diff_test` referencing `X`'s `out`. **Empty = FINDING** (no drift check for this lock target). | SHOULD | Bazel 8, 9 (Bzlmod); rules_python 2.3.3 | Shapes D, F | M-J-05 |

### Group C — toolchain-selection flags and platform names

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-12 | Write `musl` — never `muslc` — as a `py_linux_libc` flag value. | `LibcFlag.MUSL = "musl"` is the enum; `rules_python`'s own `docs/howto/multi-platform-pypi-deps.md` example and its 1.0.0 CHANGELOG entry both write `muslc`. A `config_setting` copied verbatim from either compiles and silently never matches. The same doc's CLI example gets it right — it disagrees with itself. | `grep -rn 'py_linux_libc.*muslc' --include=*.bazel --include=*.bzl .`. **Empty = pass.** Any match = FINDING. | MUST | Bazel 8, 9; rules_python ≥1.0.0 (`py_linux_libc` + musl variants); `py_freethreaded` separately needs ≥0.39.0 and a Python ≥3.13 build | Shapes D, F | — |
| BZL-PY-13 | Document the platform-naming convention beside `pip.default` once any platform name carries more than three `_`-separated segments. | The ruleset's doc stops at `{os}_{cpu}{threading}` and hands every further axis (libc, CUDA, accelerator) to the adopter with no structure; ad hoc names past that point are unreadable and unreviewable. The Python version is deliberately a separate axis, so N platforms × M versions needs N `pip.default` declarations reused across M `pip.parse` calls. | Reading heuristic: count `_`-separated segments in each `pip.default(platform = ...)` value. **More than three segments with no adjacent comment or doc block explaining the convention = FINDING.** Not a strict grep; no empty-output reading applies. | SHOULD | Bazel 8, 9 (Bzlmod); rules_python 2.3.3 | Shapes D, F | M-J-11 |

### Group D — bootstrap and `sys.path`

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-14 | Treat `system_python` as the bootstrap default on every platform, and treat any Windows-targeted config setting `--bootstrap_impl=script` as inert. | `script` was announced in 0.33.0 as becoming the default "in a subsequent release" and never did — a roadmap sentence an agent repeats as settled fact. The flag's own `select()` force-overrides to `system_python` under `:_is_windows` unconditionally, so a Windows `.bazelrc` line setting `script` is dead configuration, not a bug to "fix" toward working. | Read `build_setting_default` for `//python/config_settings:bootstrap_impl` in the *installed* version's `python/config_settings/BUILD.bazel`, or run `bazel config` against a `py_binary`. **Absence of any `--bootstrap_impl` line in `.bazelrc` reads "default = `system_python`", never "undefined".** | MUST | Bazel 8, 9; rules_python ≥2.0.0 (venv default), flag since 0.33.0 | Shapes D, F | M-J-06 |
| BZL-PY-15 | Route any workflow that needs `PYTHONSAFEPATH` inherited or disabled per invocation through `--bootstrap_impl=script`, and describe the `system_python` gap as **stalled**, never as unaddressed. | The override plumbing is `script`-only and has been since 0.35.0; under the default `system_python`, setting `PYTHONSAFEPATH=` silently does nothing. Suggesting it as a universal fix produces a REPL or debugger session whose import-path behaviour differs from the shipped binary. *Corrected 2026-09-06*: this is not silence. Issue #2060 (open since 2024-08-15) carries an explicit maintainer ask to extend the fix to `system_python`; PR #2122 would have generalised it via the `-P` interpreter flag across **both** bootstraps, drew a second maintainer's "+1" on 2025-05-19, and was closed **unmerged** on 2025-10-22 after 14 months, blocked on Bazel-6/`py_runtime` compatibility and the version-undetectable toolchain. A future revival is plausible; "settled forever" overclaims. | `grep -rn 'bootstrap_impl' tests/bootstrap_impls/BUILD.bazel` in the pinned `rules_python` and confirm `inherit_pythonsafepath_env_test` is registered under `script` only. **Empty for `system_python` reads "unsupported", not "merely untested".** A target depending on this behaviour with no `script` opt-in = FINDING. Before repeating the *status*, re-read it: `gh api repos/bazel-contrib/rules_python/issues/2060 --jq .state` (`"OPEN"` = gap stands) and `gh api repos/bazel-contrib/rules_python/pulls/2122 --jq '.state,.merged'` (`closed`/`false` = still unmerged; anything else = re-date this rule). | MUST | Bazel 8, 9; rules_python ≥0.35.0, still `script`-only at 2.3.3 | Shapes D, F | M-J-06 |
| BZL-PY-16 | Audit every `imports =` entry for a basename collision before merging it, and allow a `../` escape only where Gazelle generated it from a declared `# gazelle:python_root`. | `imports` paths are transitive to every consumer and land in the "user" band of `sys.path` — ahead of runtime site-packages under both bootstraps — so a directory sharing a name with a PyPI package or with another `imports` entry wins silently: a wrong module, never an ImportError. A hand-written `../..` adds an ancestor (up to the repo root), multiplying that surface; Gazelle emits the same shape deliberately and narrowly. | `grep -rn 'imports\s*=\s*\[' --include=BUILD.bazel --include=BUILD .`; for each hit resolve the contributed basename per the attribute's own path math and diff it against (a) every PyPI top-level import reachable by the same binary and (b) every other `imports` basename in the same transitive closure. Then `grep -rn 'imports\s*=\s*\[.*"\.\./' --include=BUILD.bazel --include=BUILD .`. **Empty on both = pass.** A collision, or a hand-written `../` entry with no `python_root` and no justification comment, = FINDING. | SHOULD (MUST once a first real collision is found in the repo) | Bazel 8, 9; rules_python any (order as of ≥1.7.0 for `system_python`) | Shapes B, D, F | M-J-07 |

### Group E — precompiling

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-17 **pinned** | Leave precompiling off unless a cold-start problem has been measured, and never recommend it without naming the `exec_properties` caveat and the same-`srcs` audit. | `--precompile=auto` resolves to `disabled` in the flag's effective-value function — "auto" is not a maybe. Runfiles count and size roughly double, one of the three named caveats has an open two-year tracker, and the ruleset itself treats it as an advanced per-target opt-in (`pyc_collection`), not a broad recommendation. | Reading heuristic on the shipped rule or skill text itself: `grep -n 'exec_properties' <the text>` adjacent to any precompiling recommendation. **A precompiling recommendation with no `exec_properties` mention within it = FINDING.** For the repo: `grep -rn 'precompile' .bazelrc*` — **empty = pass (default holds)**. | MUST | Bazel 8, 9 (precompiling floor is Bazel 7+ with Pystar); rules_python 0.33.0–2.3.3 | Shapes D, F | M-J-08 |
| BZL-PY-18 | Before enabling precompiling anywhere in a build, prove that no two Python targets share `srcs` while differing in `exec_properties`. | Two targets sharing source files with different `exec_properties` produce an `ActionConflictException` on the generated `.pyc` — rules_python#2445, filed 2024-11-26, still open at its last comment 2025-09-17, and reported broader than first scoped (any `args`/env-driven variant pair). *Argued-tier mitigation, not a rule*: one maintainer comment and one corroborating report suggest scoping each `exec_properties` key to its owning exec group (`cpp_link.mem`, not `mem`) where the two targets genuinely need different properties; the docs' own advice ("make the exec properties the same") is often impossible. | For every `.py` file: `bazel query "kind('py_binary\|py_library\|py_test', same_pkg_direct_rdeps(//path:file.py))"`, then compare `exec_properties` across the owning targets. **Empty (no file owned by more than one target) = pass.** Any shared-`srcs` pair with differing `exec_properties`, with precompiling enabled, = FINDING. A `bazel build //...` smoke pass over both targets reading "no ActionConflictException" is the fallback confirmation. | MUST (once precompiling is enabled anywhere) | Bazel 8, 9; rules_python ≥0.33.0 | Shapes D, F | M-J-08, M-J-09 |

### Group F — Python's Bazel-action-cache surface

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-19 | Pin the Python action environment for cache correctness: `PYTHONHASHSEED=0` on any Python-backed build-time tool that writes output, and an explicit `RULES_PYTHON_PYCACHE_DIR` on every CI leg sharing a remote cache or RBE. | `rules_python` hardcodes `PYTHONHASHSEED=0`/`PYTHONNOUSERSITE=1`/`PYTHONSAFEPATH=1` for its *own* `PyCompile` action and nothing for a user-authored genrule tool or code generator; unpinned hash randomisation makes dict/set-ordered output a non-pure function of the action's declared inputs, which a remote cache cannot detect and will happily serve back either way. Unset, `RULES_PYTHON_PYCACHE_DIR` falls back to a host-dependent search (`XDG_CACHE_HOME` → `TMP`/`TEMP` → platform temp), so runtime `__pycache__` writes are undeclared outputs that can leak stale bytecode across invocations on a persistent worker. | `grep -rn 'PYTHONHASHSEED' $(bazel query 'kind(genrule, //...)' --output=location \| cut -d: -f1 \| sort -u)` and `grep -rn 'RULES_PYTHON_PYCACHE_DIR' .bazelrc*`. **On a repo with any Python-backed build tool or any shared-cache CI leg, EMPTY reads FINDING — "not proven safe", not "pass".** Empty on a repo with no Python build tool and no shared cache = not applicable. | SHOULD | Bazel 8, 9; rules_python any (generic Python behaviour the ruleset pins only for itself). General taxonomy owned by `BZL-HERM` (`bazel-hermeticity-determinism/action-nondeterminism-taxonomy.md`) | Shapes D, F | M-J-14 |

### Group G — test targets (one `grep` of `BUILD`/`BUILD.bazel` settles 20-24)

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-20 | Give every `py_binary`, `py_library` and `py_test` its own explicit `load("@rules_python//python:defs.bzl", ...)` (or the per-rule `python:py_test.bzl` form). | Bazel 9.0 defaults `--incompatible_autoload_externally` to empty, deleting the compatibility allowlist that let Bazel 8.x resolve a bare `py_*` symbol; code written from pre-2026 training data compiles on 8 and fails at load time on 9 with an undefined-symbol error. **Measured 2026-09-06**, one trivial workspace per rule kind: a bare `py_library` builds clean on 8.7.0 (exit 0 — the allowlist covers it) and fails on 9.2.0 with `name 'py_library' is not defined (did you mean 'cc_library'?)`; adding the `bazel_dep` plus the `load()` makes it pass on **both** majors with no other change. The suggestion in that error is actively misleading — and `cc_library` is the one rule kind that instead gets a purpose-built `_removed_rule_failure` naming the fix and `buildifier --lint=fix`, so an agent that learned the friendly message from a C++ example will not recognise the Python one. | `grep -L 'load(.*py_test\|load(.*py_binary\|load(.*py_library' $(grep -rl 'py_test(\|py_binary(\|py_library(' --include=BUILD.bazel --include=BUILD .)`. **Empty = pass.** Any listed file = FINDING regardless of the Bazel major targeted. | MUST | Bazel 9 (hard failure, measured at 9.2.0), Bazel 8 (works, non-portable, measured at 8.7.0); rules_python any. General rule owned by `BZL-FLAG`; this is the Python instance | Shapes D, F | — |
| BZL-PY-21 | Never point a `py_test`'s `srcs` at a pytest-style file without a pytest entrypoint — a wrapper's `main()` or a `py_console_script_binary`-based macro. | Native `py_test` runs `unittest` discovery inside its `srcs`; on a file with `def test_` functions and no `TestCase`, the target reports **green forever, having executed nothing**. A maintainer states it in exactly those terms on the still-open request to have Gazelle generate the shim. | For every `py_test`, confirm its entrypoint imports and calls a pytest wrapper's `main()`, or that the target came from a `pytest_test` macro. Cross-check: any `.py` file containing `def test_` whose owning `py_test`'s `deps` name no pytest wrapper. **A `def test_` file with no pytest wrapper in the owning target's deps = FINDING.** Confirm with `bazel test --test_output=all //target` and read a non-zero collected-test count. | MUST | All Bazel majors; rules_python any | Shapes B, D, F | M-J-12 |
| BZL-PY-22 **pinned** | Standardise new Bazel-Python test targets on `pytest-bazel` at an exact PyPI version (≥0.1.6), not the legacy `rules_python_pytest` macro. | `rules_python_pytest`'s own README calls itself a stopgap slated for deprecation; `pytest-bazel` is the actively released successor built explicitly to unify it with `aspect_rules_py`'s pytest template, and it carries the correct `--test_filter`, `--test_runner_fail_fast` and exit-code-5 handling. `rules_python` ships no first-party pytest integration at 2.3.3, so this is a project choice, stated as one. | `grep -rn 'rules_python_pytest' requirements*.txt pyproject.toml uv.lock MODULE.bazel`. **Empty = pass.** A hit in a new or unmigrated target = FINDING to migrate. | SHOULD (CONSIDER for an existing repo already standardised on `rules_python_pytest` with a working suite) | All Bazel majors; pytest-bazel ≥0.1.6, rules_python 2.3.3 | Shapes B, D, F | M-J-12 |
| BZL-PY-23 | Add a `pytest-shard` runtime dependency to any `py_test` that sets `shard_count > 1`. | pytest-bazel touches `TEST_SHARD_STATUS_FILE` only when `pytest_shard` is importable, and Bazel's test-encyclopedia contract **fails** a sharded test whose status file is never touched — a hard failure whose cause is invisible from the `shard_count` line. | For every `py_test` with `shard_count` set, grep its transitive `deps` for `pytest_shard`/`pytest-shard`. **Empty match on a sharded target = FINDING.** No sharded targets = not applicable. | MUST | All Bazel majors; pytest-bazel ≥0.1.6. Sizing and sharding *policy* is owned by `BZL-TEST` | Shapes B, D, F | — |
| BZL-PY-24 | List every sibling and ancestor `conftest.py` in a hand-maintained `py_test`'s `srcs`/`data`/`deps`. | pytest-bazel does no conftest plumbing; it relies on pytest's own discovery inside the sandbox, which contains only what Bazel staged. A missing conftest fails at collection with a fixture error that reads like a test bug. Gazelle auto-wires siblings since rules_python 0.14.0 and **ancestors only since 1.9.0** — below that pin, ancestor wiring is absent regardless of the directive. | For each hand-written `py_test`, confirm every `conftest.py` between the test file and the Python root appears in `srcs`/`data`/`deps`; if Gazelle generates the target, confirm the plugin pin is ≥1.9.0 (`grep -n 'rules_python_gazelle_plugin' MODULE.bazel`). **A missing ancestor conftest, or a <1.9.0 pin with a two-tier conftest layout, = FINDING.** Not applicable where Gazelle ≥1.9.0 generates the target. | MUST (hand-maintained BUILD files); N/A under Gazelle ≥1.9.0 | All Bazel majors; rules_python ≥0.14.0 (siblings), ≥1.9.0 (ancestors) | Shapes B, D, F | M-J-12 |
| BZL-PY-25 | Resolve a separately-built binary under test through `data = [":the_binary"]` plus `@rules_python//python/runfiles`, using `Runfiles.CreateOrRaise()`; never through a fixed relative-path fallback. | The env-var-plus-fixed-path pattern needs an out-of-band build step to populate `test/bin/<name>` and silently runs a stale binary when that step is skipped; runfiles resolution is hermetic, platform-independent, and fails loudly. `Runfiles.Create()` returns `None` outside Bazel, so a bare `Create().Rlocation(...)` chain becomes an `AttributeError` the moment someone runs the file under plain pytest. An env-var **override** with no path fallback stays a legitimate escape hatch during a dual-build-system migration. | `grep -rn 'os.environ.get(".*_COMMAND"' <test tree>` and `grep -rn 'Runfiles.Create()' <test tree>`. **Empty on both = pass.** An env-var read paired with a fixed relative path, or a `Create()` with no `None` check, = FINDING. Secondary: if the path is passed as a literal test argument instead, `grep -rn '\$(location\|\$(rootpath' --include=BUILD.bazel --include=*.bzl .` — any hit is a FINDING to convert to `$(rlocationpath ...)`, because Bazel's own make-variables reference calls `location` legacy and ambiguous and names `rlocationpath` as the preferred form. **Corrected 2026-09-06**: this clause used to rest on `rootpath` needing `--enable_runfiles`, which is off by default on Windows. Bazel's default is indeed `auto` (off on Windows) identically at 8.7.0 and 9.2.0 — but `rules_python` ≥1.9.0 forces `--enable_runfiles=true` for `py_binary`/`py_test` on Windows through a rule-level transition, so for Python targets at the 2.3.3 pin that premise no longer holds. The recommendation stands on the make-variables reference alone. | MUST | All Bazel majors; `@rules_python//python/runfiles` (bundled, any recent version). Windows runfiles forced for `py_*` since rules_python 1.9.0 (source-confirmed, no Windows runner exercised) | Shapes B, F | M-I-15 |

### Group H — Gazelle Python plugin

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-26 | Create and commit `gazelle_python.yaml` (an empty `touch` is enough) before the first manifest run, and wire `gazelle_python_manifest.test` into CI — not just `.update` into a local workflow. | The manifest-update target declares the file as an input, so its absence is a `missing input file` build failure rather than a first-run bootstrap — tracked, and still unfixed, as rules_python#1156; and manifest drift against `requirements.txt`/`uv.lock` is caught **only** by the `.test` target, so skipping it in CI makes drift silent until a `bazel run //:gazelle` produces surprising BUILD diffs. This target is the *manifest*-freshness gate only; BUILD-file freshness is a second, separate target (BZL-PY-37). | `test -f gazelle_python.yaml` (or the `python_manifest_file_name` value) in every directory a `gazelle_python_manifest` targets; then `bazel query 'attr(name, ".*gazelle_python_manifest.test", //...)'` and grep the CI workflow for that label. **A missing file = FINDING; empty query output, or a target absent from CI, = FINDING.** No Gazelle in the repo = not applicable. | MUST (for any repo adopting the plugin) | Bazel 8, 9; rules_python_gazelle_plugin any version | Shapes D, F | M-J-13 |
| BZL-PY-27 | Pin `rules_python_gazelle_plugin` to ≥2.3.0 whenever a registered toolchain includes Python 3.13 or 3.14, and bump `rules_python` to ≥1.5.0 in the same change. | Below plugin 2.3.0 the extension falls back to the Python **3.11** stdlib list for `python_version` 3.13/3.14, so `telnetlib` (removed in 3.13) is still treated as stdlib and `compression.zstd` (added in 3.14) is treated as third-party — wrong `deps`, generated with no error. Plugin 2.3.0 is a BREAKING release that branches on the `is_python_3.14` config setting only `rules_python` ≥1.5.0 defines; mismatched pins fail at analysis time. | `grep -n 'rules_python_gazelle_plugin\|bazel_dep(name = "rules_python"' MODULE.bazel`, cross-checked against every `python.toolchain(python_version = ...)`. **A plugin pin <2.3.0 with a 3.13/3.14 toolchain = FINDING; a plugin ≥2.3.0 with `rules_python` <1.5.0 = FINDING.** Neither condition present = not applicable. | MUST (when either condition holds) | Bazel 8, 9; plugin ≥2.3.0 (2026-08-07) with rules_python ≥1.5.0 | Shapes D, F | M-J-13 |
| BZL-PY-28 | Use the `gazelle_python_manifest` macro's `requirements =` attribute against `rules_python` ≤2.3.3; `lockfiles =` does not exist yet. | The `lockfiles` rename — which is where the docs explicitly document `uv.lock` acceptance — is unreleased, present only in `main`-branch docs under a `VERSION_NEXT_FEATURE` marker. Copying the current doc page against a 2.3.3 pin fails with an unknown-parameter error. The attribute is format-agnostic either way (integrity hash only), so `requirements = "//:uv.lock"` already works under the current name — and is **not** evidence that `pip.parse` resolves from that lock (see BZL-PY-07). | `grep -n 'lockfiles' MODULE.bazel **/BUILD.bazel` against the pinned version; confirm the parameter name with `curl -sL https://raw.githubusercontent.com/bazel-contrib/rules_python/<pinned-tag>/gazelle/manifest/defs.bzl \| grep -n 'def gazelle_python_manifest' -A5`. **Empty = pass.** A `lockfiles =` use at ≤2.3.3 = FINDING. | MUST | Bazel 8, 9; rules_python ≤2.3.3 (until the rename ships) | Shapes D, F | — |
| BZL-PY-29 | Set `# gazelle:python_root` in the package that is the real import root whenever Python lives under a subdirectory rather than the workspace root. | Omitting it makes Gazelle treat the repo root as the import root and generate wrong `imports` attributes (or none), so absolute imports break. This is also the only sanctioned source of a `../` `imports` entry (see BZL-PY-16). | `grep -rn 'gazelle:python_root' <python-source-root>/BUILD.bazel` when the Python tree does not start at the workspace root. **Empty = FINDING.** Python at the workspace root = not applicable. | MUST (shape F monorepos where Python is a subtree) | Bazel 8, 9; plugin any version | Shape F | — |
| BZL-PY-30 **pinned** | Stand the Gazelle Python plugin up only above roughly 30-50 hand-maintained Python targets in one project; below that, hand-write `py_library`/`py_test`. Count targets the repo's `# gazelle:python_generation_mode` would actually produce, not source files. | The fixed cost is three `bazel_dep`s, a `modules_mapping`/`gazelle_python_manifest` pair, a committed manifest, a `gazelle_binary`, and **two** CI-wired test targets — plus three failure surfaces (BZL-PY-26, BZL-PY-27, BZL-PY-37) — before one BUILD file is generated. No source states a threshold; this number is this project's judgment, which is why the rule is CONSIDER and not MUST. The generation-mode clause is likewise judgment, not a sourced fact: `file` mode emits one target per source file and `project` collapses a whole subtree, so the same tree lands on either side of the line depending on a directive — worth naming because the count is the input to the only threshold this family has. | Reading heuristic: `bazel query 'kind("py_.* rule", //...)' \| wc -l` once targets exist, or a source-file count adjusted for the declared generation mode (`grep -rn 'gazelle:python_generation_mode'`; absent = the `package` default) as a proxy before they do. **Below the threshold with a Gazelle pipeline present = a finding to reconsider, never a gate to enforce.** | CONSIDER | All Bazel majors; plugin any version (modes `file`/`package`/`project` present at 2.3.3) | Shapes D, F | — |
| BZL-PY-37 | Wire **two** Gazelle gates into CI, not one: `bazel test //:gazelle_test` (BUILD-file freshness, from `@gazelle//:def.bzl`'s `gazelle_test` macro against your `gazelle_binary`) *and* `bazel test //:gazelle_python_manifest.test` (manifest freshness, BZL-PY-26). Never report one as covering the other. | Measured across four ecosystems' own canonical examples — bazel-gazelle's root `BUILD.bazel` at v0.54.0, `rules_python` 2.3.3's `installation_and_usage.md`, gazelle_rust's `example/BUILD.bazel`, and Aspect's `aspect_gazelle()` macro — **none** wires `gazelle_test`; every one ships only the `gazelle()`/`sh_binary` half, so following the install doc leaves BUILD drift uncaught by `bazel test //...`. Python is the only language in that survey with two distinct freshness failure modes: a stale manifest (wrong third-party resolution) and stale BUILD files (targets that no longer match sources). The macro is identical across languages; nothing about the rules_python plugin supplies it. | `bazel query 'kind("sh_test", //:*)'` and confirm a `gazelle_test`-produced target exists, then `bazel query 'attr(name, ".*gazelle_python_manifest.test", //...)'`; grep the CI workflow for **both** labels. **Empty on either query, or either label absent from CI, = FINDING** — and empty on the first specifically reads "no BUILD-freshness gate", never "the manifest test covers it". No Gazelle in the repo = not applicable. | MUST (for any repo adopting the plugin) | Bazel 8, 9; bazel-gazelle any version shipping `gazelle_test` (v0.54.0 read); rules_python_gazelle_plugin any. General `gazelle_test` rule owned by `BZL-ARCH-12`; this is the Python instance | Shapes D, F | wave-4a Q7 |

### Group I — typing, editors, entry points and coverage (added 2026-09-06)

| ID | Rule | Rationale | Verification (and how EMPTY reads) | Severity | Applies to | Settles |
|---|---|---|---|---|---|---|
| BZL-PY-31 **pinned** | Gate Python types in CI with `rules_mypy`'s aspect, wired through `.bazelrc` (`build --aspects=//tools:aspects.bzl%mypy_aspect`, `build --output_groups=+mypy`) — never with a hand-rolled `py_test` wrapper, and never with `bazel-mypy-integration`. | `rules_python` ships no first-party type-check story and has scoped it out (#1401, open since 2023-09-04). The aspect *is* the gate: a `bazel build //...` with those two lines fails on any `py_binary`/`py_library`/`py_test` mypy rejects, and it needs no materialised venv because it resolves imports from providers already in the dependency graph. `bazel-mypy-integration` is the obvious hit for "bazel mypy" in any training corpus and its README still reads as working software — but the repo is archived (`archived: true`, `pushed_at: 2025-05-08`) and its own maintainers redirect to `rules_mypy`. Pinned because choosing `rules_mypy` is a project decision; the "not the archived one" half is a fact. | `grep -rn 'bazel-mypy-integration\|mypy_integration' MODULE.bazel WORKSPACE*` — **any hit = FINDING to migrate**. Then `grep -n 'rules_mypy' MODULE.bazel` and `grep -rn 'mypy_aspect\|output_groups=+mypy' .bazelrc*`. **Empty on the first with a `rules_mypy` `bazel_dep` and both `.bazelrc` lines = pass.** Empty on *all* of them = no type-check gate configured: report it as a gap, not a violation. Confirm the archive state live before repeating it: `gh api repos/bazel-contrib/bazel-mypy-integration --jq .archived`. | MUST | Bazel 8, 9; rules_mypy v0.41.0 (needs rules_python ≥1.1.0); rules_python 2.3.3 ships no alternative | Shapes D, F | wave-4a Q1 |
| BZL-PY-32 | Never present a `.venv`/`.venv_link` target, or any IDE venv materialisation, as a `rules_python` mechanism — it belongs to `aspect_rules_py`, and adopting it is a ruleset switch, not a flag. | The literal phrase `bazel run //target.venv` appears inside a `rules_python` issue thread, written by Aspect Build's founder about *his own ruleset*; an agent skimming that thread will repeat it as `rules_python` behaviour, where it does nothing. `rules_python` has no `.venv`-materialising target, no `ide.md`/`venv.md` doc page, and no CHANGELOG entry introducing one. The two real paths both cost something worth stating up front: `aspect_rules_py` is a whole-ruleset switch whose IDE default *differs by track* (auto-emitted `.venv` on stable 1.12.1, opt-in `expose_venv_link = True` on the 2.0.0-alpha line), and `cedarai/rules_pyvenv` has no `MODULE.bazel` and no BCR entry — adding it to a Bzlmod-only repo means a `WORKSPACE`-era `http_archive`, which BZL-PY-05 already calls a finding. No maintained Pyright-specific Bazel integration exists in either direction. | `grep -n 'rules_pyvenv\|expose_venv_link\|aspect_rules_py' MODULE.bazel` before writing any venv guidance, and name the ruleset the answer actually belongs to. **Empty = no IDE-venv tooling wired: a gap to flag, never a violation.** A `rules_pyvenv` `http_archive` in a repo that has a `MODULE.bazel` = FINDING (BZL-PY-05). Guidance that attributes a `.venv` target to `rules_python`, or cites "the aspect_rules_py IDE mechanism" without naming which major, = FINDING. | MUST | Bazel 8, 9; rules_python 2.3.3 (no mechanism), aspect_rules_py 1.12.1 / 2.0.0-alpha.6, rules_pyvenv v1.4 | Shapes D, F | wave-4a Q1 |
| BZL-PY-35 | Before wiring `py_console_script_binary`, read the target wheel's own `entry_points.txt` and confirm the console script is a plain `module:attr` — no dotted attribute chain, no `extras` marker. | The macro never reads `pyproject.toml`. It parses the wheel's `dist-info/entry_points.txt` with `configparser` and then does `attr, _, _ = entry_point.partition(".")` — only the first dotted segment of the right-hand side survives, so `pkg.cli:App.run` silently generates a call to `App`, not `App.run`. Extras (`pkg[extra]`) are explicitly unhandled, per the code's own `# TODO` referencing #1383, still present at 2.3.3. The `pyproject.toml` confusion has a second, debugging-time cost: editing `[project.scripts]` and rebuilding changes nothing until the wheel is rebuilt and the hub re-resolved, because the backend performed that translation at wheel-build time. | Read the fetched wheel, not the workspace — this text is generated-repo content: `bazel build @pypi//<pkg>:dist_info` then grep the `[console_scripts]` section of the produced `entry_points.txt` for a second `.` after the `:` or a `[` before it. **Either = FINDING (the macro will silently mis-wire).** All single-segment with no extras = pass. **A workspace-only grep of `pyproject.toml` proves nothing here** and is itself the mistake this rule exists to catch. | MUST (wherever the macro is used) | Bazel 8, 9; rules_python ≥0.26.0, unchanged in this shape at 2.3.3 | Shapes D, F | wave-4a Q3 |
| BZL-PY-36 | On any Python coverage leg, set `python.toolchain(configure_coverage_tool = True)` and confirm the interpreter Bazel actually resolved has a bundled coverage wheel before trusting a number; where it does not, wire `py_runtime.coverage_tool` by hand. | The bundled wheel set covers CPython **3.9-3.14 and not every platform within that range** — the ruleset's own words. When the resolved interpreter has no matching wheel, `configure_coverage_tool = True` produces no coverage tool and `bazel coverage` "emits empty lcov data", silently, with only an analysis-time `py_runtime` warning as a trace. A green test suite reporting 0% is indistinguishable at a glance from a correctly-measured 0%, and this is the third distinct cause of an identical empty report — the other two (an auto-computed `--instrumentation_filter` anchored to the test's own package, and a C++/clang `.profdata` blob) belong to `BZL-TEST`. Note also that the collector runs inside the test's own spawn and `size`/`timeout` budget for every language, so a large instrumented set can turn a passing test into a timeout. | `grep -n 'configure_coverage_tool' MODULE.bazel` — **empty on a repo with a coverage leg = FINDING**; empty on a repo with no coverage leg = not applicable. Then run the leg once and `grep -c '^DA:' bazel-out/_coverage/_coverage_report.dat`: **0 = FINDING** (nothing instrumented — check this rule's wheel condition *and* `BZL-TEST`'s filter condition before concluding which). A nonzero count with every record reading `,0` is a real coverage gap, not a tooling bug. | MUST (when a Python coverage leg exists) | Bazel 8, 9; rules_python ≥0.18.1 for the attribute, wheel range read at 2.3.3. Coverage mechanics and the report-reading verification are owned by `BZL-TEST` | Shapes D, F | wave-4a coverage Q1 |

## Applied to rules_ocx and the fleet

**Cannot exhibit — the one Bazel repository has no Python at all.** `rules_ocx`
declares five `bazel_dep`s and `rules_python` is not among them
(`/home/mherwig/dev/rules_ocx/MODULE.bazel:13-18`: `bazel_skylib`, `platforms`,
`rules_shell`, `stardoc`, `buildifier_prebuilt`). It has zero `py_*` targets —
independently measured at
`bazel-audit/starlark-code-shape.md:293` ("zero `cc_*`, `py_*`, `js_*`/`ts_*`,
or `rust_*` rule usage anywhere") — and its only two occurrences of the string
"python" are literals in a binary-name-shape fixture list
(`/home/mherwig/dev/rules_ocx/ocx/tests/launcher_test.bzl:483`,
`/home/mherwig/dev/rules_ocx/ocx/private/repo_utils.bzl:215`). There is no
`WORKSPACE` or `WORKSPACE.bazel` file. **All thirty-seven rules are
structurally unexhibitable in shape A today.** What the fleet would have to build to exhibit
this family: a `MODULE.bazel` carrying `bazel_dep(name = "rules_python", ...)`
plus a `python.toolchain()` call and at least one `py_binary`/`py_test` target
— which nothing in the fleet has, and which the frame's owner-question 1 (no
pilot assumed) leaves open.

**Satisfied, by accident rather than by rule.**

- **BZL-PY-05** — no `WORKSPACE`/`WORKSPACE.bazel` exists in `rules_ocx`, so
  there is no WORKSPACE-era Python macro to find.
- **BZL-PY-12** — zero occurrences of `muslc` (or of `py_linux_libc`) anywhere
  in fleet Starlark; nothing uses the flag.
- **BZL-PY-25's Windows precondition** — `rules_ocx/.bazelrc:5-6` already sets
  `startup --windows_enable_symlinks` and `common:windows --enable_runfiles`,
  which are exactly the two settings `rules_python` 2.0.0's venv model and
  `$(rootpath)` respectively require on Windows. Set for `sh_test` reasons, not
  for Python, but correct for both. *Refined 2026-09-06*: the
  `--enable_runfiles` half would be redundant for `py_binary`/`py_test` at the
  2.3.3 pin, which force it on Windows through their own rule-level transition
  (≥1.9.0); it still matters for the repo's `sh_*` targets, which have no such
  transition, and the `--windows_enable_symlinks` half matters for both
  (2.0.0 lists it as *required*).
- **BZL-PY-35** — `ocx-indexbot/pyproject.toml:36-37` declares
  `indexbot = "ocx_indexbot.cli.main:main"`, a single-segment `module:attr`
  with no extras, built with hatchling. It is the fleet's one
  `[project.scripts]` entry and the one shape `py_console_script_binary`
  handles correctly — so the rule passes, for the fleet's only instance, by
  the entry point happening to be simple.

**Would violate on day one of any migration — four live instances.**

1. **BZL-PY-02 (the `pyproject_toml=` clause) — violated by all seven Python
   projects.** Every one declares `requires-python` as a `>=` range, never an
   exact `==X.Y.Z` pin: `grimoire/test/pyproject.toml:4` (`>=3.10`),
   `arcana/nox/pyproject.toml:6` (`>=3.11`),
   `ocx-sdk-python/pyproject.toml:8` (`>=3.12`),
   `ocx-indexbot/pyproject.toml:8` (`>=3.12`),
   `index/bot-tools/pyproject.toml:22` (`>=3.12`),
   `ocx-mirror-sdk/pyproject.toml:8` (`>=3.13`),
   `ocx/test/pyproject.toml:8` (`>=3.13`). The live-wiring attribute resolves
   nothing for any of them, and the first half of the rule bites too: four
   distinct floors means four `python.toolchain()` registrations, a version
   nothing in-repo currently states
   (`bazel-audit/fleet-bazel-readiness.md:142`).
2. **BZL-PY-08 — violated by three of the seven locks.** `ocx/test/uv.lock:258-261`
   declares `ocx-tests` with `source = { virtual = "." }`;
   `grimoire/test/uv.lock:38` and `index/bot-tools/uv.lock:277` carry the same
   root-member shape. Those are precisely the packages
   `pip.parse(uv_lock = ...)` stopped exposing at 2.3.0 — so the experimental
   path would silently drop the harness package itself in exactly the three
   projects that are pytest roots rather than installable packages.
3. **BZL-PY-16 — one live collision, resolving correctly today only by
   accident.** `ocx/test/pyproject.toml:17` sets `pythonpath = [".", "src"]`,
   which becomes `imports = [".", "src"]` under Bazel. Both roots contain a
   `scenarios` directory: `ocx/test/scenarios/` (no `__init__.py`, a PEP 420
   namespace portion) and `ocx/test/src/scenarios/__init__.py` (a regular
   package). `import scenarios` resolves to the regular package only because
   PEP 420 defers namespace portions until the whole path is scanned — adding
   an `__init__.py` to `ocx/test/scenarios/` silently flips which module loads,
   with no error either way. `grimoire/test/pyproject.toml:8` sets
   `pythonpath = ["."]`, one entry, no collision.
4. **BZL-PY-25 — violated identically by both harnesses.**
   `ocx/test/conftest.py:211-219` reads `OCX_COMMAND` and otherwise falls back
   to `PROJECT_ROOT / "test" / "bin" / "ocx"`; `grimoire/test/conftest.py:300-305`
   is the same shape with `GRIM_COMMAND` / `test/bin/grim`
   (`bazel-audit/fleet-bazel-readiness.md:170,280`). Both `assert p.exists()`,
   so a missing binary is caught — but only at fixture time, and only if the
   out-of-band `cargo build` ran. This is 2 of 2 harnesses in the fleet.

**Latent, not live.**

- **BZL-PY-19** — no fleet Python project pins `PYTHONHASHSEED` anywhere in
  code (the only fleet-wide occurrence of the string is inside an AI rule
  document, `ocx-indexbot/.claude/rules/python-quality/data-modelling.md`), and
  `bazel-audit/config-inventory.md:313` records action-key determinism as
  having "zero mentions" across the fleet's Bazel-adjacent rules. None of the
  seven runs as a Bazel build-time tool today, so this is a gap that becomes a
  violation on the day one of them does.
- **BZL-PY-21** — the highest-risk migration step in the fleet has no instance
  yet because no `py_test` exists. `ocx/test` (156 test files) and
  `grimoire/test` (67) are pytest roots with `def test_` functions and no
  `unittest.TestCase` entrypoints
  (`bazel-audit/fleet-bazel-readiness.md:138-140`); a naive
  `py_test(srcs = [...])` migration produces two permanently green targets that
  execute nothing.
- **BZL-PY-31 and BZL-PY-32** — `arcana/nox` is the fleet's one strictly-typed
  Python project (`pyproject.toml:71-74`, `[tool.pyright] strict = ["src"]`),
  and it is exactly the project Verdict 12 says should never adopt Bazel. So
  the fleet's only type-check gate sits on the tool with **no** maintained
  Bazel integration, in the one project that will not migrate: on adoption
  anywhere else, the gate would have to be re-authored against `rules_mypy`,
  not ported. Zero fleet occurrences of `rules_mypy`, `rules_pyvenv`,
  `aspect_rules_py` or `bazel-mypy-integration`.
- **BZL-PY-36** — no fleet project configures `bazel coverage` at all (no
  Bazel), so the bundled-wheel condition is untested. Four of the seven
  declare `requires-python >= 3.12` or `>= 3.13`, inside the bundled wheel
  set's 3.9-3.14 range; none is outside it today, which makes this latent
  rather than a day-one violation — and makes a future 3.15 pin the thing that
  turns it live.
- **The local-toolchain `dev_dependency` trap** is shape A's only plausible
  future instance: `rules_ocx` is a library module published to the BCR, and a
  `local_runtime_toolchains_repo` registered there without
  `dev_dependency = True` would take precedence over `rules_python`'s own
  toolchains for every downstream consumer. It is not a rule row (see
  "AI-agent failure modes", item 13) because the fleet has no Python dev
  tooling under Bazel to check it against.

## Applied to the fleet shapes

- **Shape A — Starlark ruleset publishing to the BCR (`rules_ocx`).** Binds
  only if it ever provisions Python for its own dev tooling; today zero
  `rules_python` dependency, so the family is inert. The one rule that would
  bite first is the `dev_dependency` trap above, because a library module's
  toolchain registration leaks to every consumer.
- **Shape B — Rust CLI + Python acceptance harness (`ocx`, `grimoire`,
  `ocx-mirror`, `bob`, `rust-oci-client`).** Binds hardest and most concretely:
  BZL-PY-21 (false-green pytest targets), BZL-PY-24 (two-tier `conftest.py`
  layouts) and BZL-PY-25 (the `<TOOL>_COMMAND` + `test/bin/<name>` seam,
  present in 2 of 2 harnesses) are the entire risk surface of migrating a
  subprocess-driven harness.
- **Shape C — Rust + TypeScript monorepo (`creeptd-ng`).** Does not bind: no
  Python project appears in the fleet's Python inventory for this repo
  (`bazel-audit/fleet-bazel-readiness.md:132-140`).
- **Shape D — Python library or automation (`ocx-sdk-python`,
  `ocx-mirror-sdk`, `arcana/nox`, `index/bot-tools`, `ocx-indexbot`).** Binds
  Groups A, B, H and I in full — toolchain pinning against four distinct
  `requires-python` floors, the `uv.lock`-to-`requirements.txt` path, the
  Gazelle decision, and (added 2026-09-06) the type-check gate, the entry-point
  wiring for `ocx-indexbot`'s console script, and the coverage toolchain.
  `arcana/nox` is the named exception: zero runtime dependencies by contract,
  nothing here applies (Verdict 12) — including its Pyright gate, which has no
  Bazel counterpart to port (BZL-PY-31).
- **Shape E — TypeScript package, extension or Action.** Does not bind; the
  parallel family is `BZL-JS`.
- **Shape F — future polyglot Bazel monorepo (the adopting repo, and
  `rules_ocx`'s own users).** Binds all thirty-seven rules. This is the only
  shape where BZL-PY-13 (platform-name conventions), BZL-PY-29
  (`python_root`), BZL-PY-30 (the Gazelle threshold) and BZL-PY-37 (the two
  Gazelle gates) have anything to grip.

## AI-agent failure modes

Ranked by how often the corpus and the fleet's own shape say it bites. Each
carries the mechanical check that catches it.

1. **A bare `py_binary(...)`/`py_library(...)`/`py_test(...)` with no
   `load()`.** Years of Bazel-7/8 and WORKSPACE-era examples make this the
   default emission; it is a hard load-time failure on Bazel 9. **Check:**
   BZL-PY-20's `grep -L`.
2. **`py_test(srcs = ["test_foo.py"])` assuming pytest discovery works the way
   it does under plain `pytest` or Cargo's `#[test]`.** The target is green
   forever with zero tests run. **Check:** BZL-PY-21, then
   `bazel test --test_output=all //target` and read the collected count.
3. **Asserting a host-PATH fallback under Bzlmod.** The training corpus is
   WORKSPACE-era; the agent will confidently say "no `python.toolchain()` means
   `py_binary` uses whatever `python3` is on PATH." False under Bzlmod, and it
   leads straight to registering the deprecated autodetecting toolchain.
   **Check:** BZL-PY-04's two-step reading heuristic.
4. **Claiming `uv.lock` works, or hallucinating the mechanism.** Three
   variants seen: "rules_python consumes `uv.lock` now"; a
   `pip.parse(pylock = ...)` attribute that does not exist; and a global flag
   (`--experimental_uv_lock`, `--incompatible_uv_native_resolution`) that has
   never existed — the real mechanism is a per-call **attribute**. **Check:**
   BZL-PY-07 and BZL-PY-09; grep `python/private/pypi/extension.bzl` for the
   attribute name before trusting any flag that "sounds right".
5. **Writing WORKSPACE-era `python_register_toolchains()`/`pip_parse()` beside
   an existing `MODULE.bazel`.** The macros still exist, so the snippet looks
   valid and is dead weight or worse. **Check:** BZL-PY-05.
6. **Copying `muslc` out of `rules_python`'s own documentation.** Both a docs
   page and a CHANGELOG entry carry the typo; the resulting `config_setting`
   compiles and silently never matches. **Check:** BZL-PY-12 — and cross-check
   literal enum values against `python/private/flags.bzl`, never against prose.
7. **Asserting `script` is the current bootstrap default.** The 0.33.0
   changelog sentence "It will become the default in a subsequent release"
   reads, out of context, like settled fact. It never happened. **Check:**
   BZL-PY-14 — read `build_setting_default` in the *installed* version.
8. **Recommending precompiling as a free performance win** ("supported since
   0.33.0"), omitting that the flag's own default resolves to `disabled` and
   that one caveat has an open two-year tracker. **Check:** BZL-PY-17 and
   BZL-PY-18.
9. **Writing `gazelle_python_manifest(lockfiles = "//:uv.lock", ...)` from the
   current docs against a 2.3.3 pin.** The rename is documented on `main` and
   unreleased. **Check:** BZL-PY-28 — read `defs.bzl` at the pinned tag.
10. **Reaching for `imports = ["../.."]` as a port of `sys.path.append`.** An
    agent migrating a non-Bazel project will do this to "make it work like
    before," not knowing the attribute is transitive to every consumer and
    lands ahead of site-packages. **Check:** BZL-PY-16's `../` grep, with a
    justification comment or a `python_root` required for any match.
11. **`$(location //cli:bin)` to hand a test its binary's path**, because that
    is the idiom in older examples. Bazel's own make-variables reference calls
    `location` legacy and names `rlocationpath` as the preferred approach.
    **Check:** BZL-PY-25's secondary grep.
12. **Repeating a "known bug #N" from training data without checking its
    state.** This corpus proves the risk on itself: the wave-3 brief named
    #2212 as the open precompiling bug and it had been closed for nearly two
    years. **Check:** `gh api repos/bazel-contrib/rules_python/issues/<N> --jq
    '.state, .closed_at'` before repeating any bug claim, and read the
    CHANGELOG's own *Fixed* section for the 1-3 releases after any "added in
    version X" claim before treating X as the stable-behaviour floor.
13. **Registering a local Python toolchain in a library module without
    `dev_dependency = True`.** Lower frequency — it needs a library module that
    wants a local interpreter — but the blast radius is every downstream
    consumer, because a local toolchain has few constraints and is inserted
    early in toolchain ordering. **Check:**
    `grep -B3 'register_toolchains(' MODULE.bazel | grep 'local_toolchains\|local_runtime'`
    paired with `grep -c 'dev_dependency\s*=\s*True'` in the same block; a
    local-toolchain registration without the flag, in a non-root module, is a
    finding.

*Added by the 2026-09-06 revision:*

14. **Attributing `aspect_rules_py`'s `.venv` idiom to `rules_python`.** The
    exact string `bazel run //target.venv` sits inside a `rules_python` issue
    thread, written by a different ruleset's author about his own ruleset. An
    agent asked "how do I get IDE support" will emit it as `rules_python`
    guidance, where nothing happens. **Check:** BZL-PY-32 — read which
    `bazel_dep` is registered before naming any venv target.
15. **Recommending `bazel-mypy-integration`.** It is the obvious search hit for
    "bazel mypy", its README still describes working software, and the archive
    is *repository metadata*, not something the README says about itself — so
    no amount of reading the docs reveals it. **Check:** BZL-PY-31's
    `gh api … --jq .archived`, every time; a training corpus cannot know an
    archive date after its cutoff.
16. **Treating `--no-build-isolation` as one switch.** An agent that finds the
    `[tool.uv]` documentation will apply it to a failing `pip.parse` wheel
    build, where it is a different seam entirely and inert besides. **Check:**
    BZL-PY-33 — identify whether `lock()` or `pip.parse` is the failing rule
    *before* reaching for the flag.
17. **Describing `py_console_script_binary` as reading `pyproject.toml`.** The
    trap is half-set by the question itself; the macro reads the built wheel's
    `entry_points.txt`. The debugging consequence is worse than the wrong
    sentence: editing `[project.scripts]` and rebuilding changes nothing until
    the wheel is rebuilt and the hub re-resolved, which reads as "the macro is
    broken". **Check:** BZL-PY-35, and read the fetched `dist_info`, not the
    workspace.
18. **Reading the Bazel-9 bare-`py_library` error and following its own
    suggestion.** The measured 9.2.0 text is `name 'py_library' is not defined
    (did you mean 'cc_library'?)` — the suggestion is wrong, and unlike
    `cc_library` (which gets a purpose-built message naming
    `buildifier --lint=fix`) the Python failure hands the agent no fix at all.
    **Check:** BZL-PY-20; the fix is always the `load()`, never the suggested
    rule.
19. **Reporting a Gazelle freshness gate as wired after adding one target.**
    Python needs two (`gazelle_test` for BUILD files,
    `gazelle_python_manifest.test` for the manifest) and the ruleset's own
    install doc ships neither. **Check:** BZL-PY-37 — `bazel query` for an
    `sh_test`; empty means no BUILD-freshness gate exists, whatever else is
    green.

## Open questions

### Needs a human decision

1. **Whether any fleet Python project adopts `rules_python` at all.** Frame
   owner-question 1 assumed no pilot, and this consolidation confirms the
   consequence: the family has zero fleet instance and four day-one violations
   waiting. The decision is not "which repo first" — it is whether the seven
   `uv.lock` projects are worth the migration cost at all, given
   `bazel-topic-map.md` Conflict 2 (31.23 percent of Bazel projects with CI
   never invoke Bazel in it) and Conflict 16 (no fleet repo is at monorepo
   scale).
2. **If adoption happens: two lockfiles, or a ruleset switch.** Either the
   fleet keeps `uv` as the developer-facing resolver and generates a
   `requirements.txt` for Bazel — accepting a second lockfile and the drift
   check BZL-PY-11 requires — or it moves to `aspect_rules_py` for native
   `uv.lock` consumption, which means choosing a stability track (1.12.1
   stable versus the 2.0.0-alpha the project's own `main` README describes).
   BZL-PY-07 pins the first as the default; reversing it changes one rule.
   **Sharpened 2026-09-06:** the switch now buys two things, not one — the same
   ruleset is also the only maintained answer for interactive IDE resolution
   (Verdict 16), and the two tracks differ there too: stable 1.12.1
   auto-emits a `.venv` per `py_binary`, while 2.0.0-alpha makes it opt-in via
   `expose_venv_link`. A decision that weighs only `uv.lock` parity is
   under-counting the payoff, and one that cites "the aspect_rules_py IDE
   mechanism" without naming the major is describing two different defaults.
3. **Whether `rules_ocx` should provision a hermetic Python toolchain for its
   own dev tooling.** It has none today. This is the only route by which
   shape A ever exhibits this family, and it interacts with owner-question 6
   (the credential-helper migration) only in that both touch `.bazelrc`.

### Deserves another research round

All four questions this file carried on 2026-09-05 were answered by the wave-4a
dives and are gone from this table. Three closed as **documented gaps** rather
than answers and now live in the Verdict, where a finding belongs: IDE and
typing (Verdict 16, BZL-PY-31/32), sdist build isolation (Verdict 17,
BZL-PY-33), and `PYTHONSAFEPATH` parity (Verdict 8 — stalled, not silent). The
fourth, zipapps and console scripts, closed as a confirmation (Verdict 12) plus
one rule (BZL-PY-35). What remains:

| Subarea | Exact question |
|---|---|
| `python-coverage-on-windows` | Does `bazel coverage` produce a non-empty lcov report for a `py_test` on a Windows runner? `rules_python`'s `docs/coverage.md` does not mention Windows at all, and the one ruleset with a confirmed Windows coverage failure (rules_js) fails for a reason `rules_python` has already closed for itself — `py_binary`/`py_test` force `--enable_runfiles=true` there since 1.9.0. So the JS-shaped failure *should* not reproduce, which is a prediction, not a measurement: no input to this file exercised a Windows or macOS runner. One `bazel coverage` run on a Windows executor, with and without `--enable_runfiles`, settles it and would turn Verdict 19 from source-confirmed into measured. |

### M-J rows the ruleset does not settle

| Row | Why |
|---|---|
| **M-J-15** — "Is a zero-dependency zipapp CLI a `py_binary` with zip output, or does it need Bazel at all?" | **Decided in the Verdict (item 12), deliberately not given a rule row.** `arcana/nox` needs nothing from this family: zero runtime dependencies by contract, shipped as a zipapp built by its own script (`bazel-audit/fleet-bazel-readiness.md:281-284`). A rule that says "do not adopt Bazel for this target" carries no verification that would change a diff inside a Bazel repository, which is the bar the house standard sets. The *mechanism* half of the question — what `py_zipapp_binary` would replace — was answered on 2026-09-06 and folded into Verdict 12: same 1980 zip epoch, same `ZIP_STORED`/`ZIP_DEFLATED` selection, two named differences (`SOURCE_DATE_EPOCH`, symlink handling). The decision did not move; only its justification did. |

All other J rows are settled: M-J-01 (BZL-PY-01, 04), M-J-02 (03), M-J-03 (07,
08), M-J-04 (08, 09), M-J-05 (10, 11), M-J-06 (14, 15), M-J-07 (16), M-J-08
(17, 18), M-J-09 (18), M-J-10 (06), M-J-11 (13), M-J-12 (21, 22, 24), M-J-13
(26, 27), M-J-14 (19), M-J-16 (02). The cross-family row M-I-15 is settled by
BZL-PY-25. The seven rules added on 2026-09-06 settle no M-J row — the map has
no row for typing, IDE support, sdists, entry points, coverage or Gazelle
freshness; they answer this file's own commissioned questions instead.

## Revision log

One line per change. `→` reads "became". A later author diffs against this.

**2026-09-06** — folded in `bazel-followups/python-typing-ide-sdist-and-entrypoints.md`,
`bazel-followups/gazelle-plugin-maturity-per-language.md`,
`bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md` and
`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`.
Rule count 30 → 37; MUST 23 → 30; SHOULD 6 and CONSIDER 1 unchanged. No rule
retired, no rule renumbered, no ID reused.

*Corrections to existing rules (the dangerous kind first):*

- **BZL-PY-15** — rationale said the `system_python` `PYTHONSAFEPATH` gap had
  "no maintainer statement either way". False: issue #2060 is open with an
  explicit maintainer ask, and PR #2122 (a `-P`-based generalisation covering
  both bootstraps) was reviewed 14 months and closed unmerged 2025-10-22.
  Framing → "stalled, not silent"; normative text unchanged; added a live
  `gh api` status check so the claim re-dates itself. Verdict 8 fixed to match.
  *(typing/sdist/entrypoints dive, Q4.)*
- **BZL-PY-25** — the secondary `$(rlocationpath)` clause rested on
  `--enable_runfiles` being off on Windows. Still true of Bazel's own default
  (`auto`, byte-identical at 8.7.0 and 9.2.0) but **not** of Python targets:
  `rules_python` ≥1.9.0 forces it on for `py_binary`/`py_test` via a rule-level
  transition. Clause re-grounded on Bazel's make-variables reference calling
  `$(location)` legacy and ambiguous — the recommendation survives, its stated
  reason did not. New Verdict 19; the "satisfied by accident" bullet for
  `rules_ocx/.bazelrc` refined the same way. *(macOS/Windows dive, via the
  cross-family note.)*
- **BZL-PY-05** — rationale called `--enable_workspace` "a no-op" on Bazel 9.
  Measured: it is **absent from every help surface** at 9.2.0 (present at 8.7.0
  and 8.8.0), so there is no flag to no-op. Verification now says to read both
  `help build --long` and `help startup_options`, because a flag can live in
  either. *(measurement Q1.)*

*Rules strengthened without a change of meaning:*

- **BZL-PY-20** — now measured, not inferred: bare `py_library` exits 0 on
  8.7.0 and fails on 9.2.0 with `name 'py_library' is not defined (did you mean
  'cc_library'?)`; the `bazel_dep` + `load()` fix passes on both. Recorded the
  misleading suggestion and the fact that only `cc_library` gets a helpful
  removed-rule message. Load-phase behaviour, so not host-dependent, but the
  run was on this WSL2 host. *(measurement Q4.)*
- **BZL-PY-07** — rationale gained the `lock()` `[tool.uv]` pass-through
  (including `no-build-isolation`) as a *locking-step-only* seam, distinct from
  BZL-PY-33's wheel-build seam. Normative text unchanged. *(dive Q2.)*
- **BZL-PY-26** — cited rules_python#1156 for the manifest-not-auto-created
  bootstrap, and stated that it is the manifest gate only, not the BUILD one.
- **BZL-PY-30** — added the `python_generation_mode` factor (`file` multiplies
  the target count, `project` collapses it) as an explicitly argued clause on
  an already-CONSIDER rule; raised the named fixed cost from one CI test target
  to two. *(gazelle dive, proposed as "argued" — accepted only because the rule
  it modifies is itself a judgment call and stays CONSIDER.)*

*New rules (BZL-PY-31…37):*

- **BZL-PY-31** (MUST, pinned) — `rules_mypy` aspect via `.bazelrc` as the
  type-check gate; never the archived `bazel-mypy-integration`. Group I.
- **BZL-PY-32** (MUST) — never attribute a `.venv`/`.venv_link` target to
  `rules_python`; it is `aspect_rules_py`'s, and `rules_pyvenv` is
  WORKSPACE-only with no BCR entry. Group I.
- **BZL-PY-33** (MUST) — no sdist build as a Bazel action; the failure is a
  missing compiler in the repository rule's environment, not a sandbox bug.
  Group B (which is retitled "the uv, lockfile and PyPI-resolution path").
- **BZL-PY-34** (MUST) — `pip.default.index_url`, never the deprecated
  `pip.parse(experimental_index_url = …)`. Group A.
- **BZL-PY-35** (MUST) — `py_console_script_binary` honours only a
  single-segment `module:attr`, read from the wheel's `entry_points.txt`.
  Group I.
- **BZL-PY-36** (MUST when a coverage leg exists) — `configure_coverage_tool`
  plus the bundled wheel's CPython 3.9-3.14 range; outside it, silent empty
  lcov. Group I. Report-reading verification ceded to `BZL-TEST`.
- **BZL-PY-37** (MUST for Gazelle adopters) — two freshness gates, not one;
  no ecosystem wires `gazelle_test` by default. Group H. General rule owned by
  `BZL-ARCH-12`.

*Proposed rows deliberately not applied as written:*

- The typing dive proposed folding the `experimental_index_url` deprecation
  into **BZL-PY-08**. Rejected: BZL-PY-08 is about `uv_lock=`, and bolting an
  unrelated clause onto it would change an existing rule's meaning, which the
  ID contract forbids. Shipped as BZL-PY-34 instead.
- The same dive proposed the IDE-venv guidance as a CONSIDER. Shipped as a MUST
  (BZL-PY-32) on the misattribution half only — "never call it `rules_python`"
  is a fact with a one-line check; "weigh the ruleset cost" is that rule's
  rationale, not a second row.
- `NEW-TEST-27` (confirm the coverage wheel from the report side) stays with
  `BZL-TEST`; BZL-PY-36 carries only the `python.toolchain()` attribute and the
  wheel range, which no other family owns. Deliberate non-duplication.

*Structural:* added Group I; retitled Group B; added the standing
"every grep is blind to generated-repo content" preamble the house standard
requires and this file lacked; Verdict gained items 16-19; the "deserves
another research round" table went from four rows to one.

## Sub-artifacts

- [`bazel-python/python-toolchains-and-pypi-resolution.md`](bazel-python/python-toolchains-and-pypi-resolution.md)
  — hermetic toolchain registration and the soft default, the `pip.parse`
  repository-rule ordering trap, exactly what the uv integration does and does
  not do, `pylock.toml` status, the `pypi` hub collision, multi-platform PyPI
  naming, and the `muslc` doc bug found by reading the flag enum.
- [`bazel-python/python-bootstrap-imports-and-precompiling.md`](bazel-python/python-bootstrap-imports-and-precompiling.md)
  — the `system_python`/`script` bootstraps and their feature gap, the 1.7.0
  `sys.path` reorder, the venv-per-target model, the `imports` shadowing trap,
  the three precompiling caveats with the correct issue numbers, and
  `PYTHONHASHSEED`/`__pycache__` as a Bazel-action-cache concern.
- [`bazel-python/python-tests-and-build-generation.md`](bazel-python/python-tests-and-build-generation.md)
  — why a `py_test` on a pytest file passes with zero tests run, the
  `pytest-bazel` versus `rules_python_pytest` lineage and the exact
  env-var-to-flag mapping, the Gazelle plugin's directives, manifest contract
  and stdlib-list bug, and the runfiles replacement for an env-var binary seam.

*Folded in by the 2026-09-06 revision (commissioned by this file, or answering
across families into it):*

- [`bazel-followups/python-typing-ide-sdist-and-entrypoints.md`](bazel-followups/python-typing-ide-sdist-and-entrypoints.md)
  — the whole of Group I's evidence: `rules_mypy` as the aspect-based CI gate
  and the archived predecessor, the absence of any maintained Pyright
  integration, the two venv-materialisation paths and their costs, #2410's
  state and the exact `pip wheel --no-deps` failure, the two distinct
  `--no-build-isolation` seams, `experimental_index_url`'s in-source
  deprecation, `py_console_script_binary`'s `configparser`/`partition(".")`
  limits, `py_zipapp_binary` line-for-line against `arcana/nox`'s
  `build_pyz.py`, and the PR-#2122 history behind BZL-PY-15's correction.
- [`bazel-followups/gazelle-plugin-maturity-per-language.md`](bazel-followups/gazelle-plugin-maturity-per-language.md)
  — re-verifies Group H rather than re-deriving it, rates the rules_python
  plugin "production, only when paired with a pytest wrapper", and supplies
  BZL-PY-37: four ecosystems' own canonical examples read directly, none
  wiring `gazelle_test`.
- [`bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md`](bazel-followups/coverage-across-rulesets-and-the-test-exec-group.md)
  — the bundled-coverage-wheel range and its silent empty report (BZL-PY-36),
  the Bazel-core proof that the collector shares the test's spawn and timeout,
  and the auto-computed `--instrumentation_filter` that produces the same
  symptom for a different reason.
- [`bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md`](bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md)
  — real 8.7.0/8.8.0/9.2.0 runs on this WSL2 host: bare `py_library` before and
  after the autoload flip, `--incompatible_autoload_externally`'s per-version
  value, and `--enable_workspace`/`--enable_bzlmod` vanishing from every help
  surface at 9.2.0.

## Key sources

| URL | What it is | Why it is here |
|---|---|---|
| [rules_python `docs/toolchains.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/toolchains.md) | Ruleset toolchain reference (945 lines) | Root/library-module patterns, the soft-default explanation, `:python` vs `:repl`, and the local-toolchain `dev_dependency` warning, all in the ruleset's own words |
| [rules_python `MODULE.bazel` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/MODULE.bazel) and [@ `main`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/MODULE.bazel) | The ruleset's own Bzlmod manifest, two revisions | The concrete proof of the rolling soft default: `python.defaults(python_version = "3.11")` at the tag, `"3.14"` on `main` |
| [`python/private/python.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/python.bzl) | Module-extension implementation | The `elif mod.name == "rules_python" and not default_toolchain` branch — mechanical proof the soft default applies to every consumer |
| [`python/private/pypi/extension.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/extension.bzl) | `pip` extension source | The only place `uv_lock` (`versionadded 2.2.0`) and `pyproject_toml` (`versionadded 2.3.0`) are documented at all |
| [`python/private/flags.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/flags.bzl) | Flag enums and effective-value functions | Ground truth for `LibcFlag.MUSL = "musl"` (settling the `muslc` doc bug) and for `PrecompileFlag.AUTO` resolving to `DISABLED` in code |
| [`python/config_settings/BUILD.bazel`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/config_settings/BUILD.bazel) | Flag definitions | `bootstrap_impl`'s real `build_setting_default` and the unconditional Windows `select()` override |
| [rules_python `CHANGELOG.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | Dated release notes, 0.24.0–2.3.3 | The only source that dates each behaviour to a release; corrected the map's 2.1.0 → 2.2.0/2.3.0 dating for `uv_lock` and carries the gazelle 2.3.0 BREAKING floor |
| [rules_python `docs/precompiling.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md) | Official docs page | The three named caveats verbatim, plus the ~2× runfiles overhead statement |
| [rules_python `docs/environment-variables.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md) | Env-var reference | `RULES_PYTHON_PYPI_HUB_RESERVED`'s warn-only default and `RULES_PYTHON_PYCACHE_DIR`'s fallback search |
| [rules_python `docs/pypi/lock.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | Lockfile-format doc | "Only `requirements.txt` format", the `lock()` shortest-path heuristic, its monorepo warning box, and "no test target" |
| [rules_python `docs/howto/multi-platform-pypi-deps.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md) | How-to guide | The `{os}_{cpu}{threading}` naming ceiling, and one of the two sources carrying the `muslc` typo |
| [rules_python#2445](https://github.com/bazel-contrib/rules_python/issues/2445) | Open issue, two independent reporters | The real precompiling bug: `ActionConflictException` on shared `srcs` with differing `exec_properties`, unfixed 2024-11-26 → 2025-09-17 |
| [rules_python#1972](https://github.com/bazel-contrib/rules_python/issues/1972) | Open issue, maintainer comment | The clearest primary statement that `py_test` on a pytest file "silently passes without running any tests" |
| [rules_python#1463](https://github.com/bazel-contrib/rules_python/issues/1463) and [#2787](https://github.com/bazel-contrib/rules_python/issues/2787) | Closed-by-explanation bug; open feature tracker | The repository-rule/interpreter failure mode, and the authoritative open state for `pylock.toml` |
| [rules_python discussion #3391](https://github.com/bazel-contrib/rules_python/discussions/3391) | Maintainer Q&A, reply 2026-02-23 | Dated, direct statement that the uv work is experimental with "sharp edges" and belongs in a dedicated project |
| [aspect-build/rules_py README](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md) | Competing ruleset's own doc | The comparison table that frames where native, workspace-aware `uv.lock` support actually lives — itself already slightly stale, which is the lesson |
| [pytest-bazel `main.py`](https://github.com/aignas/pytest-bazel/blob/main/pytest_bazel/main.py) + [usage docs](https://github.com/aignas/pytest-bazel/blob/main/docs/usage.md) | The wrapper's source and its BUILD snippets | Ground truth for the env-var-to-pytest-flag mapping and the exit-code-5 asymmetry that stops the silent-pass failure resurfacing |
| [Bazel Test Encyclopedia](https://bazel.build/reference/test-encyclopedia) and [Make Variables reference](https://bazel.build/reference/be/make-variables) | Official Bazel specs | `TEST_SHARD_STATUS_FILE`'s touch-or-fail contract, and the explicit `$(rlocationpath)`-over-`$(location)`/`$(rootpath)` recommendation |
| [Bazel 9.0 release post](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog, 2026-01-20 | Primary source dating `--incompatible_autoload_externally`'s default flip, which makes BZL-PY-20 a hard failure rather than a style rule |

*Added by the 2026-09-06 revision:*

| URL | What it is | Why it is here |
|---|---|---|
| [rules_python#1401](https://github.com/bazel-contrib/rules_python/issues/1401) | Open tracking issue, 2023-09-04 → 2025-07-10 | The maintainer's own scope decision — IDE support is "fully a community-driven project" — which is why Verdict 16 is a documented gap and not a pending feature |
| [rules_mypy `readme.md`](https://raw.githubusercontent.com/bazel-contrib/rules_mypy/main/readme.md) | The maintained gate's own doc, v0.41.0 (2026-03-31) | Exact `.bazelrc`/aspect wiring behind BZL-PY-31, and the fact that the gate needs no materialised venv |
| [`bazel-mypy-integration` repo metadata](https://api.github.com/repos/bazel-contrib/bazel-mypy-integration) | GitHub API response | `archived: true`, `pushed_at: 2025-05-08` — a fact no README states and no training corpus can carry |
| [`whl_installer.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/whl_installer/wheel_installer.py) | The repository rule's build tool | The literal `pip wheel --no-deps` argv and where `extra_pip_args` splices in — the mechanism BZL-PY-33 rests on |
| [rules_python#2410](https://github.com/bazel-contrib/rules_python/issues/2410) | Open issue, 2024-11-14 → 2026-01-20 | Proof there is no PEP 517 build-as-a-Bazel-action, in the maintainer's own words |
| [`docs/pypi/lock.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) and [`docs/pypi/download.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md) | Official doc pages | The `lock()` `--project` auto-detection that carries `[tool.uv] no-build-isolation` (BZL-PY-07), and `download_only`'s sdist exclusion (BZL-PY-33/34) |
| [`py_console_script_gen.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_gen.py) | Code-generator source | `attr, _, _ = entry_point.partition(".")` and the unhandled-extras TODO — BZL-PY-35's whole basis, and proof `pyproject.toml` is never read |
| [`zipper.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/tools/private/zipapp/zipper.py) vs [`arcana/nox/scripts/build_pyz.py`](file:///home/mherwig/dev/arcana/nox/scripts/build_pyz.py) | Ruleset tool source against the fleet's hand-rolled builder | The 1980 epoch and compression-mode match behind Verdict 12, and the two differences (`SOURCE_DATE_EPOCH`, symlink refusal vs packing) |
| [rules_python#2060](https://github.com/bazel-contrib/rules_python/issues/2060) and [#2122](https://github.com/bazel-contrib/rules_python/pull/2122) | Open issue + closed-unmerged PR (2025-10-22) | The 14-month history that turns BZL-PY-15's "silence" into "stalled" |
| [`rules_python docs/coverage.md` @ 2.3.3](https://github.com/bazel-contrib/rules_python/blob/2.3.3/docs/coverage.md) | Official doc page, 74 lines | The bundled wheel's CPython 3.9-3.14 range and the ruleset's own "emits empty lcov data" sentence — BZL-PY-36 |
| [`collect_coverage.sh`](https://github.com/bazelbuild/bazel/blob/9.2.0/tools/test/collect_coverage.sh) and [`TestConfiguration.java` @ 8.8.0/9.2.0](https://github.com/bazelbuild/bazel/blob/9.2.0/src/main/java/com/google/devtools/build/lib/analysis/test/TestConfiguration.java) | Bazel-core source, two tags | Proof the coverage collector runs inside the test's own spawn and timeout for every language, and that both split-postprocessing flags default `false` |
| [bazel-gazelle `def.bzl` @ v0.54.0](https://github.com/bazel-contrib/bazel-gazelle) and [rules_python `gazelle/docs/installation_and_usage.md` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/refs/tags/2.3.3/gazelle/docs/installation_and_usage.md) | The `gazelle`/`gazelle_test` macro pair, and the install doc that wires only the first | BZL-PY-37: `gazelle()` is an `sh_binary`, `gazelle_test()` an `sh_test`, and no ecosystem's own example wires the latter |
| [rules_python `CHANGELOG.md` entries at 1.5.0, 1.9.0, 2.0.0](https://github.com/bazel-contrib/rules_python/blob/2.3.3/CHANGELOG.md) | Dated release notes | Windows: `system_python` forced (1.5.0), `--enable_runfiles=true` forced for `py_binary`/`py_test` by transition (1.9.0, "will soon become required"), symlink runfiles tree by default (2.0.0) — Verdict 19 and BZL-PY-25's correction |
| `bazel-measurements/flag-defaults-and-trivial-builds-across-versions.md` | This programme's own measurement, real 8.7.0/8.8.0/9.2.0 runs on this WSL2 host | The only first-hand evidence in this file: bare `py_library` per major, the autoload flag's per-version value, and `--enable_workspace`'s disappearance |
