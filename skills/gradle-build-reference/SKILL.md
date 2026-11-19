---
name: gradle-build-reference
description: Depth files behind the gradle-build rule, loaded on demand. Use when the gradle-build rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the gradle-build rule
  keywords: gradle,kotlin-dsl,build-logic,convention-plugin,version-catalog,configuration-cache,reference
  claude.user-invocable: "false"
---

# gradle-build-reference

Depth for the `gradle-build` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [caching-and-correctness.md](caching-and-correctness.md) | Configuration cache, task inputs and outputs, Isolated Projects, archive defaults (GRADLE-CACHE) |
| [ci.md](ci.md) | CI workflows running Gradle: wrapper validation, cache switches, build scans, JDK matrix (GRADLE-CI) |
| [dependencies.md](dependencies.md) | Dependency scopes, platforms and BOMs, conflicts, locking, verification, version catalogs (GRADLE-DEP) |
| [distribution.md](distribution.md) | Fat jars and shading, application plugin, bootJar, jlink, jpackage, Jib (GRADLE-DIST) |
| [plugin-authoring.md](plugin-authoring.md) | Plugin<Project> and Plugin<Settings>, ValueSource, BuildService, TestKit, Plugin Portal (GRADLE-PLUG) |
| [publishing.md](publishing.md) | Publications, POM metadata, signing, Module Metadata, release-job exit semantics (GRADLE-PUB) |
| [structure-and-conventions.md](structure-and-conventions.md) | Subprojects, convention plugins, buildSrc versus build-logic, settings files (GRADLE-STRUCT) |
| [toolchains-and-compilation.md](toolchains-and-compilation.md) | Java toolchains, JDK acquisition, options.release, encoding, wrapper pin (GRADLE-TOOL) |
