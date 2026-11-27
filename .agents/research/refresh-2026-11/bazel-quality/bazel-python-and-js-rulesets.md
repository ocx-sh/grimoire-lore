---
title: Delta research, rules_python and the Aspect JS/TS rulesets for the bazel-quality python.md and typescript.md rows
pair: bazel-quality
date_researched: 2026-11-27
window_start: 2026-09-06
model: sonnet
sources_fetched: 21
---

# Delta: rules_python and Aspect JS/TS rulesets, 2026-09-06 to 2026-11-27

This is a delta update of the 2026-09-06 bazel-python and bazel-typescript consolidations. Only things that changed in the window are recorded; everything not mentioned is unchanged. All facts below were read from primary sources (GitHub release bodies and CHANGELOG via the authenticated `gh` CLI, Bazel Central Registry (BCR) metadata, upstream source at pinned tags). Nothing is from memory.

## Contents

- Summary
- Findings (newest versions, then per-claim verdicts for Python, then JS/TS)
- Normative guidance candidates
- AI-agent angle
- Contested / evolving
- Sources

## Summary

- rules_python is at 2.5.1 (2026-11-13) on BCR; 2.3.3 is no longer the newest. The header pin, every "at 2.3.3" sentence, and `rules_python_gazelle_plugin` 2.3.3 are version-bump-only except where a behaviour changed (below).
- Behaviour change that makes the python.md text wrong: rules_python 2.4.0 (2026-09-22) changed the default Python toolchain version from 3.11 to 3.14 in `python.defaults`, `python_register_toolchains` and `python_register_multi_toolchains`. BZL-PY-01 says "3.11 at tag 2.3.3, already 3.14 on main"; that is now "3.14 from 2.4.0".
- Behaviour change that makes BZL-PY-28 wrong at the newest pin: 2.4.0 added `gazelle_python_manifest(lockfiles = ...)` and deprecated `requirements`. The row's "`lockfiles =` does not exist yet" is true only at <= 2.3.4.
- BZL-PY-21 premise (native py_test with pytest-style files reports green) is unchanged, but 2.5.0 added a first-party `pytest_test` rule; the row should name it as an entrypoint.
- Bootstrap/sys.path model changed in 2.4.0: `sys.path` now adds the Python runtime in runfiles instead of the repository-cache directory.
- aspect_rules_py 2.0.0 did NOT go stable. Latest tag is 2.0.0-alpha.11 (2026-11-04). BCR's last alpha is alpha.10; alpha.11 renames the module to `rules_py`. Stable track is 1.13.0 (2026-10-21), not 1.12.1.
- rules_mypy: no release after v0.41.0 (2026-03-31). Unchanged.
- aspect_rules_js is at 3.6.1 (2026-11-12) with 4.0.0-alpha.0/.1 published as non-prerelease GitHub releases on 2026-11-07 and 2026-11-10; the 4.0.0 alphas rename the module to `rules_js` and remove launcher stdout/exit-code capture. aspect_rules_ts is unchanged at 3.10.1 (2026-08-21).
- aspect_gazelle_js is at 1.2.3 (2026-10-23). BZL-JS-34's pnpm 12 failure is fixed in 1.2.3 (multi-document lockfiles); the "majors 5, 6 and 9 only" dispatch is unchanged because pnpm 12 still writes `lockfileVersion: '9.0'`. No pnpm lockfileVersion 10 exists.
- TypeScript 7.0 (native compiler) is GA: npm `latest` is 7.0.2 (GitHub release 2026-08-20). rules_ts 3.10.1 already mirrors 7.0.2 and links the native platform packages. A new BZL-JS row is warranted only for the open rules_ts#1008 (downloads 20 platform packages, ~180 MB) and for the unreleased post-3.10.1 `main` commit that excludes declaration maps from compiler inputs.
- All three BZL-JS-06 issues are still OPEN as of 2026-11-27.
- BZL-JS-30: BCR `rules_playwright` still resolves to `github:mrmeku/rules_playwright`, but BCR's newest is 0.5.3, not the row's "v0.5.4" (0.5.4 is a GitHub tag not on BCR).

## Findings

### 1. Newest versions (verified 2026-11-27)

| Ruleset | Row's pin | Newest on BCR / GitHub | Date | Source |
|---|---|---|---|---|
| rules_python | 2.3.3 | 2.5.1 (BCR); 2.5.0-rc0..rc4 existed | 2026-11-13 | [BCR metadata](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_python/metadata.json), [CHANGELOG](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) |
| rules_python_gazelle_plugin | 2.3.3 | 2.5.1 (BCR) | 2026-11-13 | [BCR metadata](https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_python_gazelle_plugin/metadata.json) |
| rules_mypy | v0.41.0 | v0.41.0 (nothing newer) | 2026-03-31 | [releases](https://github.com/theoremlp/rules_mypy/releases) |
| aspect_rules_py stable | 1.12.1 | 1.13.0 | 2026-10-21 | [v1.13.0](https://github.com/aspect-build/rules_py/releases/tag/v1.13.0) |
| aspect_rules_py alpha | 2.0.0-alpha.6 | 2.0.0-alpha.11 on GitHub (BCR stops at alpha.10) | 2026-11-04 | [v2.0.0-alpha.11](https://github.com/aspect-build/rules_py/releases/tag/v2.0.0-alpha.11) |
| aspect_rules_js | 3.4.1 | 3.6.1 stable; 4.0.0-alpha.1 on GitHub only | 2026-11-12 / 2026-11-10 | [v3.6.1](https://github.com/aspect-build/rules_js/releases/tag/v3.6.1), [v4.0.0-alpha.1](https://github.com/aspect-build/rules_js/releases/tag/v4.0.0-alpha.1) |
| aspect_rules_ts | 3.10.1 | 3.10.1 | 2026-08-21 | [v3.10.1](https://github.com/aspect-build/rules_ts/releases/tag/v3.10.1) |
| aspect_gazelle_js | 1.2.1 | 1.2.3 | 2026-10-23 | [js-v1.2.3](https://github.com/aspect-build/aspect-gazelle/releases/tag/js-v1.2.3) |
| TypeScript | (>= 5.5 floor) | 7.0.2 latest; 7.1.0-beta tagged 2026-10-20 | 2026-08-20 | `npm view typescript dist-tags`, [releases](https://github.com/microsoft/TypeScript/releases) |
| pnpm | >= 9 | 12.24.0 (also 11.29.0 maintained) | 2026-11-26 | [pnpm releases](https://github.com/pnpm/pnpm/releases) |

The 2.0.0 of aspect_rules_py is not stable. GitHub marks the 2.0.0-alpha releases `prerelease=false`, so a reader of the release flag alone would misjudge them; the version string is the authority.

### 2. Python claims

| Quoted claim | Verdict | Detail |
|---|---|---|
| python.md header binds rules_python 2.3.3 and gazelle plugin 2.3.3 | version-bump-only | Newest is 2.5.1. Content bound at 2.3.3 stays true for 2.3.3, but see the changed rows below before re-binding. |
| header: rules_mypy v0.41.0 | unchanged | No release since 2026-03-31. |
| header: aspect_rules_py 1.12.1 / 2.0.0-alpha.6 | changed | Stable is 1.13.0 (2026-10-21, adds uv 0.13.4 default and two wheel-tag fixes, [release](https://github.com/aspect-build/rules_py/releases/tag/v1.13.0)). 2.0.0 not stable; newest alpha 2.0.0-alpha.11 renames the module from `aspect_rules_py` to `rules_py` (`refactor!: rename module to rules_py`, [release](https://github.com/aspect-build/rules_py/releases/tag/v2.0.0-alpha.11)), so `bazel_dep(name = "aspect_rules_py", ...)` does not match alpha.11 and BCR does not carry it yet (BCR's last alpha is alpha.10). alpha.7 removed Python 3.9 support (`refactor!: remove python 3.9 support`), alpha.8 added `pyi_deps`. |
| BZL-PY-01 / python.defaults default interpreter ("3.11 at tag 2.3.3, already 3.14 on main") | changed | Old text: default is 3.11 at 2.3.3, 3.14 on main. New fact: rules_python 2.4.0 "Updated the default Python toolchain version from `3.11` to `3.14` in `python.defaults`, `python_register_toolchains`, and `python_register_multi_toolchains`" ([CHANGELOG v2.4.0, 2026-09-22](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md)). The rule itself (pin both `python.defaults` and `python.toolchain` explicitly) is stronger, not weaker. Latest runtimes in 2.4.6: 3.10.22, 3.11.18, 3.12.16, 3.13.18, 3.14.10, 3.15.2. |
| Non-Negotiable 16 (python.defaults, python.toolchain, pip.parse) | unchanged in substance | Attribute names `python.defaults(python_version=)`, `python.toolchain(python_version=)`, `pip.parse(hub_name, python_version, requirements_lock)` appear unchanged in every release example. The "3.13 vs 3.14 references" now agree with the 2.4.0 default; wording that 3.13 is the default anywhere must go. 2.5.0 also adds `pip.parse` skipping versions with no host interpreter, and `pip.default(unified_hub_requirements_bzl=True)`, `pip.default.envsubst` (additive). |
| pip.parse binding, `pyproject_toml` exact-pin (BZL-PY-02) | unchanged | 2.5.0 adds "use of `pyproject.toml` as the source for the Python version" per the release listing; the changelog entry text in the file read does not restate it, so the exact-pin caveat is not shown to be lifted. Treat as could not determine whether a `>=` range now resolves; keep the rule. |
| BZL-PY-21 pytest-entrypoint trap | unchanged (premise), addition needed | Native `py_test` still runs unittest discovery. New in 2.5.0 (2026-10-31): `pytest_test`, "facilitates running of pytest tests... generating multiple test targets for more than one Python version and uses `pytest-randomly` and `pytest-shard`" ([CHANGELOG](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md)). It is a legitimate pytest entrypoint, and also introduces `pytest-randomly` ordering, which can surface order-dependence. Tracking issue state for Gazelle shim generation was not re-checked. |
| precompiling | unchanged with fixes | 2.4.0 fixed directory and `.pyc` inputs in `srcs` with `precompile` enabled (PR 4113) and a Windows precompiler crash; 2.5.0 fixed build tools (precompiler) running with the default Python instead of the target's version under Bazel 10 (issue 3566). No attribute rename. |
| bootstrap / sys.path model | changed | 2.4.0: "`sys.path` adds the Python runtime in runfiles instead of the underlying Bazel repository cache directory" (PR 4104). 2.5.0: stage-1 bootstrap now works with spaces in executable/runfiles paths; `py_library.pyi_deps` no longer lands in runtime runfiles (restore via `--//python/config_settings:pyi_deps_to_runfiles`). Any row that describes sys.path entries pointing into the repository cache is stale at >= 2.4.0. |
| BZL-PY-20 explicit loads on Bazel 9 | unchanged | No change in rules_python changelog affecting load requirements. (Bazel side not re-checked in this delta.) |
| BZL-PY-28 `lockfiles =` "does not exist yet" | changed | Old text: use `requirements =` against rules_python <= 2.3.3; `lockfiles =` unreleased. New fact: 2.4.0 "Deprecate the `requirements` argument of `gazelle_python_manifest` in favor of the format-agnostic `lockfiles` argument, which supports `uv.lock`." Rule must be re-scoped: `requirements =` at <= 2.3.4; `lockfiles =` at >= 2.4.0 (`requirements` still accepted but deprecated). Date 2026-09-22. |
| BZL-PY-07 uv.lock handling | version-bump-only (partly changed) | The `lock()` rule still runs `uv pip compile` per the row; 2.5.0 fixed `pip.parse(uv_lock=...)` to respect dependency-edge markers and handle git sources, and bumped default uv to 0.13.1 then 0.13.5 (2.4.5, security advisory GHSA-hq85-5cpj-mr62). Whether `lock()` now reads `uv.lock` was not determined; the 2.5.0 entry says `lock` can use scoped `override-dependencies` from `[tool.uv]`. Keep the "rules_python does not natively read your uv.lock for lock()" claim only after re-checking the rule's docs. |
| BZL-PY-09 pylock.toml (issue 2787) | unchanged | `gh issue view 2787` returns OPEN on 2026-11-27. |
| BZL-PY-27 gazelle plugin >= 2.3.0 for 3.13/3.14 | unchanged | 2.5.0 migrated the gazelle parser to official tree-sitter packages (adds PEP 758 unparenthesized except clauses), no stdlib-list rule change shown. |
| BZL-PY-31 rules_mypy aspect | unchanged | rules_mypy v0.41.0 remains newest; first-party type-check scope not re-checked. |
| BZL-PY-32 venv materialisation, aspect_rules_py IDE defaults | partly changed | alpha.8 "carry bin/activate and console scripts into py_venv_link trees"; alpha.11 adds Windows venv fixes. Row's statement of default differing by track is not contradicted, but the track versions (1.12.1 stable) are stale; stable is now 1.13.0. |
| BZL-PY-34 `pip.default(index_url)` | unchanged, extended | 2.5.0 adds `pip.default.envsubst` for environment variables in `index_url`. |
| flags.md / caching.md cite rules_python 2.3.3 | version-bump-only | Newest 2.5.1. 2.5.0 adds `--@rules_python//python/config_settings:py_pbs_distribution` (`install_only_stripped` reduces runtime size) and `pyi_deps_to_runfiles`; caching-relevant: wheels are removed after extraction when re-fetchable; pyc caches go under `$HOME/.cache` when `XDG_CACHE_HOME` is unset (issue 4198). |

### 3. JS/TS claims

| Quoted claim | Verdict | Detail |
|---|---|---|
| header: aspect_rules_js 3.4.1 (floor 3.0.0) | version-bump-only | Newest stable 3.6.1 (2026-11-12). Changes 3.5.0 to 3.6.1: new flag controlling `js_run_binary` `silent_on_success` default (PR 2992), `JS_BINARY__BUILD_FILE_PATH` no longer set (PR 3066, `fix(js_binary)`), pnpm 11 `runtime:` packages skipped in `npm_translate_lock` (PR 3061), `rules_nodejs` 6.7.7 with default Node v22.23.4 (3.5.2, 2026-10-22, certificate advisory), Bazel 10 testing added. No attribute rename. Floor 3.0.0 unchanged (the 3.0.0 release is yanked on BCR in metadata; this was already so). |
| header: rules_js 4.x | new | 4.0.0-alpha.0 (2026-11-07) renames module to `rules_js` and removes stdout/stderr/exit-code capture from the `js_binary` launcher; alpha.1 (2026-11-10) stops setting legacy env vars in `js_run_binary` by default. Not on BCR (BCR newest is 3.6.1). Do not bind. |
| header: aspect_rules_ts 3.10.1 (behaviour floor 2.0.0) | unchanged | No release since 2026-08-21. `main` has one unreleased fix: "exclude declaration maps from TypeScript compiler inputs (#1007)" dated 2026-11-20. |
| header: pnpm >= 9 | unchanged | pnpm 12.24.0 and 11.29.0 are current. Both keep `lockfileVersion: '9.0'`; the pnpm main-branch lockfile reads `lockfileVersion: '9.0'`, now as a multi-document file starting with `---`. There is no lockfileVersion 10. |
| header: TypeScript >= 5.5 | unchanged | Floor claim unaffected. TypeScript 6.0.3 (2026-04-16) and 7.0.2 (2026-08-20) are current; rules_ts 3.10.1 mirrors both (`versions.bzl` lists 6.0.2, 6.0.3, 7.0.1-rc and 7.0.2). |
| header: aspect_gazelle_js 1.2.1 | version-bump-only | Newest 1.2.3 (2026-10-23). 1.2.2: dependency bumps. 1.2.3: "support multi-document pnpm12 lockfiles (#473)", Go 1.27.3 for a CVE, tsconfig references ignore-directive fix, bazel-gazelle v0.54. |
| BZL-JS-34 "only majors 5, 6 and 9 resolve at aspect_gazelle_js 1.2.1", pnpm 12 bug open with two unmerged fixes as of 2026-09-05 | changed | Dispatch on majors 5, 6, 9 is unchanged at 1.2.3 (`parser.go` still branches only on `version.Major()` 5, 6, 9 and errors `unsupported version` otherwise). The pnpm 12 failure ("failed to find lockfile version in: \"---\"") is fixed: issue [aspect-gazelle#461](https://github.com/aspect-build/aspect-gazelle/issues/461) closed 2026-10-20 by PR 473, released in js-v1.2.3 (2026-10-23); the parser now skips a `---` document-start line. Competing PR 460 and 459 were not the merged route. The row's pin and "open bug" sentence must be replaced: pnpm 12 locks resolve from `aspect_gazelle_js` 1.2.3. |
| BZL-JS-30 rules_playwright BCR name | partly wrong | BCR `modules/rules_playwright/metadata.json` still lists `"repository": ["github:mrmeku/rules_playwright"]`, so the check holds. Versions on BCR: 0.2.1, 0.3.0, 0.4.0, 0.5.3. The row says "BCR-published (v0.5.4, pushed 2026-03-06)"; v0.5.4 is a GitHub tag only, and the repository's last commit is 2026-03-06. Fix to "BCR newest 0.5.3". |
| BZL-JS-06 three issues "all still open" | unchanged | 2026-11-27: bazelbuild/bazel#15470 OPEN, aspect-build/rules_js#362 OPEN, aspect-build/rules_js#1215 OPEN (each queried with `gh issue view`). |
| Non-Negotiable 17: transpiler on every ts_project, TS5033 EPERM, `_typecheck_test` | unchanged | No rules_ts release since 3.10.1, so the mandatory-transpiler rule (since 2.0.0), `_typecheck_test` generation, and defaults are unchanged. The TS5033/EPERM trap was not re-measured in this delta. |
| Attribute names `typescript.deps(version=...)` | note | rules_ts 3.10.1 `extensions.bzl` deprecates `ts_version`, `ts_version_from`, `ts_integrity` in favour of `version`, `version_from`, `integrity` (mixing both fails). This is in 3.10.1 (2026-08-21), before the window, so it is a baseline-date gap rather than a window change; verify typescript.md uses the new names. |
| flags.md / caching.md cite aspect_rules_js 3.4.1, aspect_rules_ts 3.10.1 | version-bump-only | rules_js 3.6.1; rules_ts unchanged. |

### 4. TypeScript 7 (native compiler) and rules_ts

- TypeScript 7.0.2 is `latest` on npm; 7.0.1-rc was the rc; 7.1.0-beta tagged 2026-10-20 ([microsoft/TypeScript releases](https://github.com/microsoft/TypeScript/releases)).
- rules_ts 3.10.1 handles the native compiler: `npm_repositories.bzl` has `NATIVE_TYPESCRIPT_VERSIONS` and `_link_native_packages` (links platform-specific `@typescript/typescript-<platform>` packages) ([source at v3.10.1](https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/ts/private/npm_repositories.bzl)). The transpiler and `_typecheck_test` wiring did not change as a result.
- Open defect [rules_ts#1008](https://github.com/aspect-build/rules_ts/issues/1008) (updated 2026-11-26): with TS 7.0.2 the `npm_typescript` repository downloads all 20 platform packages (about 9 MB each, 180 MB), because `_link_native_packages` downloads inside one repository rule. Matters for CI cache budgets (GitHub Actions 10 GB limit).
- [rules_ts#777](https://github.com/aspect-build/rules_ts/issues/777) "Demonstrate new tsgo" still open (updated 2026-09-28): no first-party tsgo example or dedicated attribute; no transpiler default changed.
- Decision: a new BZL-JS row is justified, narrow, and about cache cost, not typecheck semantics (see candidate 3).

## Normative guidance candidates

1. Rule: do not state that `python.defaults` falls back to 3.11; state "3.14 from rules_python 2.4.0, 3.11 before", and keep requiring explicit `python.defaults(python_version=...)` plus `python.toolchain(python_version=...)`. Rationale: the 2.4.0 default flip silently moved the interpreter for any repo that bumped past 2.3.4 without pinning. Verification: `grep -n -e 'python\.defaults(' -e 'python\.toolchain(' -- MODULE.bazel`; `curl -sL https://raw.githubusercontent.com/bazel-contrib/rules_python/<pinned-tag>/python/private/python.bzl | grep -n 'DEFAULT_PYTHON_VERSION\|3\.1[134]'` against the pinned tag.
2. Rule (BZL-PY-28 rewrite): `gazelle_python_manifest` uses `requirements =` at rules_python <= 2.3.4 and `lockfiles =` (accepts `uv.lock`) at >= 2.4.0; `requirements =` is deprecated at >= 2.4.0. Rationale: the "does not exist yet" claim is now false at the newest pin and would push agents to a deprecated name. Verification: `curl -sL https://raw.githubusercontent.com/bazel-contrib/rules_python/<pinned-tag>/gazelle/manifest/defs.bzl | grep -n 'lockfiles\|requirements'`.
3. Rule (new BZL-JS row, SHOULD): when selecting TypeScript 7.x through `typescript.deps(version = "7.x")`, weigh the open rules_ts#1008 cost (all 20 native platform packages fetched, about 180 MB) before enabling it in a size-limited CI cache, and confirm issue state first. Rationale: only observable cost of the TS 7 shift in rules_ts 3.10.1; transpiler and `_typecheck_test` behaviour are unchanged. Verification: `gh issue view 1008 -R aspect-build/rules_ts --json state -q .state` (`OPEN` means the cost stands; `CLOSED` means re-verify), and `bazel query @npm_typescript//...` count of platform packages after fetch.
4. Rule (BZL-JS-34 rewrite): a pnpm 12 multi-document lockfile needs `aspect_gazelle_js` >= 1.2.3; the dispatch is still majors 5, 6, 9 only. Rationale: the pnpm 12 bug closed 2026-10-20, released 2026-10-23. Verification: `head -3 pnpm-lock.yaml` (a leading `---` then `lockfileVersion: '9.0'` is valid only with plugin >= 1.2.3); `grep -n 'aspect_gazelle_js' -- MODULE.bazel`.
5. Rule (BZL-PY-21 addition): name `pytest_test` (rules_python >= 2.5.0) as an accepted pytest entrypoint, and warn that it brings `pytest-randomly` ordering and `pytest-shard`. Rationale: gives a first-party alternative to a hand wrapper, with order-dependence as a new failure mode. Verification: `grep -rn 'pytest_test' --include=BUILD.bazel .`; then `bazel test --test_output=all //<target>` shows a nonzero collected count.
6. Rule (header/version hygiene): never bind or recommend `aspect_rules_py` 2.0.0-alpha.11 or `aspect_rules_js` 4.0.0-alpha.x by module name `aspect_*`; both renamed their modules (`rules_py`, `rules_js`) and neither is on BCR for the renamed names at the date checked. Verification: `curl -sL https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/<name>/metadata.json | jq .versions`.
7. Rule (BZL-JS-30 data fix): replace "v0.5.4" with "BCR newest 0.5.3". Verification: same BCR metadata command as the row.
8. Rule (bootstrap row): at rules_python >= 2.4.0 do not describe `sys.path` as containing the repository-cache runtime directory. Verification: run a `py_binary` printing `sys.path` under the pinned version and read for a runfiles-relative runtime entry.

## AI-agent angle

- An agent trained before September 2026 writes "default Python is 3.11" for rules_python and "lockfiles= does not exist"; mechanical check: grep the pinned tag's `defs.bzl` and `python.bzl` as in candidates 1 and 2.
- An agent reads GitHub `prerelease=false` on `aspect_rules_py` 2.0.0-alpha.x and rules_js 4.0.0-alpha.x and calls them stable; mechanical check: the version string contains `alpha`, and BCR metadata `versions` does not list it.
- An agent writing `bazel_dep(name = "aspect_rules_py", version = "2.0.0-alpha.11")` hits a module-name mismatch because alpha.11 is named `rules_py`; check: `module(name=` line in the tag's `MODULE.bazel`.
- An agent treats the pnpm 12 lockfile as unsupported by Aspect Gazelle (stale, from the baseline) and avoids pnpm 12; check: plugin version >= 1.2.3.
- An agent assumes "TypeScript 7 is a drop-in" and ignores the 180 MB native-package download; check: rules_ts#1008 state.
- An agent counts a `pytest_test` target as the same silent-green trap as a bare `py_test`; check: collected-test count.

## Contested / evolving

- aspect_rules_py 2.0.0: still alpha after 11 pre-releases between 2026-08 and 2026-11; renamed module in alpha.11. Direction: stabilisation not announced in the release bodies read; "could not determine" the 2.0.0 date.
- aspect_rules_js 4.0.0: alpha since 2026-11-07, launcher behaviour removal is breaking; direction toward a `rules_js` module name; stable not yet.
- TypeScript 7.1.0-beta is out (2026-10-20); rules_ts 3.10.1 mirrors up to 7.0.2 only, so 7.1.x needs a newer rules_ts or a manual integrity.
- rules_python 2.5.x: pytest_test and uv.lock import are new and fast-moving (three rc builds in the 2.5.0 cycle, 2.5.1 two weeks later); treat their attribute surface as young.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md | rules_python changelog 2.3.3 to 2.5.1 (primary) | to 2026-11-13 | Default 3.14, lockfiles, pytest_test, sys.path |
| https://github.com/bazel-contrib/rules_python/releases | release list (primary) | 2026-11 | Version dates |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_python/metadata.json | BCR versions (primary) | 2026-11-27 | What resolves |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_python_gazelle_plugin/metadata.json | BCR plugin versions (primary) | 2026-11-27 | Plugin newest 2.5.1 |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/aspect_rules_py/metadata.json | BCR aspect_rules_py (primary) | 2026-11-27 | Alpha.10 last on BCR; 1.13.0 stable |
| https://github.com/aspect-build/rules_py/releases/tag/v1.13.0 | rules_py stable release (primary) | 2026-10-21 | uv 0.13.4 |
| https://github.com/aspect-build/rules_py/releases/tag/v2.0.0-alpha.11 | alpha.11 (primary) | 2026-11-04 | Module rename |
| https://github.com/aspect-build/rules_py/releases/tag/v2.0.0-alpha.8 | alpha.8 (primary) | 2026-10-10 | pyi_deps, venv link |
| https://github.com/theoremlp/rules_mypy/releases | rules_mypy releases (primary) | v0.41.0 newest | No change |
| https://github.com/aspect-build/rules_js/releases/tag/v3.6.1 | rules_js stable (primary) | 2026-11-12 | Bound version |
| https://github.com/aspect-build/rules_js/releases/tag/v4.0.0-alpha.0 | rules_js 4 alpha (primary) | 2026-11-07 | Breaking launcher change, rename |
| https://github.com/aspect-build/rules_js/releases/tag/v3.5.2 | rules_js 3.5.2 (primary) | 2026-10-22 | rules_nodejs 6.7.7 |
| https://github.com/aspect-build/rules_ts/releases/tag/v3.10.1 | rules_ts newest (primary) | 2026-08-21 | No newer release |
| https://raw.githubusercontent.com/aspect-build/rules_ts/v3.10.1/ts/private/npm_repositories.bzl | rules_ts native TS support (primary) | v3.10.1 | TS 7 wiring |
| https://github.com/aspect-build/rules_ts/issues/1008 | TS 7 downloads 20 native packages (primary) | 2026-11-26 | New cost row |
| https://github.com/aspect-build/rules_ts/issues/777 | tsgo demo request (primary) | 2026-09-28 | No tsgo attribute |
| https://github.com/aspect-build/aspect-gazelle/releases/tag/js-v1.2.3 | gazelle_js newest (primary) | 2026-10-23 | pnpm 12 fix |
| https://github.com/aspect-build/aspect-gazelle/issues/461 | pnpm 12 lockfile bug, closed 2026-10-20 (primary) | 2026-10 | BZL-JS-34 premise |
| https://raw.githubusercontent.com/aspect-build/aspect-gazelle/js-v1.2.3/language/js/pnpm/parser.go | lockfile parser (primary) | js-v1.2.3 | 5, 6, 9 dispatch retained |
| https://github.com/pnpm/pnpm/releases | pnpm releases (primary) | 2026-11-26 | v12.24.0; lockfileVersion 9.0 |
| https://github.com/microsoft/TypeScript/releases | TypeScript releases (primary) | 7.0.2, 7.1-beta | TS 7 GA state |
| https://raw.githubusercontent.com/bazelbuild/bazel-central-registry/main/modules/rules_playwright/metadata.json | BCR rules_playwright (primary) | 2026-11-27 | JS-30 data |

Not determined in this delta: whether Bazel 9 load behaviour (BZL-PY-20) changed; the open or closed state of the Gazelle pytest-shim request behind BZL-PY-21; the exact 2.0.0 stable date for aspect_rules_py; the TS5033/EPERM trap under TS 7.
