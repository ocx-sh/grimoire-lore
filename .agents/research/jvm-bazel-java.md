---
title: "Bazel: the file the sibling set does not have"
topic: "Java and Kotlin under Bazel — rules_java toolchains, rules_jvm_external pinning, rules_kotlin traps, deploy jars (family BZL-JAVA)"
model: opus
id_family: BZL-JAVA
consolidates:
  - jvm-bazel-java/bazel-java-toolchains-and-compilation.md
  - jvm-bazel-java/bazel-java-external-deps-and-kotlin.md
  - jvm-bazel-java/bazel-java-testing-and-coverage.md
date: 2026-09-12
revised: 2026-09-12
---

# Bazel: the file the sibling set does not have

Measured against Bazel 8.7.0 / 8.8.0 / 9.2.0, `rules_jvm_external` 7.1
(2026-07-23), `rules_kotlin` v2.4.10 (2026-08-20), `contrib_rules_jvm` 0.31.0
(pre-1.0, no tagged releases), and the six genuinely Bazel-carrying exemplars of
the 32-repo corpus ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 4).
No `bazel` binary was run; every flag name carries the doc or exemplar it was
read from.

## Verdict

1. **This family exists only if the owner says yes (Q6).** `bazel-topic-map.md`
   calls its twelve `BZL-` depth files finalized and names
   `rules_java`/`rules_kotlin` explicitly out of scope
   ([cfg](jvm-audit/config-inventory.md) §2.1). Everything below is drafted to
   ship as `rules/bazel-quality/java.md` with **no glob of its own** — it routes
   into `bzlmod.md`, `hermeticity.md`, `caching-rbe.md`, `testing.md`,
   `flags-and-versions.md` and `architecture.md` rather than restating them
   ([cfg](jvm-audit/config-inventory.md) §2.3). If declined, this file is the
   backlog record and `BZL-JAVA` is never allocated.
2. **Pinning all four JDK version flags is a MUST, and `grpc-java` is not a
   counterexample — it is unmeasured exposure.** An unpinned build takes
   `local_jdk` for execution (machine-dependent by definition) and Bazel's own
   baked-in `11`/`remotejdk_11` for the tool pair. Binds every consumer kind
   that has a `.bazelrc`.
3. **A below-toolchain bytecode target is a `--javacopt`, never a lowered
   `--java_language_version`** — the version flag also re-selects the
   `java_toolchain` via `source_version` matching, silently dropping any
   `package_configuration` wired to the higher toolchain. Binds libraries and
   SDKs that must run on old runtimes (`dagger`'s exact situation).
4. **`fail_if_repin_required = True` is a MUST, not a style preference**, and the
   ruleset that ships the flag does not set it on its own resolution
   (`rules_jvm_external@449754dcbb:MODULE.bazel:81-86`, re-measured here). The
   default is `False`; without it both lock-file self-checks are warnings the
   build survives. This is the single highest-yield row in the family.
5. **`strict_visibility = True` is promoted from the dive's CONSIDER to a
   SHOULD.** Three of the four exemplars carrying a real external Maven graph
   set it; the one that does not is `dagger`. Applies to any repo with more than
   one person editing the `artifacts` list.
6. **`x_lambdas = "indy"` is a MUST wherever the *same* Kotlin sources are also
   compiled by Gradle, and `dagger` is a confirmed violation, not a silent
   default.** Verified here: the same `.kt` files are globbed by
   `compat_kt_jvm_library` and compiled again by a `kotlinJvm` Gradle module.
   Bazel-only Kotlin repos get a SHOULD.
7. **`_deploy.jar` gets its own rule, against the toolchains dive's decision to
   defer M-X-08 entirely.** The shading taxonomy is correctly inherited from
   `jvm-distribution.md` DIST-02..DIST-11, but Bazel adds residue that file
   cannot carry: per bazel.build/reference/be/java, `name_deploy.jar` is an
   implicit output **"only built if explicitly requested"** — a green
   `bazel build //...` never builds the artifact you ship. Binds CLIs and
   applications; never libraries.
8. **The strict-deps rule splits in two, and its severities invert the dive's.**
   Confirming the flag's contested name is demoted to SHOULD (its verification
   needs a `bazel` binary this program does not have and an adopting agent
   often will not either); the MUST moves to the misreading that licenses a real
   edit — an absent flag already means `error`, so "strict deps isn't enforced
   here, let me set it" ends in `=off`.
9. **Error Prone under Bazel is a compiler flag, never a dependency.**
   `google/error-prone` ships no `MODULE.bazel`/`WORKSPACE`/`BUILD` at all
   ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) headline 11) — it is
   Maven-built and Bazel-consumed, so an agent sent to copy its Bazel wiring
   finds nothing and invents a `maven_install` coordinate instead.
10. **The dual-build source-of-truth question gets a reading heuristic and
    nothing stronger.** Nothing in the corpus verifies Gradle/Bazel graph
    parity; `dagger`'s answer is a `CONTRIBUTING.md` sentence plus CI job
    ordering. Requiring a generator would assert a practice that exists nowhere
    it was measured.
11. **For the two OCX consumers the binding commitment is consumability, not
    adoption.** Neither the OCX JVM SDK nor the OCX Gradle plugin is a Bazel
    build; what binds is that the SDK's published coordinates must resolve
    through a pinned `maven.install`, and that an adopter carrying both
    `rules_ocx` and the OCX Gradle plugin lands squarely in BZL-JAVA-22's
    "name the canonical build" case.
12. **There is no first-party JUnit 5 rule, and `contrib_rules_jvm` splits in
    two — its test rules are unblocked, its lint wrappers are not.** `java_test`
    is JUnit-4-shaped (`main_class` + the implicit `name_deploy.jar`); the only
    maintained JUnit 5 path is `java_junit5_test` / `java_test_suite(runner =
    "junit5")`, which is a thin `java_test` wrapper carrying ~150 lines of
    already-correct Bazel test-protocol code (`ActualRunner.java`). Adopting it
    requires **no** `lint_setup()` and no `apple_rules_lint` config of your own —
    the ruleset's unconditional `bazel_dep(name = "apple_rules_lint")` is fetched
    transitively but generates nothing. **This changes BZL-JAVA-23 in place**: its
    old text made "record the `apple_rules_lint` dependency explicitly" part of
    the rule and its grep flagged a bare `bazel_dep(name = "contrib_rules_jvm")`,
    which would have made the now-recommended JUnit 5 adoption a review finding.
    BZL-JAVA-23 is now scoped to `lint_setup()`/`linter.register()` alone.
13. **Coverage is a documented GAP, not a rule waiting on research.** Bazel emits
    exactly one merged lcov file (`$(bazel info output_path)/_coverage/_coverage_report.dat`),
    never JaCoCo XML, and its command-line reference contains **no** numeric-floor
    flag of any kind — no `--coverage_threshold`, no `--fail_under`, no
    `--minimum_coverage`. There is no per-target coverage signal to hang a floor
    on either, because the combined report is the only artifact regardless of how
    many test targets ran. `JAVA-TEST-10`'s JaCoCo-`BRANCH` floor
    ([jvm-quality-gates.md](jvm-quality-gates.md)) therefore does not transfer:
    any floor over a Bazel build is a CI script over the `.dat` file, outside
    Bazel's exit code. [bazelbuild/bazel#12159](https://github.com/bazelbuild/bazel/issues/12159)
    (a richer JVM coverage format) was closed `not_planned` 2024-06-29, so this is
    a maintainer-settled door, not an open one — the gap is permanent and belongs
    in the guidance as a fact, not as a backlog item.

## The ruleset

### BZL-JAVA

One family, grouped by the check that catches each row. MUST = Block,
SHOULD = Warn, CONSIDER = Suggest. **pinned** marks a default an adopter
overrides once in their own `.bazelrc`, never per target.

#### Group A — what the root `.bazelrc` pins

Check: `grep -n -E '^\s*(common|build)(:\S+)?\s+--(tool_)?java_(language|runtime)_version|--javacopt' .bazelrc*`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-01 | Pin all four version flags in the root `.bazelrc` — `--java_language_version`, `--java_runtime_version`, `--tool_java_language_version`, `--tool_java_runtime_version` — and never write `--java_version` or `--tool_java_version`, which do not exist. | Bazel compiles with one JDK/JVM pair and executes with a second, independently configured pair; unset, they take `11` / `local_jdk` / `11` / `remotejdk_11`, so an unpinned repo is one Bazel upgrade away from a silent floor change with no line in any diff. A made-up combined flag name silently no-ops rather than erroring. | The grep above: **all four present is the pass; any absent is the finding.** A hit on `--java_version`/`--tool_java_version` is a separate, harder finding — that line does nothing at all. | MUST | Bazel 8.x |
| BZL-JAVA-02 | Give both runtime flags a `remotejdk_*` value; treat `local_jdk` (explicit or defaulted) as a finding unless an adjacent comment says why local compilation is deliberate. | `local_jdk` resolves through `JAVA_HOME`/`PATH`, so "the resulting binaries depend on what is installed on the machine" (bazel-and-java) — two developers on two JDK vendors get two different test runs from the identical BUILD graph. | Same grep; read the **values**. `local_jdk` or absence is the finding. The documented opt-in escape hatch is `--extra_toolchains=@local_jdk//:all`, which must appear with the comment. | MUST | Bazel 8.x |
| BZL-JAVA-03 | Express a bytecode target below the toolchain as `--javacopt="-source N -target N"` on top of an unchanged, modern `--java_language_version`; never by lowering `--java_language_version` itself. | `--javacopt` is applied after Bazel's built-in javac defaults and "the last specification of any option to javac wins" (user-manual), so it changes only the emitted class-file version. Lowering the language flag also changes *which* `java_toolchain` resolves, via `source_version` matching — silently dropping any `package_configuration` wired to the higher toolchain. | `grep -n -B2 -A2 'javacopt.*-source\|javacopt.*-target' .bazelrc*` — a downward target present as a `javacopt` alongside a high `--java_language_version` is the pass; a low `--java_language_version` beside a high `--tool_java_language_version` is the finding. Exemplar: `dagger@4fbc045d2b:.bazelrc:22-28`. | MUST | Bazel 8.x |

#### Group B — strict deps and Error Prone

Check: `grep -n -E 'strict_java_deps|explicit_java_test_deps|javacopt.*-Xep|java_package_configuration' .bazelrc* **/*.bzl **/BUILD*`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-04 | Never conclude "strict deps is not enforced here" from an absent flag, and never add `=off` or `=warn` to make a build pass. `default` (the value when the flag is absent), `strict` and `error` are three names for the same behaviour. | Per bazel.build/docs/user-manual, all three "mean javac will generate errors instead of warnings… also the default behavior when the flag is unspecified." An agent pattern-matching "no flag = feature disabled" inverts a review finding and then fixes a real missing-`deps` bug by disabling the check that found it. | Grep for the flag. **Absence, or a value in `default|strict|error`, is the pass; `off` or `warn` is the finding to justify.** Five of six exemplars leave it unset and are all enforcing. | MUST | Bazel 8.x |
| BZL-JAVA-05 | Write the flag as `--experimental_strict_java_deps` — the only spelling with exemplar evidence — and confirm it on the pinned binary (`bazel help build --long \| grep -i strict_java_deps`) before relying on it, whenever a `bazel` binary is available. | Bazel's own two docs pages disagree: `command-line-reference` lists `--experimental_strict_java_deps`, `user-manual` calls it `--strict_java_deps`. A model trained on one page and quizzed after the other produces the wrong name confidently. `rules_jvm_external@449754dcbb:.bazelrc:9` is the only corpus repo that sets it at all. | The `bazel help` grep on the pin: **empty on both help surfaces is the finding** (no such flag on this binary); a hit on exactly one confirms the live spelling. Where no binary is available, the exemplar-evidenced spelling is the default to write. | SHOULD | Bazel 8.x |
| BZL-JAVA-06 | Wire Error Prone severity through `--javacopt="-Xep:<Check>:<SEVERITY>"` (build-wide) or `java_package_configuration` + `package_group` (scoped); never through a `bazel_dep`, `maven.install` coordinate on `com.google.errorprone:error_prone_core`, or a patched `java_toolchain`. | Error Prone is baked into JavaBuilder's compilation toolchain, not pulled in by `deps`. `google/error-prone` ships no `MODULE.bazel`, `WORKSPACE` or `BUILD` at its pinned SHA, so there is no Bazel integration surface to depend on — the javac flag surface is the only reachable knob. The check *list* is settled Gradle-side at `jvm-quality-gates.md` JAVA-LINT-02; this row owns only the plumbing. | `grep -rn 'error_prone_core\|error-prone-core' MODULE.bazel maven_install.json` — **any hit that is not a transitive `error_prone_annotations` is the finding.** Then confirm a `-Xep:` override actually appears in `--javacopt`, `--host_javacopt` or a `java_package_configuration`'s `javacopts`; none of the three is the finding. Exemplar: `dagger@4fbc045d2b:.bazelrc:17-18`. | MUST | Bazel 8.x |

#### Group C — toolchain definition and registration

Check: read every `default_java_toolchain(...)` and `register_toolchains(...)` in evaluation order

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-07 | Never set `forcibly_disable_header_compilation = True` without a recorded reason, and never describe Bazel's header compilation as "ijar-based". The default toolchain's header compiler is **turbine** (`header_compiler = TurbineDirect`). | `ijar` strips an *already-compiled* jar down to its API surface; `turbine` parses Java **source** and emits a header jar without invoking javac's back end at all. That difference is why a downstream target's header compile does not wait on its dependencies' bodies. Disabling it reverts every dependent to full recompilation of every upstream body on every rebuild. | `grep -n forcibly_disable_header_compilation **/*.bzl` — **empty is the pass; a hit with no comment naming why is the finding.** Then `bazel aquery 'mnemonic("Turbine", //your/target)'` on your own pin should list one `Turbine` action per Java compilation unit; **empty output there, on a toolchain that has not disabled header compilation, is itself a finding to escalate**, not a pass. | SHOULD | Bazel 8.x |
| BZL-JAVA-08 | When more than one `local_java_repository`/`remote_java_repository` matches the same OS/CPU pair, register the intended default **first** and say so in a comment next to the registration. Never rely on "more specific wins". | bazel-and-java states it flatly: "When multiple definitions for the same operating system and CPU architecture are given, the first one is used." Nothing in the Starlark syntax signals that a registration loses to an earlier one, and a later `bazel_dep`'s module extension can call `register_toolchains` before the root module's own call. | Read every `register_toolchains(...)` targeting `@rules_java//java:runtime_toolchain_type` or `:toolchain_type`, root module first then `bazel_dep`s in `MODULE.bazel` declaration order. **Two registrations matching the same OS/CPU with no ordering comment is the finding; one registration, or an explicit comment, is the pass.** | SHOULD | Bazel 8.x |
| BZL-JAVA-09 | Give a first-party annotation processor or javac plugin that reads `com.sun.tools.javac.*` its own `--jvmopt="--add-exports=<module>/<package>=ALL-UNNAMED"`. Never try to add to or change JavaBuilder's `--patch_module` invocation. | `--patch_module` is computed and applied by JavaBuilder itself from the JDK major version (and `-Xbootclasspath` on JDK 8) for *its own* internal access — strict deps, header compilation, Error Prone. There is no attribute to append to it. `--add-exports` is what JDK 16+ strong encapsulation actually exposes. | Grep the processor's sources for the internal import, then confirm a matching `--add-exports` in `--jvmopt`/`--host_jvmopt`. **A processor reading those internals with no matching line is the finding** — it either already fails on a strongly-encapsulated JDK or is quietly riding an older one. Exemplar: `dagger@4fbc045d2b:.bazelrc:34`. | MUST where such a processor exists; N/A otherwise | JDK 16+ |

#### Group D — `maven.install` and `maven_install.json`

Check: `grep -n -A8 'maven.install(' MODULE.bazel` and `git ls-files '*_install.json'`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-10 | Set `lock_file = "//:maven_install.json"` (or another explicit path) on every `maven.install` call, and commit the file. Each `install` tag needs its own `name` and its own lock file — sharing one across two tags is invalid, not merely discouraged. | Without `lock_file` there is no freshness check to gate at all: every clean checkout re-resolves online with no checksum verification, no SHA-256 integration with Bazel's downloader, no cross-workspace artifact sharing and no offline build after `bazel fetch @maven//...`. | The grep: a `maven.install(` block with no `lock_file =` is the finding. No `maven.install` at all is nothing to check. First pin needs `touch maven_install.json BUILD.bazel` then `REPIN=1 bazel run @maven//:pin`. | MUST | rules_jvm_external 5.x+ |
| BZL-JAVA-11 | Set `fail_if_repin_required = True` on every `maven.install` that carries a `lock_file`. | The default is `False` (`coursier.bzl:1683`), so **both** of the lock file's self-checks are advisory: an `__INPUT_ARTIFACTS_HASH` mismatch ("you edited `MODULE.bazel` and did not repin") and a `__RESOLVED_ARTIFACTS_HASH` mismatch ("this file was hand-edited or merge-desynced") each print a warning and the build **continues**, resolving whatever the stale lock says. Only this boolean turns either into a `fail()`. Unlike crate_universe's unconditional gate, here the missing thing is something to *add*. | `grep -n 'fail_if_repin_required' MODULE.bazel` — absent or `False` on a pinned `maven.install` is the finding; `True` is the pass. Self-verifying once set: deliberately stale the artifact list and confirm the documented `fail()` text reproduces. | MUST | rules_jvm_external 5.x+ |
| BZL-JAVA-12 | Never hand-edit `maven_install.json`, and never resolve a merge conflict in it by keeping one side, unioning, or splicing JSON. Discard both sides, resolve the conflicting `artifacts =`/`boms =` list in `MODULE.bazel`, and regenerate with `REPIN=1 bazel run @maven//:pin` (or `RULES_JVM_EXTERNAL_REPIN=1` to scope the repin). | The file opens `"__AUTOGENERATED_FILE_DO_NOT_MODIFY_THIS_FILE_MANUALLY"` and carries two generator-computed hashes over its own content with **no human-editable safe region** — unlike `MODULE.bazel.lock`'s `registryFileHashes`. A line-based merge produces a syntactically valid file whose hashes no longer match its body, and Git's textual conflict detector never fires. No schema-aware merge driver ships for this format. | `git check-attr merge maven_install.json '*_install.json'` — **any driver claiming to merge this file safely is the finding**; `bazel-lockfile-merge` is `MODULE.bazel.lock`-specific and pointing it here is itself a finding. BZL-JAVA-11 is the mechanical backstop for whatever a bad merge produces. | MUST | rules_jvm_external 5.x+ |
| BZL-JAVA-13 | Set `strict_visibility = True` on `maven.install`. | Without it every transitive dependency is visible to every target, so pruning the declared `artifacts` list can silently remove a jar some other target depended on without declaring — the failure surfaces later, elsewhere, with no link to the edit that caused it. Measured: set by three of the four exemplars carrying a real external Maven graph. | `grep -n 'strict_visibility' MODULE.bazel`; absent is the finding to raise. Per-repository override is `strict_visibility_value`. | SHOULD | rules_jvm_external 5.x+ |
| BZL-JAVA-14 | Set `version_conflict_policy = "pinned"` wherever the build claims deterministic resolution; document the choice once per `maven.install`, not per artifact. Use `maven.artifact(force_version = "true")` for a deliberate single exception. | `default` is Coursier's highest-wins across the whole graph — someone else's transitive request can outrank your explicit declaration, the Bazel analogue of unmanaged Maven mediation. `pinned` forces your declaration to win. Reuse `jvm-dependencies.md` GRADLE-DEP-09: pinning locks **resolution**, never legitimacy — neither setting vets any version, and the SHA-256 in the lock file is the actual integrity control. | `grep -n 'version_conflict_policy' MODULE.bazel`; absent means `default` applies — a finding only where the repository claims deterministic resolution elsewhere without qualifying it. | SHOULD | rules_jvm_external 5.x+ |
| BZL-JAVA-15 | Scope every exclusion to the narrowest correct mechanism: `maven.artifact(exclusions = [...])` for one top-level artifact's transitive closure, `excluded_artifacts` on `maven.install` only when the coordinate must be banned from the entire resolved graph. | The two are not interchangeable. A global `excluded_artifacts` entry can starve an unrelated target that legitimately needed the jar; a per-artifact `exclusions` entry leaves the coordinate reachable through any other top-level artifact that also pulls it in. | `bazel query 'somepath(//..., @maven//:<excluded_target>)'` after a build the exclusion is meant to affect — **a returned path the exclusion was supposed to sever is the finding.** | SHOULD | rules_jvm_external 5.x+ |
| BZL-JAVA-16 | Mark a codegen- or annotation-processor-only coordinate `neverlink = "true"` and a test-only one `testonly = "true"` via `maven.amend_artifact`. Never hand-edit the generated `java_import` target to add either. | `neverlink` keeps an artifact off the runtime classpath and out of any deploy jar; `testonly` restricts it to `testonly` consumers. A hand-edit to the generated target is silently overwritten on the next repin, so the attribute quietly disappears and a codegen-only jar leaks onto a production classpath with no build-time signal. | `grep -n 'neverlink\|testonly' MODULE.bazel` against `bazel query 'kind(java_import, @maven//...)'` for a target you know should carry one — a mismatch between intent and the amend list is the finding. | SHOULD | rules_jvm_external 5.x+ |
| BZL-JAVA-17 | Prefer the literal `@maven//:group_artifact` label over the `artifact("group:artifact")` macro in any BUILD file a `buildozer`-driven refactor or automated dependency-bump job will touch. | The macro's own docs: it "makes BUILD file refactoring with tools like `buildozer` more difficult, because the macro hides the actual target label at the syntax level." Tooling cost, not a correctness bug. | Reading heuristic: does this repo run `buildozer`, interactively or in a bump job? If yes, each `artifact(...)` call site is friction to flag — never a build-breaking finding. | CONSIDER | rules_jvm_external 5.x+ |

#### Group E — Kotlin under Bazel

Check: `grep -rn 'java_import(\|kt_kotlinc_options\|x_lambdas' --include=BUILD.bazel --include=BUILD --include='*.bzl' .`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-18 | Never let a Maven-resolved Kotlin jar reach a hand-rolled `java_import`. Resolve Kotlin coordinates only through `rules_jvm_external`'s `maven.install`, whose generated import detects `kotlin_module` entries and skips `ijar` automatically. | The native `ijar` "does not know about kotlin metadata with respect to inlined functions, and will remove method bodies inappropriately" (rules_kotlin README). An `inline fun` is spliced into the *caller's* bytecode, so the callee's body must be present at every downstream compilation. A codebase that happens not to call the affected function compiles clean while carrying a corrupted classpath entry; the bug lands months later with the first new caller. | `grep -rn 'java_import(' --include=BUILD.bazel --include=BUILD .` — a hand-written `java_import` whose `jars` names a jar containing `META-INF/*.kotlin_module` (`unzip -l <jar>`) is the finding. Coordinates reached via `@maven//:...` are already covered. **No version floor needed**: the Kotlin-aware import path landed in PR #69 (2019-03-26) and predates every supported release line. | MUST | any supported rules_jvm_external (5.x+) |
| BZL-JAVA-19 | Set `kt_kotlinc_options(x_lambdas = "indy")` explicitly wherever the same Kotlin sources are also compiled by Gradle. In a Bazel-only Kotlin repo this is a should-configure. | `kt_kotlinc_options` defaults `x_lambdas` to `"class"` (anonymous inner classes) while Kotlin 2.x's compiler default and Gradle's are both `"indy"` — so identical source produces different bytecode depending on which build ran it: different class counts, different stack frames, different results from any shrinker, bytecode-size budget or reflection-based harness. Leaving it unset in a dual build is not "using each tool's default"; it opts the Bazel leg alone into the outlier. `x_sam_conversions` already defaults to `"indy"` and needs nothing. | The grep above in a repo that also carries `build.gradle*` with a Kotlin plugin: `x_lambdas` unset or `"class"` in that combination is the finding. A Bazel-only repo is not a finding either way. | MUST with a Gradle leg over the same sources; SHOULD otherwise | rules_kotlin 2.x |
| BZL-JAVA-20 | Know that `KotlinCompile`, `KotlinKsp2` and `JdepsMerge` run under persistent, multiplexed workers **by default**, and reach for `--strategy=<mnemonic>=local` as the first diagnostic step when a Kotlin build is flaky or produces output stale relative to its declared inputs. | No flag turns these on — they already are. rules_kotlin claims a performance win and states no correctness caveat, so a reviewer who does not know the default has no reason to suspect worker-process state when triaging a Kotlin-specific flake. Narrower dial: `--experimental_worker_max_multiplex_instances=KotlinCompile=0`. | Reading heuristic: for any Kotlin build-flakiness report, confirm whether disabling the mnemonic's worker makes the symptom disappear **before** attributing it to source or dependency changes. | CONSIDER | rules_kotlin 2.x |

#### Group F — what ships, and which build is canonical

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-21 | Name every `//<pkg>:<name>_deploy.jar` you ship explicitly in the build and CI lane that is supposed to produce it. Never treat a green `bazel build //...` or `bazel test //...` as evidence that the deploy jar builds. | `name_deploy.jar` is an implicit output of `java_binary` — "only built if explicitly requested" (bazel.build/reference/be/java) — so it appears in no BUILD file and no wildcard build. Measured: 5/32 exemplars declare `java_binary(`, **1/32** has any `_deploy.jar` path anywhere ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2), which is what a target nobody names looks like. Its single-jar merge inherits the whole shading taxonomy at `jvm-distribution.md` DIST-02..DIST-11 — dropped `ServiceLoader` provider files, `SecurityException` at class-load from stale `META-INF/*.SF` after merging — so a deploy jar that is never built is also never tested against any of them. | `grep -rn '_deploy\.jar' .github/ *.bzl BUILD* 2>/dev/null` in a repo that declares `java_binary(` and ships an executable — **empty output beside a shipped binary is the finding.** Manifest additions go through `deploy_manifest_lines`. | MUST for CLI / application consumers; N/A for libraries | Bazel 8.x |
| BZL-JAVA-22 | In a repository building the same code under both Gradle and Bazel, require one prose line naming which build is canonical (`CONTRIBUTING.md` or top-level `README.md`). Do not require, and do not build, a generator or verifier proving the two dependency graphs agree. | Nothing in the corpus checks parity: neither `dagger` nor `grpc-java` generates one build's declarations from the other, and neither documents *why* it carries two. `dagger`'s answer is `CONTRIBUTING.md:29` plus CI job ordering (`needs: bazel-build`), which proves both builds succeed, never that their artifact sets agree. Asserting a stronger requirement would encode a practice measured nowhere. | `grep -rniE 'built with (bazel\|gradle)\|canonical build' CONTRIBUTING.md README.md` — presence is the pass, absence in a genuinely dual-build repo is the finding. Parity between graphs is out of scope for any mechanical check. | SHOULD | — |
| BZL-JAVA-23 | Treat `contrib_rules_jvm`'s checkstyle/PMD/SpotBugs **wrapper macros** as a project decision to record, not a default to reach for; adopt only where linting need already exceeds Error Prone plus the Gradle-side `JAVA-LINT` checks. The thing being decided is the `lint_setup()` / `linter.register()` call, not the `bazel_dep` — depending on `contrib_rules_jvm` for its test rules (BZL-JAVA-24/25) is a separate, already-settled decision and is not a finding here. | Zero of the 32 exemplars reference `contrib_rules_jvm` or `apple_rules_lint`, and the wrappers layer a **third** linting framework on two this program already answers. The ruleset's own README states linting is "opt-in: if there's no `lint_setup` call in your repo's `WORKSPACE` then everything will continue working just fine and no additional lint tests will be generated" — the wrappers are inert until configured. `rules_jvm_external` and `rules_jvm` are separate live repos — they have not merged. | `grep -n 'lint_setup(\|linter.register(\|linter.configure(' MODULE.bazel WORKSPACE` — presence with no comment naming the gap it closes beyond Error Prone/`JAVA-LINT` is a review finding, never a mechanical failure; absence needs no justification. **A bare `bazel_dep(name = "contrib_rules_jvm")`, or a transitively fetched `apple_rules_lint`, is not evidence of adoption** and must not be flagged (BZL-JAVA-25). | CONSIDER | contrib_rules_jvm 0.31.0 |

#### Group G — running tests and reading coverage

Check: `grep -rn 'java_junit5_test\|java_test_suite\|org.junit.jupiter' --include=BUILD.bazel --include=BUILD --include='*.bzl' .` and the CI lane that invokes `bazel coverage`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| BZL-JAVA-24 | Run JUnit 5 under Bazel through `bazel-contrib/rules_jvm`'s `java_junit5_test` (one class) or `java_test_suite(runner = "junit5", ...)` (a directory), and add `JUNIT5_DEPS` (or `JUNIT5_VINTAGE_DEPS`) from `@contrib_rules_jvm//java:defs.bzl` to `deps` explicitly. A hand-written `java_test(main_class = "your.Launcher")` is only acceptable if it demonstrably honours `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY`, `TEST_PREMATURE_EXIT_FILE` and the `TEST_SHARD_*` variables. | There is no first-party JUnit 5 rule: `rules_java`/`@bazel_tools` ship none, and `java_test`'s runner contract is JUnit-4-shaped. `java_junit5_test` is a thin `java_test` wrapper (`main_class = "…junit5.JUnit5Runner"`, fixed `runtime_deps`, a `-javaagent` trapping `System.exit`) over ~150 lines of Bazel test-protocol code in `ActualRunner.java`. A naive `LauncherFactory.execute()` main class *runs the tests* and silently breaks `--test_filter`, sharding, premature-exit detection and CI XML parsing — with no build error anywhere. The generated target ships **zero** JUnit 5 jars itself; `JUnit5Runner.main()` fails fast naming the missing coordinate. Caveat carried openly: `contrib_rules_jvm` is pre-1.0 and **0/6** Bazel-carrying exemplars use it, so this is prospective guidance resting on source-reading, not corpus-measured stability. | `grep -rn 'java_junit5_test\|java_test_suite' BUILD.bazel BUILD` must resolve its `load()` to `@contrib_rules_jvm//java:defs.bzl` and nothing else. Then: **a `java_test(` whose `deps`/`runtime_deps` name `org.junit.jupiter`/`org.junit.platform` artifacts while its `main_class` is not `com.github.bazel_contrib.contrib_rules_jvm.junit5.JUnit5Runner` is the finding**, unless the named launcher visibly reads all four env vars above. No JUnit 5 in the repo is nothing to check. | MUST where a JUnit 5 suite runs under Bazel; N/A otherwise | contrib_rules_jvm 0.31.0 |
| BZL-JAVA-25 | Never treat a transitively fetched `apple_rules_lint` as a linting adoption, and never add `lint_setup()` / `linter.register()` / a `checkstyle_test`/`pmd_test` target as part of a change whose purpose was JUnit 5 support. | `contrib_rules_jvm`'s own `MODULE.bazel` carries an unconditional (non-`dev_dependency`) `bazel_dep(name = "apple_rules_lint", version = "0.4.0")` so it can lint itself, so MVS fetches that module for anyone who depends on `contrib_rules_jvm` at all. **Fetching is not using**: no lint target, no build action and no extension call is generated until the consumer writes the call themselves. An agent that reads the transitive dep as "linting is now on, let me configure it" turns a test-only PR into a linting-policy PR and lands squarely in BZL-JAVA-23's CONSIDER without anyone having decided it. | `grep -n 'lint_setup(\|linter.register(' MODULE.bazel WORKSPACE` — **absence is the correct default and needs no justification**; presence alongside `java_junit5_test` usage is a deliberate second decision to review against BZL-JAVA-23. Diff-review half: a PR titled "add JUnit 5 tests" that also touches a `linter.*` block is doing two unrelated things. | SHOULD | contrib_rules_jvm 0.31.0 |
| BZL-JAVA-26 | Treat the single merged `$(bazel info output_path)/_coverage/_coverage_report.dat` from `bazel coverage --combined_report=lcov //...` as the only Java coverage artifact Bazel produces, and enforce any numeric floor as an explicit CI step parsing that lcov file. Never as a Bazel flag, never per-target, and never by expecting a JaCoCo XML/HTML report. | The output is **lcov only** ("At this point only LCOV is supported") and there is exactly one combined report no matter how many test targets ran — so there is no per-`java_test` pass/fail signal a floor can attach to. Bazel's command-line reference has no `--coverage_threshold`, `--fail_under` or `--minimum_coverage`: `bazel coverage` fails when a *test* fails, never because a percentage was low. `JAVA-TEST-10`'s floor ([jvm-quality-gates.md](jvm-quality-gates.md)) is written against JaCoCo `BRANCH` XML counters — a shape Bazel never emits — so a CI step written to glob `**/jacocoTestReport.xml` after `bazel coverage` finds nothing and **passes vacuously**. Only passing tests contribute to the report. The JaCoCo wiring that does exist (`JacocoCoverageRunner`, `JACOCO_METADATA_JAR`, `JAVA_COVERAGE_FILE`) lives in Bazel's source, not in any prose contract, and exposes no configuration knob. | `grep -rn 'jacoco\|\.xml' <ci-file>` in the lines following a `bazel coverage` invocation — **any JaCoCo/XML path with no intervening lcov conversion is the finding**, as is any `--coverage_threshold`/`--fail_under`/`--minimum_coverage` on the command line. Then confirm the lane pipes `_coverage_report.dat` through `lcov --summary` (or a parser reading `LF`/`LH`/`BRF`/`BRH`) with an explicit percentage check; its absence in a repo that *claims* a coverage gate is the finding. `grep -n 'coverage_report_generator' .bazelrc` — empty is the pass, not a gap (0/6 exemplars customise it, `bazelbuild/bazel` included). | MUST where a coverage gate is claimed over Bazel-built Java; N/A otherwise | Bazel 8.x |
| BZL-JAVA-27 | Pass `runner = "junit5"` explicitly on every `java_test_suite` covering JUnit 5 sources. Never rely on the macro's default. | `runner` defaults to **`"junit4"`**. A suite of `*Test.java` files written against `org.junit.jupiter` annotations left on the default generates JUnit4-runner `java_test` targets, and the failure mode is either zero tests discovered with a green build or an opaque classload error — never a legible "wrong runner" message. This is the cheapest silent-green in the family. | Reading heuristic, two halves: `grep -rln 'org.junit.jupiter' <package>` for the files a `java_test_suite(` glob matches, then read that call for `runner = "junit5"`. Jupiter imports without the attribute is the finding. Not reducible to one grep — the cross-reference is the check. | MUST | contrib_rules_jvm 0.31.0 |

**27 rules, 15 MUST** (01, 02, 03, 04, 06, 09, 10, 11, 12, 18, 19, 21, 24, 26,
27 — five of them conditional on a consumer kind or a repo shape).

## Applied to the exemplars and the two future consumers

### Already satisfied by the strict exemplars

| Rule | Satisfied by |
|---|---|
| BZL-JAVA-01/02 | `bazelbuild__bazel@948b8c70e2:.bazelrc:70-73` (all four at **25**, with a `LINT.IfChange`/`LINT.ThenChange(//BUILD)` pair keeping flag and toolchain target in sync); `bazelbuild__rules_java@4206909b6d:.bazelrc:4-7` (all four at **8**, deliberately — "ensure compatibility with Java 8"); `bazel-contrib__rules_jvm_external@449754dcbb:.bazelrc:3-10` (all four at **17**) |
| BZL-JAVA-03 | `google__dagger@4fbc045d2b:.bazelrc:22-25` (toolchain and tool pair at 17) with `--javacopt="-source 8 -target 8"` at `:28` for output only |
| BZL-JAVA-05 | `bazel-contrib__rules_jvm_external@449754dcbb:.bazelrc:9` — `--experimental_strict_java_deps=strict`, the only explicit setting in the corpus |
| BZL-JAVA-06 | `google__dagger@4fbc045d2b:.bazelrc:17-18` — `-Xep:BetaApi:ERROR` on both `--javacopt` and `--host_javacopt` |
| BZL-JAVA-09 | `google__dagger@4fbc045d2b:.bazelrc:34` — `--jvmopt="--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED"` |
| BZL-JAVA-10/11 | `bazelbuild__bazel@948b8c70e2:MODULE.bazel:264-269`; `google__dagger@4fbc045d2b:MODULE.bazel:185-186`; `bazelbuild__rules_kotlin@7c51dd1210:MODULE.bazel:96-98,136-138` (two instances, each with its own lock file) |
| BZL-JAVA-13 | `bazelbuild__bazel@948b8c70e2:MODULE.bazel:269`; `bazel-contrib__rules_jvm_external@449754dcbb:MODULE.bazel:86`; `grpc__grpc-java@fc4314419d:MODULE.bazel:78,100` |
| BZL-JAVA-14 | `bazel-contrib__rules_jvm_external@449754dcbb:MODULE.bazel:335` and siblings — `version_conflict_policy = "pinned"`, dogfooded |
| BZL-JAVA-18 | `bazel-contrib__rules_jvm_external@449754dcbb:private/rules/jvm_import.bzl:1-8` implements the ijar-free path; `tests/unit/kotlin/com/example/bazel/InlineFunctionTest.kt` is its regression fixture |
| BZL-JAVA-22 | `google__dagger@4fbc045d2b:CONTRIBUTING.md:29` — "Dagger is built with `bazel`" |

### Violated by prominent exemplars

| Rule | Violation |
|---|---|
| BZL-JAVA-01 | `grpc__grpc-java@fc4314419d:.bazelrc:1-3` — the whole rc file is two C++ flags; **no Java version flag anywhere**. Its Java build rides whatever `bazel_dep(rules_java)` supplies. |
| BZL-JAVA-01 | `bazelbuild__rules_kotlin@7c51dd1210:.bazelrc:9-10` — runtime pair only (`remotejdk_17`); no `--java_language_version`, so the language floor is inherited un-reviewed. |
| BZL-JAVA-10, BZL-JAVA-11 | `grpc__grpc-java@fc4314419d:MODULE.bazel:73-79` — a `maven.install` with `strict_visibility = True` but **no `lock_file` at all**; artifacts come from an `IO_GRPC_GRPC_JAVA_ARTIFACTS` Starlark constant, so nothing is checksum-pinned. The repo gets BZL-JAVA-13 right and BZL-JAVA-10/11 wrong. |
| BZL-JAVA-11 | `bazel-contrib__rules_jvm_external@449754dcbb:MODULE.bazel:81-86` — **the ruleset that ships `fail_if_repin_required` does not set it on its own primary resolution**: `lock_file` and `strict_visibility` are there, the gate is not. (Re-measured for this consolidation; the dive's exemplar table named only dagger and grpc-java.) It does set it on a test fixture at `:506-507`. |
| BZL-JAVA-14 | `google__dagger@4fbc045d2b` — no `version_conflict_policy` anywhere in `MODULE.bazel`, so a carefully pinned lock file rides Coursier's highest-wins for conflicts. |
| BZL-JAVA-19 | `google__dagger@4fbc045d2b` — a **confirmed** dual-build violation, not a silent default: `dagger-compiler/main/java/dagger/internal/codegen/kotlin/BUILD:22-28` globs `*.kt` through `compat_kt_jvm_library` (→ `io_bazel_rules_kotlin//kotlin:jvm.bzl%kt_jvm_library`, `tools/bazel_compat.bzl:20-26`), while `dagger-compiler/build.gradle.kts:6-10` applies `kotlinJvm` over source dirs wired to the same `main/java` tree (`buildSrc/src/main/kotlin/dagger/gradle/build/DaggerConventionPlugin.kt:158-168`). `x_lambdas` and `kt_kotlinc_options` appear in **zero** files in the repo. |
| BZL-JAVA-21 | All six Bazel-carrying exemplars: **0 `_deploy.jar` paths** among them, against 4 `java_binary(` declarations in `bazelbuild/bazel` alone ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 2) — corpus-wide 1/32. |
| BZL-JAVA-22 | `grpc__grpc-java@fc4314419d` — no canonical-build sentence in its top-level docs, and with an unpinned Maven graph on the Bazel side a parity claim is unverifiable in principle. |
| BZL-JAVA-23 | Nobody adopts it, which is the pass — but `bazel-contrib/rules_jvm`'s own `MODULE.bazel` dogfoods the `linter` extension, so the pattern is live upstream and unadopted downstream. |

### Unmeasured in the corpus — prospective by construction

**BZL-JAVA-24, -25, -27 have no exemplar on either side.** All six
Bazel-carrying exemplars (`bazelbuild/bazel@948b8c70e2`,
`bazelbuild/rules_java@4206909b6d`, `bazelbuild/rules_kotlin@7c51dd1210`,
`bazel-contrib/rules_jvm_external@449754dcbb`, `google/dagger@4fbc045d2b`,
`grpc/grpc-java@fc4314419d`) reference `contrib_rules_jvm`, `apple_rules_lint`,
`junit.jupiter` and `junit5` **zero times** in `MODULE.bazel`/`WORKSPACE` at
their pinned SHAs. These three rules rest on reading the ruleset's own source
and README, not on measured practice — cited here so the difference in evidence
class is visible rather than buried. **BZL-JAVA-26** has one-sided evidence:
`bazelbuild/bazel@948b8c70e2:.bazelrc` carries zero coverage-related lines, in
the one repo that builds its own Java sources and could plausibly need custom
coverage wiring; `rules_kotlin`'s `KotlinBuilderJvmCoverageTest.kt` is the only
other "coverage" hit among the six and is a `@RunWith(JUnit4::class)` test of the
Kotlin builder's own instrumentation, not a usage example.

**Citation correction, applied above and recorded here because a grep written
from the dive misses:** the toolchains dive's line numbers for
`google__dagger@4fbc045d2b:.bazelrc` are wrong throughout — it cites the Error
Prone override at `:11-13`, the four version flags at `:17-28` and
`--add-exports` at `:26`. Re-read at the pinned SHA: `-g` debug info is at
`:12-13`, `-Xep:BetaApi:ERROR` at **`:17-18`**, the four version flags at
**`:22-25`**, `-source 8 -target 8` at **`:28`**, and
`--add-exports=jdk.compiler/com.sun.tools.javac.api` at **`:34`**.
[pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 4 had it right (`:17`,
`:22-28`); the dive's numbers were the drifted ones. The three other `.bazelrc`
citations the dive makes — `bazel@948b8c70e2:.bazelrc:70-73`,
`rules_java@4206909b6d:.bazelrc:4-7`, `rules_jvm_external@449754dcbb:.bazelrc:3-10`
and `:9` — were re-read and are all correct.

### New commitments for the two OCX consumers

- **OCX JVM SDK** — not a Bazel build, so only two rows bind, both as
  *consumability* commitments rather than adoption: the published coordinate
  must resolve through a `maven.install` with `lock_file` +
  `fail_if_repin_required = True` (BZL-JAVA-10/11) as a once-per-release smoke
  check, and if the SDK is Kotlin-first it must not be shaded under its primary
  coordinates, because a Bazel consumer reaching it through `@maven//:...` gets
  `rules_jvm_external`'s Kotlin-aware import only for a jar whose
  `META-INF/*.kotlin_module` entries survived packaging (BZL-JAVA-18 read from
  the consumer's side). Neither is a Gradle-side rule; both belong in the
  `jvm-release` skill's checklist.
- **OCX Gradle plugin** — **no BZL-JAVA row binds it.** It has no Bazel surface.
  The transferable constraint from the Bazel prior art
  (`rules_ocx/AGENTS.md:65`'s "no `module_ctx.os`, no getenv — repository rules
  only" ≈ configuration-cache discipline) is owned by `GRADLE-PLUG` / M-Y-05,
  not here. The one live tie-in: an adopter carrying both `rules_ocx` and the
  OCX Gradle plugin for the same repository is exactly BZL-JAVA-22's case, and
  should write the canonical-build line before either is wired.
- **Coverage, for both** — the OCX JVM SDK's own coverage floor stays a
  Gradle/JaCoCo construct (`JAVA-TEST-10`). BZL-JAVA-26 binds it only in the
  negative: if a Bazel-side consumption smoke check is ever added (open question
  3), that lane must not claim a coverage number, because the lcov report it
  would produce cannot be read by the SDK's `BRANCH`-percentage floor without a
  conversion nobody owns.
- **Both** — nothing in this family ships unless Q6 is answered yes.

## AI-agent failure modes

Ranked by how often it bites, with the mechanical check.

1. **Inventing `--java_version` or `--tool_java_version`** by analogy with a
   single combined flag. Neither exists; the line silently no-ops rather than
   erroring, so the build looks configured and is not.
   *Check:* `grep -n -E '\-\-(tool_)?java_version' .bazelrc*` — any hit is the
   mistake (BZL-JAVA-01).
2. **Assuming the `maven_install.json` freshness gate is unconditional**, by
   muscle memory from crate_universe, whose `determine_repin()` hard-fails on
   every ordinary build. Here it is opt-in and defaults off.
   *Check:* `grep -n fail_if_repin_required MODULE.bazel` — absent or `False` on
   a `lock_file`-bearing install means any "the lock is verified" claim is wrong
   (BZL-JAVA-11).
3. **Reporting "strict deps is off" from an absent `.bazelrc` line**, then
   "fixing" a missing-dep error by writing `=off`. The unset default already
   errors.
   *Check:* read the flag's value, never its presence; `off`/`warn` are the only
   weakening values (BZL-JAVA-04).
4. **Conflating `ijar` and `turbine` in either direction** — calling header
   compilation "ijar-based" because bazel-and-java's prose names only `ijar`, or
   concluding from "the header compiler is turbine" that the Kotlin
   inline-function trap is obsolete. Two tools, two inputs: turbine parses
   *source* for `java_library`/`kt_jvm_library`; ijar strips a *prebuilt* jar for
   `java_import`. Disabling header compilation does not cure the Kotlin trap and
   routing Kotlin through `maven.install` does not change the header compiler.
   *Check:* read `header_compiler`/`header_compiler_direct` on the toolchain in
   use for the turbine question; `grep -rn 'java_import('` for the ijar one
   (BZL-JAVA-07, BZL-JAVA-18).
5. **Assuming `bazel build //...` built the fat jar.** `_deploy.jar` is an
   implicit output built only on explicit request and named in no BUILD file, so
   a grep for it returns nothing even where `java_binary` targets exist.
   *Check:* `grep -rn '_deploy\.jar' .github/ BUILD* *.bzl` in any repo shipping
   an executable — empty is the finding (BZL-JAVA-21).
6. **Reaching for `bazel sync` or `bazel fetch --repo=@maven` to repin.** The
   repin verb is a `bazel run` of a generated target, not a fetch/sync
   subcommand, and no `--lockfile_mode`-style flag exists for this file.
   *Check:* `grep -rn 'bazel sync\|fetch --repo=@maven' . --include='*.md'
   --include='*.sh' --include='*.yml'` — any hit describing a maven repin is the
   finding; the verb is `REPIN=1 bazel run @maven//:pin` (BZL-JAVA-12).
7. **Adding Error Prone as a `maven_install`/`bazel_dep` coordinate**, because
   that is how every other JVM tool in this program is pulled in — and then
   looking for `google/error-prone`'s Bazel config to copy, which does not
   exist.
   *Check:* `grep -rn 'error_prone_core' MODULE.bazel maven_install.json` — any
   hit beyond `error_prone_annotations` is the tell (BZL-JAVA-06).
8. **Assuming Kotlin lambda bytecode is identical across Gradle and Bazel**
   "because it's the same compiler", then attributing an observed difference to
   compiler or JDK-target mismatch. It is the same compiler with a different
   default.
   *Check:* `grep -rn x_lambdas` across `kt_kotlinc_options` call sites before
   attributing a lambda-shape discrepancy to anything else (BZL-JAVA-19).
9. **Lowering `--java_language_version` to ship older bytecode**, missing that
   it also re-selects the toolchain via `source_version` matching.
   *Check:* confirm any downward target is a `--javacopt` and the language flag
   still matches the intended toolchain's `source_version` (BZL-JAVA-03).
10. **Saying "the lockfile" in a repo that has two.** `maven_install.json` and
    `MODULE.bazel.lock` have unrelated schemas, unrelated freshness mechanisms
    (`fail_if_repin_required` vs `--lockfile_mode`) and unrelated merge drivers
    — pointing Bazel's own `bazel-lockfile-merge` at `maven_install.json`
    parses the wrong schema and is itself a finding.
    *Check:* any PR description, onboarding doc or CI comment saying "the
    lockfile" unqualified, where both files exist, is the finding
    (BZL-JAVA-12).
11. **Citing `bazelbuild/rules_kotlin`, or asserting that `rules_jvm_external`
    and `rules_jvm` merged.** The former transferred to `bazel-contrib`
    (a GitHub repo transfer, not a fork); the latter two are separate,
    non-archived repos with different scopes.
    *Check:* `gh api repos/bazelbuild/rules_kotlin --jq .full_name`, and the
    same for both `rules_jvm*` paths — direct fetch, never search.
12. **Assuming a more specific JVM registration wins toolchain resolution**, by
    analogy with `constraint_values` specificity elsewhere in Bazel. The
    documented rule for same-OS/CPU JVM definitions is pure registration order.
    *Check:* read every matching `register_toolchains()` in evaluation order
    rather than reasoning about which looks more specific (BZL-JAVA-08).
13. **Expecting JaCoCo XML or an HTML index after `bazel coverage`**, because
    "Java coverage" reads as "JaCoCo" in nearly all training data (Gradle's
    `jacocoTestReport`, Maven's `jacoco:report`). The only output is lcov at
    `$(bazel info output_path)/_coverage/_coverage_report.dat` — so a CI step
    globbing `**/jacocoTestReport.xml` finds nothing and **passes**.
    *Check:* read the lines after any `bazel coverage` invocation in CI; a
    JaCoCo or `.xml` path with no lcov conversion between them is the finding
    (BZL-JAVA-26).
14. **Inventing a coverage-threshold flag** — `--coverage_threshold=80`,
    `--fail_under`, `--minimum_coverage` — by analogy with `pytest-cov`'s
    `--cov-fail-under` or JaCoCo's `violationRules`. None exists in Bazel's
    command-line reference; `bazel coverage` never fails on a percentage.
    *Check:* grep any coverage script for those three spellings
    (BZL-JAVA-26).
15. **Hallucinating a first-party JUnit 5 rule** — `load("@rules_java//java:defs.bzl",
    "java_junit5_test")`, or assuming `@bazel_tools` ships JUnit 5 support.
    Neither exists; `bazel-contrib/rules_jvm` is the only source of that symbol.
    *Check:* `grep -rn 'java_junit5_test\|java_test_suite' BUILD.bazel BUILD |
    grep -v contrib_rules_jvm` — any hit is a hallucinated `load()` source
    (BZL-JAVA-24).
16. **Taking `java_test_suite`'s default runner for JUnit 5**, and separately,
    **reading `contrib_rules_jvm`'s transitive `apple_rules_lint` as "linting is
    now on here"** and configuring it. The first ships a silently-green suite
    that discovers zero tests; the second turns a test-only change into an
    unrequested linting-policy change.
    *Check:* Jupiter imports in a suite's `srcs` without `runner = "junit5"`
    (BZL-JAVA-27); a `linter.*` call in a PR whose stated goal was tests
    (BZL-JAVA-25).

## Open questions

**Needs an owner decision**

1. **Q6, unchanged and still blocking: will `bazel-quality` accept a thirteenth
   depth file and a `BZL-JAVA` family?** Its artifact-set decision calls twelve
   files finalized and lists `rules_java`/`rules_kotlin` out of scope by name.
   Everything above is written to that set's contract (no glob of its own,
   routes into the six mechanic-owning files) and is worthless if declined.
2. **Is BZL-JAVA-21 (`_deploy.jar`) this family's row or `GRADLE-DIST`'s?** It
   is the one row here that answers a *distribution* question, and
   `jvm-distribution.md` already owns the merge taxonomy it inherits. Shipped
   here because the implicit-output fact is Bazel-only and an agent editing a
   `BUILD.bazel` is the one who needs it; an owner who prefers one home for fat
   jars should move it and leave a pointer.
3. **Does the OCX JVM SDK commit to a Bazel-consumption smoke check at all?**
   BZL-JAVA-10/11-as-consumability costs one CI lane per release and catches
   exactly one class of bug (a published artifact that will not resolve through
   `maven.install`). Cheap, but it is a new lane nobody asked for.

**Cannot be closed by research — needs one run of a real binary**

4. **The strict-deps flag's canonical name.** `command-line-reference` says
   `--experimental_strict_java_deps`, `user-manual` says `--strict_java_deps`,
   and no `bazel` binary exists in the fleet or in this program's sandbox. One
   `bazel help build --long | grep -i strict_java_deps` on any pinned binary
   closes it permanently. Until then BZL-JAVA-05 ships as a SHOULD.
5. **bazel-and-java's two contradictory javac defaults.** The page states the
   default javac options are `-source 8 -target 8 -encoding UTF-8` two sections
   after stating `--java_language_version` defaults to `11`. Both cannot be
   live. Unfixed as of the page's `dateModified: 2026-09-05`.
6. **`--incompatible_language_version_bootclasspath`** appears in
   `bazelbuild__bazel@948b8c70e2:.bazelrc:75` with no further citation; whether
   it changes anything about §9's `--patch_module`/`-Xbootclasspath` split was
   not run down.

**Subareas that deserve another research round**

7. **`java_export` and publishing to Maven Central from Bazel** — *does
   `rules_jvm_external`'s `java_export`/`maven_publish` produce a
   Central-Portal-acceptable bundle (sources jar, javadoc jar, per-file GPG
   signature, complete POM), or is Bazel a non-publisher that always hands off
   to Gradle or Maven?* Load-bearing for the OCX SDK: the `jvm-release` skill
   currently assumes a Gradle or Maven publisher, and `dagger` — the corpus's
   canonical-Bazel repo — keeps Gradle precisely for publishing packaging. If
   `java_export` closes that gap, the skill gains a third path; if it does not,
   BZL-JAVA-22's "which build is canonical" answer is forced for every
   publishing dual-build repo.
8. **Worker-state reproducibility for `KotlinCompile`** — BZL-JAVA-20 is a
   CONSIDER because no primary source states a correctness defect and no
   exemplar overrides the default. One reproducibility experiment (build twice
   with and without `--strategy=KotlinCompile=local`, diff the jars) would
   either promote it to a SHOULD with evidence or retire it to prose. Below the
   line for this program; promote only if an adopter reports a Kotlin flake.

## Sub-artifacts

- [`jvm-bazel-java/bazel-java-toolchains-and-compilation.md`](jvm-bazel-java/bazel-java-toolchains-and-compilation.md)
  — the two JDK flag pairs and their defaults, `remotejdk` vs `local_jdk`, the
  bytecode-target-below-toolchain split, turbine vs ijar header compilation,
  strict deps, Error Prone wiring, toolchain registration order,
  `--patch_module` vs `--add-exports`, and `contrib_rules_jvm`'s lint wrappers.
- [`jvm-bazel-java/bazel-java-external-deps-and-kotlin.md`](jvm-bazel-java/bazel-java-external-deps-and-kotlin.md)
  — `maven.install`'s two lock-file hashes and the opt-in freshness gate,
  repinning and merge discipline, `version_conflict_policy`, exclusion scoping,
  `neverlink`/`testonly`, `strict_visibility`, the `artifact()` macro, the
  ijar/inline-function trap, `x_lambdas` divergence, Kotlin worker defaults, and
  the dual-build source-of-truth question.
- [`jvm-bazel-java/bazel-java-testing-and-coverage.md`](jvm-bazel-java/bazel-java-testing-and-coverage.md)
  — the absent first-party JUnit 5 rule, `java_junit5_test` as a `java_test`
  wrapper, the four env vars a hand-rolled launcher must honour,
  `java_test_suite`'s `junit4` default, the `apple_rules_lint` fetch-vs-use
  split, and what `bazel coverage` emits (lcov only, one combined report, no
  threshold flag anywhere).

## Key sources

| URL | Why |
|---|---|
| [bazel.build/docs/bazel-and-java](https://bazel.build/docs/bazel-and-java) | The two flag pairs, `ijar`, `--patch_module`/`-Xbootclasspath`, `java_package_configuration`, the registration-order rule — and the stale-default contradiction in open question 5 |
| [bazel.build/docs/user-manual](https://bazel.build/docs/user-manual) | The only page with self-consistent numeric defaults for all four version flags, `--javacopt` ordering, and the full `default`=`strict`=`error` strict-deps semantics |
| [bazel.build/reference/be/java](https://bazel.build/reference/be/java) | `java_binary`'s implicit outputs — `name_deploy.jar` "only built if explicitly requested", `deploy_manifest_lines`; the evidence behind BZL-JAVA-21 |
| [bazel.build/reference/command-line-reference](https://bazel.build/reference/command-line-reference) | `--experimental_strict_java_deps`'s value set and default, and its naming disagreement with user-manual |
| [rules_jvm_external README (7.1)](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/README.md) | Pinning workflow, `fail_if_repin_required`, `version_conflict_policy`, exclusions, `neverlink`/`testonly`, `strict_visibility`, the `artifact()` macro's buildozer cost |
| [rules_jvm_external `coursier.bzl` (7.1)](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/coursier.bzl) | `fail_if_repin_required` defaults to `False` (L1683) and both mismatch branches warn-and-continue (L672-682, L712-725) — not stated in the README |
| [rules_jvm_external `v3_lock_file.bzl` (7.1)](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/v3_lock_file.bzl) | `__INPUT_ARTIFACTS_HASH` and `__RESOLVED_ARTIFACTS_HASH` are two independent checks, not one |
| [rules_jvm_external `jvm_import.bzl` (7.1)](https://github.com/bazel-contrib/rules_jvm_external/blob/7.1/private/rules/jvm_import.bzl) | The live ijar-free Kotlin import path — the 2019 fix is still the mechanism |
| [rules_jvm_external issue #59](https://github.com/bazel-contrib/rules_jvm_external/issues/59) / [PR #69](https://github.com/bazel-contrib/rules_jvm_external/pull/69) | Original statement of the ijar/inline-function trap and the `kotlin_module`-detection fix that sets the (absent) version floor |
| [bazel-contrib/rules_kotlin README (v2.4.10)](https://github.com/bazel-contrib/rules_kotlin/blob/master/README.md) | The ijar/Kotlin-metadata warning in the ruleset's own words, `x_lambdas` vs `x_sam_conversions` defaults, worker defaults and `--strategy=<mnemonic>=local`, Build Tools API opt-in |
| [bazel-contrib/rules_kotlin docs/kotlin.md](https://github.com/bazel-contrib/rules_kotlin/blob/master/docs/kotlin.md) | The attribute-level `x_lambdas` doc confirming the divergence from Kotlin 2.x/Gradle at API-reference level |
| [bazel-contrib/rules_jvm](https://github.com/bazel-contrib/rules_jvm) | `contrib_rules_jvm`'s `java_test_suite`, `java_junit5_test`, lint wrappers and its `apple_rules_lint` dependency — and proof it never merged with `rules_jvm_external` |
| [rules_jvm `java/private/junit5.bzl`](https://github.com/bazel-contrib/rules_jvm/blob/master/java/private/junit5.bzl) + [`ActualRunner.java`](https://github.com/bazel-contrib/rules_jvm/blob/master/java/src/com/github/bazel_contrib/contrib_rules_jvm/junit5/ActualRunner.java) | `java_junit5_test` is `java_test` + a fixed `main_class` + a `System.exit`-trapping `-javaagent`; `ActualRunner` is the ~150 lines a hand-rolled launcher would have to reproduce — the evidence behind BZL-JAVA-24 |
| [rules_jvm README §Linting](https://github.com/bazel-contrib/rules_jvm/blob/master/README.md) | "linting is 'opt-in': if there's no `lint_setup` call… everything will continue working just fine" — the sentence that rescopes BZL-JAVA-23 and grounds BZL-JAVA-25 |
| [bazel.build/configure/coverage](https://bazel.build/configure/coverage) | `bazel coverage --combined_report=lcov`, the single merged `.dat` path, passing-tests-only, and the one-sentence Java section that is the whole documented contract |
| [bazel.build/reference/test-encyclopedia](https://bazel.build/reference/test-encyclopedia) | `XML_OUTPUT_FILE`, `TESTBRIDGE_TEST_ONLY`, `TEST_PREMATURE_EXIT_FILE`, `TEST_SHARD_*` — the protocol BZL-JAVA-24's escape hatch is measured against |
| [bazelbuild/bazel#12159](https://github.com/bazelbuild/bazel/issues/12159) | "Improved Jacoco coverage support", closed `not_planned` 2024-06-29 — the coverage gap is maintainer-settled, not unexamined |
| [google/dagger@4fbc045d2b `.bazelrc`](https://github.com/google/dagger/blob/4fbc045d2b/.bazelrc) | Bytecode/toolchain split, Error Prone severity override and the `--add-exports` pattern, all in one file |
| [bazelbuild/bazel@948b8c70e2 `.bazelrc`](https://github.com/bazelbuild/bazel/blob/948b8c70e2/.bazelrc) | The only four-flag pin at a single modern version (25), with `LINT.IfChange`/`LINT.ThenChange` keeping flag and toolchain in sync |
| [grpc/grpc-java@fc4314419d `.bazelrc`](https://github.com/grpc/grpc-java/blob/fc4314419d/.bazelrc) | The zero-pin, zero-lock counterexample behind BZL-JAVA-01 and BZL-JAVA-10/11 |
| [blog.bazel.build/2026/01/20/bazel-9.html](https://blog.bazel.build/2026/01/20/bazel-9.html) | Bazel 9 LTS: Bzlmod-only and Starlarkified rules, the framing behind the explicit-`load()` non-negotiable these examples follow |

## Revision log

**2026-09-12 — folded in `jvm-bazel-java/bazel-java-testing-and-coverage.md`**
(the round this file's own open question 7 commissioned).

- **Added BZL-JAVA-24** (MUST where a JUnit 5 suite runs under Bazel) — run
  JUnit 5 through `contrib_rules_jvm`'s `java_junit5_test` /
  `java_test_suite(runner = "junit5")` and add `JUNIT5_DEPS` explicitly; a
  hand-rolled `main_class` must honour the four Bazel test-protocol env vars.
  *Why:* there is no first-party JUnit 5 rule, and the naive hand-roll silently
  breaks `--test_filter`, sharding, premature-exit detection and CI XML.
- **Added BZL-JAVA-25** (SHOULD) — a transitively fetched `apple_rules_lint` is
  not a linting adoption; do not configure it as part of a test-only change.
  *Why:* `contrib_rules_jvm` `bazel_dep`s it unconditionally for its own
  dogfooding, so MVS fetches it for every consumer while generating nothing.
- **Added BZL-JAVA-26** (MUST where a coverage gate is claimed) — one merged
  lcov `.dat` is the only Java coverage artifact; any numeric floor is a CI step
  over that file. *Why:* no threshold flag exists in Bazel at all, there is no
  per-target coverage signal, and a CI step expecting JaCoCo XML passes
  vacuously.
- **Added BZL-JAVA-27** (MUST) — pass `runner = "junit5"` explicitly on
  `java_test_suite`. *Why:* the attribute defaults to `"junit4"`, and the
  failure mode is a green build that discovered zero tests.
- **Changed BZL-JAVA-23 in place** (CONSIDER, unchanged severity, narrowed
  scope). The old text made "record the `apple_rules_lint` dependency
  explicitly" part of the rule and greped `bazel_dep(name = "contrib_rules_jvm"`
  / `bazel_dep(name = "apple_rules_lint")` as the finding — which would have
  flagged the very adoption BZL-JAVA-24 now requires, and which **overclaimed
  what the dependency means**: fetching the module configures nothing. The rule
  now decides the `lint_setup()` / `linter.register()` call only, states
  explicitly that a bare `bazel_dep` is not evidence of adoption, and drops the
  "separate, unblocked decision" clause now that BZL-JAVA-24/25 settle it.
- **Verdict:** added items 12 (no first-party JUnit 5 rule; the
  `contrib_rules_jvm` split; the BZL-JAVA-23 correction) and 13 (coverage as a
  documented, maintainer-settled GAP — `bazelbuild/bazel#12159` closed
  `not_planned`). Item 13 is the former open question 7's answer recorded as a
  gap rather than a rule-shaped resolution, because no mechanism exists to
  regulate.
- **Open questions:** removed 7 (Bazel-Java testing and coverage — answered);
  renumbered the two survivors (`java_export` publishing, `KotlinCompile`
  worker-state reproducibility) to 7 and 8. Items 1-6 unchanged.
- **Failure modes:** added 13-16 (JaCoCo XML expected after `bazel coverage`;
  invented `--coverage_threshold`; hallucinated first-party `java_junit5_test`
  `load()`; the `junit4` default runner and the `apple_rules_lint` scope creep).
- **Exemplars:** added an "Unmeasured in the corpus" subsection recording that
  BZL-JAVA-24/25/27 have no exemplar on either side (0/6 reference
  `contrib_rules_jvm`, `apple_rules_lint`, `junit.jupiter` or `junit5`) and that
  BZL-JAVA-26's evidence is one-sided. Evidence class is now visible per rule
  rather than implied by the family's average.
- **Counts:** 23 rules / 12 MUST → **27 rules / 15 MUST**. No existing ID
  renumbered, reordered or retired.
