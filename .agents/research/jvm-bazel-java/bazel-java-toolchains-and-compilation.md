---
title: Bazel Java toolchains and compilation
topic: Two flag pairs, header compilation, strict deps and Error Prone under Bazel — the BZL-JAVA family
agent: jvm-bazel-java-toolchains
model: sonnet
date_researched: 2026-09-12
sources_count: 16
scope: |
  Covers only what the shipped bazel-quality sibling set has no file for: the
  application-vs-tool JDK flag pairs, remotejdk/local_jdk hermeticity for Java,
  JavaBuilder's --patch_module, header compilation (ijar vs turbine), strict
  deps, Error Prone wiring via --javacopt/java_package_configuration, and
  Bazel's toolchain-registration order rule. Does not cover MODULE.bazel.lock
  (bzlmod.md), action-environment/toolchain hermeticity in general
  (hermeticity.md), cache credentials (caching.md), test sizing/coverage
  (testing.md), CI lanes (ci.md), target granularity/visibility
  (architecture.md), the Bazel-version floor or rc-file mechanics (flags.md),
  the explicit-load requirement itself (starlark.md), or the Error Prone
  check list, which is settled Gradle-side in jvm-quality-gates.md JAVA-LINT-02.
---

# Bazel Java toolchains and compilation

Owns **BZL-JAVA**: the `--java_language_version` / `--java_runtime_version`
versus `--tool_java_language_version` / `--tool_java_runtime_version` flag
pairs and their defaults, `local_jdk` vs `remotejdk_*` for the Java runtime,
JavaBuilder's `--patch_module`/`-Xbootclasspath` split, header compilation
(`ijar` vs `turbine`), strict Java deps
(`--experimental_strict_java_deps`/`--strict_java_deps`), Error Prone wiring
under Bazel (`--javacopt`, `java_package_configuration`), and the
toolchain-registration order rule. It does not own: `MODULE.bazel.lock` or
lockfile modes (BZL-MOD, `bzlmod.md`); the action environment, sandboxing or
general toolchain hermeticity (BZL-HERM, `hermeticity.md`); cache credentials
or action keys (BZL-CACHE, `caching.md`); test sizing, `manual` tags or
coverage flags (BZL-TEST, `testing.md`); CI lane wiring (BZL-CI, `ci.md`);
target granularity, visibility or `select()` (BZL-ARCH, `architecture.md`);
the Bazel version floor, rc-file layering or `PROJECT.scl` (BZL-FLAG,
`flags.md`); or the explicit-`load()` requirement itself, which is Starlark's
own non-negotiable (`starlark.md`, cited as index Non-Negotiable 1). The
Error Prone *check list* — which checks get promoted to `ERROR` and why — is
settled Gradle-side at JAVA-LINT-02 (`jvm-quality-gates.md`); this file owns
only the Bazel plumbing that turns a check name into a build failure.
Wave-2 tie-in, by reference only: the `_deploy.jar`-as-distribution-artifact
question (M-X-08) inherits the shading failure taxonomy already settled at
DIST-02..DIST-11 (`jvm-distribution.md`) — see [§10](#10-deployjar-and-the-shading-taxonomy-by-reference).

Contents: [The Two Flag Pairs](#1-the-two-flag-pairs-and-their-defaults) ·
[Hermeticity: remotejdk vs local_jdk](#2-hermeticity-remotejdk-vs-local_jdk) ·
[JDK Pinning Across the Exemplar Set](#3-jdk-pinning-across-the-exemplar-set) ·
[The Bytecode-Target-Below-Toolchain Split](#4-the-bytecode-target-below-toolchain-split) ·
[Header Compilation: ijar vs turbine](#5-header-compilation-ijar-vs-turbine) ·
[Strict Deps](#6-strict-deps) ·
[Error Prone Under Bazel](#7-error-prone-under-bazel) ·
[Toolchain Resolution Order](#8-toolchain-resolution-order) ·
[patch_module and Reaching javac Internals](#9-patch_module-and-reaching-javac-internals) ·
[_deploy.jar and the Shading Taxonomy](#10-deployjar-and-the-shading-taxonomy-by-reference) ·
[contrib_rules_jvm's Lint Wrappers](#11-contrib_rules_jvms-lint-wrappers) ·
[Gaps](#gaps) · [What Agents Get Wrong Here](#ai-agent-angle)

Measured 2026-09-12 against the same three pins as the rest of this set —
Bazel 8.7.0, 8.8.0 and 9.2.0 — plus a fourth data point: `bazelbuild/bazel`'s
own `.bazelrc` pins its **build** at Bazel 9.2.0 while targeting Java 25. Every
flag default below was read from
[`bazel.build/docs/user-manual`](https://bazel.build/docs/user-manual)
(page `dateModified: 2026-09-05`), not from the shorter
`bazel-and-java` prose page, which omits or contradicts several of them (see
[Gaps](#gaps)). Neither page is a substitute for `bazel help build --long`
and `bazel help startup_options` on your own pinned binary — this file could
not run either command (no `bazel` binary in the research sandbox), so every
flag name here carries the doc source it was read from and the caveat is not
decorative: the two docs pages disagree on the strict-deps flag's own name
(§6). A grep in this file reads your `MODULE.bazel`, `.bazelrc*` and BUILD
text only; JavaBuilder's internal javac invocation, the generated
`@remotejdk_*` repository content and the header-jar it produces are out of
grep's reach by construction — where a rule's subject is generated or
internal, its verification reads the configuration that drives it instead.
MUST = Block, SHOULD = Warn, CONSIDER = Suggest; **pinned** marks a default an
adopter overrides once, in their own `.bazelrc`, never per target.

## Summary

- Bazel compiles with one JDK/JVM pair and executes/tests with a second,
  independently configured pair — conflating them is the single most common
  mistake here ([§1](#1-the-two-flag-pairs-and-their-defaults)).
- `--java_language_version` (source) and `--java_runtime_version` (execution)
  govern application code; both default when unset — `11` and `local_jdk`
  respectively — and `local_jdk` means "whatever `JAVA_HOME` resolves to on
  this machine," not a pinned version ([§1](#1-the-two-flag-pairs-and-their-defaults), [§2](#2-hermeticity-remotejdk-vs-local_jdk)).
- `--tool_java_language_version` / `--tool_java_runtime_version` govern the
  JDK/JVM that runs Bazel's own build tooling (annotation processors,
  code generators) and default to `11` / `remotejdk_11` — already hermetic,
  but still an old floor that drifts only when Bazel's own baked-in default
  moves, not when you decide it should ([§1](#1-the-two-flag-pairs-and-their-defaults)).
- `google/error-prone` ships no `MODULE.bazel`, `WORKSPACE` or `BUILD` file at
  all — it is Maven-built and Bazel-*consumed*; a worker sent to read its
  Bazel config finds nothing and that absence is itself the finding
  ([§7](#7-error-prone-under-bazel)).
- Header compilation on the default toolchain is `turbine`
  (`header_compiler = TurbineDirect`), not `ijar` — `ijar` strips an
  *already-compiled* jar down to its API surface, `turbine` parses source and
  emits a header jar **without invoking javac's back end at all**; conflating
  the two misdescribes why incremental Java rebuilds are fast under Bazel
  ([§5](#5-header-compilation-ijar-vs-turbine)).
- Strict Java deps is not something you turn on: per Bazel's own
  user-manual, `default`, `strict` and `error` are three names for the same
  behavior, and **that is what an unspecified flag already does** — a target
  using a class from a jar it did not directly declare already fails the
  build today, on every exemplar in this corpus ([§6](#6-strict-deps)).
- The flag's *name* is contested between two of Bazel's own docs pages:
  `command-line-reference` calls it `--experimental_strict_java_deps`,
  `user-manual` calls it `--strict_java_deps` with no experimental prefix —
  only `rules_jvm_external`'s own `.bazelrc` gives a real, exemplar-confirmed
  answer (the experimental-prefixed name), and even that should be reconfirmed
  on your own pinned binary before being copied ([§6](#6-strict-deps)).
- `--javacopt="-Xep:CheckName:ERROR"` turns on an Error Prone check
  build-wide; `java_package_configuration` plus a `package_group` scopes a
  javac flag (Error Prone or otherwise) to a subtree, with `-//foo/bar/...`
  syntax for exclusions ([§7](#7-error-prone-under-bazel)).
- When multiple `local_java_repository`/`remote_java_repository` definitions
  match the same OS and CPU architecture, Bazel silently uses **the first one
  registered** — not the most specific, not the most recently added; this is
  an ordering rule about `register_toolchains()` call order, not a
  specificity rule ([§8](#8-toolchain-resolution-order)).
- No exemplar pins all four version flags *and* leaves nothing to Bazel's
  defaults except `grpc-java`, which pins nothing at all and inherits
  whatever this Bazel version's baked-in Java floor happens to be — that is
  exposure, not a validated pattern, and the file's MUST is to pin regardless
  ([§3](#3-jdk-pinning-across-the-exemplar-set)).
- Pinning a modern toolchain (`--tool_java_language_version=17`) while
  shipping old bytecode (`--javacopt="-source 8 -target 8"`) is a real,
  exemplar-confirmed pattern (`google/dagger`) — express it as a `javacopt`
  override on top of a normal `--java_language_version`, never by lowering
  `--java_language_version` itself, which also changes *which toolchain*
  Bazel selects via `source_version` matching ([§4](#4-the-bytecode-target-below-toolchain-split)).
- JavaBuilder patches `java.compiler`/`jdk.compiler` internals with
  `--patch_module` on JDK > 9 (and `-Xbootclasspath` on JDK 8) so its own
  compiler plugins can see javac internals; a *user* annotation processor or
  compiler plugin needing the same access goes through
  `--jvmopt="--add-exports=jdk.compiler/<pkg>=ALL-UNNAMED"` instead, since
  `--patch_module` itself is JavaBuilder's, not yours to set
  ([§9](#9-patch_module-and-reaching-javac-internals)).
- `contrib_rules_jvm`'s `java_test_suite`, `java_junit5_test` and its
  checkstyle/PMD/SpotBugs wrappers are real and bzlmod-native, but adopted by
  zero of the 32 corpus exemplars and layered on a third framework
  (`apple_rules_lint`) beyond `rules_java` and Error Prone — a CONSIDER, not
  a MUST ([§11](#11-contrib_rules_jvms-lint-wrappers)).
- Bazel's own `bazel-and-java` doc page states the "default options for
  javac" are `-source 8 -target 8 -encoding UTF-8`, which contradicts the
  same page's (and user-manual's) stated `--java_language_version` default of
  `11` two paragraphs earlier — treat that specific sentence as stale prose,
  not a live default, and verify against `--java_language_version`'s own
  entry instead ([Gaps](#gaps)).

## Findings

### 1. The two flag pairs and their defaults

One reading covers this whole block — there is no grep, because the subject
is which flags are *absent* from your `.bazelrc`:

```bash
grep -n -E '^\s*(common|build)(:\S+)?\s+--(tool_)?java_(language|runtime)_version' .bazelrc* 2>/dev/null
```

Bazel uses two independently-configured JDK/JVM pairs
([bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java)):

| Flag | Governs | Default | Values |
|---|---|---|---|
| `--java_language_version` | source version of *your* Java | `11` | `8, 9, 10, 11, 17, 21`, extendable via `default_java_toolchain` |
| `--java_runtime_version` | JVM that executes/tests *your* code | `local_jdk` | `local_jdk`, `local_jdk_<ver>`, `remotejdk_11/17/21`, extendable via `local_java_repository`/`remote_java_repository` |
| `--tool_java_language_version` | source version of Bazel's own build tooling | `11` | same value space |
| `--tool_java_runtime_version` | JVM that runs Bazel's own build tooling | `remotejdk_11` | same value space |

(Defaults confirmed on
[bazel.build/docs/user-manual](https://bazel.build/docs/user-manual),
`dateModified: 2026-09-05`; the shorter `bazel-and-java` page states the tool
pair's defaults identically but is silent on `--java_language_version`'s own
default, which is why user-manual is the citation for that row.)

The "tool" pair is easy to miss because it never appears in application code
— it governs annotation processors, code generators and any other JVM
program Bazel spawns *during* the build but does not ship. It already
defaults to a remote, hermetic JDK; the application pair does not.

```starlark
# wrong — conflates the two pairs, and the second line does nothing:
# there is no bare `--java_version`, so this silently no-ops
common --java_version=21
common --tool_java_version=21

# right — both pairs named explicitly
common --java_language_version=21
common --java_runtime_version=remotejdk_21
common --tool_java_language_version=21
common --tool_java_runtime_version=remotejdk_21
```

### 2. Hermeticity: remotejdk vs local_jdk

`--java_runtime_version`'s default, `local_jdk`, is "the JVM installed on the
local machine," found via `JAVA_HOME` or `PATH`
([bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java)).
The same page states the consequence directly: "the resulting binaries depend
on what is installed on the machine." `remotejdk_*` downloads a pinned JDK
from a Bazel-managed repository instead, so the same `.bazelrc` line produces
the same JVM on every machine and every CI runner. This is the Java instance
of the general hermeticity principle owned by `hermeticity.md` (BZL-HERM) —
cited here only for the flag name and its Java-specific default, not
re-derived.

```
# wrong — local_jdk is the silent default; two developers on two JDK
# vendors get two different test runs from the identical BUILD graph
# (no line needed — this is what happens when the flag is simply absent)

# right
common --java_runtime_version=remotejdk_21
common --tool_java_runtime_version=remotejdk_21
```

`bazel-and-java` also documents an opt-in escape hatch:
`--extra_toolchains=@local_jdk//:all` registers the local-JDK compilation
toolchains (configured by default, but not used) when you deliberately want
local compilation — "mind that this may not work on JDK of arbitrary
vendors."

### 3. JDK pinning across the exemplar set

```bash
grep -n -E 'java_(language|runtime)_version|tool_java_' .bazelrc*
```

Six exemplars, six different postures, all confirmed by direct read of each
`.bazelrc`:

| Exemplar | Pins | Notes |
|---|---|---|
| [`bazelbuild/bazel@948b8c70e2`:`.bazelrc:70-73`](https://github.com/bazelbuild/bazel/blob/948b8c70e2/.bazelrc) | language, runtime **and** tool, all at **25** | Comment: "Enable Java 25 language features... matching the embedded JDK," with a `LINT.IfChange`/`LINT.ThenChange(//BUILD)` pair keeping the flag and the toolchain target in sync |
| [`rules_java@4206909b6d`:`.bazelrc:4-7`](https://github.com/bazelbuild/rules_java/blob/4206909b6d/.bazelrc) | language, runtime **and** tool, all at **8** | Deliberate: "Use hermetic JDKs for testing and ensure compatibility with Java 8" — a rules repo must keep building for callers still on 8 |
| [`rules_kotlin@7c51dd1210`:`.bazelrc:9-10`](https://github.com/bazelbuild/rules_kotlin/blob/7c51dd1210/.bazelrc) | **only** the runtime pair, `remotejdk_17` | No language-version pin at all found in the file |
| [`rules_jvm_external@449754dcbb`:`.bazelrc:3-10`](https://github.com/bazelbuild/rules_jvm_external/blob/449754dcbb/.bazelrc) | all four, at **17** | Also sets `--experimental_strict_java_deps=strict` and `--explicit_java_test_deps` in the same block |
| [`dagger@4fbc045d2b`:`.bazelrc:17-28`](https://github.com/bazelbuild/dagger/blob/4fbc045d2b/.bazelrc) | language+tool at **17**, plus `--javacopt="-source 8 -target 8"` | The bytecode-target split — see [§4](#4-the-bytecode-target-below-toolchain-split) |
| [`grpc-java@fc4314419d`:`.bazelrc:1-3`](https://github.com/grpc/grpc-java/blob/fc4314419d/.bazelrc) | **none** | The file carries only two C++ flags; no Java version flag anywhere |

**DECIDE (a):** the MUST is to pin all four flags explicitly, and
`grpc-java`'s silence is not a counterexample — it is unmeasured exposure.
An unpinned build inherits `local_jdk` for execution (a genuinely
machine-dependent value, per [§2](#2-hermeticity-remotejdk-vs-local_jdk)) and
whatever Bazel's *own* baked-in tool default currently is (`11`/`remotejdk_11`
as measured here). That floor has already moved once in this very corpus —
`rules_java` pins 8 specifically because the ecosystem moved past it — so an
unpinned repository is one Bazel upgrade away from a silent floor change with
no line in any diff to review. `rules_kotlin`'s partial pin (runtime only, no
language version) is the same exposure in a narrower form: it inherits
whatever `--java_language_version`'s default is on the pinned Bazel version,
un-reviewed.

### 4. The bytecode-target-below-toolchain split

```bash
grep -n -B2 -A2 'javacopt.*-source\|javacopt.*-target' .bazelrc*
```

[`dagger@4fbc045d2b`:`.bazelrc:17-28`](https://github.com/bazelbuild/dagger/blob/4fbc045d2b/.bazelrc):

```
build --java_language_version=17
build --tool_java_language_version=17
build --java_runtime_version=remotejdk_17
build --tool_java_runtime_version=remotejdk_17

build --javacopt="-source 8 -target 8"
build --javacopt="-Xlint:-options"
```

**DECIDE (b):** yes, this is a recommended pattern, and the exemplar shows
the correct expression of it. The toolchain pin (`--java_language_version`,
`--tool_java_language_version`) selects *which `java_toolchain` compiles your
code* — dagger needs 17 because its own annotation-processor tooling and
JavaBuilder's internals want a modern JDK. The `--javacopt` line then
overrides *only the emitted bytecode version*, independent of which
toolchain produced it, so consumers still on Java 8 runtimes can load the
class files. Per `bazel.build/docs/user-manual`, `--javacopt` is applied
"after the Bazel built-in default options for javac and before the per-rule
options," and "the last specification of any option to javac wins" — so a
build-wide `--javacopt` line is exactly the mechanism for a repo-wide
downward bytecode target.

The reason this must be a `javacopt`, never a lowered `--java_language_version`,
is a second, less obvious property from the same source: `bazel-and-java`
states "the toolchain is only used when the `source_version` attribute
matches the value specified by `--java_language_version`." Lowering that flag
does not just change the emitted bytecode — it changes *which
`java_toolchain` target Bazel resolves to*, which can silently swap out
JavaBuilder features (header compilation config, jvm_opts, package
configurations) that were wired to the higher-version toolchain.

```starlark
# wrong — changes toolchain selection, not just the output bytecode;
# any package_configuration wired to the 17 toolchain stops applying
common --java_language_version=8
common --tool_java_language_version=17

# right — one toolchain (17) compiles everything; javacopt narrows
# only the emitted class-file version
common --java_language_version=17
common --tool_java_language_version=17
common --javacopt="-source 8 -target 8"
```

### 5. Header compilation: ijar vs turbine

```bash
grep -n -e header_compiler -e forcibly_disable_header_compilation toolchains/default_java_toolchain.bzl BUILD*.bazel 2>/dev/null
```

The two tools are not interchangeable and `bazel-and-java`'s own prose makes
it easy to conflate them, since it only names `ijar` in this section:
"The `ijar` tool processes `jar` files to remove everything except call
signatures. Resulting jars are called header jars... used to improve the
compilation incrementality by only recompiling downstream dependents when the
body of a function changes."

That description is accurate for `ijar` acting on an *already-compiled* jar
(the mechanism Java has used since before Bazel), but the default
compilation toolchain's actual header compiler is **turbine**, confirmed by
reading the toolchain definition itself:
[`bazelbuild/bazel@948b8c70e2`:`src/main/starlark/tests/builtins_bzl/builtins_shim.bzl`](https://github.com/bazelbuild/bazel) —
concretely, the shipped `DEFAULT_TOOLCHAIN_CONFIGURATION` sets
`forcibly_disable_header_compilation = False`,
`header_compiler = Label("@remote_java_tools//:TurbineDirect")` and
`header_compiler_direct = Label("//toolchains:turbine_direct")`
(read at `bazelbuild__bazel` tag pin, `toolchains/default_java_toolchain.bzl`
distributed with `rules_java`). The difference matters: `ijar` strips a
finished jar down to its API surface after full compilation has already
happened; `turbine` parses Java **source** directly and emits a header jar
**without running javac's back end at all** for that step. That is what
makes header compilation cheap enough to run on every dependency edge — a
downstream target's header-compile action does not wait for its
dependencies' *bodies* to compile, only for their headers, and turbine
produces those headers without invoking a compiler proper.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-05 | Never set `forcibly_disable_header_compilation = True` on a `default_java_toolchain` without a recorded reason, and never describe the mechanism as "ijar-based" in review or docs. | Disabling it reverts every downstream dependent to waiting on full compilation of every upstream body on every rebuild — the entire incrementality benefit Bazel's Java story is built on. Describing it as ijar conflates two different tools with different inputs (a compiled jar vs. raw source) and misleads anyone reasoning about why a change to a private method triggered (or didn't trigger) a downstream rebuild. | `grep -n forcibly_disable_header_compilation **/*.bzl` — **empty is the pass; a hit with no comment naming why is the finding.** Then `bazel aquery 'mnemonic("Turbine", //your/target)'` on your own pin should list a `Turbine` action per Java compilation unit; **empty output here (on a toolchain that has not disabled header compilation) is itself a finding worth escalating**, not a pass — confirm on your pinned Bazel before trusting either outcome. | SHOULD |

```starlark
# wrong — silently reverts every dependent to full recompilation
default_java_toolchain(
    name = "no_header_compile",
    configuration = dict(DEFAULT_TOOLCHAIN_CONFIGURATION, forcibly_disable_header_compilation = True),
)

# right — default configuration keeps turbine-based header compilation on
default_java_toolchain(
    name = "toolchain",
    configuration = DEFAULT_TOOLCHAIN_CONFIGURATION,
)
```

### 6. Strict deps

```bash
grep -n -E 'strict_java_deps|explicit_java_test_deps' .bazelrc*
```

Two of Bazel's own docs pages disagree on this flag's name. The command-line
reference lists it as experimental, five times, identically each time:
`--experimental_strict_java_deps (off, warn, error, strict or default;
default: "default")`, tagged `build_file_semantics, eagerness_to_exit`
([bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference)).
The user manual describes the same behavior under a **different, unprefixed**
name and a different argument order:
`--strict_java_deps (default|strict|off|warn|error)`
([bazel.build/docs/user-manual](https://bazel.build/docs/user-manual)),
adding the behavioral detail neither the reference page nor `bazel-and-java`
states: *"`default`, `strict` and `error` all mean javac will generate errors
instead of warnings... This is also the default behavior when the flag is
unspecified."* Only `off` disables the check and only `warn` downgrades it to
a warning; every other value, including no value at all, already fails the
build on a missing direct dependency.

The exemplar corpus resolves the naming ambiguity in practice, not in docs:
[`rules_jvm_external@449754dcbb`:`.bazelrc:9`](https://github.com/bazelbuild/rules_jvm_external/blob/449754dcbb/.bazelrc)
uses the experimental-prefixed spelling, `--experimental_strict_java_deps=strict`,
alongside `--explicit_java_test_deps` on the next line. No exemplar in this
corpus uses the unprefixed spelling. Since neither doc page's claim could be
run against a real `bazel help` in this environment, treat the
experimental-prefixed name as the one with exemplar evidence behind it and
reconfirm on your own pinned binary before relying on either — this is
precisely the situation the rule set's own preamble warns about (docs
measured wrong at least once; the binary's two help surfaces are the only
authority).

What strict deps rejects, per the same user-manual paragraph: it "determines
the jars actually used for type checking each java file" and compares that
against the target's *direct* `deps` — a class reachable only through a
transitive dependency (present on the classpath because some direct
dependency re-exports it, or because Bazel's classpath happens to include it
un-declared) fails type-checking with a `[strict]`-tagged diagnostic even
though the same code would compile fine under a flat classpath.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-06 | Confirm the strict-deps flag's exact name and value on your own pinned binary (`bazel help build --long` **and** `bazel help startup_options`) before writing it anywhere, rather than copying `--experimental_strict_java_deps` or `--strict_java_deps` from either doc page or from this file. | The two primary docs pages disagree on the flag's name; a name that is stale on one page and current on the other is invisible until someone actually runs `bazel build --experimental_strict_java_deps=strict` and watches it either apply or get rejected as unknown. | `bazel help build --long \| grep -i strict_java_deps` and `bazel help startup_options \| grep -i strict_java_deps` on the pinned version. **Empty on both is the finding — no such flag on this binary, whatever either doc page says; a hit on exactly one confirms which name is live at this pin.** | MUST |
| BZL-JAVA-07 | Do not treat an unset strict-deps flag as "unenforced" in review — `default` (the value when the flag is absent) already errors on a missing direct dependency, identically to `strict` and `error`. Only an explicit `off` or `warn` weakens it. | A reviewer reading a `.bazelrc` with no strict-deps line at all may assume the check is off; per Bazel's own documented semantics it is already the strictest behavior available. Missing this inverts a review finding: "strict deps isn't enforced here" is usually false. | Grep for the flag; **absence, or presence at `default`/`strict`/`error`, is the pass (enforcement is on); presence at `off` or `warn` is the finding to justify.** | SHOULD |

```
# these three lines are behaviorally identical to each other,
# and identical to writing nothing at all:
build --experimental_strict_java_deps=default
build --experimental_strict_java_deps=strict
build --experimental_strict_java_deps=error
# only these two actually change anything:
build --experimental_strict_java_deps=off    # disables the check entirely
build --experimental_strict_java_deps=warn   # downgrades error to warning
```

### 7. Error Prone under Bazel

```bash
grep -n -E 'javacopt.*-Xep|java_package_configuration' .bazelrc* **/*.bzl **/BUILD* 2>/dev/null
```

`google/error-prone` ships **no** `MODULE.bazel`, `WORKSPACE` or `BUILD` file
in its own repository — confirmed by `git ls-tree` returning nothing for any
of the three at the pinned SHA. It is Maven-built and Bazel only *consumes*
it, bundled into JavaBuilder's own compilation toolchain
(`bazel-and-java`: "Compilation toolchain is composed of JDK and multiple
tools that Bazel uses during the compilation... such as: Error Prone, strict
Java dependencies, header compilation..."). A worker instructed to read
error-prone's Bazel config to learn how it wires into Bazel will find
nothing there by design — the wiring lives entirely in the *consuming*
repository's own `.bazelrc`/BUILD files, using two mechanisms:

**Build-wide, via `--javacopt`** —
[`google/dagger@4fbc045d2b`:`.bazelrc:11-13`](https://github.com/bazelbuild/dagger/blob/4fbc045d2b/.bazelrc):

```
build --javacopt="-Xep:BetaApi:ERROR"
build --host_javacopt="-Xep:BetaApi:ERROR"
```

**Package-scoped, via `java_package_configuration`** — from
[bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java):

```starlark
java_package_configuration(
    name = "error_prone",
    javacopts = ["-Xep:MissingOverride:ERROR"],
    packages = ["error_prone_packages"],
)

package_group(
    name = "error_prone_packages",
    packages = [
        "//foo/...",
        "-//foo/bar/...",  # exclusion
    ],
)

default_java_toolchain(
    name = "toolchain",
    package_configuration = [":error_prone"],
    visibility = ["//visibility:public"],
)
```

`java_package_configuration`'s `packages` attribute takes a `package_group`,
which supports `-`-prefixed exclusions the same way `visibility` does — this
is the mechanism for "every package except this one" scoping, not a separate
attribute.

The *check names themselves* (which nine to promote, why) are settled at
JAVA-LINT-02 in `jvm-quality-gates.md` and not re-derived here; this section
owns only how a check name becomes a Bazel build failure.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-08 | Wire Error Prone severity overrides through `--javacopt="-Xep:<Check>:<SEVERITY>"` (build-wide) or `java_package_configuration` + `package_group` (scoped); never through a `bazel_dep`/`maven_install` on `com.google.errorprone:error_prone_core` or a patch to `java_toolchain`. | Error Prone is not a library your `deps` pull in under Bazel — it is baked into JavaBuilder's compilation toolchain already, and the upstream project itself provides no Bazel integration surface to depend on (no `MODULE.bazel`, `WORKSPACE`, or `BUILD` at its root). The only reachable knob is the javac flag surface. | `grep -rn 'error_prone_core\|error-prone-core' MODULE.bazel maven_install.json 2>/dev/null` — **any hit that is not merely a transitive annotations dependency (e.g. `error_prone_annotations`) is the finding**, since it signals someone tried to wire Error Prone as a dependency rather than a compiler flag. Then confirm the `-Xep:` override actually appears in `--javacopt`, `--host_javacopt`, or a `java_package_configuration`'s `javacopts` — **none of the three is the finding.** | MUST |

### 8. Toolchain resolution order

```bash
grep -n -B2 -A8 'local_java_repository\|remote_java_repository\|register_toolchains' MODULE.bazel
```

From [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java),
stated as flatly as the index's own non-negotiables: "When multiple
definitions for the same operating system and CPU architecture are given,
**the first one is used**." This is registration-order-dependent, not
specificity-dependent — a later, more narrowly-targeted JVM registration
(say, one pinned to a specific vendor build) does not win over an earlier,
broader one just because it is more specific. The order that matters is the
order `register_toolchains()` calls appear (directly, or via
`use_repo`/`register_toolchains` emitted by a module extension), which is
easy to get backwards when a JVM registration is added by a later
`bazel_dep` whose module extension calls `register_toolchains` before your
own root-module registration runs.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-09 | When registering more than one JVM for the same OS/CPU pair (a custom vendor build alongside the stock `remotejdk_*`, or an `additionaljdk` local override), register the one you want selected by default **first**, and say so in a comment next to the registration — never rely on "more specific wins." | The resolution rule is textually explicit and non-negotiable, but nothing in the Starlark syntax signals "this one loses to whichever else is registered" — a reviewer reading one `register_toolchains()` call in isolation cannot see the ordering hazard. | Read every `register_toolchains(...)` call (root module and any `bazel_dep` transitively reachable) targeting `@rules_java//java:runtime_toolchain_type` or `@rules_java//java:toolchain_type`, in the order Bazel evaluates them (root module's own calls first, then `bazel_dep`s in `MODULE.bazel` declaration order). **Two registrations matching the same OS/CPU with no comment explaining the intended winner is the finding; one registration, or an explicit ordering comment, is the pass.** | SHOULD |

### 9. patch_module and reaching javac internals

From [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java):
"Bazel overrides some JDK internals. In case of JDK version > 9,
`java.compiler` and `jdk.compiler` modules are patched using JDK's flag
`--patch_module`. In case of JDK version 8, the Java compiler is patched
using `-Xbootclasspath` flag." This is JavaBuilder's own mechanism for
reaching into javac's internal packages to implement strict deps, header
compilation and Error Prone — it is not a flag an SDK or plugin author sets
themselves; it is already applied by the toolchain before your code's javac
invocation runs.

A *user*-authored annotation processor or javac plugin that needs the same
kind of internal access (for example, one walking `com.sun.tools.javac.api`
directly, as opposed to the public `javax.annotation.processing` surface)
cannot ask for a second `--patch_module` — that flag is JavaBuilder's to set.
The exemplar corpus shows the actual mechanism: a `--jvmopt`-level
`--add-exports`, confirmed at
[`google/dagger@4fbc045d2b`:`.bazelrc:26`](https://github.com/bazelbuild/dagger/blob/4fbc045d2b/.bazelrc):

```
build --jvmopt="-Djava.security.manager=allow"
build --jvmopt="--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"
```

(Dagger's own comment ties this to [JEP 411](https://openjdk.java.net/jeps/411)
and [bazelbuild/bazel#14502](https://github.com/bazelbuild/bazel/issues/14502) —
the security-manager-removal migration, not a Bazel-specific quirk on its
own; cited for the mechanism, not re-litigated here.)

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-10 | Give a compiler plugin or annotation processor that reads `com.sun.tools.javac.*` internals its own `--jvmopt="--add-exports=<module>/<package>=ALL-UNNAMED"`; never attempt to add or change JavaBuilder's own `--patch_module` invocation. | `--patch_module` is computed and applied by JavaBuilder itself based on the JDK major version — there is no exposed attribute to append to it, and JavaBuilder's own internal-access needs (strict deps, header compilation, Error Prone) are separate from a user tool's. `--add-exports` via `--jvmopt` is the JVM-level mechanism JDK 16+'s strong encapsulation ([JEP 396](https://openjdk.java.net/jeps/396)/[JEP 403](https://openjdk.java.net/jeps/403)) actually exposes for this. | For any first-party `build.rs`-equivalent (an annotation processor or javac plugin module) importing `com.sun.tools.javac`, confirm a matching `--add-exports` in `--jvmopt`/`--host_jvmopt`. **A processor reading those internals with no matching `--add-exports` line either already fails at runtime on a strongly-encapsulated JDK, or is silently running on an older JDK where the module system does not yet enforce it — either way, the missing line is the finding.** | MUST wherever such a processor exists; N/A otherwise |

### 10. _deploy.jar and the shading taxonomy (by reference)

M-X-08 — whether `java_binary`'s auto-generated `_deploy.jar` counts as *the*
distribution artifact — is not re-derived here. It inherits the shading
failure taxonomy already settled at DIST-02 through DIST-11 in
`jvm-distribution.md` (the `GRADLE-DIST` family): dropped `ServiceLoader`
provider files on naive concatenation, signed-jar `SecurityException` at
class-load time from stale `META-INF/*.SF`/`.DSA`/`.RSA` entries after
merging, and the "a library is never shaded, except under a named
precondition" carve-out. `_deploy.jar`'s single-jar merge step is Bazel's own
version of the same merge problem those rows describe for Shadow/`maven-shade`;
cite those rows and their merge failure modes rather than re-deriving Bazel's
`singlejar` behavior from scratch.

### 11. contrib_rules_jvm's lint wrappers

```bash
grep -n 'contrib_rules_jvm\|apple_rules_lint' MODULE.bazel
```

[`bazel-contrib/rules_jvm`](https://github.com/bazel-contrib/rules_jvm)
(`contrib_rules_jvm`) ships `java_test_suite` (a macro generating one
`java_test` per `*Test.java` file plus a wrapping `test_suite`) and
`java_junit5_test` (a `java_test` drop-in using JUnit5 rather than JUnit4,
with `include_tags`/`exclude_tags`/`include_engines`/`exclude_engines`), and
lint wrappers — `checkstyle_config`/`checkstyle_binary`,
`pmd_ruleset`/`pmd_binary`, `spotbugs_config`/`spotbugs_binary` — that plug
into a **separate** ruleset, `apple_rules_lint`, via `lint_setup` (WORKSPACE)
or a `linter` module extension (Bzlmod): `contrib_rules_jvm`'s own
`MODULE.bazel` registers itself this way
(`linter.register(name = "java-checkstyle")`, etc.), confirming the wrapper
mechanism is bzlmod-native at the ruleset's current pin (0.31.0), not a
WORKSPACE-only relic. The README states linting is "opt-in": with no
`lint_setup`/`linter` wiring, "everything will continue working just fine and
no additional lint tests will be generated."

**DECIDE (c):** CONSIDER, not MUST or SHOULD. Three reasons, all measured:
(1) zero of the 32 exemplars in this corpus reference `contrib_rules_jvm` or
`apple_rules_lint` in any `MODULE.bazel` — this is an unadopted pattern in
the very corpus this program treats as ground truth, not a validated one;
(2) it is a third linting framework layered on top of two this rule set
already treats as settled — Error Prone (JavaBuilder-integrated, §7) and the
Gradle-side checkstyle/PMD/SpotBugs equivalents already covered in the
JAVA-LINT family (`jvm-quality-gates.md`) — so adopting it under Bazel means
running the same class of check through a third integration surface with its
own config-rule vocabulary (`checkstyle_config`, `spotbugs_config`); (3) the
ruleset's own README frames adoption as fully optional with no functional
loss from skipping it. `java_test_suite` and `java_junit5_test` are more
directly useful on day one (JUnit5 under Bazel has no first-party `rules_java`
equivalent), but they are a separate decision from the lint wrappers and are
not blocked by this CONSIDER.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| BZL-JAVA-11 | Treat `contrib_rules_jvm`'s checkstyle/PMD/SpotBugs wrappers as a project decision to record, not a default to reach for — adopt only when a repository's linting need already exceeds what Error Prone plus the Gradle-side JAVA-LINT checks cover, and record the `apple_rules_lint` dependency explicitly when it is added. | Zero corpus adoption plus a third framework's worth of integration surface is a real ongoing cost (a `linter` module extension, per-language `*_config` rules, its own report format) for a check category this rule set already has two other answers for. | `grep -n 'bazel_dep(name = "contrib_rules_jvm"\|bazel_dep(name = "apple_rules_lint"' MODULE.bazel`. **Presence with no comment naming what gap it closes beyond Error Prone/JAVA-LINT is the finding to raise in review, never a mechanical failure; absence is the default and needs no justification.** | CONSIDER |

## Normative guidance candidates

1. **Pin all four version flags in every root `.bazelrc`** —
   `--java_language_version`, `--java_runtime_version`,
   `--tool_java_language_version`, `--tool_java_runtime_version` — never rely
   on Bazel's baked-in defaults (`11`/`local_jdk`/`11`/`remotejdk_11`).
   *Rationale:* an unpinned build silently follows whatever floor this Bazel
   version ships with, and `local_jdk` is machine-dependent by definition.
   *Verify:* `grep -n -E '(tool_)?java_(language|runtime)_version' .bazelrc*`
   — all four present is the pass, any absent is the finding (BZL-JAVA-01–04).
2. **Prefer `remotejdk_*` over `local_jdk` for `--java_runtime_version`**
   unless local compilation is a deliberate, documented choice.
   *Rationale:* `local_jdk` produces binaries whose behavior depends on the
   build machine's installed JVM. *Verify:* the same grep — a `local_jdk`
   value (or no value, since it is the default) with no adjacent comment
   explaining why is the finding.
3. **Express a below-toolchain bytecode target with `--javacopt="-source N
   -target N"`, never by lowering `--java_language_version`.**
   *Rationale:* lowering the language-version flag also changes which
   `java_toolchain` Bazel resolves via `source_version` matching, silently
   dropping any `package_configuration` wired to the higher-version
   toolchain. *Verify:* confirm `--java_language_version` matches the
   toolchain's intended `source_version`, and that any downward bytecode
   target is a separate `--javacopt` line, not the version flag itself.
4. **Never set `forcibly_disable_header_compilation = True` without a
   recorded reason**, and never describe header compilation as "ijar-based"
   — the default toolchain's header compiler is `turbine`
   (`TurbineDirect`/`turbine_direct`), which parses source directly rather
   than stripping an already-compiled jar. *Verify:*
   `grep -n forcibly_disable_header_compilation **/*.bzl`; empty is the pass.
5. **Confirm the strict-deps flag's name on your own pinned binary before
   writing it** — `bazel.build/reference/command-line-reference` and
   `bazel.build/docs/user-manual` disagree
   (`--experimental_strict_java_deps` vs `--strict_java_deps`); only the
   experimental-prefixed spelling has exemplar evidence
   (`rules_jvm_external`). *Verify:* `bazel help build --long` and
   `bazel help startup_options`, both greped for `strict_java_deps`; neither
   hitting is the finding.
6. **Do not read an absent strict-deps flag as "unenforced" in review** — per
   Bazel's own docs, `default` (the unset value) is behaviorally identical to
   `strict` and `error`; only `off` or `warn` weaken it. *Verify:* the flag's
   value, if present, is one of `default|strict|error` (pass) or `off|warn`
   (finding to justify).
7. **Wire Error Prone severity through `--javacopt="-Xep:<Check>:<SEVERITY>"`
   or `java_package_configuration` + `package_group`, never as a `maven`
   dependency or a patched `java_toolchain`.** *Rationale:* Error Prone ships
   no Bazel config of its own (no `MODULE.bazel`/`WORKSPACE`/`BUILD` in its
   repository) and is already baked into JavaBuilder. *Verify:*
   `grep -rn 'error_prone_core\|error-prone-core' MODULE.bazel
   maven_install.json` — any hit beyond `error_prone_annotations` is the
   finding.
8. **When two `local_java_repository`/`remote_java_repository` definitions
   target the same OS/CPU pair, register the intended default first and
   comment why** — Bazel resolves ties by registration order, not
   specificity. *Verify:* read every matching `register_toolchains()` call in
   evaluation order; two matches with no ordering comment is the finding.
9. **Give any first-party compiler plugin or annotation processor reading
   `com.sun.tools.javac.*` its own `--jvmopt="--add-exports=<module>/<pkg>=ALL-UNNAMED"`**
   rather than assuming JavaBuilder's own `--patch_module` covers it.
   *Verify:* grep the processor's sources for the internal import, confirm a
   matching `--add-exports` in `--jvmopt`/`--host_jvmopt`.
10. **Treat `contrib_rules_jvm`'s checkstyle/PMD/SpotBugs wrappers as a
    CONSIDER, not a default** — zero corpus adoption, and it layers a third
    linting framework (`apple_rules_lint`) atop Error Prone and the
    Gradle-side JAVA-LINT checks this program already covers. *Verify:*
    `grep -n 'contrib_rules_jvm\|apple_rules_lint' MODULE.bazel`; presence
    with no stated gap it closes is the finding to raise in review.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| #1 (pin all four flags) | `bazelbuild/bazel@948b8c70e2:.bazelrc:70-73` (25/25/25/25); `rules_java@4206909b6d:.bazelrc:4-7` (8/8/8/8); `rules_jvm_external@449754dcbb:.bazelrc:3-7` (17/17/17/17); `dagger@4fbc045d2b:.bazelrc:17-28` (17/17/17/17) | `rules_kotlin@7c51dd1210:.bazelrc:9-10` pins runtime only, no language version; `grpc-java@fc4314419d:.bazelrc:1-3` pins nothing at all |
| #2 (remotejdk over local_jdk) | Every pinning exemplar above uses `remotejdk_*` for the runtime pair; none uses `local_jdk` | — |
| #3 (bytecode split via javacopt) | `dagger@4fbc045d2b:.bazelrc:17-24` — toolchain at 17, `--javacopt="-source 8 -target 8"` for output | No corpus exemplar demonstrates the wrong form (lowering `--java_language_version` instead) — this is a hypothetical failure mode drawn from the doc's own stated toolchain-selection mechanism, not an observed one |
| #5/#6 (strict deps naming and default-is-strict) | `rules_jvm_external@449754dcbb:.bazelrc:9` — `--experimental_strict_java_deps=strict`, the only exemplar to set it explicitly | The other five exemplars leave it unset — under the documented semantics this is not "unenforced," but nothing in any of their `.bazelrc` files says so, which is exactly the review trap #6 names |
| #7 (Error Prone via javacopt) | `dagger@4fbc045d2b:.bazelrc:11-13` — `-Xep:BetaApi:ERROR` on both `--javacopt` and `--host_javacopt` | `google/error-prone` itself: `git ls-tree HEAD` at the pinned SHA returns no `MODULE.bazel`, `WORKSPACE` or `BUILD` — confirms the "consumed, not depended on" framing directly, by absence |
| #9 (add-exports for javac internals) | `dagger@4fbc045d2b:.bazelrc:26` — `--jvmopt="--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"` | — |
| #10 (contrib_rules_jvm as CONSIDER) | `bazel-contrib/rules_jvm`'s own `MODULE.bazel` uses the `linter` extension on itself (dogfooding) | Zero of the six Bazel-pinned exemplars in this dive (`bazel`, `rules_java`, `rules_kotlin`, `rules_jvm_external`, `dagger`, `grpc-java`) reference `contrib_rules_jvm` or `apple_rules_lint` |

## Gaps

- Neither `bazel help build --long` nor `bazel help startup_options` could be
  run in the research environment (no `bazel` binary installed, by design of
  this program). Candidate #5's strict-deps naming conflict is therefore
  reported as a doc-vs-doc contradiction plus one exemplar's practice, not as
  a binary-confirmed answer — re-run the two help surfaces on your own pin
  before trusting either flag spelling.
- `bazel-and-java`'s own prose states the "default options for javac" are
  `-source 8 -target 8 -encoding UTF-8`, two sections after stating
  `--java_language_version`'s default is `11` — these cannot both be live
  defaults on the same toolchain, and the corpus offers no way to determine
  which sentence is stale from outside Bazel's own source. Treat the
  `-source 8 -target 8` sentence as unverified legacy prose, not a default to
  design around.
- `--extra_toolchains=@local_jdk//:all`'s vendor-compatibility caveat ("may
  not work on JDK of arbitrary vendors") names no specific vendor pairing
  that is known to fail; a claim naming Temurin/Corretto/GraalVM specifics
  here would be invented.
- No exemplar in this six-repository dive uses `local_java_repository`'s or
  `remote_java_repository`'s multi-definition-collision path directly — §8's
  rule is drawn from the documented resolution order, not from an observed
  collision in the corpus. The rule stands on the primary source's own text,
  not on exemplar confirmation.
- Whether Bazel 9's `--incompatible_language_version_bootclasspath` flag
  (seen in `bazelbuild/bazel@948b8c70e2:.bazelrc:75`, "use a bootclasspath
  version matching the language version") changes anything material to
  `--patch_module`/`-Xbootclasspath` in §9 was not run down — it is named in
  one exemplar's own `.bazelrc` with no further citation and would need its
  own read of the flag's `bazel help` entry to place correctly.

## AI-agent angle

1. **Setting `--java_version` or `--tool_java_version`** by analogy with a
   single combined flag name — neither exists; the four real flags are
   `--java_language_version`, `--java_runtime_version`,
   `--tool_java_language_version`, `--tool_java_runtime_version`, and a
   made-up name silently no-ops rather than erroring. **Mechanical check:**
   `grep -n -E '\-\-(tool_)?java_version' .bazelrc*` — any hit is the mistake
   ([§1](#1-the-two-flag-pairs-and-their-defaults)).
2. **Calling header compilation "ijar-based"** because `bazel-and-java`'s own
   prose only names `ijar` in that section, when the default toolchain's
   header compiler is `turbine`. **Mechanical check:** read the
   `header_compiler`/`header_compiler_direct` attributes on the toolchain in
   use, or `bazel aquery 'mnemonic("Turbine", //...)'` on your own pin
   ([§5](#5-header-compilation-ijar-vs-turbine)).
3. **Inventing a `--strict_java_deps` or `--experimental_strict_java_deps`
   spelling from memory without checking either help surface**, given that
   Bazel's own two doc pages disagree — a model trained on one page and
   quizzed after training on the other will confidently produce the wrong
   one. **Mechanical check:** `bazel help build --long | grep -i
   strict_java_deps` on the pinned binary before writing the flag anywhere
   ([§6](#6-strict-deps)).
4. **Reporting "strict deps is off" from an absent `.bazelrc` line** — the
   unset default already errors on missing direct dependencies; a model
   pattern-matching "no flag set = feature disabled" gets this backwards for
   this specific flag. **Mechanical check:** re-read the exact wording of
   whichever strict-deps doc entry is in front of you before asserting
   enforcement status; do not infer it from flag presence alone
   ([§6](#6-strict-deps)).
5. **Trying to add Error Prone as a `maven_install`/`bazel_dep` artifact**
   because that is how every other JVM tool in this program gets pulled in —
   `google/error-prone` has no Bazel config to depend on at all; the only
   real integration surface is `--javacopt`/`java_package_configuration`.
   **Mechanical check:** `grep -rn 'error_prone_core' MODULE.bazel
   maven_install.json` — any hit is the tell
   ([§7](#7-error-prone-under-bazel)).
6. **Assuming a more specific JVM registration wins toolchain resolution**
   (reasoning by analogy with platform `constraint_values` specificity
   elsewhere in Bazel) when the documented rule for same-OS/CPU JVM
   definitions is pure registration order. **Mechanical check:** read every
   matching `register_toolchains()` call in file/declaration order rather
   than reasoning about which definition "looks more specific"
   ([§8](#8-toolchain-resolution-order)).
7. **Lowering `--java_language_version` to ship older bytecode**, missing
   that it also re-selects the toolchain via `source_version` matching,
   rather than reaching for `--javacopt="-source N -target N"` on top of an
   unchanged, modern `--java_language_version`. **Mechanical check:** confirm
   any downward bytecode target is expressed as a `javacopt`, and that
   `--java_language_version` still matches the intended toolchain's
   `source_version` ([§4](#4-the-bytecode-target-below-toolchain-split)).

## Contested / evolving

- **The strict-deps flag's canonical name.** `command-line-reference` still
  calls it experimental; `user-manual` drops the prefix entirely. Neither
  page states a deprecation or rename timeline for the other spelling, and
  the only exemplar that sets it explicitly uses the experimental-prefixed
  form. This reads as an unfinished rename inside Bazel's own documentation
  rather than a live behavioral choice — track it against whichever spelling
  `bazel help` actually accepts on the pin in use, and re-check on every
  Bazel version bump.
- **Whether `--tool_java_language_version`/`--tool_java_runtime_version`'s
  `11`/`remotejdk_11` floor will move.** Nothing in the fetched primary
  sources dates this default or promises it will track a supported-LTS
  window; `rules_java`'s own deliberate 8-pin for its *application* pair (not
  the tool pair) shows the ecosystem already treats old floors as a
  compatibility commitment worth keeping explicit rather than assuming
  Bazel's baked-in default will age gracefully on its own.
- **`bazel-and-java`'s stale "default javac options" sentence.** Documented
  here as a Gap rather than a contested practice, because it looks like an
  editing error (two defaults for the same thing, two paragraphs apart) more
  than an evolving one — but it has not been fixed as of this measurement
  (2026-09-05 `dateModified` on the page) and should be re-checked at the
  next research pass rather than assumed corrected.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java) | Official Bazel Java platform guide | `dateModified: 2026-09-05` | Primary source for the two flag pairs' names, `ijar`, `--patch_module`/`-Xbootclasspath`, `java_package_configuration`, and the toolchain resolution-order rule; also the source of the stale-default contradiction noted in Gaps |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | Official Bazel CLI/user manual | fetched 2026-09-12 | The only page with exact, self-consistent numeric defaults for all four version flags and the full strict-deps semantics (`default`=`strict`=`error`) |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | Official generated flag reference | fetched 2026-09-12 | Confirms `--experimental_strict_java_deps`'s exact value set and default string, and its disagreement with user-manual's naming |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Official Bazel 9 LTS announcement | 2026-01-20 | Confirms the Bzlmod-only, Starlarkified-rules framing behind the explicit-load non-negotiable this file's examples follow; contains no Java-specific flag changes itself |
| [github.com/bazelbuild/rules_java](https://github.com/bazelbuild/rules_java) (README, `MODULE.bazel`) | rules_java's own repository | fetched 2026-09-12 | Confirms the explicit-load pattern (`load("@rules_java//java:java_library.bzl", "java_library")`) and `bazel_compatibility = [">=7.0.0"]` |
| [github.com/bazel-contrib/rules_jvm](https://github.com/bazel-contrib/rules_jvm) (README, `MODULE.bazel`) | contrib_rules_jvm's own repository | fetched 2026-09-12; pin 0.31.0 | Primary source for `java_test_suite`, `java_junit5_test`, the lint wrapper rules, and its own bzlmod-native `linter` extension usage |
| [github.com/bazelbuild/bazel@948b8c70e2:.bazelrc](https://github.com/bazelbuild/bazel/blob/948b8c70e2/.bazelrc) | Bazel's own build config | measured 2026-09-12 | Only exemplar pinning all four flags at a single high version (25), with a `LINT.IfChange`/`LINT.ThenChange` pair keeping the flag and toolchain target in sync |
| [github.com/bazelbuild/rules_java@4206909b6d:.bazelrc](https://github.com/bazelbuild/rules_java/blob/4206909b6d/.bazelrc) | rules_java's own build config | measured 2026-09-12 | Deliberate Java-8 pin with an explicit "must keep building for old callers" rationale in-file |
| [github.com/bazelbuild/rules_kotlin@7c51dd1210:.bazelrc](https://github.com/bazelbuild/rules_kotlin/blob/7c51dd1210/.bazelrc) | rules_kotlin's own build config | measured 2026-09-12 | Partial-pin exemplar: runtime only, no language-version line |
| [github.com/bazel-contrib/rules_jvm_external@449754dcbb:.bazelrc](https://github.com/bazel-contrib/rules_jvm_external/blob/449754dcbb/.bazelrc) | rules_jvm_external's own build config | measured 2026-09-12 | Only exemplar to set the strict-deps flag explicitly, alongside a full four-flag pin |
| [github.com/google/dagger@4fbc045d2b:.bazelrc](https://github.com/google/dagger/blob/4fbc045d2b/.bazelrc) | dagger's own build config | measured 2026-09-12 | Source of the bytecode-target-below-toolchain split, the Error Prone severity override, and the `--add-exports` javac-internals pattern, all in one file |
| [github.com/grpc/grpc-java@fc4314419d:.bazelrc](https://github.com/grpc/grpc-java/blob/fc4314419d/.bazelrc) | grpc-java's own build config | measured 2026-09-12 | The zero-pin counterexample driving decision (a) |
| [github.com/google/error-prone](https://github.com/google/error-prone) | error-prone's own repository | measured 2026-09-12 | Confirms by absence: no `MODULE.bazel`, `WORKSPACE` or `BUILD` at the pinned SHA — Maven-built, Bazel-consumed |
| `jvm-distribution.md` (this program) | Internal consolidation, GRADLE-DIST family | 2026-09-12 | Owns the shading/merge failure taxonomy that M-X-08 inherits (DIST-02..DIST-11); cited by reference in [§10](#10-deployjar-and-the-shading-taxonomy-by-reference), not restated |
| `jvm-quality-gates.md` (this program) | Internal consolidation, JAVA-LINT family | 2026-09-12 | Owns the Error Prone check-promotion list (JAVA-LINT-02); this file owns only the Bazel plumbing around it |
| `bazel-quality.md` / `bazel-quality/rust.md` (this program) | Sibling index and per-language exemplar | 2026-09-12 | The gate, the 19 non-negotiables, and the shape this file mirrors section-for-section |
