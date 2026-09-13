---
title: "Task inputs, path sensitivity, and why the cache misses"
topic: gradle-cache-task-inputs
agent: task-inputs-and-cache-hits
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers the incremental-build/task-input annotation set, @PathSensitive
  levels and per-kind recommendation, @Classpath vs @CompileClasspath, the 31
  validatePlugins problem IDs (which are caching-correctness vs style), and
  the Gradle 9 reproducible-archive default flip resolved against three real
  exemplar hits. Does not cover the configuration-cache contract itself
  (disallowed types/operations at execution or configuration time — that is
  `config-cache-contract`'s dive) or Isolated Projects rollout (same dive).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Incremental-build annotations](#1-incremental-build-annotations)
   2. [@PathSensitive levels and the per-kind recommendation](#2-pathsensitive-levels-and-the-per-kind-recommendation)
   3. [@Classpath vs @CompileClasspath](#3-classpath-vs-compileclasspath)
   4. [The 31 validation-problem IDs](#4-the-31-validation-problem-ids)
   5. [validatePlugins: registration, default behaviour, strictness](#5-validateplugins-registration-default-behaviour-strictness)
   6. [Gradle 9's reproducible-archive default flip](#6-gradle-9s-reproducible-archive-default-flip)
   7. [The surprise, resolved: three real exemplar hits](#7-the-surprise-resolved-three-real-exemplar-hits)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Every custom task property MUST carry exactly one of `@Input`/`@InputFile`/`@InputDirectory`/`@InputFiles`/`@OutputFile`/`@OutputDirectory`/`@Nested`/`@Internal` — an unannotated property disables up-to-date checking and caching for the whole task silently ([validation_problems#missing_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
- `@Input` on a file or directory path is a defect, not a stricter option: Gradle stores the value, not the content, so file/directory changes go undetected — use `@InputFile`/`@InputDirectory` ([validation_problems#incorrect_use_of_input_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
- `@InputFiles` is order-independent by design; content changes invalidate the task, entry order does not — use `@Classpath` instead when order genuinely matters (a JVM classpath) ([incremental_build](https://docs.gradle.org/current/userguide/incremental_build.html)).
- `@PathSensitive(NONE)` for a single input file, `@PathSensitive(RELATIVE)` for a directory — `ABSOLUTE` is a named Gradle Best Practice anti-pattern that makes the build cache non-relocatable across machines and checkout locations ([best_practices_tasks §7](https://docs.gradle.org/current/userguide/best_practices_tasks.html)).
- Every cacheable task's file/file-collection inputs MUST declare a normalization strategy (`@PathSensitive`, `@Classpath`, or `@CompileClasspath`) or Gradle reports `missing_normalization_annotation` — caching without normalization is "highly ineffective" per Gradle's own text ([validation_problems#missing_normalization_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
- `@Classpath` ignores jar-internal timestamps and entry order but keeps classpath-entry order and jar names/paths significant; `@CompileClasspath` goes further and ignores *everything except ABI-affecting class changes* — method bodies, private members, resources, manifests, debug info, directory contents, and entry order/paths all become invisible to it ([incremental_build](https://docs.gradle.org/current/userguide/incremental_build.html)).
- A JVM compile classpath input annotated plain `@InputFiles` busts the cache on every upstream jar rebuild (timestamp-only diffs included); annotating it `@CompileClasspath` is what makes compile avoidance possible at all — this is the single highest-leverage annotation choice in the whole reference.
- `@Internal` and `@Console` properties never participate in up-to-date checks or caching; `@SkipWhenEmpty` on a file-collection input turns "no matching files" into a `NO-SOURCE` outcome instead of a normal execution; `@NormalizeLineEndings` makes CRLF/LF-only diffs invisible to up-to-date checking ([incremental_build](https://docs.gradle.org/current/userguide/incremental_build.html)).
- Gradle 9.0.0 flips three archive-task defaults at once for `Jar`/`Ear`/`War`/`Zip`/`AbstractArchiveTask`: `reproducibleFileOrder` false→**true**, `preserveFileTimestamps` true→**false**, and file-system permissions from OS-`umask`-dependent to fixed `0755` (dirs) / `0644` (files) ([upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html)).
- The old "set `preserveFileTimestamps = false`; `reproducibleFileOrder = true`" advice is now a no-op on Gradle ≥9.0.0 — it just restates the default. The wrong-in-2026 shape is any rule that tells an agent to *add* that block without first checking whether the build is already on Gradle 9+.
- **The surprise, confirmed by direct fetch of the exact defaults changed**: `apache/kafka@940c100fab:build.gradle:362-364` sets `reproducibleFileOrder = false; preserveFileTimestamps = true; useFileSystemPermissions()` — this is not a no-op, it is a line-for-line copy of Gradle's own documented "revert all three reproducibility defaults" snippet, applied on a repo whose wrapper pins Gradle 9.7.1. It is an **active, total opt-out** of reproducible archives, most likely carried forward unexamined from a pre-9.0 build script during the upgrade.
- Two of the three real (non-false-positive) reproducible-archive hits in the corpus are correct for Gradle 9: `micronaut-core@d5842045bb:...convention-base.gradle:74-75` and `diffplug/spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209` both set `reproducibleFileOrder = true; preserveFileTimestamps = false` — which is now also a no-op (restating the 9.x default), harmless but likewise safe to delete.
- A rule that says "set `preserveFileTimestamps = false`" without a version gate is backwards for any Gradle 9+ build: it should instead say "on Gradle <9, set it explicitly; on Gradle ≥9, verify nothing has *reset* it to the old values."
- 31 named validation-problem IDs exist on `docs.gradle.org/current/userguide/validation_problems.html`; four are explicitly caching-correctness in the brief's own framing (`missing_normalization_annotation`, `cacheable_transform_cant_use_absolute_sensitivity`, `artifact_transform_should_not_declare_output`, `implicit_dependency`, `disable_caching_by_default` — five once the near-duplicate framing is untangled), and this reference adds `missing_annotation`, `incorrect_use_of_input_annotation`, `implementation_unknown`, and the `java.net.URL` case of `unsupported_value_type` as also caching-correctness rather than pure style.
- `validatePlugins` is a real, separate task (`org.gradle.plugin.devel.tasks.ValidatePlugins`) that **fails the build** on genuine problems by default (`ignoreFailures`/`failOnWarning` are the opt-outs) — this is stricter than the "warning at jar time" behaviour the `java_gradle_plugin` user-guide page still documents for the older, lighter check baked into `jar` task execution. Both exist; they are not the same gate.
- `enableStricterValidation = true` on the `validatePlugins` task extends cacheable-task-only strict rules to every task in the plugin — worth turning on deliberately, not left at the softer default.
- Because a plugin module can apply `java-gradle-plugin` (which registers `validatePlugins`) without ever wiring it into `check`/`build`, a CI job MUST invoke `./gradlew validatePlugins` as an explicit step rather than trust it rides along with `build` — 10/32 corpus repos run it only because `java-gradle-plugin` happens to be applied to *internal convention-plugin* modules too, which is a routing trap, not proof the task gates anything.
- `implicit_dependency` (task ordering inferred from a raw `File`/`archivePath` reference rather than a `Provider`/task reference) is the named root cause of "works when run after X by luck, breaks on `--parallel` or a clean checkout" bugs — the fix is always `someTask.inputFile.from(producerTask)` or `.from(producerTask.outputFile)`, never `dependsOn` alone.

## Findings

### 1. Incremental-build annotations

Full table, verified against [`incremental_build.html`](https://docs.gradle.org/current/userguide/incremental_build.html) (current docs, applies unchanged since long before Gradle 9 — this is stable API):

| Annotation | Declares | Effect on up-to-date checking |
|---|---|---|
| `@Input` | A simple, serializable value | Task is out-of-date if the value changes. **Never** use on a `File`/path property — Gradle stores the value itself, not file content. |
| `@InputFile` | A single input regular file | Out-of-date if the file's content or existence changes. |
| `@InputDirectory` | A single input directory | Out-of-date if directory content or existence changes. |
| `@InputFiles` | An iterable of files/directories | Out-of-date if content changes; **entry order is not considered**. |
| `@OutputFile` | A single output file | Out-of-date if the file is missing or has been modified since the last run. |
| `@OutputDirectory` | A single output directory | Out-of-date if missing or modified since the last run. |
| `@Nested` | A custom type carrying its own annotated properties | Out-of-date if any nested annotated property changes; used for grouping related options into one value object. |
| `@Internal` | A property that is neither an input nor an output | Never affects up-to-date status; the property still exists for other purposes (e.g. wiring, logging). |
| `@Console` | A property that affects console output only | Never affects up-to-date status — a narrower, self-documenting cousin of `@Internal`. |
| `@SkipWhenEmpty` | Modifier on a file-collection input | If the resolved collection has no matching files, the task's outcome is `NO-SOURCE` (skipped) rather than executed with an empty input. |
| `@NormalizeLineEndings` | Modifier on a file/file-collection input | Line-ending differences (CRLF vs LF) between machines do not invalidate the task — a normalization strategy, not an on/off input flag. |

`@Optional` is a modifier, not a category: it must be paired with an input/output annotation (bare `@Optional` is itself validation problem 26, `cannot_use_optional_on_primitive_types`'s sibling case, and combining it with `@Internal` is a hard error — `@Internal` already excludes the property from all checking) ([validation_problems.html](https://docs.gradle.org/current/userguide/validation_problems.html)).

### 2. @PathSensitive levels and the per-kind recommendation

Four levels exist: `ABSOLUTE`, `RELATIVE`, `NAME_ONLY`, `NONE` ([incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html)). Gradle's own Best Practices page states the rule directly, with the exact reasoning ([best_practices_tasks.html §7](https://docs.gradle.org/current/userguide/best_practices_tasks.html)):

> "Using `PathSensitivity.ABSOLUTE` tells Gradle to consider a file's complete absolute path. This prevents Build Cache…hits across different machines or checkout locations, making your build non-relocatable."

Recommendation, stated as code:

```kotlin
// Correct — a single input FILE: only content matters
@get:InputFile
@get:PathSensitive(PathSensitivity.NONE)
abstract val candidatesFile: RegularFileProperty

// Correct — an input DIRECTORY: relative structure matters, absolute location doesn't
@get:InputDirectory
@get:PathSensitive(PathSensitivity.RELATIVE)
abstract val resourcesDir: DirectoryProperty

// Wrong — defeats cross-machine and cross-checkout cache hits
@get:InputFile
@get:PathSensitive(PathSensitivity.ABSOLUTE)
abstract val candidatesFile: RegularFileProperty
```

`ABSOLUTE` also cannot be used on a cacheable artifact transform's input at all — that is validation problem 4, `cacheable_transform_cant_use_absolute_sensitivity` (transforms run in their own workspace, so the absolute path is meaningless there even before the cache-miss cost is considered) ([validation_problems.html](https://docs.gradle.org/current/userguide/validation_problems.html)).

### 3. @Classpath vs @CompileClasspath

Both are normalization strategies for file-collection inputs that represent a JVM classpath, layered on top of `@InputFiles` semantics ([incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html)):

- **`@Classpath`**: entries are compared as a Java classpath. Jar-internal timestamps and jar-internal entry order are ignored (so re-zipping an identical jar doesn't bust the cache); **entry order in the classpath itself is significant** (JVM classloading is order-sensitive) and jar names/paths matter for identity.
- **`@CompileClasspath`**: strictly narrower — ignores everything `@Classpath` does, *plus*:
  - changes to the path of the jar or top-level directory,
  - resources and jar manifests,
  - private class members (fields/methods not part of the public/protected API),
  - method bodies ("changes to code"),
  - debug information,
  - directory-content changes unrelated to compiled class shape.

In one line: `@CompileClasspath` ignores everything except ABI-affecting class changes — a jar that gets a new `README`, a bumped `Implementation-Version` manifest entry, or a reformatted method body does not invalidate a downstream `compileJava`/`compileKotlin` annotated this way. This is what Gradle calls "compile avoidance." An input annotated plain `@InputFiles` where `@CompileClasspath` belongs busts the cache on every such incidental upstream change ([incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html)).

```kotlin
// Correct — enables ABI-level compile avoidance
@get:CompileClasspath
abstract val compileClasspath: ConfigurableFileCollection

// Wrong for a compile-time input — busts the cache on jar-internal
// timestamps and any non-ABI change in an upstream module
@get:InputFiles
abstract val compileClasspath: ConfigurableFileCollection
```

### 4. The 31 validation-problem IDs

Fetched directly from [`gradle/gradle:platforms/documentation/docs/src/docs/userguide/unused/validation_problems.adoc`](https://raw.githubusercontent.com/gradle/gradle/master/platforms/documentation/docs/src/docs/userguide/unused/validation_problems.adoc) and cross-checked live at [`docs.gradle.org/current/userguide/validation_problems.html`](https://docs.gradle.org/current/userguide/validation_problems.html) — the page is published under the source path `unused/` but is a live, current doc page; the directory name is a docs-build artifact, not a deprecation signal.

| # | ID (anchor) | Title | Caching-correctness? |
|---|---|---|---|
| 1 | `invalid_use_of_cacheable_annotation` | Invalid use of cacheable annotation | Style — misapplied `@CacheableTask`/`@CacheableTransform` on the wrong kind of type |
| 2 | `missing_normalization_annotation` | Missing normalization annotation | **Caching-correctness** — a cacheable task with an un-normalized file input caches "highly ineffectively" |
| 3 | `value_not_set` | Required value isn't set | Style/correctness — a required property is unconfigured |
| 4 | `cacheable_transform_cant_use_absolute_sensitivity` | Invalid use of absolute path sensitivity for an artifact transform | **Caching-correctness** (named in brief) |
| 5 | `artifact_transform_should_not_declare_output` | Invalid use of an output property on an artifact transform | **Caching-correctness** (named in brief) — wrong mechanism for declaring transform outputs entirely |
| 6 | `ignored_annotations_on_field` | Invalid use of annotations on fields | Style — annotation silently has no effect |
| 7 | `ignored_annotations_on_method` | Invalid annotation on method | Style |
| 8 | `ignored_annotations_on_property` | Invalid annotation on property or field | Style |
| 9 | `mutable_type_with_setter` | Mutable type with setter | Style/API design — `Property`/`ConfigurableFileCollection` should not have an overriding setter |
| 10 | `redundant_getters` | Redundant getters | Style |
| 11 | `private_getter_must_not_be_annotated` | Annotations on private getters | Style — annotation silently ignored |
| 12 | `private_method_must_not_be_annotated` | Annotations on private methods | Style |
| 13 | `ignored_property_must_not_be_annotated` | Annotations on ignored properties | Style — conflicting `@Internal`/`@ReplacedBy` plus an input annotation |
| 14 | `conflicting_annotations` | Conflicting annotations | Style/correctness — e.g. both `@InputFile` and `@OutputFile` |
| 15 | `annotation_invalid_in_context` | Annotation is invalid in a particular context | Style |
| 16 | `missing_annotation` | Properties without annotations | **Caching-correctness** — silently disables up-to-date checking and caching for that property |
| 17 | `incompatible_annotations` | Annotation is incompatible with the property type | Style |
| 18 | `incorrect_use_of_input_annotation` | Incorrect use of the `@Input` annotation | **Caching-correctness** — file content/existence goes untracked |
| 19 | `service_reference_must_be_a_build_service` | `@ServiceReference` on a non-`BuildService` type | Style/type error |
| 20 | `implicit_dependency` | Implicit dependencies between tasks | **Caching-correctness** (named in brief) — build result depends on incidental task-execution order |
| 21 | `input_file_does_not_exist` | Input file doesn't exist | Correctness — usually a missing task dependency |
| 22 | `unexpected_input_file_type` | Unexpected input file or directory | Correctness — file vs directory mismatch |
| 23 | `cannot_write_output` | Cannot write to an output file or directory | Correctness |
| 24 | `cannot_write_to_reserved_location` | Cannot write to reserved location | Correctness — writing into a transform's managed workspace |
| 25 | `unsupported_notation` | Unsupported notation in file inputs | Configuration error |
| 26 | `cannot_use_optional_on_primitive_types` | Invalid use of `@Optional` on primitive types | Style |
| 27 | `implementation_unknown` | Cannot use an input with an unknown implementation | **Caching-correctness** — Gradle cannot form a stable cache key across JVMs (non-serializable lambda, or a classloader Gradle doesn't recognise) |
| 28 | `disable_caching_by_default` | Missing reason for not caching | **Caching-correctness** (named in brief) — task/transform authors should always state *why* something isn't cacheable |
| 29 | `unsupported_value_type` | Unsupported value type | **Caching-correctness** for the `java.net.URL` case specifically — its serialization is nondeterministic (a known JDK issue), so up-to-date checks can be wrong; use `java.net.URI` |
| 30 | `unsupported_key_type_of_nested_map` | Unsupported key type of nested map | Style — affects generated property naming, not caching |
| 31 | `unsupported_nested_type` | Unsupported nested type | Style |

Net: **9 of 31** are caching-correctness by the standard above (2, 4, 5, 16, 18, 20, 27, 28, 29); the remaining 22 are style, API-shape, or general task-configuration correctness that doesn't specifically corrupt caching or up-to-date results.

### 5. validatePlugins: registration, default behaviour, strictness

Two distinct checks exist and are easy to conflate:

1. **The lightweight jar-time check**, documented on [`java_gradle_plugin.html`](https://docs.gradle.org/current/userguide/java_gradle_plugin.html): applying `java-gradle-plugin` "performs validation of plugin metadata during jar task execution," checking that a plugin descriptor exists, that it names a valid `implementation-class`, that every task property is annotated, etc. — but **"Any failed validations will result in a warning message"** only. This is the check the map's brief calls "warning at jar time," and it is real, current, and still just a warning.
2. **The `validatePlugins` task** (`org.gradle.plugin.devel.tasks.ValidatePlugins`), also registered automatically by `java-gradle-plugin` (manual registration is documented for projects that can't apply that plugin). Its own javadoc: "Validates plugins by checking property annotations on work items like tasks and artifact transforms… fails the build when validation problems are detected, unless `ignoreFailures` is set to `true` or `failOnWarning` is configured" ([`ValidatePlugins` javadoc](https://docs.gradle.org/current/javadoc/org/gradle/plugin/devel/tasks/ValidatePlugins.html)). `enableStricterValidation = true` extends the cacheable-task-only strict rule set to every task the plugin defines, regardless of whether it's marked cacheable.

These are not the same gate at different strictness — they run at different times, and only the second one fails a build by default. A plugin author who only ever runs `./gradlew jar`/`build` and reads warnings in scrollback can ship a genuinely broken plugin (e.g. `missing_annotation`) without ever hitting a red build, because `validatePlugins` was registered but never invoked.

### 6. Gradle 9's reproducible-archive default flip

[`upgrading_major_version_9.html`](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html), section "Archive tasks (`Jar`, `Ear`, `War`, `Zip`, `AbstractArchiveTask`) produce reproducible archives by default," and cross-checked against the [`AbstractArchiveTask` javadoc](https://docs.gradle.org/current/javadoc/org/gradle/api/tasks/bundling/AbstractArchiveTask.html), which states explicitly for each property: "Gradle defaults to `true`/`false` if not set explicitly starting Gradle 9.0.0." Three properties flip together:

| Property | Pre-9.0 default | 9.0.0+ default |
|---|---|---|
| `reproducibleFileOrder` | `false` | `true` |
| `preserveFileTimestamps` | `true` | `false` |
| File-system permissions | OS `umask`-dependent (`useFileSystemPermissions()`) | Fixed: directories `0755`, files `0644` |

Gradle's own documented revert-to-old-behaviour snippet, given verbatim in the upgrade guide, is:

```kotlin
tasks.withType<AbstractArchiveTask>().configureEach {
    isReproducibleFileOrder = false
    isPreserveFileTimestamps = true
    useFileSystemPermissions()
}
```

A global escape hatch also exists: `org.gradle.archives.use-file-system-permissions=true` in `gradle.properties` reverts the permissions half of the flip build-wide.

### 7. The surprise, resolved: three real exemplar hits

[`exemplar-publishing-ci-bazel.md`](../jvm-audit/exemplar-publishing-ci-bazel.md) headline 5 already established that a naive grep for these property names overcounts real archive-reproducibility configuration 3x (9/32 raw hits vs. 3/32 real — the rest are a `Transformer.modifyOutputStream(..., boolean preserveFileTimestamps)` method-parameter name in hand-written Shadow code, unrelated to the Gradle archive-task property). This dive re-read all three real hits at their exact lines and re-derived the semantics from the 9.0.0 default table above:

**`apache/kafka@940c100fab:build.gradle:362-364`** ([exemplar](https://github.com/apache/kafka/blob/940c100fab/build.gradle#L362-L364), wrapper pins Gradle **9.7.1**):

```groovy
tasks.withType(AbstractArchiveTask).configureEach {
    reproducibleFileOrder = false
    preserveFileTimestamps = true
    useFileSystemPermissions()
}
```

This is **not** a no-op on kafka's own toolchain. It is byte-for-byte Gradle's documented "restore pre-9.0 archive behaviour" snippet (all three properties reverted, including the `useFileSystemPermissions()` permissions call). On Gradle 9.7.1 this is an **active, total opt-out** of reproducible archives — every published kafka jar/tar/zip built by this configuration will differ build-to-build in file order, entry timestamps, and file-system permission bits, exactly the non-determinism Gradle 9 exists to eliminate by default. Given the block's shape (three flipped properties, matching Gradle's own migration snippet exactly, not one property in isolation), the most likely explanation is a carried-forward block from a pre-9.0 build that nobody revisited during the Gradle 8→9 upgrade — this is squarely the failure mode Gradle's own upgrade guide's revert-snippet exists to let people do *deliberately*, and here it reads as inherited rather than deliberate. Whether it is deliberate or not is not independently verifiable from the source alone; a rule can only say "this must be justified in a comment or removed," not assert intent it cannot see.

**`micronaut-projects/micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:74-75`**:

```groovy
tasks.withType(Jar).configureEach {
    reproducibleFileOrder = true
    preserveFileTimestamps = false
}
```

This restates the Gradle 9 default exactly (both properties set to what 9.0.0+ already defaults to). Harmless, but also dead code on a Gradle-9 toolchain — safe to delete, not a correctness bug.

**`diffplug/spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209`**:

```groovy
tasks.withType(AbstractArchiveTask).configureEach {
    preserveFileTimestamps = false
    reproducibleFileOrder = true
}
```

Same as micronaut-core: correct for pre-9 Gradle, now a no-op restating the 9.x default.

**The generalisable finding**: two of the three real hits are legacy-correct-but-now-redundant; one is a genuine, unnoticed opt-out. A rule that tells an agent "check whether `preserveFileTimestamps`/`reproducibleFileOrder` are set correctly" must (a) read the Gradle wrapper version first, and (b) on Gradle ≥9.0.0, treat *any* explicit setting of these two properties as suspect until proven otherwise — because on 9+ the only two states worth seeing in source are "not set at all" (correct, uses the new default) or "set to the *old* defaults with a comment explaining why reproducibility is deliberately disabled for this artifact." Setting them to the *new* defaults is dead code; setting them to the *old* defaults without comment is very likely an unexamined carry-over, as in kafka's case.

## Normative guidance candidates

1. **Every custom task/artifact-transform property MUST carry exactly one input/output/`@Internal`/`@Console` annotation.**
   Rationale: an unannotated property silently disables up-to-date checking and caching for the whole task ([validation_problems#missing_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: `./gradlew validatePlugins` (plugin modules) reports `missing_annotation`; for any custom `Task` subclass outside a plugin, `./gradlew <task> --configuration-cache` plus manual code review of every `abstract val`/getter without an annotation.

2. **Never annotate a file or directory path with `@Input`; use `@InputFile`/`@InputDirectory`.**
   Rationale: `@Input` stores the value (the path string or `File` object), not content — Gradle does not notice the file changing ([validation_problems#incorrect_use_of_input_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: `validatePlugins` reports `incorrect_use_of_input_annotation`; grep `@get:Input\b` (Kotlin) or `@Input` (Java/Groovy) followed by a `File`/`RegularFile`/`Directory`-typed property.

3. **Annotate `@PathSensitive(NONE)` for a single input file, `@PathSensitive(RELATIVE)` for an input directory; never `ABSOLUTE` outside a genuinely machine-specific input.**
   Rationale: `ABSOLUTE` makes the build cache non-relocatable across machines and checkouts — a top named cause of cross-machine cache misses ([best_practices_tasks §7](https://docs.gradle.org/current/userguide/best_practices_tasks.html)).
   Verify: grep `PathSensitivity.ABSOLUTE` across `*.gradle.kts`/custom task source; any hit needs a comment justifying it (e.g. a genuinely absolute toolchain path that must invalidate on move).

4. **A JVM compile-time classpath input MUST be annotated `@CompileClasspath`, never plain `@InputFiles` or `@Classpath`.**
   Rationale: `@CompileClasspath` ignores everything but ABI-affecting class changes, enabling compile avoidance; `@InputFiles` busts the cache on upstream jar-internal timestamp/manifest/resource changes that have zero effect on what gets compiled ([incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html)).
   Verify: for any custom `JavaCompile`-adjacent task, grep the classpath property's annotation; a plain `@InputFiles`/`@Classpath` on a property literally named `compileClasspath` (or fed from `sourceSets.main.compileClasspath`) is the smell.

5. **Every cacheable task or artifact transform must declare a normalization strategy on every file/file-collection input.**
   Rationale: without one, "caching is highly ineffective" per Gradle's own text — a cacheable task can still resolve cache keys, but a path change anywhere invalidates it ([validation_problems#missing_normalization_annotation](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: `./gradlew validatePlugins` reports `missing_normalization_annotation` for plugin modules; `enableStricterValidation = true` extends the same check to all tasks in a plugin build.

6. **Never annotate a cacheable artifact transform's input `@PathSensitive(ABSOLUTE)`.**
   Rationale: transforms execute in an isolated, cache-resilient workspace, so an absolute path is both meaningless and blocks caching ([validation_problems#cacheable_transform_cant_use_absolute_sensitivity](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: `validatePlugins`/`enableStricterValidation` reports `cacheable_transform_cant_use_absolute_sensitivity`; grep `TransformAction` implementations for `PathSensitivity.ABSOLUTE`.

7. **A task's real dependency on another task's output MUST be wired through the `Provider`/task-output chain (`.from(producerTask)`, `.set(producer.flatMap { it.outputFile })`), never inferred from a bare `File`/`archivePath` reference plus incidental ordering.**
   Rationale: `implicit_dependency` — the build result then depends on execution order that only holds by luck (single-threaded, non-`clean`, non-`--parallel` runs) ([validation_problems#implicit_dependency](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: `validatePlugins`/`enableStricterValidation`; manual grep of any `.archivePath`/`.get().asFile` reference to another task followed by no `dependsOn`/`Provider` wiring; run the same build with `--parallel` and a clean checkout — a flaky failure there is the symptom.

8. **`@DisableCachingByDefault` on a non-cacheable task/transform MUST carry a `because = "..."` reason.**
   Rationale: authors should always state *why* something isn't cacheable rather than leave it ambiguous whether non-cacheability was a decision or an oversight ([validation_problems#disable_caching_by_default](https://docs.gradle.org/current/userguide/validation_problems.html)).
   Verify: grep `@DisableCachingByDefault` without `(because =`; `validatePlugins` reports `disable_caching_by_default` for tasks with neither `@CacheableTask` nor a reasoned `@DisableCachingByDefault`.

9. **A plugin module's CI MUST run `./gradlew validatePlugins` as its own explicit step, never rely on it being pulled in by `build`/`check`/`jar`.**
   Rationale: `java-gradle-plugin` registers the task, but the same plugin is routinely applied to internal convention-plugin modules that are not published plugins — presence of the task proves nothing about it having run or failed anything ([`exemplar-publishing-ci-bazel.md` Axis F, M-F-08](../jvm-audit/exemplar-publishing-ci-bazel.md)); the jar-time check that *does* run implicitly only warns, never fails ([java_gradle_plugin.html](https://docs.gradle.org/current/userguide/java_gradle_plugin.html)).
   Verify: the CI workflow file for a `com.gradle.plugin-publish`-applying module contains an explicit `./gradlew validatePlugins` (or `:pluginModule:validatePlugins`) step; absence of that literal step is the finding, not absence of the task from `./gradlew tasks`.

10. **On Gradle ≥9.0.0, an explicit `reproducibleFileOrder`/`preserveFileTimestamps`/`useFileSystemPermissions()` block on an `AbstractArchiveTask` MUST be read as a reproducibility opt-out and requires a justifying comment, not treated as harmless legacy boilerplate.**
    Rationale: Gradle 9.0.0 flipped all three defaults to reproducible; setting them to the pre-9 values (as `apache/kafka@940c100fab:build.gradle:362-364` does under wrapper 9.7.1) is an active regression to non-deterministic archives, most plausibly an unexamined carry-over from before the Gradle 8→9 upgrade ([upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html)).
    Verify: read `gradle/wrapper/gradle-wrapper.properties` for the wrapper version first; if ≥9.0, grep every `tasks.withType(AbstractArchiveTask|Jar|Zip|War|Ear)` block for `reproducibleFileOrder\s*=\s*false` or `preserveFileTimestamps\s*=\s*true` or a call to `useFileSystemPermissions()` — any hit without an adjacent comment explaining why reproducibility is deliberately disabled for that artifact is the finding. On Gradle <9.0, absence of an explicit `reproducibleFileOrder = true; preserveFileTimestamps = false` block is instead the finding.

## Exemplar evidence

| Candidate | Repo@sha:path:line | Satisfies / violates / contradicts |
|---|---|---|
| #4 (`@CompileClasspath`) | Not independently re-measured in this dive; `gradle/gradle`'s own build-logic is the canonical positive example per Gradle's own docs, not corpus-verified here | — |
| #9 (`validatePlugins` explicit CI step) | `gradle/actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml` and `detekt/detekt@45672efb8b:build.gradle.kts:79-88` run version-matrix functional tests but this dive did not re-confirm an explicit `validatePlugins` CI line in either — flagged uncovered, follow-up for `plugin-contract-and-validation` or `testkit-matrix-and-portal` dives which own `GRADLE-PLUG` | — |
| #10 (Gradle 9 reproducible-archive opt-out) | `apache/kafka@940c100fab:build.gradle:362-364`, wrapper `gradle-wrapper.properties: distributionUrl=…gradle-9.7.1-bin.zip` | **Violates** — full opt-out on a Gradle 9.7.1 build, undocumented |
| #10 (restated-default, now dead code) | `micronaut-projects/micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:74-75` | Neither violates nor helps — correct for pre-9, redundant on 9+ |
| #10 (restated-default, now dead code) | `diffplug/spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209` | Same as above |
| #7 (`implicit_dependency`) | Not independently re-measured in this dive; named in [`failure-build-and-deps.md`](../jvm-topic-map/failure-build-and-deps.md) as a general Gradle anti-pattern, no specific corpus line cited there either | Uncovered in corpus — the pattern is common enough in the wild that Gradle's own docs use a `jar.archivePath` example, but no exemplar hit was traced in this dive's budget |

## AI-agent angle

- **Hallucinated or stale `@InputFiles` on a classpath property.** An LLM trained on pre-2019 Gradle idioms defaults every file-collection input to `@InputFiles`, including compile classpaths, because that's the annotation shown in most tutorial-era snippets. Check: grep any property literally named `*[Cc]lasspath*` for `@InputFiles`/`@Classpath` instead of `@CompileClasspath`.
- **Copy-pasting the "fix reproducible builds" snippet without checking the Gradle version.** Models trained on years of Stack Overflow answers reproduce the pre-9 advice ("add `preserveFileTimestamps = false; reproducibleFileOrder = true`") as a fix for non-reproducible jars — on Gradle 9+ this is a no-op at best, and pattern-matching the *inverse* (present in the source, therefore "already fixed") is actively wrong when the values are flipped, as in kafka's case. Check: before touching archive-task reproducibility, read `gradle-wrapper.properties`.
- **Assuming `validatePlugins` gates the build because the task exists.** A model asked "does this plugin validate cleanly" that only checks for the task's existence (`./gradlew tasks` lists it) rather than actually running it and reading `BUILD FAILED`/`BUILD SUCCESSFUL` will report false confidence — `java-gradle-plugin` registers the task on any module that applies it, published plugin or not. Check: run the task, don't grep for its registration.
- **Treating the jar-time "warning" and the `validatePlugins` "failure" as the same check at two strictness settings.** They're two independently-implemented validations that happen to overlap in content; a model told "there's a warning, that's fine" may miss that `validatePlugins` would hard-fail on the same input. Check: run both — `./gradlew jar` and `./gradlew validatePlugins` — and diff the output.
- **Using `@Input` on a `File`/path property because it "feels like an input."** This is the single most natural-language-plausible mistake in the whole annotation set — `@Input` reads as the generic/default choice to a model that hasn't internalised that Gradle overloads "input" as a noun (any task input) and `@Input` as a specific annotation (non-file value). Check: `validatePlugins` catches it as `incorrect_use_of_input_annotation`; a reviewer heuristic is "does this property's declared type implement `FileSystemLocation`/`File`/`FileCollection`? If so, `@Input` is wrong on sight."
- **Marking a task `@CacheableTask` and stopping there**, without normalizing every file input — a model treats the class-level annotation as the whole job because it's the most visible line. Check: `validatePlugins` with `enableStricterValidation = true` catches missing per-property normalization even when the class is correctly annotated.

## Contested / evolving

- **Whether kafka's `preserveFileTimestamps = true` block is a deliberate choice or an oversight is not resolvable from the source alone.** The block's exact match to Gradle's own "restore pre-9 behaviour" migration snippet is suggestive of an unexamined carry-over, but Kafka could have a real reason (e.g. downstream tooling that keys off jar entry timestamps) not visible in this build file. A rule can flag it as needing a justifying comment; it cannot assert the maintainers are wrong. As of 2026-09-12, no comment or commit message explaining the block was found in the sparse-checkout build file itself.
- **Whether `validatePlugins` is wired into `check`/`build` by default is genuinely unclear from Gradle's own docs as fetched.** Community sources describe it as "typically wired" as a verification task following the general `check.dependsOn(verificationTask)` convention, but no primary source fetched in this dive states this as a guaranteed default for `java-gradle-plugin` specifically. Trending toward: treat it as *not* guaranteed and require an explicit CI step (candidate #9) until a primary source settles it — the cost of an explicit step is one line, the cost of assuming implicit wiring and being wrong is a silently-unvalidated published plugin.
- **The severity of the reproducible-archive rule genuinely differs by Gradle major version and is still moving.** Gradle 9.x is preferred-with-fallback for the configuration cache and the default-execution-mode target for that separate feature has already slipped from 10.0 to 11.0 ([topic map conflict 18](../../jvm-topic-map.md)); whether a future Gradle 10/11 changes anything about the *archive*-reproducibility defaults specifically (as opposed to configuration cache) was not asserted by any 9.0.0/9.7.0 release note fetched here, so this rule's Gradle-9-vs-8 framing should be re-checked against Gradle 10's release notes once they exist.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html) | Official Gradle User Manual — incremental build annotations | Current docs, fetched 2026-09-12; content stable across Gradle 7–9 | Primary source for the full `@Input*`/`@Output*`/`@Nested`/`@Internal`/`@Classpath`/`@CompileClasspath` annotation table |
| [docs.gradle.org/current/userguide/best_practices_tasks.html](https://docs.gradle.org/current/userguide/best_practices_tasks.html) | Official Gradle Best Practices — tasks | Current docs, fetched 2026-09-12 | Primary source for the `@PathSensitive` per-kind recommendation, `dependsOn` avoidance, `@CacheableTask`/`@DisableCachingByDefault` preference |
| [docs.gradle.org/current/userguide/java_gradle_plugin.html](https://docs.gradle.org/current/userguide/java_gradle_plugin.html) | Official Gradle User Manual — Java Gradle Plugin | Current docs, fetched 2026-09-12 | Primary source for the jar-time "warning only" validation behaviour and `gradlePlugin{}` metadata wiring |
| [docs.gradle.org/current/userguide/validation_problems.html](https://docs.gradle.org/current/userguide/validation_problems.html) | Official Gradle User Manual — the 31 validation problem IDs, live page | Current docs, fetched 2026-09-12 | Primary source, confirmed matches the raw adoc 1:1, all 31 IDs enumerated |
| [raw.githubusercontent.com/gradle/gradle/master/.../unused/validation_problems.adoc](https://raw.githubusercontent.com/gradle/gradle/master/platforms/documentation/docs/src/docs/userguide/unused/validation_problems.adoc) | Gradle's own docs source for the above page | `master` branch, fetched 2026-09-12 | Full unrendered text with anchors and code samples, avoided any HTML-rendering loss |
| [docs.gradle.org/9.0.0/release-notes.html](https://docs.gradle.org/9.0.0/release-notes.html) | Official Gradle 9.0.0 release notes | 2025-07-31 release | Primary, normative source that archive tasks became reproducible by default |
| [docs.gradle.org/current/userguide/upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html) | Official Gradle upgrade guide, "To version 9.0.0" | Current docs, fetched 2026-09-12 | Primary source for the exact old→new default values of `reproducibleFileOrder`/`preserveFileTimestamps`/file permissions, and the documented revert snippet |
| [docs.gradle.org/current/javadoc/org/gradle/api/tasks/bundling/AbstractArchiveTask.html](https://docs.gradle.org/current/javadoc/org/gradle/api/tasks/bundling/AbstractArchiveTask.html) | Gradle API javadoc, current | Current docs, fetched 2026-09-12 | Confirms per-property "Gradle defaults to X if not set explicitly starting Gradle 9.0.0" wording directly in the javadoc |
| [docs.gradle.org/current/javadoc/org/gradle/plugin/devel/tasks/ValidatePlugins.html](https://docs.gradle.org/current/javadoc/org/gradle/plugin/devel/tasks/ValidatePlugins.html) | Gradle API javadoc for the `ValidatePlugins` task | Current docs, fetched 2026-09-12 | Primary source that `validatePlugins` fails the build by default (unlike the jar-time check) and what `enableStricterValidation` does |
| [reproducible-builds.org/docs/jvm/](https://reproducible-builds.org/docs/jvm/) | Reproducible Builds project — JVM-specific guidance | Community reference, fetched 2026-09-12; pre-dates the Gradle 9.0.0 default flip (still recommends setting the properties explicitly) | Independent confirmation of what causes JVM archive non-reproducibility (timestamps, file order, permissions, `Properties.store()` date comments) — useful for the *why*, dated for the *how* on Gradle 9+ |
| `apache/kafka@940c100fab:build.gradle:362-364` + `gradle/wrapper/gradle-wrapper.properties` | Exemplar corpus, direct `git show` read | Measured 2026-09-12 against the frame's pinned SHA | The chase-the-surprise hit: confirms wrapper 9.7.1 and the exact reverted-defaults block |
| `diffplug/spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209` | Exemplar corpus, direct `git show` read | Measured 2026-09-12 | Second real hit, confirms pre-9-correct/9-redundant shape |
| `micronaut-projects/micronaut-core@d5842045bb:buildSrc/.../io.micronaut.build.internal.convention-base.gradle:74-75` | Exemplar corpus, direct `git show` read | Measured 2026-09-12 | Third real hit, same shape as spotless |
| [`jvm-audit/exemplar-publishing-ci-bazel.md`](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own wave-1 audit | 2026-09-05 | Established the 9x-overcount grep-vs-real-hits finding this dive re-derived semantics for; source of the `validatePlugins`-applies-to-non-plugin-modules routing trap (M-F-08) |

## Frame corrections / notes for the map

None — this dive confirms the map's conflict 21 finding exactly (kafka's block is now a real opt-out, not a no-op) and adds the version-flip table and validatePlugins two-tier-check distinction the map's DECIDE items asked for.
