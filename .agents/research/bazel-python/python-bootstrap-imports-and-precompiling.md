---
title: Python bootstrap, imports, and precompiling under Bazel
topic: python-bootstrap-imports-and-precompiling
group: bazel-python
family: BZL-PY
agent: python-bootstrap-imports-and-precompiling-dive
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 16
primary_sources_count: 15
settles: [M-J-06, M-J-07, M-J-08, M-J-09, M-J-14]
scope: >
  Covers the runtime shape of a rules_python-built py_binary/py_test: the
  system_python vs script bootstrap, sys.path ordering, PYTHONSAFEPATH
  inheritance, the venv-per-target model, the `imports` attribute's shadowing
  trap, precompiling's three named caveats, and PYTHONHASHSEED/__pycache__ as
  a Bazel-action-cache concern. Does NOT cover hermetic toolchain registration,
  pip.parse/uv resolution, or PyPI hub/platform naming (owned by
  bazel-python/python-toolchains-and-pypi-resolution), pytest wrappers or
  Gazelle generation (owned by bazel-python/python-tests-and-build-generation),
  or general pyproject.toml/uv.lock hygiene (owned by python-packaging).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The two bootstraps: `system_python` and `script`](#1-the-two-bootstraps-system_python-and-script)
   2. [sys.path ordering: what changed and when](#2-syspath-ordering-what-changed-and-when)
   3. [PYTHONSAFEPATH: default-on, inheritable only under `script`](#3-pythonsafepath-default-on-inheritable-only-under-script)
   4. [The venv-per-target model (2.0.0) and what it replaced](#4-the-venv-per-target-model-200-and-what-it-replaced)
   5. [The `imports` attribute and its shadowing failure](#5-the-imports-attribute-and-its-shadowing-failure)
   6. [Precompiling: shipment, current default, and the three caveats](#6-precompiling-shipment-current-default-and-the-three-caveats)
   7. [Correcting the brief: the "years later" bug is a different issue number](#7-correcting-the-brief-the-years-later-bug-is-a-different-issue-number)
   8. [PYTHONHASHSEED and `__pycache__` as a Bazel-action-cache concern](#8-pythonhashseed-and-__pycache__-as-a-bazel-action-cache-concern)
   9. [The Bazel 9 trap next to all of this: `py_binary` needs an explicit `load()`](#9-the-bazel-9-trap-next-to-all-of-this-py_binary-needs-an-explicit-load)
3. [Decisions](#decisions)
4. [Normative guidance candidates](#normative-guidance-candidates)
5. [Fleet evidence](#fleet-evidence)
6. [AI-agent angle](#ai-agent-angle)
7. [Contested / evolving](#contested--evolving)
8. [Sources](#sources)

## Summary

- `--bootstrap_impl` defaults to `system_python`, not `script`, as of `rules_python` 2.3.3 (2026-09-04) — confirmed in the flag's own source, not the docs prose ([config_settings/BUILD.bazel:97-104](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/config_settings/BUILD.bazel)).
- `script` (added 0.33.0, 2024-06-12) was originally slated to become the default "in a subsequent release" but never did; `system_python` instead absorbed the venv-per-target model at 2.0.0 and remains the default on every platform, including Windows, where `script` is force-disabled unconditionally.
- Both bootstraps converge on the same current `sys.path` order: `[stdlib, user paths, runtime site-packages]` — verified by `rules_python`'s own `sys_path_order_test.py`, run under both `bootstrap_impl` values.
- That order used to be `[app paths, stdlib, runtime site-packages]` under `system_python` before 1.7.0 (2025-10-11); the flip closed a stdlib-shadowing hole but did not close a third-party-shadowing one — user paths (including everything the `imports` attribute adds) still sit ahead of runtime site-packages.
- `PYTHONSAFEPATH` is on by default (`sys.flags.safe_path = True`) under both bootstraps, but only `script` lets you inherit or disable it from the calling environment (added 0.35.0, 2024-08-15); `system_python` has no such escape hatch as of 2.3.3.
- The venv-per-target model became the default at 2.0.0 (2026-04-09) for Linux/Mac on Bazel 8+, and for Windows — replacing, on Windows specifically, a zip-and-extract `py_binary` output; Unix already had a runfiles-symlink model that 2.0.0 layered a real venv onto.
- The `imports` attribute injects a runfiles-relative directory into every consuming binary's `sys.path`, transitively — it is not scoped to the target that declares it ([python/private/attributes.bzl:184-203](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/attributes.bzl)).
- Because `imports` paths land in the "user" band of `sys.path` (between stdlib and site-packages), a same-named directory can silently shadow a legitimate third-party package; the failure is a wrong module, never an import error.
- Precompiling shipped in 0.33.0 (2024-06-12), disabled by default; today's default is literally `--precompile=auto`, which resolves to `disabled` in the flag-effective-value function itself ([python/private/flags.bzl:151-155](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/flags.bzl)).
- All three caveats named in `docs/precompiling.md` are still current as of the fetched `main` branch: mixed `PyInfo` drops `.pyc`; pre-3.11 interpreters can miss precompiled files via `sys.path[0]` ordering; a `py_binary`/`py_library` pair sharing sources with different `exec_properties` produces an action conflict.
- The brief's named issue, [#2212](https://github.com/bazel-contrib/rules_python/issues/2212), is **closed** — filed 2024-09-10, fixed by [PR #2243](https://github.com/bazel-contrib/rules_python/pull/2243) and closed 2024-10-11, one month later. It is not the "years later" bug.
- The real still-open bug matching the docs' own third caveat is [#2445](https://github.com/bazel-contrib/rules_python/issues/2445) ("precompiling results in action output conflicts"), filed 2024-11-26 and still open as of its last comment 2025-09-17 — nearly two years, unresolved.
- The documented workaround in that thread is narrower than the docs page's own advice ("modify both targets so they have the same exec properties"): scope `exec_properties` keys to their owning exec group (`cpp_link.mem`) instead of a bare global key (`mem`); a second commenter (2025-09-17) reports the bug is more pervasive than first understood, hitting any two targets that share sources but differ in `args`/`env`-driven `exec_properties`.
- `rules_python` hardcodes `PYTHONHASHSEED=0` for its own `PyCompile` action environment, alongside `PYTHONNOUSERSITE=1` and `PYTHONSAFEPATH=1` ([python/private/common.bzl:632-637](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/common.bzl)) — a hash-randomized build-time tool that is not similarly pinned can make an action's output a non-pure function of its inputs, which is a cache/RBE correctness hazard, not merely test flakiness.
- Since 1.3.0 (2025-03-27), every `python` invocation made during repository-rule and module-extension evaluation runs with `-B` specifically to avoid generating `.pyc` files that could pollute the repository cache.
- `RULES_PYTHON_PYCACHE_DIR` controls where runtime-generated `__pycache__` files land; setting it to `/dev/null` disables runtime pyc caching outright, which is the safe default for RBE/remote-cache-sensitive builds ([docs/environment-variables.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md)).
- None of this happens in a vacuum on Bazel 9: `--incompatible_autoload_externally` defaults empty there, so a bare `py_binary(...)`/`py_library(...)`/`py_test(...)` with no `load("@rules_python//python:defs.bzl", ...)` — which still auto-resolved on Bazel 8.x — now fails outright ([bazel-frame.md:182-194](../bazel-frame.md), a settled correction from wave 1).

## Findings

### 1. The two bootstraps: `system_python` and `script`

`rules_python` ships two bootstrap implementations for `py_binary`/`py_test`, selected by the string flag `--@rules_python//python/config_settings:bootstrap_impl`, values `system_python` (default) and `script`:

```starlark
# python/config_settings/BUILD.bazel (rules_python main, fetched 2026-09-05)
rp_string_flag(
    name = "bootstrap_impl",
    build_setting_default = BootstrapImplFlag.SYSTEM_PYTHON,
    override = select({
        # Windows doesn't yet support bootstrap=script, so force disable it
        ":_is_windows": BootstrapImplFlag.SYSTEM_PYTHON,
        "//conditions:default": "",
    }),
    values = sorted(BootstrapImplFlag.__members__.values()),
    visibility = NOT_ACTUALLY_PUBLIC,
)
```
[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/config_settings/BUILD.bazel)

`script` was added in 0.33.0 (2024-06-12) as "a new bootstrap implementation that doesn't require a system Python," with the changelog explicitly stating "It will become the default in a subsequent release" ([CHANGELOG.md, 0.33.0](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md)). That promotion never happened in the flag's own default; instead `system_python` gained venv support at 2.0.0 (§4) and stayed the default. `.bazelrc`-level opt-in to `script` remains possible and is exactly what 1.5.0's Windows-forcing note describes: "On Windows, `--bootstrap_impl=system_python` is forced. This allows setting `--bootstrap_impl=script` in bazelrc for mixed-platform environments" (1.5.0, 2025-06-11). The `select()` above confirms this is unconditional and version-current: there is no way to run `script` on a Windows execution platform today.

Feature parity between the two bootstraps is not complete. `system_python` gained `main_module` and `RULES_PYTHON_ADDITIONAL_INTERPRETER_ARGS` support at 1.7.0 (2025-10-11), and the runfiles root was added to `sys.path` for it at 1.8.0. But `PYTHONSAFEPATH` inheritance (§3) and `interpreter_args`/debugger integration remain `script`-only in the test suite as of `main`.

### 2. sys.path ordering: what changed and when

`rules_python`'s own test asserts a single invariant, run against both bootstraps:

```python
# tests/bootstrap_impls/sys_path_order_test.py (excerpt)
self.assertTrue(
    last_stdlib < first_user < first_runtime_site,
    "Expected overall order to be (stdlib, user imports, runtime site) ...",
)
```
[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/sys_path_order_test.py) — registered for both `bootstrap_impl = "script"` and `bootstrap_impl = "system_python"` in [`tests/bootstrap_impls/BUILD.bazel`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/BUILD.bazel) (lines 122–149).

This is a **change**, not a constant. The 1.7.0 changelog (2025-10-11) states plainly:

> (bootstrap) For `--bootstrap_impl=system_python`, the sys.path order has changed from `[app paths, stdlib, runtime site-packages]` to `[stdlib, app paths, runtime site-packages]`.

Same release: "`PYTHONPATH` is no longer used to add import paths" for `system_python`. Two separate claims follow from this:
- **Stdlib can no longer be shadowed** by an app-level file of the same name under either bootstrap (as of 1.7.0 for `system_python`; `script` shipped this order from its introduction).
- **Third-party packages can still be shadowed** by app-level code, because "user paths" (which includes both plain runfiles-relative source directories and everything the `imports` attribute adds, §5) sit ahead of `runtime site-packages` in both bootstraps, unconditionally, as of `main` today.

### 3. PYTHONSAFEPATH: default-on, inheritable only under `script`

`PYTHONSAFEPATH` (Python's own `-P`/safe-path mode, which drops the script's own directory and the current directory from `sys.path`) ships enabled by default under `rules_python`. The `script` bootstrap's own test proves three states:

```bash
# tests/bootstrap_impls/inherit_pythonsafepath_env_test.sh (behavior asserted)
PYTHONSAFEPATH=  "$bin"   # -> sys.flags.safe_path: False  (explicitly disabled)
PYTHONSAFEPATH=OUTER "$bin"  # -> sys.flags.safe_path: True, value inherited/propagated
"$bin"                       # -> sys.flags.safe_path: True, PYTHONSAFEPATH=1 (default)
```
[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/inherit_pythonsafepath_env_test.sh); registered only under `bootstrap_impl = "script"` at [BUILD.bazel:188-196](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/BUILD.bazel).

The feature was added at 0.35.0 (2024-08-15) with the changelog note "Requires `--bootstrap_impl=script`" repeated in both the Changed and Added sections. No later changelog entry extends this to `system_python`, and the test file's `BUILD.bazel` registration (script-only) is consistent with that as of `main`. A repo that needs to toggle safe-path behavior per-invocation (common in debugger or REPL tooling) has exactly one bootstrap that supports it.

### 4. The venv-per-target model (2.0.0) and what it replaced

2.0.0 (2026-04-09) made this a **Breaking** change:

> venv-based binaries are created by default (`--bootstrap_impl=system_python`) on supported platforms (Linux/Mac with Bazel 8+, or Windows).

The same release entry states what Windows had before: "Windows no longer defaults to creating a zip file and extracting it; a symlink-based runfiles tree is created, as on unix-like platforms" and "`--build_python_zip` on Windows is ignored. Use `py_zipapp_binary` to create zips of Python programs." So the venv-per-target model at 2.0.0 specifically replaced a **zip-and-extract launch mechanism on Windows**; on Unix it layered an actual `venv`-style interpreter/site-packages structure onto what was already a runfiles-symlink launch (`--windows_enable_symlinks` became a required startup flag in the same release, extending symlink support to Windows for the first time). [CHANGELOG.md, 2.0.0](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md).

### 5. The `imports` attribute and its shadowing failure

The `imports` attribute's own docstring, read directly from source, is exact about scope and math:

```starlark
# python/private/attributes.bzl (IMPORTS_ATTRS, excerpt)
"imports": lambda: attrb.StringList(
    doc = """
List of import directories to be added to the PYTHONPATH.
...these import directories will be added for this rule and all rules that
depend on it (note: not the rules this rule depends on). Each directory will
be added to `PYTHONPATH` by `py_binary` rules that depend on this rule.

The values are target-directory-relative runfiles-root paths. e.g. given
target `//foo/bar:baz`, `sys.path` will be affected as:
* `a/b` adds `$runfilesRoot/$repo/foo/bar/a/b`
* `../sibling` adds `$runfilesRoot/$repo/foo/sibling`
* `../../` adds `$runfilesRoot/$repo`
""",
),
```
[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/attributes.bzl) (lines 184–203).

Three properties make this a shadowing trap rather than a normal knob:
1. It is **transitive**: every consumer of a `py_library` that declares `imports` gets the path added, not just the declaring target.
2. Relative-path escapes (`../`, `../../`) can add an ancestor directory — including the whole repo root — to `sys.path`, exposing every sibling package under it, not just the intended one.
3. Per §2, the resulting directory lands in the "user" band of `sys.path`, ahead of runtime site-packages — so a file that happens to share a name with a PyPI dependency (or with another `imports`-contributed directory earlier in the same binary's transitive closure) wins silently. There is no error; the wrong module simply gets imported.

This is compounded by a second, narrower shadowing class that `rules_python` itself had to fix: 2.2.0 (2026-06-30) "Fixed stage 1 bootstrap imports when target outputs shadow standard library modules" — verified by a dedicated regression test, `stdlib_shadowing_test.py` ("Verifies stage 1 bootstrap stdlib imports cannot be shadowed"), registered only under `bootstrap_impl = "system_python"` ([BUILD.bazel:169-175](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/BUILD.bazel)). That fix addresses the bootstrap launcher's *own* imports (e.g. a target that happens to produce a `shutil.py`), not the `imports`-attribute case above — the two are separate failure modes that both manifest as "the wrong module loaded."

### 6. Precompiling: shipment, current default, and the three caveats

Precompiling shipped in 0.33.0 (2024-06-12), "disabled by default, for now," with the changelog explicitly flagging a future flip that never happened in the flag's own default. As of `main` today:

```starlark
# python/private/flags.bzl
PrecompileFlag = enum(
    AUTO = "auto", ENABLED = "enabled", DISABLED = "disabled",
    FORCE_ENABLED = "force_enabled", FORCE_DISABLED = "force_disabled",
)

def _precompile_flag_get_effective_value(ctx):
    value = ctx.attr._precompile_flag[BuildSettingInfo].value
    if value == PrecompileFlag.AUTO:
        value = PrecompileFlag.DISABLED
    return value
```
[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/flags.bzl) (lines 151–155); the flag's `build_setting_default` is `PrecompileFlag.AUTO` ([config_settings/BUILD.bazel:71-76](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/config_settings/BUILD.bazel)). "Auto" is not a maybe — it resolves to `disabled`, hard-coded, as of this fetch.

`docs/precompiling.md`'s "Known issues, caveats, and idiosyncrasies" section names exactly three still-current traps (verbatim, fetched 2026-09-05):

| Caveat | Exact text |
|---|---|
| Mixed `PyInfo` | "Mixing rules_python PyInfo with Bazel builtin PyInfo will result in pyc files being dropped." |
| Pre-3.11 `sys.path[0]` | "Precompiled files may not be used in certain cases prior to Python 3.11. This occurs due to Python adding the directory of the binary's main `.py` file, which causes the module to be found in the workspace source directory instead of within the binary's runfiles directory... This can usually be worked around by removing `sys.path[0]`." |
| Exec-properties action conflict | "Targets with the same source files and different exec properties will result in action conflicts. This most commonly occurs when a `py_binary` and a `py_library` have the same source files. To fix this, modify both targets so they have the same exec properties." |

[Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md).

Precompiling also requires "Bazel 7+ with the Pystar rule implementation enabled" per the same page — a floor, not a current concern given the fleet's Bazel 8.7.0/9.x/rolling matrix, but worth stating because an AI agent reasoning about "precompiling needs Bazel 9" would be wrong.

### 7. Correcting the brief: the "years later" bug is a different issue number

The brief names [issue #2212](https://github.com/bazel-contrib/rules_python/issues/2212), "per-binary opt-in of pyc doesn't function correctly," as the chase-the-surprise target. Fetched directly via `gh api`:

- Filed 2024-09-10, **closed 2024-10-11** — one month, not "years."
- Closed by [PR #2243](https://github.com/bazel-contrib/rules_python/pull/2243), "fix(precompiling)!: make binary-level precompile opt-in/opt-opt work" (the `!` marks it a breaking change).
- The maintainer's own comment on the thread lays out the exact fix shape adopted: stop putting library-generated `.pyc` in runfiles by default; always register the compile action; gate inclusion on target-level `pyc_collection`/`precompile` settings via new `PyInfo` fields.

So the brief's "shipped in version X" vs. "works per-target" distinction is real, but attached to the wrong tracking issue. The actual multi-year-open bug matching the docs' third caveat (exec-properties action conflict, §6) is [**#2445**](https://github.com/bazel-contrib/rules_python/issues/2445):

- Filed 2024-11-26, **still open**, last comment 2025-09-17 (a second, independent reporter).
- Repro is exactly the documented caveat: two `py_test` targets sharing `srcs = ["foo.py"]`, one with a non-empty `exec_properties`, produce `ActionConflictException` on `PyCompile` for `__pycache__/foo.cpython-311.pyc`.
- The 2025-09-17 comment reports the failure mode is broader than first scoped: it also hits targets that vary only by `args`/env-driven backend selection while sharing an `exec_properties`-bearing base, e.g. `foo_cpu_test` / `foo_gpu_test` pairs.
- The 2024-11-27 comment names the practical workaround actually used inside Google: scope `exec_properties` keys to their owning exec group (e.g. `cpp_link.mem`) instead of a bare key (`mem`) across the whole target graph — narrower and more invasive than the docs page's "modify both targets so they have the same exec properties," and it does not fully eliminate the class per the follow-up comment.

Two full major-version cycles of `rules_python` (0.33 → 2.3) have shipped with this caveat listed in the docs and the underlying bug unfixed.

### 8. PYTHONHASHSEED and `__pycache__` as a Bazel-action-cache concern

Distinct from the general Python determinism taxonomy (owned by the sibling `python-packaging`/hermeticity sets), `rules_python` treats hash-seed and bytecode-cache determinism as *build-action* concerns because Python's own `.pyc` and `dict`/`set` iteration order can make a Bazel action's output a non-pure function of its declared inputs — which is specifically a cache/RBE correctness question, not a runtime-flakiness one.

Three concrete mechanisms, all from source:

1. **`PyCompile` action environment is hardcoded**:
   ```starlark
   # python/private/common.bzl:632-637
   action_env = {
       "PYTHONHASHSEED": "0",       # Helps avoid non-deterministic behavior
       "PYTHONNOUSERSITE": "1",     # Helps avoid non-deterministic behavior
       "PYTHONSAFEPATH": "1",       # Helps avoid incorrect import issues
   }
   ```
   [Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/common.bzl). This is `rules_python` protecting its *own* precompiling action; it says nothing about a user-authored `py_binary` used as a build-time tool (a `genrule` tool, a code generator invoked at analysis/execution time). Such a tool inherits no such pinning automatically — if it writes output whose byte order depends on dict/set iteration, two executions of the identical action key can legitimately differ, which a remote cache cannot detect and will happily serve back either one.

2. **Repository-rule and module-extension Python invocations run with `-B`** since 1.3.0 (2025-03-27): "`python` invocations in repository and module extension evaluation contexts will invoke Python interpreter with `-B` to avoid creating `.pyc` files" — a direct fix for stray bytecode polluting the repository cache / `--repo_contents_cache`.

3. **`RULES_PYTHON_PYCACHE_DIR`** governs where *runtime*-generated `__pycache__` files land. Per the current docs: unset, `rules_python` searches `XDG_CACHE_HOME`, then `TMP`/`TEMP`, then the platform temp dir, appending `rules_python_pycache`; if none can be found or created, it falls back to `/dev/null`, "which will effectively disable pyc caching." Setting it explicitly to `/dev/null` is the deliberate way to disable runtime pyc caching for RBE-clean runs; setting it to a `--sandbox_add_mount_pair`-exposed path lets the cache persist across invocations. [Source](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md).

A related, already-fixed bug shows the same concern from the other direction: 2.0.0 fixed "the pyc created at runtime in the stdlib should no longer cause the Python runtime repository to be invalidated" ([#3643](https://github.com/bazel-contrib/rules_python/issues/3643)) — runtime-written `.pyc` files inside a hermetic toolchain's own directory were, before that fix, tripping the toolchain repository's own cache-invalidation watch.

### 9. The Bazel 9 trap next to all of this: `py_binary` needs an explicit `load()`

Not scoped to this dive's family (it belongs to `BZL-FLAG`/general Bazel-9 migration, already settled by wave 1), but every snippet in this file assumes it, so it is stated once here for the reader: Bazel 9.0 (2026-01-20) defaults `--incompatible_autoload_externally` to empty. Python and Java rules were externalized from Bazel core in 8.0; the flag let Bazel 8.x keep resolving a bare `py_binary`/`py_library`/`py_test` without a `load()` via a compatibility allowlist. Bazel 9 removes that allowlist by default. [bazel-frame.md:182-194](../bazel-frame.md) (wave-1 correction, citing the Bazel 9 release post) and [`language-rulesets-canonical.md:104-110`](../bazel-topic-map/language-rulesets-canonical.md) both confirm this dating. The fix is one line: `load("@rules_python//python:defs.bzl", "py_binary", "py_library", "py_test")` — confirmed as the actual export surface in [`python/defs.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/defs.bzl).

## Decisions

**Does the shipped rule recommend precompiling at all?** No, not by default. Evidence: precompiling's own default resolves to `disabled` in the flag-effective-value function (§6); one of its three documented caveats (exec-properties action conflict, #2445) has been open and unfixed for nearly two years across two major versions; and the win is narrow (import-heavy cold-start latency) while the cost is concrete (runfiles count/size roughly doubles per `docs/precompiling.md`'s own "Overhead" section). Assumption named: this is a default-off recommendation for a *new* adopting repo without a measured cold-start problem; a repo that has already measured a real win and can commit to keeping `py_binary`/`py_library` `exec_properties` disjoint across every shared-source pair is free to opt in per-target via `pyc_collection`.

**The bootstrap a new repo should pin.** Pin nothing — accept the shipped default, `system_python` (venv-per-target since 2.0.0), on every platform. Evidence: it is the default on Linux/Mac/Windows uniformly as of 2.0.0, has absorbed the features that used to be `script`-exclusive (`main_module`, `RULES_PYTHON_ADDITIONAL_INTERPRETER_ARGS`, runfiles-root-on-`sys.path`) at 1.7.0/1.8.0, and Windows cannot use `script` at all regardless of configuration (§1). Exception, named explicitly: opt into `script` via `.bazelrc` only if a debugger/REPL workflow needs `PYTHONSAFEPATH` inherited or disabled per-invocation (§3) — no other current feature gap justifies the deviation, and the Windows override neutralizes it there automatically.

**The check that catches an `imports`-induced shadowing before it produces a wrong answer.** There is no built-in lint for this as of 2.3.3. The verification this dive proposes (see rule BZL-PY-04 below): enumerate every `imports =` attribute in the tree, resolve each entry's contributed `sys.path` basename per the attribute's own path math (§5), and diff that set against (a) the top-level import names of every PyPI dependency reachable from the same binary and (b) every other `imports` entry in the same binary's transitive closure. A collision in either set is the shadowing failure, and it fires before the binary is ever run — the alternative (a runtime assertion à la `sys_path_order_test.py`, checking a known third-party symbol's `__file__`) is a valid but binary-specific fallback when the static check cannot be scripted quickly.

## Normative guidance candidates

1. **Never declare `py_binary`/`py_library`/`py_test` without an explicit `load("@rules_python//python:defs.bzl", ...)`.**
   Rationale: relying on Bazel's native-rule autoload silently breaks on Bazel 9 (`--incompatible_autoload_externally` defaults empty) though it still resolves on Bazel 8.x.
   Verify: `grep -rn '^\s*py_\(binary\|library\|test\)(' --include=BUILD.bazel --include=BUILD .` then confirm a matching `load(..., "py_binary"|"py_library"|"py_test")` precedes it in the same file. Empty grep output reads PASS (nothing to check).
   Severity: MUST. Bazel: 9 (breaks), 8 (works but non-portable). Ruleset: rules_python any. Settles: cross-ref only (BZL-FLAG owns the general rule).

2. **Do not assume `--bootstrap_impl` defaults to `script`.**
   Rationale: an agent trained on rules_python's own 0.33.0 roadmap language ("will become the default in a subsequent release") will assert `script` is current default; it never became one.
   Verify: read `build_setting_default` for `//python/config_settings:bootstrap_impl` in the installed `rules_python` version's `python/config_settings/BUILD.bazel`, or run `bazel config` / `bazel cquery --output=starlark ...` against a `py_binary` target and inspect the resolved `BootstrapImplFlag` value. Absence of an explicit `--bootstrap_impl` flag anywhere in `.bazelrc` reads "default = system_python", not undefined.
   Severity: MUST (as a documentation/comment-accuracy check). Bazel: 8, 9. Ruleset: rules_python ≥2.0.0. Settles: M-J-06.

3. **If a workflow needs `PYTHONSAFEPATH` inherited or disabled per-invocation, it must run under `--bootstrap_impl=script`.**
   Rationale: `system_python` has no such override in the current test suite; setting `PYTHONSAFEPATH=` under it will not disable safe-path mode as it does under `script`.
   Verify: `grep -rn 'bootstrap_impl' tests/bootstrap_impls/BUILD.bazel` in the vendored `rules_python` repo (or the installed version) for the target registering `inherit_pythonsafepath_env_test` and confirm it is `script`-only; a target relying on this behavior under `system_python` has no such test to point at — empty output for `system_python` reads "unsupported, not merely untested."
   Severity: MUST. Bazel: 8, 9. Ruleset: rules_python ≥0.35.0. Settles: M-J-06.

4. **Audit every `imports =` attribute for a basename collision before merging it.**
   Rationale: `imports` paths land in the "user" band of `sys.path`, ahead of runtime site-packages, and are transitive to every consuming binary — a collision produces a wrong module silently, never an error.
   Verify: `grep -rn 'imports\s*=\s*\[' --include=BUILD.bazel --include=BUILD .`; for each hit, resolve the runfiles-relative basename per the attribute's own doc math, and check it against (a) every PyPI top-level import name reachable by the same binary and (b) every other `imports` basename in the same transitive closure. Empty grep output reads PASS — no `imports` attribute anywhere in the tree, nothing to shadow.
   Severity: SHOULD (MUST once a first real collision is found in a repo). Bazel: 8, 9. Ruleset: rules_python any. Settles: M-J-07.

5. **Prefer `../../`-style `imports` escapes never; use the narrowest positive relative path that reaches the needed root.**
   Rationale: `../` and `../../` add an ancestor directory (up to the whole repo root) to every consumer's `sys.path`, multiplying the shadowing surface far past the single package the attribute was meant to expose.
   Verify: `grep -rn 'imports\s*=\s*\[.*"\.\./' --include=BUILD.bazel --include=BUILD .`. Any match is a finding; empty output reads PASS.
   Severity: SHOULD. Bazel: 8, 9. Ruleset: rules_python any. Settles: M-J-07.

6. **Do not enable precompiling globally (`--precompile=enabled` in `.bazelrc`) without first grepping for `py_binary`/`py_library` pairs that share `srcs`.**
   Rationale: [#2445](https://github.com/bazel-contrib/rules_python/issues/2445) — a `py_binary`/`py_library` (or two `py_test`s) sharing source files with different `exec_properties` produces an unfixed `ActionConflictException` on the generated `.pyc`, open since 2024-11-26.
   Verify: for every `.py` file, `bazel query "kind('py_binary|py_library|py_test', same_pkg_direct_rdeps(//path/to:file.py))"` (or a grep-based srcs-overlap scan across BUILD files) and check whether any two owning targets set differing `exec_properties`. Empty output (no file owned by more than one target with precompiling-relevant differences) reads PASS.
   Severity: MUST once precompiling is enabled anywhere in the build; CONSIDER as a standing pre-merge check otherwise. Bazel: 8, 9 (Pystar-dependent, "Bazel 7+"). Ruleset: rules_python ≥0.33.0. Settles: M-J-08, M-J-09.

7. **If two Python rules must share `exec_properties`-bearing targets and the same sources, scope every `exec_properties` key to its exec group rather than using a bare key.**
   Rationale: the documented fix on the docs page ("modify both targets so they have the same exec properties") is not always possible when the two targets genuinely need different remote-execution properties (e.g. differing memory/backend per variant); the workaround reported inside Google on the live issue thread is per-exec-group key scoping (`cpp_link.mem`, not `mem`).
   Verify: named reading heuristic — inspect each conflicting target pair's `exec_properties` dict; a bare key shared with a differing value is the failure signature, an exec-group-prefixed key is the accepted mitigation. No automatable grep exists (the bug is a Bazel-level action-graph conflict, not a lint-detectable pattern) — CONSIDER a `bazel build //...` smoke pass whenever both targets are touched, and read "no ActionConflictException" as PASS.
   Severity: CONSIDER (argued-tier evidence: one maintainer comment and one corroborating report, not a spec). Bazel: 8, 9. Ruleset: rules_python ≥0.33.0 (any version carrying precompiling). Settles: M-J-09.

8. **Never build on the exact wording "precompiling shipped in version X" implying it works correctly per-target in that version.**
   Rationale: 0.33.0 shipped precompiling (2024-06-12); the per-binary `pyc_collection` opt-in didn't function correctly until fixed one month later by [#2243](https://github.com/bazel-contrib/rules_python/pull/2243); a third caveat (§6/#7 above) remains open two major versions later. "Shipped" and "correct" are separate claims.
   Verify: named reading heuristic — for any rules_python feature described as "added in version X," check the CHANGELOG's *own* Fixed section in the 1-3 releases following X for the same feature name before treating X as the stable-behavior floor.
   Severity: CONSIDER (a documentation-quality heuristic, not a build check). Bazel: n/a. Ruleset: rules_python any. Settles: M-J-08.

9. **A build-time `py_binary`/`py_binary`-based tool (genrule tool, code generator, aspect tool) that writes output must pin `PYTHONHASHSEED` explicitly.**
   Rationale: `rules_python` pins `PYTHONHASHSEED=0` for its *own* `PyCompile` action but does nothing for a user-authored tool; unpinned hash randomization can make dict/set-order-dependent output a non-pure function of the action's declared inputs — a remote-cache/RBE correctness hazard, not just test flakiness.
   Verify: `grep -rn 'exec_properties\|env\s*=' <path-to-tool-target-BUILD>` for `PYTHONHASHSEED`; absence on a target whose Python code iterates a `dict`/`set` and writes output reads as a finding. A dedicated grep: `grep -rln 'PYTHONHASHSEED' $(bazel query 'kind(genrule, //...)')`-style scan against the genrule's `cmd`/`env` — empty output on a repo with any Python-backed genrule tool reads FINDING (not proven safe), not PASS.
   Severity: SHOULD. Bazel: 8, 9. Ruleset: rules_python any (this is generic Python behavior rules_python happens to pin for itself). Settles: M-J-14.

10. **Set `RULES_PYTHON_PYCACHE_DIR=/dev/null` (or a `--sandbox_add_mount_pair`-exposed stable path) for any CI leg that shares a remote cache or RBE.**
    Rationale: unmanaged runtime `__pycache__` writes are undeclared outputs relative to the Bazel action graph; leaving the OS-default fallback search (`XDG_CACHE_HOME` → `TMP`/`TEMP` → platform temp dir) means the location is host-dependent and can leak stale bytecode across invocations on a persistent worker.
    Verify: `grep -rn 'RULES_PYTHON_PYCACHE_DIR' .bazelrc*`. Empty output on a CI `.bazelrc` (as opposed to a local dev `.bazelrc.user`) reads FINDING — the variable is unset, so the fallback search applies un-audited.
    Severity: SHOULD for CI/RBE legs, CONSIDER for local dev. Bazel: 8, 9. Ruleset: rules_python any. Settles: M-J-14.

11. **A custom repository rule or module extension that shells out to Python must pass `-B` (or set `PYTHONDONTWRITEBYTECODE=1`) itself; `rules_python`'s own `-B` habit (since 1.3.0) does not cover a caller's own subprocess.**
    Rationale: stray `.pyc` files written during repository-rule/module-extension evaluation can invalidate or pollute the `--repo_contents_cache`/repository cache the same way rules_python's own fix targeted.
    Verify: grep any `repository_ctx.execute`/`module_ctx.execute` call in the repo's own `.bzl` files that invokes a `python`/`python3` binary for the flag `-B` or the env var `PYTHONDONTWRITEBYTECODE`. Empty output where such a call exists reads FINDING.
    Severity: CONSIDER. Bazel: 8, 9. Ruleset: n/a (general repository-rule hygiene; cross-ref `BZL-HERM`). Settles: M-J-14.

12. **Do not recommend enabling precompiling by default in a new-adopter rule or skill.**
    Rationale: default resolves to `disabled` upstream; one of the three named caveats has an open, unresolved tracking issue nearly two years old; the benefit (import-time latency) is not close to universal.
    Verify: named reading heuristic — a shipped rule or skill that says "enable precompiling" without naming the exec-properties caveat and a same-srcs audit step is incomplete; grep the rule text itself for the phrase "exec_properties" adjacent to any precompiling recommendation.
    Severity: MUST (documentation correctness for the shipped rule set itself). Bazel: 8, 9. Ruleset: rules_python 0.33.0–2.3.3 (current). Settles: M-J-08, M-J-09 (the Decisions section above).

13. **Treat `system_python` and `script` as feature-unequal, not interchangeable "bootstrap flavors."**
    Rationale: `system_python` gained `main_module` and `RULES_PYTHON_ADDITIONAL_INTERPRETER_ARGS` only at 1.7.0 (2025-10-11); `PYTHONSAFEPATH` inheritance remains `script`-only as of 2.3.3; a rule that says "pick either" without naming the gap will surprise a debugger-integration user.
    Verify: named reading heuristic — cross-check any claim of the form "X works under both bootstraps" against the current `tests/bootstrap_impls/BUILD.bazel` target registrations (which `bootstrap_impl` value each behavior's test is registered under) before repeating the claim.
    Severity: CONSIDER. Bazel: 8, 9. Ruleset: rules_python ≥0.33.0. Settles: M-J-06.

14. **On Windows execution platforms, do not attempt to set `--bootstrap_impl=script`; treat any doc or config that does so as stale.**
    Rationale: the flag's own `select()` force-overrides to `system_python` under `:_is_windows` unconditionally, regardless of any explicit setting.
    Verify: `bazel config` on a Windows CI leg, or simply attempt the flag and confirm it has no effect (the resolved value stays `system_python`). Read any Windows-targeted `.bazelrc` line setting `bootstrap_impl=script` as dead configuration, not a finding to "fix" toward working — it is inert by design.
    Severity: CONSIDER (a doc/comment accuracy check). Bazel: 8, 9. Ruleset: rules_python any. Settles: M-J-06.

15. **A `sys.path`-order claim in any rule text must cite the current test invariant, not a remembered ordering.**
    Rationale: the order changed once already (1.7.0) for one of the two bootstraps; a rule written against pre-1.7.0 behavior is silently wrong for `system_python`.
    Verify: named reading heuristic — the canonical current assertion is `rules_python`'s own `tests/bootstrap_impls/sys_path_order_test.py`; any rule claiming an order should match `last_stdlib < first_user < first_runtime_site` and cite the ruleset version it was checked against.
    Severity: MUST (for the shipped rule's own text). Bazel: 8, 9. Ruleset: rules_python ≥1.7.0 for `system_python`, any version for `script`. Settles: M-J-06.

## Fleet evidence

No fleet repo uses `py_*` rules today ([bazel-audit/fleet-bazel-readiness.md](../bazel-audit/fleet-bazel-readiness.md): 0 `cc_*`/`py_*`/`js_*`/`rust_*` targets anywhere), so every finding above grounds on upstream sources, not on a fleet violation or satisfaction. What the fleet's Python shape means for an eventual adoption of this dive's guidance:

- **`requires-python` floors span 3.10–3.13 across the fleet's seven `uv.lock` projects with no shared floor** ([fleet-bazel-readiness.md:142](../bazel-audit/fleet-bazel-readiness.md)). The pre-3.11 precompiling caveat (§6, `sys.path[0]` ordering) is directly relevant to `ocx-sdk-python` (`≥3.12`), `ocx-mirror-sdk` (`≥3.13`), `index/bot-tools` (`≥3.12`), `ocx-indexbot` (`≥3.12`) — all clear — but `arcana/nox` (`≥3.11`, exactly the floor version) and `grimoire/test` (`≥3.10`, below the floor) would need the `sys.path[0]`-removal workaround if either were built with precompiling enabled under Bazel.
- **`ocx/test` and `grimoire/test` are the two harnesses named in the frame; neither declares a `[build-system]`** ([fleet-bazel-readiness.md:171](../bazel-audit/fleet-bazel-readiness.md)) and both resolve the binary under test via `OCX_COMMAND`/`GRIM_COMMAND` env vars with a `test/bin/<name>` fallback path (`ocx/test/conftest.py:211-219`, `grimoire/test/conftest.py:300-305`) — not via Bazel `data`/runfiles. A migration to `py_test(data=[":the_binary"])` would put the Rust binary in the runfiles tree at a `$(rootpath)`-relative location, which is exactly the kind of path this dive's `imports`/sys.path findings apply to: the migrated harness's own conftest helper functions would need auditing for any `sys.path.insert`/`PYTHONPATH` hack that predates the Bazel runfiles-relative model, since such a hack is precisely the "user path shadows an intended import" failure mode in §5.
- **`arcana/nox` is a zero-runtime-dependency zipapp CLI built by a hand-rolled `build_pyz.py` script** (`arcana/nox/pyproject.toml:19-20`) — this is the fleet's one Python project that needs none of this dive's guidance: no third-party deps to shadow, and `rules_python`'s own `py_zipapp_binary` (added 1.9.0, replacing implicit `py_binary` zip output) is a close match if it were ever migrated, but the audit's own framing ("this needs nothing from Bazel") stands, and this dive does not second-guess it.
- **No fleet Python project sets `PYTHONHASHSEED` or an equivalent action-determinism pin anywhere** (0 hits in the fleet-readiness audit's `sys.path/PYTHONPATH` column across all 7 projects, [fleet-bazel-readiness.md:134-140](../bazel-audit/fleet-bazel-readiness.md)) — none of the seven currently run as Bazel build-time tools, so this is a latent-not-live gap, recorded as such rather than as a violation.

## AI-agent angle

- **Writing a bare `py_binary(...)`/`py_library(...)`/`py_test(...)` with no `load()`.** Trained on years of WORKSPACE-era and Bazel-7/8 examples where native-rule autoload made this work, an agent will happily emit unloaded native-style Python rules. On Bazel 9 (`--incompatible_autoload_externally` empty by default), this fails at load time with an "undefined symbol" error. **Smallest check**: grep every `BUILD`/`BUILD.bazel` for `py_binary(`/`py_library(`/`py_test(` and confirm a preceding `load("@rules_python//python:defs.bzl", ...)` names it.
- **Asserting `script` is the current bootstrap default.** The ruleset's own 0.33.0 changelog announcement ("will become the default in a subsequent release") reads, out of context, like a settled fact from a model's training data — but it never happened; `system_python` absorbed the venv model instead and stayed default through 2.3.3. **Smallest check**: read `build_setting_default` for `bootstrap_impl` in the *installed* version's `python/config_settings/BUILD.bazel`, never infer it from a roadmap sentence in a changelog entry.
- **Recommending `PYTHONSAFEPATH` overrides without naming the bootstrap.** An agent may suggest "just set `PYTHONSAFEPATH=` to disable safe-path mode" as a universal fix; under the (default) `system_python` bootstrap this silently does nothing, because the override plumbing is `script`-only. **Smallest check**: before suggesting a `PYTHONSAFEPATH` runtime override, confirm the target's effective `bootstrap_impl` is `script`.
- **Recommending precompiling as a free performance win.** "Enable `--precompile=enabled`, it's supported since 0.33.0" omits that the exec-properties action-conflict caveat has an open, two-year-old tracking issue and that the flag's own default resolves to `disabled` today. **Smallest check**: any precompiling recommendation must be paired with a same-`srcs`/differing-`exec_properties` grep across the affected package before being applied.
- **Treating `imports` like a harmless "add this directory to my path" convenience.** An agent porting a non-Bazel Python project that used `sys.path.append` will reach for `imports = ["../.."]` or similar to "make it work like before," not realizing the attribute is transitive to every consumer and lands ahead of site-packages. **Smallest check**: grep for `imports\s*=\s*\[.*"\.\./` and require a named justification comment for any match rather than accepting it as a routine porting step.
- **Citing a lockfile-era or blog-era description of precompiling/bootstrap behavior without a version.** The corpus itself contains a wrong "still open" citation for a bug that was actually fixed in a month (§7) — a model asked to reason about "the precompiling correctness bug" from training data alone is exactly as likely to name the wrong, already-closed issue. **Smallest check**: for any "known bug" claim, `gh api repos/bazel-contrib/rules_python/issues/<N>` and read `state`/`closed_at` before repeating it.

## Contested / evolving

- **Whether `system_python` will ever get `PYTHONSAFEPATH` inheritance.** No open issue or roadmap note surfaced in this dive's sources stating an intent either way; the gap has persisted since 0.35.0 (2024-08-15) through 2.3.3 (2026-09-04), over two years, without comment. Trending: stable as a permanent `script`-only feature, not evidence of an active gap-closing effort — but this dive found no maintainer statement either way, so it is recorded as an open question rather than a settled trend.
- **The exec-properties action-conflict bug (#2445).** Two independent reports (2024-11-26, 2025-09-17) and zero maintainer commits addressing it directly, per the fetched issue timeline. Trending: unresolved and possibly growing in scope (the second reporter suggests it is broader than first understood, covering args/env-driven target variants generally, not only `exec_properties`-literal differences). This is exactly the kind of caveat a shipped rule must keep dated rather than treat as fixed-by-now.
- **Whether precompiling is worth recommending at all for a typical adopting repo.** `docs/precompiling.md`'s own "Overhead" section is candid about the roughly 2x runfiles cost; no source in this dive's corpus (nor the sibling `python-toolchains-and-pypi-resolution`/`python-tests-and-build-generation` dives, per the map's row descriptions) reports a fleet-scale practitioner account of the net win outweighing the cost plus the open caveat. Trending: treated by the ruleset itself as an advanced, opt-in-per-target feature (`pyc_collection`) rather than a broad recommendation — consistent with this dive's Decision above.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_python `docs/precompiling.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md) | Official docs page, fetched from `main` | Current, fetched 2026-09-05 | The primary source for all three named caveats, verbatim |
| [rules_python `docs/environment-variables.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md) | Official docs page, fetched from `main` | Current, fetched 2026-09-05 | `RULES_PYTHON_PYCACHE_DIR`, `RULES_PYTHON_PYPI_HUB_RESERVED`, `RULES_PYTHON_ADDITIONAL_INTERPRETER_ARGS` with exact `versionadded`/`versionchanged` tags |
| [rules_python `CHANGELOG.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | Full project changelog, fetched from `main` | Every entry dated 2019-08-14 through 2026-09-04 | The dated record for every bootstrap/precompiling/sys.path/PYTHONSAFEPATH claim in this file |
| [`python/private/attributes.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/attributes.bzl) | Ruleset source, `IMPORTS_ATTRS` definition | Current, fetched from `main` | The exact `imports` attribute docstring and path-resolution math |
| [`python/config_settings/BUILD.bazel`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/config_settings/BUILD.bazel) | Ruleset source, flag definitions | Current, fetched from `main` | Ground truth for `bootstrap_impl`'s and `precompile`'s actual `build_setting_default` values, overriding any docs-page phrasing |
| [`python/private/flags.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/flags.bzl) | Ruleset source, flag enums and effective-value functions | Current, fetched from `main` | Shows `PrecompileFlag.AUTO` resolves to `DISABLED` in code, not just in prose |
| [`python/private/common.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/private/common.bzl) | Ruleset source, shared action-construction helpers | Current, fetched from `main` | The hardcoded `PYTHONHASHSEED=0`/`PYTHONNOUSERSITE=1`/`PYTHONSAFEPATH=1` action environment for `PyCompile` |
| [`python/defs.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/python/defs.bzl) | Ruleset source, public rule re-exports | Current, fetched from `main` | Confirms the exact `load()` targets (`py_binary`, `py_library`, `py_test`) for the Bazel 9 autoload trap |
| [`tests/bootstrap_impls/sys_path_order_test.py`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/sys_path_order_test.py) | Ruleset's own regression test | Current, fetched from `main` | The canonical, runnable definition of "correct" `sys.path` order, registered under both bootstraps |
| [`tests/bootstrap_impls/stdlib_shadowing_test.py`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/stdlib_shadowing_test.py) | Ruleset's own regression test | Current, fetched from `main` | Proves the 2.2.0 stage-1-bootstrap stdlib-shadowing fix, `system_python`-only |
| [`tests/bootstrap_impls/inherit_pythonsafepath_env_test.sh`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/inherit_pythonsafepath_env_test.sh) + [`BUILD.bazel`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/tests/bootstrap_impls/BUILD.bazel) | Ruleset's own test + its target registration | Current, fetched from `main` | Proves `PYTHONSAFEPATH` inheritance is `script`-bootstrap-only, by registration, not by prose |
| [Issue #2212](https://github.com/bazel-contrib/rules_python/issues/2212) | GitHub issue + comment, fetched via `gh api` | Filed 2024-09-10, closed 2024-10-11 | The brief's named "still open" issue — verified closed, corrected in Finding 7 |
| [PR #2243](https://github.com/bazel-contrib/rules_python/pull/2243) | GitHub PR that closed #2212 | Merged/closed 2024-10-11 | Shows what actually shipped to fix the per-binary pyc opt-in |
| [Issue #2445](https://github.com/bazel-contrib/rules_python/issues/2445) | GitHub issue + 2 comments, fetched via `gh api` | Filed 2024-11-26, open through 2025-09-17 | The real multi-year-open bug matching the docs' third precompiling caveat |
| [Bazel 9.0 release post](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel blog | 2026-01-20 | Primary source dating `--incompatible_autoload_externally`'s default flip that makes the Bazel-9 `load()` trap current |
| [`bazel-topic-map/language-pain-points.md`](../bazel-topic-map/language-pain-points.md) §8-14 | Wave-1 scout, practitioner/issue survey | Compiled 2026-09-05 | Corroborating (argued-tier) survey of the same bootstrap/precompiling timeline; used only to cross-check dates against, never as the basis for a current-behavior claim |
