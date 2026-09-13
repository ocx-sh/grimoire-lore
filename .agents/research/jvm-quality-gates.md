---
title: "Quality gates: what fails the build (JAVA-LINT + JAVA-TEST)"
topic: "JVM quality gates — the Java static-analysis gate and the Java test/coverage gate, stated as configuration"
model: opus
id_family:
  - JAVA-LINT
  - JAVA-TEST
consolidates:
  - jvm-quality-gates/java-lint-gate.md
  - jvm-quality-gates/test-suite-and-coverage.md
audits_read:
  - jvm-audit/exemplar-quality-gates.md
  - jvm-audit/config-inventory.md
  - jvm-audit/exemplar-build-shape.md
  - jvm-audit/exemplar-publishing-ci-bazel.md
map_rows: "M-R-01..M-R-06, M-R-10 (JAVA-LINT); M-S-01, M-S-02, M-S-04..M-S-09, M-S-12 (JAVA-TEST)"
date: 2026-09-12
---

# Quality gates: what fails the build

Scope is the two families this group owns: `JAVA-LINT` (the static-analysis
gate while editing `**/*.java`) and `JAVA-TEST` (the test and coverage gate on
the same glob). The Kotlin halves of the same questions —
detekt/ktlint/Spotless-for-Kotlin (`KT-LINT`, map rows M-R-07/08/09/11), Kover
and `runTest` (`KT-TEST`, M-S-03/10/11) — are sibling families on
`**/*.kt` and are named here only where a Java rule's check has to see them.
Build-system mechanics (wiring a convention plugin, a version catalog, a CI
matrix) belong to `GRADLE-*` / `MVN-*` and are not restated.

## Verdict

1. **The Java gate of record is Error Prone + NullAway at the compiler-plugin
   layer.** It is the only gate in the corpus that runs on every compile rather
   than on a separate CI pass ([lint-gate](jvm-quality-gates/java-lint-gate.md) §9).
   Checkstyle is a style gate and never a substitute; PMD is out (0/32 enforced);
   SpotBugs earns a slot only paired with `find-sec-bugs`.
2. **But the gate is a target state, not a norm, and the rules must say so.**
   Error Prone is 13/32, NullAway 4/32 — 19/32 exemplars run neither
   ([gates](jvm-audit/exemplar-quality-gates.md) §1). So: **SHOULD for an
   adopter, MUST for the OCX SDK and the OCX Gradle plugin**, which are
   greenfield and have no legacy debt to manage. A blanket MUST would flag
   nineteen flagship repos.
3. **The nine promoted Error Prone checks are the highest-yield thing in this
   whole consolidation** and are a MUST everywhere, because each one names a
   mistake agent-written Java makes by default and none of them fires without
   an explicit switch. One correction to the map's framing: `StringCaseLocaleUsage`
   is already an `ENABLED_WARNINGS` member, so its switch is a severity bump,
   not an activation.
4. **`-Werror` belongs in exactly one convention plugin and must never be paired
   with `-Xlint:all`.** Each JDK release adds `-Xlint` keys (40 on JDK 25, about
   a dozen of them post-Java-8), so `all` + `-Werror` turns a toolchain bump into
   a build break. Enumerate the keys.
5. **A Checkstyle ruleset that is not a committed file in the repo is not a
   ruleset.** Resolving `google_checks.xml` out of the Checkstyle jar makes the
   gate change silently on every tool bump — `square__okhttp@dfcfab3824` does
   exactly this, and it is the corpus's one "uses the stock ruleset" repo.
6. **Coverage: the rule is not "which tool" and not "what number" — it is
   "report-only is not a gate, and a gated gate is not a gate either."** Three
   exemplars declare a numeric floor; **exactly one enforces it
   unconditionally** (assertj). This sharpens the map's conflict-11 finding:
   junit-framework disables its floor under predictive test selection and
   kotlinx.coroutines disables Kover unless `-Pkover.enabled=true`, so a bare
   `./gradlew check` in either repo checks no coverage at all.
7. **The coverage number itself splits by consumer kind.** For the **OCX SDK**
   (library this program authors): a hard, ungated, CI-enforced floor, carried
   forward from `ocx-sdk-python`'s `fail_under = 100` — MUST, and it does not
   need to be derivable from the corpus. For **any other adopter**: CONSIDER.
   For the **OCX Gradle plugin**: the gate that matters is a TestKit
   cross-version matrix, not a percentage.
8. **JUnit 5 is the floor, 6 is the dated target, and neither is assumed.**
   JUnit 6.0.0 shipped 2025-09-30 with a Java 17 / Kotlin 2.2 floor; adoption is
   4/32 and `gradle/gradle` itself pins 5.12.2. The one hard row is
   `junit-platform-runner`, removed **without replacement** — a blocker, not a
   warning.
9. **Parallel test execution is where the JUnit config traps live**, and both
   traps are silent: an unprefixed property key does nothing, and
   `parallel.enabled=true` without `parallel.mode.default=concurrent` does
   nothing. Shared static state under parallel mode needs `@ResourceLock` /
   `@Isolated`, and that feature area is still being hardened upstream (four
   merged PRs, 2025–2026), so it is an ongoing practice, not a one-time config.
10. **Do not manufacture practices the corpus does not have.** Test retry
    (1/32 official), timezone pinning (0/32), Pitest (1/32) and commit-time
    format hooks (0/29 non-Bazel) are all CONSIDER at most. An agent asked to
    "harden the test gate" will invent these; the rules exist partly to stop it.
11. **Version claims in this family rot fast and must carry their date.** Two
    live examples as of 2026-09-12: `maven-surefire-plugin` 3.6.0 is documented
    but only `3.6.0-M1` exists on Central, and NullAway's `JSpecifyExperimental`
    is slated to flip on by default.

## The ruleset

Twenty-three rules. Grouped by the check that catches them. Every version floor
is as of **2026-09-12**.

### JAVA-LINT — the static-analysis gate

Depth file: `rules/java-quality/lint-gate.md`. Routing line: *"Standing up or
changing what fails the build: Error Prone, NullAway, `-Xlint`, Checkstyle,
SpotBugs, Spotless."*

#### Group 1 — caught by `compileJava` / `mvn compile` (the Error Prone + NullAway layer)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-LINT-01** | Wire Error Prone and NullAway on every Java module that is compiled and shipped; a build with a Checkstyle or SpotBugs block and no Error Prone wiring has a style gate, not a lint gate, and must not be described as one. | It is the only gate that runs inside `javac`, on every compile, with source-level context; Checkstyle catches no null dereference and no swallowed exception ([lint-gate](jvm-quality-gates/java-lint-gate.md) §9). | Gradle: `grep -n 'net\.ltgt\.errorprone\|net\.ltgt\.nullaway' **/*.gradle.kts **/*.gradle`. Maven: `grep -n 'error_prone_core' **/pom.xml` inside `<annotationProcessorPaths>`. **No match with a `checkstyle`/`spotbugs` block present is the finding**; no match with neither is an unlinted module. | SHOULD · **MUST** for the OCX SDK and the OCX Gradle plugin | `error_prone_core` 2.36.0; `net.ltgt.errorprone` 5.1.1; `net.ltgt.nullaway` 3.2.0 |
| **JAVA-LINT-02** | Promote these nine to `ERROR` on every new module: `DefaultLocale`, `StringCaseLocaleUsage`, `EqualsMissingNullable`, `FieldMissingNullable`, `VoidMissingNullable`, `CatchingUnchecked`, `UnusedException`, `ConstantPatternCompile`, `UnnecessaryDefaultInEnumSwitch`. | Eight are in `DISABLED_CHECKS` (150 members) and never fire without an explicit switch; each names a mistake generated Java makes by default. `StringCaseLocaleUsage` is the exception — it already sits in `ENABLED_WARNINGS`, so its switch is a **severity bump, not an activation** ([lint-gate](jvm-quality-gates/java-lint-gate.md) §2). | `grep -n 'error(\|CheckSeverity\.ERROR\|-Xep:' <build file>` and confirm all nine names appear. Empty output = the checks are off; the docs-site `severity` field is not the gate, `BuiltInCheckerSuppliers.java` is. | **MUST** | Error Prone 2.36.0 (187 `ENABLED_ERRORS` / 312 `ENABLED_WARNINGS` / 150 `DISABLED_CHECKS`) |
| **JAVA-LINT-03** | Every `disable(...)` / `:OFF` entry carries a one-line reason on the same line or the line above. | Both poles of the corpus do this — junit-framework's 20 `disable(...)` entries and jackson-databind's ~20 `<!-- reason -->` XML comments — and it is the only thing that distinguishes a considered opt-out from silent erosion ([lint-gate](jvm-quality-gates/java-lint-gate.md) §3, §9). | `grep -n 'disable(\|:OFF' <build file>` then read each hit's line and the line above for a comment. A reasonless disable is the finding. | SHOULD | — |
| **JAVA-LINT-04** | Set exactly one of `-XepOpt:NullAway:OnlyNullMarked=true` or `-XepOpt:NullAway:AnnotatedPackages=…`; prefer `OnlyNullMarked` for any module created on NullAway 0.12.3+. | NullAway fails the build immediately if both or neither is set — an explicit error, not a silent default. Package-prefix lists rot as code moves; `@NullMarked` travels with the code ([lint-gate](jvm-quality-gates/java-lint-gate.md) §4). | `grep -n 'OnlyNullMarked\|AnnotatedPackages' <build file>` — two hits in one `nullaway { }` block or one `-Xplugin:ErrorProne` arg string is the finding; zero hits with `nullaway` enabled is also the finding. | **MUST** | NullAway 0.12.3 (`OnlyNullMarked` introduced) |
| **JAVA-LINT-05** | Before setting `jspecifyMode = true`, confirm the toolchain is JDK 22+, or JDK 17.0.19+/21.0.8+ on an **OpenJDK-family** distribution with `-XDaddTypeAnnotationsToSymbol=true` passed to `javac`. | The flag-based path does not work on Oracle JDK 17/21. NullAway ≥0.12.11 checks the precondition itself and throws `IllegalStateException` at compile time, so a CI image pinned to Oracle JDK 21 fails outright the moment the flag is set ([lint-gate](jvm-quality-gates/java-lint-gate.md) §4). | Read the toolchain/`setup-java` distribution and version; if below 22, `grep -n 'addTypeAnnotationsToSymbol' <build file>` must match. Temurin 13/32, Zulu 10/32, **Oracle 0/32** in the corpus ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 3) — which is why nobody has hit this yet. | **MUST** | NullAway 0.12.11; JDK 22 / 21.0.8 / 17.0.19 |
| **JAVA-LINT-06** | New public API surface is JSpecify-annotated; never emit a bare "use JSpecify" instruction without stating what happens to `jsr305` / Checker-Framework annotations already in the module, and never leave an `import javax.annotation.Nullable` in a module whose build sets `jspecifyMode = true`. | Four nullness systems are live at once (jsr305 13/32, checker-framework 8/32, JSpecify declared 9/32, NullAway's JSpecify-native mode **2/32**). NullAway's default mode matches `@Nullable` by simple name across packages, so mixing is transparent — `jspecifyMode = true` is the exact point where it stops being ([lint-gate](jvm-quality-gates/java-lint-gate.md) §10; [gates](jvm-audit/exemplar-quality-gates.md) smell 3). | `grep -rn 'import javax\.annotation\.Nullable' src/main/java` in any module whose build sets `jspecifyMode` — any hit is a contradiction with undefined semantics. The coexistence-note half is a reading heuristic, no automated check. | **MUST** (the import check) · SHOULD (the coexistence note) | JSpecify 1.0 (2024-07-17); Guava 33.4.1+ ships `@NullMarked` |

#### Group 2 — caught by the `javac` invocation itself (`-Xlint`, `-Werror`)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-LINT-07** | Declare `-Werror` in exactly one convention plugin, and pair it with an **enumerated** `-Xlint` key list that names the post-Java-8 keys (`this-escape`, `identity`, `restricted`, `missing-explicit-ctor`, `dangling-doc-comments`, `output-file-clash`, `lossy-conversions`) — never `-Xlint:all` together with `-Werror`. | The three strict exemplars all concentrate `-Werror` in one file (`gradle__gradle@ea17004a31:build-logic/jvm/src/main/kotlin/gradlebuild.strict-compile.gradle.kts:21`, `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-library-conventions.gradle.kts:142`, `uber__NullAway@519a1bb826:build.gradle:83`) ([shape](jvm-audit/exemplar-build-shape.md) §anti-patterns). `all` is open-ended: JDK 25's `javac` has 40 keys and each release adds more, so `all` + `-Werror` makes every toolchain bump a potential build break. The named keys are the ones a Java-8-shaped prior never reaches for. | `grep -rn -- '-Werror' **/*.gradle.kts **/*.gradle **/pom.xml` — **more than one declaring file is the finding**; 9/32 corpus repos set it. Then `grep -n -- '-Xlint:all'` in the same file — co-occurrence with `-Werror` is the finding. | SHOULD | JDK 21 (`this-escape`); JDK 25 (40-key `-Xlint` list); `synchronization` is now a deprecated alias of `identity` |

#### Group 3 — caught by a separate `check` pass (Checkstyle, SpotBugs, PMD, Spotless)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-LINT-08** | The Checkstyle ruleset must be a file committed in the repo. Never resolve it from the Checkstyle jar (`resources.text.fromArchiveEntry(...)`), and never point `<configLocation>` at an upstream name with no local file. | A ruleset resolved from the tool's own artifact changes silently on every `toolVersion` bump — the gate moves without a diff. `google_checks.xml` (89 enabled modules) and `sun_checks.xml` (73) are **not nested**: Google-only has `EmptyCatchBlock`, `MissingOverrideOnRecordAccessor`, `TextBlockGoogleStyleFormatting`; Sun-only has `MagicNumber`, `HiddenField`, `DesignForExtension` ([lint-gate](jvm-quality-gates/java-lint-gate.md) §6). 7 of 8 real corpus users fork their base heavily ([gates](jvm-audit/exemplar-quality-gates.md) smell 4). | `grep -rn 'fromArchiveEntry\|configLocation' **/*.gradle.kts **/pom.xml` — a hit that does not resolve to a repo-relative path is the finding. Then confirm the committed file differs from a fresh upstream copy; byte-identical means nobody reviewed which checks apply. | **MUST** (committed file) · SHOULD (pruned, not stock) | Checkstyle 10.21.0 |
| **JAVA-LINT-09** | Do not add PMD to a new JVM project's gate. | Enforced in **0/32**. `apache__maven@ea4a417bd2:pom.xml:800-810` declares `maven-pmd-plugin` in `<pluginManagement>` with zero bound `<executions>`, and gradle/gradle *implements* the Gradle PMD plugin without running it on itself. Only 18 of PMD 7's 315 Java rules carry its own priority-1 "change absolutely required", and its `security` category has 2 rules ([lint-gate](jvm-quality-gates/java-lint-gate.md) §8). | A `maven-pmd-plugin` with a bound `<execution>`, or a `pmd { }` block with `check.dependsOn(pmdMain)`, added to a project that had none, is the finding. **A declaration in `<pluginManagement>` is not evidence PMD runs** — that is the exact shape to recognise and leave alone. | SHOULD | PMD 7 |
| **JAVA-LINT-10** | SpotBugs earns a place in the gate only when `find-sec-bugs` is wired alongside it, and only on modules that parse, deserialise or execute untrusted input. | SpotBugs' own `SECURITY` category is one of ten and deliberately thin; injection, SSRF and weak-crypto patterns live only in the plugin (144 vulnerability types, 800+ API signatures). Without it, SpotBugs' `CORRECTNESS`/`MT_CORRECTNESS` findings largely duplicate Error Prone's, at a slower post-compile pass ([lint-gate](jvm-quality-gates/java-lint-gate.md) §7). | `grep -rn 'findsecbugs' **/*.gradle* **/pom.xml **/*.toml` in any repo that also has a `spotbugs { }` block or `spotbugs-maven-plugin` with a bound execution. **Empty output plus a SpotBugs gate is the finding.** Re-measured 2026-09-12 across all 32 clones: `find-sec-bugs` is **0/32**. | SHOULD | find-sec-bugs 1.14.0; `com.github.spotbugs` 6.4.8+ |
| **JAVA-LINT-11** | Wire Spotless (or the chosen formatter) into `check`; detaching it (`isEnforceCheck = false`) is allowed only when the same file names the CI job that runs it instead. | Spotless is the corpus's widest formatter adoption (11/32) and `spotlessCheck` is wired into `check` by plugin default in 10 of those 11. The single deliberate detach carries a stated reason — `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.quality-spotless-conventions.gradle.kts:12` ("We run the check separately on CI") ([gates](jvm-audit/exemplar-quality-gates.md) §7). Do **not** scaffold a commit-time hook for this: `.pre-commit-config.yaml`/lefthook is 1/32 corpus-wide and that one is a Bazel repo — 0/29 of the Gradle+Maven exemplars gate formatting at commit time. | `grep -rn 'isEnforceCheck' **/*.gradle.kts` — a `false` with no adjacent comment naming the CI job is the finding. | SHOULD | Spotless (`com.diffplug.spotless`) |

### JAVA-TEST — the test and coverage gate

Depth file: `rules/java-quality/testing.md`. Routing line: *"Writing or reviewing
a test, parallelising a suite, or deciding what coverage number means anything."*

#### Group 1 — caught by reading the dependency declaration (JUnit floor and migration)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-TEST-01** | State the JUnit floor as **5, with 6 as the dated target** (6.0.0, 2025-09-30; Java 17 and Kotlin 2.2 required). Never write a rule, a build file or a claim that assumes 6 is in place. | Adoption is 4/32 (spotless, ktlint, shadow, Exposed dual-declaring 5 and 6), and `gradle__gradle@ea17004a31:gradle/dependency-management/test.versions.toml:23` pins `junit5ForTests = "5.12.2!!"` — the flagship build tool, measured this week, tests itself on JUnit 5 ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §1; [gates](jvm-audit/exemplar-quality-gates.md) §2). | `grep -rn 'junit-bom\|junit-jupiter\|junit-platform' **/*.versions.toml **/*.gradle.kts **/pom.xml` and read the pinned **major**. The presence of `org.junit.jupiter` imports proves nothing about the version. | **MUST** | JUnit 6.0.0 = 2025-09-30; JUnit 6.1.3 current; Platform/Jupiter/Vintage share one version from 6.0.0 |
| **JAVA-TEST-02** | Before any JUnit-6 bump, grep for `junit-platform-runner`. A hit blocks the bump until the dependent tooling is moved to a native Platform launch. | It was removed **without replacement** — JUnit's own upgrade wiki says exactly `"junit-platform-runner (without replacement)"`. Do not conflate it with `junit-platform-jfr`, which *was* folded into `junit-platform-launcher` in the same release; two removals, one destination ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §1). | `grep -rln 'junit-platform-runner\|JUnitPlatform' **/*.gradle.kts **/pom.xml **/*.java` — a hit is a hard blocker, not a warning. Corpus: **0/32**, so a hit in an adopter's repo is genuinely unusual. | **MUST** | JUnit 6.0.0; Maven Surefire/Failsafe ≥3.0.0 required under JUnit 6 |

#### Group 2 — caught by reading `junit-platform.properties` (the two silent no-ops)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-TEST-03** | Every key in a `junit-platform.properties` file is fully qualified: `junit.jupiter.*` or `junit.platform.*`. A bare suffix is not a property and silently does nothing. | The two namespaces are different and routinely confused. **Correction to both wave-1 audits:** their key tables print the suffix form (`execution.parallel.enabled`) as shorthand; the real files carry the prefix — verified 2026-09-12 by `git show` against `micronaut-projects__micronaut-core@d5842045bb` and `mockito__mockito@5a676bcd9e`. A grep written from those tables would match nothing ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §2). | `grep -n '^[a-z]' junit-platform.properties` — every key must start with `junit.jupiter.` or `junit.platform.`. Any other prefix is the finding. | **MUST** | JUnit Platform 1.x / 6.x |
| **JAVA-TEST-04** | `junit.jupiter.execution.parallel.enabled=true` must be paired with `junit.jupiter.execution.parallel.mode.default=concurrent` (or `mode.classes.default`, or `@Execution(CONCURRENT)`). Alone it is a no-op. | Nodes default to `same_thread` regardless of the enabled flag, so the half-configuration reads as "parallel tests are on" while nothing runs concurrently ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §2). | In any file or `systemProperty(...)` call setting `...parallel.enabled=true`, a paired `mode.default` / `mode.classes.default` must exist in the same config. Standalone `enabled=true` is the finding. | **MUST** | JUnit Jupiter 5.3+ |
| **JAVA-TEST-05** | A test that mutates shared global state (`System.setProperty`, `System.setOut/setErr`, `TimeZone.setDefault`, `Locale.setDefault`) under parallel execution carries `@ResourceLock` or `@Isolated`. Treat an absence as a flake source, not a style nit. | These are the only declared synchronisation primitives, and the area is still being hardened upstream — four PRs merged 2025–2026 changed what the annotations can express (`target = CHILDREN`, `ResourceLocksProvider`, Vintage-engine parallelism, global read lock). "The annotation exists somewhere" is not sufficient ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §3). | `grep -rn 'System\.setProperty\|System\.setOut\|System\.setErr\|TimeZone\.setDefault\|Locale\.setDefault' src/test` and cross-reference each hit's enclosing class/method for `@ResourceLock`/`@Isolated`. Empirical backstop: CI flake rate on reruns. A rule row naming a specific capability of this area carries the PR/version it was verified against. | **MUST** | junit-framework PRs [#4151](https://github.com/junit-team/junit-framework/pull/4151), [#3889](https://github.com/junit-team/junit-framework/pull/3889), [#4242](https://github.com/junit-team/junit-framework/pull/4242), [#2614](https://github.com/junit-team/junit-framework/pull/2614); `worker_thread_pool` executor-service is still experimental |

#### Group 3 — caught by reading the Gradle `Test` task wiring

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-TEST-06** | Any `jvm-test-suite` suite other than `test` (`integrationTest`, `functionalTest`) must be explicitly attached to `check`. Declaring a suite does not run it. | The plugin creates the suite and its task but does not add it to `check`'s dependency graph — the same trap as `jacocoTestCoverageVerification` in JAVA-TEST-08. Gradle's own docs still flag the whole API as *"an incubating API and is subject to change in a future release"*; adoption is 4/32 (sqldelight, detekt, gradle/actions, gradle/gradle) ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §4). | `grep -n -A3 'register<JvmTestSuite>' **/*.gradle.kts` and require a matching `tasks.named("check") { dependsOn(...) }` or `check.dependsOn(testing.suites.named(...))`. Absence means the suite runs only when invoked by name. | **MUST** | Gradle 9.x, `jvm-test-suite` incubating |
| **JAVA-TEST-07** | Set `maxParallelForks` explicitly, scaled to the box, and comment the ratio. Drop to `1` only for a named expensive suite, never repo-wide. | The default is `1`, which leaves multi-core CI idle. The corpus range is `cores * 2` (`square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.testing-conventions.gradle.kts:42`) to `cores / 2` (detekt, NullAway, apollo-kotlin); the strictest build, gradle/gradle, sets `1` only for `testing/smoke-test` with the reason inline ([gates](jvm-audit/exemplar-quality-gates.md) §3). Note this is Gradle's out-of-process worker axis, **not** JUnit's in-process thread parallelism from JAVA-TEST-04 — a rule that conflates them mis-prescribes. | `grep -rn 'maxParallelForks' **/*.gradle.kts **/*.gradle` — no match in a multi-module Gradle build is the finding; a hardcoded small integer with no comment is a weaker finding. | SHOULD | Gradle 9.x |

#### Group 4 — caught by reading the coverage-verification construct, not the plugin id

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-TEST-08** | A coverage floor exists only if `jacocoTestCoverageVerification` with `violationRules` is explicitly wired into `check`/`build` (Gradle), or a `<execution>` binding the `check` goal exists (Maven). Applying the plugin or configuring `jacocoTestReport` is never evidence of a floor, and must never be reported as one. | Gradle's own docs state `jacocoTestCoverageVerification` *"is not a task dependency of the `check` task"*. **27/32 corpus repos with any coverage tool stop at the report** ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §6; [gates](jvm-audit/exemplar-quality-gates.md) §4, smell 1). Maven's `check` goal binds to `verify` by default and `haltOnFailure` defaults to `true`, so the Maven half fails closed where the Gradle half fails open. | Gradle: `grep -rln 'violationRules\|jacocoTestCoverageVerification' **/*.gradle.kts` **and** confirm a `check { dependsOn(...) }` or `finalizedBy(...)` wire. Maven: `grep -B2 -A2 '<goal>check</goal>' **/pom.xml`. Matching only `jacocoTestReport`/`koverHtmlReport` is a *negative* result, not a partial pass. | **MUST** | Gradle 9.x JaCoCo plugin; JaCoCo Maven `check` mojo |
| **JAVA-TEST-09** | Read the five lines around any coverage-verification block for an enclosing conditional (`enabled =`, `if (...) disable()`, a `properties["…"]` gate) before calling the floor real. | This is the sharpest correction wave 2 makes to the map. Of the three exemplars the map counts as enforcing, **two gate their gate**: `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.jacoco-aggregation-conventions.gradle.kts:20` sets `enabled = !buildParameters.junit.develocity.predictiveTestSelection.enabled`, and `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts:26-33` calls `disable()` unless `-Pkover.enabled=true` is passed — so a bare `./gradlew check` verifies nothing in either ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §6, §7). | Read, do not grep. A presence-only check for `violationRules`/`minBound` misreports both repos as unconditionally enforced. | **MUST** | — |
| **JAVA-TEST-10** | For a library this program authors (the **OCX SDK**), the coverage floor is a hard number with **no conditional gate**, enforced in CI, Linux-only where platform branches make full coverage unreachable elsewhere. For any other adopter, a floor is CONSIDER. | The fleet precedent is `ocx-sdk-python`'s `fail_under = 100` with the gate enforced Linux-only ([cfg](jvm-audit/config-inventory.md) Axis 3) — a pinned project decision that does not need to be derivable from the corpus. Prescribing it to every adopter would flag 29/32 exemplars including the strictest. The corpus's one unconditional gate is a **Maven** repo: `assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176` — `CLASS` 100%, `INSTRUCTION`/`METHOD`/`BRANCH`/`COMPLEXITY`/`LINE` 80%, bound to `default-check` ([gates](jvm-audit/exemplar-quality-gates.md) §4). | For the SDK: JAVA-TEST-08 passes **and** JAVA-TEST-09 finds no gate. For an adopter: tool presence satisfies CONSIDER. | **MUST** (OCX SDK) · CONSIDER (adopter) | — |

#### Group 5 — things the corpus says not to invent

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-TEST-11** | Do not add test retry, a `-Duser.timezone`/`TZ` pin, or mutation testing as a MUST or SHOULD. Each is CONSIDER, and test retry is named explicitly as a workaround for **infrastructure** flakiness, never for flaky test logic. | Measured: `org.gradle.test-retry` 1/32 official (gradle/gradle) plus 1/32 hand-rolled (mockito), 30/32 nothing; TZ pin **0/32**; Pitest 1/32 (assertj). The corpus's strictest gates — junit-framework, assertj, NullAway — simply do not retry. And the corpus's actual environment discipline runs the *opposite* way: `google__guava@5fb424c43a:pom.xml:384` sets `-Duser.language=hi -Duser.country=IN` to *find* locale bugs rather than pin them away ([gates](jvm-audit/exemplar-quality-gates.md) §3, §8, smells 6–8). | `grep -rn 'testRetryPlugin\|org\.gradle\.test-retry\|-Duser\.timezone\|pitest'` — presence is informational, never a compliance signal in either direction. A newly-added one in a diff is a prompt to ask why. | CONSIDER | — |
| **JAVA-TEST-12** | Never write a bare `maven-surefire-plugin` version `3.6.0`; the unified-provider behaviour ships as `3.6.0-M1`, a milestone. Any rule row citing that behaviour carries the `-M1` qualifier and a date. | Surefire's own docs page is headed "Version: 3.6.0", "Last Published: 2026-08-31", but Maven Central's newest published artifact is **`3.6.0-M1` (2026-06-02)**, with `3.5.6` (2026-05-24) the newest GA line. A build pinning `3.6.0` today pins something that does not exist ([test-coverage](jvm-quality-gates/test-suite-and-coverage.md) §5). The behaviour itself is real: one `surefire-junit-platform` provider absorbs all five legacy providers; JUnit 4 needs ≥4.12 via Vintage; TestNG needs ≥6.14.3; `suiteXmlFiles` is gone. | `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=5&wt=json"` and read the newest `v` before citing any version. Generalise: query the registry, never the vendor doc-site banner. | **MUST** | Surefire `3.6.0-M1`, 2026-06-02, verified 2026-09-12 |

**MUST count: 15** (JAVA-LINT 5, JAVA-TEST 10).

## Applied to the exemplars and the two future consumers

### What the strict exemplars already satisfy

| Rule | Satisfied by |
|---|---|
| JAVA-LINT-01, -02, -03, -04, -05, -06 | `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:21-63` — Error Prone + NullAway on every compile, `onlyNullMarked = true`, `jspecifyMode = true`, `checkContracts = true`, a 5-entry `error(...)` list and a 20-entry `disable(...)` list each with an inline reason. The cleanest single exemplar in the corpus for this whole family. |
| JAVA-LINT-01, -02 (partial), -07 | `uber__NullAway@519a1bb826:build.gradle:83-113` — `-Werror` plus 14 checks forced to `ERROR`, including 2 of the nine (`VoidMissingNullable`, `EqualsMissingNullable`) at `:108-109`. The tool author's own bar for its own code, in the Groovy `check("Name", CheckSeverity.ERROR)` spelling. |
| JAVA-LINT-07 | `gradle__gradle@ea17004a31:build-logic/jvm/src/main/kotlin/gradlebuild.strict-compile.gradle.kts:21` and `junit-team__junit-framework@35c56a8e02:…/junitbuild.java-library-conventions.gradle.kts:142` — `-Werror` in exactly one convention plugin each. |
| JAVA-TEST-01 | `gradle__gradle@ea17004a31:gradle/dependency-management/test.versions.toml:23` — `junit5ForTests = "5.12.2!!"`, an explicit floor rather than an assumed 6. |
| JAVA-TEST-02 | 0/32 reference `junit-platform-runner` — the corpus is clean on this row. |
| JAVA-TEST-03, -04 | `mockito__mockito@5a676bcd9e:mockito-integration-tests/junit-jupiter-parallel-tests/src/test/resources/junit-platform.properties` — fully-prefixed keys, `enabled` + `config.strategy=dynamic` + `mode.default=concurrent`. The corpus's only complete parallel config. |
| JAVA-TEST-07 | `gradle__gradle@ea17004a31:testing/smoke-test/build.gradle.kts:186,195,205` — `1`, scoped to the expensive suite only, with the reason inline. |
| JAVA-TEST-08, -09, -10 | `assertj__assertj@485502bad2:assertj-parent/pom.xml:114-176`, bound at `assertj-core/pom.xml:283` — the corpus's **only** unconditional coverage gate, and it is a Maven repo. |
| JAVA-TEST-11 | junit-framework, assertj and NullAway: no retry, no TZ pin. |

### What prominent exemplars violate

| Rule | Violated by |
|---|---|
| **JAVA-LINT-01** | 19/32 run neither Error Prone nor NullAway ([gates](jvm-audit/exemplar-quality-gates.md) §1). The named lenient pole is `FasterXML__jackson-databind@a906e1782b:pom.xml:336-431` — Error Prone lives in an opt-in `<profile id="errorprone">`, not the default build, with `-XepExcludedPaths:.*/src/test/java/.*` turning it off entirely under test sources. Legacy-debt management, not a green-field model. |
| **JAVA-LINT-02** | `FasterXML__jackson-databind@a906e1782b:pom.xml:359-417` promotes exactly one check (`BoxedPrimitiveEquality:ERROR`) and none of the nine; `uber__NullAway@519a1bb826:build.gradle:108-109` gets 2 of 9. Nobody in the corpus has all nine — this rule is a new commitment, not a codified norm. |
| **JAVA-LINT-08** | `square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.quality-conventions.gradle.kts:33` — `config = resources.text.fromArchiveEntry(checkstyleConfig, "google_checks.xml")`, i.e. the ruleset is read out of the Checkstyle jar at build time and moves with every `toolVersion` bump. Re-read 2026-09-12. This is the corpus's single "uses the stock ruleset" repo and it is the sharpest instance of the rule. |
| **JAVA-LINT-09** (recognise-and-leave-alone half) | `apache__maven@ea4a417bd2:pom.xml:800-810` — `maven-pmd-plugin` in `<pluginManagement>` with zero bound executions. Declared, never run; an agent reading this as "PMD is configured here" is the failure the rule prevents. |
| **JAVA-LINT-10** | **All three** SpotBugs gates violate it. Re-measured 2026-09-12 across all 32 clones: `grep -rl -i findsecbugs` returns **nothing**, while SpotBugs is wired at `apache__kafka@940c100fab:build.gradle:41,342,893`, `assertj__assertj@485502bad2:assertj-parent/pom.xml:105-107` and `diffplug__spotless@dc2a4cb9a3:lib/build.gradle:136` / `testlib/build.gradle:26`. This resolves the sub-artifact's own flagged open question (*"corpus does not confirm how many of those 3 also wire find-sec-bugs"*): **0 of 3, 0/32 overall.** |
| **JAVA-LINT-11** (detach clause) | `mockito__mockito@5a676bcd9e:buildSrc/src/main/kotlin/mockito.quality-spotless-conventions.gradle.kts:12` — `isEnforceCheck = false`. It **satisfies** the rule's escape clause (the comment names the CI job) and is the only detach in the corpus; cite it as the sanctioned shape, not as a violation. |
| **JAVA-TEST-04** | `micronaut-projects__micronaut-core@d5842045bb:http-client/src/test/resources/junit-platform.properties` — the whole file is `junit.jupiter.execution.parallel.enabled = true` and nothing else. Re-read verbatim 2026-09-12. A live instance of the no-op trap, in a flagship framework. |
| **JAVA-TEST-08** | kafka, gradle/gradle, grpc-java, micronaut, mockito, NullAway, nowinandroid, jackson-databind — JaCoCo applied, `jacocoTestReport` configured, **no `violationRules` anywhere**; apollo-kotlin, Exposed and ktor are the Kover equivalents ([gates](jvm-audit/exemplar-quality-gates.md) §4). |
| **JAVA-TEST-09** | `junit-team__junit-framework@35c56a8e02:…/junitbuild.jacoco-aggregation-conventions.gradle.kts:20` (`enabled = !predictiveTestSelection.enabled`) and `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts:26-33` (`disable()` unless `-Pkover.enabled=true`). Both are counted as "enforcing" by the map; neither runs on a bare `check`. |

### New commitments for the OCX SDK

Nothing in the corpus makes these derivable; they are decisions.

| Rule | Commitment |
|---|---|
| JAVA-LINT-01 | MUST, not SHOULD — Error Prone + NullAway wired from the first module, before there is any surface to retrofit. |
| JAVA-LINT-02 | All nine checks at `ERROR` from day one. No exemplar does this; a green-field SDK has no reason not to. |
| JAVA-LINT-05, -06 | `jspecifyMode = true` with `onlyNullMarked = true`, which pins the CI toolchain to **JDK 22+ or an OpenJDK-family 21.0.8+/17.0.19+ with `-XDaddTypeAnnotationsToSymbol=true`** — a toolchain constraint the SDK inherits from a lint decision, and the one place this family reaches into `JAVA-PLAT`. JSpecify is also the right fit for the SDK's Kotlin consumers: it is the only nullness flavour whose Kotlin default is `strict`. |
| JAVA-LINT-10 | SpotBugs + `find-sec-bugs` **is** in scope for the SDK, unlike a general adopter: the CLI-subprocess boundary and the `--format json` parse surface are exactly the untrusted-input shape the rule scopes it to. The SDK would be the first repo in the measured set to wire it. |
| JAVA-TEST-10 | An unconditional coverage floor, enforced Linux-only in CI, mirroring `ocx-sdk-python`'s `fail_under = 100`. Whether the number is literally 100 for a JVM SDK is [Q1](#open-questions). |
| JAVA-TEST-01 | JUnit 6 as the actual floor, not the target — the SDK is green-field, its Java floor is ≥17 anyway, and it has no Vintage or `junit-platform-runner` legacy to strand. This is the one row where the SDK should sit ahead of the corpus rather than with it. |

### New commitments for the OCX Gradle plugin

| Rule | Commitment |
|---|---|
| JAVA-LINT-01, -02, -07 | Same as the SDK — the plugin's own sources are Java/Kotlin and get the same compile-time gate. |
| JAVA-TEST-06 | The plugin's TestKit suite is a `jvm-test-suite` `functionalTest` suite explicitly wired into `check` — the shape `GradleUp__shadow@541b3be475:build.gradle.kts:138,166` already uses (`gradleTestKit()` inside a dedicated `JvmTestSuite`). The incubating-API caveat is accepted deliberately. |
| JAVA-TEST-10 | **Not** a coverage percentage. The plugin's real gate is a Gradle cross-version matrix — `detekt__detekt@45672efb8b:build.gradle.kts:79-88` runs a parallel `detektFunctionalTestMinSupportedGradle` task, and `gradle__actions@a27deee331` matrixes `6.9` → `release-candidate` in CI. A percentage on a plugin whose failure mode is "breaks on Gradle 9.7" measures the wrong thing. (The matrix rule itself is `GRADLE-PLUG`'s, not this family's — named here so the plugin's gate is not mistakenly specified as a coverage number.) |
| JAVA-LINT-10 | Out of scope — a Gradle plugin parses its own build's config, not untrusted input. Do not wire SpotBugs. |

## AI-agent failure modes

Ranked by how often it bites, worst first. Each merged across both sub-artifacts.

1. **Reporting a coverage floor that does not exist.** Asked "does this project enforce coverage", a model answers yes on a `jacoco` plugin id or a `jacocoTestReport` block. Then a second-order version of the same error: it answers yes on a `violationRules` block that is wrapped in `disable()` or `enabled = false`. **Mechanical check:** JAVA-TEST-08 then JAVA-TEST-09 — grep for `violationRules`/`jacocoTestCoverageVerification`/`<goal>check</goal>`, then *read* the five surrounding lines. Never report from the plugin id.
2. **Adding Checkstyle or PMD and calling the lint gate done.** The median tutorial-era answer to "add a lint gate to this Java project" is `maven-pmd-plugin` or a stock `sun_checks.xml`; neither catches a null dereference or a swallowed exception, and PMD is enforced in 0/32. **Mechanical check:** JAVA-LINT-01 — any newly-added Checkstyle/PMD/SpotBugs block with no Error Prone wiring in the same module.
3. **Rethrowing without a cause.** `catch (IOException e) { throw new RuntimeException("failed"); }` is an extremely common generated shape because the message reads as sufficient to a model that will not be the one debugging it. **Mechanical check:** `-Xep:UnusedException:ERROR` (JAVA-LINT-02); reading heuristic, `throw new \w+Exception\(` inside a `catch` whose variable is never referenced in the same statement.
4. **Reaching for `javax.annotation.Nullable` by muscle memory.** jsr305 is 13/32 of the corpus and far more than that of the training distribution, so an agent writing "null-safe Java" in 2026 reaches for it even inside a module that has migrated. **Mechanical check:** JAVA-LINT-06 — `grep -rn 'import javax\.annotation\.Nullable'` in any module whose build sets `jspecifyMode`.
5. **Writing `junit-platform.properties` from a blog-post snippet.** Two distinct failures from the same source: the unprefixed key (does nothing) and `parallel.enabled=true` with no `mode.default` (does nothing). Both appear in real repos. **Mechanical check:** JAVA-TEST-03 then JAVA-TEST-04.
6. **Catching `Exception` broadly "to be safe"** around blocks that can only throw unchecked exceptions, because it reads as defensive. **Mechanical check:** `-Xep:CatchingUnchecked:ERROR` (JAVA-LINT-02).
7. **Citing a version from the vendor's doc-site banner.** Surefire's page says "Version: 3.6.0" while Central's newest is `3.6.0-M1`; the sub-artifact's own first research pass made exactly this mistake before a Central query corrected it. **Mechanical check:** JAVA-TEST-12 — query the registry for the newest `v` before emitting any plugin version into a generated build file.
8. **Recompiling regexes inline** in small validator/parser helpers, where the method looks self-contained and the cost is invisible without profiling. **Mechanical check:** `-Xep:ConstantPatternCompile:ERROR` (JAVA-LINT-02).
9. **Pre-Java-9 constructor patterns** — registering a listener or starting a thread from a constructor, `synchronized (someInteger)`, `==` on boxed values. Silently fine under Java 8, diagnosed from 21 on. **Mechanical check:** `-Xlint:this-escape,identity` (JAVA-LINT-07); `@SuppressWarnings("this-escape")` count is a proxy for how much is being silenced rather than fixed.
10. **Declaring a `jvm-test-suite` suite and assuming `./gradlew check` runs it.** The incubating status plus the non-default wiring make this silent. **Mechanical check:** JAVA-TEST-06.
11. **Conflating two removals in one release.** `junit-platform-jfr` folded into `junit-platform-launcher`; `junit-platform-runner` did not. A model paraphrasing "modules removed in JUnit 6" from one search snippet gets this backwards — it happened in an intermediate research pass for the sub-artifact itself. **Mechanical check:** for any migration claim, quote the removed-module sentence from the primary release notes or wiki, never a snippet.
12. **Asserting a Gradle plugin's default task wiring from plausibility.** Kover's docs never state whether `koverVerify` binds to `check`; the answer here came from reading one convention plugin's comment. **Mechanical check:** never assert a default wiring without an explicit doc sentence or a corpus example; say "not independently confirmed" instead.
13. **Inventing hardening the corpus does not practise** — test retry, TZ pins, Pitest, a `.pre-commit-config.yaml` for formatting. All plausible, all near-absent. **Mechanical check:** JAVA-TEST-11 and JAVA-LINT-11's rationale.

## Open questions

**Q1 — owner decision. Is the OCX SDK's coverage floor literally 100%?**
`ocx-sdk-python` enforces `fail_under = 100` branch coverage, Linux-only. A JVM
SDK wrapping `ProcessBuilder` behind a test seam has more unreachable
platform-branch code than a Python one, and JaCoCo's `BRANCH` counter over
`switch`-on-sealed and `try`-with-resources desugaring is noisier than
`coverage.py`'s. The decision is 100 %, or a named lower number with the
counter and element type spelled out (assertj's `CLASS` 100 / everything-else 80
is the corpus's legible shape). Not derivable from research — it is a project
commitment, like the Python one was.

**Q2 — owner decision. Does the OCX SDK accept the JSpecify toolchain floor?**
JAVA-LINT-05 means `jspecifyMode = true` pins CI to JDK 22+, or an OpenJDK-family
21.0.8+/17.0.19+ with `-XDaddTypeAnnotationsToSymbol=true`. That forecloses an
Oracle-JDK CI image and interacts with whatever JDK matrix
[Q from the `JAVA-PLAT` group] settles on. Accepting it buys generic-type
nullness (`List<@Nullable String>`) that jsr305 cannot express at all.

**Subarea needing another round: the Kotlin half of the coverage gate
(`KT-TEST`).** The question: *does `koverVerify` bind to `check` by default?*
This consolidation could not resolve it — Kover's own docs (0.9.8) never state
it, and the only evidence is a comment in
`Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/kover-conventions.gradle.kts`
implying it does, which is the **opposite** default from JaCoCo. A `KT-TEST`
rule cannot be written either way until a pass fetches Kover's DSL reference
directly or reads the plugin source. If it does auto-wire, JAVA-TEST-08's Gradle
half needs a Kotlin-side exception; if it does not, the two tools finally agree
and the rule simplifies.

**Subarea needing another round: SpotBugs' remaining value next to Error Prone
(`JAVA-LINT`).** The question: *with `find-sec-bugs` at 0/32, is plain SpotBugs
earning anything on a project that already runs Error Prone + NullAway?*
JAVA-LINT-10 sidesteps this by scoping SpotBugs to untrusted-input modules via
the plugin, but all three corpus gates run SpotBugs **without** the plugin — so
either those three are doing something the rule cannot see, or the rule is right
and three flagships are running a redundant slow pass. A pass that diffs
SpotBugs' `CORRECTNESS`/`MT_CORRECTNESS` patterns against Error Prone's
`ENABLED_ERRORS` would settle it; nothing in wave 1 or 2 attempted that mapping.

**Subarea needing another round: `@ResourceLock` capability drift
(`JAVA-TEST`).** The question: *which of `target = CHILDREN`,
`ResourceLocksProvider` and Vintage-engine parallel method execution are in
which JUnit release?* JAVA-TEST-05 names four merged PRs but the sub-artifact
did not map them to versions, so the rule currently says "carry the PR you
verified against" rather than "available from 6.x". That is the right hedge but
a weaker rule than it could be.

**Not an open question, recorded so it is not reopened:** `StringCaseLocaleUsage`
is an `ENABLED_WARNINGS` member, verified by direct count against
`BuiltInCheckerSuppliers.java`. Any later text saying "enable
`StringCaseLocaleUsage`" is wrong; the action is `-Xep:StringCaseLocaleUsage:ERROR`.

## Sub-artifacts

- [`jvm-quality-gates/java-lint-gate.md`](jvm-quality-gates/java-lint-gate.md) — Error Prone's three disjoint checker sets counted from source, the nine `DISABLED_CHECKS` worth promoting with exact switch syntax, NullAway's mutually-exclusive flags and its JSpecify toolchain precondition, the post-Java-8 `-Xlint` keys, `google_checks.xml` vs `sun_checks.xml` measured module-by-module, SpotBugs+find-sec-bugs, and why PMD is a footnote.
- [`jvm-quality-gates/test-suite-and-coverage.md`](jvm-quality-gates/test-suite-and-coverage.md) — the JUnit 6.0.0 floor and the `junit-platform-runner` dead end, every `junit-platform.properties` key that matters with its default, `@ResourceLock`/`@Isolated` semantics and their live upstream churn, Gradle `jvm-test-suite`/`maxParallelForks`/test-retry counts, Surefire's unified provider caught at `-M1`, and the exact constructs that separate a coverage report from a coverage gate in both JaCoCo and Kover.

## Key sources

| URL | Why it is here |
|---|---|
| [`error-prone` `BuiltInCheckerSuppliers.java`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | Ground truth for the 187/312/150 split and for which set a check is in. The docs site's `severity` field is a different axis and must not be used as the gate. |
| [errorprone.info/bugpatterns](https://errorprone.info/bugpatterns) | Per-check rationale and example code for the nine promoted checks (`/bugpattern/DefaultLocale`, `/CatchingUnchecked`, `/UnusedException`, `/ConstantPatternCompile`). |
| [NullAway wiki — Configuration](https://github.com/uber/NullAway/wiki/Configuration) | The exact `AnnotatedPackages` / `OnlyNullMarked` mutual-exclusivity error text behind JAVA-LINT-04. |
| [NullAway wiki — JSpecify Support](https://github.com/uber/NullAway/wiki/JSpecify-Support) | The JDK precondition, the `IllegalStateException` text, and the OpenJDK-only caveat on `-XDaddTypeAnnotationsToSymbol` — JAVA-LINT-05 in full. |
| [`javac(1)`, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html) | The authoritative 40-key `-Xlint` list; the reason `-Xlint:all` + `-Werror` is a trap. |
| [`checkstyle` `google_checks.xml`](https://github.com/checkstyle/checkstyle/blob/master/src/main/resources/google_checks.xml) / [`sun_checks.xml`](https://github.com/checkstyle/checkstyle/blob/master/src/main/resources/sun_checks.xml) | The two shipped rulesets themselves — 89 vs 73 enabled modules and the symmetric difference, not a summary of it. |
| [`spotbugs/etc/messages.xml`](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/messages.xml) | 519 patterns across 10 categories; confirms how thin `SECURITY` is without the plugin. |
| [find-sec-bugs.github.io](https://find-sec-bugs.github.io/) | 144 vulnerability types / 800+ signatures — what JAVA-LINT-10 says SpotBugs is missing without it. |
| [JUnit 6.0.0 release notes](https://docs.junit.org/6.0.0/release-notes.html) | The Java-17/Kotlin-2.2 floor, unified versioning, JSpecify annotations, and the JFR fold-in — dated 2025-09-30. |
| [Upgrading to JUnit 6.0 (wiki)](https://github.com/junit-team/junit-framework/wiki/Upgrading-to-JUnit-6.0) | The literal `"junit-platform-runner (without replacement)"` wording behind JAVA-TEST-02. |
| [JUnit user guide, 6.1.3 single-file export](https://docs.junit.org/6.1.3/_exports/junit-user-guide-6.1.3.html) | The only reliable fetch of the Parallel Execution and Configuration Parameters sections; every key and default in JAVA-TEST-03/04/05. |
| [Gradle JaCoCo plugin docs](https://docs.gradle.org/current/userguide/jacoco_plugin.html) | The load-bearing sentence that `jacocoTestCoverageVerification` "is not a task dependency of the `check` task". |
| [JaCoCo Maven `check` mojo](https://www.jacoco.org/jacoco/trunk/doc/check-mojo.html) | `haltOnFailure`, the `verify`-phase binding, and the `<rules>` XML shape — the Maven half of JAVA-TEST-08. |
| [Gradle `jvm-test-suite` plugin docs](https://docs.gradle.org/current/userguide/jvm_test_suite_plugin.html) | The incubating-API caveat and the fact that a declared suite is not attached to `check`. |
| [Surefire "What's New in 3.6.0"](https://maven.apache.org/surefire/maven-surefire-plugin/whats-new-3-6-0.html) + [Central's Solr index](https://search.maven.org/solrsearch/select?q=g:org.apache.maven.plugins+AND+a:maven-surefire-plugin&core=gav&rows=20&wt=json) | Read together, these two are JAVA-TEST-12: the doc site describes behaviour shipped only in `3.6.0-M1`. |
