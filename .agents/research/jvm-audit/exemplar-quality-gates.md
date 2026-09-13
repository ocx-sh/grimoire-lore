---
title: JVM exemplar quality-gate audit — lint, static analysis, test, coverage
agent: jvm-audit/exemplar-quality-gates
model: sonnet
scope: 32-repo exemplar corpus, build/config files only (no gradle/mvn/bazel/java execution)
method: >
  Shell loops (grep -r / find) over blob-less depth-1 clones under
  /tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars/<owner>__<repo>.
  `git -C <dir> ls-tree -r --name-only HEAD` enumerated every tracked path per repo (saved to
  scratchpad/work/filelists/<repo>.txt); the sparse checkout already materialized every build/config
  file (*.gradle*, pom.xml, *.toml, *.xml under config/, .editorconfig, settings.gradle*, codecov.yml,
  detekt/ktlint/checkstyle/spotbugs configs); any other tracked file was fetched on demand with
  `git -C <dir> show HEAD:<path>`. No gradle/mvn/bazel/java was installed or invoked — every number
  below is a static grep/count over checked-out text, re-runnable with the commands inlined next to
  each result. All greps exclude `.git/`.
date_researched: 2026-09-05
---

# JVM exemplar quality-gate audit

## Table of contents

- [Headline numbers](#headline-numbers)
- [Exemplar corpus measured](#exemplar-corpus-measured)
- [1. Static analysis](#1-static-analysis)
- [2. Test frameworks](#2-test-frameworks)
- [3. Test task configuration](#3-test-task-configuration)
- [4. Coverage](#4-coverage)
- [5. API compatibility gates](#5-api-compatibility-gates)
- [6. Build scans and observability](#6-build-scans-and-observability)
- [7. Formatting-as-gate](#7-formatting-as-gate)
- [8. Encoding / locale / TZ discipline](#8-encoding--locale--tz-discipline)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

| # | Finding | Count | Command |
|---|---|---|---|
| 1 | Repos using Error Prone | 13/32 | `grep -rl -iE 'errorprone\|error-prone\|net\.ltgt\.errorprone' --include='*.gradle*' --include='pom.xml'` |
| 2 | Repos using NullAway | 4/32 | `grep -rl -i 'nullaway' --include='*.gradle*' --include='pom.xml'` |
| 3 | Repos with a real, wired-in Checkstyle config | 8/32 | see [§1](#1-static-analysis) — excludes ktor/ktlint false-positive hits on the word "checkstyle" (report-format name only) |
| 4 | Repos using PMD **as an enforced gate** | **0/32** | maven-pmd-plugin appears only in `<pluginManagement>` with no `<executions>` (apache/maven); gradle/gradle's `code-quality` module *implements* the Gradle PMD plugin for its users, it does not run PMD on itself |
| 5 | Repos using SpotBugs **as a gate** (not just the annotations jar) | 3/32 | kafka, assertj, spotless — micronaut only consumes `spotbugs-annotations` as a `testImplementation` |
| 6 | Repos with a formatter wired via Spotless | 11/32 | `grep -rl -i spotless --include='*.gradle*'` |
| 7 | Repos with a `jacocoTestCoverageVerification` / Maven `jacoco:check` **minimum threshold actually declared** | **2/32** (assertj Maven, junit-framework Gradle) | `grep -rln 'violationRules\|jacocoTestCoverageVerification'` / pom.xml `<rules>` |
| 8 | Repos using Kover with a `minBound` | 1/32 (kotlinx.coroutines, 85%) | `grep -rn 'minBound' --include='*.gradle*'` |
| 9 | Repos with JUnit 6 present anywhere (catalog or build) | 4/32 (spotless, ktlint, shadow, Exposed dual-declares 5+6) | `grep -rn 'junit-jupiter.*6\.\|junit-bom.*6\.'` |
| 10 | Repos declaring JSpecify (`org.jspecify`) | 9/32 | `grep -rl -i jspecify --include='*.gradle*' --include='pom.xml' --include='*.toml'` |
| 11 | Nullness-annotation systems in simultaneous use across the corpus | 4 (JSpecify 9, checker-framework 8, jsr305 13, JetBrains `annotations` 8) | see [§1](#1-static-analysis) |
| 12 | Repos with `develocity`/`com.gradle.enterprise` build-scan plugin | 12/32 | `grep -rl -iE 'com\.gradle\.develocity\|com\.gradle\.enterprise' --include='settings.gradle*'` |
| 13 | Repos with a `.pre-commit-config.yaml` / lefthook / githooks gate for formatting | 1/32, and it's a Bazel repo, not a Gradle/Maven one | `find -iname '.pre-commit-config.yaml' -o -iname 'lefthook.yml'` |
| 14 | Repos actually running Pitest mutation testing | 1/32 (assertj, via `pitest-git-maven-plugin`) | 3 other "pitest" grep hits are substring false positives (`platformApiTests`, `SpiTest`, `ApiTest`) |
| 15 | Repos with an official `org.gradle.test-retry` plugin wired | 1/32 (gradle/gradle); mockito hand-rolls its own retry task instead | `grep -rn 'testRetryPlugin\|org.gradle.test-retry'` |
| 16 | Repos with a `jvm-test-suite` (`testing { suites { … } }`) split | 4/32 (sqldelight, detekt, gradle/actions, gradle/gradle) | `grep -rl 'testing\s*{'` + manual filter for `suites` |
| 17 | Repos with `.editorconfig` `ktlint_*` keys | 3/32 (nowinandroid, ktor, ktlint itself) | `grep -i ktlint .editorconfig` |
| 18 | Repos pinning `-Duser.timezone`/TZ for tests | **0/32** | `grep -rl -iE '\-Duser\.timezone\|"TZ"'` |
| 19 | Repos using `--enable-preview` | 1/32 (micronaut-core) | `grep -rl -- '--enable-preview\|enablePreview'` |
| 20 | `.api` binary-compat dump files present | 10/32 repos, up to 240 files (ktor) | `find -regex '.*/api/.*\.api$'` |

## Exemplar corpus measured

All SHAs re-verified this session with `git -C <dir> rev-parse HEAD` against the frame's table (`.agents/research/jvm-frame.md`); all 32 matched exactly.

| repo | sha10 | build systems |
|---|---|---|
| android/nowinandroid | `12f80da651` | gradle |
| apache/ant | `8c96cd6869` | maven, ant |
| apache/kafka | `940c100fab` | gradle, maven |
| apache/maven | `ea4a417bd2` | maven |
| apollographql/apollo-kotlin | `c145295b72` | gradle |
| assertj/assertj | `485502bad2` | maven |
| bazel-contrib/rules_jvm_external | `449754dcbb` | bazel |
| bazelbuild/bazel | `948b8c70e2` | gradle, maven, bazel, ant |
| bazelbuild/rules_java | `4206909b6d` | bazel |
| bazelbuild/rules_kotlin | `7c51dd1210` | gradle, bazel |
| cashapp/sqldelight | `4580923af3` | gradle |
| detekt/detekt | `45672efb8b` | gradle |
| diffplug/spotless | `dc2a4cb9a3` | gradle |
| FasterXML/jackson-databind | `a906e1782b` | maven |
| google/dagger | `4fbc045d2b` | gradle, maven, bazel |
| google/error-prone | `c1f99ad5d3` | maven, bazel |
| google/guava | `5fb424c43a` | gradle, maven |
| gradle/actions | `a27deee331` | gradle |
| gradle/gradle | `ea17004a31` | gradle, maven, ant |
| GradleUp/shadow | `541b3be475` | gradle |
| grpc/grpc-java | `fc4314419d` | gradle, maven, bazel |
| JetBrains/Exposed | `4be9aee04c` | gradle, maven |
| junit-team/junit-framework | `35c56a8e02` | gradle, maven, ant |
| Kotlin/kotlinx.coroutines | `f63a04bacb` | gradle |
| ktorio/ktor | `f92fad0435` | gradle |
| micronaut-projects/micronaut-core | `d5842045bb` | gradle |
| mockito/mockito | `5a676bcd9e` | gradle |
| pinterest/ktlint | `4c933394a3` | gradle |
| spring-projects/spring-boot | `93b23c40c2` | gradle, maven, ant |
| square/okhttp | `dfcfab3824` | gradle, maven |
| testcontainers/testcontainers-java | `a4d3a033d8` | gradle |
| uber/NullAway | `519a1bb826` | gradle |

## 1. Static analysis

Command base: `grep -rl -iE '<pattern>' <exemplar-dir> --include='*.gradle*' --include='pom.xml' [--include='*.toml']`, deduped to one repo per hit.

### Tool adoption

| Tool | Repos using it | Strictest config seen | Most lenient seen |
|---|---|---|---|
| Error Prone | 13/32: kafka, maven, spotless, jackson-databind, dagger, error-prone, guava, gradle/gradle, grpc-java, junit-framework, micronaut, mockito, NullAway | `uber__NullAway@519a1bb826:build.gradle:84-113` — `-Werror` plus 14 checks force-set to `ERROR` (`WildcardImport`, `MissingBraces`, `TypeToString`, `PackageLocation`, `VoidMissingNullable`, `EqualsMissingNullable`, …) | `FasterXML__jackson-databind@a906e1782b:pom.xml:359-417` — 1 check `ERROR` (`BoxedPrimitiveEquality`), ~20 checks `OFF` (`UnusedVariable`, `EqualsHashCode`, `FallThrough`, `EmptyCatch`, `GuardedBy`, `ReferenceEquality`, …) |
| NullAway | 4/32: gradle/gradle, junit-framework, micronaut, NullAway | `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:52-63` — `onlyNullMarked = true`, `jspecifyMode = true`, `checkContracts = true` (JSpecify-native mode) | `micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-nullaway.gradle:14-22` — classic `option("NullAway:AnnotatedPackages","io.micronaut")`, disabled outright on test/tck modules |
| Checkstyle (real gate) | 8/32: kafka(56 modules), grpc-java(57), junit-framework(25 main + separate test/nohttp configs), micronaut(68, mostly `severity=warning`), mockito(7), spring-boot(14), testcontainers(14), okhttp(unmodified `google_checks.xml`) | `grpc__grpc-java@fc4314419d:buildscripts/checkstyle.xml:21` — repo-wide `<property name="severity" value="error"/>` across 57 modules, plus `build.gradle:185-186` gates `ignoreFailures` behind an opt-out property | `micronaut-projects__micronaut-core@d5842045bb:config/checkstyle/checkstyle.xml:104,210` — 68 modules but `severity="warning"` on the ones sampled, i.e. non-blocking by default |
| PMD (as an enforced gate) | **0/32** | — | `apache__maven@ea4a417bd2:pom.xml:800-810` declares `maven-pmd-plugin` in `<pluginManagement>` only, no `<executions>` bound |
| SpotBugs (real gate, not just annotations) | 3/32: kafka, assertj, spotless | `assertj__assertj@485502bad2:assertj-parent/pom.xml:201` — `<effort>Max</effort>` | `diffplug__spotless@dc2a4cb9a3:lib/build.gradle:136-139` — `reportLevel = Confidence.LOW` on `lib`, `MEDIUM` on `gradle/java-setup.gradle:19`, `HIGH` on `testlib/build.gradle:28` (per-module tiering) |
| Spotless | 11/32: nowinandroid, kafka, sqldelight, spotless(dogfoods itself), shadow, junit-framework, micronaut(via detekt? no — via spotless itself, see note), mockito, okhttp, testcontainers, NullAway | `diffplug__spotless@dc2a4cb9a3:lib/build.gradle:18-25` dogfoods `googleJavaFormat`, `ktfmt`, `palantirJavaFormat` all at once (it's the formatter's own build); `ratchetFrom` used only here (`grep -rln ratchetFrom` → 1/32) | `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.quality-spotless-conventions.gradle.kts:12` — `isEnforceCheck = false`, run separately in CI, not on local `check` |
| detekt | 4/32: detekt(dogfoods), gradle/gradle, Exposed, spring-boot(buildSrc) | `JetBrains__Exposed@4be9aee04c:buildSrc/src/main/kotlin/org/jetbrains/exposed/gradle/Detekt.kt:18-23` — `ignoreFailures = false`, `buildUponDefaultConfig = true`, `parallel = true` | `detekt__detekt@45672efb8b:build.gradle.kts:54-55` — same `buildUponDefaultConfig = true`, no custom ruleset override found in the checked-out slice |
| ktlint | 6/32: sqldelight, detekt, spotless, junit-framework, okhttp (via ktlint() inside Spotless), ktlint(dogfoods, standalone CLI not Gradle plugin) | `pinterest__ktlint@4c933394a3:.editorconfig` — `ktlint_code_style = ktlint_official`, `ktlint_experimental = enabled` (dogfoods its own strictest+experimental ruleset) | `ktorio__ktor@f92fad0435:.editorconfig` — `ktlint_code_style = intellij_idea` plus 10 `ktlint_standard_*` rules explicitly `disabled` |
| Sonar | 2/32: assertj, micronaut | `micronaut-projects__micronaut-core@d5842045bb:build.gradle:86-87` — `sonar.exclusions`, `sonar.coverage.exclusions` set from generated lists | — |
| Kotlin `explicitApi()` / `-Xexplicit-api=strict` | 5/32: dagger(7 modules), shadow, kotlinx.coroutines(`-Xexplicit-api=strict`, the compiler-flag form), ktor(KMP modules only), okhttp(`mockwebserver` only) | `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/configure-compilation-conventions.gradle.kts:19` — `-Xexplicit-api=strict` | `ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11` — `explicitApi = null` (opt-in per-module, not repo-wide) |
| `-Werror` (javac) | 9/32: kafka, bazel, rules_java, rules_kotlin, gradle/gradle, grpc-java, junit-framework, spring-boot, NullAway | — | — |
| `allWarningsAsErrors` (Kotlin) | 7/32: ktor(2 modules), shadow, dagger(hilt plugin only), junit-framework(convention default `true`), detekt(gated behind a `warningsAsErrors` gradle property, defaults empty/false), kotlinx.coroutines | `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/build.gradle.kts:43` unconditional `true` | `detekt__detekt@45672efb8b:build-logic/build.gradle.kts:19` — `providers.gradleProperty("warningsAsErrors").orNull.toBoolean()`, off unless a property is passed |
| JSpecify (`org.jspecify` dependency) | 9/32: dagger, error-prone, guava, gradle/gradle, grpc-java, junit-framework, micronaut, mockito, spring-boot | — | — |
| checker-framework (`org.checkerframework`) | 8/32: kafka, maven, dagger, error-prone, gradle/gradle, grpc-java, spring-boot, NullAway | — | — |
| jsr305 (`com.google.code.findbugs:jsr305`) | 13/32 | — | — |
| JetBrains `annotations` (`org.jetbrains:annotations`) | 8/32: apollo-kotlin, detekt, dagger, kotlinx.coroutines, micronaut, okhttp, testcontainers, NullAway | — | — |

Notes:
- ktor's and ktlint's "checkstyle" grep hits are **false positives**: both are the Checkstyle-*format* CLI reporter name (`ktlint-cli-reporter-checkstyle`, `reporters = arrayOf("checkstyle", "plain")`), not the linter — excluded from the count above (`pinterest__ktlint@4c933394a3:ktlint-cli/build.gradle.kts:40`, `ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.codestyle.gradle.kts:14`).
- micronaut's "spotbugs" hit is a **false positive** for gate-usage: `micronaut-projects__micronaut-core@d5842045bb:inject-java/build.gradle.kts:31` only adds `spotbugs-annotations` as `testImplementation` (for `@SuppressFBWarnings`), no SpotBugs Gradle-plugin task runs.
- `.api` dump files exist in `pinterest__ktlint` (17 files) and `detekt__detekt` (8 files) but the binary-compatibility-validator plugin invocation was not found within the checked-out config slice for either — likely applied from a build-logic file the sparse checkout didn't materialize. Flagged, not claimed.

## 2. Test frameworks

Command base: `grep -rl -iE '<pattern>' <dir> --include='*.gradle*' --include='pom.xml' --include='*.toml'`.

| Framework | Repos | Notes |
|---|---|---|
| JUnit 4 (`junit:junit`) | ~15 (kafka, dagger, guava, error-prone, grpc-java, coroutines, nowinandroid, sqldelight, mockito, NullAway, …) | still the majority declared version string even in Kotlin-first repos |
| JUnit Jupiter 5.x | ~18 | version spread 5.1.0 (detekt's *minimum-supported* pin) .. 5.14.0 (NullAway) |
| **JUnit 6.x present** | 4: `diffplug__spotless@dc2a4cb9a3:gradle/libs.versions.toml` (`6.1.3`), `pinterest__ktlint@4c933394a3` (`6.1.3`), `GradleUp__shadow@541b3be475:build.gradle.kts:*` (`junit-bom = "org.junit:junit-bom:6.1.3"`), `JetBrains__Exposed@4be9aee04c:gradle/libs.versions.toml` declares **both** `junit5` and `junit6` refs | gradle/gradle itself still pins `junit5ForTests = "5.12.2!!"` (`gradle/dependency-management/test.versions.toml:23`) — the build tool's own test suite is on JUnit 5, not 6 |
| Kotest | 2: ktor, micronaut | |
| MockK | 2: ktor, spring-boot | not the majority Kotlin mocking choice in this corpus |
| Spock | 6: gradle/actions, gradle/gradle, junit-framework, micronaut, spring-boot, testcontainers | Groovy-DSL holdouts correlate with Spock use |
| TestNG | 4: gradle/gradle, kotlinx.coroutines, spring-boot, testcontainers | present only as a compat/interop target, not primary |
| Mockito (`mockito-core`) | 15 | `mockito-inline` appears only inside mockito's own repo; `mockito-junit-jupiter` in 6; `mockito-kotlin` in 1 (gradle/gradle) |
| AssertJ | 14 | dominant assertion library across Java repos |
| Truth | 7: nowinandroid, apollo-kotlin, sqldelight, dagger, error-prone, guava, grpc-java | Google-lineage repos only |
| Hamcrest | 10 | legacy holdover, coexists with AssertJ in the same repo in 6 cases |
| `kotlin.test` | 8 | Kotlin-first repos' default |
| Strikt / jqwik / kotest-property | **0 / 0 / 0** | none found anywhere in the corpus |
| Testcontainers (consumer) | 7: kafka, sqldelight, gradle/gradle, Exposed, micronaut, spring-boot, testcontainers(dogfoods) | |
| WireMock | 1: micronaut | |
| MockWebServer | 4: apollo-kotlin, gradle/gradle, spring-boot, okhttp(produces it) | |
| ArchUnit | 3: gradle/gradle, junit-framework, spring-boot | |
| Awaitility | 4: gradle/gradle, micronaut, spring-boot, testcontainers | |
| JMH | 9: kafka, maven, apollo-kotlin, gradle/gradle, grpc-java, junit-framework, coroutines, micronaut, NullAway | benchmark modules are common in this corpus |
| Pitest (mutation) | **1/32** — assertj only, `arcmutate-pitest.version` + `pitest-git-maven-plugin` (`assertj__assertj@485502bad2:pom.xml:124,153-154`) | 3 other grep hits (apollo-kotlin, dagger, gradle/gradle) are substring false positives on `platformApiTests`/`SpiTest`/`ApiTest` |
| JaCoCo | 12 (see §4) | |
| Kover | 4: apollo-kotlin, Exposed, coroutines, ktor | |

`junit-platform.properties` content fetched via `git show` (not in the sparse checkout by default — test resources):

| repo:path | Keys set |
|---|---|
| `mockito__mockito@5a676bcd9e:mockito-integration-tests/junit-jupiter-parallel-tests/src/test/resources/junit-platform.properties` | `execution.parallel.enabled=true`, `execution.parallel.config.strategy=dynamic`, `execution.parallel.mode.default=concurrent` (the corpus's most complete parallel config) |
| `apache__kafka@940c100fab:test-common/test-common-util/src/main/resources/junit-platform.properties` | `params.displayname.default = "{displayName}.{argumentsWithNames}"`, `extensions.autodetection.enabled = true` |
| `assertj__assertj@485502bad2:assertj-core/src/test/resources/junit-platform.properties` | `displayname.generator.default=…DefaultDisplayNameGenerator` (custom generator class) |
| `junit-team__junit-framework@35c56a8e02:jupiter-tests/src/test/resources/junit-platform.properties` | `extensions.autodetection.enabled=true`, `output.capture.stdout/stderr=true` |
| `micronaut-projects__micronaut-core@d5842045bb:http-client/src/test/resources/junit-platform.properties` | `execution.parallel.enabled = true` only |

No repo's `junit-platform.properties` sets `timeout.default` or `testinstance.lifecycle` — **0/32** for both.

## 3. Test task configuration

`maxParallelForks` values found (`grep -rn maxParallelForks --include='*.gradle*'`):

| repo | Expression | Reading |
|---|---|---|
| `square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.testing-conventions.gradle.kts:42` | `Runtime.getRuntime().availableProcessors() * 2` | most aggressive in corpus |
| `micronaut-projects__micronaut-core@d5842045bb:inject-java/build.gradle.kts:64` (+3 more modules) | fixed `4` | |
| `testcontainers__testcontainers-java@a4d3a033d8:core/build.gradle:9` | fixed `4` | |
| `apollographql__apollo-kotlin@c145295b72:libraries/apollo-gradle-plugin/build.gradle.kts:193` | `cores / 2` | |
| `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/module.gradle.kts:19` | `cores / 2` | |
| `uber__NullAway@519a1bb826:build.gradle:140` | `cores / 2` | |
| `diffplug__spotless@dc2a4cb9a3:gradle/special-tests.gradle:33` | `cores / 2` | `lib-extra/build.gradle:75` sets `1` for a specific expensive suite |
| `gradle__gradle@ea17004a31:testing/smoke-test/build.gradle.kts:186,195,205` | fixed `1` | "those tests are pretty expensive, we shouldn't execute them concurrently" |
| `apache__kafka@940c100fab:build.gradle:80` | `project.hasProperty('maxParallelForks') ? … : availableProcessors()` | user-overridable, defaults to all cores |

Retry:
- `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.test-retry-conventions.gradle.kts` — **hand-rolled** retry: a `retryTest` task toggled on by a `TestListener` that records failed test names and re-runs only those, `ignoreFailures = true` on first pass. Not the `org.gradle.test-retry` community plugin.
- `gradle__gradle@ea17004a31:gradle/dependency-management/build.versions.toml:76` declares `testRetryPlugin = "org.gradle:test-retry-gradle-plugin:1.6.5"`, applied via `build-logic-commons/gradle-plugin/build.gradle.kts:24`; the `maxRetries`/`maxFailures` config lives in a build-logic convention file the sparse checkout did not materialize — not independently confirmed.
- **1/32** repos use the official plugin, **1/32** rolls a custom equivalent, **30/32** have no test-retry mechanism at all.

`jvm-test-suite` (`testing { suites { … } }`) usage — **4/32**: `cashapp__sqldelight`, `detekt__detekt`, `gradle__actions`, `gradle__gradle`.

TestKit / plugin cross-version testing (Gradle-plugin-as-product exemplars):
- `detekt__detekt@45672efb8b:build.gradle.kts:79-88` registers a parallel `detektFunctionalTestMinSupportedGradle` task alongside `detektFunctionalTest`, and `detekt-gradle-plugin/build.gradle.kts:229-231` sets `validatePlugins { enableStricterValidation = true }`.
- `GradleUp__shadow@541b3be475:build.gradle.kts:138,166` wires `gradleTestKit()` into a dedicated `JvmTestSuite("functionalTest")`.
- `gradle__actions@a27deee331:.github/workflows/integ-test-provision-gradle-versions.yml` runs a matrix from `gradle-version: '6.9'` through `'7.1.1'`, `release-candidate`, and `current` (`ci-check-and-unit-test.yml:33` pins `8.14.2` for the primary CI job).

Maven surefire/failsafe (`--include='pom.xml'`):

| repo:path | Config |
|---|---|
| `apache__maven@ea4a417bd2:its/core-it-suite/pom.xml:98,478` | `its.forkCount = 0.75C` (75% of cores) |
| `google__guava@5fb424c43a:pom.xml:384` | `argLine = "-Xmx1536M -Duser.language=hi -Duser.country=IN …"` — deliberately runs the suite in a **non-English locale** to catch locale bugs |
| `google__error-prone@c1f99ad5d3:pom.xml:296` | `<trimStackTrace>false</trimStackTrace>` |
| `FasterXML__jackson-databind@a906e1782b:pom.xml:44` | `argLine` adds `--add-opens=java.base/java.lang=tools.jackson.databind` |

## 4. Coverage

| repo | Tool | Enforced minimum | On what element | Scope |
|---|---|---|---|---|
| `assertj__assertj@485502bad2` | JaCoCo (Maven, `assertj-parent/pom.xml:114-176`, bound in `assertj-core/pom.xml:283`) | `CLASS` 100%, `INSTRUCTION`/`METHOD`/`BRANCH`/`COMPLEXITY`/`LINE` 80% each | `BUNDLE` | `default-check` execution goal, active — **the strictest enforced coverage gate in the corpus** |
| `junit-team__junit-framework@35c56a8e02` | JaCoCo (Gradle, `gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts:24-29`) | `minimum = 0.90` | aggregate report, `LINE`(default counter) | disabled when Develocity predictive test selection is active; comment frames it as an aggregation sanity check, not a per-class gate |
| `Kotlin__kotlinx.coroutines@f63a04bacb` | Kover (`buildSrc/src/main/kotlin/kover-conventions.gradle.kts:56,69`) | `minBound(85)` (default), per-project override map | `COVERED_LINES_PERCENTAGE` | applied via a shared convention plugin |
| kafka, gradle/gradle, grpc-java, micronaut, mockito, NullAway, nowinandroid, jackson-databind | JaCoCo | **report only, no `violationRules`/`check`** | n/a | `jacocoTestReport`/xml enabled but nothing fails the build on a threshold |
| apollo-kotlin, Exposed, ktor | Kover | **report only** | n/a | plugin applied, no `verify {}` block found |
| detekt, NullAway, junit-framework, grpc-java | `codecov.yml` present | not measured here — Codecov thresholds live server-side in the uploaded config, not enforced locally | — | see `detekt__detekt@45672efb8b:codecov.yml`, `.codecov.yml` (two separate files — legacy + current) |

**Only 2/32 repos enforce a JaCoCo/Kover minimum that fails the local build; 1 more (kotlinx.coroutines) enforces a Kover minimum.** 27/32 repos with any coverage tool at all stop at report generation.

## 5. API compatibility gates

| repo | Tool | Failing on what | Baseline / dump location |
|---|---|---|---|
| `apollographql__apollo-kotlin@c145295b72` | Kotlin BCV (apiDump/apiCheck) | any undeclared public-API change | `**/api/*.api` (28 files) |
| `cashapp__sqldelight@4580923af3` | Kotlin BCV | same | `**/api/*.api` (9 files) |
| `google__dagger@4fbc045d2b` | Kotlin BCV | same | `**/api/*.api` (6 files) |
| `JetBrains__Exposed@4be9aee04c` | Kotlin BCV | same | `**/api/*.api` (21 files) |
| `square__okhttp@dfcfab3824` | Kotlin BCV | same | `**/api/*.api` (13 files) |
| `pinterest__ktlint@4c933394a3`, `detekt__detekt@45672efb8b` | `.api` dump files present (17 and 8 files) | — | applying plugin/convention **not located** in the checked-out slice; flagged, not claimed |
| `apache__kafka@940c100fab` | japicmp (`api-checker/` module, custom wrapper) | — | `api-checker/` subtree |
| `apache__maven@ea4a417bd2`, `assertj__assertj@485502bad2`, `gradle__gradle@ea17004a31`, `grpc__grpc-java@fc4314419d`, `micronaut-projects__micronaut-core@d5842045bb`, `testcontainers__testcontainers-java@a4d3a033d8` | japicmp (dependency/plugin declared) | not individually confirmed as build-blocking within the checked-out files | — |
| `FasterXML__jackson-databind@a906e1782b`, `google__guava@5fb424c43a`, `grpc__grpc-java@fc4314419d`, `Kotlin__kotlinx.coroutines@f63a04bacb`, `mockito__mockito@5a676bcd9e`, `square__okhttp@dfcfab3824` | Animal Sniffer (signature check, typically Android/Java-8 API surface) | — | — |
| `gradle__gradle@ea17004a31` | Gradle's own binary-compatibility mechanism | `build-logic/binary-compatibility/` — a custom Groovy-based checker (`AcceptedApiChangesJsonFileManagerTest.groovy`, `PublicAPIRulesTest.groovy`) that consumes an accepted-changes JSON allowlist, not japicmp/revapi | `build-logic/binary-compatibility/` |
| revapi | **0/32** | — | not found anywhere in the corpus |

## 6. Build scans and observability

- Develocity/Enterprise plugin in `settings.gradle*`: **12/32** — apache/kafka, apollo-kotlin, sqldelight, detekt, spotless, gradle/actions, gradle/gradle, shadow, ktor, mockito, ktlint, testcontainers.
- `publishing.onlyIf` gating: `apache__kafka@940c100fab:settings.gradle:39-45` — `uploadInBackground = !isGithubActions`, `publishing.onlyIf { it.authenticated }`, plus IP obfuscation in the scan.
- `--scan` invoked directly in CI workflows: 8/32 (kafka, detekt, gradle/actions, gradle/gradle, junit-framework, kotlinx.coroutines, mockito, testcontainers).
- Remote build cache (`buildCache { … }` in `settings.gradle*`): 10 files across 6 distinct repos (testcontainers has 3 settings files, detekt has 3).
- No repo in the checked-out slice showed `remote(HttpBuildCache) { … push = … }` conditional-push logic explicitly — the block exists but push conditions live in build-logic files outside the sparse checkout for all hits found.

## 7. Formatting-as-gate

| Mechanism | Repos | Detail |
|---|---|---|
| `spotlessCheck`/`ktlintCheck` wired into `check` (Spotless/ktlint Gradle-plugin default) | 10 of the 11 Spotless users, 5 of 6 ktlint users | default plugin behavior, not overridden |
| Formatting explicitly **detached** from `check` | 1: `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.quality-spotless-conventions.gradle.kts:12` — `isEnforceCheck = false`, comment: "We run the check separately on CI" |
| `ratchetFrom` (only fail on newly-touched files) | 1: `diffplug__spotless` (dogfoods its own feature) |
| Pre-commit / lefthook / githooks gate | **1/32**, and it's `bazelbuild__rules_kotlin@7c51dd1210:.pre-commit-config.yaml` — a Bazel repo, not a Gradle/Maven one. **0/29 pure Gradle+Maven exemplars use a local git-hook formatting gate.** |

Formatting in this corpus is enforced in CI (`./gradlew check` / a dedicated lint job), essentially never at commit time.

## 8. Encoding / locale / TZ discipline

| Signal | Repos | Command |
|---|---|---|
| `-Dfile.encoding=…` (JVM arg, `org.gradle.jvmargs` or task-level) | 13/32 | `grep -rl -- '-Dfile.encoding'` |
| `options.encoding =` / `<project.build.sourceEncoding>` | 15/32 | `grep -rl -iE 'options\.encoding\s*=\|project\.build\.sourceEncoding'` |
| `-Duser.timezone` / `"TZ"` pin anywhere | **0/32** | `grep -rl -iE '\-Duser\.timezone\|"TZ"'` |
| `-Duser.language` | 2/32: guava (`hi`/`IN` — deliberately non-English, see §3), gradle/gradle | `grep -rl -- '-Duser.language'` |
| `--enable-preview` | 1/32: micronaut-core | `grep -rl -- '--enable-preview\|enablePreview'` |
| `-XX:+EnableDynamicAgentLoading` | 1/32: `mockito__mockito@5a676bcd9e:mockito-integration-tests/java-21-tests/build.gradle.kts` | `grep -rl EnableDynamicAgentLoading` |

**No exemplar pins a test timezone.** UTF-8/encoding discipline is common (roughly half the corpus); timezone discipline is absent everywhere measured — a real gap given how many of these libraries (kafka, guava, jackson, Exposed) are date/time-sensitive.

## Smells (ranked)

1. **Coverage gates are almost entirely theatre.** 12 repos wire JaCoCo and 4 wire Kover, but only 3 total (assertj, junit-framework, kotlinx.coroutines) fail the build on a threshold. "JaCoCo configured" in a build file is not evidence of a coverage floor — the report-vs-verify distinction has to be a first-class check in any rule this program ships.
2. **PMD is dead weight in this corpus.** Declared in 2/32 repos, enforced in 0. A `java-quality` rule that tells agents to configure PMD would be prescribing a tool the strictest exemplars (junit-framework, NullAway, guava) don't use at all — they lean on Error Prone + NullAway instead.
3. **Four incompatible nullness-annotation systems coexist** (JSpecify 9, checker-framework 8, jsr305 13, JetBrains `annotations` 8) with only 2 repos (junit-framework, NullAway's own `jdk-javac-plugin`) using NullAway's JSpecify-native mode (`jspecifyMode`, `onlyNullMarked`). A rule that says "use JSpecify" without a migration/coexistence note will contradict most of the corpus as it stands today.
4. **Checkstyle configs are hand-rolled, not `google_checks.xml`-based, in 7 of 8 real users.** Only okhttp uses the stock ruleset unmodified. Any "start from google_checks" advice needs a caveat that mature Java projects fork it heavily (kafka: 56 modules, grpc: 57, micronaut: 68 — none traceable to a documented base).
5. **Format-as-gate lives in CI, never in a git hook**, across the entire non-Bazel corpus (28/29). A skill that scaffolds a `.pre-commit-config.yaml` for Java/Kotlin would be inventing a practice these exemplars don't follow.
6. **Mutation testing (Pitest) is essentially absent** (1/32, and even that one needed disambiguating from 3 substring false positives). Not a corpus norm — do not present it as one.
7. **No repo pins a test timezone.** Given `-Duser.language` is deliberately flipped in guava's suite to catch locale bugs, the absence of an equivalent TZ discipline (no `-Duser.timezone`, no `TZ=` in CI) is a real, checkable gap worth calling out rather than assuming test suites are TZ-safe.
8. **`org.gradle.test-retry` is nearly unused** (1/32 official, 1/32 hand-rolled). A rule recommending it as standard practice would not match what strict exemplars (junit-framework, NullAway, spring-boot) actually do — they simply don't retry.

## Patterns worth encoding

Preferring configurations the **strictest** exemplars actually share:

1. **Error Prone + NullAway, JSpecify-mode, as the nullness gate — not Checkstyle/PMD for nullness.** `junit-team/junit-framework` (`junitbuild.java-errorprone-conventions.gradle.kts`) is the cleanest exemplar: `net.ltgt.errorprone` + `net.ltgt.nullaway`, `onlyNullMarked = true`, `jspecifyMode = true`, `checkContracts = true`, a short explicit `error(...)`-list of checks promoted beyond default, and a short `disable(...)`-list with a one-line reason per entry. `uber/NullAway`'s own build (`build.gradle:84-113`) is the same shape with `-Werror` added.
2. **Spotless as the umbrella formatter, one Gradle plugin covering Java+Kotlin+build files**, `googleJavaFormat`/`ktfmt`/`ktlint` chosen per-language, wired into `check` by default; only detach it (`isEnforceCheck = false`, mockito) when CI runs it in a separate, explicit job — never silently drop it.
3. **Coverage: verify only what you mean to enforce, and say the number out loud in the config.** assertj's tiered-by-counter Maven rule (100% CLASS / 80% everything else, bound to `default-check`) and kotlinx.coroutines' per-project `minBound` map (default 85, overridable) are both legible, auditable gates — unlike the majority pattern of "JaCoCo report, no verify."
4. **Kotlin binary-compat via the official `binary-compatibility-validator` plugin, `api/*.api` committed and reviewed** (apollo-kotlin, sqldelight, dagger, Exposed, okhttp) — this is the dominant pattern for Kotlin libraries in the corpus and should be the default recommendation for the future OCX SDK if it ships a Kotlin-facing API surface.
5. **Gradle-plugin authors test a real cross-version matrix, not just current Gradle.** `gradle/actions` matrixes `6.9` → `release-candidate`; `detekt` runs a parallel `…MinSupportedGradle` functional-test task alongside the normal one and turns on `validatePlugins { enableStricterValidation = true }`. Both patterns are directly reusable for the future OCX Gradle plugin.
6. **`maxParallelForks` scaled to the box, not hardcoded to 1**, with an explicit escape hatch for known-expensive suites (gradle/gradle sets `1` only on `smoke-test`/`architecture-test`, not repo-wide). okhttp's `cores * 2` and detekt/NullAway's `cores / 2` are the two ends of a sane range; pin the project's choice and comment why.
7. **Develocity + build-scan gating on CI-authenticated publishing** (`apache/kafka`'s `publishing.onlyIf { it.authenticated }` plus IP obfuscation) is the one exemplar-grade template for "how to turn on build scans without leaking data" — worth quoting directly in a `gradle-build` depth file rather than paraphrasing.

## Contradictions of the frame

- **Hypothesis 4** ("linting and test-suite/coverage configuration are among the most prominent topics") holds for *linting* (Error Prone/NullAway/Spotless are widespread and often strict) but **not for coverage**: only 3/32 repos enforce any numeric coverage floor. A `jvm-quality` rule that treats "coverage gate" as a standard practice would be prescriptive, not descriptive, for this corpus.
- **Era assumption "JSpecify 1.0 adopted by NullAway, Error Prone and Kotlin"** (frame, "Era assumptions to verify") is only partially true: JSpecify is declared in 9/32 repos, but NullAway's JSpecify-*native* mode (`jspecifyMode`/`onlyNullMarked`) is used in just 2/32 (junit-framework, NullAway's own `jdk-javac-plugin` module) — most JSpecify adopters still configure NullAway the pre-JSpecify way (`AnnotatedPackages`). checker-framework (8) and jsr305 (13) remain more widely declared than JSpecify.
- **Era assumption "JUnit 6 (September 2025)"** as *the* current framework is contradicted by adoption: only 4/32 repos reference JUnit 6 anywhere, and gradle/gradle itself — a September-2026-measured, actively-maintained flagship — still pins JUnit 5.12.2 for its own test suite (`gradle/dependency-management/test.versions.toml:23`). JUnit 5 remains the corpus default; JUnit 6 coverage in any authored rule should be framed as "the new major, adopted by early movers" not "the current standard."
- **"Modern Gradle deserves more depth than Maven" (Hypothesis 1)** is well-supported for *build authoring* (Gradle convention plugins, catalogs, jvm-test-suite are richer and more varied than anything Maven-side) but the single strictest *coverage* gate in the whole corpus is a **Maven** repo (assertj, 100%/80% JaCoCo rule bound to `default-check`) — Maven is not automatically the "legacy, less rigorous" side of that comparison for every axis.
- **PMD's presence in the frame's tool list** ("Error Prone, NullAway, Checkstyle, PMD, SpotBugs…") is not borne out: PMD is enforced nowhere in the corpus (0/32), while Error Prone + NullAway do the work PMD would in other ecosystems. A future `java-quality` rule listing PMD alongside Error Prone/Checkstyle as co-equal options would misrepresent actual practice; it belongs at most as a one-line "some legacy Maven repos still declare it, unused here" footnote.
- **SDK-development hypothesis (Hypothesis 6, "dependency management and SDK development are load-bearing for the future OCX SDK")** is supported by the API-compat evidence (§5) but the *specific* mechanism differs sharply by language: Kotlin libraries converge on the official BCV plugin; Java libraries scatter across japicmp, Animal Sniffer, and (for gradle/gradle) a bespoke allowlist-based checker — there is no single "Java equivalent of BCV" to recommend, which the artifact plan should say explicitly rather than implying parity.

## Gaps

- Source-level `@NullMarked`/`@NonNull` annotation *usage counts* (as opposed to dependency *declaration*) were not measured — would require fetching and grepping thousands of `.java`/`.kt` files per repo via `git show`, which is out of budget for a config-file audit. The dependency-declaration proxy in §1 stands in for this.
- `japicmp`/Animal Sniffer *configuration* (accepted-breaks lists, signature artifact versions, `failOnModification`) was confirmed present but not read in full for every hit in §5 — several rows are "declared, not independently confirmed as build-blocking within the checked-out slice." A follow-up pass fetching the specific plugin `<configuration>` blocks via `git show` would firm these up.
- Remote-build-cache **push conditions** (`remote(HttpBuildCache) { isPush = … }`) were not found in any checked-out `settings.gradle*` — the blocks exist (10 files) but push-gating logic likely lives in build-logic files the sparse checkout didn't materialize; not chased further given the axis-6 time budget.
- Codecov/Coveralls **threshold values** (project/patch %) inside `codecov.yml` were confirmed present (4 files) but not parsed for their numeric thresholds — flagged as tool-adoption only in §4, not as enforced-threshold evidence.
- Ant-specific quality-gate config (`apache/ant`, and the Ant subtrees inside gradle/gradle, spring-boot, junit-framework) was not surveyed as its own axis — the demand list treats Ant as legacy-to-recognize, and no Ant-native lint/coverage tooling (e.g. `<checkstyle>` Ant task) was found in a supplementary spot-check of `apache__ant@8c96cd6869`.
- Bazel-for-Java exemplars (`bazelbuild/bazel`, `rules_java`, `rules_kotlin`, `rules_jvm_external`, dagger's Bazel target, grpc-java's Bazel target) were included in the tool-adoption greps but their Bazel-native equivalents (Error Prone under Bazel via `--javacopt`, `coverage` under Bazel) were not separately tabulated — that split belongs to the sibling `bazel-quality` topic per the frame, and is deliberately out of scope here.
