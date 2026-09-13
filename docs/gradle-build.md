# gradle-build

Standards for what a Gradle build claims about itself in files no compiler
checks: the gate, eighteen merge-blocking non-negotiables, and eight depth
files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/gradle-build
```

Loads on `**/*.gradle.kts`, `**/*.gradle`, `**/gradle.properties`,
`**/*.versions.toml`, the wrapper descriptor, `verification-metadata.xml` and
both lockfile names. The index is 171 lines and always present; a depth file is
read only when the work calls for it.

## It starts with what a green build does not prove

Four defects pass `./gradlew build` and look identical to a pass, which is why
this set opens by naming them rather than by stating a rule.

The configuration cache may be off, because Gradle 9 disables it for a task and
carries on rather than failing. `validatePlugins` never ran, so every
task-annotation defect stayed a warning nobody reads. Nothing is pinned,
because a version catalog constrains requests and pins nothing without a
committed lockfile beside it. And an `org.gradle.*` key may sit in a
`gradle.properties` that is not a build root, where it is read by nothing and
believed by everyone.

The gate is six commands for that reason. The cheapest of them is the whole
configuration-cache contract: no problems line and no report file is the pass,
and any report file is the finding.

## What is in it

The index carries the gate, eighteen non-negotiables, and three cross-cutting
rules it owns outright. 134 rules in total, 93 of them merge-blocking, spread
over eight depth files: build structure and convention plugins, dependencies
and the trust that backs them, configuration-cache and task correctness,
toolchains and the wrapper, plugin authoring, distribution, publishing to
Central, and the pipeline around a Gradle invocation.

Two of those files are reachable only through the index's routing table,
because no glob here reaches them. The whole CI family governs files under
`.github/workflows/`, and the dependencies file has to be read from the index
whenever you touch a version catalog, since the point of one of its rules is
that the conventional filename is a false negative. A glob narrow enough to
miss is worse than no glob at all, so the index routes by task instead.

## Pinned decisions

A Gradle plugin's consumer floor is 8.11, with a TestKit matrix covering that
floor and current stable Gradle, and a release-candidate leg on a scheduled job
only. A repository that publishes releases commits both a lockfile and
verification metadata, reviews every regeneration diff by hand, and never
clears a missing-checksum entry by editing the file. The CI JDK matrix runs
three legs.

Each is a default an adopter overrides once, in their own convention plugin or
root `gradle.properties`, never per module. The Block list is kept short, with
two deliberate exceptions: publishing, where coordinates are immutable and a
bad release is unrecoverable, and caching, where the defect never surfaces as a
failure and is paid for as a stale artifact instead.

## Kotlin DSL is the example language

Every snippet is Kotlin DSL. Groovy appears exactly twice, in the two places
the DSLs genuinely need different text, and a Groovy build is explicitly not a
finding anywhere in the set. Rewriting a working Groovy build script to Kotlin
is churn, and this set does not ask for it.

## What it does not cover

Maven's answers to the same questions, which are `maven-build`'s, on globs this
set does not touch. The Java or Kotlin sources the build compiles.

It also does not cover Bazel. A repository that builds with Bazel and keeps a
Gradle build as a publishing handoff gets the Bazel half from `bazel-quality`,
which already owns `BUILD.bazel`; the Java-and-Kotlin-under-Bazel depth file
belongs to that set and is not published here, so no two rules glob the same
build file. The publishing handoff itself is governed here, because Bazel does
not publish to Central.

## Siblings

`maven-build` answers the same questions for the other build system and never
loads together with this one, because the globs are disjoint. Where the two
ecosystems genuinely disagree, each says so and names the other's rule rather
than inventing an analogue.

`java-quality` and `kotlin-quality` cover the sources this build compiles. The
`.gradle.kts` overlap with `kotlin-quality` is deliberate, because a Kotlin-DSL
build script is Kotlin source: editing one loads both indexes, and editing a
`.kt` or `.java` source file loads neither build rule. Bundled as
`jvm-essentials`.
