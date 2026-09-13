---
title: Exemplar build-shape audit (Gradle / Maven / Ant census across 32 JVM repos)
agent: jvm-audit-build-shape
model: sonnet
scope: "Build-system shape only (DSL, build-logic layout, anti-patterns, gradle.properties, toolchains, dependency management, multi-module structure, Ant/legacy) across the 32-repo exemplar corpus fetched for the JVM research program. Not a code-quality or test/lint audit."
method: "Read-only measurement with git ls-tree/show and grep/find/wc over blob-less depth-1 clones under scratchpad/exemplars/<owner>__<repo>. Every number below has its exact command inline. Corpus fixed by scratch/exemplar-table.sh (reproduced under Headline numbers). Shell is zsh (Shell: zsh in env) — unquoted `for x in $var` does NOT word-split in zsh (only unquoted `for x in $(cmd)` does); loops below use the command-substitution form or `find -exec`/`xargs` to stay shell-safe, and one earlier draft of the Maven census that used the broken form was caught empirically and rewritten (see Gaps)."
date_researched: 2026-09-05
---

# Exemplar build-shape audit

32 repos, one commit each, no build ever run. Every table is a `grep`/`find` census over
files materialized by the fetch script's sparse checkout (confirmed representative: the
handful of `.gradle`/pom files present in `git ls-tree` but absent on disk are, in every
repo checked, test fixtures under `dockerTest/`, `src/test/resources/`, or Maven-conversion
integration-test resources — not real build files; see Gaps).

## Table of contents

1. [Headline numbers](#headline-numbers)
2. [Build system and DSL](#1-build-system-and-dsl)
3. [Build-logic layout](#2-build-logic-layout)
4. [Anti-pattern census](#3-anti-pattern-census)
5. [gradle.properties](#4-gradleproperties)
6. [Toolchains and language levels](#5-toolchains-and-language-levels)
7. [Dependency management posture](#6-dependency-management-posture)
8. [Multi-module structure](#7-multi-module-structure)
9. [Ant and legacy](#8-ant-and-legacy)
10. [Smells (ranked)](#smells-ranked)
11. [Patterns worth encoding](#patterns-worth-encoding)
12. [Contradictions of the frame](#contradictions-of-the-frame)
13. [Gaps](#gaps)

## Headline numbers

Command: `bash jvm-audit/scratch/exemplar-table.sh <exemplars-dir>` (reproduced fresh 2026-09-05, identical to the frame's table — SHAs below are what every citation in this file was measured against).

| repo | sha |
|---|---|
| android/nowinandroid | `12f80da651` |
| apache/ant | `8c96cd6869` |
| apache/kafka | `940c100fab` |
| apache/maven | `ea4a417bd2` |
| apollographql/apollo-kotlin | `c145295b72` |
| assertj/assertj | `485502bad2` |
| bazelbuild/bazel | `948b8c70e2` |
| bazelbuild/rules_java | `4206909b6d` |
| bazelbuild/rules_kotlin | `7c51dd1210` |
| bazel-contrib/rules_jvm_external | `449754dcbb` |
| cashapp/sqldelight | `4580923af3` |
| detekt/detekt | `45672efb8b` |
| diffplug/spotless | `dc2a4cb9a3` |
| FasterXML/jackson-databind | `a906e1782b` |
| google/dagger | `4fbc045d2b` |
| google/error-prone | `c1f99ad5d3` |
| google/guava | `5fb424c43a` |
| gradle/actions | `a27deee331` |
| gradle/gradle | `ea17004a31` |
| GradleUp/shadow | `541b3be475` |
| grpc/grpc-java | `fc4314419d` |
| JetBrains/Exposed | `4be9aee04c` |
| junit-team/junit-framework | `35c56a8e02` |
| Kotlin/kotlinx.coroutines | `f63a04bacb` |
| ktorio/ktor | `f92fad0435` |
| micronaut-projects/micronaut-core | `d5842045bb` |
| mockito/mockito | `5a676bcd9e` |
| pinterest/ktlint | `4c933394a3` |
| spring-projects/spring-boot | `93b23c40c2` |
| square/okhttp | `dfcfab3824` |
| testcontainers/testcontainers-java | `a4d3a033d8` |
| uber/NullAway | `519a1bb826` |

Top-line counts (commands inline in each section below):

- **Build systems (raw tag)**: 25/32 gradle, 15/32 maven, 7/32 bazel, 5/32 have a `build.xml` somewhere — but only **1/32 (apache/ant) is actually built with Ant**. Every other `build.xml` hit is a documentation snippet or integration-test fixture (§8).
- **"Dual Gradle+Maven" is almost never real**: of the 10 gradle-tagged repos that also carry a `pom.xml`, **0 build themselves with both**. Every incidental pom is either a Maven-consumability example/test for a Gradle-built library (dagger, grpc-java, okhttp, Exposed, junit-framework) or a plugin's own integration-test fixture (spring-boot's 170, gradle/gradle's 46). Only 5 repos have Maven as their real, sole build: apache/maven, assertj, error-prone, guava, jackson-databind.
- **Genuine dual-build (two systems that actually compile the code)**: dagger (334 BUILD.bazel + Gradle), grpc-java (35 BUILD.bazel + Gradle), bazelbuild/bazel (577 BUILD files, self-hosted; Gradle/Maven/Ant tags are all incidental — see §1).
- **Version catalog (`gradle/libs.versions.toml`, conventional path)**: 15/32. Two more repos wire catalogs by a *different* mechanism: gradle/gradle itself does **not** use `gradle/libs.versions.toml` for its own build — see [Contradictions](#contradictions-of-the-frame).
- **`dependencyLocking` / `*.lockfile`**: **0/32.** Not one exemplar locks dependencies.
- **`gradle/verification-metadata.xml`**: **1/32** (gradle/gradle only).
- **`org.gradle.isolated-projects=true`**: 5/32 (nowinandroid, gradle/gradle, shadow, junit-framework, okhttp). **`org.gradle.unsafe.isolated-projects` (the old key): 0/32** — the property was renamed/stabilized between the versions in this corpus.
- **`gradlePlugin { plugins { … } }` block present** (i.e. the repo ships at least one Gradle plugin): 12/32.
- **Java 8 bytecode still targeted in 2026**: guava (`<source>1.8</source>`, root pom) and grpc-java (`options.release = 8`, root build.gradle) — both explicitly, not by omission.

## 1. Build system and DSL

Command: `awk -F'|' 'NR>2{print $4}' exemplar-table.md | sort | uniq -c` style counts over the table above.

| system | repos | note |
|---|---|---|
| gradle | 25 | |
| maven | 15 | only 5 are Maven-*primary* (see Headline) |
| bazel | 7 | dagger, grpc-java, bazel, rules_java, rules_kotlin, rules_jvm_external, error-prone |
| ant (`build.xml` present) | 5 | only apache/ant genuinely built by Ant |

**Root settings-file DSL** — `git ls-tree -r --name-only HEAD | grep -c '^settings\.gradle\.kts$\|^settings\.gradle$'` per repo: 13 root-kts, 8 root-groovy, 21 total (the other 11 repos — bazel family, maven-only, ant-only — have no root settings file at all). Groovy-DSL holdouts at the root: apache/kafka, cashapp/sqldelight, diffplug/spotless, grpc/grpc-java, micronaut-core, spring-boot, testcontainers-java, uber/NullAway (8 repos) — matches the frame's "Groovy-DSL holdouts" hypothesis for kafka/testcontainers and extends it to 6 more.

**Gradle wrapper** — `git show HEAD:gradle/wrapper/gradle-wrapper.properties`, root wrapper only (21 of 25 gradle repos have one; `bazelbuild/bazel`, `bazelbuild/rules_kotlin`, `google/guava`, and `gradle/actions` do not — actions' only wrapper-bearing dir is a GH Actions *workflow sample*, `.github/workflow-samples/gradle-plugin/gradle/wrapper/gradle-wrapper.properties`, not the repo's own build):

| repo | version | -bin/-all | sha256 | networkTimeout | validateDistributionUrl |
|---|---|---|---|---|---|
| gradle/gradle | 9.8.0-milestone-2 | bin | **no** | yes | yes |
| nowinandroid | 9.7.1 | bin | yes | yes | yes |
| apache/kafka | 9.7.1 | bin | yes | yes | yes |
| sqldelight | 9.7.1 | bin | yes | yes | yes |
| detekt | 9.7.1 | bin | yes | yes | yes |
| spotless | 9.7.1 | bin | yes | yes | yes |
| junit-framework | 9.7.1 | bin | yes | yes | yes |
| shadow | 9.7.1 | bin | **no** | yes | yes |
| micronaut-core | 9.7.1 | bin | **no** | yes | yes |
| ktlint | 9.7.1 | bin | yes | yes | yes |
| spring-boot | 9.7.0 | bin | **no** | yes | yes |
| ktor | 9.6.1 (via `cache-redirector.jetbrains.com`) | bin | yes | yes | yes |
| okhttp | 9.6.1 | bin | **no** | yes | yes |
| NullAway | 9.6.1 | bin | yes | yes | yes |
| apollo-kotlin | 9.4.0 | bin | **no** | yes | yes |
| grpc-java | 8.14.5 | bin | **no** | yes | yes |
| Exposed | 8.14.4 | bin | **no** | yes | yes |
| kotlinx.coroutines | 8.14.4 | bin | yes | yes | yes |
| dagger | 8.14.3 | bin | **no** | yes | yes |
| testcontainers-java | 8.14.3 | **all** | yes | yes | yes |
| mockito | 8.14.2 | bin | yes | yes | yes |

`distributionSha256Sum` is present in only **12/21** wrapper files; every wrapper (21/21) already has `networkTimeout` and `validateDistributionUrl` (both are wrapper defaults as of the Gradle versions in this corpus, not something authors add by hand). testcontainers-java is the only `-all` distribution in the corpus (source+docs bundled, presumably for IDE-attach during its own development).

**Maven wrapper / `.mvn/`** — `git cat-file -e HEAD:.mvn/wrapper/maven-wrapper.properties` etc., checked on the 5 Maven-primary repos + kafka/bazel (which are gradle/bazel-primary but happened to be checked for completeness):

| repo | `.mvn/wrapper` distributionUrl | `.mvn/maven.config` | `.mvn/jvm.config` | `.mvn/extensions.xml` |
|---|---|---|---|---|
| apache/maven | none (self-hosting — see below) | `-D sessionRootDirectory=${session.rootDirectory} -D apache.snapshots` | no | no |
| assertj | `apache-maven-3.9.16-bin.zip` | `-Daether.checksums.algorithms=SHA-512,SHA-256,SHA-1,MD5 -Daether.connector.smartChecksums=false` | no | no |
| jackson-databind | `apache-maven-3.9.11-bin.zip` | no | no | no |
| guava | `apache-maven-3.9.12-bin.zip` | no | no | no |
| error-prone | none | none | none | none |

apache/maven ships no `mvnw` — the tool that *is* Maven doesn't wrap itself. `.mvn/extensions.xml` appears in **0/32** repos.

**Maven POM shape** — `git ls-tree` count of `pom.xml` + root `<parent>`/`<module>` grep (`google__guava@5fb424c43a:pom.xml`, `FasterXML__jackson-databind@a906e1782b:pom.xml` etc.):

| repo | poms (all) | root pom? | `<module>` count | root `<parent>` |
|---|---|---|---|---|
| apache/maven | 2031 | yes | 5 | `org.apache.maven:maven-parent:49` (ASF parent — self-hosted bootstrap) |
| assertj | 15 | yes | 5 | none (standalone aggregator) |
| jackson-databind | 1 | yes | 0 (single-module) | `tools.jackson:jackson-base:3.3.0-SNAPSHOT` |
| guava | 14 | yes | 5 | none (standalone aggregator) |
| error-prone | 10 | yes | 9 | none (standalone aggregator) |
| apache/ant | 27 | no | – | – |
| apache/kafka | 3 | no (incidental, streams quickstart archetype) | – | – |
| bazelbuild/bazel | 1 | no (vendored proguard buildscript) | – | – |
| google/dagger | 2 | no (`examples/maven/`) | – | – |
| gradle/gradle | 46 | no (Maven-conversion integTest fixtures + `.teamcity/pom.xml`) | – | – |
| grpc-java | 8 | no (`examples/*` consumability samples) | – | – |
| Exposed | 3 | no (Maven-plugin fixtures + doc snippets) | – | – |
| junit-framework | 3 | no (tooling-support-tests projects) | – | – |
| spring-boot | 170 | no (spring-boot-maven-plugin dockerTest fixtures) | – | – |
| okhttp | 1 | no (`maven-tests/`) | – | – |

2031 poms in apache/maven is the Maven test suite itself (its integration-test harness spins up hundreds of tiny fixture projects, each with a pom.xml — `compat/maven-compat/src/test/resources/inheritance-repo/...`).

**Ant** — see §8 (only apache/ant genuinely uses it).

## 2. Build-logic layout

Command: `find <dir>/{buildSrc,build-logic,gradle/plugins} -type f | wc -l` + LOC via `cat … | wc -l`, run per repo (files fully materialized on disk for these dirs even in repos with a mostly-sparse checkout, e.g. gradle/gradle has 841/29233 files checked out overall but all 484 of `build-logic/` are present).

| repo | dir | files | LOC | precompiled script plugins (`*.gradle.kts` under `src/main/kotlin`) | binary `Plugin<Project/Settings>` classes |
|---|---|---|---|---|---|
| gradle/gradle | build-logic | 484 | 40242 | 64 | 9 |
| spring-boot | buildSrc | 249 | 25907 | 0 | 22 |
| junit-framework | gradle/plugins | 54 | 2768 | 25 | 0 |
| ktor | build-logic | 51 | 2966 | 15 | 0 |
| nowinandroid | build-logic | 32 | 2087 | 0 | 16 |
| kotlinx.coroutines | buildSrc | 29 | 1677 | 13 | 0 |
| mockito | buildSrc | 20 | 800 | 15 | 0 |
| micronaut-core | buildSrc | 18 | 835 | 0 | 1 |
| apollo-kotlin | build-logic | 16 | 1143 | 0 | 0 |
| okhttp | build-logic | 13 | 1044 | 6 | 0 |
| detekt | build-logic | 11 | 489 | 5 | 0 |
| google/dagger | buildSrc | 9 | 626 | 0 | 1 |
| pinterest/ktlint | build-logic | 8 | 496 | 0 | 4 |
| Exposed | buildSrc | 6 | 300 | 0 | 0 |
| grpc-java | buildSrc | 4 | 382 | 0 | 0 |
| sqldelight | `buildLogic` (camelCase!) | 4 | 82 | 0 | 0 |
| spring-boot | gradle/plugins (2nd dir) | 5 | 183 | 0 | 1 |
| uber/NullAway | buildSrc | 2 | 176 | 0 | 0 |
| testcontainers-java | buildSrc | 3 | 7 | 0 | 0 |

cashapp/sqldelight names its included build `buildLogic` (camelCase, no dash) — `exemplar-table.sh`'s own detector (`grep -qE '^build-logic/'`) misses it entirely, undercounting build-logic adoption by one repo (see Gaps). testcontainers-java's `buildSrc` is essentially empty (7 LOC) — its convention logic lives directly in root Groovy build files instead.

**`includeBuild(...)` in root settings** (`grep -nE 'includeBuild\(' settings.gradle*`):

| repo | includeBuild targets |
|---|---|
| gradle/gradle | `build-logic-settings`, `build-logic-commons`, `build-logic` |
| ktor | `build-settings-logic`, `build-logic`, `ktor-test-server` |
| junit-framework | `gradle/base`, `gradle/plugins` |
| detekt | `build-logic`, `detekt-gradle-plugin` |
| shadow | `gradle/build-logic` |
| sqldelight | `buildLogic` |
| square/okhttp, pinterest/ktlint, android/nowinandroid, apollo-kotlin | `build-logic` |

`enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")` — present in **10/25** gradle repos (nowinandroid, sqldelight, detekt, spotless, Exposed, ktor, micronaut-core, ktlint, okhttp, junit-framework — grep: `grep -c 'enableFeaturePreview("TYPESAFE_PROJECT_ACCESSORS")' settings.gradle*`).

**Version catalog entry counts** (`sed -n '/\[versions\]/,/^\[/p' gradle/libs.versions.toml | grep -cE '^[A-Za-z0-9_.-]+\s*='`, and same for `[libraries]`/`[bundles]`/`[plugins]`), conventional-path catalogs only:

| repo | versions | libraries | bundles | plugins |
|---|---|---|---|---|
| micronaut-core | 92 | 169 | 0 | 5 |
| ktor | 74 | 124 | 0 | 3 |
| nowinandroid | 64 | 103 | 1 | 35 |
| okhttp | 60 | 83 | 0 | 21 |
| NullAway | 52 | 47 | 2 | 6 |
| Exposed | 51 | 75 | 0 | 10 |
| dagger | 21 | 56 | 0 | 9 |
| junit-framework | 18 | 64 | 3 | 16 |
| sqldelight | 15 | 62 | 0 | 17 |
| mockito | 14 | 38 | 0 | 3 |
| detekt | 9 | 41 | 0 | 0 |
| diffplug/spotless | 6 | 49 | 0 | 12 |
| shadow | 4 | 21 | 0 | 7 |
| ktlint | 4 | 19 | 0 | 3 |
| grpc-java | 1 | 81 | 0 | 0 |

**`repositoriesMode` (`FAIL_ON_PROJECT_REPOS`)** — `grep -oE 'repositoriesMode[^)]*'`: only **4/25** set it (nowinandroid, detekt, dagger, ktlint) — most repos leave per-project repository declarations unconstrained even when they've adopted a central catalog.

**`gradlePlugin { plugins { … } }`** — files with the block, and the plugin-id idiom used (`create/register("id") { }` map-key form vs explicit `id = "…"` property form):

| repo | blocks | `create/register("id"){}` hits | `id = "…"` hits |
|---|---|---|---|
| gradle/gradle | 3 | 48 | 4 |
| spring-boot | 3 | 3 | 24 |
| nowinandroid | 1 | 19 | 0 |
| detekt | 1 | 14 | 1 |
| sqldelight | 3 | 1 | 3 |
| ktlint | 1 | 5 | 4 |
| dagger | 1 | 4 | 0 |
| Exposed | 2 | 6 | 2 |
| shadow | 2 | 3 | 0 |
| gradle/actions | 1 | 0 | 1 |
| kafka | 1 | 1 | 0 |
| spotless | 1 | 0 | 0 |

Two competing idioms coexist for the *same* DSL construct — shadow/detekt use the map-key shorthand (`create("com.gradleup.shadow") { implementationClass = … }`, `GradleUp__shadow@541b3be475:build.gradle.kts:210`), spring-boot/gradle/gradle mix both, with the explicit `id = "…"` property style used where the id and the registration key intentionally differ.

## 3. Anti-pattern census

Command per repo: `find <dir> -name '*.gradle' -o -name '*.gradle.kts' | xargs grep -cE '<pattern>' | awk -F: '{s+=$2} END{print s+0}'`, summed across all `.gradle`/`.gradle.kts` files on disk (25 gradle repos; kotlinx.coroutines, rules_kotlin, google/guava included where they have any gradle files at all).

| repo | files | `allprojects{` | `subprojects{` | `afterEval(` | `project(":..")` | `task <Name>` (eager) | `tasks.create(` | `.all{` | `tasks.register(` | `named(` | `configureEach{` | `apply plugin:` | `plugins{` | `System.get(env\|Property)(` | `-Werror` | `compile\|runtime\|testCompile(` |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| spring-boot | 473 | 1 | 1 | 0 | **2370** | 0 | 0 | 14 | 69 | 345 | 4 | 1 | 476 | 1 | 1 | 0 |
| gradle/gradle | 360 | 2 | 1 | 0 | 29 | 0 | 0 | 9 | 32 | 159 | 32 | 1 | 338 | 10 | 1 | 10* |
| grpc-java | 89 | 5 | 1 | 0 | 13 | **32** | 0 | 0 | 45 | 130 | 16 | 14 | 86 | 3 | 2 | 0 |
| dagger | 82 | **10** | **10** | 0 | 49 | 5 | 0 | 5 | 4 | 6 | 8 | 12 | 54 | 8 | 0 | 0 |
| junit-framework | 77 | 0 | 0 | 0 | 5 | 0 | 0 | 1 | 14 | 20 | 27 | 0 | 75 | 12 | 2 | 0 |
| Exposed | 59 | 1 | 2 | 0 | 110 | 0 | 0 | 1 | 0 | 1 | 59 | 0 | 51 | 3 | 0 | 0 |
| detekt | 50 | 1 | 0 | 0 | 11 | 0 | 0 | 0 | 7 | 15 | 15 | 0 | 49 | 0 | 0 | 0 |
| mockito | 44 | 0 | 0 | 0 | 33 | 0 | 0 | 0 | 3 | 3 | 10 | 1 | 40 | 1 | 0 | 0 |
| okhttp | 44 | 0 | 0 | 0 | 19 | 0 | 0 | 3 | 2 | 10 | 5 | 0 | 41 | 2 | 0 | 0 |
| kotlinx.coroutines | 43 | 3 | 1 | 0 | 19 | 0 | 0 | 7 | 4 | 9 | 13 | 0 | 23 | 5 | 0 | 0 |
| uber/NullAway | 35 | 0 | 1 | 0 | 43 | 1 | 0 | 0 | 12 | 24 | 19 | 10 | 33 | 2 | 2 | 0 |
| testcontainers-java | 99 | 0 | 3 | 0 | 17 | 6 | 1 | 4 | 2 | 0 | 0 | **25** | 24 | 8 | 0 | 0 |
| apache/kafka | 9 | 3 | 2 | 0 | 2 | 2 | 2 | 4 | 88 | 2 | 9 | **35** | 3 | 4 | 1 | 0 |
| sqldelight | 51 | 2 | 0 | 0 | 21 | 0 | 0 | 0 | 4 | 29 | 19 | 0 | 52 | 4 | 0 | 0 |
| ktor | 161 | 0 | 0 | 0 | 12 | 0 | 0 | 1 | 3 | 6 | 13 | 0 | 158 | 5 | 0 | 0 |
| micronaut-core | 89 | 1 | 1 | 0 | 0 | 0 | 0 | 5 | 1 | 11 | 30 | 0 | 86 | 7 | 0 | 0 |
| apollo-kotlin | 214 | 0 | 0 | 0 | 109 | 0 | 0 | 1 | 11 | 9 | 14 | 0 | 168 | 10 | 0 | 0 |
| ktlint | 25 | 0 | 0 | 0 | 4 | 0 | 0 | 1 | 0 | 0 | 4 | 0 | 26 | 0 | 0 | 0 |
| shadow | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 7 | 0 | 5 | 0 | 0 | 0 |
| spotless | 15 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 4 | 18 | 11 | **15** | 7 | 2 | 0 | 0 |
| nowinandroid | 39 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 0 | 38 | 1 | 0 | 0 |
| gradle/actions | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 14 | 0 | 0 | 0 |
| bazel | 15 | 1 | 0 | 0 | 0 | 6 | 0 | 1 | 0 | 0 | 0 | 3 | 0 | 43 | 0 | 0 |
| guava | 2 | 0 | 1 | 0 | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_kotlin | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`*` **gradle/gradle's 10 `compile\|runtime\|testCompile(` hits are a false positive**: they are all `runtime(projects.xyz)`, a *custom* configuration named `runtime` declared by gradle/gradle's own `distributions-dependencies` convention plugin (`gradle__gradle@ea17004a31:packaging/core-platform/build.gradle.kts:10`), not the deprecated Gradle `runtime` configuration. **True count of the deprecated `compile`/`runtime`/`testCompile` configurations across the whole corpus: 0.**

Selected citations:
- `apply plugin:` legacy syntax survives almost entirely in **example/test modules**, not main build logic — `apache__kafka@940c100fab:api-checker/build.gradle:68`, `google__dagger@4fbc045d2b:javatests/artifacts/hilt-android/simple/feature/build.gradle:17`, `testcontainers__testcontainers-java@a4d3a033d8` (25 hits, its `examples/` tree).
- `allprojects{`/`subprojects{` in dagger are all inside `javatests/artifacts/**/build.gradle` (Android sample apps), e.g. `google__dagger@4fbc045d2b:javatests/artifacts/hilt-android/viewmodel/build.gradle:35` — not the library's own build.
- Eager `task Name(type: …)` in grpc-java is concentrated in `examples/*/build.gradle` (`grpc__grpc-java@fc4314419d:examples/example-orca/build.gradle:41`), generating `CreateStartScripts` tasks per sample.
- `-Werror` is a convention-plugin decision, not scattered: `gradle__gradle@ea17004a31:build-logic/jvm/src/main/kotlin/gradlebuild.strict-compile.gradle.kts:21`, `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-library-conventions.gradle.kts:142`, `uber__NullAway@519a1bb826:build.gradle:83` (and explicitly commented out at line 112 for a specific module).
- `buildscript { … classpath(…) }` still exists in 11/25 repos, but almost every hit is either (a) `com.android.tools:r8` / AGP in Android example modules (`grpc__grpc-java@fc4314419d:settings.gradle:12`, repeated per-example), or (b) unrelated `classpath = startScripts.classpath` (`CreateStartScripts` task property, nothing to do with buildscript plugin application) — a plain string-match census over-counts this anti-pattern roughly 3x; read citations before flagging it.

## 4. gradle.properties

Command: `grep -vE '^\s*#|^\s*$' gradle.properties` per repo (root file only), 20/25 gradle repos have one.

| key | repos setting it | values seen |
|---|---|---|
| `org.gradle.jvmargs` | 20/20 | `-Xmx2g` … `-Xmx16g` (sqldelight highest); always paired with `-Dfile.encoding=UTF-8` except kafka/apollo-kotlin |
| `org.gradle.caching` | 19/20 | always `true` |
| `org.gradle.parallel` | 17/20 | always `true` |
| `org.gradle.configuration-cache` | 11/20 | always `true` |
| `org.gradle.isolated-projects` | 5/20 | always `true` (nowinandroid, gradle/gradle, shadow, junit-framework, okhttp) |
| `org.gradle.unsafe.isolated-projects` | **0/20** | superseded key, see Contradictions |
| `kotlin.code.style` | 5/20 | always `official` |
| `kotlin.daemon.jvmargs` | 4/20 | nowinandroid, dagger, ktor, micronaut-core |
| `kotlin.incremental` | 3/20 | apollo-kotlin, kotlinx.coroutines, ktor |
| `ksp.*` | 2/20 | nowinandroid (`ksp.project.isolation.enabled=true`), apollo-kotlin |
| `kapt.*` | 1/20 | dagger only |
| `org.gradle.configureondemand` | 2/20 | ktor, testcontainers-java |
| `org.gradle.daemon` | 2/20 | ktor, mockito (both explicit `true`) |
| `org.gradle.warning.mode` | 1/20 | detekt only |
| `org.gradle.workers.max`, `org.gradle.vfs.*` | 0/20 | not seen anywhere in the corpus |

`android/nowinandroid@12f80da651:gradle.properties` is the only repo combining `org.gradle.isolated-projects=true` with `ksp.project.isolation.enabled=true` — the two most aggressive parallelism/correctness flags in the corpus, together, in one file.

## 5. Toolchains and language levels

Command: `grep -ohE 'languageVersion...JavaLanguageVersion.of\([0-9]+\)'` / `jvmToolchain\([0-9]+\)` / `jvmTarget...JVM_[0-9_]+` over all `.gradle`/`.gradle.kts` files per repo.

| repo | `java{toolchain{languageVersion}}` | `sourceCompatibility` files | `options.release`/`--release` files | `kotlin{jvmToolchain(N)}` | `jvmTarget` values seen |
|---|---|---|---|---|---|
| gradle/gradle | **25** | 1 | 1 | – | – |
| uber/NullAway | 17, 21, 25 | 9 | 0 | – | – |
| okhttp | 21, 25 | 8 | 0 | 21 | `JVM_17`, `JVM_1_8` |
| ktor | 21 | 1 | 0 | 11, 17, 21 | – |
| mockito | 21 | 4 | 0 | – | `JVM_11` |
| testcontainers-java | 11, 17 | 2 | 5 | – | `"1.8"` |
| Exposed | 17, 21 | 2 | 0 | 17 | `JVM_11`, `JVM_17`, `JVM_1_8` |
| junit-framework | 17 | 2 | 5 | – | – |
| apollo-kotlin | 11, 21 | 3 | 0 | – | `JVM_1_8` |
| dagger | – | 9 | 0 | 17 | – |
| detekt | – | 2 | 0 | 17 | – |
| kotlinx.coroutines | – | 7 | 2 | 8, 17 | `JVM_1_8`, `JVM_9`, `JVM_17` (multi-release-ish spread) |
| sqldelight | 8, 17 | 1 | 0 | 17 | `JVM_17` |
| nowinandroid | – | 2 | 0 | – | `JVM_17` |
| ktlint | – | 0 | 1 | 21 | – |
| spring-boot | – | 9 | 0 | – | – |
| micronaut-core | – | 2 | 0 | – | – |
| gradle/actions | 8, 16 | 0 | 0 | – | – |
| grpc-java | – | 27 | **3** (`options.release = 8`, `.set 9`, `.set 11`) | – | – |

`gradle__gradle@ea17004a31` toolchains at **Java 25** — the only exemplar building itself against the current LTS toolchain end-to-end; confirms the frame's Java-25-LTS era hypothesis for at least the flagship tool.

**Kotlin compiler flags** (anchored patterns, false positives from a loose first pass removed — see Gaps): `-progressive` real usage is 1/25 (kotlinx.coroutines only, `"-progressive"` literal); `-opt-in=`/`optIn(` real usage is 8/25 (nowinandroid, kafka, apollo-kotlin, dagger, gradle/gradle, junit-framework, sqldelight, cashapp). `explicitApi()`/`ExplicitApiMode` appears in 5/25 (dagger, shadow, ktor, ktlint, okhttp) — i.e. **only these 5 SDK-shaped Kotlin libraries commit to Kotlin's explicit-API mode**, despite 15 of the 25 gradle repos being Kotlin libraries.

**`kotlin("jvm") version "…"`** (literal, not catalog-driven) appears almost exclusively in **sample/documentation sub-builds**, never the main build: `pinterest__ktlint@4c933394a3:ktlint-ruleset-template/build.gradle.kts:5` ("2.4.10"), `JetBrains__Exposed@4be9aee04c:samples/exposed-spring/build.gradle.kts:6` ("2.2.0"), `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/projects/kotlin-coroutines/build.gradle.kts:2` ("2.4.10"). Main builds resolve the Kotlin version through the version catalog instead.

**Maven `maven.compiler.*`** — root pom only:

| repo | mechanism |
|---|---|
| apache/maven | `<maven.compiler.release>${javaVersion}</maven.compiler.release>` property |
| assertj | `<maven.compiler.release>${java.version}</maven.compiler.release>` property |
| jackson-databind | no root property; parent (`tools.jackson:jackson-base`) sets the baseline, a `release` profile overrides to `<source>21</source><release>21</release>` for a JDK-21 test source set (`FasterXML__jackson-databind@a906e1782b:pom.xml:323-324`) |
| guava | **no property at all** — hard-coded `<source>1.8</source><target>1.8</target>` on `maven-compiler-plugin` (`google__guava@5fb424c43a:pom.xml:215-216`), repeated at line 255-256 and 324 |
| error-prone | same pattern, hard-coded `<source>21</source><target>21</target>` (`google__error-prone@c1f99ad5d3:pom.xml:204-205`) |

Two idioms for the same knob: the `maven.compiler.*` property (recommended, one place to change) vs raw `<source>`/`<target>` on the plugin config (older, easy to miss a second occurrence — guava has 3 separate hard-coded occurrences of `1.8` in one pom).

## 6. Dependency management posture

Command: `find <dir> -name '*.gradle*' | xargs grep -cE '<pattern>'` summed, per repo, for Gradle repos; equivalent per-pom grep loop for Maven repos.

**Gradle** (selected columns; full census run for all 8 requested constructs):

| repo | `platform(` | `enforcedPlatform(` | lockfiles | verification-metadata.xml | `resolutionStrategy` | `constraints{` | `capabilities{` | `api(` | `implementation(` |
|---|---|---|---|---|---|---|---|---|---|
| gradle/gradle | 53 | 0 | 0 | **yes** | 3 | 2 | 1 | 2051 | 1620 |
| spring-boot | 18 | **13** | 0 | no | 15 | 0 | 0 | 1045 | 350 |
| micronaut-core | 52 | 0 | 0 | no | 7 | 0 | 0 | 174 | 53 |
| junit-framework | 23 | 0 | 0 | no | 3 | 9 | 2 | 42 | 61 |
| testcontainers-java | 14 | 0 | 0 | no | 2 | 0 | 0 | 2 | 4 |
| dagger | 6 | 0 | 0 | no | 5 | 0 | 0 | 37 | 108 |
| okhttp | 5 | 0 | 0 | no | 0 | 1 | 0 | 39 | 117 |
| apollo-kotlin | 2 | 0 | 0 | no | 0 | 0 | 0 | 51 | 315 |
| kotlinx.coroutines | 2 | 0 | 0 | no | 0 | 1 | 0 | 29 | 47 |
| Exposed | 1 | 0 | 0 | no | 0 | 1 | 0 | 44 | 252 |
| all other gradle repos | 0 | 0 | 0 | no | 0–3 | 0–2 | 0–2 | varies | varies |

`dependencyLocking`/`*.lockfile`: **0 across all 25 gradle repos.** `gradle/verification-metadata.xml`: gradle/gradle only, 1030 lines, `verify-metadata=false` / `verify-signatures=true`, 258 `<trusted-key>` entries, 2 top-level `<configuration>` flags (`gradle__gradle@ea17004a31:gradle/verification-metadata.xml:58-60`) — it verifies PGP signatures, not raw checksums, and trusts named keys rather than a blanket allow-list.

spring-boot is the only repo using `enforcedPlatform(` at all (13 hits) — a construct the Gradle docs explicitly discourage for libraries because it forces version wins over the whole graph, including downstream consumers' choices; notable given spring-boot *is* a library other projects depend on. Spring's own `io.spring.dependency-management` plugin (the pre-catalog BOM-import plugin) is used by only 2 repos in this corpus (Exposed: 2 hits, testcontainers-java: 3 hits) — i.e. **not** by spring-boot itself, which manages its own BOM natively via `java-platform` + `api(platform(...))`.

**Maven** (per-pom census, all root+submodule poms actually on disk):

| repo | `<scope>import</scope>` (BOM) | `maven-enforcer-plugin` | `requireMavenVersion` | `requireJavaVersion` | `dependencyConvergence` | `banDuplicatePomDependencyVersions` | `requireUpperBoundDeps` | `bannedDependencies` | `flatten-maven-plugin` | `versions-maven-plugin` |
|---|---|---|---|---|---|---|---|---|---|---|
| apache/maven | 3 | 3 | 0 | 2 | 0 | 0 | 0 | 4 | 0 | 0 |
| assertj | 4 | 7 | 0 | 0 | 1 | 0 | 0 | 6 | **6** | 4 |
| jackson-databind | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| guava | 0 | **8** | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| error-prone | 0 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| grpc-java (examples poms) | 8 | 8 | 0 | 0 | 0 | 0 | 8 | 0 | 0 | 0 |
| junit-framework (fixture poms) | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| okhttp (`maven-tests/`) | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

`dependencyConvergence` and `banDuplicatePomDependencyVersions` are **rare even in Maven-primary repos** (only assertj enables `dependencyConvergence`, and no repo in the corpus enables `banDuplicatePomDependencyVersions`) — contrary to an assumption that Maven's enforcer plugin is used broadly for convergence checks; it is mostly used here for `requireJavaVersion`/`requireMavenVersion`/`bannedDependencies` gates instead.

**`pluginManagement` versioning coverage** — assertj: 23 `<plugin>` entries vs 25 `<version>` entries in `<pluginManagement>` (fully pinned, a couple of plugins list two version props for profile overrides); guava: 19 `<plugin>` vs 26 `<version>` (also fully pinned — some plugins pin a version *and* a version property). Both Maven-primary libraries pin every plugin version explicitly; neither relies on Maven super-POM defaults.

## 7. Multi-module structure

Command: static grep on `include(`/`include ` in root settings files undercounts real module count in this corpus — **8 of the 20 gradle-with-modules repos generate their module list programmatically** (directory walk or a custom `includeProject()` helper), so a literal-count of `include(` calls is not a reliable module-count metric here. Cross-checked with a build-file-count proxy instead:

| repo | settings inclusion style | citation | build-file proxy (non-buildSrc/build-logic `build.gradle(.kts)` files) |
|---|---|---|---|
| apollo-kotlin | dynamic directory walk (`include(it.name)`) | `apollographql__apollo-kotlin@c145295b72:settings.gradle.kts:21` | 163 |
| dagger | custom `includeProject(name, path)` helper | `google__dagger@4fbc045d2b:settings.gradle.kts:24-33` | 65 |
| junit-framework | custom `includeProject(name, mavenized, modular)` helper | `junit-team__junit-framework@35c56a8e02:settings.gradle.kts:31-35` | 7 |
| ktor | **custom DSL entirely**, comment: "We use custom DSL instead of the default `include(":project:path")` function" | `ktorio__ktor@f92fad0435:settings.gradle.kts:34,226` | 140 |
| spotless | dynamic walk | (detected via directory-listing constructs in settings.gradle) | 5 |
| mockito | dynamic walk | same | 24 |
| gradle/gradle | dynamic, driven by `platforms/*` directory convention, not literal includes | `gradle__gradle@ea17004a31:settings.gradle.kts:28` (comment pointing to internal docs on adding a subproject) | 266 |
| spring-boot | dynamic walk over ~117 string literals plus generated entries | `spring-projects__spring-boot@93b23c40c2:settings.gradle` | **457** |
| all other gradle repos | static `include(":a", ":b", …)` list | — | 0–89 |

`rootProject.name` is set explicitly in 14/20 root settings files; 6 leave it to directory-name defaulting (kafka, sqldelight, spotless, micronaut-core, testcontainers-java, NullAway) — `grep -oE 'rootProject\.name\s*=\s*"[^"]*"' settings.gradle*`.

**Largest build file per repo** (`find … -name '*.gradle*' -o -name 'pom.xml' -o -name 'build.xml' | xargs wc -l | sort -rn`):

| repo | file | LOC | cohesion judgment |
|---|---|---|---|
| apache/kafka | `build.gradle` (root) | **4425** | one file configuring every subproject inline via `subprojects{}`/`project(":x"){}` blocks instead of convention plugins — the single biggest cohesion smell in the corpus |
| spring-boot | `platform/spring-boot-dependencies/build.gradle` | 3222 | a generated-feeling BOM listing hundreds of managed versions; appropriate *content* for a `java-platform` BOM module, just long by nature |
| apache/ant | `build.xml` (root) | 3051 | expected for a self-hosted Ant build of Ant itself |
| gradle/gradle | `build-logic/packaging/.../gradlebuild.distributions.gradle.kts` | 607 | one convention plugin owning all distribution assembly — large but single-responsibility |
| grpc-java | `build.gradle` (root) | 538 | shared root config for ~66 submodules; large but the intended shape for a Groovy-DSL monorepo without a build-logic split |
| google/guava | `android/pom.xml` | 704 | duplicated near-verbatim from the JRE flavor's pom (guava ships parallel jre/android artifacts) — a POM-duplication smell, not raw size |
| google/error-prone | `core/pom.xml` | 512 | proportionate to being the project's actual compiler-plugin core module |
| junit-framework | `documentation/documentation.gradle.kts` | 492 | a documentation-generation module, reasonable for its scope |
| apollo-kotlin | `libraries/apollo-gradle-plugin/build.gradle.kts` | 260 | proportionate — this *is* the product |

## 8. Ant and legacy

Command: `git ls-tree -r --name-only HEAD | grep -cE '(^|/)build\.xml$'`, then read each hit.

| repo | build.xml count | total lines | what it's actually for |
|---|---|---|---|
| apache/ant | 21 | 5179 (root: 3051) | **the real thing** — Ant building itself, self-hosted |
| gradle/gradle | 20 | 383 | 100% documentation snippets under `platforms/documentation/docs/src/snippets/{antMigration,releases/migrating,reference/other-topics}/**` — teaching users how to `ant.importBuild()` migrate *away* from Ant, plus 2 perf-testing template fixtures |
| spring-boot | 2 | 173 | `build-plugin/spring-boot-antlib/src/it/sample/build.xml` (an integration-test fixture for the *spring-boot-antlib* compatibility artifact) and `smoke-test/spring-boot-smoke-test-ant/build.xml` (a smoke test proving Spring Boot repackaging still works from Ant for legacy consumers) |
| junit-team/junit-framework | 1 | 72 | `platform-tooling-support-tests/projects/jupiter-starter/build.xml` — tooling-support test fixture |
| bazelbuild/bazel | 1 | 45 | `third_party/java/proguard/proguard6.2.2/buildscripts/build.xml` — a vendored third-party dependency's own build, untouched |

**`ant.importBuild(...)`** (the Gradle API for wrapping an existing Ant build): **0 real usages** anywhere in the corpus — it appears only in gradle/gradle's own *documentation* about the feature, never in a build that actually uses it.

**Ivy**: `ivy.xml`/`ivysettings.xml` found **only** in `apache/ant` itself, and only for Ant's own *release* tooling (`apache__ant@8c96cd6869:release/ivysettings.xml`, `release/ivy.xml`) — not for dependency resolution in the main build (Ant's main build fetches from a lib bundled in-tree). No other repo in the corpus references Ivy at all.

**Migration signal (Groovy→Kotlin DSL)**: the DSL split from §1 is the only reliable migration signal available at depth-1 (no git history). gradle/gradle is mid-migration (2435 kts / 2357 groovy, near 50/50); spring-boot has started but is far from done (54 kts / 736 groovy); apache/kafka and testcontainers-java (98 groovy, 1 kts) show no real migration, just a single incidental kts file each.

## Smells (ranked)

1. **Zero dependency locking anywhere (0/32).** Not one exemplar — including gradle/gradle itself — commits a `*.lockfile`. If the JVM rule set recommends `dependencyLocking`, it will be recommending something the exemplar corpus never demonstrates; ground any such rule in a synthetic example, not a citation.
2. **Dependency verification is a 1-repo practice.** Only gradle/gradle has `verification-metadata.xml`. This directly undercuts hypothesis 6 ("dependency management is load-bearing") for the *supply-chain-verification* slice specifically — it's load-bearing in principle, essentially unpracticed here.
3. **apache/kafka's 4425-line root `build.gradle`** configures every subproject through `subprojects{}` cross-configuration instead of convention plugins — the starkest single counter-example to "modern Gradle" in the corpus, from a top-tier ASF project (`apache__kafka@940c100fab:build.gradle`).
4. **`enforcedPlatform(` in spring-boot (13 hits)** — a library forcing version resolution for its own dependents, the exact anti-pattern Gradle's docs warn against for anything that isn't a leaf application (`spring-projects__spring-boot@93b23c40c2`, grep `enforcedPlatform\(` across `.gradle`/`.gradle.kts`).
5. **guava/error-prone hard-code `<source>`/`<target>` on `maven-compiler-plugin` instead of the `maven.compiler.*` properties**, and guava repeats the literal `1.8` three times in one pom (`google__guava@5fb424c43a:pom.xml:215-216,255-256,324`) — a single edit needs three coordinated changes.
6. **String-match census over-counts `buildscript{ classpath(...) }`** by roughly 3x when it isn't cross-checked against citations — `classpath = startScripts.classpath` (an unrelated `JavaExec`/`CreateStartScripts` task property) matches the same grep as a real legacy plugin-application `classpath(...)` call. Any authored rule that great-greps for "classpath(" as an anti-pattern signal needs a narrower anchor (`buildscript\s*\{[\s\S]*?classpath\(` or read the 3 lines around each hit).
7. **`org.gradle.unsafe.isolated-projects` is dead** (0/32) while `org.gradle.isolated-projects` is live (5/32) — any authored content still teaching the `unsafe.` key is already wrong for the Gradle versions in this corpus (9.x).
8. **Two incompatible plugin-id declaration idioms coexist** in `gradlePlugin{ plugins{ } }` (`create("id"){}` map-key vs explicit `id = "…"` property) with no visible convention across the 13 plugin-shipping repos — a rule that shows only one idiom will look wrong next to roughly half the corpus.

## Patterns worth encoding

- **`build-logic`/`buildSrc` as an *included build*, wired via `includeBuild(...)` in the root settings file**, is the dominant convention-plugin shape (9 repos: gradle/gradle, ktor, detekt, shadow, sqldelight (`buildLogic`), ktlint, okhttp, nowinandroid, junit-framework, apollo-kotlin — 10 total). Worth encoding as the default recommendation over a plain `buildSrc` (which 9 other repos still use, mostly smaller ones: dagger, grpc-java, Exposed, micronaut-core, mockito, kotlinx.coroutines, spring-boot, testcontainers-java, NullAway).
- **Version catalogs at the conventional path (`gradle/libs.versions.toml`) are the majority pattern (15/25 gradle repos)** but gradle/gradle itself proves the *named, wired-programmatically* catalog (`versionCatalogs { create("buildLibs") { from(files("path/to/custom.toml")) } }`, `gradle__gradle@ea17004a31:build-logic-settings/settings.gradle.kts:17-27`) is a legitimate escape hatch for repos needing multiple named catalogs (`libs`, `testLibs`, `buildLibs` all coexist in gradle/gradle) — a rule that only checks for the conventional filename will falsely flag the tool that invented the feature.
- **Dynamic/programmatic module inclusion (`includeProject()` helpers, directory walks, or a fully custom settings DSL)** is used by at least 8 of 20 multi-module gradle repos, including two flagship exemplars (ktor, gradle/gradle). Any authored guidance that assumes "count your `include()` lines to find your module count" will be wrong for a third of large exemplars; recommend the helper-function pattern itself as a Gradle-plugin-development topic (it is exactly the "reduce settings.gradle boilerplate" problem an OCX Gradle plugin's own settings-plugin work will hit).
- **"Ships a Gradle build but also ships Maven-consumability fixtures/examples" is the real shape behind almost every "multi-build-system" false positive** (dagger, grpc-java, okhttp, Exposed, junit-framework, kafka). This is directly relevant to the future OCX SDK: a Gradle-built library that wants Maven consumers doesn't need a second build system, it needs a `maven-tests`/`examples/maven` verification module like these five.
- **Explicit-API mode (`explicitApi()`) is a 5-repo minority (dagger, shadow, ktor, ktlint, okhttp) among 15 Kotlin-library gradle repos** — worth flagging in a Kotlin-quality rule as "adopted by the most API-surface-conscious libraries, not universal," rather than presenting it as a default expectation.
- **`gradlePlugin { plugins { create("id.here") { … } } }` (map-key idiom) is more common than the explicit `id = "…"` property form** in repos whose *primary product* is the plugin (shadow, detekt) — encode the map-key form as the primary example, the property form as an alternative shown once.

## Contradictions of the frame

- **Hypothesis 6 ("dependency management is load-bearing for the OCX SDK") is contradicted for the *locking/verification* half specifically**: 0/32 lockfiles, 1/32 verification-metadata.xml. It is *not* contradicted for BOM/platform management (`platform(`/`api(platform(...))` is widely used) — the frame should split "dependency version alignment" (well-practiced) from "dependency supply-chain locking/verification" (essentially unpracticed) as two different maturity claims.
- **The era assumption "Gradle 9.x with configuration cache on by default" needs qualification**: only 11/20 gradle-properties-bearing repos set `org.gradle.configuration-cache=true` explicitly, and Gradle 9's *default* is already on regardless of the property — the frame conflated "the feature defaults on in Gradle 9" (true, confirmed by wrapper versions mostly ≥9.6) with "repos explicitly demonstrate configuring it" (false for more than half).
- **`org.gradle.unsafe.isolated-projects` — the key name the frame implicitly assumed (it's the historically-documented one) — is never used in this corpus; the stabilized `org.gradle.isolated-projects` is.** Any authored rule must use the new key name, not the one still floating around in older blog posts/training data.
- **Java 8 bytecode targeting is not extinct in 2026**: guava (`<source>1.8</source>`) and grpc-java (`options.release = 8`) both explicitly target it from their main build, not a legacy branch. The frame's Java-25-era assumption holds for *toolchain* (build-time JDK — gradle/gradle uses 25) but not uniformly for *target bytecode level* (library authors still ship Java-8-compatible artifacts for reach). A JVM rule recommending toolchain vs. target-release separation is directly supported by real citations on both sides.
- **"Gradle plugin development... as its own discipline" is well-supported (12/32 repos ship at least one `gradlePlugin{}` block) but the frame's implied uniform DSL is not** — two incompatible id-declaration idioms coexist with no dominant winner, undercutting an assumption that there's one canonical way to show this in an authored skill.
- **Dagger's and grpc-java's Gradle+Bazel split has no explanatory doc** in either repo's README/CONTRIBUTING/BUILDING file (checked both) — contradicts an implicit expectation that a dual-build-system repo documents *why*; in practice the split is discoverable only from file layout (a `BUILD.bazel` next to a `build.gradle` at the same path), which is itself worth encoding as "don't expect a build-system-split explainer to exist — check the file layout instead."

## Gaps

- **Anti-pattern census (§3) is a string-match count, not an AST parse.** Every number needs the caveat already stated inline for `buildscript{classpath}` (3x overcount from unrelated `classpath` property reads) and for gradle/gradle's `compile/runtime/testCompile(` false positive (a custom `runtime` configuration, not the deprecated one). A future pass should spot-check every "Smells" row's underlying grep hits before citing a count in an authored rule, not just the two caught here.
- **Module-count (§7) has no single reliable metric.** Static `include(` line counts, string-literal `":..."` counts, and non-buildSrc build-file counts each disagree by a wide margin on the 8 dynamically-generated repos; this audit used the build-file-count proxy as the least-gameable of the three but it still over-counts test/example fixture modules in some repos (e.g. spring-boot's 457 includes every `dockerTest` fixture project under `build-plugin/`). A precise count would require actually running `gradle projects`, which this audit is barred from doing.
- **One measurement bug was caught and fixed during this audit, worth recording**: an initial Maven-dependency-management script used `for p in $poms` (plain-variable expansion) inside zsh, which does not word-split by default and silently produced zero results for every multi-pom repo except the ones with exactly one match already isolated by an unrelated guard. Fixed by switching to `for p in $(echo "$poms")` (command-substitution form, which zsh *does* split) — confirmed empirically (`$test_var` vs `$(cmd)` behave differently under zsh's default options). Any future script against this corpus, in this environment, should assume plain `for x in $var` loops silently do nothing across multi-line values and either use `$(...)`-wrapped loops, `while read`, or `xargs`.
- **No git history is available at depth 1**, so every "has this repo migrated" judgment in §8 is inferred from the current DSL/file mix, never confirmed against an actual PR or changelog. Where the frame or a future authoring pass wants a *citable* migration story (e.g. "gradle/gradle's Groovy→Kotlin migration, tracked in issue #NNNN"), that requires a full clone or the project's own release notes, out of scope here.
- **Ant axis (§8) covers only `build.xml` presence — Ivy and `ant.importBuild` were checked corpus-wide but Ant's *own* dependency mechanism (a bundled `lib/optional` jar set, not Ivy, for the main build) was not fully inventoried**; if a future depth file wants to say precisely how apache/ant resolves its own build-time dependencies, that needs a further read of `apache__ant@8c96cd6869:build.xml` beyond the line-count census done here.
- **Checked-out-vs-tracked file gap (noted in the header) was spot-checked on 3 repos (spring-boot, ktor, apollo-kotlin) and one axis (gradle-wrapper-properties path), not all 32** — extrapolating "the gap is always test fixtures" from 3 samples is a reasonable bet (the fetch script's own sparse-checkout patterns target build/config files specifically) but not verified exhaustively.
- **`exemplar-table.sh`'s own build-logic detector (`grep -qE '^build-logic/'`) misses cashapp/sqldelight's `buildLogic/` (camelCase, no dash)** — a naming variant this audit caught by hand; the frame's headline table under-reports build-logic adoption by one repo (10, not 9, once sqldelight is counted).
