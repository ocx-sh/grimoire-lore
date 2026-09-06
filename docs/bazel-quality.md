# bazel-quality

Standards for writing and reviewing Bazel: the gate, nineteen
merge-blocking non-negotiables, and twelve depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/bazel-quality
```

Loads on the files the build system itself names: `BUILD.bazel`, `BUILD`,
`*.bzl`, `MODULE.bazel` and its lockfile, `REPO.bazel`, the rc files
(`.bazelrc`, `*.bazelrc`, `.bazelrc.*`), `.bazelversion`, `.bazelignore`,
`*.star`, `*.scl`, and the three legacy `WORKSPACE` names it exists to catch.
The index is 165 lines and always present; a depth file is read only when
the work calls for it. It deliberately never loads on `Cargo.toml`,
`pyproject.toml`, `package.json` or a source file — the language sets own
those.

## It starts by asking which major you are on

Four behaviours flip at Bazel 9.0.0: `WORKSPACE` support is gone, the
autoload list is empty so every `cc_*`, `py_*`, `sh_*`, `java_*` and
`proto_library` symbol needs its own `load()`, `--incompatible_strict_action_env`
defaults on, and `--repo_contents_cache` defaults on. A rule that is right on
8.7.0 and wrong on 9.2.0 is the most common kind of stale Bazel advice, and a
model trained on WORKSPACE-era text produces it unprompted.

So the first instruction in this set is not a rule about Starlark. It is:
read `.bazelversion`, and prove a flag exists on the pinned binary's two help
surfaces before writing it anywhere. Every version-bound claim in the set
carries the version it was watched on.

## Measured, not read

Every rule set here was derived from a research program that ran the
contested claims on real 8.7.0, 8.8.0, 9.0.0, 9.1.0 and 9.2.0 binaries.
Bazel's own documentation, the ruleset READMEs and the release notes were
each found wrong at least once along the way. The measurements that changed
the rules:

| Claim in the wild | What the binary does |
|---|---|
| A remote-cache outage fails the build; exit code 39 is the retry signal | A cache-only build logs a warning, builds locally and exits 0; exit 39 never surfaced in any configuration |
| `buildifier_test` gates Starlark | It passes a broken `srcs` at every `buildifier_prebuilt` pin below 8.5.1.3 |
| Buildifier catches a bad `load()` or an undefined name | It exits 0 on both; only the loading phase (`bazel build --nobuild //...`) catches them |
| `bazel sync --only=crates` repins a Rust lockfile | `bazel sync` was deleted at 9.0.0; the ruleset's docs still print it |
| The `external` and `no-remote-cache-upload` tags show up in a disk-cache run | Both are invisible there; `external` is test-only and `no-remote-cache-upload` suppresses one of two uploads |

## What is in it

The index carries the gate, nineteen non-negotiables, and three
cross-cutting rules it owns outright. 328 further rules live in twelve
depth files — eight by concern (Starlark and BUILD shape, Bzlmod and
repository rules, hermeticity, caching and remote execution, testing, CI and
target selection, architecture, flags and versions) and four by language
(Rust, Python, TypeScript, C++), because the rulesets genuinely diverge per
ruleset and a flat file would restate every exception in every paragraph.

Every rule carries an ID, a rationale, a runnable verification that says
which way empty output reads and which Bazel version it was run on, and a
severity. The depth files do not point at each other.

## Every verification was watched go red

The rule this set is strictest about is the one it applies to itself: a
check that cannot fail certifies an unchecked change as a checked one. The
inverted checks are the dangerous ones, and Bazel has more than most — an
empty `bazel query` over a generated repository no package loads, an empty
`bazel help` grep for a startup option, a green `buildifier_test`, a
disk-cache-only run. Every verification states which way its silence reads.

## Pinned decisions

The buildifier pin floor, the lockfile mode, the cache wiring order, the
whole-repo default pipeline, the sanitizer config shape and the transpiler
default encode an agreed decision rather than a derivable fact. They are
marked pinned: an adopter may override one, once, in their own rc file or
`MODULE.bazel` — never per target.

## What it does not cover

No procedure. Deciding whether to adopt Bazel and migrating onto it is the
`bazel-adopt` skill; a build that is already slow, missing the cache or
flaky is the `bazel-diagnose` skill. Both cite these rules by ID. Nothing
here restates what a language set already enforces on the source files a
target compiles.

## Siblings

`rust-cargo`, `python-packaging` and `typescript-packaging` own the manifests
and lockfiles this set never loads on; `rust-quality`, `python-quality` and
`typescript-quality` own the sources. Bundled with the two skills as
`bazel-essentials`.
