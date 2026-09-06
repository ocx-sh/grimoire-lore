---
title: "Python under Bazel — IDE typing, sdist build isolation, entry points and zipapps, PYTHONSAFEPATH parity"
slug: python-typing-ide-sdist-and-entrypoints
agent: sonnet-followup
model: claude-sonnet-5
date_researched: 2026-09-05
sources_count: 23
primary_sources_count: 23
answers_for:
  - bazel-python.md
affects_rule_ids:
  - BZL-PY-07
  - BZL-PY-08
  - BZL-PY-15
  - NEW-1
  - NEW-2
  - NEW-3
  - NEW-4
  - NEW-5
  - NEW-6
  - NEW-7 (verdict-only, no rule row)
  - NEW-8
---

# Python under Bazel — IDE typing, sdist build isolation, entry points and zipapps, PYTHONSAFEPATH parity

## Table of contents

1. [Summary](#summary)
2. [Answers](#answers)
   1. [Q1 — Type checking under the venv-per-target layout](#q1)
   2. [Q2 — sdist builds and build isolation](#q2)
   3. [Q3 — Entry points and zipapps](#q3)
   4. [Q4 — PYTHONSAFEPATH parity for `system_python`](#q4)
3. [Proposed revisions](#proposed-revisions)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Not settled](#not-settled)
7. [Sources](#sources)

## Summary

- `rules_python` ships **no** first-party IDE/type-checking story: issue [#1401](https://github.com/bazel-contrib/rules_python/issues/1401) ("Smooth IDE support") has been open since 2023-09-04 with no first-party fix, only community pointers.
- For a **CI type-check gate**, the current answer is `rules_mypy` (bazel-contrib org, v0.41.0, 2026-03-31) — an aspect wired via `.bazelrc`, not a `py_test`. `bazel-mypy-integration` is **archived** (2025-05-08) and its own maintainers redirect to `rules_mypy`.
- The mypy-aspect gate needs **no materialized venv at all** — it resolves imports from the Bazel dependency graph inside the aspect action. Venv materialization is a *separate* problem, needed only for **interactive** editors (Pylance/Pyright, PyCharm), not for a CI gate.
- No maintained Bazel↔Pyright integration exists; three personal forks named `rules_pyright` all have 0–1 stars and no org backing. Pyright support is IDE-only, via a materialized venv, never a Bazel aspect.
- `rules_python` has no `.venv`-materializing target of its own. The two community answers are `aspect_rules_py`'s `expose_venv_link` (own ruleset, not a `rules_python` add-on; opt-in only on the **2.0.0-alpha** track, auto-emitted on the stable **1.12.1** track) and `cedarai/rules_pyvenv` (v1.4, 2026-08-04, **WORKSPACE-only — no `MODULE.bazel`, no BCR entry**, a real gap for a Bzlmod-only fleet).
- Issue [#2410](https://github.com/bazel-contrib/rules_python/issues/2410) ("Support building from sdist in a build action") is still open; the concrete failure is proved by [#1463](https://github.com/bazel-contrib/rules_python/issues/1463): `pip.parse`'s repository-rule action runs `pip wheel --no-deps` ([`whl_installer.py:61-67`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/whl_installer/wheel_installer.py)) in the hermetic interpreter's own bare environment, and an sdist needing a C/C++ toolchain fails with `error: command 'clang' failed: No such file or directory` — a build-tooling gap, not a Bazel sandboxing bug.
- `[tool.uv] no-build-isolation` **is** reachable — but only for the `lock()` rule's `uv pip compile` step, because `lock()` auto-detects the project and passes `--project <dir>`, which makes `uv` read that `pyproject.toml`'s `[tool.uv]` table ([`docs/pypi/lock.md:87-95`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md)). It does **not** reach the later `pip.parse` wheel-build action — that is a separate seam, reachable only via `pip.parse(extra_pip_args = ["--no-build-isolation"])`, and even then the hermetic interpreter has no build deps installed unless you also supply them.
- The Bazel-downloader path is no longer "experimental" or opt-in: `pip.default.index_url` (versionadded 2.0.0, default `https://pypi.org/simple`) **supersedes** `experimental_index_url`, which is now marked deprecated in the source itself ([`extension.bzl:848-857`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/extension.bzl)). It fetches Simple-API metadata for **both** wheels and sdists; `download_only = True` is the only lever that excludes sdists outright ([`docs/pypi/download.md:262-289`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md)).
- `py_console_script_binary` never reads `pyproject.toml`. It parses the **wheel's own `dist-info/entry_points.txt`** `[console_scripts]` section with `configparser` ([`py_console_script_gen.py:96-140`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_gen.py)) — the PEP 517 backend already did the `[project.scripts]` → `entry_points.txt` translation when the wheel was built. It handles only `module:attr` (the first dotted segment); a longer attribute chain or an `extras` marker is silently dropped (tracked, unfixed, in [#1383](https://github.com/bazel-contrib/rules_python/issues/1383)).
- `py_zipapp_binary` (versionadded **1.9.0**, confirmed in [`py_zipapp_binary.bzl:14`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/zipapp/py_zipapp_binary.bzl)) is a near-exact mechanical match for a hand-rolled deterministic zipapp builder: both hardcode the `(1980,1,1,0,0,0)` zip epoch and pick `ZIP_STORED`/`ZIP_DEFLATED` by compression level ([`zipper.py:134-191`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/tools/private/zipapp/zipper.py) vs. [`arcana/nox/scripts/build_pyz.py:35-129`](file:///home/mherwig/dev/arcana/nox/scripts/build_pyz.py)). It still requires standing up a full `py_binary` + Bazel toolchain to emit one file — M-J-15's "needs nothing from Bazel" finding is **confirmed**, now with the exact mechanism it would replace.
- `PYTHONSAFEPATH` parity for `system_python` is **not** silence — it is a **stalled, discussed roadmap item**. Tracking issue [#2060](https://github.com/bazel-contrib/rules_python/issues/2060) (opened 2024-08-15) got an explicit maintainer ask to extend the `script`-only fix to `system_python`; the PR that would have generalized control via the `-P` interpreter flag ([#2122](https://github.com/bazel-contrib/rules_python/pull/2122)) was discussed for 14 months (including a maintainer "+1... especially +1 to set it in the script bootstrap case" on 2025-05-19) and then **closed unmerged** on 2025-10-22. The issue is still open. This changes the earlier dive's "no statement either way" to "discussed, not declined, not shipped."
- Fleet grounding: `ocx-indexbot/pyproject.toml:36-37` (`indexbot = "ocx_indexbot.cli.main:main"`, hatchling backend) is the exact `py_console_script_binary` target shape; `arcana/nox` is the fleet's one `[tool.pyright] strict = ["src"]` typed project ([`pyproject.toml:71-74`](file:///home/mherwig/dev/arcana/nox/pyproject.toml)) and its hand-rolled `build_pyz.py` is the zipapp comparison baseline.

## Answers

### Q1 — Type checking under the venv-per-target layout {#q1}

> Does a first-party rules_python or community solution exist for Pyright/mypy resolving first-party and PyPI imports under 2.3.3's venv-per-target layout, and what does a type-check gate look like as a Bazel target?

**Findings.**

`rules_python` tracks IDE support as an open feature request, not a shipped mechanism: [#1401 "Smooth IDE support for python_rules"](https://github.com/bazel-contrib/rules_python/issues/1401) has been open since 2023-09-04, with the most recent maintainer comment (2025-07-10) still pointing outward — "`aspect_rules_py` and `rules_uv` solve IDE support with `venv` approaches... this is fully a community-driven project." `rules_python`'s own docs carry no `ide.md`/`ide-support.md`/`venv.md` page (all 404 at `main`), and its `CHANGELOG.md` never introduces a public `.venv`-sibling target — the `bazel run //target.venv` idiom quoted in the issue thread is **`aspect_rules_py`'s** mechanism, not `rules_python`'s; conflating the two is the most likely agent mistake here (see AI-agent angle).

Two separate problems hide under "type checking," and they have different mechanisms:

**1. CI-time type-check gate.** The maintained answer is [`rules_mypy`](https://github.com/bazel-contrib/rules_mypy) (bazel-contrib org — the project moved from `theoremlp/rules_mypy`, which now 404s and redirects). It is an **aspect**, not a `py_test`:

```starlark
# tools/aspects.bzl
load("@pip_types//:types.bzl", "types")
load("@rules_mypy//mypy:mypy.bzl", "mypy")
mypy_aspect = mypy(types = types)
```
```
# .bazelrc
build --aspects //tools:aspects.bzl%mypy_aspect
build --output_groups=+mypy
```
Running `bazel build //...` with those flags set (or passed on the CI invocation) fails the build if mypy fails on any `py_binary`/`py_library`/`py_test` it touches — that *is* the gate; no separate test target exists. Third-party types are wired via `types.requirements(pip_requirements = "@pip//:requirements.bzl", requirements_txt = "//:requirements.txt")` against a `pip.parse` hub. Crucially, this needs **no materialized venv**: the aspect action resolves imports from the providers already in the Bazel dependency graph, so it works identically whether or not anyone ever runs `bazel run //:x.venv_link`. `bazel-mypy-integration` (the predecessor, same aspect shape, registered the same way) is **archived** (`archived: true`, `pushed_at: 2025-05-08`) and its own README says "the software is deprecated, and the maintainers recommend moving to rules_mypy."

Pyright has **no equivalent Bazel-aspect ruleset**. A GitHub search for `rules_pyright` turns up three personal repositories (`NicoHiguera/rules_pyright`, `ewianda/rules_pyright`, `agoessling/rules_pyright`), none with org backing, 0–1 stars each, last touched 2024–2025. There is no `bazel-contrib`/`aspect-build` Pyright aspect. Pyright's role stays IDE-only.

**2. Interactive editor resolution (Pylance/Pyright in VSCode, PyCharm, LSP).** This needs a *materialized* venv on disk, which `rules_python` does not provide. The two community paths:
- **`aspect_rules_py`** (a full ruleset switch, not a `rules_python` add-on). Its stable line (**v1.12.1**, 2026-08-26) auto-emits a `.venv` sibling for every `py_binary`; its next major (**v2.0.0-alpha.6**, 2026-08-10) makes this opt-in via `expose_venv_link = True`, publishing `:name.venv` (hermetic REPL) and `:name.venv_link` (workspace symlink to the runfiles tree — "point your IDE at the printed venv path") ([README §IDE Integration](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md)).
- **`cedarai/rules_pyvenv`** (v1.4, 2026-08-04, actively pushed) — `bazel run //:venv env` builds a plain stdlib `venv`. It has **no `MODULE.bazel` and no Bazel Central Registry entry** (`registry.bazel.build/modules/rules_pyvenv` 404s); adding it to a Bzlmod-only repo means a `WORKSPACE`-era `http_archive`, which is exactly the shape [BZL-PY-05](../bazel-python.md) already flags as a finding in a `MODULE.bazel`-only repo.

A `pyrightconfig.json` with hand-maintained `extraPaths` is a real fallback (point Pyright at the venv's `site-packages` plus first-party source roots) but is not generated by any tooling found in this research; it would be hand-maintained and would drift the moment `imports =` or a `pip.parse` hub changes — worth naming as the fallback, never recommending it as the primary path.

**Table of options.**

| Option | Maintainer | Last release | Floor | Verdict |
|---|---|---|---|---|
| `rules_mypy` | bazel-contrib (community) | v0.41.0, 2026-03-31 (commits continue past it, `pushed_at` 2026-08-29) | `rules_python` ≥1.1.0, `rules_uv` 0.21.0 | **Use for the CI gate.** Aspect-based, no venv needed, replaces the archived project outright. |
| `bazel-mypy-integration` | bazel-contrib (community) | archived 2025-05-08 | n/a | **Do not adopt.** Superseded, own maintainers say so. |
| `aspect_rules_py` (`expose_venv_link`) | Aspect Build | v1.12.1 stable / v2.0.0-alpha.6 | is a full ruleset (not layered on `rules_python`) | Real IDE story, but a project-wide ruleset switch — see BZL-PY-07's existing "ruleset switch, not a flag" framing for the equivalent uv decision. |
| `rules_pyvenv` | cedarai (individual) | v1.4, 2026-08-04 | any `rules_python` | CONSIDER only: WORKSPACE-only, no BCR — a real cost in a Bzlmod-only fleet. |
| Hand-rolled `pyrightconfig.json` + `extraPaths` | — | — | — | Fallback of last resort; not generated, drifts silently. |
| `rules_lint` (Aspect Build) | Aspect Build | — | — | Ships `ruff`/`bandit`/`flake8`/`pydoclint`/`pylint`/**`ty`** for Python — **not mypy, not pyright** ([README table](https://raw.githubusercontent.com/aspect-build/rules_lint/main/README.md)). Not a type-check answer for this question. |

**Answer.** As of `rules_python` 2.3.3 there is no first-party type-checking or IDE story. For a CI gate, `rules_mypy` (bazel-contrib, aspect-based, `--aspects=...%mypy_aspect --output_groups=+mypy`) is the current, maintained answer and needs no venv. For interactive Pyright/Pylance/PyCharm resolution, the only paths are a ruleset switch to `aspect_rules_py` (venv materialization opt-in from v2.0.0-alpha, automatic on stable v1.x) or the WORKSPACE-only `rules_pyvenv` bolt-on; neither is a `rules_python` flag. No maintained Pyright-specific Bazel integration exists at all.

### Q2 — sdist builds and build isolation {#q2}

> rules_python issue #2410 — current state; what exactly fails when a pip.parse hub needs an sdist-only package; is `--no-build-isolation` reachable through `lock()` or `extra_pip_args`; the `experimental_index_url`/Bazel-downloader path and its sdist behaviour.

**Findings.**

[#2410 "Support building from `sdist` in a build action"](https://github.com/bazel-contrib/rules_python/issues/2410) (opened 2024-11-14) is **still open**. Its last substantive comment (2026-01-20, maintainer `aignas`) points at `aspect-build/rules_py`'s [PR #770](https://github.com/aspect-build/rules_py/pull/770) as prior art elsewhere in the ecosystem — i.e. `rules_python` itself has shipped nothing toward a PEP 517 build-as-Bazel-action; the design discussion (toolchain-per-backend, `sdist_build_toolchain`, transitions) never left the comment thread.

**The exact failure**, proved by the closed-but-explanatory [#1463](https://github.com/bazel-contrib/rules_python/issues/1463): `pip.parse`'s repository rule shells out to `whl_installer.py`, whose entire pip invocation is:

```python
# python/private/pypi/whl_installer/wheel_installer.py:61-67 (rules_python 2.3.3)
pip_args = (
    [sys.executable, "-m", "pip"]
    + (["--isolated"] if args.isolated else [])
    + (["download", "--only-binary=:all:"] if args.download_only else ["wheel"])
    + ["--no-deps"]
    + deserialized_args["extra_pip_args"]
)
```

For a package with no compatible wheel, this becomes `pip wheel --no-deps -r <reqfile>` running under the **hermetic prebuilt interpreter**, in the repository rule's own (non-sandboxed, no C toolchain provisioned) environment. If the sdist's `setup.py build_ext` needs a compiler, it fails exactly as the reporter saw it: `error: command 'clang' failed: No such file or directory` — because nothing wired a C/C++ toolchain into that interpreter's `PATH`, and repository rules have no declared exec-toolchain dependency the way a normal Bazel action would. This is a build-tooling gap in the repository-rule sandbox, not a hermeticity bug in Bazel's sandboxing.

**`--no-build-isolation` reachability — two separate seams, not one:**

1. **The `lock()` rule (locking/compiling, not building).** `lock()` auto-detects the `pyproject.toml` among its `srcs` and passes `--project <dir>` to `uv pip compile`, which makes `uv` read that file's `[tool.uv]` table — explicitly including `no-build-isolation`, per the doc's own subsection:
   > "When a `pyproject.toml` file is among the `lock.srcs`, the `lock` rule auto-detects the project directory and passes `--project <dir>` to `uv pip compile`. This causes `uv` to read `[tool.uv]` settings from that `pyproject.toml`, such as `no-build-isolation`, `exclude-dependencies`, and workspace members." — [`docs/pypi/lock.md:87-95`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md)

   This solves the case where **resolving/locking** needs an sdist's metadata built without isolation (a common uv workflow), not the case where `pip.parse` later needs to **build** that sdist into a wheel.

2. **`pip.parse`'s `extra_pip_args`, for the actual wheel-build action.** Reading the `pip_args` construction above, `extra_pip_args` is spliced directly onto the end of the argv passed to `pip wheel`/`pip download` — so `pip.parse(extra_pip_args = ["--no-build-isolation"])` **is mechanically reachable** and will reach the underlying pip invocation. The catch: `--no-build-isolation` tells pip to use "the current environment" to run the PEP 517 build backend instead of creating a fresh isolated one — and "the current environment" here is the bare hermetic interpreter, which has no `setuptools`/`wheel`/`cython`/etc. installed. Passing the flag alone does not fix anything unless the interpreter behind `python_interpreter_target` already has those build dependencies importable (e.g. a hand-provisioned venv used as the pip.parse interpreter) — which defeats hermeticity and is not documented anywhere as a supported pattern. This is the concrete mechanism behind [#1463](https://github.com/bazel-contrib/rules_python/issues/1463) that [BZL-PY-03](../bazel-python.md) currently states only as an ordering rule.

**The `experimental_index_url` / Bazel-downloader path is no longer experimental-gated — it is the 2.0.0 default via `pip.default`.** As of 2.0.0, `experimental_index_url` and `experimental_index_url_overrides` on `pip.parse` are marked deprecated directly in the source:

```python
# python/private/pypi/extension.bzl:848-857 (rules_python 2.3.3)
"experimental_index_url": attr.string(
    default = kwargs.get("experimental_index_url", ""),
    doc = """\
May be removed in future releases.
:::{versionchanged} 2.0.0
This is deprecated, please use {obj}`pip.default.index_url` or pass the `--index-url` parameter via the
lock-file or {obj}`pip.parse.extra_pip_args`.
:::
""",
),
```
and the replacement, `pip.default.index_url` (line 683), defaults to `https://pypi.org/simple` unconditionally (`defaults.get("index_url", "https://pypi.org/simple")`, line 264). The docs describe the resulting behaviour as unconditional, not opt-in: "The `pip` extension supports pulling information from PyPI... and it **will ensure** that the bazel downloader is used for downloading the wheels" ([`docs/pypi/download.md:317-318`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md)). This fetches the PyPI **Simple API** response — which lists both source **and** wheel distributions — to pick the right artifact per target platform; it does not eagerly download anything. `download_only = True` is the one lever that opts back out of sdists entirely: "it will only use wheels and ignore any sdists that it may find on the PyPI-compatible indexes" ([`docs/pypi/download.md:276-279`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md)) — with the explicit warning that it "will not work for sdists with C extensions."

**Answer.** #2410 is unimplemented and inactive since January 2026; there is no PEP 517 build-as-a-Bazel-action in `rules_python` 2.3.3. The concrete failure for an sdist-only dependency is `pip wheel --no-deps` failing inside the repository rule's bare hermetic-interpreter environment for want of a build toolchain (proved by #1463). `[tool.uv] no-build-isolation` is real and reachable, but only through `lock()`'s locking step; the separate `pip.parse` wheel-build step has its own, independent `--no-build-isolation` seam via `extra_pip_args`, which is mechanically wired but practically inert unless the interpreter already carries build dependencies. The Bazel-downloader/Simple-API path has been the unconditional default since 2.0.0 via `pip.default.index_url` (not `experimental_index_url`, which is deprecated), and it surfaces sdists in its metadata scan exactly like wheels — `download_only = True` is the only way to exclude them.

### Q3 — Entry points and zipapps {#q3}

> How does `py_console_script_binary` read a wheel's entry_points.txt; what does `py_zipapp_binary` (1.9.0) replace in a hand-rolled `build_pyz.py`; does a zero-dependency stdlib zipapp CLI need Bazel at all (confirm/refine M-J-15)?

**Findings.**

**`py_console_script_binary`** ([`python/private/py_console_script_binary.bzl`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_binary.bzl), added at rules_python **0.26.0**, 2023-10-06, replacing the removed WORKSPACE-era `entry_point` macro at **0.34.0**, 2024-07-04; symbolic-macro compatible since **1.7.0**, 2025-10-11) is a macro with this exact signature:

```python
def py_console_script_binary(
        *, name, pkg, entry_points_txt = None, script = None,
        binary_rule = py_binary, shebang = "", main = None, **kwargs):
```
- `pkg`: the `Label` of the wheel's `pip.parse` target (e.g. `@pypi//httpx`).
- `entry_points_txt`: defaults to the `dist_info` sub-target in the same package as `pkg`.
- `script`: the console-script key to select; defaults to guessing from `name`.
- `main`: defaults to `<name>_entry_point.py` (the generated file).

It **never reads `pyproject.toml`**. It calls `py_console_script_gen`, whose implementation ([`py_console_script_gen.py:96-140`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_gen.py)) parses the wheel's own `dist-info/entry_points.txt` with Python's `configparser`:

```python
config = EntryPointsParser()          # ConfigParser subclass, case-sensitive keys
config.read(entry_points)
console_scripts = dict(config["console_scripts"])
...
module, _, entry_point = entry_point.rpartition(":")
attr, _, _ = entry_point.partition(".")   # only the FIRST dotted segment
```

`entry_points.txt`'s `[console_scripts]` section is populated by the wheel's own build backend (hatchling, setuptools, etc.) at wheel-build time, from that project's `[project.scripts]` table — `py_console_script_binary` is one layer downstream of that translation, not a reader of `pyproject.toml`. This matters for the fleet's `ocx-indexbot/pyproject.toml:36-37`:
```toml
[project.scripts]
indexbot = "ocx_indexbot.cli.main:main"
```
built with `hatchling` — the wheel hatchling produces will carry `indexbot = ocx_indexbot.cli.main:main` under `[console_scripts]` in its `entry_points.txt`, and `py_console_script_binary(name = "indexbot", pkg = "@pypi//ocx-indexbot")` would generate a `py_binary` whose entry file does `from ocx_indexbot.cli.main import main; sys.exit(main())` — matching exactly.

Two sharp edges the source shows directly: (1) only the text before the **first** `.` in the entry-point's right-hand side survives (`attr, _, _ = entry_point.partition(".")`) — an entry point like `pkg.cli:App.run` would resolve `attr = "App"`, not `App.run`, silently generating the wrong call; (2) `extras` (`pkg[extra]`) in an entry-point spec are explicitly unhandled, per the code's own `# TODO: handle 'extras'` comment referencing [#1383](https://github.com/bazel-contrib/rules_python/issues/1383) (closed by the PR that added the macro itself, but the extras gap remains — its own comment says so at 2.3.3).

**`py_zipapp_binary`** ([`python/zipapp/py_zipapp_binary.bzl:14`](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/zipapp/py_zipapp_binary.bzl), `:::{versionadded} 1.9.0 :::`, released 2026-02-21, replacing `--build_python_zip` and the `py_binary`/`py_test` zip output group) wraps an existing `py_binary`/`py_test` target:

```starlark
py_zipapp_binary(
    name = "app_pyz",
    binary = ":app",       # mandatory: a py_binary/py_test
    compression = "6",     # "" .. "9"; ZIP_STORED at 0/default, else ZIP_DEFLATED
    executable = True,     # emit a self-executing shebang'd zip, not a plain .zip
)
```

Its underlying tool (`tools/private/zipapp/zipper.py`) is deterministic in exactly the way a hand-rolled builder needs to be:
```python
# tools/private/zipapp/zipper.py:134,138,191 (rules_python 2.3.3)
zi.date_time = (1980, 1, 1, 0, 0, 0)
zi.external_attr = (0o644 & 0xFFFF) << 16
compress_type = zipfile.ZIP_STORED if compress_level == 0 else zipfile.ZIP_DEFLATED
```
This is **the same epoch and the same compression choice** as the fleet's own hand-rolled builder:
```python
# arcana/nox/scripts/build_pyz.py:35-36,116,129 — michael-herwig/arcana
DEFAULT_EPOCH: tuple[int, int, int, int, int, int] = (1980, 1, 1, 0, 0, 0)
...
    return DEFAULT_EPOCH
...
info.compress_type = zipfile.ZIP_STORED  # no compressor, so no zlib-version dependence
```
Differences worth naming precisely rather than hand-waving "near-exact": `build_pyz.py` additionally honours `SOURCE_DATE_EPOCH` from the environment (`build_pyz.py:114`) where `rules_python`'s zipper hardcodes 1980 unconditionally; `build_pyz.py` explicitly **refuses** any symlink or irregular file in the source tree (`_refuse_irregular`, `build_pyz.py:70-92`, opened with `O_NOFOLLOW` to close a TOCTOU window) as a deliberate security hardening, where `rules_python`'s zipper instead *packs* symlinks (setting `S_IFLNK` mode bits) rather than refusing them — a different design choice, not a strict superset. `py_zipapp_binary` also inherently packages a `py_binary`'s full runfiles tree and Bazel's own bootstrap machinery (`venv_python_exe`, stage-2 bootstrap references in the rule implementation), so producing the zipapp requires the whole Bazel Python toolchain to be standing — a hand-rolled script needs only the interpreter running it.

**M-J-15, refined.** The prior consolidation's Verdict item 12 already declined a rule row here ("a rule saying 'do not adopt Bazel here' has no verification that changes a diff inside a Bazel repo"); this research **confirms** the mechanical claim behind it rather than changing the decision: `py_zipapp_binary` genuinely replaces `build_pyz.py`'s logic almost line-for-line (same epoch, same compression semantics, same "one root `__main__.py`" shape), so *if* `arcana/nox` were ever inside a Bazel repository already, switching to `py_zipapp_binary` would be close to a pure win. The reason to still not adopt Bazel for it is unchanged and orthogonal to the mechanism match: `arcana/nox` has zero runtime dependencies, a working ~200-line builder, and no other Bazel benefit in scope — standing up a `MODULE.bazel`, a `py_binary`, and a toolchain registration to replace a working single-purpose script is disproportionate. **Confirmed, not refined** — the "needs nothing from Bazel" framing stands; what changes is that the reason is now "the replacement would work, the cost still isn't worth it" rather than "unverified."

**Answer.** `py_console_script_binary` reads a wheel's `dist-info/entry_points.txt` (never `pyproject.toml`) via `configparser`, handles only a single-level `module:attr` target with no support for a longer attribute chain or extras, and is unchanged in this shape since 0.26.0 (2023-10-06). `py_zipapp_binary` (1.9.0, 2026-02-21) is a close mechanical match for a correctly-built hand-rolled deterministic zipapp — same epoch, same compression semantics — but pulls in the full `py_binary`/Bazel-toolchain machinery to produce it. M-J-15's "needs nothing from Bazel" finding for `arcana/nox` is confirmed on stronger grounds: the replacement is real, the migration cost still isn't justified for a zero-dependency, already-working CLI.

### Q4 — PYTHONSAFEPATH parity for `system_python` {#q4}

> Is PYTHONSAFEPATH override/inheritance ever coming to the system_python bootstrap? Record: no statement / roadmap / declined, with links.

**Findings.**

The correct record is **"discussed at length, a maintainer explicitly asked for it, a concrete PR existed, and it stalled and was closed unmerged"** — meaningfully different from "no statement either way."

The tracking issue is [#2060 "Add an option to opt-out of PYTHONSAFEPATH"](https://github.com/bazel-contrib/rules_python/issues/2060) (opened 2024-07-15 by the reporter's PR context, formal issue dated 2024-08-15 in the metadata, **still open** at the time of this research). The thread's key turns:

- 2024-07-19, maintainer `rickeylev`, re-opening a related PR: *"The PR fixes it for `bootstrap=script`, but that isn't the default yet... I suspect that zip invocations going through `foo.zip/__main__.py` will still be forcing safe path. ...if you want to send a PR to update `python_bootstrap_template.txt`... just set `bootstrap_impl="system_python"` and it should Just Work to verify behavior."* — this is an explicit maintainer **ask** to extend the fix to `system_python`, not silence.
- 2024-07-18/08-14, maintainers and the reporter converge on using the `-P` interpreter flag instead of the `PYTHONSAFEPATH` env var, specifically because `-P` does not propagate to child processes/subinterpreters the way an inherited env var does (the motivating bug: Meson-driven builds spawning sub-Pythons that inherit `PYTHONSAFEPATH=1` and break). `rickeylev`, 2024-08-14: *"I'd be fine with `-P` being used instead of using the environment variable. I'd approve a PR changing things to pass `-P` instead."*
- This became [PR #2122 "fix: Use -P to enable safe path semantics instead of PYTHONSAFEPATH"](https://github.com/bazel-contrib/rules_python/pull/2122), which would have applied to **both** bootstraps (it modifies the shared stage-1/stage-2 bootstrap logic, not `script`-specific code). Review continued for over a year:
  - 2024-10-21, `rickeylev`: *"I do think using `-P` is the right thing, but switching to it is almost certainly going to break something... I don't see a way to work around it."* — raises two concrete blockers: Bazel 6 / builtin-`py_runtime` compatibility, and behaviour when the Python version can't be detected (the WORKSPACE `autodetecting_toolchain` case).
  - 2025-05-19, `aignas`: *"I'd be still +1 to set it. We had changes under the hood that may make it easier to ensure that we don't break. I would be especially +1 to set it in the **script** bootstrap case."* — support continues, but narrowed back toward `script` rather than universal.
  - No further comment appears after 2025-05-20. The PR's `closed_at` is **2025-10-22**, with `merged: false` — closed without landing, no explicit rejection comment on record, consistent with the review having quietly gone cold after the version-detection blocker `rickeylev` raised in October 2024 was never resolved.
- Issue #2060 itself remains **open** with no linked replacement PR as of this research.

Cross-checking the CHANGELOG (`main`, fetched 2026-09-05) for any later `PYTHONSAFEPATH` entry beyond the 0.35.0 inheritance-for-`script` feature turns up nothing new — the two hits are both the original 0.35.0 entry.

**Answer.** This is not an unaddressed silence — it is a stalled feature with an explicit, on-the-record maintainer intent to generalize it, blocked on real compatibility concerns (Bazel 6 support, version-undetectable toolchains) that were never resolved, and a concrete PR that sat in review for 14 months before being closed unmerged (2025-10-22). Treat [BZL-PY-15](../bazel-python.md)'s "`script`-only, no maintainer statement either way" as needing one word changed: not "no statement," but "discussed, unresolved, closed unmerged" — the practical guidance (route any workflow needing `PYTHONSAFEPATH` control through `--bootstrap_impl=script`) is unchanged, but citing it as settled-forever silence undersells how close it came and how likely a future PR reviving #2122's approach is to reopen the question.

## Proposed revisions

| Rule ID | Change | Evidence | Confidence |
|---|---|---|---|
| NEW-1 | New rule: for a Bazel-native Python type-check gate, wire `rules_mypy`'s aspect via `.bazelrc` (`build --aspects=//tools:aspects.bzl%mypy_aspect`, `build --output_groups=+mypy`) rather than a hand-rolled `py_test`; never recommend `bazel-mypy-integration` (archived 2025-05-08). Verification: `grep -rn 'bazel-mypy-integration\|mypy_integration' MODULE.bazel WORKSPACE*` — any hit is a FINDING to migrate; empty + a `rules_mypy` `bazel_dep` = pass; empty on both = no type-check gate configured (not itself a finding, but worth flagging in `bazel-adopt`). | [rules_mypy readme.md](https://raw.githubusercontent.com/bazel-contrib/rules_mypy/main/readme.md), [bazel-mypy-integration repo metadata](https://api.github.com/repos/bazel-contrib/bazel-mypy-integration) | normative |
| NEW-2 | New rule (CONSIDER): before recommending a materialized venv for IDE support, name the ruleset cost — `aspect_rules_py`'s `expose_venv_link` is a full ruleset switch (2.0.0-alpha only for opt-in; auto on stable 1.x), `rules_pyvenv` has no BCR/Bzlmod entry. Never suggest a `bazel run //:target.venv` idiom as a `rules_python`-native mechanism. Verification: `grep -rn 'rules_pyvenv\|expose_venv_link\|aspect_rules_py' MODULE.bazel` — empty means no IDE-venv tooling is wired (a gap to flag, not a violation); a `rules_pyvenv` `http_archive` alongside a `MODULE.bazel`-only repo is a FINDING (WORKSPACE-only dependency in a Bzlmod repo). | [rules_python#1401](https://github.com/bazel-contrib/rules_python/issues/1401), [aspect_rules_py README §IDE Integration](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md), [rules_pyvenv BCR 404](https://registry.bazel.build/modules/rules_pyvenv) | normative |
| NEW-3 | New rule (MUST): never assume `pip.parse` can build an arbitrary sdist-only package hermetically. Before adding a package with no manylinux/universal wheel to a lock file, confirm a compiler toolchain reaches the repository-rule's execution environment, or pin a pre-built wheel instead. Verification: after a `pip.parse` failure, `grep -n "Failed to build\|did not run successfully" <bazel error log>` alongside `grep -c 'python.toolchain\|register_toolchain' MODULE.bazel` for a C/C++ toolchain — its absence alongside a wheel-build failure confirms this root cause, not a Bazel sandbox bug. Empty grep on the error log = not this failure mode. | [rules_python#1463](https://github.com/bazel-contrib/rules_python/issues/1463), [whl_installer.py:61-67](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/whl_installer/wheel_installer.py) | normative (mechanism), measured (the fleet has zero pip.parse hubs today) |
| BZL-PY-07 / NEW-4 | Rationale addition, not a text change: cite that `lock()`'s `[tool.uv]` pass-through (including `no-build-isolation`) covers only the **locking** step, and is a distinct seam from `pip.parse(extra_pip_args=["--no-build-isolation"])`, which covers the **wheel-build** step and needs the hermetic interpreter to already carry build deps to do anything useful. Verification: `grep -n 'no-build-isolation' **/pyproject.toml` paired with `grep -n 'extra_pip_args' MODULE.bazel` — a `[tool.uv] no-build-isolation` entry with no corresponding `pip.parse(extra_pip_args=...)` is not a finding by itself, but means only the lock step is covered; document which. | [docs/pypi/lock.md:87-95](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | normative |
| BZL-PY-08 / NEW-5 | Add a clause: `experimental_index_url` on `pip.parse` is deprecated as of 2.0.0 in favour of `pip.default.index_url` (default `https://pypi.org/simple`), which is now the unconditional default metadata-fetch path, not an opt-in. Never present `experimental_index_url` as the "modern" mechanism; check `pip.default` first. Verification: `grep -n 'experimental_index_url\b' MODULE.bazel` (excluding `_overrides`) — any hit at rules_python ≥2.0.0 is a FINDING to migrate to `pip.default.index_url`; empty = pass or not applicable. | [extension.bzl:683,848-857](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/extension.bzl), [docs/pypi/download.md:314-331](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md) | normative |
| NEW-6 | New rule (MUST): never assume `py_console_script_binary` supports a dotted attribute chain (`module:Class.method`) or an `extras` marker (`pkg[extra]`) in a console-script entry point — only `module:attr` (first segment) is honoured. Verification: for any `pip.parse`d package's `entry_points.txt`, `grep -n '^[a-z_-]\+ = ' <dist-info>/entry_points.txt` under `[console_scripts]` and check the right-hand side for a second `.` after the `:` or a `[` before it — either is a FINDING that `py_console_script_binary` will silently mis-wire. Empty (all single-segment, no extras) = pass. | [py_console_script_gen.py:96-140](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_gen.py), [rules_python#1383](https://github.com/bazel-contrib/rules_python/issues/1383) | normative |
| — (Verdict-only, no row) | M-J-15 / Verdict item 12: confirm, do not add a rule — the mechanism match (`py_zipapp_binary` vs. `build_pyz.py`) is now proved, but the decision not to adopt Bazel for a zero-dependency zipapp stands unchanged. | [zipper.py:134-191](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/tools/private/zipapp/zipper.py), [arcana/nox/scripts/build_pyz.py](file:///home/mherwig/dev/arcana/nox/scripts/build_pyz.py) | measured |
| BZL-PY-15 / NEW-8 | Rationale correction: replace "no maintainer statement either way" with "discussed 2024-07 through 2025-10, a generalizing PR (#2122) reviewed 14 months then closed unmerged; tracking issue #2060 still open." No change to the normative text (still route SAFEPATH-control workflows through `script`). | [rules_python#2060](https://github.com/bazel-contrib/rules_python/issues/2060), [rules_python#2122](https://github.com/bazel-contrib/rules_python/pull/2122) | normative |

## AI-agent angle

1. **Conflating `aspect_rules_py`'s `.venv` idiom with a `rules_python`-native mechanism.** The exact phrase `bazel run //target.venv` appears in a `rules_python` issue thread, spoken by Aspect Build's founder describing his own ruleset. An agent skimming that thread will confidently suggest it as `rules_python` behaviour; it does nothing there. **Check:** before suggesting any `.venv`/`.venv_link` target, confirm which `bazel_dep` (`rules_python` vs `aspect_rules_py`) is actually registered in `MODULE.bazel`.
2. **Recommending `bazel-mypy-integration` from stale training data.** It reads as the obvious hit for "bazel mypy," and its README/docs still describe working functionality — the archive notice is a repo-metadata fact (`archived: true`), not something the README states about itself. **Check:** `gh api repos/bazel-contrib/bazel-mypy-integration --jq .archived` before recommending it, every time — training data cannot know an archive date after its cutoff.
3. **Treating `--no-build-isolation` as one on/off switch.** An agent that finds the `[tool.uv]` documentation will assume it fixes `pip.parse` wheel builds too; it only fixes `lock()`'s compile step. **Check:** identify which rule (`lock()` vs `pip.parse`) is actually failing before reaching for this flag on the wrong one.
4. **Assuming `py_console_script_binary` reads `pyproject.toml`.** The question itself ("how it reads `[project.scripts]` from a wheel's entry_points.txt") is the trap already half-set: an agent will describe it as reading `pyproject.toml` directly, when it reads the wheel's already-built `entry_points.txt`. This matters for debugging: editing `pyproject.toml`'s `[project.scripts]` and re-running `bazel build` **without** re-locking/re-fetching the wheel will not pick up the change — the wheel has to be rebuilt (a new `uv.lock`/`requirements_lock.txt` entry, or a re-pinned local wheel) before `entry_points.txt` reflects the edit. **Check:** if a `py_console_script_binary` target doesn't pick up a `pyproject.toml` script change, verify the lock/hub was re-resolved, not that the macro is broken.
5. **Repeating a "known bug #N" without checking state (same failure mode this whole corpus keeps proving on itself).** PR #2122 looks, from its GitHub URL alone, like it could still be in flight; it is closed unmerged. **Check:** `gh api repos/bazel-contrib/rules_python/pulls/2122 --jq '.state,.merged'` before citing any PR as evidence of shipped behaviour.

## Contested / evolving

- Whether `rules_python` will ever ship first-party IDE support ([#1401](https://github.com/bazel-contrib/rules_python/issues/1401)) or continue directing users to `aspect_rules_py`/`rules_uv` indefinitely — the maintainer's 2025-07-10 comment reads as a deliberate scope decision ("fully a community-driven project"), not a temporary gap.
- Whether `PYTHONSAFEPATH` control via `-P` (generalizing beyond `script`) will be revived — the underlying motivation (Meson/subprocess propagation) hasn't gone away, and `aignas`'s 2025-05-19 "+1... especially in the script bootstrap case" reads as narrowing scope rather than abandoning it outright.
- `aspect_rules_py`'s IDE story is mid-migration: the auto-emitted-`.venv` behaviour of the stable 1.x line and the opt-in `expose_venv_link` of the 2.0.0-alpha line are genuinely different defaults, and 2.0 is still alpha (six alphas as of 2026-08-10, no RC). Any guidance citing "the aspect_rules_py IDE mechanism" must state which major it means.

## Not settled

- Whether a future `rules_python` release resolves #2410 (sdist build-as-Bazel-action) at all, given the maintainer's own framing in December 2024 ("no one has found time to work on this yet") and the January 2026 pointer to a different ruleset's PR as the closest prior art. Would be settled by a merged PR against `python/private/pypi/`.
- Whether `py_console_script_binary`'s `extras`/dotted-attribute gap ([#1383](https://github.com/bazel-contrib/rules_python/issues/1383)) is a genuine roadmap item or permanently out of scope — the code comment ("TODO: handle 'extras' in entry_point generation") is the only signal found; no open discussion thread was located beyond the issue itself.
- Whether `#2122`'s closure reflects a deliberate rejection or simple staleness — no closing comment was found in the timeline; only the `closed_at`/`merged: false` metadata is on record. A maintainer asked directly would settle this in one message.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [rules_python#1401](https://github.com/bazel-contrib/rules_python/issues/1401) | Open tracking issue, 2023–2025 | Read 2026-09-05 | Proves no first-party IDE support exists; names both community alternatives in maintainers' own words |
| [rules_mypy `readme.md` @ main](https://raw.githubusercontent.com/bazel-contrib/rules_mypy/main/readme.md) | Ruleset's own usage doc | main, read 2026-09-05; latest tag v0.41.0, 2026-03-31 | Exact `.bazelrc`/aspect wiring for the CI type-check gate |
| [`bazel-mypy-integration` repo metadata](https://api.github.com/repos/bazel-contrib/bazel-mypy-integration) | GitHub repo API response | fetched 2026-09-05 | `archived: true`, `pushed_at: 2025-05-08` — the archive is a fact this session's training data cannot know |
| [aspect-build/rules_py `README.md` @ main](https://raw.githubusercontent.com/aspect-build/rules_py/main/README.md) | Ruleset's own README, "IDE Integration" section | main, read 2026-09-05 | `expose_venv_link`, `.venv`/`.venv_link` targets, the v1.x→v2.0 migration note |
| [aspect-build/rules_py releases](https://api.github.com/repos/aspect-build/rules_py/releases) | GitHub releases API | fetched 2026-09-05 | Dates v1.12.1 (2026-08-26, stable) vs. v2.0.0-alpha.6 (2026-08-10) as concurrent tracks |
| [cedarai/rules_pyvenv `README.md` @ main](https://raw.githubusercontent.com/cedarai/rules_pyvenv/main/README.md) + [releases](https://api.github.com/repos/cedarai/rules_pyvenv/releases) | Small ruleset's own doc + releases | main / v1.4, 2026-08-04 | `bazel run //:venv env`; confirms WORKSPACE-only install path (no `MODULE.bazel` in repo tree) |
| [BCR entry check for `rules_pyvenv`](https://registry.bazel.build/modules/rules_pyvenv) | Bazel Central Registry | checked 2026-09-05 (404) | Confirms no Bzlmod publication exists |
| [rules_python#2410](https://github.com/bazel-contrib/rules_python/issues/2410) | Open issue, 2024-11-14 → 2026-01-20 | read 2026-09-05 | Full design discussion for sdist-build-as-action; maintainer's own "no one has found time" admission |
| [rules_python#1463](https://github.com/bazel-contrib/rules_python/issues/1463) | Closed-by-explanation issue, 2023-10-05 | read 2026-09-05 | The exact failing pip invocation and compiler error for an sdist-only package under the hermetic interpreter |
| [`whl_installer.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/whl_installer/wheel_installer.py) | Repository-rule build tool source | tag 2.3.3, read 2026-09-05 | Ground truth for the exact `pip wheel`/`pip download` argv construction, including `extra_pip_args` splicing |
| [`docs/pypi/lock.md` @ main](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | Official doc page | main, read 2026-09-05 | The `[tool.uv]`/`no-build-isolation` pass-through via `lock()`'s `--project` auto-detection |
| [`docs/pypi/download.md` @ main](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/download.md) | Official doc page | main, read 2026-09-05 | Bazel-downloader/Simple-API mechanism, `download_only`'s sdist-exclusion behaviour, multi-platform caveats |
| [`extension.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/pypi/extension.bzl) | `pip` module-extension source | tag 2.3.3, read 2026-09-05 | `pip.default.index_url` default value and the `experimental_index_url` deprecation notice, both in-source |
| [rules_python `CHANGELOG.md` @ main](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | Dated release notes | main, read 2026-09-05 | Dates `py_console_script_binary` (0.26.0), `entry_point` macro removal (0.34.0), `py_zipapp_binary` (1.9.0), symbolic-macro compat (1.7.0) |
| [`py_console_script_binary.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_binary.bzl) | Macro source | tag 2.3.3, read 2026-09-05 | Exact attribute names/defaults for the macro |
| [`py_console_script_gen.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/private/py_console_script_gen.py) | Code-generator source | tag 2.3.3, read 2026-09-05 | Proves `entry_points.txt` parsing via `configparser`, the single-segment attribute limitation, the unhandled-extras TODO |
| [rules_python#1383](https://github.com/bazel-contrib/rules_python/issues/1383) | Closed issue (the macro's own origin) | read 2026-09-05 | Origin of the "extras not handled" TODO still present in the 2.3.3 source |
| [`py_zipapp_binary.bzl` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/python/zipapp/py_zipapp_binary.bzl) | Macro source | tag 2.3.3, read 2026-09-05 | `:::{versionadded} 1.9.0:::` in the macro's own docstring |
| [`zipper.py` @ 2.3.3](https://raw.githubusercontent.com/bazel-contrib/rules_python/2.3.3/tools/private/zipapp/zipper.py) | Zip-packing tool source | tag 2.3.3, read 2026-09-05 | The 1980 epoch and `ZIP_STORED`/`ZIP_DEFLATED` selection, compared line-for-line against the fleet's `build_pyz.py` |
| [`arcana/nox/scripts/build_pyz.py`](file:///home/mherwig/dev/arcana/nox/scripts/build_pyz.py) | Fleet source, hand-rolled zipapp builder | read 2026-09-05 | The comparison baseline for M-J-15; symlink-refusal and `SOURCE_DATE_EPOCH` handling not present in `rules_python`'s zipper |
| [`ocx-indexbot/pyproject.toml`](file:///home/mherwig/dev/ocx-indexbot/pyproject.toml) | Fleet source | read 2026-09-05 | The exact `[project.scripts]` entry (`indexbot = ocx_indexbot.cli.main:main`) used as the `py_console_script_binary` worked example |
| [rules_python#2060](https://github.com/bazel-contrib/rules_python/issues/2060) | Open issue, 2024-07-15 → present | read 2026-09-05 | Full PYTHONSAFEPATH generalization discussion, including the explicit `rickeylev` ask to extend to `system_python` |
| [rules_python#2122](https://github.com/bazel-contrib/rules_python/pull/2122) | Closed PR (unmerged), 2024-08 → 2025-10-22 | read 2026-09-05 | The concrete `-P`-based generalization attempt and its 14-month review history |
