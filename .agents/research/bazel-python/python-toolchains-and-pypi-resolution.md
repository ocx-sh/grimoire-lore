---
title: Python toolchains and PyPI resolution under Bazel
topic: python-toolchains-and-pypi-resolution
group: bazel-python
family: BZL-PY
agent: research-lang wave-3a worker
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 19
primary_sources_count: 18
settles: [M-J-01, M-J-02, M-J-03, M-J-04, M-J-05, M-J-10, M-J-11, M-J-16]
scope: |
  Covers: hermetic Python toolchain registration and selection under Bzlmod
  (`python.toolchain()`, `py_linux_libc`, `py_freethreaded`), the `pip.parse()`
  repository-rule/toolchain-resolution ordering trap, the uv integration's
  actual reach (`lock()`, `pip.parse(uv_lock=...)`), `pylock.toml` tracking,
  the `pypi` hub-name collision, and multi-platform PyPI dependency naming.
  Does NOT cover: bootstrap modes, `sys.path`/`imports`, precompiling (see
  `bazel-python/python-bootstrap-imports-and-precompiling`); pytest wrappers
  and Gazelle BUILD generation (see `bazel-python/python-tests-and-build-generation`);
  general `pyproject.toml`/`uv.lock` hygiene, owned by the `python-packaging`
  sibling set; the general Bazel determinism taxonomy (`PYTHONHASHSEED`),
  owned by `bazel-hermeticity-determinism`.
---

# Python toolchains and PyPI resolution under Bazel

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Version floor](#1-version-floor)
   2. [Hermeticity is not opt-in under Bzlmod — the soft default](#2-hermeticity-is-not-opt-in-under-bzlmod--the-soft-default)
   3. [Root-module, library-module, and pinning patterns](#3-root-module-library-module-and-pinning-patterns)
   4. [The pip.parse repository-rule ordering trap](#4-the-pipparse-repository-rule-ordering-trap)
   5. [Toolchain-selection flags: py_linux_libc and py_freethreaded](#5-toolchain-selection-flags-py_linux_libc-and-py_freethreaded)
   6. [Raw interpreter target vs repl target, and PYTHONSAFEPATH](#6-raw-interpreter-target-vs-repl-target-and-pythonsafepath)
   7. [What the uv lock() rule actually does](#7-what-the-uv-lock-rule-actually-does)
   8. [pip.parse(uv_lock=...): the undocumented, narrower path](#8-pipparseuv_lock-the-undocumented-narrower-path)
   9. [pylock.toml / PEP 751 status](#9-pylocktoml--pep-751-status)
   10. [aspect_rules_py positioning](#10-aspect_rules_py-positioning)
   11. [The pypi hub-name collision](#11-the-pypi-hub-name-collision)
   12. [Multi-platform PyPI dependency naming](#12-multi-platform-pypi-dependency-naming)
   13. [requires-python floor and per-project toolchain selection](#13-requires-python-floor-and-per-project-toolchain-selection)
   14. [Local toolchains and the dev_dependency trap](#14-local-toolchains-and-the-dev_dependency-trap)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Current release is **rules_python 2.3.3** (2026-09-04, confirmed via GitHub
  releases); every version claim below is floored against it unless dated
  otherwise.
- **Correct the brief's premise**: under Bzlmod, hermeticity is *not*
  host-PATH opt-in. `rules_python`'s own `MODULE.bazel` calls
  `python.toolchain(python_version = "3.11")` (as pinned at the 2.3.3 tag) and
  `python/private/python.bzl` registers that as a "soft default" for any
  module that never calls `python.toolchain()` itself — the source comment
  reads *"rules_python needs to set a soft default in case the root module
  doesn't."* The host-PATH-fallback risk (`@bazel_tools//tools/python:autodetecting_toolchain`)
  is the WORKSPACE-only, lowest-priority path; Bzlmod registers a
  higher-priority hermetic toolchain "unless there is a toolchain
  misconfiguration somewhere."
- The real risk is not "no hermeticity" — it's an **unpinned rolling
  default**: the soft default's version "is not a stable version… will change
  frequently to track the most recent Python version" and the root module can
  silently ride it across every `rules_python` bump.
- `pip.parse()` (and its WORKSPACE ancestor `pip_parse()`) is a repository
  rule; repository rules run in the loading phase, before Bazel's
  analysis-phase toolchain resolution. The interpreter used to resolve
  dependencies must therefore be threaded explicitly — either a
  `python_version` string that matches an already-registered
  `python.toolchain()`, or an explicit `python_interpreter`/`python_interpreter_target`.
  A version/target mismatch is the documented cause of sdist-build failures
  ([rules_python#1463](https://github.com/bazel-contrib/rules_python/issues/1463)).
- **Headline surprise**: rules_python's uv integration is two separate,
  differently-mature things, not one. (a) The `lock()` rule (`python/uv/lock.bzl`)
  runs `uv pip compile` to generate a `requirements.txt`, which then feeds
  `pip.parse()` exactly like a hand-written lock — it never touches an
  existing `uv.lock`. (b) A separate `uv_lock` **attribute on `pip.parse()`
  itself**, `versionadded 2.2.0` (2026-06-30, not 2.1.0 as the topic map's
  conflict-4 resolution stated), lets `pip.parse` read an actual `uv.lock` as
  its "primary source for package metadata" — but as of the 2.3.0 fix
  (2026-08-07) it still does not expose uv workspace/root members, and it is
  **undocumented in every prose doc page** (`docs/pypi/lock.md`,
  `docs/pypi/index.md`, `docs/pypi/use.md`) as of 2.3.3 — only the CHANGELOG
  and the attribute's own source docstring mention it.
- The map's dating of the `uv_lock` parameter (2.1.0) is wrong; correct it to
  **2.2.0** for the attribute's existence and **2.3.0** for the
  workspace/root-member fix. Cite the source docstring, not the prose docs,
  for this fact — the prose docs have not caught up.
- `pylock.toml` (PEP 751) is tracked under
  [#2787](https://github.com/bazel-contrib/rules_python/issues/2787), opened
  2025-04-18, still open as of its last 2026-07-16 update — do not ship
  guidance that assumes it exists.
- `aspect_rules_py`'s own README still asserts rules_python has "no `uv.lock`
  consumption" — stale against the 2.2.0 attribute, though defensible in
  spirit given that attribute's narrow, undocumented, workspace-blind scope.
  The rules_python maintainer himself called the uv work "still experimental"
  with "sharp edges" and said he'd rather it lived in "a separate, dedicated
  project" (2026-02-23,
  [discussion #3391](https://github.com/bazel-contrib/rules_python/discussions/3391)).
  Full native `uv.lock` consumption, including workspace members, is an
  `aspect_rules_py` feature, not a rules_python configuration.
- Consequence for this fleet stands, refined: every one of the seven
  `uv.lock` files is a migration cost under rules_python — either regenerate
  a `requirements.txt` via `lock()`/`uv export`, or adopt the experimental
  `uv_lock=` attribute and accept its workspace-member gap, or switch
  rulesets entirely to `aspect_rules_py` for native consumption.
- The uv `lock()` rule's project-root auto-detection uses a "shortest
  directory path" heuristic and the doc itself warns it is wrong for
  "monorepos with multiple independent sub-projects" — set `project=`
  explicitly in that case. Unlike `compile_pip_requirements`, `lock()` also
  creates no drift-check test target automatically.
- `py_linux_libc` (values `glibc`/`musl`) and `py_freethreaded` (values
  `yes`/`no`, Python ≥3.13.0) are the two toolchain-selection flags at
  `//python/config_settings`. `py_freethreaded` shipped in 0.39.0
  (2024-11-13); musl toolchain variants and their selection flag were
  documented at 1.0.0 (2024-12-05).
- **Doc bug found by reading source**: rules_python's own
  `docs/howto/multi-platform-pypi-deps.md` example and a 1.0.0 CHANGELOG
  entry both write `muslc` where the actual flag value (per
  `python/private/flags.bzl`'s `LibcFlag.MUSL = "musl"`) is `musl`. A
  `config_setting` copied verbatim from that doc will never match.
- `@rules_python//python/bin:python` (raw interpreter, no hermeticity
  guarantee, does not set `PYTHONSAFEPATH`) and `@rules_python//python/bin:repl`
  (identical environment to `py_binary`, sets `PYTHONSAFEPATH` automatically)
  are not interchangeable debugging entry points — the docs state this
  explicitly.
- The `pypi`-named hub-name collision across Bzlmod modules is warn-only by
  default. `RULES_PYTHON_PYPI_HUB_RESERVED` (added 2.2.0) must be set to `1`
  to actually rename the colliding hub to `<module_name>_pypi`; at the
  default `0` a warning prints and the collision is not resolved.
- Multi-platform PyPI selection (`pip.default` + `config_setting`, wired via
  `pip.parse.requirements_by_platform`) uses an `{os}_{cpu}{threading}`
  naming convention that the doc explicitly stops solving past "a couple of
  axes" — every one of the fleet's seven locks already carries
  platform-tagged wheels, so this ceiling is directly relevant if any of them
  migrate.
- `pip.parse.pyproject_toml` (`versionadded 2.3.0`, 2026-08-07) can read a
  project's `requires-python` directly for `python_version`, partially
  mitigating (but not eliminating) the fleet's no-shared-floor problem
  (3.10–3.13 spread across seven projects, per
  [fleet §Python](../bazel-audit/fleet-bazel-readiness.md#python)).

## Findings

### 1. Version floor

`rules_python` 2.3.3 published 2026-09-04
([GitHub releases](https://github.com/bazel-contrib/rules_python/releases)).
Bzlmod minimum is Bazel 7.4 (`CHANGELOG.md`, 1.1.0 entry: "For bzlmod, Bazel
7.4 is now the minimum Bazel version"). All version-specific claims below are
floored against 2.3.3 and dated to the CHANGELOG entry that introduced them;
anything read from `main` (the docs pages the brief names) is the
still-current behaviour as of that date unless a later fix is cited.

### 2. Hermeticity is not opt-in under Bzlmod — the soft default

The brief (inheriting the frame) assumes: *"without `python_register_toolchains()`,
`py_binary` and `py_test` fall back to whatever interpreter is on the host
PATH."* That is WORKSPACE-era truth. Under Bzlmod it is wrong, and the
ruleset's own docs say so directly:

> "Under bzlmod, the default toolchain is no longer based on the locally
> installed system Python. Instead, a recent Python version using the
> pre-built, standalone runtimes are used."
> — [`BZLMOD_SUPPORT.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/BZLMOD_SUPPORT.md)

> "Bazel itself automatically registers
> `@bazel_tools//tools/python:autodetecting_toolchain` as the lowest priority
> toolchain. For `WORKSPACE` builds, if no other toolchain is registered,
> that toolchain will be used. **For Bzlmod builds, `rules_python`
> automatically registers a higher-priority toolchain; it won't be used
> unless there is a toolchain misconfiguration somewhere.**"
> — [`docs/toolchains.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/toolchains.md)

The mechanism is verifiable in source, not just prose. `rules_python`'s own
`MODULE.bazel` (2.3.3 tag) declares:

```starlark
# rules_python's own MODULE.bazel, tag 2.3.3
python = use_extension("//python/extensions:python.bzl", "python")

# The default toolchain to use if nobody configures a toolchain.
# NOTE: This is not a stable version. It is provided for convenience, but will
# change frequently to track the most recent Python version.
# NOTE: The root module can override this.
python.defaults(python_version = "3.11")
python.toolchain(python_version = "3.11")
use_repo(python, "python_3_11", "pythons_hub", python = "python_versions")

register_toolchains("@pythons_hub//:all")
```

and `python/private/python.bzl`'s extension implementation carries the exact
logic that makes this apply to *every consumer*, not just `rules_python`
itself:

```python
# python/private/python.bzl (2.3.3), inside the module-graph walk
elif mod.name == "rules_python" and not default_toolchain:
    # This branch handles when the root module doesn't declare a
    # Python toolchain
    is_default = default_python_version == toolchain_version
```

Practical effect: a root module that never calls `python.toolchain()` at all
still gets a working, hermetic, prebuilt-standalone-Python toolchain — it
just gets whatever version `rules_python` happens to default to on the day
its `bazel_dep` was resolved (3.11 as of the 2.3.3 tag; `main` has already
moved to 3.14). **On `main` itself** the same file shows the version has
already drifted:

```starlark
# rules_python's own MODULE.bazel, main branch (2026-09-05)
python.defaults(python_version = "3.14")
python.toolchain(python_version = "3.14")
```

That drift, not a bare host-PATH fallback, is the actual hermeticity risk a
rule should guard against.

### 3. Root-module, library-module, and pinning patterns

`docs/toolchains.md` documents four MODULE.bazel shapes: a root module that
always uses Python (pin explicitly), a library module with dev-only Python
usage (same shape, plus `dev_dependency = True`), a library module without
version constraints (no `python.toolchain()` call needed — "`rules_python`
ensures *some* Python version is available"), and a library module with
version constraints (its own `python.toolchain()` call, independent of the
root's).

```starlark
# Root module that always uses Python — the pattern to mandate
bazel_dep(name = "rules_python", version = "2.3.3")
python = use_extension("@rules_python//python/extensions:python.bzl", "python")
python.defaults(python_version = "3.12")
python.toolchain(python_version = "3.12")
use_repo(python, "python_3_12")
```

```starlark
# Wrong: depends on rules_python's rolling soft default
bazel_dep(name = "rules_python", version = "2.3.3")
# ...py_binary targets elsewhere, no python.toolchain() call anywhere...
# Builds today. Silently moves to whatever version rules_python defaults
# to on the next `bazel_dep` bump — no error, no warning.
```

Multiple pinned versions coexist per repo via repeated `python.toolchain()`
calls plus `python_version=` on individual `py_binary`/`py_test` targets —
useful for the fleet's spread of `requires-python` floors (see [§13](#13-requires-python-floor-and-per-project-toolchain-selection)).

### 4. The pip.parse repository-rule ordering trap

Repository rules execute in Bazel's loading phase; toolchain resolution is
an analysis-phase mechanism. `pip_parse`/`pip.parse` is a repository rule
that needs a concrete interpreter to resolve dependencies (to build sdists,
run PEP 517 hooks, etc.) *before* any `py_binary`'s toolchain has been
resolved. Aspect's 2022 explainer states the mechanism plainly, and nothing
in the current source contradicts it:

> "However, repository rules run before toolchain resolution, so we
> explicitly load the 'resolved' interpreter for the host platform… and pass
> that interpreter to be used when dependencies are resolved."
> — [Aspect, "Python toolchains in rules_python"](https://aspect.build/blog/python-toolchains), 2022-03-11, rules_python 0.7.0

Under Bzlmod the surface API absorbs most of the manual wiring: `pip.parse`'s
`python_version` attribute doc states the constraint directly —

> "If an interpreter isn't explicitly provided (using `python_interpreter` or
> `python_interpreter_target`), then the version specified here must have a
> corresponding `python.toolchain()` configured."
> — `python/private/pypi/extension.bzl`, 2.3.3

```starlark
# Correct: pip.parse's python_version matches a registered toolchain
python.toolchain(python_version = "3.12")
pip = use_extension("@rules_python//python/extensions:pip.bzl", "pip")
pip.parse(hub_name = "pypi", python_version = "3.12", requirements_lock = "//:requirements_lock.txt")
```

```starlark
# Wrong: python_version has no matching python.toolchain() anywhere in the graph
pip.parse(hub_name = "pypi", python_version = "3.13", requirements_lock = "//:requirements_lock.txt")
# Fails (or silently resolves against whatever soft default exists) —
# nothing in this MODULE.bazel registers a 3.13 toolchain.
```

The still-open historical case,
[rules_python#1463](https://github.com/bazel-contrib/rules_python/issues/1463)
(opened 2023-10-05, closed by explanation not by fix), is a package that
needs to build from sdist under the hermetic interpreter and fails because
the *host's* system Python happened to have build tooling (a C compiler,
`clang`/`llvm`) that the hermetic interpreter's build environment does not.
Maintainer's diagnosis in the thread: *"This is because when you don't set
the attribute, it uses the system-wide python installation and it could be
working because you may have all of the dependencies for building the wheel
already installed on your system… Repository rules are non-hermetic and in
general produce different results on different machines."* — i.e. the
"it worked without pinning" experience is itself the non-hermetic failure
mode, not evidence the pin is unnecessary.

### 5. Toolchain-selection flags: py_linux_libc and py_freethreaded

`//python/config_settings` defines two `string_flag`s used for toolchain
resolution (`python/private/flags.bzl`, `python/config_settings/BUILD.bazel`,
2.3.3):

| Flag | Values | Default | Introduced |
|---|---|---|---|
| `--@rules_python//python/config_settings:py_linux_libc` | `glibc`, `musl` | `glibc` | musl variants + this flag documented at 1.0.0 (2024-12-05, CHANGELOG) |
| `--@rules_python//python/config_settings:py_freethreaded` | `yes`, `no` | `no` | 0.39.0 (2024-11-13, CHANGELOG: "Support for freethreaded Python toolchains is now available") |

`py_freethreaded=yes` requires a Python ≥3.13.0 build (freethreaded builds
exist from 3.13.0 onward per `docs/toolchains.md`'s "Toolchain selection
flags" section).

```starlark
# Correct: musl selection, exact enum value
config_setting(
    name = "is_musl",
    flag_values = {"@rules_python//python/config_settings:py_linux_libc": "musl"},
)
```

```starlark
# Wrong — copied verbatim from rules_python's own multi-platform-pypi-deps.md;
# "muslc" is not a value the flag can ever take (LibcFlag.MUSL = "musl").
# This config_setting silently never matches.
config_setting(
    name = "is_musl",
    flag_values = {"@rules_python//python/config_settings:py_linux_libc": "muslc"},
)
```

Source of the doc bug, both instances read directly:
[`docs/howto/multi-platform-pypi-deps.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md)
("musl on linux" example uses `"muslc"`) and the 1.0.0 CHANGELOG entry
("python interpreters targeting `muslc` libc have been added"). The
authoritative value is in
[`python/private/flags.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/flags.bzl):
`LibcFlag.MUSL = "musl"`. The command-line usage example in the *same*
multi-platform doc gets it right: `--@rules_python//python/config_settings:py_linux_libc=musl`
— the doc disagrees with itself between its CLI example and its
`config_setting` example.

### 6. Raw interpreter target vs repl target, and PYTHONSAFEPATH

`docs/toolchains.md` draws the distinction explicitly:

> "The `//python/bin:python` target provides access to the underlying
> interpreter without any hermeticity guarantees… The `//python/bin:repl`
> target provides an environment identical to what `py_binary` provides.
> That means it handles things like the `PYTHONSAFEPATH` environment
> variable automatically. The `//python/bin:python` target will not."

```console
$ bazel run @rules_python//python/bin:python          # no hermeticity guarantee, no PYTHONSAFEPATH
$ bazel run @rules_python//python/bin:repl             # py_binary-identical env, PYTHONSAFEPATH set
```

`:python` is for "what interpreter does Bazel resolve" introspection
(`bazel run @rules_python//python/bin:python --@rules_python//python/config_settings:python_version=3.12`
switches versions); `:repl` is for "run code the way my `py_binary` actually
runs it." Treating them as interchangeable debugging entry points produces a
REPL session that behaves differently from the shipped binary with respect to
import-path safety (`PYTHONSAFEPATH` strips `''`/script-dir from `sys.path`).

### 7. What the uv lock() rule actually does

```starlark
load("@rules_python//python/uv:lock.bzl", "lock")

lock(
    name = "requirements",
    srcs = ["pyproject.toml", "requirements.in"],
    out = "requirements_lock.txt",
)
```

This runs `uv pip compile` as a build action — a faster, drop-in
`pip-compile` — and its *output* is `requirements_lock.txt`, which then
feeds `pip.parse()` exactly like a hand-maintained requirements file. It is
labeled "experimental… well tested with the public PyPI index, but you may
hit some rough edges with private mirrors"
([`docs/pypi/lock.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md)).
**It never reads an existing `uv.lock`.** If a `pyproject.toml` is among
`lock.srcs`, `lock()` auto-detects the project directory and passes
`--project <dir>` to `uv pip compile` so `uv` picks up `[tool.uv]` settings
(`no-build-isolation`, `exclude-dependencies`, workspace members) from that
one file — but it is reading `pyproject.toml` metadata, not consuming a lock
file.

Project-root auto-detection: "If multiple `pyproject.toml` files are in
`lock.srcs`, the one with the shortest directory path is selected (this
heuristic works for typical uv workspace layouts where the root
configuration is at the shortest path)." The doc's own warning box: *"For
monorepos with multiple independent sub-projects, you must set `project`
explicitly for each `lock` target."* And: *"No test target — unlike
`compile_pip_requirements`, no test target is auto-created."*

```starlark
# Monorepo-safe: explicit project=, matching the doc's own warning
lock(
    name = "requirements",
    srcs = ["pyproject.toml", "requirements.in"],
    out = "requirements_lock.txt",
    project = "subproject",
)
```

### 8. pip.parse(uv_lock=...): the undocumented, narrower path

Separate from `lock()`, `pip.parse` itself grew a `uv_lock` attribute:

```python
# python/private/pypi/extension.bzl, 2.3.3
"uv_lock": attr.label(
    doc = """
(label, optional): A label pointing to the uv.lock file. If provided,
the uv.lock file will be used as the primary source for package metadata.

:::{versionadded} 2.2.0
:::
""",
),
```

Dated precisely from the CHANGELOG (correcting the topic map's conflict-4
resolution, which cited 2.1.0):

- **2.2.0** (2026-06-30) — "(uv) Support for basic `uv.lock` generation via
  the `lock` rule and basic support for **importing the `uv.lock` file
  itself**. Since this may have bugs, please report this by creating new
  tickets." First appearance of `uv_lock` as an importable source.
- **2.3.0** (2026-08-07) — "(pypi) Allow `uv_lock` to be specified in
  `pip.parse` without requiring `requirements_lock`… to be set" (it had
  required both before this). Same release: "(pypi) `pip.parse(uv_lock = ...)`
  no longer exposes uv workspace/root members that resolve to no wheel or
  sdist (e.g. `source = { virtual = "." }` or editable installs). Previously
  these source-less packages were added to the hub's `all_requirements` /
  `all_whl_requirements` with an alias to a subpackage that does not exist,
  breaking analysis for anything enumerating the full set."

As of 2.3.3, `docs/pypi/lock.md`, `docs/pypi/index.md`, `docs/pypi/use.md`
and `docs/pypi/download.md` mention none of this — `uv_lock` on `pip.parse`
is documented nowhere except the CHANGELOG and the attribute's own source
docstring. It is real, it is narrower than its name ("primary source for
package metadata," not full parity with a `uv`-native resolve — no workspace
members), and it is invisible to anyone reading only the prose docs the
brief named.

```starlark
# What pip.parse(uv_lock=...) actually supports as of 2.3.0+ — no
# requirements_lock needed, but workspace/root members are excluded
pip.parse(
    hub_name = "pypi",
    python_version = "3.12",
    uv_lock = "//:uv.lock",
)
```

### 9. pylock.toml / PEP 751 status

`docs/pypi/lock.md`'s own header note: *"Currently `rules_python` only
supports `requirements.txt` format. #2787 tracks `pylock.toml` support."*
[Issue #2787](https://github.com/bazel-contrib/rules_python/issues/2787)
("Support PEP751 lockfile format in bzlmod") opened 2025-04-18, 11 comments,
**state: open**, last updated 2026-07-16 — five weeks before this research
date and still no shipped support. Do not write or ship any guidance,
example, or rule check that assumes `pylock.toml` is consumable by
rules_python today.

### 10. aspect_rules_py positioning

`aspect_rules_py`'s current README states the comparison directly:

> "rules_python's uv support: `rules_python`'s uv integration runs `uv pip
> compile` as a build action to generate a `requirements.txt`—it is a faster
> `pip-compile` replacement. The result still feeds into `pip.parse()` →
> `whl_library` repository rules at loading phase. There is no `uv.lock`
> consumption; the rules_python maintainer has suggested this work belongs
> in a dedicated project."
> — [aspect-build/rules_py README](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md)

That claim is now slightly stale against §8 above (there *is* a narrow
`uv_lock` consumption path since 2.2.0) but directionally correct: workspace
members are excluded, the feature is undocumented, and the maintainer quoted
confirms his own reluctance —

> "Yes, it's still experimental. We built enough to use it for our own doc
> builds, but its ux has sharp edges. I'm also not a big fan of rules_python
> being the home for the uv toolchain -- a separate, dedicated project, like
> rules_uv, would be a much better place for that."
> — rickeylev (rules_python maintainer), 2026-02-23,
> [discussion #3391](https://github.com/bazel-contrib/rules_python/discussions/3391)

`aspect_rules_py` itself: native `uv.lock` parsing with build-action (not
repository-rule) wheel installs, its own `python-build-standalone`
interpreter extension independent of rules_python, PEP 735 dependency
groups, and PEP 517/sdist builds as Bazel actions (rules_python has none —
[#2410](https://github.com/bazel-contrib/rules_python/issues/2410), open
since November 2024). Current state: 1.x is the stable branch; the README
served from `main` is **the 2.x alpha branch** (`v2.0.0-alpha.6`,
2026-08-10; latest 1.x release `v1.12.1`, 2026-08-26) — a ruleset switch
today means picking a stability track, not just a feature set.

### 11. The pypi hub-name collision

```
:::{envvar} RULES_PYTHON_PYPI_HUB_RESERVED

When `1`, any PyPI hub named "pypi" will be renamed to <module_name>_pypi
to prevent name collisions with the unified @pypi proxy repository, and a
warning is printed indicating that the renaming occurred. If not set
(defaulting to `0`), a warning is printed advising to rename the hub, and
the collision is not resolved.

:::{versionadded} 2.2.0
```
— [`docs/environment-variables.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md)

Default is `0` — **warn only**. A Bzlmod graph where two modules each run
`pip.parse(hub_name = "pypi", ...)` collides against the unified `@pypi`
proxy repo (added 2.2.0, per §Sources) unless the repo env is explicitly
set:

```console
$ bazel build --repo_env=RULES_PYTHON_PYPI_HUB_RESERVED=1 //...
```

### 12. Multi-platform PyPI dependency naming

```starlark
pip.default(
    platform = "linux_x86_64_cuda12.9",
    arch_name = "x86_64",
    os_name = "linux",
    config_settings = ["@//:is_cuda_12_9"],
)
pip.parse(
    hub_name = "my_deps",
    python_version = "3.14",
    requirements_by_platform = {
        "//:py3.14-regular-linux-x86-glibc-cpu.txt": "linux_x86_64",
        "//:py3.14-regular-linux-x86-glibc-cuda12.9.txt": "linux_x86_64_cuda12.9",
    },
)
```
— [`docs/howto/multi-platform-pypi-deps.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md)

Naming convention: `{os}_{cpu}{threading}`, with the doc's own ceiling
stated directly: *"Additional dimensions should be appended and separated
with an underscore… "* — past OS/CPU/threading, the doc offers no further
structure; every extra axis (libc, CUDA version, accelerator) is the
adopter's naming problem to solve, invented ad hoc as the CUDA/musl example
above shows (`linux_x86_64_cuda12.9`, `linux_aarch64_musl`). The Python
version is deliberately *not* part of the platform name — it's a separate
axis via `pip.parse.python_version`, so a matrix of N platforms × M Python
versions needs N `pip.default` platform declarations reused across M
`pip.parse` calls.

### 13. requires-python floor and per-project toolchain selection

`pip.default`/`pip.parse`/`python.defaults` all grew a `pyproject_toml`
attribute in 2.3.0 (2026-08-07):

```python
# python/private/pypi/extension.bzl, 2.3.3, pip.parse.pyproject_toml
"""\
Label pointing to a pyproject.toml file to read the Python version from.
When specified, the `requires-python` field is used as the `python_version`
for this `pip.parse()` call, unless `python_version` is set explicitly.

:::{note}
The version must be specified as `==X.Y.Z` (exact version with full semver).
:::

:::{versionadded} 2.3.0
:::
"""
```

That note's constraint matters: `requires-python` in `pyproject.toml` is
normally a *range* (`>=3.11`), but this attribute needs an *exact* pin
(`==3.11.4`) to resolve a `python_version` — a range does not translate
automatically. This mitigates, but does not eliminate, a spread of floors
across a monorepo: rules_python still needs one registered
`python.toolchain()` per distinct exact version a project pins to; it does
not select or interpolate a toolchain from a `>=` range on its own.

### 14. Local toolchains and the dev_dependency trap

`docs/toolchains.md`'s "Local toolchain" section carries an explicit warning
box:

> "Be sure to set `dev_dependency = True`. Using a local toolchain only
> makes sense for the root module. **If an intermediate module does it, then
> the `register_toolchains()` call will take precedence over the default
> rules_python toolchains and cause problems for downstream modules.**"

```starlark
# Correct — root module only, explicit dev_dependency
local_runtime_repo(name = "local_python3", interpreter_path = "python3", dev_dependency = True)
local_runtime_toolchains_repo(name = "local_toolchains", runtimes = ["local_python3"], dev_dependency = True)
register_toolchains("@local_toolchains//:all", dev_dependency = True)
```

A local toolchain has few constraints and is inserted early in toolchain
ordering, so it "will usually be used no matter what" once registered — the
`dev_dependency = True` flag is what keeps it from leaking into every
downstream consumer of a library module.

## Decisions

**1. The hermetic-Python setup a rule mandates.**
Decision: **MUST** call `python.toolchain(python_version = "X.Y")` (paired
with `python.defaults(python_version = "X.Y")`) explicitly in the root
module, pinning an exact minor version — never rely on rules_python's soft
default. Evidence: the soft default is real and hermetic (§2), so the
failure mode a rule must catch is not "missing hermeticity," it's "hermetic
but silently drifting" — the default tracked 3.11 at the 2.3.3 tag and 3.14
on `main` four months later, entirely outside the adopting repo's control.
Assumption named: a monorepo values build reproducibility across
`rules_python` version bumps more than it values the zero-config
convenience of the rolling default — reversible by deleting the pin if that
assumption is wrong for a given repo.

**2. The lockfile path a uv-based repo actually takes.**
Decision: `uv.lock` does **not** become the source of truth for a rules_python
migration by default. The two available paths, in order of maturity: (a)
regenerate a `requirements.txt` — via the `lock()` rule (§7) or a plain
`uv export --no-hashes -o requirements.txt` outside Bazel — and feed
`pip.parse()` the conventional way; (b) adopt `pip.parse(uv_lock = ...)`
(§8) and accept its documented gaps (no workspace/root members, undocumented
in prose, maintainer-labeled experimental). Full native `uv.lock` parity,
including workspace members, means switching the ruleset to
`aspect_rules_py` (§10) — a ruleset decision, not a `rules_python` flag.
Evidence: CHANGELOG 2.2.0/2.3.0 entries, the `uv_lock` attribute's own
docstring, `aspect_rules_py`'s README comparison table, and the maintainer's
2026-02-23 comment. Assumption named: the fleet is not signaling a ruleset
switch, so path (a) is the rule's default recommendation and path (b) is a
named, opt-in exception with its gap stated in the rule text.

**3. Whether the project-root auto-detection heuristic needs an explicit
`project=` in a monorepo.**
Decision: **MUST** set `project=` explicitly on any `lock()` target once a
repo contains more than one `pyproject.toml`. Evidence: the heuristic is
"shortest directory path," and the doc names the exact failure mode
("monorepos with multiple independent sub-projects") and the exact fix
(`project=`) itself — this is a documented, acknowledged gap, not an
inferred one, and it fails silently (wrong project directory picked, no
error) rather than loudly. Assumption named: none needed — the ruleset's own
docs already carry this as a stated warning, so the rule inherits it
directly rather than arguing from indirect evidence.

## Normative guidance candidates

1. **Pin the root module's Python toolchain version explicitly** —
   `python.defaults(python_version = "X.Y")` + `python.toolchain(python_version = "X.Y")`
   in the root `MODULE.bazel` — rather than relying on `rules_python`'s
   rolling soft default.
   Rationale: the soft default is hermetic but unpinned; its version drifts
   on every `rules_python` bump with no warning (§2).
   Verify: `grep -c 'python\.toolchain(' MODULE.bazel` in the root module.
   Empty output (0 matches) = **finding** (root module rides the rolling
   default).
   Severity: **MUST**. Bazel 7/8/9 (Bzlmod). rules_python 2.3.3 (mechanism
   verified at this version; likely applies to any Bzlmod-GA release, not
   re-verified against older tags). Settles: M-J-01.

2. **Never diagnose "no hermetic Python" purely from the absence of a
   `python.toolchain()` call under Bzlmod** — check for the rules_python
   soft default first.
   Rationale: under Bzlmod a missing `python.toolchain()` call still yields
   a hermetic (if unpinned) toolchain; the WORKSPACE host-PATH-fallback
   story does not apply (§2).
   Verify (reading heuristic): confirm the repo is Bzlmod (`MODULE.bazel`
   exists, no `WORKSPACE`/`WORKSPACE.bazel` registering
   `@bazel_tools//tools/python:autodetecting_toolchain` ahead of it) before
   asserting a host-PATH fallback exists.
   Empty output (no WORKSPACE toolchain registration found) = the soft
   default applies; treat as "hermetic but unpinned," not "non-hermetic."
   Severity: **MUST** (diagnostic correctness). Bazel 7/8/9 (Bzlmod).
   rules_python 2.3.3. Settles: M-J-01.

3. **Thread the interpreter into `pip.parse()` explicitly** — its
   `python_version` must match a `python.toolchain()` already registered in
   the module graph, or pass `python_interpreter_target=` directly; never
   assume `pip.parse()` inherits whatever toolchain a `py_binary` elsewhere
   resolves to.
   Rationale: `pip.parse` is a repository rule, evaluated before
   analysis-phase toolchain resolution — there is no toolchain to "inherit"
   at that point (§4).
   Verify: `grep -A5 'pip\.parse(' MODULE.bazel | grep -E 'python_version|python_interpreter'`.
   Empty output = **finding** (no interpreter binding at all on a `pip.parse`
   call).
   Severity: **MUST**. Bazel 7/8/9. rules_python 2.3.3 (attribute doc
   unchanged in spirit since the 0.7.0-era WORKSPACE macro). Settles: M-J-02.

4. **Do not treat rules_python's `uv pip compile`/`lock()` rule as consuming
   `uv.lock`** — it emits a fresh `requirements_lock.txt` from
   `pyproject.toml`/`requirements.in`, independent of any `uv.lock` already
   in the repo.
   Rationale: a reviewer or an LLM seeing "uv" in a Bazel file will assume
   `uv.lock` compatibility; it is not there in this rule (§7).
   Verify: `grep -rn 'load("@rules_python//python/uv:lock.bzl"' --include=*.bazel --include=*.bzl .`
   and inspect the matched `lock()` target's `srcs=` — if `uv.lock` itself
   is not one of the `srcs`, the rule is not reading it (by design).
   Empty output = no `lock()` usage found; not applicable.
   Severity: **MUST** (documentation-of-fact rule, prevents a false claim in
   review). Bazel 7/8/9. rules_python ≥1.8.0 experimental (`lock()`
   introduced), current at 2.3.3. Settles: M-J-03.

5. **Flag any use of `pip.parse(uv_lock = ...)` as an accepted-risk,
   experimental dependency** — it is undocumented outside the CHANGELOG and
   source, does not expose uv workspace/root members (fixed but not
   supported, as of 2.3.0), and the maintainer calls it experimental.
   Rationale: teams reaching for it expecting drop-in `uv.lock` parity will
   hit silently-missing workspace packages (§8).
   Verify: `grep -rn 'uv_lock\s*=' --include=MODULE.bazel .` — if found,
   confirm rules_python `bazel_dep` version is `>=2.2.0` (required) and that
   the repo's `uv.lock` has no `virtual`/editable workspace members the hub
   needs (`grep -c 'virtual = "\."' uv.lock`).
   Empty output on the first grep = not in use; no finding.
   Severity: **SHOULD** (usable, but must be a named, reviewed exception).
   Bazel 7/8/9. rules_python ≥2.2.0 (existence), ≥2.3.0 (workspace-member
   fix). Settles: M-J-03, M-J-04.

6. **Do not write or ship examples assuming `pylock.toml` (PEP 751) support**
   — it is tracked under an open issue with no shipped implementation.
   Rationale: PEP 751 is final upstream; an LLM may assume ruleset support
   followed suit. It has not (§9).
   Verify: `gh issue view 2787 --repo bazel-contrib/rules_python --json state --jq .state`.
   Output `"OPEN"` = pylock.toml unsupported, guidance must not assume it;
   `"CLOSED"` = re-verify before trusting this rule's dating.
   Severity: **MUST**. All Bazel majors. rules_python 2.3.3 (issue open as
   of 2026-07-16). Settles: M-J-04.

7. **Treat a switch to native, workspace-aware `uv.lock` consumption as a
   ruleset decision (rules_python → aspect_rules_py), not a configuration
   change.**
   Rationale: no combination of rules_python flags reaches full `uv.lock`
   parity; the maintainer has said as much (§10).
   Verify (reading heuristic): if a design doc proposes "just configure
   rules_python to read our `uv.lock` fully," check it against
   `pip.parse.uv_lock`'s documented workspace-member gap (§8) before
   accepting the plan.
   Not machine-checkable; no empty-output reading applies.
   Severity: **CONSIDER** (architecture decision, not a lint). Bazel 7/8/9.
   rules_python 2.3.3 vs aspect_rules_py 1.12.1 (stable) / 2.0.0-alpha.6.
   Settles: M-J-03.

8. **Set `project=` explicitly on every uv `lock()` target in a repo with
   more than one `pyproject.toml`.**
   Rationale: the shortest-directory-path auto-detection is documented as
   wrong for "monorepos with multiple independent sub-projects" and fails
   silently (§7).
   Verify: count `pyproject.toml` files under the repo
   (`find . -name pyproject.toml | wc -l`); if >1, every `lock()` target
   (`grep -B2 -A6 'lock(' **/*.bazel`) must carry `project =`.
   Empty output on the `lock()` grep = no `lock()` usage; not applicable. A
   nonempty `lock()` match with no `project=` attribute, in a repo with >1
   `pyproject.toml`, is a **finding**.
   Severity: **MUST**. Bazel 7/8/9 (Bzlmod only — `lock()` is
   `bzlmod only` per the doc heading). rules_python 2.3.3. Settles: M-J-05.

9. **Add a manual drift-check test (`diff_test` from `bazel_skylib`) for any
   `lock()` target** — it does not auto-generate one, unlike
   `compile_pip_requirements`.
   Rationale: without it, a stale `requirements_lock.txt` next to a changed
   `pyproject.toml` goes undetected until dependency resolution breaks
   downstream (§7).
   Verify: for each `lock(name = X, ...)` target, check for a paired test
   target depending on its output (`bazel query 'tests(//...)' | grep
   "${X}.*test"` or a manual `diff_test` referencing `X`'s `out`).
   Empty output = **finding** (no drift check for this lock target).
   Severity: **SHOULD**. Bazel 7/8/9. rules_python 2.3.3. Settles: M-J-05.

10. **Pin `py_linux_libc` values to exactly `glibc`/`musl`** — never
    `muslc`, which is not a value the flag can take.
    Rationale: rules_python's own doc example and a CHANGELOG entry both
    contain this typo; copying either verbatim ships a `config_setting`
    that silently never matches (§5).
    Verify: `grep -rn 'py_linux_libc.*muslc' --include=*.bazel --include=*.bzl .`
    Empty output = **pass** (no typo present). Any match = **finding**.
    Severity: **MUST**. Bazel 7/8/9. rules_python ≥1.0.0 (flag + musl
    variants documented). Settles: n/a (AI-agent-angle catch, not an M-ID).

11. **Verify `py_freethreaded`/`py_linux_libc` usage against the pinned
    rules_python version before authoring a rule or example that references
    them.**
    Rationale: `py_freethreaded` requires ≥0.39.0 (2024-11-13); the musl
    variants and `py_linux_libc` require ≥1.0.0 (2024-12-05) — a rule
    referencing either flag against an older pin is dead weight or an
    outright build break.
    Verify: read the `bazel_dep(name = "rules_python", version = ...)` line
    in `MODULE.bazel`; compare against the two floors above.
    Empty output (no `rules_python` dep) = not applicable.
    Severity: **MUST**. Bazel 7/8/9. rules_python ≥0.39.0 /
    ≥1.0.0 respectively. Settles: n/a (version-gating check).

12. **Never use `@rules_python//python/bin:python` to validate
    `PYTHONSAFEPATH`-dependent behaviour** — it does not set the variable;
    use `@rules_python//python/bin:repl` for a `py_binary`-equivalent
    environment.
    Rationale: the two targets look interchangeable ("run me an
    interpreter") but differ precisely on import-path safety (§6).
    Verify (reading heuristic): any doc, script, or CI step invoking
    `bazel run @rules_python//python/bin:python` to reproduce a binary's
    runtime `sys.path`/`PYTHONSAFEPATH` behaviour is using the wrong target
    — swap to `:repl`.
    Not grep-checkable in general (usage is in prose/CI scripts, not a
    fixed BUILD pattern); no empty-output reading applies.
    Severity: **SHOULD**. Bazel 7/8/9. rules_python 2.3.3. Settles: n/a
    (pin-down item from the brief).

13. **Set `RULES_PYTHON_PYPI_HUB_RESERVED=1` in any Bzlmod module graph with
    more than one `pip.parse` hub named `"pypi"`.**
    Rationale: the default (`0`) only warns; the collision is not resolved
    unless the repo env is set (§11).
    Verify: `grep -rn 'hub_name\s*=\s*"pypi"' MODULE.bazel` across every
    module in the graph you control; if more than one module defaults to
    `"pypi"`, confirm `--repo_env=RULES_PYTHON_PYPI_HUB_RESERVED=1` (or the
    equivalent `common --repo_env=` line in `.bazelrc`) is set.
    Empty output on the grep, or exactly one match = **pass** (no
    collision). Two or more matches with no `RULES_PYTHON_PYPI_HUB_RESERVED`
    set anywhere = **finding**.
    Severity: **MUST** (when a collision exists), else not applicable.
    Bazel 7/8/9 (Bzlmod). rules_python ≥2.2.0. Settles: M-J-10.

14. **Give every `pip.default` platform name a documented naming convention
    once more than two axes (OS, CPU, threading) are in play** — the
    ruleset's own doc stops at `{os}_{cpu}{threading}` and leaves further
    axes to the adopter.
    Rationale: undocumented ad hoc platform names
    (`linux_x86_64_cuda12.9_numpy2_musl…`) become unreadable and
    unreviewable past a couple of axes (§12).
    Verify (reading heuristic): count the `_`-separated segments in each
    `pip.default(platform = ...)` value; more than 3 segments with no
    accompanying comment or doc block explaining the convention is a
    finding.
    Not machine-checkable as a strict grep; treat as a review heuristic.
    Severity: **SHOULD**. Bazel 7/8/9 (Bzlmod). rules_python 2.3.3. Settles:
    M-J-11.

15. **Wire a known `requires-python` floor via `pip.parse.pyproject_toml=`
    (or `pip.default.pyproject_toml=`) rather than a hand-copied
    `python_version` string, when the floor is an exact version.**
    Rationale: a hand-copied version string drifts silently from the
    `pyproject.toml` it was copied from; the attribute reads it live (§13).
    Verify: `grep -n 'requires-python' pyproject.toml` vs.
    `grep -n 'python_version\s*=' MODULE.bazel` for the same project — if
    both exist as independent strings (not `pyproject_toml=` wiring), they
    can drift.
    Empty output on the `pyproject_toml=` grep with a hardcoded
    `python_version=` present = **finding** (missed the live-wiring option).
    Severity: **SHOULD**. Bazel 7/8/9 (Bzlmod). rules_python ≥2.3.0.
    Settles: M-J-16.

16. **A monorepo with multiple `requires-python` floors needs one
    `python.toolchain()` per distinct exact floor** — rules_python does not
    auto-select or interpolate a toolchain from a version range.
    Rationale: `pip.parse.pyproject_toml` (candidate 15) resolves what
    version a *lock* targets; it does not conjure a matching *toolchain*
    into existence (§13).
    Verify: enumerate distinct `requires-python` floors across the repo's
    `pyproject.toml` files (`grep -h requires-python **/pyproject.toml |
    sort -u`); confirm one `python.toolchain(python_version=...)` call
    exists per distinct floor actually needed at build/test time (not every
    floor needs a toolchain if some projects are dev-only or unbuilt).
    Empty output on the toolchain grep with 2+ distinct floors found =
    **finding**.
    Severity: **MUST**. Bazel 7/8/9 (Bzlmod). rules_python 2.3.3. Settles:
    M-J-16.

17. **Set `dev_dependency = True` on every local-toolchain
    `register_toolchains()` call** (`local_runtime_repo`/
    `local_runtime_toolchains_repo`) unless the calling module is genuinely
    the build's root.
    Rationale: without it, an intermediate (non-root) module's local
    toolchain takes precedence over rules_python's own toolchains for every
    downstream consumer (§14).
    Verify: `grep -B3 'register_toolchains(' MODULE.bazel | grep -c
    'local_toolchains\|local_runtime'` paired with
    `grep -c 'dev_dependency\s*=\s*True' MODULE.bazel` in the same block.
    A local-toolchain `register_toolchains()` call found without a paired
    `dev_dependency = True` = **finding**.
    Severity: **MUST**. Bazel 7/8/9 (Bzlmod). rules_python 2.3.3. Settles:
    n/a (pin-down item, toolchain-selection family).

18. **Never author WORKSPACE-style `python_register_toolchains()` /
    `pip_parse()` snippets for a Bzlmod-only repository.**
    Rationale: the Bzlmod-native equivalents are `python.toolchain()` and
    `pip.parse()` module-extension tags; WORKSPACE is legacy and, on Bazel 9,
    `--enable_workspace` is a no-op (per the frame's wave-1 correction) —
    a WORKSPACE-shaped snippet in a Bzlmod repo is either dead code or a
    sign the repo is mid-migration and should be flagged as such.
    Verify: `grep -l 'python_register_toolchains\|pip_parse(' WORKSPACE
    WORKSPACE.bazel 2>/dev/null` — presence in a repo that also has a
    `MODULE.bazel` is worth a migration-status question, not silent
    coexistence.
    Empty output = **pass** (no WORKSPACE-era Python toolchain code found).
    Severity: **MUST** for new repos / **SHOULD** flag-for-migration in an
    existing one. Bazel 8 (Maintenance, WORKSPACE still functions with
    `--enable_workspace`) vs Bazel 9 (WORKSPACE support code deleted,
    `--enable_workspace` a no-op — see the frame's wave-1 correction 2).
    rules_python 2.3.3. Settles: n/a (AI-agent-angle catch).

19. **Never register `@bazel_tools//tools/python:autodetecting_toolchain`
    to "fix" a missing Python toolchain.**
    Rationale: it is Bazel's own deprecated builtin, and "autodetecting" is
    a misnomer — "it doesn't autodetect anything. All it does is use
    `python3` from the environment a binary runs within," per
    `docs/toolchains.md` — the opposite of hermetic. The Bzlmod-era
    equivalent non-hermetic fallback, if one is genuinely wanted, is
    `@rules_python//python/runtime_env_toolchains:all`.
    Verify: `grep -rn 'autodetecting_toolchain' MODULE.bazel WORKSPACE*
    2>/dev/null`.
    Empty output = **pass**. Any match = **finding** (review why a
    deprecated, non-hermetic toolchain was registered deliberately).
    Severity: **SHOULD**. Bazel 7/8/9. rules_python 2.3.3. Settles: n/a
    (AI-agent-angle catch).

## Fleet evidence

No fleet repository declares a `MODULE.bazel` `python` extension, a
`python.toolchain()` call, or any `py_binary`/`py_library`/`py_test` target —
confirmed by [cfg §1](../bazel-audit/config-inventory.md#L41) (0
`rule()`/`py_*` targets fleet-wide) and independently by grepping
`config-inventory.md` for `py_binary`/`py_test`/`MODULE.bazel`, which returns
zero hits outside the ledger's own Bazel-repo tally. Every finding above is
therefore evaluated against upstream sources and the fleet's *Python
packaging shape*, not against fleet Bazel usage (there is none yet) — per
the topic map's Shape D/F framing.

What the fleet's shape means for a future adoption, from
[fleet §Python, lines 124-144](../bazel-audit/fleet-bazel-readiness.md#python):

- **Seven Python projects, all `uv.lock`-locked**: `ocx-sdk-python`,
  `ocx-mirror-sdk`, `arcana/nox`, `index/bot-tools`, `ocx-indexbot`,
  `ocx/test`, `grimoire/test`. Every lock carries platform-tagged wheels (1
  to 13 tag families, `manylinux`/`macosx`/`win_amd64` families) — none are
  pure-Python-only locks, so §12's multi-platform-selection ceiling is
  directly relevant to any of them, not a hypothetical.
- **No shared `requires-python` floor**: `≥3.10` (`grimoire/test`) through
  `≥3.13` (`ocx-mirror-sdk`, `ocx/test`) — candidate 16 (one
  `python.toolchain()` per distinct floor) applies verbatim; candidate 15
  (`pyproject_toml=` live-wiring, rules_python ≥2.3.0) is directly usable
  since every project already declares `requires-python` in a
  `pyproject.toml`.
- Fleet audit's own framing of the "freebie": *"every lock has native
  wheels, so `crate_universe`-style purity isn't at stake but
  `rules_python`'s `pip.parse` would need the same manylinux/macosx/win
  platform matrix uv already resolves"* — the platform-selection work in
  §12 is not avoidable by staying on `uv.lock`'s own wheel set; it has to be
  re-expressed as `pip.default`/`config_setting` pairs regardless of which
  uv path (§7 vs §8) is chosen.
- `arcana/nox` — zero runtime deps by contract, shipped as a zipapp — is the
  fleet's one Python project needing *none* of this: it has no PyPI
  dependencies to resolve at all (M-J-15, out of this topic's scope but
  worth naming as the negative case so a rule doesn't over-apply toolchain
  guidance to a target that needs none of it).
- Given zero fleet `pip.parse`/`lock()` usage exists to audit, every
  normative candidate above is stated as forward guidance for adoption, not
  as a violation found in the fleet today — consistent with the topic map's
  "uncovered" coverage marking for every M-J-* row this file settles.

## AI-agent angle

- **Hallucinated host-PATH fallback under Bzlmod.** An agent trained mostly
  on WORKSPACE-era material will confidently claim "no `python.toolchain()`
  call means `py_binary` uses whatever `python3` is on PATH." Under Bzlmod
  this is false (§2) — the mechanical check is candidate 2: confirm the repo
  is Bzlmod-only before asserting a host-PATH fallback exists at all.
- **Copying the `muslc` typo.** Both of rules_python's own canonical
  sources for this flag (a docs page and a CHANGELOG entry) contain the
  wrong value once. An agent reading either source and generating a
  `config_setting` will silently ship a filter that never matches. Catch:
  candidate 10's grep for `muslc` in any generated Starlark.
  literal-value copying from a doc snippet is exactly where this fails —
  cross-check against `python/private/flags.bzl`'s enum, not the prose.
- **Assuming `pip.parse(uv_lock=...)` gives full `uv.lock` parity.** The
  attribute name and its one-line doc ("primary source for package
  metadata") read as complete; the workspace/root-member exclusion is only
  in a CHANGELOG bullet, not the attribute doc itself. An agent skimming
  only the docstring will over-promise this feature. Catch: candidate 5 —
  treat any `uv_lock=` sighting as needing an explicit workspace-member
  check (`grep -c 'virtual = "\."' uv.lock`), not a rubber stamp.
- **Hallucinating a `pip.parse(pylock = ...)` or similar attribute.** PEP
  751 is final and widely known; an agent may assume ruleset support
  followed. It has not — `pylock.toml` support is `gh-issue #2787`, still
  open. Catch: candidate 6, verify the issue's `state` before writing any
  guidance or example that assumes it.
- **Hallucinating a global bazel flag for uv, e.g.
  `--experimental_uv_lock` or `--incompatible_uv_native_resolution`.** No
  such flag exists; the actual mechanism is a per-`pip.parse`-call
  *attribute* (`uv_lock=`), not a startup/build flag. Catch: grep the
  rules_python source (`python/private/pypi/extension.bzl`) for the
  attribute name before trusting a flag name that "sounds right" — nothing
  under `//command_line_reference` on bazel.build will list a
  rules_python-owned attribute as a flag.
- **Writing WORKSPACE-style `python_register_toolchains()`/`pip_parse()`
  for a repo that already has a `MODULE.bazel`.** These macros still exist
  in rules_python 2.3.3 (for genuine mixed-mode migrations) but are dead
  weight — or actively wrong — in a Bzlmod-only repo, and doubly wrong
  going into Bazel 9 where `--enable_workspace` is a no-op. Catch: candidate
  18's grep for these symbols alongside an existing `MODULE.bazel`.
- **Registering the deprecated autodetecting toolchain to "fix" a missing
  Python.** The name sounds like exactly the hermetic-detection behavior an
  agent is trying to configure; it is the opposite. Catch: candidate 19.
- **Assuming `requires-python`'s `>=` range can be handed straight to
  `pip.parse.pyproject_toml=`.** The attribute's own doc requires an exact
  `==X.Y.Z` pin; a `>=3.11` floor from a real `pyproject.toml` will not
  resolve through this attribute without translation. Catch: read the
  attribute doc's note before wiring it, and verify with a manual
  `python_version=` if the floor is a range rather than a pin.

## Contested / evolving

- **Where rules_python's uv work should live is unresolved, and the ruleset
  keeps shipping features into the disputed location anyway.** The
  maintainer said (2026-02-23) he'd rather a dedicated project — like
  `rules_uv` — owned this, not `rules_python` itself. Four months later
  (2.2.0, 2026-06-30) `rules_python` shipped the `uv_lock` attribute inside
  its own `pip.parse`, and refined it again at 2.3.0 (2026-08-07). As of
  2.3.3 (2026-09-04) there is still no separate `rules_uv` project and no
  prose documentation of the attribute. Trend: features are landing in
  `rules_python` core faster than either a dedicated project materializes
  or the docs catch up — track [discussion #3391](https://github.com/bazel-contrib/rules_python/discussions/3391)
  and [issue #2787](https://github.com/bazel-contrib/rules_python/issues/2787)
  for whether this consolidates or forks.
  - Owner's Q2 decision (this program's map, not rules_python's) keeps
    `rules_ocx` on Bazel 8.7.0 rather than 9.x; nothing in this topic is
    Bazel-9-gated, so that decision does not affect any finding here.
- **`aspect_rules_py`'s own comparison claims are already slightly behind
  rules_python's shipped feature set** (the "no `uv.lock` consumption" line,
  §10) — a vendor README can go stale exactly like a competitor's docs can.
  Read both a ruleset's docs and its CHANGELOG, and read a competing
  ruleset's own comparison claims against the *target* ruleset's current
  source, not just its prose.
- **`aspect_rules_py` 2.x is alpha** (`v2.0.0-alpha.6`, 2026-08-10) while 1.x
  is the stable, documented branch — any recommendation to adopt it for
  native `uv.lock` support needs to state which branch, since the `main`
  README (fetched here) describes 2.x.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_python README.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/README.md) | Ruleset's own top-level doc | main, read 2026-09-05 | States the `uv.lock`/`requirements.txt` design intent and the "not caching pip downloads since 2.0" claim directly. |
| [rules_python BZLMOD_SUPPORT.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/BZLMOD_SUPPORT.md) | Ruleset's Bzlmod overview | main, read 2026-09-05 | The exact "default toolchain is no longer based on the locally installed system Python" sentence that corrects the brief's premise. |
| [rules_python docs/toolchains.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/toolchains.md) | Ruleset's toolchain configuration reference (945 lines) | main, read 2026-09-05 | Root/library-module patterns, the soft-default explanation, `:python` vs `:repl`, local-toolchain `dev_dependency` warning, all in the ruleset's own words. |
| [rules_python docs/pypi/lock.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | Ruleset's lockfile-format doc | main, read 2026-09-05 | States "only `requirements.txt` format," the `lock()` rule's project-auto-detection heuristic and its documented monorepo warning. |
| [rules_python docs/howto/multi-platform-pypi-deps.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md) | Ruleset how-to guide | main, read 2026-09-05 | Source of the platform-naming convention and of the `muslc`/`musl` doc-bug finding. |
| [rules_python docs/environment-variables.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md) | Ruleset env-var reference | main, read 2026-09-05 | Authoritative wording for `RULES_PYTHON_PYPI_HUB_RESERVED` (warn-only default) and the 2.1.0 removal of `RULES_PYTHON_ENABLE_PYSTAR`/`PIPSTAR`. |
| [rules_python CHANGELOG.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | Dated release notes, 0.24.0–2.3.3 | main, read 2026-09-05 | The only place the exact version each behaviour shipped in is stated — corrected the topic map's 2.1.0→2.2.0/2.3.0 dating error for `uv_lock`. |
| [rules_python MODULE.bazel, 2.3.3 tag](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/MODULE.bazel) | Ruleset's own Bzlmod manifest | tag 2.3.3, 2026-09-04 | Proves the soft-default toolchain (`python.defaults(python_version = "3.11")`) exists and is pinned to 3.11 at this release. |
| [rules_python MODULE.bazel, main](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/MODULE.bazel) | Same file, unreleased tip | main, read 2026-09-05 | Shows the soft default has already drifted to 3.14 — the concrete evidence for "unpinned rolling default" as the real risk. |
| [python/private/python.bzl, 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/python.bzl) | Module-extension implementation source | tag 2.3.3 | The `elif mod.name == "rules_python" and not default_toolchain` branch is the mechanical proof of the soft-default claim. |
| [python/private/pypi/extension.bzl, 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/extension.bzl) | `pip` module-extension implementation source | tag 2.3.3 | Source of the `uv_lock` (`versionadded 2.2.0`) and `pyproject_toml` (`versionadded 2.3.0`) attribute docstrings, undocumented anywhere else. |
| [python/private/flags.bzl, 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/flags.bzl) | Toolchain-selection flag enum source | tag 2.3.3 | Ground truth for `LibcFlag.MUSL = "musl"`, settling the `muslc` doc-bug finding. |
| [rules_python releases](https://github.com/bazel-contrib/rules_python/releases) (via `gh api`) | Release list | queried 2026-09-05 | Confirms 2.3.3 published 2026-09-04 as the current release. |
| [rules_python issue #1463](https://github.com/bazel-contrib/rules_python/issues/1463) | Closed bug report + maintainer explanation | opened 2023-10-05, closed | The concrete "it worked without the pin because the host had build tools" failure mode behind the interpreter-threading rule. |
| [rules_python discussion #3391](https://github.com/bazel-contrib/rules_python/discussions/3391) | Maintainer Q&A thread | opened 2025-11-05, maintainer reply 2026-02-23 | Direct, dated maintainer quote on uv's experimental status and preferred long-term home. |
| [rules_python issue #2787](https://github.com/bazel-contrib/rules_python/issues/2787) | Open feature-tracking issue | opened 2025-04-18, updated 2026-07-16 | Authoritative state (open) for `pylock.toml`/PEP 751 support. |
| [Aspect: "Python toolchains in rules_python"](https://aspect.build/blog/python-toolchains) | Vendor explainer / historical blog post | 2022-03-11, rules_python 0.7.0 | Clearest verbatim statement of the repository-rule/toolchain-resolution ordering mechanism; mechanism still architecturally current even though the post predates Bzlmod. |
| [aspect-build/rules_py README](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md) | Competing ruleset's own doc | main, read 2026-09-05 | The comparison table and maintainer-attribution quote that frame where native `uv.lock` support actually lives. |
| [aspect-build/rules_py releases](https://github.com/aspect-build/rules_py/releases) (via `gh api`) | Release list | queried 2026-09-05 | Confirms 1.x (`v1.12.1`) is stable and 2.x (`v2.0.0-alpha.6`) is alpha — the branch the fetched README actually describes. |
