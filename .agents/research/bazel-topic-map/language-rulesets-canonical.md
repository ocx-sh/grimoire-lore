---
title: Language rulesets — the canonical curriculum
corpus: >
  Official docs, READMEs, changelogs, and release notes of the per-language
  Bazel rulesets: rules_rust (+ crate_universe), rules_python (+ Gazelle
  plugin), rules_js/rules_ts/rules_esbuild/rules_lint (Aspect), rules_cc +
  toolchains_llvm + hermetic_cc_toolchain, and rules_go + bazel-gazelle as the
  comparison gold standard. Plus the Bazel 9 release announcement where it
  bears directly on these rulesets (native-rule externalization, WORKSPACE
  removal).
agent: language-rulesets-canonical scout
model: sonnet
date_researched: 2026-09-05
sources_count: 27
scope: >
  Covers what each ruleset's own documentation says about itself: lockfile
  and dependency-resolution mechanics, toolchain hermeticity, test/coverage
  rules, IDE/LSP integration, Gazelle plugin maturity, and each ruleset's own
  listed pitfalls. Does NOT cover Bazel-core mechanics (Bzlmod internals,
  Starlark language, RBE protocol, CI target-determination) except where a
  ruleset's own docs depend on a specific Bazel-major behavior. Does NOT
  re-derive Cargo/pyproject/package.json topics owned by the sibling
  rust-cargo, python-packaging, and typescript-packaging lore sets — those are
  marked covered-elsewhere below.
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- rules_rust 0.74.0 (2026-08-28) still ships lockfile-correctness fixes for
  `crate_universe` in its latest release (cargo-lock v10→v11, a non-root-repo
  checksum bug, Windows GNU staticlib naming) — the crate-resolution pipeline
  is actively unstable, not a solved problem.
- `crates_repository` generates BUILD files into an external repo at fetch
  time; `crates_vendor` writes real, checked-in BUILD files "for workspaces
  expected to be consumed in other workspaces" — they are not interchangeable
  defaults, they serve different publication models.
- `crate_universe`'s splicing step has explicitly commented `O(N^2)` cost in
  the number of platform triples, which is why the shipped
  `SUPPORTED_PLATFORM_TRIPLES` list is a curated subset of seven triples, not
  every triple Rust supports.
- rules_rust's `rust_analyzer` integration is a first-class, actively
  maintained "one-shot installer" (`bazel run @rules_rust//tools/rust_analyzer:setup`)
  that configures VSCode/Neovim/Helix/generic editors with zero host Rust
  install required — this is materially more mature than the Python/TS LSP
  stories surveyed here.
- rules_rust's VSCode `▶ Debug` codelens on `#[test]` functions "does not
  work" for Bazel projects by the project's own admission; the documented
  workaround is `bazel run @rules_rust//tools/vscode:gen_launch_json` + F5.
- rules_python still only supports `requirements.txt` as its PyPI lock
  format as of the doc dated for 2.3.3 (2026-09-04); `pylock.toml` support is
  tracked as open (`gh-issue #2787`), and `uv pip compile` support is marked
  "experimental."
- rules_python's own `uv`-based `lock()` rule auto-detects the
  `pyproject.toml` project root by shortest-path heuristic, which it
  documents as wrong for monorepos with multiple independent sub-projects —
  the `project` attribute must be set explicitly in that case.
- A `pypi` bzlmod hub-name collision across modules was only detected (not
  fixed) as of `RULES_PYTHON_PYPI_HUB_RESERVED` (added 2.2.0) — the default
  behavior is still a warning, not an error.
- rules_python's precompiling has three named, unresolved caveats: mixing
  rules_python `PyInfo` with Bazel's builtin `PyInfo` silently drops `.pyc`
  files; pre-3.11 interpreters may never use the precompiled files at all due
  to `sys.path[0]` ordering; and a `py_binary`/`py_library` sharing the same
  sources with different exec properties causes an action conflict.
- rules_ts 2.0 made `ts_project(transpiler=...)` mandatory with no default —
  a `ts_project` with type errors still succeeds under plain `bazel build`
  unless a separate `[name]_typecheck_test` target is run under `bazel test`,
  by design, to keep `tsc` off the critical path.
- TypeScript's `isolatedDeclarations` (TS 5.5) plus rules_ts's
  `isolated_typecheck` collapses a monorepo's sequential type-check chain
  into a two-action-deep parallel graph; Canva reported −73–81% type-check
  actions per PR after migrating ~90% of 40,000 packages.
- rules_js's foundational design choice — always running Node tools with the
  working directory inside `bazel-out`, not the source tree — fixes
  TypeScript `rootDirs` breakage for good but forces every custom rule or
  `genrule` author to re-path inputs/outputs and pass `BAZEL_BINDIR`; the
  upstream Bazel issue that would remove this tax (`bazelbuild/bazel#15470`)
  is still open.
- rules_js's own known-issues list still carries "ESM imports escape the
  runfiles tree and the sandbox" (`#362`), unresolved.
- Caching `NpmPackageExtract` actions (one per third-party npm package) can
  be net-negative in a cache-only (no RBE) setup because tree artifacts are
  fetched file-by-file; rules_js's own troubleshooting doc recommends
  `--modify_execution_info=NpmPackageExtract=+no-remote-cache` as an
  experiment, not a universal default.
- rules_cc's own README states plainly it "does not yet offer a hermetic
  toolchain distribution" — every hermetic C++ toolchain in this survey
  (toolchains_llvm, hermetic_cc_toolchain/zig, gcc-toolchain) is a
  third-party project filling a gap the core ruleset leaves open.
- `zig cc` (via `hermetic_cc_toolchain`) enables UndefinedBehaviorSanitizer
  by default, unlike mainstream clang/gcc — a program that compiles and runs
  fine elsewhere can crash with `SIGILL: illegal instruction` purely from
  switching to this toolchain.
- `toolchains_llvm`'s C++ named-modules support is brand new and narrow: it
  is "currently tested" only on Bazel 9.2 + LLVM 22 on Linux/macOS; Bazel 7
  and 8 "do not expose the required `cc_library` module API" at all.
- Bazel 9.0 (per Bazel's own January 2026 release post) removed WORKSPACE
  support entirely and defaulted `--incompatible_autoload_externally` to
  empty, meaning every BUILD file needs an explicit `load()` for `cc_binary`,
  `cc_library`, and the other rules that used to be native-builtin.
- Go's `nogo` runs configured static-analysis passes as a build-blocking
  action after every compile by default — none of Rust (clippy is an
  opt-in aspect), Python, or TypeScript in this survey ship an equivalent
  first-class, always-on static-analysis gate; it is always bolted on
  (aspect, separate lint target, or third-party CLI).
- Rust's Gazelle plugin (`gazelle_rust`) is third-party and not part of
  `bazel-gazelle`'s own README list of maintained plugins in the same way
  Python's and JS/TS's are — a materially different maturity level per
  language.

## Survey

### 1. rules_rust — README, latest release, and versioning

[README](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/README.md) points
all documentation to the mdBook site and links a `bazel-starters/rust`
template. The [latest GitHub release](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0)
is `0.74.0`, published 2026-08-28, and pins its own extension modules
(`rules_rust_bindgen`, `rules_rust_mdbook`, `rules_rust_prost`,
`rules_rust_pyo3`, `rules_rust_wasm_bindgen`) to the same version. That
release's changelog is entirely bug fixes to `crate_universe` and Windows/CI
edge cases (cargo-lock v10→v11 upgrade, RISC-V Linux host toolchain support,
lockfile-checksum fix for non-root repos, Windows GNU staticlib naming),
which is evidence the crate-resolution machinery is still being actively
hardened, not stable legacy code.

### 2. rules_rust — rust-analyzer (IDE/LSP)

[`docs/src/rust_analyzer.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md)
documents `bazel run @rules_rust//tools/rust_analyzer:setup -- <editor>` for
VSCode, Neovim, Helix, and a generic `print` mode for coc.nvim/vim-lsp/ALE.
Setup is idempotent and per-user toggles (`--clippy`, `--per-package-workspaces`)
live in a gitignored `user_config.json` so two developers on one workspace
can diverge without touching committed settings. `--per-package-workspaces`
trades whole-repo indexing time for a documented loss: "dependents of the
package you're working on aren't indexed, so 'find usages' can miss callers
in other packages." The doc states outright that the VSCode `▶ Debug`
codelens "does not work for Bazel projects"; the supported path is
`bazel run @rules_rust//tools/vscode:gen_launch_json` plus CodeLLDB and F5.

### 3. rules_rust — clippy and rustfmt aspects

[`docs/src/clippy.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md)
and [`docs/src/rustfmt.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md)
both gate on `.bazelrc` aspect registration (`--aspects=@rules_rust//rust:defs.bzl%rust_clippy_aspect` /
`%rustfmt_aspect` plus `--output_groups=+clippy_checks` / `+rustfmt_checks`),
never a rule attribute developers set per-target. Targets opt out via a
`no-clippy` tag. `rustfmt` explicitly recommends the aspect be CI-only ("so
formatting issues do not impact users' ability to rapidly iterate"), and a
custom `.clippy.toml`/`clippy.toml` requires Rust ≥1.34.0.

### 4. rules_rust — coverage

[`docs/src/coverage.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/coverage.md)
uses LLVM source-based coverage via `-Cinstrument-coverage`, gated by Bazel's
own `--instrumentation_filter` (recommends `^//,-^//third_party` for
projects with vendored deps). It documents a real inconsistency: a
`rust_test` using the `crate` attribute compiles the whole crate — including
`#[cfg(test)]` code — into the test binary as one unit, so that code gets
instrumented "without needing `--instrument_test_targets`," breaking the
usual Bazel convention that test code is excluded unless that flag is set.

### 5. rules_rust — Cargo interop (build scripts, lint extraction)

[`docs/src/cargo.md`](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/cargo.md)
lists `cargo_build_script` (compiles and runs `build.rs`, feeding `cargo:*`
directives to consumers), `cargo_env` (reproduces Cargo's `CARGO_*`
environment), and `extract_cargo_lints` (reads a `Cargo.toml`'s `[lints]`
table into a `rust_lint_config` target so Cargo-defined lints apply under
Bazel too).

### 6. rules_rust — crate_universe (`crates_repository` vs `crates_vendor`, annotations, lockfiles)

The [`crate.annotation()` docstring](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crate.bzl)
exposes the full per-crate override surface: `additive_build_file[_content]`,
`build_script_use_cc_toolchain` (an int flag to force-enable/disable pulling
in the resolved `cc_toolchain` for a build script, defaulting to a build
setting), `override_targets` (swap in an alternate `proc-macro`/`custom-build`/`lib`/`bin`
target per crate), `disable_pipelining`, and `label_injections` (a mapping
"populated by `sanitize_label_injections`" — an internal, not user-facing,
field). The [`crates_repository` implementation](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_repository.bzl)
shows the hermeticity mechanics directly: it `repository_ctx.watch()`s both
lockfiles (Cargo's own and the Bazel-specific one) and every manifest, then
runs `determine_repin()` before deciding whether to re-splice. Its own code
comment states the splicing step "has `O(N^2)` complexity for each platform
triple added," which is why `SUPPORTED_PLATFORM_TRIPLES` ships as a
seven-entry reduced set rather than every Rust target triple. The
[`crates_vendor` docstring](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_vendor.bzl)
frames it explicitly as the tool for "workspaces expected to be consumed in
other workspaces" — it writes real, checked-in `BUILD` files via
`mode = "remote"` or `"local"`, unlike `crates_repository`'s fetch-time
external-repo generation.

### 7. rules_python — README and design principles

The [README](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/README.md)
states design intent directly: from 2.0 onward, `py_binary`/`py_test`
"scale to large monorepos" by symlinking a real venv per target rather than
extracting wheels repeatedly, and the project explicitly disclaims any
obligation to keep Google's internal (`google3`) backward compatibility. It
also states rules_python is "not caching pip downloads" as a separate
mechanism — since 2.0 it relies on Bazel's own downloader and repository
cache.

### 8. rules_python — CHANGELOG (recent correctness fixes)

The [CHANGELOG](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md)
documents, dated: **2.3.3** (2026-09-04) fixed a Gazelle regression from
1.8.0 breaking namespace-package module-map generation, and a `zipapp`
`PyRuntimeInfo(files=None)` crash. **2.3.0** (2026-08-07) required
rules_python ≥1.5.0 for its own Gazelle Python extension because it now
selects stdlib lists via `is_python_3.14`, which older versions never
defined; it also fixed a fixed-point loop for resolving self-referencing
`pkg[extra]` dependencies that previously "could stop before every extra was
resolved... for the common case of a package with no self-referencing
extras it never converged at all, running all 10000 rounds"; and it fixed
`--hash=<algo>:<digest>` and Simple-API `#<algo>=<digest>` parsing that
previously silently dropped every hash algorithm except sha256.

### 9. rules_python — Bzlmod support and toolchain configuration

[`BZLMOD_SUPPORT.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/BZLMOD_SUPPORT.md)
and [`docs/toolchains.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/toolchains.md)
(945 lines) cover root-module vs library-module registration patterns,
pinning a `python_version` per-target, custom/local toolchains, a runtime
environment toolchain, and toolchain-selection flags
(`py_linux_libc`, `py_freethreaded` for 3.13+ freethreaded builds). It
distinguishes `@rules_python//python/bin:python` (raw interpreter, no
hermeticity guarantees, doesn't set `PYTHONSAFEPATH`) from
`@rules_python//python/bin:repl` (identical environment to `py_binary`,
handles `PYTHONSAFEPATH` automatically) — a documented trap for anyone
assuming the two are interchangeable debugging entry points.

### 10. rules_python — PyPI lock formats and uv support

[`docs/pypi/lock.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md)
states plainly: "Currently `rules_python` only supports `requirements.txt`
format," with `pylock.toml` tracked as `gh-issue #2787`. The `uv pip compile`
path (`load("@rules_python//python/uv:lock.bzl", "lock")`) is labeled
"experimental," "well tested with the public PyPI index" but with "rough
edges with private mirrors." Its `pyproject.toml` project-root
auto-detection uses a documented "shortest directory path" heuristic that
the doc itself warns is wrong for "monorepos with multiple independent
sub-projects" — `project=` must be set explicitly in that case, and unlike
`compile_pip_requirements`, `lock()` creates no drift-check test target
automatically.

### 11. rules_python — precompiling

[`docs/precompiling.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md)
lists concrete, load-bearing caveats: precompiling "requires Bazel 7+ with
the Pystar rule implementation enabled"; "mixing rules_python `PyInfo` with
Bazel builtin `PyInfo` will result in pyc files being dropped"; pre-3.11
interpreters may never load the precompiled files because Python "adds the
directory of the binary's main `.py` file" ahead of the runfiles directory
on `sys.path`; the `.pyc` filename omits the optimization level, so `-O`
cannot be combined with precompiling; and a `py_binary`/`py_library` sharing
identical sources but different exec properties triggers an action
conflict. The default precompiler is described as "a persistent,
multiplexed, sandbox-aware, cancellation-enabled, json-protocol worker,"
with a documented escape hatch (`--worker_extra_flag=PyCompile=--worker_impl=serial`)
if that concurrent implementation misbehaves.

### 12. rules_python — environment variables (venv, pycache, hub naming)

[`docs/environment-variables.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md)
documents `RULES_PYTHON_PYCACHE_DIR`'s fallback chain
(`XDG_CACHE_HOME` → `TMP`/`TEMP` → platform temp dir → `/dev/null`, which
"effectively disable[s] pyc caching"), and `RULES_PYTHON_PYPI_HUB_RESERVED`
(added 2.2.0): when unset (default `0`), a `pypi`-named hub collision across
bzlmod modules only prints a warning "advising to rename the hub" — the
collision itself is not resolved unless the variable is set to `1`. It also
documents that `RULES_PYTHON_ENABLE_PYSTAR` and `RULES_PYTHON_ENABLE_PIPSTAR`
were removed in 2.1.0 — the Starlark rule/PyPI implementations they gated
are now unconditional.

### 13. rules_python — multi-platform PyPI dependencies

[`docs/howto/multi-platform-pypi-deps.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md)
walks through `pip.default` + `config_setting` to bind a requirements file
to a "platform" (its term, unrelated to Bazel's own `platform()`) combining
OS/CPU/threading/CUDA/libc dimensions, recommending an
`{os}_{cpu}{threading}` naming convention. It explicitly does not solve
naming for you past that point — "additional dimensions should be appended
and separated with an underscore" — leaving combinatorial growth as the
adopter's problem once more than a couple of axes are in play.

### 14. rules_python — Gazelle plugin

[`gazelle/docs/directives.md`](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/directives.md)
(896 lines) documents `# gazelle:python_extension`, `# gazelle:python_root`
(for monorepos where Python doesn't own the workspace root), and
`# gazelle:python_manifest_file_name` (default `gazelle_python.yaml`). This
plugin is first-party, living inside the `rules_python` repository itself —
a materially different maturity/ownership story than Rust's third-party
`gazelle_rust`.

### 15. rules_js — README, sandbox model, and known issues

The [README](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md)
states the ruleset's founding design tension directly: after two failed
approaches (monkey-patching Node's `require`, then a runtime `npm link`
linker), rules_js settled on always running JS tools with the working
directory inside Bazel's output tree (`bazel-out`), mimicking `pnpm`'s
`node_modules` layout there. The stated benefit is that TypeScript's
`rootDirs` resolution problem (`microsoft/TypeScript#37378`) "just goes
away." The stated cost: "Bazel rules/macro authors... must re-path inputs
and outputs to account for the working directory," forcing every node
action to carry `BAZEL_BINDIR` in its environment — a tax the README itself
notes `bazelbuild/bazel#15470` would relieve, unresolved. Its own "Known
issues" section lists, verbatim: "ESM imports escape the runfiles tree and
the sandbox due to https://github.com/aspect-build/rules_js/issues/362."
rules_js also collects usage telemetry via `tools_telemetry`, reported to
Aspect Build Inc.

### 16. rules_js — troubleshooting and FAQ

[`docs/troubleshooting.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md)
(317 lines) and [`docs/faq.md`](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md)
(136 lines) give exact remedies for "Module not found": add the missing
`data` dependency when `require` appears in first-party code; use pnpm's
`packageExtensions` when a third-party package under-declares a real
dependency (a known Yarn PnP/pnpm-shared bug, tracked upstream via
`yarnpkg/berry`'s extensions database, not yet consumed by rules_js per
`aspect-build/rules_js#1215`); use `public_hoist_packages` on
`npm_translate_lock` for plugin-discovery packages like eslint/prettier.
Coverage has four documented, specific caveats: it counts against the
test's own `timeout`/`size` budget (V8→lcov conversion is proportional to
instrumented-file count); code run from the test program's own
`process.on('exit', ...)` listener is invisible to coverage because the
reporter's `--require` preload necessarily registers first; coverage
requires a runfiles tree (silently empty on Windows without
`--enable_runfiles`); and coverage of first-party code repackaged via
`npm_package` (as opposed to linked as a `js_library`) is unsupported by
design (`#2933`). For remote caching, it flags that `NpmPackageExtract`
actions (tree artifacts, fetched file-by-file by most remote caches) "may be
slower than simply re-extracting the tarballs locally" in a cache-only,
no-RBE setup (`#2715`), offering `--modify_execution_info=NpmPackageExtract=+no-remote-cache`
as an experiment rather than prescribing it. The FAQ documents a hard Bazel
output-tree constraint on repo layout: a shared top-level `dist/` folder
across multiple `packages/*` requires either one large root `BUILD` file or
restructuring each package's own `dist` to live beneath its own Bazel
package.

### 17. rules_ts — README and the mandatory transpiler split

The [README](https://raw.githubusercontent.com/aspect-build/rules_ts/main/README.md)
frames `ts_project` as invoking a configurable transpiler for `.js`/`.js.map`
output plus `tsc` separately for type-checking and `.d.ts` generation.
[`docs/transpiler.md`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md)
states that "starting in rules_ts 2.0, we require you to select one of
these, as there is no good default for all users" between SWC
(recommended, fastest, but with "subtle compatibility issues due to
producing different JavaScript output than `tsc`," tracked at
`aspect-build/rules_ts#398`) and plain `tsc` (simplest, slowest; a
`--@aspect_rules_ts//ts:default_to_tsc_transpiler` flag restores the old 1.x
default behavior for teams not ready to choose).

### 18. rules_ts — troubleshooting (type errors off the critical path)

[`docs/troubleshooting.md`](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md)
(170 lines) states the load-bearing fact for the whole design: when
`transpiler`, `declaration_transpiler`, `no_emit`, or `isolated_typecheck`
is set, `bazel build //path:my_ts_project` "succeeds without ever running"
type-checking, because only JavaScript is in the default output group. The
recommended gate is `bazel test` against the auto-generated
`[name]_typecheck_test` target. A forcing flag exists
(`common --@aspect_rules_ts//ts:validation_typecheck`, a Bazel
[validation action](https://bazel.build/extending/rules#validation_actions))
but the doc calls it explicitly "discouraged and off by default" because it
"reintroduc[es] exactly the cost that a custom `transpiler` and
`isolated_typecheck` exist to avoid." It also documents concrete failure
signatures: `TS6059` (file not under `rootDir`) with TS ≥4.2's
`--explainFiles` giving provenance; `TS5033: EPERM` from two targets writing
the same output path (usually a `.ts` vs `.d.ts` resolution mixup, tracked
at `microsoft/TypeScript#22208`); and undeclared `@types/*` dependencies
producing `TS2786`/`TS7016` under rules_ts's strict-dependency model even
when the same code type-checks fine outside Bazel with hoisted
`node_modules`.

### 19. rules_ts / Aspect docs — isolated declarations

[The Aspect docs page on Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md)
explains that TypeScript 5.5's `isolatedDeclarations` option (proposed by
Martin Probst of Google in
[TypeScript#47947](https://github.com/microsoft/TypeScript/issues/47947))
lets `.d.ts` emission become "a single-file AST transform" with no type
checker required, because every exported symbol needs an explicit type
annotation. Combined with rules_ts's `isolated_typecheck = True`, this
collapses a sequential `type-check(app) → type-check(counter) →
type-check(textutils)` critical path into two parallel stages. Benchmarked
on a ~20-file package: `tsc` traditional 860ms, `tsc` with
`isolatedDeclarations` 340ms, the [oxc](https://oxc.rs/) transform ~5ms
(~168× faster than `tsc`). Canva's [BazelCon 2025 talk](https://www.youtube.com/watch?v=26CoMExb6FE)
reported, after migrating ~90% of a 105,000-file, ~40,000-package
TypeScript monorepo: −73–81% type-check actions per PR, P95 wall time down
53–60% (over 10 minutes faster), P50 under a minute.

### 20. rules_lint — multi-language lint/format under Bazel

The [README](https://raw.githubusercontent.com/aspect-build/rules_lint/main/README.md)
frames itself around a "Water Leak Principle" (lint only changed lines by
default, don't require fixing pre-existing issues to start) and states
lint/format findings run as ordinary Bazel actions supporting RBE and remote
caching, without requiring any change to existing `BUILD` files or wrapper
macros. Its supported-tools table (partially captured) spans C/C++
(clang-format + clang-tidy/cppcheck), Python (ruff formatter; bandit,
flake8, pydoclint, pylint, ruff, `ty` as linters), Go (gofmt/gofumpt, no
linter listed in this table), and many more — a genuinely broad,
maintained-as-of-2026 cross-language matrix, current release `v2.9.0`
(2026-09-03).

### 21. rules_esbuild — hermetic bundler toolchain

The [README](https://raw.githubusercontent.com/aspect-build/rules_esbuild/main/README.md)
states the toolchain is fetched via Bazel's own downloader (native binaries
per esbuild's own release layout) and "never run[s] `npm install`," making
it self-contained without an entry in `package.json`. Custom toolchains
(e.g. an esbuild built from source via a `go_binary`) are supported through
the standard `toolchain()`/`register_toolchains` mechanism.

### 22. rules_cc — the hermeticity gap

The [README](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md)
states outright: "rules_cc itself does not yet offer a hermetic toolchain
distribution," pointing to four third-party projects instead (GCC-only
`f0rmiga/gcc-toolchain`, `hermeticbuild/hermetic-llvm`, `toolchains_llvm`,
`hermetic_cc_toolchain`). It also documents the escape hatch for the
autodetected host toolchain: `--repo_env=BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN=1`
disables it entirely — the flag a repo would need to actually go hermetic
rather than merely add a hermetic toolchain alongside an active
autodetected one.

### 23. toolchains_llvm — sanitizers, cross-compilation, named modules, layering_check

The [README](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md)
(671 lines, current release `v1.9.0`, 2026-08-29) documents: sandbox
overhead ("100ms per action, as of mid 2018") mitigated by
`--experimental_sandbox_base=/dev/shm`, at the cost of hermeticity if
absolute-path substitution is used instead; sanitizers as Bazel features
(`--features=asan|ubsan|tsan|msan`) that Bazel automatically resets via
`--host_features` in the exec configuration so build tools stay
uninstrumented, with MSan additionally requiring a separately-built
instrumented libc++ (no official prebuilt exists); cross-compilation
requiring the user to "bring your own sysroot," tested for four
platform pairs including `{darwin,x86_64}→{linux,aarch64}`; Yocto-style
sysroots needing explicit `multiarch` and `cxx_include_layout="yocto"`
overrides versus the Debian-layout default; and — new — C++ named-module
support ("currently tested" only at Bazel 9.2 + LLVM 22 on Linux/macOS,
requiring `bin/clang-scan-deps` in the LLVM distribution; "Bazel 7 and 8 do
not expose the required `cc_library` module API," and without the
`cpp_modules` feature the toolchain "continues to disable C++ named modules
to preserve the existing Clang module-map behavior used by
`layering_check`" — a direct, documented interaction between the newest
capability and the older strict-deps feature).

### 24. hermetic_cc_toolchain (zig cc) — known issues and incompatibilities

The [README](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md)
(603 lines, current release `v4.3.0`, 2026-07-27) states `zig cc` "differs
from 'mainstream' compilers by enabling UBSAN by default," so a program that
compiles under regular clang/gcc "may compile successfully and crash with
`SIGILL: illegal instruction`" purely from the toolchain switch. Its own
"Known Issues" section (labeled as things the maintainers "are unlikely to
implement... any time soon") lists: the Zig cache lives outside Bazel's
output base (`$HOME/.cache/zig` on Unix), so `bazel clean --expunge` never
clears it; OSX sysroot support "is currently not implemented" and
darwin/arm64 cgo programs specifically need it; and Bazel 6 or earlier needs
`--incompatible_enable_cc_toolchain_resolution` added manually. Compatibility
is stated as tested against `rules_go`, `rules_rust`, and `rules_foreign_cc`
specifically — no claim is made for other rulesets.

### 25. rules_go + Gazelle — the comparison baseline

The [rules_go README](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/README.rst)
(459 lines) lists first-class support for BUILD-file generation via
Gazelle, build-time static analysis via `nogo`, and requires "a Go SDK ≥
1.20" with rules_go itself requiring "Bazel ≥ 6.5.0" since v0.51.0 — an
explicit, stated floor rather than an inferred one. Its FAQ states plainly
users cannot "use the go command directly" for anything Bazel already
covers, and documents the historical `go_default_library` naming quirk from
before `importpath` existed. [`nogo.rst`](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/go/nogo.rst)
(438 lines) describes `nogo` as running "in an action after the Go compiler"
and rejecting sources with disallowed patterns from configured analyzers —
i.e., static analysis is wired into the ordinary compile action, not an
opt-in aspect layered on afterward, which is the structural difference from
every other language surveyed here. The [bazel-gazelle README](https://raw.githubusercontent.com/bazel-contrib/bazel-gazelle/master/README.md)
lists per-language plugin maturity explicitly: Python's is `rules_python`'s
own; JS/TS is Aspect's `aspect-gazelle`; Rust is the third-party,
separately-maintained `Calsign/gazelle_rust`; C/C++ is the third-party
`EngFlow/gazelle_cc`. Current releases: `rules_go v0.63.0` (2026-08-16),
`bazel-gazelle v0.54.0` (2026-09-03).

### 26. Bazel 9.0 — native rule externalization and WORKSPACE removal

[Bazel's own January 2026 release post](https://blog.bazel.build/2026/01/20/bazel-9.html)
states Bazel 9 completed "Starlarkification" by moving C++ rules out of core
into `rules_cc` (Python and Java rules were externalized earlier, in Bazel
8.0). `--incompatible_autoload_externally` (introduced in 8.0 as a
migration aid) now defaults to empty in 9.0, meaning every ruleset "has to
be explicitly loaded from external modules," with the flag itself scheduled
for full removal in Bazel 10.0. WORKSPACE support "was completely removed in
Bazel 9.0" — Bzlmod is the only dependency system left, confirming (and
dating precisely) the frame's flagged-for-verification claim.

## Candidate topics

| Topic (a question) | Why it matters | Source | Covered? | Priority |
|---|---|---|---|---|
| What breaks when a BUILD file uses native `cc_binary`/`cc_library` un-loaded under Bazel 9's default `--incompatible_autoload_externally`? | Every C++ BUILD file in the fleet's eventual Bazel adoption needs an explicit `rules_cc` load or it silently breaks moving 8→9. | [Bazel 9 post](https://blog.bazel.build/2026/01/20/bazel-9.html) | no | P0 — direct blocker for the stated Bazel 8→9/rolling CI matrix |
| Is WORKSPACE actually gone in Bazel 9.0, and does that invalidate any ruleset's still-published WORKSPACE setup instructions? | rules_go/gazelle READMEs still show WORKSPACE snippets; following them on 9.x fails outright. | [Bazel 9 post](https://blog.bazel.build/2026/01/20/bazel-9.html); [gazelle README](https://raw.githubusercontent.com/bazel-contrib/bazel-gazelle/master/README.md) | no | P0 |
| Does rules_cc ship a hermetic C++ toolchain, or is host autodetection (`BAZEL_DO_NOT_DETECT_CPP_TOOLCHAIN`) still silently active by default? | Matches rules_ocx's own `.bazelrc.user` finding almost exactly — this is a worked example already in the fleet. | [rules_cc README](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md) | partial (rules_ocx is one instance; no portable rule exists) | P0 |
| Why does zig cc (hermetic_cc_toolchain) crash programs with `SIGILL` that build clean elsewhere, and how is it diagnosed? | UBSAN-on-by-default is invisible until a crash; direct root-cause finding, not symptom patching. | [hermetic_cc_toolchain README](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md) | no | P1 |
| Does `layering_check` still work once a toolchain enables the newer C++ named-modules feature, and what does disabling it (as rules_ocx does) forgo? | Direct tension documented in the same toolchain the fleet already uses. | [toolchains_llvm README](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) | partial | P1 |
| What Bazel major + LLVM version does the C++ named-modules pipeline require, and what silently falls back without it? | Version-specific gate (Bazel 9.2 + LLVM 22 minimum); a P3-adjacent capability that will bite whoever tries it on 8.7.0. | toolchains_llvm README | no | P2 |
| Which sysroot/multiarch/cxx_include_layout combination does a non-Debian (Yocto) cross-compile target need under toolchains_llvm? | Concrete, exact attribute names for a real but narrow cross-compilation case. | toolchains_llvm README | no | P3 |
| Why can `--experimental_sandbox_base=/dev/shm` and toolchain sandboxing trade off hermeticity for speed, and where's the line? | Named, quantified (100ms/action) performance-vs-correctness trade in the C++ toolchain story. | toolchains_llvm README | no | P2 |
| Which sanitizer feature resets to `--host_features` in exec config, and why does MSan specifically need an out-of-band instrumented libc++? | Exact flags (`--features=asan/ubsan/tsan/msan`) plus a documented build-your-own-libc++ step with no official prebuilt. | toolchains_llvm README | no | P2 |
| Does `crates_repository` or `crates_vendor` fit a Rust crate meant to be published/consumed downstream, and what's the concrete difference in what gets checked in? | The two rules solve different publication models; picking wrong means unreviewable generated BUILD files or an un-vendorable repo. | [crates_vendor.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_vendor.bzl) | no | P1 |
| How does a `crate.annotation()` patch a third-party crate's `build.rs` behavior without forking it? | Exact attribute names (`build_script_use_cc_toolchain`, `override_targets`, `additive_build_file_content`) for the single most common crate_universe pain point. | [crate.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crate.bzl) | no | P0 — cargo_build_script/proc-macro friction is named in the frame explicitly |
| What causes Cargo.lock and the Bazel-specific lockfile to drift, and how does `crates_repository` detect and force a repin? | `determine_repin()`/`repository_ctx.watch()` mechanics are the actual hermeticity/lockfile-staleness story, not a guess. | [crates_repository.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_repository.bzl) | no | P0 |
| Why does adding platform triples to a `crates_repository`/`crates_vendor` config slow builds superlinearly, and how much? | Explicitly commented `O(N^2)` cost in the ruleset's own splicing code — a concrete, measurable performance topic per the frame's bar. | crates_repository.bzl | no | P1 |
| Does `rust_test(crate=...)` coverage silently include `#[cfg(test)]` code even without `--instrument_test_targets`? | A named, documented inconsistency with the Bazel-wide coverage convention — exactly the "boring but bites" category. | [rules_rust coverage.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/coverage.md) | no | P2 |
| Which flags turn clippy/rustfmt into build-blocking vs CI-only gates, and what does the `no-clippy` tag suppress? | Exact `.bazelrc` aspect+output-group incantations, directly reusable as a rule verification. | [clippy.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md), [rustfmt.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md) | no | P1 |
| Does rust-analyzer under Bazel need a host Rust install, and what exactly breaks (VSCode debug codelens) that a workaround must cover? | rules_rust's own doc names the exact gap and the exact fix; directly reusable IDE-setup content. | [rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md) | no | P1 |
| What "find usages" guarantee does `--per-package-workspaces` rust-analyzer mode sacrifice for indexing speed? | Named trade-off for large-monorepo IDE performance; a real correctness-vs-speed decision an adopting team must make consciously. | rust_analyzer.md | no | P2 |
| Which PyPI lock format does rules_python actually support today (2.3.3), and what's tracked but not shipped? | Directly refutes any assumption that `pylock.toml` or full `uv.lock` consumption already works — frame names uv support as a hypothesis to verify. | [rules_python pypi/lock.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | no | P0 |
| What does the `uv`-based `lock()` rule's project-root auto-detection get wrong in a monorepo, and when must `project=` be set explicitly? | Concrete, named failure mode for exactly the fleet's own polyglot-monorepo shape. | rules_python pypi/lock.md | no | P0 |
| What causes a `pypi` bzlmod hub-name collision across modules, and does the fix flag actually resolve it or just warn? | `RULES_PYTHON_PYPI_HUB_RESERVED` defaults to warn-only — a silent-until-it-isn't multi-module correctness trap. | [environment-variables.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md) | no | P1 |
| Does precompiling silently drop `.pyc` files when rules_python's `PyInfo` mixes with Bazel's builtin `PyInfo`? | Named, silent-failure interoperability trap between rule authors' custom rules and rules_python's own. | [precompiling.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md) | no | P1 |
| What exact `sys.path[0]` ordering bug makes precompiled bytecode go unused before Python 3.11? | Determinism/path-handling pitfall named exactly, with the workaround. | precompiling.md | no | P2 |
| Why do a `py_binary` and a `py_library` sharing the same sources but different exec properties collide as an action conflict? | Concrete action-graph correctness trap, directly verifiable via a failing build. | precompiling.md | no | P1 |
| How many `config_setting`/platform-name combinations does multi-platform PyPI dependency management require before the naming convention breaks down? | select()-explosion analogue for Python deps; the ruleset's own doc admits it doesn't solve this past a few axes. | [multi-platform-pypi-deps.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md) | no | P1 |
| Which rules_python version does its own Gazelle plugin require, and what silently misclassifies the stdlib below that floor? | Exact version floor (1.5.0) and exact bug (3.13/3.14 stdlib list) from the changelog — a precise compatibility-matrix fact. | [CHANGELOG.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | no | P2 |
| What silently drops self-referencing `pkg[extra]` PyPI dependencies, and in which release was it fixed? | Names a real historical correctness bug with its exact mechanism (a fixed-point loop with the wrong convergence check) — good "read the diff" material. | CHANGELOG.md | no | P3 — fixed already, mostly historical |
| Why does `bazel build` on a `ts_project` succeed even with a type error, and which target actually gates it? | The single most consequential TypeScript-under-Bazel design fact; misunderstanding it means type errors ship silently. | [rules_ts troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) | no | P0 |
| What does `--@aspect_rules_ts//ts:validation_typecheck` cost, and why does rules_ts call it "discouraged and off by default"? | Direct trade-off between fast local iteration and never shipping a type error — a real per-team decision with a documented cost. | rules_ts troubleshooting.md | no | P1 |
| Which transpiler must a `ts_project` select since rules_ts 2.0, and what compatibility risk does SWC carry vs `tsc`? | Breaking change from 1.x; anyone following older tutorials hits a hard error today. | [transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md) | no | P0 |
| What does TypeScript's `isolatedDeclarations` unlock in the Bazel action graph, and what's the measured large-scale win? | Directly quantified (Canva: −73–81% actions/PR) performance topic exactly matching the frame's "measured, not vibes" bar. | [isolated-declarations.md](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md) | no | P1 |
| Why do ESM imports escape the rules_js sandbox, and is this still open? | Named, unresolved hermeticity/sandbox-escape issue straight from the ruleset's own known-issues list. | [rules_js README](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md) | no | P1 |
| What does "bazel-out is the working directory" cost every custom rule or `genrule` author, and what env var papers over it? | Architecture-defining fact for the whole JS/TS ecosystem under Bazel — directly the "Bazel-friendly architecture" topic the frame separates out. | rules_js README | no | P0 |
| What Bazel output-tree constraint forces a shared `dist/` folder layout to change when adopting rules_js? | Concrete "Bazel-friendly architecture" migration cost with two named, worked alternatives. | [rules_js faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | no | P0 |
| When is caching `NpmPackageExtract` actions actively harmful in a cache-only (no RBE) setup, and what's the escape hatch? | Named, counter-intuitive caching trap — caching isn't always a win, and the ruleset's own doc admits "no setting is right for everyone." | [rules_js troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md) | no | P1 |
| Which npm packages need `pnpm.packageExtensions` or `public_hoist_packages` to satisfy rules_js's strict-dependency model, and how is the "plugin discovery" failure pattern (eslint/prettier) diagnosed? | Concrete, reusable diagnostic flow for the most common rules_js support question. | rules_js troubleshooting.md | no | P1 |
| Does rules_js `js_test` coverage double-count against the test's own timeout, and why? | Named cross-cutting resource/budget trap between coverage and test sizing. | rules_js troubleshooting.md | no | P2 |
| Which rulesets require a runfiles tree for coverage, and does that fail silently on Windows without `--enable_runfiles`? | Cross-language Windows + coverage correctness trap named explicitly for JS; worth checking whether Rust/Python share it. | rules_js troubleshooting.md | no | P2 |
| Go's `nogo` runs static analysis as a build-blocking action by default — does any of Rust/Python/TS ship an equivalent first-class gate, or is it always bolted on? | Direct maturity comparison the frame explicitly asked for (Go as gold standard); answer shapes whether the Bazel ruleset should recommend Go-style baked-in gating. | [nogo.rst](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/go/nogo.rst) vs clippy.md/rules_lint README | no | P1 |
| Which language's Gazelle plugin is first-party (maintained with the ruleset) vs third-party and less mature? | Directly informs whether "stand up Gazelle" belongs in `bazel-adopt` per language or is premature for Rust. | [bazel-gazelle README](https://raw.githubusercontent.com/bazel-contrib/bazel-gazelle/master/README.md) | no | P1 |
| Which rulesets declare an explicit `bazel_compatibility` floor in `MODULE.bazel`, and which rely only on undocumented CI-matrix support? | Concrete, greppable compatibility-matrix fact — rules_js/rules_ts/rules_lint declare `>=7.6.0`/`>=7.7.0`; others (rules_rust, rules_cc, rules_go) don't. | MODULE.bazel of each repo (see Survey §26 note) | no | P2 |
| What per-language formatter/linter pairs does rules_lint support today, and where does a language have a formatter but no linter option at all? | Concrete gap-finding for whichever languages the fleet actually uses; directly actionable for `bazel-quality`'s lint-aspect guidance. | [rules_lint README](https://raw.githubusercontent.com/aspect-build/rules_lint/main/README.md) | no | P2 |
| Does rules_esbuild's "never runs `npm install`" hermetic-fetch model extend to custom/self-built toolchains, or only the stock binary? | Small but concrete hermeticity-boundary question for a bundler in the TS stack. | [rules_esbuild README](https://raw.githubusercontent.com/aspect-build/rules_esbuild/main/README.md) | no | P3 |
| What exactly does rules_rust's `cargo_build_script(build_script_use_cc_toolchain)` control, and when must it be force-disabled for a hermetic C toolchain? | Direct Rust×C++ interop seam, relevant wherever a crate's build.rs links C code under a hermetic toolchain like the fleet's zig-cc arrangement. | crate.bzl | no | P2 |
| Do any of these rulesets document Windows-specific caveats beyond "coverage requires a runfiles tree," and how consistent is the coverage across Rust/Python/TS on Windows? | The frame explicitly flags Windows as a suspected gap; only one explicit Windows caveat surfaced in this corpus, worth deliberately widening the search. | rules_js troubleshooting.md (only explicit hit found) | no | P2 |

## Recent shifts seen in this corpus

- **Bazel 9.0, January 2026**: WORKSPACE removed entirely;
  `--incompatible_autoload_externally` defaults empty (removal scheduled for
  Bazel 10.0); C++ rules fully externalized into `rules_cc`, following
  Python and Java which externalized in Bazel 8.0. Invalidates any doc,
  tutorial, or existing rule text that assumes native `cc_binary`/`cc_library`
  or a WORKSPACE fallback path still works on 9.x — directly relevant given
  the fleet's own CI matrix runs `9.x` and `rolling` alongside pinned 8.7.0.
  Source: [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html).
- **rules_ts 2.0** (dated via the transpiler doc, no default `transpiler`):
  made explicit transpiler selection (`swc` or `tsc`) mandatory, replacing an
  implicit `tsc`-does-everything default. Invalidates any 1.x-era snippet
  that omits `transpiler=`.
- **TypeScript 5.5 + rules_ts `isolated_typecheck`**: `isolatedDeclarations`
  shipped in TS 5.5 (per [TypeScript#47947](https://github.com/microsoft/TypeScript/issues/47947)),
  and Canva's BazelCon 2025 talk is the large-scale validation. Invalidates
  older advice that TypeScript type-check parallelism under Bazel is capped
  by "just split into smaller targets" — a structurally different, deeper
  win is available for codebases that adopt the language feature.
- **rules_python 2.1.0**: removed `RULES_PYTHON_ENABLE_PYSTAR` and
  `RULES_PYTHON_ENABLE_PIPSTAR` — the Starlark rewrite of core rules and PyPI
  integration is now unconditional, not opt-in. Invalidates any doc that
  still frames "pystar" as an experimental flag to toggle.
- **rules_python 2.2.0**: added `RULES_PYTHON_PYPI_HUB_RESERVED` to address
  (by warning, not by default fixing) `pypi` hub-name collisions across
  bzlmod modules — a gap that existed, silently, in every earlier bzlmod
  multi-module Python setup.
- **rules_python 2.3.0** (2026-08-07): its own Gazelle Python extension now
  requires rules_python ≥1.5.0, because stdlib-list selection depends on
  `is_python_3.14`. Invalidates Gazelle-Python setups still pinned below
  1.5.0.
- **rules_rust 0.74.0** (2026-08-28): still actively patching
  `crate_universe` lockfile/splicing correctness (cargo-lock v10→v11
  upgrade, a non-root-repo checksum bug fixed after apparently shipping
  broken). Invalidates any assumption that crate_universe's Cargo.lock
  interop is a solved, stable surface — it is presently under active repair.
- **toolchains_llvm C++ named-modules support**: brand new, "currently
  tested" only at Bazel 9.2 + LLVM 22. This capability simply did not exist
  under Bazel 7/8 — any guide that discusses C++20 modules under Bazel
  written before this needs a version gate added.

## Contested

- **"bazel-out is the working directory" (rules_js) vs the conventional
  Bazel idiom of sources-in-one-folder, outputs-in-another.** rules_js's own
  README defends the choice as strictly superior once TypeScript `rootDirs`
  and sourcemap fidelity are accounted for, but concedes every custom rule
  and `genrule` author now pays a re-pathing tax
  (`bazelbuild/bazel#15470` remains open, unresolved, as the tracked fix).
  Trend: the approach has become the de facto standard across the whole
  Aspect JS/TS stack (rules_ts, rules_esbuild inherit it unconditionally) —
  not contested in adoption, but the underlying Bazel-core ergonomics gap it
  papers over is still open.
- **SWC vs `tsc` as the default TypeScript transpiler.** rules_ts
  recommends SWC for speed but documents "subtle compatibility issues" with
  real output differences; no consensus exists, and rules_ts 2.0 resolved
  this by refusing to pick a default at all, pushing the decision onto every
  adopting team.
- **Validation-action type-checking vs test-gated type-checking.**
  rules_ts's own docs explicitly discourage the build-blocking validation
  action (`ts:validation_typecheck`) in favor of `bazel test`, but this
  trades "fast local builds" against "a build can succeed with a type
  error" — a genuine, unresolved tension between iteration speed and
  ship-safety that the ruleset resolves by picking a side (speed) and
  documenting the cost.
- **Hermetic C++ toolchains: no single winner.** Three actively maintained,
  incompatible community projects exist (`toolchains_llvm`,
  `hermetic_cc_toolchain`/zig, and GCC-only `f0rmiga/gcc-toolchain`), and
  `rules_cc` itself declines to endorse or ship any of them. The fleet's own
  `rules_ocx` choice (zig cc, with `layering_check` disabled) is itself
  evidence of the fragmentation rather than a settled best practice —
  Trend: toolchains_llvm looks to be gaining ground for anything needing
  the newest Bazel/C++ features (named modules) since zig cc has no
  equivalent roadmap item in this corpus.
- **`crates_repository` vs `crates_vendor` as the crate_universe default.**
  No source in this survey states one is preferred by default; they solve
  different publication models (fetch-time external repo vs checked-in
  vendored BUILD files for downstream consumption). Not contested so much
  as under-explained — the corpus's own comparison page is rendered stardoc
  HTML that this survey did not fetch verbatim; flagged here as a real gap
  rather than papered over.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/bazelbuild/rules_rust README](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/README.md) | Primary — repo README | fetched 2026-09-05, repo at 0.74.0 | Entry point, community/docs pointers |
| [rules_rust 0.74.0 release notes](https://github.com/bazelbuild/rules_rust/releases/tag/0.74.0) | Primary — GitHub release | 2026-08-28 | Current version, active bugfix cadence evidence |
| [rules_rust docs/src/rust_analyzer.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rust_analyzer.md) | Primary — mdBook source | fetched 2026-09-05 | Most detailed IDE/LSP story in this survey |
| [rules_rust docs/src/clippy.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/clippy.md) | Primary — mdBook source | fetched 2026-09-05 | Exact aspect/flag names for lint gating |
| [rules_rust docs/src/rustfmt.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/rustfmt.md) | Primary — mdBook source | fetched 2026-09-05 | Exact aspect/flag names for format gating |
| [rules_rust docs/src/coverage.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/coverage.md) | Primary — mdBook source | fetched 2026-09-05 | Coverage flags and the `crate=` instrumentation inconsistency |
| [rules_rust docs/src/cargo.md](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/docs/src/cargo.md) | Primary — mdBook source | fetched 2026-09-05 | `cargo_build_script`/`extract_cargo_lints` overview |
| [crate_universe/private/crate.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crate.bzl) | Primary — source with docstrings | fetched 2026-09-05 | Full `crate.annotation()` attribute reference |
| [crate_universe/private/crates_repository.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_repository.bzl) | Primary — source | fetched 2026-09-05 | Repin/watch/splicing mechanics, the `O(N^2)` comment |
| [crate_universe/private/crates_vendor.bzl](https://raw.githubusercontent.com/bazelbuild/rules_rust/main/crate_universe/private/crates_vendor.bzl) | Primary — source with docstring | fetched 2026-09-05 | `crates_vendor`'s stated purpose vs `crates_repository` |
| [rules_python README](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/README.md) | Primary — repo README | fetched 2026-09-05 | Design principles, venv-since-2.0 statement |
| [rules_python CHANGELOG.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/CHANGELOG.md) | Primary — changelog | through 2.3.3, 2026-09-04 | Dated bugfix history, version-floor requirements |
| [rules_python BZLMOD_SUPPORT.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/BZLMOD_SUPPORT.md) | Primary — repo doc | fetched 2026-09-05 | Bzlmod-specific setup detail |
| [rules_python docs/pypi/lock.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/pypi/lock.md) | Primary — Sphinx doc source | fetched 2026-09-05 | Lock-format support matrix, uv auto-detection caveats |
| [rules_python docs/toolchains.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/toolchains.md) | Primary — Sphinx doc source | fetched 2026-09-05 | Toolchain registration, `python`/`repl` distinction |
| [rules_python docs/precompiling.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/precompiling.md) | Primary — Sphinx doc source | fetched 2026-09-05 | Named precompiling caveats and action-conflict trap |
| [rules_python docs/environment-variables.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/environment-variables.md) | Primary — Sphinx doc source | fetched 2026-09-05 | Env-var reference incl. hub-collision and pycache behavior |
| [rules_python docs/howto/multi-platform-pypi-deps.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/docs/howto/multi-platform-pypi-deps.md) | Primary — Sphinx doc source | fetched 2026-09-05 | select()-explosion analogue for PyPI deps |
| [rules_python gazelle/docs/directives.md](https://raw.githubusercontent.com/bazel-contrib/rules_python/main/gazelle/docs/directives.md) | Primary — repo doc | fetched 2026-09-05 | First-party Gazelle plugin directive reference |
| [rules_js README](https://raw.githubusercontent.com/aspect-build/rules_js/main/README.md) | Primary — repo README | fetched 2026-09-05 | Design history, `bazel-out`-as-cwd rationale, known issues |
| [rules_js docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/troubleshooting.md) | Primary — repo doc | fetched 2026-09-05 | Module-resolution, coverage, and RBE-caching caveats |
| [rules_js docs/faq.md](https://raw.githubusercontent.com/aspect-build/rules_js/main/docs/faq.md) | Primary — repo doc | fetched 2026-09-05 | Editor integration and the `dist/` layout constraint |
| [rules_ts README](https://raw.githubusercontent.com/aspect-build/rules_ts/main/README.md) | Primary — repo README | fetched 2026-09-05 | `ts_project` overview |
| [rules_ts docs/transpiler.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/transpiler.md) | Primary — repo doc | fetched 2026-09-05 | Mandatory transpiler choice since 2.0, macro expansion targets |
| [rules_ts docs/troubleshooting.md](https://raw.githubusercontent.com/aspect-build/rules_ts/main/docs/troubleshooting.md) | Primary — repo doc | fetched 2026-09-05 | The type-check-off-critical-path design, exact error signatures |
| [Aspect docs: Isolated Declarations](https://site.aspect.build/docs/bazel/javascript/isolated-declarations.md) | Primary (vendor docs) | fetched 2026-09-05 | Canva case study, exact benchmark numbers |
| [rules_lint README](https://raw.githubusercontent.com/aspect-build/rules_lint/main/README.md) | Primary — repo README | fetched 2026-09-05, v2.9.0 (2026-09-03) | Cross-language lint/format tool matrix |
| [rules_esbuild README](https://raw.githubusercontent.com/aspect-build/rules_esbuild/main/README.md) | Primary — repo README | fetched 2026-09-05 | Hermetic bundler-fetch model |
| [rules_cc README](https://raw.githubusercontent.com/bazelbuild/rules_cc/main/README.md) | Primary — repo README | fetched 2026-09-05 | States the hermetic-toolchain gap directly |
| [toolchains_llvm README](https://raw.githubusercontent.com/bazel-contrib/toolchains_llvm/master/README.md) | Primary — repo README | fetched 2026-09-05, v1.9.0 (2026-08-29) | Sanitizers, cross-compilation, C++ named modules |
| [hermetic_cc_toolchain README](https://raw.githubusercontent.com/uber/hermetic_cc_toolchain/main/README.md) | Primary — repo README | fetched 2026-09-05, v4.3.0 (2026-07-27) | zig-cc incompatibilities and known issues, directly relevant to rules_ocx |
| [rules_go README](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/README.rst) | Primary — repo README | fetched 2026-09-05, v0.63.0 (2026-08-16) | Comparison-baseline feature list and FAQ |
| [rules_go nogo.rst](https://raw.githubusercontent.com/bazel-contrib/rules_go/master/go/nogo.rst) | Primary — repo doc | fetched 2026-09-05 | Built-in static-analysis gate, the key Go-vs-others contrast |
| [bazel-gazelle README](https://raw.githubusercontent.com/bazel-contrib/bazel-gazelle/master/README.md) | Primary — repo README | fetched 2026-09-05, v0.54.0 (2026-09-03) | Per-language Gazelle plugin maturity/ownership list |
| [Bazel 9 LTS announcement](https://blog.bazel.build/2026/01/20/bazel-9.html) | Primary — vendor blog | 2026-01-20 | Dates and confirms WORKSPACE removal and native-rule externalization |
