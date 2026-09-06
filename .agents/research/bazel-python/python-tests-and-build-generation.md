---
title: Python tests and BUILD generation under Bazel
topic: python-tests-and-build-generation
group: bazel-python
family: BZL-PY
agent: sonnet-wave3a-bazel-python
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 20
primary_sources_count: 17
settles: [M-J-12, M-J-13, M-I-15]
scope: |
  Covered: why bazel needs explicit test targets where pytest expects discovery,
  the pytest-bazel wrapper (0.1.6) versus the legacy rules_python_pytest macro,
  the Gazelle Python plugin's directives/annotations/manifest contract and its
  own rules_python version floor, and replacing an env-var-plus-fallback-path
  binary lookup with a py_test runfiles data dependency.
  Not covered: hermetic interpreter/pip.parse ordering and uv resolution
  (python-toolchains-and-pypi-resolution), bootstrap modes and precompiling
  (python-bootstrap-imports-and-precompiling), size/sharding/flakiness
  taxonomy (test-contract-sizing-and-flakiness), analysistest/coverage
  (testing-starlark-and-coverage), and pyproject.toml/uv.lock hygiene itself
  (owned by the python-packaging set).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Why Bazel needs an explicit test target where pytest expects discovery](#1-why-bazel-needs-an-explicit-test-target-where-pytest-expects-discovery)
   2. [Two wrappers, one lineage: rules_python_pytest versus pytest-bazel](#2-two-wrappers-one-lineage-rules_python_pytest-versus-pytest-bazel)
   3. [pytest-bazel's env-var-to-flag mapping, exactly](#3-pytest-bazels-env-var-to-flag-mapping-exactly)
   4. [The Gazelle Python plugin: setup and directives](#4-the-gazelle-python-plugin-setup-and-directives)
   5. [The gazelle_python.yaml manifest: missing versus stale](#5-the-gazelle_pythonyaml-manifest-missing-versus-stale)
   6. [The plugin's rules_python floor and the stdlib-list bug below it](#6-the-plugins-rules_python-floor-and-the-stdlib-list-bug-below-it)
   7. [Conftest handling is Gazelle's job, not the wrapper's](#7-conftest-handling-is-gazelles-job-not-the-wrappers)
   8. [Replacing the env-var binary seam with runfiles](#8-replacing-the-env-var-binary-seam-with-runfiles)
   9. [Bazel 9 removes the free ride: py_test needs an explicit load()](#9-bazel-9-removes-the-free-ride-py_test-needs-an-explicit-load)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- Bazel's native `py_test` runs `unittest`-style discovery via the file's own `if __name__ == "__main__"` entry point; pointing `srcs` at a pytest-style test file with no shim makes the target **silently pass with zero tests run** ([rules_python#1972](https://github.com/bazel-contrib/rules_python/issues/1972)).
- The current, recommended pytest wrapper is **pytest-bazel 0.1.6** ([CHANGELOG](https://github.com/aignas/pytest-bazel/blob/main/CHANGELOG.md)), which supersedes the older `rules_python_pytest` `py_pytest_test` macro — that macro's own README calls itself a stopgap "until `rules_python` offers it" ([rules_python_pytest README](https://github.com/caseyduquettesc/rules_python_pytest/blob/main/README.md)).
- pytest-bazel is a thin `pytest_bazel.main()` entrypoint (or a `py_console_script_binary` macro), not a Bazel rule — it reads Bazel's [test-encyclopedia](https://bazel.build/reference/test-encyclopedia) env vars and translates them into pytest flags at runtime ([pytest_bazel/main.py](https://github.com/aignas/pytest-bazel/blob/main/pytest_bazel/main.py)).
- `--test_filter` reaches the test as `TESTBRIDGE_TEST_ONLY`; pytest-bazel turns it into `-k <filter>` and treats pytest exit code **5** (`NO_TESTS_COLLECTED`, [pytest exit codes](https://docs.pytest.org/en/stable/reference/exit-codes.html)) as a pass **only** when a filter was applied — with no filter, zero tests collected still fails the target.
- Sharding needs the `pytest-shard` plugin present at runtime; pytest-bazel maps `TEST_SHARD_INDEX`/`TEST_TOTAL_SHARDS` to `--shard-id`/`--num-shards` and touches `TEST_SHARD_STATUS_FILE` — skip that dependency and Bazel fails a sharded test outright, per the test-encyclopedia contract.
- The Gazelle Python plugin generates `py_library`/`py_binary`/`py_test` targets by walking up from each `.py` file to find `gazelle_python.yaml`; that file **must exist** (even empty, `touch` is enough) before the manifest-update target will even build ([rules_python#1156](https://github.com/bazel-contrib/rules_python/issues/1156)).
- With the default `python_validate_import_statements true`, an import Gazelle can't resolve is a **loud generation-time error**, not a silent one ([rules_python#709](https://github.com/bazel-contrib/rules_python/issues/709)) — the brief's "silently fails" premise only holds for a narrower case (see Finding 5).
- The real silent-failure path is stdlib **misclassification**: gazelle plugin versions before 2.3.0 (2026-08-07) fell back to the Python 3.11 stdlib list for `python_version` 3.13/3.14, so a removed-since-3.11 module (`telnetlib`) was still treated as stdlib and a 3.14-added module (`compression.zstd`) was treated as third-party — either way, `deps` end up silently wrong ([CHANGELOG](https://github.com/bazel-contrib/rules_python/blob/main/CHANGELOG.md) 2.3.0, [#3978](https://github.com/bazel-contrib/rules_python/pull/3978)).
- That fix is also the plugin's version floor: `rules_python_gazelle_plugin` 2.3.0+ requires `rules_python >= 1.5.0` — a **BREAKING** bump, because the extension now branches on the `is_python_3.14` toolchain flag that earlier `rules_python` releases don't define.
- `rules_python_gazelle_plugin` tracks `rules_python`'s own version number; both are pinned at **2.3.3** as of 2026-09-04/09-05 ([BCR metadata](https://bcr.bazel.build/modules/rules_python_gazelle_plugin/metadata.json)).
- Sibling `conftest.py` files have been auto-wired into `py_test` `deps` since `rules_python` 0.14.0; **ancestor** `conftest.py` files (not just same-directory) only since 1.9.0 (2026-02-21, [PR #3498](https://github.com/bazel-contrib/rules_python/pull/3498)) — a hand-written pre-1.9.0-vintage BUILD file can be missing a real conftest dependency and fail at collection time with no obvious cause.
- The `gazelle_python_manifest` macro's file-list attribute is named **`requirements`** in the pinned 2.3.3 release, not `lockfiles` — the rename (which explicitly documents `uv.lock` support) is unreleased, present only in `main`-branch docs under a `VERSION_NEXT_FEATURE` marker. It is format-agnostic either way (used only for an integrity hash), so `requirements = "//:uv.lock"` already works under the current name.
- That `uv.lock` acceptance is orthogonal to whether `pip.parse()` resolves against it — Conflict 4 already settles that it does not; the manifest only uses the lockfile to detect staleness, never to drive dependency resolution.
- Both fleet acceptance harnesses (`ocx/test`, `grimoire/test`) resolve the Rust binary under test through an env var with a fixed relative-path fallback (`ocx/test/conftest.py:211-219`, `grimoire/test/conftest.py:300-305`) — exactly the seam Bazel's runfiles mechanism removes.
- `py_test(data = [":the_binary"])` plus `@rules_python//python/runfiles` and `Runfiles.Create().Rlocation("<workspace>/path/to/binary")` replaces the env var and its fallback path entirely — no `<TOOL>_COMMAND` override is needed, though one can be kept as an escape hatch for running outside Bazel ([runfiles README](https://github.com/bazel-contrib/rules_python/blob/main/python/runfiles/README.md)).
- To pass that binary's path as a test argument, use `$(rlocationpath //path:bin)`, not `$(rootpath)` (only works with `--enable_runfiles`, off by default on Windows) or `$(location)` (legacy, ambiguous execpath/rootpath) — bazel.build's own make-variables reference names `rlocationpath` as "the preferred approach."
- Bazel 9 deletes the WORKSPACE-era autoload of native rules (`--incompatible_autoload_externally` now defaults empty); every `py_test`/`py_binary`/`py_library` needs its own explicit `load("@rules_python//python:py_*.bzl", "py_*")` ([Bazel 9 LTS post](https://blog.bazel.build/2026/01/20/bazel-9.html)) — code an LLM wrote from pre-2026 training data will compile on 8 and fail to load on 9.
- No fleet repository uses `py_test`, `py_library`, or the Gazelle Python plugin today (shape D/F only); every finding here grounds on the ruleset's own docs, changelog, and source, not on fleet code.
- Standing up Gazelle costs a `MODULE.bazel` dependency triple (`gazelle`, `rules_python`, `rules_python_gazelle_plugin`), a manifest-generation target, and a CI-run `.test` target — worth it once hand-maintaining `py_library`/`py_test` targets across a growing file count outweighs that fixed cost (see Decisions).

## Findings

### 1. Why Bazel needs an explicit test target where pytest expects discovery

Plain pytest walks the filesystem and collects every `test_*.py`/`*_test.py` file it finds; nothing declares which files are tests ahead of time. Bazel's `py_test` rule has no equivalent: it takes a fixed `srcs`/`main` and, absent extra wiring, runs `unittest`'s own auto-discovery inside that one file. The two models don't just differ, they fail differently — an `rules_python` maintainer put it plainly while triaging the request to make Gazelle generate a pytest shim:

> "without the shim, `py_test(srcs=["some.pytest.test.py"])` silently passes without running any tests!" — [rules_python#1972](https://github.com/bazel-contrib/rules_python/issues/1972)

That is the concrete, version-independent answer to "why explicit targets": a `py_test` pointed at a pytest-style file with no pytest entrypoint is a target that Bazel reports **green**, forever, having executed nothing. This is the failure mode every wrapper below exists to close.

### 2. Two wrappers, one lineage: rules_python_pytest versus pytest-bazel

**`rules_python_pytest`** ([caseyduquettesc/rules_python_pytest](https://github.com/caseyduquettesc/rules_python_pytest)) is the older macro. Its own README states its scope and its expiry date plainly:

```
`pytest` support in `rules_python` is not provided out of the box... Progress on
the feature request seems to have stagnated so I've gone ahead and put at
least something in the public domain until `rules_python` offers it.
```
> — [rules_python_pytest README](https://github.com/caseyduquettesc/rules_python_pytest/blob/main/README.md)

It ships one macro, `py_pytest_test`, supports `--test_filter` and (with `requirement("pytest-shard")` added by hand) sharding, and states its own disclaimer: "this only has a simple smoke test and isn't documented terribly well... the expectation is that this will eventually be rolled into `rules_python` and at that point these rules will be deprecated."

**`pytest-bazel`** ([aignas/pytest-bazel](https://github.com/aignas/pytest-bazel), current **0.1.6**) is the successor, explicitly built to unify `rules_python_pytest` and `aspect_rules_py`'s `pytest.py.tmpl` template:

> "Special thanks to rules_python_pytest and rules_py projects that had some great ideas how to integrate with pytest. This attempts to unify all of the approaches." — [pytest-bazel docs index](https://pytest-bazel.readthedocs.io/latest/)

It supports pytest 7.0 and 8.0, ships as a PyPI package (`pytest-bazel[all]`), and is usable two ways:

```python
# BUILD.bazel — as a py_test entrypoint replacement for unittest.main()
load("@rules_python//python:py_test.bzl", "py_test")

py_test(
    name = "my_test",
    deps = ["@pypi//pytest_bazel"],
)
```
```python
# my_test.py
import pytest_bazel
if __name__ == "__main__":
    pytest_bazel.main()
```

or as a `py_console_script_binary`-based macro (the documented replacement for `rules_python_pytest`'s `py_pytest_test`):

```starlark
load("@rules_python//python:py_library.bzl", "py_library")
load("@rules_python//python:py_test.bzl", "py_test")
load("@rules_python//python/entry_points:py_console_script_binary.bzl", "py_console_script_binary")

def pytest_test(name, srcs, **kwargs):
    deps = kwargs.pop("deps", [])
    py_library(name = name + ".lib", srcs = srcs, deps = deps, testonly = True)
    py_console_script_binary(
        name = name,
        pkg = "@pypi//pytest_bazel",
        script = "pytest_bazel",
        binary_rule = py_test,
        deps = [name + ".lib"],
        testonly = True,
    )
```
— [pytest-bazel usage docs](https://github.com/aignas/pytest-bazel/blob/main/docs/usage.md)

Both wrappers exist for the same reason (Finding 1); pytest-bazel is the one still receiving releases as of 2026-09 and the one that ported `--test_runner_fail_fast`, `pytest-randomly` seeding, and correct `--test_filter` handling for filename-shaped filters ([CHANGELOG](https://github.com/aignas/pytest-bazel/blob/main/CHANGELOG.md) 0.1.2, 0.1.3, 0.1.6).

### 3. pytest-bazel's env-var-to-flag mapping, exactly

Read directly from [`pytest_bazel/main.py`](https://github.com/aignas/pytest-bazel/blob/main/pytest_bazel/main.py) (0.1.6):

| Bazel test-encyclopedia env var | pytest-bazel behavior |
|---|---|
| `BAZEL_TEST` | If unset, pytest-bazel short-circuits and does nothing special — safe to run the same entrypoint outside Bazel. |
| `TESTBRIDGE_TEST_ONLY` (`--test_filter`) | Appended as `-k <value>`; a leading-uppercase value is read as `TestClass.test_fn` and rewritten to `TestClass::test_fn`. |
| `TEST_SHARD_INDEX` / `TEST_TOTAL_SHARDS` | Mapped to `--shard-id=<n>` / `--num-shards=<n>` — requires `pytest-shard` importable at runtime. |
| `TEST_SHARD_STATUS_FILE` | Touched only if `pytest_shard` is importable — this is Bazel's own sharding-support handshake ([test-encyclopedia](https://bazel.build/reference/test-encyclopedia)): skip the dependency and a sharded test **fails**, it does not silently run unsharded. |
| `TEST_RANDOM_SEED` / `TEST_RUN_NUMBER` | Seeds `pytest-randomly` if present, else Python's own `random.seed()`. |
| `TESTBRIDGE_TEST_RUNNER_FAIL_FAST` (`--test_runner_fail_fast`) | Appends `--exitfirst`. |
| `TEST_TMPDIR` | Passed through as `--basetemp=<dir>/pytest`. |
| `TEST_WARNINGS_OUTPUT_FILE` | `warnings.showwarning` is monkey-patched to write here for the test's duration. |
| `XML_OUTPUT_FILE` | Passed as `--junitxml=<file>`. |

It also always adds `--ignore=external`, `--ignore-glob=**/site-packages`, and `-p no:cacheprovider`. On exit, `pytest.ExitCode.NO_TESTS_COLLECTED` (**5**, per [pytest's own exit-codes doc](https://docs.pytest.org/en/stable/reference/exit-codes.html)) is remapped to **0** only when `TESTBRIDGE_TEST_ONLY` was set — an unfiltered run that collects zero tests still fails with exit 5. That asymmetry is deliberate: it is exactly what stops the silent-pass failure mode from Finding 1 from resurfacing through a wrapper that itself collects nothing.

### 4. The Gazelle Python plugin: setup and directives

Wiring: three `bazel_dep`s (`gazelle`, `rules_python`, `rules_python_gazelle_plugin`, version-matched to `rules_python`), a `modules_mapping` + `gazelle_python_manifest` pair next to an (initially empty) `gazelle_python.yaml`, and a `gazelle_binary`/`gazelle` pair in the root `BUILD.bazel` — [installation_and_usage.md](https://rules-python.readthedocs.io/en/latest/gazelle/docs/installation_and_usage.md).

Directives that matter for a monorepo where Python does not own the workspace root ([gazelle/docs/directives.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/directives.md)):

- **`# gazelle:python_root`** — set in the package that should act as the import root (e.g. `src/BUILD.bazel`). No argument. Every generated target under it gets an `imports` attribute (`[".."]`, `["../.."]`, …) so absolute imports resolve. Default: none — omit it and Gazelle treats the repo root as the import root, which is wrong for a `src/`-layout package.
- **`# gazelle:python_extension enabled|disabled`** — turns the whole extension on or off per subtree, inherited by sub-packages. Default `enabled`.
- **`# gazelle:python_manifest_file_name <name>`** — overrides the default `gazelle_python.yaml` filename. Default `gazelle_python.yaml`.
- **`# gazelle:python_generation_mode file|package|project`** — per-file, per-package (default), or whole-subtree target generation.
- **`# gazelle:python_test_file_pattern <glob,...>`** — which filenames become `py_test`. Default `*_test.py,test_*.py`.
- **`# gazelle:python_include_ancestor_conftest true|false`** — added in **1.9.0** (2026-02-21); see Finding 7.
- **`# gazelle:python_generate_pyi_deps` / `python_generate_pyi_srcs`** — added in 1.6.0, **default flipped from `false` to `true` in 2.1.0** (2026-06-17, [#3753](https://github.com/bazel-contrib/rules_python/pull/3753)): a repo pinned below 2.1.0 that relies on the old default will see new `pyi_deps`/`pyi_srcs` attributes appear on upgrade.

### 5. The gazelle_python.yaml manifest: missing versus stale

Two distinct failure surfaces, both grounded in primary sources rather than the single "silently fails" framing:

**Missing entirely.** The manifest-update target declares `gazelle_python.yaml` as an input; if the file does not exist at all, `bazel run //:gazelle_python_manifest.update` fails to build with a plain, loud Bazel error:

```
ERROR: .../BUILD.bazel:49:24: Middleman .../gazelle_python_manifest.update-runfiles failed:
missing input file '//:gazelle_python.yaml'
```
— [rules_python#1156](https://github.com/bazel-contrib/rules_python/issues/1156), still open as a UX gap ("I would recommend that we create the file if it does not exist"). The fix is a one-time `touch gazelle_python.yaml` before the first run; this is not automated as of 2026-09-05.

**Genuinely unresolvable import, default settings.** With `python_validate_import_statements` at its default `true`, `bazel run //:gazelle` itself errors when it meets an import with no manifest entry, no `resolve` directive, and no `ignore` annotation:

```
gazelle: ERROR: failed to validate dependencies for target "...": "google.cloud" at line 4
from "subdir1/subdir2/test2.py" is an invalid dependency: possible solutions:
        1. Add it as a dependency in the requirements.txt file.
        2. Instruct Gazelle to resolve to a known dependency using the gazelle:resolve directive.
        3. Ignore it with a comment '# gazelle:ignore google.cloud' in the Python file.
```
— [rules_python#709](https://github.com/bazel-contrib/rules_python/issues/709). This is loud, not silent.

**The real silent path is misclassification, not absence** — see Finding 6. Stale-in-the-sense-of-drifted (a dependency added to `requirements.txt`/`uv.lock` after the manifest was last regenerated) is caught by the `.test` target failing on the next `bazel test //:gazelle_python_manifest.test`, provided that target is wired into CI; it is silent only if nobody runs it.

### 6. The plugin's rules_python floor and the stdlib-list bug below it

`rules_python_gazelle_plugin` **2.3.0** (2026-08-07) made a **BREAKING** change: it now requires `rules_python >= 1.5.0`, because the extension's standard-library-module list selection branches on the `is_python_3.14` config setting, which older `rules_python` releases don't define ([CHANGELOG](https://github.com/bazel-contrib/rules_python/blob/main/CHANGELOG.md) §2.3.0).

The same release fixed the bug that made the floor necessary:

> "The Python extension now uses the correct standard library module list for `python_version` 3.13 and 3.14; previously both fell back to the 3.11 list, so modules added or removed since then (e.g. `compression.zstd`, `telnetlib`) were misclassified. The fallback list for unrecognized versions is now the newest available one rather than 3.11." — [rules_python#3978](https://github.com/bazel-contrib/rules_python/pull/3978)

Concretely, on a plugin version **below 2.3.0** targeting Python 3.13 or 3.14:
- `telnetlib` (removed in 3.13) is still classified as stdlib, so an import of it is silently *not* looked up in the manifest at all — even a real third-party package that happened to be named `telnetlib` would never get a `deps` entry.
- `compression.zstd` (added in 3.14) is misclassified as *not* stdlib, so Gazelle demands a manifest entry for a module that needs none — a false-positive "invalid dependency" error for a genuinely stdlib import.

Both are consequences of the fallback list, not of a missing or stale `gazelle_python.yaml` — the manifest is a red herring here; the bug is entirely in the plugin's internal stdlib table. As of 2026-09-05, `rules_python_gazelle_plugin` and `rules_python` are both at **2.3.3** ([BCR metadata](https://bcr.bazel.build/modules/rules_python_gazelle_plugin/metadata.json)), so any project standing up Gazelle today is already past the fix — the floor and the bug matter only when auditing an existing pin below 2.3.0.

### 7. Conftest handling is Gazelle's job, not the wrapper's

pytest-bazel does nothing special for `conftest.py` — it relies on pytest's own discovery walking the sandbox's runfiles tree, which only contains files Bazel actually staged. That means a `conftest.py` a test needs must appear in that target's `deps`/`data`; Gazelle, not the wrapper, is what wires that automatically, and it has done so in two stages:

- **Since rules_python 0.14.0** ([PR #879](https://github.com/bazel-contrib/rules_python/pull/879)): a **sibling** `conftest.py` (same directory as the test) is added as a `:conftest` dependency automatically. The `# gazelle:include_pytest_conftest false` annotation (added 1.6.0) opts a single test file out.
- **Since 1.9.0** (2026-02-21, [PR #3498](https://github.com/bazel-contrib/rules_python/pull/3498)) fixing [#3497](https://github.com/bazel-contrib/rules_python/issues/3497): **ancestor** `conftest.py` files (in any parent package, not just the same directory) are added too, by default. `# gazelle:python_include_ancestor_conftest false` reverts to pre-1.9.0 (sibling-only) behavior.

A hand-maintained BUILD file (no Gazelle) has no such safety net: forgetting a `conftest.py` in `data`/`deps` produces a pytest collection error inside the sandbox that looks like a fixture bug, not a missing-dependency bug — see [gazelle/docs/annotations.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/annotations.md).

### 8. Replacing the env-var binary seam with runfiles

Bazel's own runfiles library ([`@rules_python//python/runfiles`](https://github.com/bazel-contrib/rules_python/blob/main/python/runfiles/README.md)) is the documented mechanism for exactly the fleet's pattern — a test that needs to invoke a separately-built binary:

```python
r = Runfiles.Create()
with open(r.Rlocation("my_workspace/path/to/my/data.txt"), "r") as f:
    ...
```

`my_workspace` is the module/workspace name from `MODULE.bazel`. For a subprocess (the fleet's exact shape — both harnesses `subprocess.run()` the CLI under test), the library also hands back the environment a child process needs to resolve its own runfiles:

```python
import subprocess
from python.runfiles import Runfiles

r = Runfiles.Create()
env = {}
env.update(r.EnvVars())
p = subprocess.run([r.Rlocation("path/to/binary")], env=env)
```

The `py_test`/`py_binary` side just needs the tool as a `data` dependency and the runfiles library as a `deps` entry:

```starlark
py_test(
    name = "acceptance_test",
    srcs = ["conftest.py", "test_cli.py"],
    data = ["//cli:the_binary"],       # any rule producing an executable, incl. rust_binary
    deps = ["@rules_python//python/runfiles", "@pypi//pytest_bazel"],
)
```

No env var, no fallback path: `Runfiles.Create().Rlocation(...)` finds the binary wherever Bazel placed it in the sandbox, on every platform, and fails loudly (`Runfiles.CreateOrRaise()`) if runfiles can't be found at all — a strictly stronger contract than "assert the fallback path exists."

If the binary's path must be passed as a literal test argument instead of looked up at runtime, [bazel.build's make-variables reference](https://bazel.build/reference/be/make-variables) is explicit about which expansion to use:

```starlark
# Correct — works on every platform, including with runfiles unavailable
args = ["$(rlocationpath //cli:the_binary)"]

# Wrong for this purpose — legacy, and rootpath needs --enable_runfiles
# (defaults off on Windows); location is execpath-or-rootpath depending
# on context and the docs call it "not recommended"
args = ["$(rootpath //cli:the_binary)"]
```

### 9. Bazel 9 removes the free ride: py_test needs an explicit load()

Bazel 9.0 (2026-01-20) set `--incompatible_autoload_externally` to empty by default:

> "In 9.0, this flag is empty by default, which means that all rulesets have to be explicitly loaded from external modules." — [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html)

A `BUILD.bazel` file that calls `py_test(...)` or `py_binary(...)` with no `load("@rules_python//python:py_test.bzl", "py_test")` (or the combined `python:defs.bzl` import) compiled on Bazel 7/8 via autoload; on Bazel 9 it fails at load time with an undefined-symbol error. Every code snippet in Finding 2, 4, and 8 above carries its `load()` for this reason — it is not boilerplate, it is the Bazel-9 floor.

## Decisions

**Recommended pytest wrapper: pytest-bazel 0.1.6.**
Evidence: it is the actively-released successor explicitly designed to unify `rules_python_pytest` and `aspect_rules_py`'s pytest template ([pytest-bazel docs](https://pytest-bazel.readthedocs.io/latest/)); `rules_python_pytest`'s own README calls itself a stopgap slated for deprecation once `rules_python` or a successor covers the ground. Assumption named: this is a judgment call between two small, single-maintainer projects, not a rules_python-blessed default — rules_python itself ships no first-party pytest integration as of 2.3.3, and the Gazelle plugin's own test-entrypoint generation issue ([#1972](https://github.com/bazel-contrib/rules_python/issues/1972)) is still open, so "pick a wrapper" remains a per-adopter decision rather than a fixed API. Reversible: swapping the wrapper only touches the one macro/entrypoint file shown in Finding 2.

**Gazelle generation is worth standing up above roughly 30-50 hand-maintained Python targets in one project, not below it.**
Evidence: the fixed cost is a `MODULE.bazel` triple of `bazel_dep`s, a `modules_mapping`/`gazelle_python_manifest` pair, a manifest file, a `gazelle` binary target, and a CI-wired `.test` target — five moving pieces before a single BUILD file is generated ([installation_and_usage.md](https://rules-python.readthedocs.io/en/latest/gazelle/docs/installation_and_usage.md)). Below that scale, hand-writing `py_library`/`py_test` targets is a smaller total diff than standing up and maintaining the manifest pipeline, and the manifest brings its own failure surface (Findings 5-6) that a small project has no reason to accept. The fleet's two acceptance harnesses (156 and 67 test files, but organized as pytest roots with no per-file BUILD granularity at all today) sit below this line if migrated as one or two `py_test`/`pytest_test` targets per suite rather than one per file; they would cross it only under `python_generation_mode file` (one target per source file), which nothing in this fleet currently needs. Assumption named: the threshold is a judgment call from the fixed setup cost above, not a number stated in any source — no source in this dive gives a target-count line, and none of the fleet repos are within an order of magnitude of it either way.

## Normative guidance candidates

1. **A `py_test`/`py_binary`/`py_library` target must carry its own `load(...)` for the rule it uses.** Rationale: Bazel 9's `--incompatible_autoload_externally` default (empty) deletes the WORKSPACE-era autoload of native rules; code written against pre-2026 training data omits it. Verify: `grep -L 'load(.*py_test' $(grep -l 'py_test(' **/BUILD.bazel **/BUILD)` — nonempty output is a finding. Empty output = pass. Severity: MUST. Bazel 9 (no-op on 7/8, where autoload still exists). `BZL-PY`. Settles: none directly, but underlies every code sample above.
2. **Never point a `py_test`'s `srcs` at a pytest-style file without a pytest entrypoint (a wrapper's `main()`, or a `py_console_script_binary`-based macro).** Rationale: a raw `py_test(srcs=["test_foo.py"])` runs `unittest` auto-discovery on a file with no `TestCase` classes and passes with zero tests executed — a false-green target forever. Verify: for every `py_test` target, confirm its `main`/entrypoint file imports and calls a pytest wrapper's `main()`, or that it is generated via a `pytest_test` macro — grep test `.py` files for `def test_` and cross-check the owning `py_test`'s deps include a pytest wrapper (`pytest_bazel`, `pytest`). Empty match on "pytest wrapper in deps" for a file with `def test_` = finding. Severity: MUST. All Bazel majors; rules_python (any). `BZL-PY`. Settles: M-J-12.
3. **Pin the pytest wrapper to `pytest-bazel` at an exact PyPI version (0.1.6 or newer), not the legacy `rules_python_pytest` macro, for any new Bazel-Python test target.** Rationale: `rules_python_pytest`'s own README names itself a stopgap without ongoing maintenance guarantees. Verify: grep `requirements.txt`/`pyproject.toml`/`uv.lock` (or the `pip.parse` hub) for `rules_python_pytest`; a hit is a finding to migrate. Empty output = pass. Severity: SHOULD (CONSIDER for an existing repo already standardized on `rules_python_pytest` with a working test suite — migration cost may exceed the benefit). All Bazel majors; pytest-bazel 0.1.6. `BZL-PY`. Settles: M-J-12.
4. **A `py_test` claiming `shard_count > 1` must carry a `pytest-shard` runtime dependency.** Rationale: pytest-bazel only touches `TEST_SHARD_STATUS_FILE` if `pytest_shard` is importable; Bazel fails a sharded test outright if the status file is never touched. Verify: for every `py_test` with `shard_count` set, grep its transitive `deps` for a `pytest_shard`/`pytest-shard` requirement. Empty match = finding. Severity: MUST. All Bazel majors; pytest-bazel 0.1.6+. `BZL-PY`.
5. **`gazelle_python.yaml` must exist (even as an empty file) and be checked into version control before the first `gazelle_python_manifest.update` run.** Rationale: the manifest-update target declares the file as an input; if absent, the build itself fails with a "missing input file" error rather than creating it. Verify: `test -f gazelle_python.yaml` (or the name set via `python_manifest_file_name`) in every directory a `gazelle_python_manifest` macro targets. Missing file = finding (build will fail on next manifest regen). Severity: MUST, for any repo adopting the Gazelle Python plugin. Bazel 7-9; rules_python_gazelle_plugin any version. `BZL-PY`. Settles: M-J-13.
6. **Wire `gazelle_python_manifest.test` into CI, not just `.update` into a local workflow.** Rationale: the manifest going stale relative to `requirements.txt`/`uv.lock` is caught only by running the `.test` target; skipped in CI, drift is silent until a `bazel run //:gazelle` produces surprising BUILD diffs or (below plugin 2.3.0, see #10) a misclassified import. Verify: `bazel query 'attr(name, ".*gazelle_python_manifest.test", //...)'` returns a target, and grep the CI workflow file for that target's label. Empty query output = finding. Severity: MUST for any repo running Gazelle. Bazel 7-9; rules_python_gazelle_plugin any version. `BZL-PY`. Settles: M-J-13.
7. **Pin `rules_python_gazelle_plugin` to 2.3.0 or newer whenever the project's Python toolchain includes 3.13 or 3.14.** Rationale: plugin versions below 2.3.0 fall back to the Python 3.11 stdlib list for those versions, silently misclassifying modules added or removed since 3.11 (`compression.zstd`, `telnetlib` named explicitly) — a wrong `deps` list with no error at generation time. Verify: read the pinned `rules_python_gazelle_plugin` version in `MODULE.bazel` against the fix in [CHANGELOG 2.3.0](https://github.com/bazel-contrib/rules_python/blob/main/CHANGELOG.md); cross-check against every `python.toolchain(python_version = ...)` call for 3.13/3.14. A pin below 2.3.0 with a 3.13/3.14 toolchain present = finding. Severity: MUST when both conditions hold, otherwise not applicable. rules_python_gazelle_plugin < 2.3.0 (bug), fixed 2.3.0+ (2026-08-07). `BZL-PY`. Settles: M-J-13.
8. **When bumping `rules_python_gazelle_plugin` to 2.3.0+, bump `rules_python` to at least 1.5.0 in the same change.** Rationale: 2.3.0 is a **BREAKING** plugin release that requires the `is_python_3.14` config setting rules_python only defines from 1.5.0 onward; mismatched pins fail at analysis time. Verify: compare the two `bazel_dep` version strings in `MODULE.bazel`; `rules_python_gazelle_plugin >= 2.3.0` with `rules_python < 1.5.0` = finding. Severity: MUST. rules_python_gazelle_plugin 2.3.0+ / rules_python 1.5.0+ (both Bazel 7-9). `BZL-PY`.
9. **Set the `# gazelle:python_root` directive in the package that is the actual import root when Python code lives under a subdirectory (`src/`, a monorepo subtree) rather than the workspace root.** Rationale: omitting it makes Gazelle treat the repo root as the import root, generating wrong `imports` attributes (or none) and breaking absolute imports. Verify: `grep -rL 'gazelle:python_root' <python-source-root>/BUILD.bazel` when the Python tree does not start at the workspace root — no directive present anywhere is a finding. Severity: MUST for shape-F monorepos where Python is a subtree. rules_python_gazelle_plugin any version, Bazel 7-9. `BZL-PY`.
10. **Do not disable `python_validate_import_statements` without a compensating check.** Rationale: the default (`true`) turns an unresolvable import into a loud generation-time error with three remediation options printed inline; disabling it silently drops the dependency from `deps` instead, and the target fails later at Python import time with a much less specific error. Verify: `grep -rn 'python_validate_import_statements false' **/BUILD.bazel` — any hit needs a named compensating control (e.g. a `bazel build //...` gate in CI) recorded next to it. Empty output = pass (default holds). Severity: SHOULD. rules_python_gazelle_plugin any version. `BZL-PY`. Settles: M-J-13.
11. **A `py_test`/`py_binary` invoking a separately-built tool under test must depend on it via `data = [...]` plus `@rules_python//python/runfiles`, never an environment variable with a fixed-path fallback.** Rationale: the env-var-plus-fallback pattern requires an out-of-band step (a CI script running `cargo build` into a fixed `test/bin/<name>` path) to populate the fallback, and silently uses a stale binary if that step is skipped; runfiles resolution is hermetic and fails loudly (`Runfiles.CreateOrRaise()`) if the dependency is missing. Verify: grep test fixtures for `os.environ.get(".*_COMMAND"` or similar env-var-with-fallback patterns; a hit alongside a Bazel `data` attribute already present on the corresponding target is a migration candidate. Empty grep output = pass (no such seam exists). Severity: MUST for any Bazel migration of a subprocess-driven pytest harness. All Bazel majors; `@rules_python//python/runfiles` (bundled with rules_python, any recent version). `BZL-PY`. Settles: M-I-15.
12. **When a binary's runfiles-relative path must be passed as a literal argument (rather than looked up via `Rlocation` inside the test process), use `$(rlocationpath ...)`, never `$(rootpath ...)` or `$(location ...)`.** Rationale: `rootpath` requires `--enable_runfiles`, which defaults off on Windows; `location` is documented as legacy and ambiguous between execpath and rootpath depending on the attribute. Verify: `grep -rn '\$(location\|\$(rootpath' **/BUILD.bazel **/*.bzl` on any target passing a binary path as a test arg — a hit is a finding to convert to `$(rlocationpath ...)`. Empty output = pass. Severity: SHOULD. Bazel 7-9 (documented current behavior as of 2026-09-05). `BZL-PY`.
13. **A hand-maintained (non-Gazelle) `py_test` target must explicitly list every `conftest.py` file its collection tree depends on in `data`/`deps`.** Rationale: pytest-bazel does no conftest-specific plumbing; it relies on pytest's normal discovery inside the Bazel sandbox, which only contains files Bazel staged. A missing conftest fails at collection time with a fixture error that reads like a test bug, not a missing-dependency bug. Verify: for each hand-written `py_test`, confirm every `conftest.py` between the test file and the Python root is present in `srcs`/`data`/`deps`. Empty confirmation = finding. Severity: MUST for hand-maintained BUILD files; N/A where Gazelle 0.14.0+ generates the target (auto-wired). All Bazel majors; rules_python 0.14.0+ for the Gazelle auto-wiring alternative. `BZL-PY`. Settles: M-J-12.
14. **When adopting Gazelle on a repo whose Python toolchain predates 1.9.0's ancestor-conftest fix, audit generated `py_test` targets for missing ancestor `conftest.py` dependencies before trusting a green Gazelle run as complete.** Rationale: sibling-only conftest wiring (pre-1.9.0 default) silently omits a real, needed dependency when conftest.py lives in a parent package rather than the same directory — exactly the fleet's two-tier `test/conftest.py` + subdirectory-test layout. Verify: `grep -c 'gazelle:python_include_ancestor_conftest' MODULE.bazel **/BUILD.bazel`; if the plugin is pinned below 1.9.0, treat ancestor conftest wiring as absent regardless of the directive. Severity: MUST when plugin < 1.9.0, N/A at 1.9.0+ (default is now correct). rules_python_gazelle_plugin < 1.9.0 (gap) / 1.9.0+ (2026-02-21, fixed). `BZL-PY`.
15. **Use the `gazelle_python_manifest` macro's `requirements` attribute name against rules_python 2.3.3, not `lockfiles`.** Rationale: the `lockfiles` rename (which documents `uv.lock` support explicitly) is unreleased — present only in `main`-branch docs under a `VERSION_NEXT_FEATURE` marker — and does not exist in the tagged 2.3.3 release's `gazelle/manifest/defs.bzl`. Verify: `grep -n 'lockfiles' MODULE.bazel **/BUILD.bazel` against the pinned `rules_python` version; a `lockfiles =` usage with a pin at or below 2.3.3 is a finding (will fail with an unknown-parameter error). Empty output = pass. Severity: MUST. rules_python 2.3.3 and earlier (until the rename ships). `BZL-PY`.
16. **Do not conflate `gazelle_python_manifest`'s lockfile-integrity attribute (`requirements`, format-agnostic, accepts `uv.lock` today under that name) with `pip.parse(uv_lock=...)`'s dependency-resolution behavior.** Rationale: the manifest attribute only computes an integrity hash to detect staleness; it never drives what Gazelle resolves imports against, and it is not evidence that Bzlmod's PyPI resolution consumes `uv.lock` (settled negatively elsewhere, see the sibling toolchains dive). Verify: reading heuristic — a BUILD/MODULE.bazel comment or PR description that cites `gazelle_python_manifest(requirements = "//:uv.lock")` as proof of uv-lock-driven resolution is a finding; the two are unrelated mechanisms. Severity: CONSIDER (a documentation/understanding check, not a build-breaking one). rules_python 2.3.3. `BZL-PY`.
17. **Stand up the Gazelle Python plugin only above roughly 30-50 hand-maintained Python BUILD targets in one project; below that, hand-write `py_library`/`py_test`.** Rationale: the plugin's fixed setup cost (three `bazel_dep`s, a manifest pipeline, a CI-wired `.test` target) and failure surface (Findings 5-6) outweigh the savings below that scale. Verify: named reading heuristic — count existing or planned `py_library`+`py_binary`+`py_test` targets in the project (`bazel query 'kind("py_.* rule", //...)' | wc -l` once any targets exist, or a file count as a proxy before any exist); below the threshold, Gazelle adoption is a finding to reconsider, not a target-count gate to enforce. This is a project-scale judgment call, not a hard threshold from any source — no source in this dive states a number. Severity: CONSIDER. All Bazel majors; rules_python_gazelle_plugin any version. `BZL-PY`.
18. **A `py_test` migrating a subprocess-driven pytest harness onto Bazel must keep the tool-under-test's runfiles-relative subprocess invocation working identically outside Bazel (e.g. under a plain `pytest` invocation in CI or locally) during the transition, by retaining an env-var override as a fallback rather than deleting it outright.** Rationale: `Runfiles.Create()` returns `None` (not an error) when no Bazel runfiles environment is present, so code that assumes it always succeeds breaks the moment someone runs the same test file outside `bazel test`; `Runfiles.CreateOrRaise()` converts that into an explicit, early error instead of a confusing `None.Rlocation(...)` `AttributeError` later. Verify: grep the migrated fixture for `Runfiles.Create()` — confirm the call site checks for `None`/uses `CreateOrRaise()` rather than calling `.Rlocation` unconditionally. A bare `Runfiles.Create().Rlocation(...)` chain with no None-check = finding. Severity: SHOULD, during a dual-build-system migration; MUST once Bazel is the only test runner. All Bazel majors; `@rules_python//python/runfiles`. `BZL-PY`. Settles: M-I-15.

## Fleet evidence

- **No fleet repository uses `py_test`, `py_library`, `py_binary`, or the Gazelle Python plugin today.** Every finding above grounds on the ruleset's own docs, CHANGELOG, and source, not on fleet code — matching the map's [How to read this §4](../bazel-topic-map.md) note that shape-F rows have no fleet exemplar.
- **The env-var-plus-fixed-path seam exists in both fleet acceptance harnesses, identically shaped:** `ocx/test/conftest.py:211-219` — `ocx_binary()` reads `OCX_COMMAND`, falling back to `PROJECT_ROOT / "test" / "bin" / "ocx"`; `grimoire/test/conftest.py:300-305` — `grim_binary()` reads `GRIM_COMMAND`, falling back to `_PROJECT_ROOT / "bin" / "grim"`. Both assert the resolved path exists before returning it (`assert p.exists(), ...`), i.e. a missing binary is caught, but only at fixture-resolution time, and only if the pre-Bazel `cargo build` step that populates the fallback path actually ran. This is precisely the pattern Finding 8 / Guidance #11 and #18 replace.
- **Neither harness declares a `[build-system]`** (per the brief's own fleet evidence) — that hygiene question belongs to the `python-packaging` set, not here; noted only so it isn't silently re-derived.
- **156 test files / 92 subprocess call sites (`ocx/test`) and 67 test files / 16 subprocess sites (`grimoire/test`)** are both well past the point where Gazelle's `python_generation_mode file` (one target per file) would be worth it if migrated file-by-file — but both harnesses currently run as monolithic pytest roots, not per-file targets, so a Bazel migration would most naturally map each to one or a small number of `pytest_test`/`py_test` targets (package mode), which sits below the Decisions threshold either way. Gazelle's value proposition here is speculative, not measured, because no fleet repo has made this move.
- **11 files touching `sys.path` in `ocx/test`** are exactly the shape that `# gazelle:python_root` (Finding 4) and the `imports` attribute exist to make unnecessary under Bazel — but this dive does not re-derive the `imports`/`sys.path` shadowing trap itself, which belongs to the sibling `python-bootstrap-imports-and-precompiling` dive (M-J-07).

## AI-agent angle

- **Writing `py_test(srcs=["test_foo.py"])` and assuming pytest-style discovery "just works," the way it does under plain `pytest` or under Cargo's `#[test]`.** It does not: native `py_test` runs `unittest` discovery and the target passes with zero tests executed ([#1972](https://github.com/bazel-contrib/rules_python/issues/1972)). Smallest check: for every `py_test` target, confirm its `main`/entrypoint imports a pytest wrapper (`pytest_bazel`, or a `pytest_test`-style macro) — absence is not proof of a bug, but it is a target to hand-verify actually runs tests (`bazel test --test_output=all //target` and read the summary line for a nonzero test count).
- **Omitting `load(...)` for `py_test`/`py_binary`/`py_library`, relying on training-data-era autoload.** Compiles fine on Bazel 7/8; fails to load on Bazel 9 where `--incompatible_autoload_externally` defaults empty ([Bazel 9 LTS post](https://blog.bazel.build/2026/01/20/bazel-9.html)). Smallest check: `grep -L 'load(.*py_test\|load(.*py_binary\|load(.*py_library' $(grep -l 'py_test(\|py_binary(\|py_library(' **/BUILD.bazel)` — any file listed uses the rule with no visible load, a finding regardless of which Bazel major is targeted.
- **Writing `gazelle_python_manifest(lockfiles = "//:uv.lock", ...)` because the "latest" rules_python docs (tracking `main`) show that attribute name.** The pinned 2.3.3 release still uses `requirements` — `lockfiles` is unreleased (`VERSION_NEXT_FEATURE` marker in the doc source). Smallest check: `curl -sL https://raw.githubusercontent.com/bazel-contrib/rules_python/<pinned-tag>/gazelle/manifest/defs.bzl | grep -n 'def gazelle_python_manifest' -A5` and confirm the parameter name against the doc snippet actually being copied.
- **Citing `pip.parse(uv_lock=...)` or the Gazelle manifest's `uv.lock` acceptance as evidence that Bzlmod PyPI resolution "now supports uv.lock."** These are two unrelated mechanisms (Finding 6, Guidance #16) and neither makes `pip.parse()` resolve from a fleet's actual `uv.lock` — settled negatively by Conflict 4 in the topic map. Smallest check: any PR description or comment claiming uv.lock-driven resolution should link the specific `pip.parse` call and confirm it isn't merely passing the lockfile to `gazelle_python_manifest` for staleness-checking.
- **Assuming a `shard_count > 1` test "just works" once set, without adding `pytest-shard` to deps.** Bazel's own contract fails a sharded test if `TEST_SHARD_STATUS_FILE` is never touched — this is a hard failure, not a warning, and the fix (one extra `deps` entry) is easy to miss because nothing about `shard_count` itself hints at a runtime dependency. Smallest check: Guidance #4's grep.
- **Assuming `$(location //cli:bin)` is the right way to hand a test its own binary's path, because that's the idiom seen most often in older Bazel examples.** bazel.build's current make-variables reference calls `location` legacy and recommends `rlocationpath` explicitly for this exact use case. Smallest check: Guidance #12's grep.

## Contested / evolving

- **Whether "the pytest wrapper" is a settled question at all.** As of 2026-09-05 rules_python ships no first-party pytest integration; the community has iterated through at least three approaches (`rules_python_pytest`, `aspect_rules_py`'s template, `pytest-bazel`) and the Gazelle plugin's own request to auto-generate the entrypoint shim is still open ([#1972](https://github.com/bazel-contrib/rules_python/issues/1972), filed against a still-current gap). Trending: consolidation toward `pytest-bazel`, which explicitly absorbed the other two projects' ideas, but nothing here is a rules_python-blessed default the way `py_test` itself is.
- **The `gazelle_python_manifest` attribute rename (`requirements` → `lockfiles`) is mid-flight.** It is documented on `main` but unreleased as of the pinned 2.3.3; a project reading current docs today will write code that doesn't work against today's pin, and will start working with no further action once the next release ships the rename. Track the `VERSION_NEXT_FEATURE` marker resolving in a future CHANGELOG entry.
- **Whether Gazelle is worth adopting at all below monorepo scale is not a question any source in this dive answers with a number.** Every practitioner source assumes a monorepo-scale motivation (large, many-package trees where the manifest pipeline pays for itself repeatedly); nothing addresses the fleet's actual shape (one or two acceptance-harness roots with dozens to low-hundreds of test files, not thousands of packages). The Decisions section's threshold is this dive's own judgment call, stated as such, not a distilled consensus.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_python#1972](https://github.com/bazel-contrib/rules_python/issues/1972) | GitHub issue, rules_python maintainer comment | Filed pre-2026, still open 2026-09 | The single clearest primary statement of why `py_test` + a raw pytest file silently passes with no tests run |
| [rules_python_pytest README](https://github.com/caseyduquettesc/rules_python_pytest/blob/main/README.md) | The legacy pytest macro's own README, fetched raw | Current as of repo HEAD, 2026-09 | Primary source for the older wrapper's scope, limits, and self-declared deprecation path |
| [pytest-bazel docs index](https://pytest-bazel.readthedocs.io/latest/) | Official tool docs (ReadTheDocs) | Current, 2026-09 | Feature list (pytest 7/8, sharding, `--test_filter`) in the maintainer's own words |
| [pytest-bazel usage docs](https://github.com/aignas/pytest-bazel/blob/main/docs/usage.md) | Raw doc source from the tool's own repo | Current, 2026-09 | Exact BUILD.bazel snippets for both the entrypoint and macro usage patterns |
| [pytest_bazel/main.py](https://github.com/aignas/pytest-bazel/blob/main/pytest_bazel/main.py) | The wrapper's actual source code | v0.1.6, 2026-09 | Ground truth for the env-var-to-pytest-flag mapping in Finding 3 — read the code, not a description of it |
| [pytest-bazel CHANGELOG](https://github.com/aignas/pytest-bazel/blob/main/CHANGELOG.md) | The tool's own changelog | Through 0.1.6 | Confirms current version and dates the `--test_runner_fail_fast`, sharding, and filter fixes |
| [rules_python CHANGELOG.md](https://github.com/bazel-contrib/rules_python/blob/main/CHANGELOG.md) | The ruleset's own human-curated changelog | Through 2.3.3, 2026-09-04 | Source for the 2.3.0 BREAKING gazelle version floor, the stdlib-list bug fix, and the 1.9.0/1.6.0/2.1.0 gazelle feature dates |
| [gazelle/docs/directives.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/directives.md) | Plugin directive reference, raw from repo | `main`, 2026-09 | Exact directive names, defaults, and `versionadded`/`versionchanged` tags used throughout Finding 4 |
| [gazelle/docs/annotations.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/annotations.md) | Plugin annotation reference, raw from repo | `main`, 2026-09 | The `include_pytest_conftest` annotation and its 1.6.0/rules_python-0.14.0 history |
| [gazelle/docs/installation_and_usage.md](https://rules-python.readthedocs.io/en/latest/gazelle/docs/installation_and_usage.md) | Setup walkthrough | `main`-tracking docs, 2026-09 | The exact MODULE.bazel wiring and manifest macro snippet, including the unreleased `lockfiles` rename |
| [gazelle/manifest/defs.bzl @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/gazelle/manifest/defs.bzl) | Actual macro source at the pinned release tag | 2.3.3, 2026-09-04 | Ground truth that the pinned release still names the attribute `requirements`, not `lockfiles` |
| [rules_python#1156](https://github.com/bazel-contrib/rules_python/issues/1156) | GitHub issue with full error text | Filed 2023, still open 2026-09 | The exact Bazel error text when `gazelle_python.yaml` doesn't exist at all |
| [rules_python#709](https://github.com/bazel-contrib/rules_python/issues/709) | GitHub issue with full error text | 2026-09 (still relevant, current validation behavior) | The exact "invalid dependency" error text for default-validated unresolvable imports |
| [`@rules_python//python/runfiles` README](https://github.com/bazel-contrib/rules_python/blob/main/python/runfiles/README.md) | The runfiles library's own README | `main`, 2026-09 | Primary source for `Runfiles.Create()`, `Rlocation()`, `EnvVars()`, and the subprocess pattern used in Finding 8 |
| [bazel.build — Python Rules reference](https://bazel.build/reference/be/python) | Official Bazel Encyclopedia of Build page | Current | Authoritative `py_test`/`py_binary` attribute list (`data`, `main`, `deps`, `env`) |
| [bazel.build — Make Variables reference](https://bazel.build/reference/be/make-variables) | Official Bazel reference | Current | Authoritative distinction between `$(location)`, `$(rootpath)`, and `$(rlocationpath)`, with the explicit recommendation used in Guidance #12 |
| [bazel.build — Test Encyclopedia](https://bazel.build/reference/test-encyclopedia) | Official Bazel spec for the test-runner contract | Current | Defines `TEST_SHARD_STATUS_FILE`'s touch-or-fail contract and the full env-var set pytest-bazel reads |
| [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog | 2026-01-20 | Primary source for `--incompatible_autoload_externally` defaulting empty in 9.0 |
| [pytest Exit codes](https://docs.pytest.org/en/stable/reference/exit-codes.html) | Official pytest reference | Current | Confirms exit code 5 = `NO_TESTS_COLLECTED`, load-bearing for pytest-bazel's filter-vs-no-filter exit handling |
| [rules_python_gazelle_plugin BCR metadata](https://bcr.bazel.build/modules/rules_python_gazelle_plugin/metadata.json) | Bazel Central Registry module metadata | Fetched 2026-09-05 | Confirms the current published version (2.3.3) independent of any doc page's claims |
