---
title: The Java static-analysis gate as configuration
topic: JVM quality gates — Java lint/static-analysis gate of record (JAVA-LINT)
agent: jvm-java-lint-gate-researcher
model: sonnet
date_researched: 2026-09-12
sources_count: 17
scope: >
  Covers Error Prone's three built-in checker sets and which DISABLED_CHECKS
  members are worth promoting for agent-written Java; NullAway configuration
  and its JSpecify mode with toolchain preconditions; javac -Xlint keys added
  after Java 8; Checkstyle's two shipped rulesets; SpotBugs + find-sec-bugs;
  and where PMD sits. Does not cover SonarJava/SonarQube (server-side, out of
  an agent's local gate), Kotlin/detekt (separate rule family), or Gradle/Maven
  wiring beyond the compiler-plugin layer (build-system mechanics are other
  subareas' territory).
---

## Table of contents

1. [Error Prone's three disjoint sets](#1-error-prones-three-disjoint-sets)
2. [Nine DISABLED_CHECKS worth promoting](#2-nine-disabled_checks-worth-promoting)
3. [Exact switch syntax and build wiring](#3-exact-switch-syntax-and-build-wiring)
4. [NullAway configuration](#4-nullaway-configuration)
5. [javac -Xlint keys an agent's priors predate](#5-javac--xlint-keys-an-agents-priors-predate)
6. [Checkstyle: google_checks.xml vs sun_checks.xml](#6-checkstyle-google_checksxml-vs-sun_checksxml)
7. [SpotBugs + find-sec-bugs](#7-spotbugs--find-sec-bugs)
8. [PMD: footnote, not a peer](#8-pmd-footnote-not-a-peer)
9. [The gate of record, stated as config](#9-the-gate-of-record-stated-as-config)
10. [The nullness-annotation coexistence note](#10-the-nullness-annotation-coexistence-note)
11. [Normative guidance candidates](#normative-guidance-candidates)
12. [Exemplar evidence](#exemplar-evidence)
13. [AI-agent angle](#ai-agent-angle)
14. [Contested / evolving](#contested--evolving)
15. [Sources](#sources)

## Summary

- Error Prone's `BuiltInCheckerSuppliers.java` defines exactly three disjoint sets: `ENABLED_ERRORS` (187), `ENABLED_WARNINGS` (312), `DISABLED_CHECKS` (150) — verified by direct count against the file, not the docs site.
- A `DISABLED_CHECKS` member never fires without an explicit `-Xep:Name:WARN` or `-Xep:Name:ERROR`; nine of them catch mistakes agent-written Java makes routinely and are worth turning on project-wide.
- `StringCaseLocaleUsage` is **not** in `DISABLED_CHECKS` — it is already an `ENABLED_WARNINGS` member, so "promoting" it means `-Xep:StringCaseLocaleUsage:ERROR` (severity bump), not activation from off.
- The gate of record for a 2026 JVM project is Error Prone + NullAway at the compiler-plugin layer, Checkstyle for style only, SpotBugs opt-in and only paired with find-sec-bugs, PMD absent.
- Checkstyle's `google_checks.xml` (89 enabled modules) and `sun_checks.xml` (73) diverge on more than half their modules — pick one as a base and expect to fork it; do not treat either as authoritative Java style.
- NullAway 0.12.3+ requires exactly one of `AnnotatedPackages` or `OnlyNullMarked=true` — passing both or neither is a build-time failure with an explicit message, not a silent default.
- NullAway's JSpecify mode (`JSpecifyMode=true`) needs JDK 22+, or JDK 17.0.19+/21.0.8+ **built on OpenJDK, not Oracle JDK**, with `-XDaddTypeAnnotationsToSymbol=true`; missing this throws `IllegalStateException` at compile time, not a warning.
- `JSpecifyExperimental=true` is a bundle flag (`HandleWildcardGenerics`, `JSpecifyJDKModels`, `WarnOnGenericInferenceFailure`) that must be paired with `JSpecifyMode=true`, not a replacement for it.
- Four Java nullness annotation systems coexist in the wild corpus simultaneously (jsr305 13/32, checker-framework 8/32, JSpecify 9/32, NullAway's native JSpecify mode 2/32) — a rule that says "use JSpecify" without a coexistence note contradicts most of the measured corpus.
- `javac -Xlint` gained keys after Java 8 that an LLM trained mostly on pre-2021 Java will not reach for: `this-escape` (21+), `dangling-doc-comments`, `restricted`, `missing-explicit-ctor`, `output-file-clash`, `lossy-conversions`, and `identity`/`synchronization` (value-based-class misuse) — `synchronization` is now a deprecated alias of `identity`.
- The exact Gradle wiring is the `net.ltgt.errorprone` and `net.ltgt.nullaway` plugin pair, configured through `options.errorprone { ... }` on every `JavaCompile` task; Maven wires the same checks through `maven-compiler-plugin`'s `<compilerArgs>` and an `<annotationProcessorPaths>` entry for `error_prone_core`.
- The strictest exemplar (JUnit) turns on 5 checks as `error(...)` and disables ~20 as noise, on top of `onlyNullMarked = true` and `jspecifyMode = true`; the most lenient real corpus user (jackson-databind) enables exactly 1 check (`BoxedPrimitiveEquality:ERROR`) and turns ~20 `OFF` with a one-line reason each — both patterns are legitimate, but an agent's default should look like the strict end, not the lenient one, because jackson-databind's OFF list exists to manage a 20-year-old codebase's debt, not because those checks are wrong.
- SpotBugs's own `SECURITY` category is deliberately thin (one of ten categories, and small); real coverage of OWASP-Top-10-shaped bugs comes only from the `find-sec-bugs` plugin (144 vulnerability types, 800+ API signatures) added as a `spotbugsPlugins` dependency.
- PMD is declared in real poms (e.g. `apache/maven`) but bound to zero `<executions>`, and gradle/gradle implements the Gradle PMD plugin without running it on itself — PMD is a footnote, never the default recommendation.
- Checkstyle stays as the style/formatting gate; it does not catch the bug classes Error Prone and NullAway catch, and should never be sold to an agent as a substitute for either.
- The nine promoted checks each have an exact-syntax activation and a named mistake: e.g. `-Xep:DefaultLocale:ERROR` (implicit `Locale.getDefault()` in string/number formatting is non-deterministic across machines) and `-Xep:UnnecessaryDefaultInEnumSwitch:ERROR` (a `default:` in an enum switch silently swallows a compiler error when a new constant is added).
- `checkContracts = true` (JUnit's config) is a NullAway/Error-Prone `@Contract`-annotation validator, off by default, worth turning on wherever `@Contract` is used at all — otherwise a wrong contract string is inert.

## Findings

### 1. Error Prone's three disjoint sets

`BuiltInCheckerSuppliers.java` (the scanner's actual runtime registration, not the marketing docs) partitions every built-in checker into exactly three `ImmutableSet<BugCheckerInfo>` constants, verified here by direct line count against the fetched source rather than the docs page: [`ENABLED_ERRORS`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java#L724) = **187**, [`ENABLED_WARNINGS`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java#L918) = **312**, [`DISABLED_CHECKS`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java#L1237) = **150**. `allChecks()` is `Iterables.concat(ENABLED_ERRORS, ENABLED_WARNINGS, DISABLED_CHECKS)` — every checker Error Prone ships lives in exactly one of the three sets, never more than one.

The [per-check pages](https://errorprone.info/bugpatterns) are generated from each check's `@BugPattern(severity = ...)` annotation, and that declared severity (`ERROR`/`WARNING`/`SUGGESTION`) is **not** the same axis as which of the three runtime sets a check belongs to — a check can be annotated `severity = WARNING` and still sit in `DISABLED_CHECKS`, meaning it never runs at all until a build opts in with `-Xep:Name:WARN` or `-Xep:Name:ERROR`.

### 2. Nine `DISABLED_CHECKS` worth promoting

All nine names the brief names were checked directly against the fetched `DISABLED_CHECKS` set. Eight are confirmed members; one (`StringCaseLocaleUsage`) is not — it is an `ENABLED_WARNINGS` member (line 1177, inside the 918–1236 range), already running by default at `WARNING` severity. This is a correction worth stating explicitly because a rule that tells an agent to "enable StringCaseLocaleUsage" would be asking it to do nothing (it already runs); the real action is bumping its severity to `ERROR`.

| Check | Set | Mistake it catches | Activation |
|---|---|---|---|
| [`DefaultLocale`](https://errorprone.info/bugpattern/DefaultLocale) | `DISABLED_CHECKS` | Implicit use of the JVM default locale (`String.format`, `.toUpperCase()`, `NumberFormat.getInstance()` with no `Locale` argument) — output differs by host locale, a classic "works on my machine" bug | `-Xep:DefaultLocale:ERROR` |
| `StringCaseLocaleUsage` | **`ENABLED_WARNINGS`** (already on) | `.toUpperCase()`/`.toLowerCase()` with no explicit `Locale` — the Turkish-`i` class of bug | `-Xep:StringCaseLocaleUsage:ERROR` (severity bump only) |
| [`EqualsMissingNullable`](https://errorprone.info/bugpattern/EqualsMissingNullable) | `DISABLED_CHECKS` | An overridden `equals(Object)` parameter not annotated `@Nullable`, even though the JLS contract requires `equals(null)` to return `false` rather than throw | `-Xep:EqualsMissingNullable:ERROR` |
| `FieldMissingNullable` | `DISABLED_CHECKS` | A field assigned a possibly-null expression without `@Nullable`, defeating NullAway's field-level dataflow | `-Xep:FieldMissingNullable:ERROR` |
| `VoidMissingNullable` | `DISABLED_CHECKS` | A `Void`-typed field/parameter/return not marked `@Nullable` — `Void` has exactly one non-null-adjacent value, `null`, so an unmarked `Void` is unreachable code | `-Xep:VoidMissingNullable:ERROR` |
| [`CatchingUnchecked`](https://errorprone.info/bugpattern/CatchingUnchecked) | `DISABLED_CHECKS` | `catch (Exception e)` around a block that can only throw unchecked exceptions — obscures which failures are actually possible; catch `RuntimeException` or the specific type instead | `-Xep:CatchingUnchecked:ERROR` |
| [`UnusedException`](https://errorprone.info/bugpattern/UnusedException) | `DISABLED_CHECKS` | Catching an exception and throwing a new one without passing the original as `cause` — truncates the stack trace at the `catch`, the single most common "why did this fail" dead end in agent-written error handling | `-Xep:UnusedException:ERROR` |
| [`ConstantPatternCompile`](https://errorprone.info/bugpattern/ConstantPatternCompile) | `DISABLED_CHECKS` | `Pattern.compile("literal")` called inside a method body — recompiles the regex on every call instead of once as a `static final Pattern` | `-Xep:ConstantPatternCompile:ERROR` |
| `UnnecessaryDefaultInEnumSwitch` | `DISABLED_CHECKS` | A `default:` branch in a `switch` over an enum — when a new constant is later added, the `default:` silently absorbs it instead of the compiler flagging a missing case (the inverse problem from `MissingCasesInEnumSwitch`, which jackson-databind explicitly turns `OFF` — see [Finding 9](#9-the-gate-of-record-stated-as-config)) | `-Xep:UnnecessaryDefaultInEnumSwitch:ERROR` |

### 3. Exact switch syntax and build wiring

The command-line switch shape is uniform: `-Xep:<CheckName>:<SEVERITY>` where `<SEVERITY>` ∈ `{OFF, WARN, ERROR}` (a `DISABLED_CHECKS` member additionally needs the switch just to run at all; an `ENABLED_ERRORS`/`ENABLED_WARNINGS` member can be dialed down with `OFF`/`WARN` the same way). Suppressing one path from all Error Prone checking uses `-XepExcludedPaths:<regex>`.

**Gradle (Kotlin DSL)**, via the [`net.ltgt.errorprone`](https://plugins.gradle.org/plugin/net.ltgt.errorprone) plugin (latest at fetch time: `5.1.1`):

```kotlin
plugins {
    `java-library`
    id("net.ltgt.errorprone") version "5.1.1"
}

dependencies {
    errorprone("com.google.errorprone:error_prone_core:2.36.0")
}

tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        disable("StringSplitter")           // e.g. avoid pulling in Guava
        error("DefaultLocale", "UnusedException", "ConstantPatternCompile")
    }
}
```

This exact shape — `disable(...)` list with per-item reasons, then `error(...)` list — is what [`junit-team__junit-framework@35c56a8e02:.../junitbuild.java-errorprone-conventions.gradle.kts:21-49`](https://github.com/junit-team/junit-framework/blob/35c56a8e02f6f2ae6c0ea3616097b1cfefe17d2a/gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts#L21-L49) does at scale (20 `disable(...)` entries, each with an inline comment; 5 `error(...)` entries). [`uber__NullAway@519a1bb826:build.gradle:86-109`](https://github.com/uber/NullAway/blob/519a1bb8265bd7c3d4055d41b61e6a0a8da3b720/build.gradle#L86-L109) instead uses the Groovy-DSL `check("Name", CheckSeverity.ERROR)` / `check("Name", CheckSeverity.OFF)` form (same tool, older/Groovy build script — an agent should recognize both spellings as equivalent).

**Maven**, via `maven-compiler-plugin`'s `<compilerArgs>` and an `annotationProcessorPaths` entry (no separate error-prone Maven plugin exists — it is a `javac` plugin, so it hooks the same annotation-processor path every other processor uses):

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-compiler-plugin</artifactId>
  <configuration>
    <compilerArgs>
      <arg>-XDcompilePolicy=simple</arg>
      <arg>-Xplugin:ErrorProne -Xep:DefaultLocale:ERROR -Xep:UnusedException:ERROR</arg>
    </compilerArgs>
    <annotationProcessorPaths>
      <path>
        <groupId>com.google.errorprone</groupId>
        <artifactId>error_prone_core</artifactId>
        <version>2.36.0</version>
      </path>
    </annotationProcessorPaths>
  </configuration>
</plugin>
```

This is the exact shape of [`FasterXML__jackson-databind@a906e1782b:pom.xml:336-431`](https://github.com/FasterXML/jackson-databind/blob/a906e1782b9aaa9fd27636e4c001cf27e236ff24/pom.xml#L336-L431) (an opt-in Maven `<profile id="errorprone">`, not the default build — `-XepExcludedPaths:.*/src/test/java/.*` disables all checks under test sources, one `-Xep:BoxedPrimitiveEquality:ERROR` upgrade, ~20 `-Xep:Name:OFF` downgrades each carrying a one-line `<!-- reason -->` comment, `error_prone_core:2.36.0` pinned via `annotationProcessorPaths`).

### 4. NullAway configuration

**`AnnotatedPackages` vs `OnlyNullMarked`.** Before NullAway 0.12.3, `-XepOpt:NullAway:AnnotatedPackages=<comma-separated prefixes>` was mandatory — it told NullAway which packages to actually check. 0.12.3+ adds `-XepOpt:NullAway:OnlyNullMarked=true`, which instead checks any code reachable from a JSpecify `@NullMarked` annotation regardless of package. The two flags are **mutually exclusive**: passing neither, or passing both, fails the build immediately with an explicit message rather than picking a silent default — [NullAway Configuration wiki](https://github.com/uber/NullAway/wiki/Configuration): *"Must either specify annotated packages, using the `-XepOpt:NullAway:AnnotatedPackages=[...]` flag, or pass `-XepOpt:NullAway:OnlyNullMarked` (but not both)."*

**`JSpecifyMode` vs `JSpecifyExperimental`.** `-XepOpt:NullAway:JSpecifyMode=true` enables full JSpecify semantics including generic-type annotations (`List<@Nullable String>`) and automatically turns on `AcknowledgeRestrictiveAnnotations`; the wiki still describes it as "under development." `-XepOpt:NullAway:JSpecifyExperimental=true` is a bundle flag that must be paired with `JSpecifyMode=true` (it is not standalone) and turns on three finer flags together: `HandleWildcardGenerics=true`, `JSpecifyJDKModels=true` (loads JDK nullness models from `jspecify/jdk` so `java.util.*` call sites are checked more precisely), `WarnOnGenericInferenceFailure=true`. Each of the three can also be set individually to adopt gradually. Neither flag "crashes the build" by itself — the crash risk is entirely in the toolchain precondition below.

**Toolchain precondition.** JSpecify mode requires a `javac` that can read type-use annotations back off class files. That means: **JDK 22+** natively, or **JDK 21.0.8+ / 17.0.19+** with the extra flag `-XDaddTypeAnnotationsToSymbol=true` passed to `javac` — and that flag-based path **only works on OpenJDK-family builds (Temurin, Zulu, etc.), not on Oracle JDK 17/21**, per [NullAway's JSpecify-Support wiki](https://github.com/uber/NullAway/wiki/JSpecify-Support). Since 0.12.11, NullAway checks this precondition itself and fails fast with `IllegalStateException`: *"Running NullAway in JSpecify mode requires either JDK 22+ or passing the flag `-XDaddTypeAnnotationsToSymbol=true` to an older JDK that supports it."* This is a hard toolchain gate, not a lint warning — a CI matrix pinned to an Oracle JDK 21 base image will fail outright the moment `jspecifyMode = true` is set, independent of any source-code issue.

**Gradle** (`net.ltgt.nullaway` plugin, Kotlin DSL — matches [`junit-team__junit-framework@35c56a8e02:...:52-63`](https://github.com/junit-team/junit-framework/blob/35c56a8e02f6f2ae6c0ea3616097b1cfefe17d2a/gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts#L52-L63)):

```kotlin
options.errorprone.nullaway {
    enable()
    onlyNullMarked = true
    jspecifyMode = true
    checkContracts = true
}
```

**Maven** (same `-XepOpt:` flags, passed through the same `-Xplugin:ErrorProne` compiler arg, plus a `nullaway` annotation-processor path alongside `error_prone_core`):

```xml
<arg>-Xplugin:ErrorProne -XepOpt:NullAway:OnlyNullMarked=true -XepOpt:NullAway:JSpecifyMode=true</arg>
```
```xml
<annotationProcessorPaths>
  <path><groupId>com.google.errorprone</groupId><artifactId>error_prone_core</artifactId><version>2.36.0</version></path>
  <path><groupId>com.uber.nullaway</groupId><artifactId>nullaway</artifactId><version>0.12.11</version></path>
</annotationProcessorPaths>
```

### 5. `javac -Xlint` keys an agent's priors predate

Full 40-key list confirmed against the [JDK 25 `javac(1)` man page](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html). The keys most likely to be missing from an LLM's Java-8-shaped priors:

| Key | Added / meaning | Why an agent misses it |
|---|---|---|
| `this-escape` | Java 21. Warns when a constructor leaks `this` before subclass initialization completes | Pre-21 idiom (registering listeners, starting threads, calling overridable methods from a constructor) was silently dangerous, not diagnosed |
| `dangling-doc-comments` | Warns about extra/misplaced Javadoc comments near a declaration | New diagnostic category; agents don't expect a warning here at all |
| `restricted` | Warns about calls to restricted methods (FFM API, JEP 454 family) | Post-8 API surface entirely |
| `missing-explicit-ctor` | Warns when a public/protected class in an exported package has no explicit constructor | JPMS-era concern; irrelevant pre-modules |
| `output-file-clash` | Warns if compilation overwrites an output file (case-insensitive filesystem class-name collisions) | Obscure, filesystem-dependent |
| `lossy-conversions` | Warns about lossy narrowing in compound assignment (`byte b = 1; b += 200;`) | Compound-assignment narrowing was never flagged before |
| `identity` (and its deprecated alias `synchronization`) | Warns about identity-sensitive operations (`==`, `synchronized`, `System.identityHashCode`) on value-based classes (`Integer`, `LocalDate`, the eventual JEP value classes) | An agent trained on `Integer` caching folklore will still write `synchronized (someInteger)` or rely on `==` for small boxed values |

`-Xlint:all,-cast` style exclusion syntax and per-declaration suppression (`@SuppressWarnings("this-escape")`) both work exactly as with older keys — nothing new about the suppression mechanism, only about which keys exist.

### 6. Checkstyle: `google_checks.xml` vs `sun_checks.xml`

Both rulesets were fetched directly from [`checkstyle/checkstyle` on `master`](https://github.com/checkstyle/checkstyle/tree/master/src/main/resources). `google_checks.xml` activates 89 distinct check modules (112 `<module>` tags total once meta-modules like `SuppressWarningsHolder`, `SuppressionCommentFilter` and the `Checker`/`TreeWalker` containers are counted); `sun_checks.xml` activates 73. The two sets are **not nested** — each has checks the other entirely lacks:

- **Google-only, not in Sun**: `Indentation`, `JavadocParagraph`, `AnnotationLocation`, `OneTopLevelClass`, `EmptyCatchBlock`, `AbbreviationAsWordInName`, `MissingOverrideOnRecordAccessor`, `TextBlockGoogleStyleFormatting`, `SuppressWarningsHolder`.
- **Sun-only, not in Google**: `DesignForExtension`, `HiddenField`, `VisibilityModifier`, `MagicNumber`, `ConstantName`, `MemberName`, `RedundantModifier`, `AvoidNestedBlocks`, `FinalParameters`.

Practically: starting from `sun_checks.xml` buys stricter encapsulation/design checks (`DesignForExtension`, `HiddenField`, `VisibilityModifier`) that Google's ruleset doesn't attempt at all; starting from `google_checks.xml` buys modern-syntax and Javadoc-formatting checks (`MissingOverrideOnRecordAccessor` for records, `TextBlockGoogleStyleFormatting`) that Sun's 1997-vintage ruleset predates entirely. Neither is a superset — **7 of 8 real corpus Checkstyle users fork heavily from whichever base they start from**, so "ship `google_checks.xml` unmodified" is not a realistic end state; treat it as a starting point to prune, not a finished config.

### 7. SpotBugs + find-sec-bugs

SpotBugs' own bug catalogue ([`spotbugs/etc/messages.xml`](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/messages.xml)) defines 519 bug patterns across 10 categories (`CORRECTNESS`, `BAD_PRACTICE`, `STYLE`, `MT_CORRECTNESS`, `PERFORMANCE`, `SECURITY`, `MALICIOUS_CODE`, `I18N`, `EXPERIMENTAL`, `NOISE`) — `SECURITY` is deliberately the narrowest category by design; SpotBugs' own docs point at [`find-sec-bugs`](https://find-sec-bugs.github.io/) as the plugin meant to fill it. Find Security Bugs (current release `1.14.0`) adds 144 vulnerability types across 800+ API signatures spanning Spring MVC, Struts, Tapestry, and generic JDBC/crypto/deserialization patterns SpotBugs core does not attempt.

**Gradle** (`com.github.spotbugs` plugin):

```kotlin
plugins {
    id("com.github.spotbugs") version "6.4.8"
}

dependencies {
    spotbugsPlugins("com.h3xstream.findsecbugs:findsecbugs-plugin:1.14.0")
}
```

**Maven** (`spotbugs-maven-plugin` with a `<plugins>` sub-element pointing at the find-sec-bugs jar):

```xml
<plugin>
  <groupId>com.github.spotbugs</groupId>
  <artifactId>spotbugs-maven-plugin</artifactId>
  <configuration>
    <plugins>
      <plugin>
        <groupId>com.h3xstream.findsecbugs</groupId>
        <artifactId>findsecbugs-plugin</artifactId>
        <version>1.14.0</version>
      </plugin>
    </plugins>
  </configuration>
</plugin>
```

SpotBugs bytecode analysis without `find-sec-bugs` is real but security-thin; the recommendation is: **SpotBugs earns a place in the gate only when `find-sec-bugs` is wired alongside it.** SpotBugs alone, run for its `CORRECTNESS`/`MT_CORRECTNESS` categories, overlaps substantially with what Error Prone already catches at compile time (Error Prone runs earlier, in the same `javac` invocation, with better diagnostics) — the marginal value of plain SpotBugs on a project that already runs Error Prone + NullAway is low; the marginal value of `find-sec-bugs` specifically is not.

### 8. PMD: footnote, not a peer

PMD 7's rule catalogue (`pmd-java/src/main/resources/category/java/*.xml`, mirrored at [pmd.github.io/pmd/pmd_rules_java.html](https://pmd.github.io/pmd/pmd_rules_java.html)) totals 315 non-deprecated Java rules across `errorprone` (99), `bestpractices` (69), `codestyle` (63), `design` (44), `performance` (25), `multithreading` (12), `documentation` (6), `security` (2 — PMD explicitly defers most security coverage to SpotBugs/find-sec-bugs/SonarJava). Only 18 of 315 rules carry PMD's own "Change absolutely required" priority 1; 248 sit at the default-working-set priority 3. Real-world adoption in the exemplar corpus is essentially nonexistent as an *enforced* gate: `apache__maven`'s `pom.xml` declares `maven-pmd-plugin` in `<pluginManagement>` with zero `<executions>` bound (declared, never run), and `gradle/gradle` implements the Gradle PMD plugin as a *feature it ships to users* without running it on its own build. PMD gets one line in the gate config: legacy Maven repos sometimes declare it; do not add it to a new project, and do not treat "declared in a pom" as evidence it runs.

### 9. The gate of record, stated as config

Decision, following the topic map's resolved conflict #9: Error Prone + NullAway is the Java gate of record; Checkstyle is style-only; SpotBugs is opt-in and only earns a place paired with find-sec-bugs; PMD is out. As short config blocks:

**Gradle (Kotlin DSL), the strict default an agent should reach for:**

```kotlin
plugins {
    `java-library`
    id("net.ltgt.errorprone") version "5.1.1"
    id("net.ltgt.nullaway") version "3.2.0"
    checkstyle
}

dependencies {
    errorprone("com.google.errorprone:error_prone_core:2.36.0")
    errorprone("com.uber.nullaway:nullaway:0.12.11")
}

checkstyle {
    toolVersion = "10.21.0"
    configFile = file("config/checkstyle/google_checks.xml") // start here, prune per Finding 6
}

tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        error("DefaultLocale", "StringCaseLocaleUsage", "EqualsMissingNullable",
              "FieldMissingNullable", "VoidMissingNullable", "CatchingUnchecked",
              "UnusedException", "ConstantPatternCompile", "UnnecessaryDefaultInEnumSwitch")
        nullaway {
            enable()
            onlyNullMarked = true
            jspecifyMode = true
            checkContracts = true
        }
    }
}
```

**Maven**, same checks via `maven-compiler-plugin` (see Findings 3–4 for the full `<compilerArgs>`/`<annotationProcessorPaths>` shape) plus `maven-checkstyle-plugin` bound to `verify` with `<configLocation>google_checks.xml</configLocation>` and `<failOnViolation>true</failOnViolation>`.

**Where SpotBugs + find-sec-bugs and PMD sit**: SpotBugs+find-sec-bugs is a recommended *additional* gate for anything handling untrusted input (parsers, deserialization, network-facing code — squarely the OCX SDK's contract-handling surface); it is not part of the baseline every module gets, because its bytecode-analysis pass is slower and its non-security findings duplicate Error Prone's compile-time ones. PMD is not part of the gate at all.

The strictest and most lenient real poles measured: `junit-team__junit-framework@35c56a8e02` runs `onlyNullMarked`/`jspecifyMode`/`checkContracts` plus a 5-entry `error(...)` list on top of Error Prone's own defaults, with a 20-entry `disable(...)` list each carrying a one-line reason; `uber__NullAway@519a1bb826:build.gradle:84-113` runs `-Werror` (every warning is fatal) plus 14 checks explicitly forced to `ERROR`; `FasterXML__jackson-databind@a906e1782b:pom.xml:359-417` — a 20-year-old, extremely widely used library — runs Error Prone in an **opt-in, not default, Maven profile**, upgrades exactly one check (`BoxedPrimitiveEquality`) and turns ~20 `OFF`, each with a one-line justification. The lesson for an agent-written *new* codebase: start at the JUnit/NullAway end (strict, opt-out per check with a reason), not the jackson-databind end — jackson-databind's leniency is legacy-debt management, not a model to imitate from a green field.

### 10. The nullness-annotation coexistence note

Four Java nullness annotation systems are live simultaneously in the measured corpus: `jsr305`'s `javax.annotation.Nullable` (13/32), the Checker Framework's own annotations (8/32), JSpecify's `org.jspecify.annotations.Nullable`/`@NullMarked` (9/32 declared), and NullAway's own JSpecify-native mode (`jspecifyMode`/`onlyNullMarked`, 2/32 — `junit-framework` and NullAway's own `jdk-javac-plugin` submodule). They are not silently interchangeable: NullAway's non-JSpecify default mode treats `@Nullable` from *any* package as equivalent by simple-name matching (so a project can mix `jsr305`'s and JSpecify's `@Nullable` without immediate breakage), but `JSpecifyMode=true` switches to strict JSpecify semantics — generic-type nullness (`List<@Nullable String>`), which jsr305's non-type-use `@Nullable` cannot express at all. Guava 33.4.1+ ships `@NullMarked` on most packages, so **any** NullAway-checked project calling into modern Guava gets stricter checking at those call sites regardless of the project's own mode. Practical guidance: **new public API surface should be JSpecify-annotated** (this is the direction — see the topic map's resolved conflict #8 — and it is a MUST for the OCX SDK's own public types), but a rule recommending JSpecify must say explicitly that (a) `jsr305`/Checker-Framework annotations already in a dependency graph are not migrated away automatically, (b) mixing systems within one project is normal and NullAway's default (non-JSpecify) mode already handles that mix by name, and (c) flipping `jspecifyMode = true` is the point where the mix stops being transparent and unannotated legacy code needs `@NullUnmarked` or migration.

## Normative guidance candidates

1. **Wire Error Prone and NullAway at the compiler-plugin layer on every Java module that isn't a pure test-fixture module.** Rationale: this is the only gate in the measured corpus that runs on every compile, not on a separate CI-only pass — a broken build is the fastest possible feedback loop. Verify: Gradle — `./gradlew :module:compileJava` output shows `error: [CheckName]` on a known-bad fixture; grep `build.gradle(.kts)` for `net.ltgt.errorprone` and `net.ltgt.nullaway`. Maven — grep `pom.xml` for `error_prone_core` in `annotationProcessorPaths`.
2. **Set `-XepOpt:NullAway:OnlyNullMarked=true` for any new module (not `AnnotatedPackages`) once NullAway 0.12.3+ is the floor.** Rationale: package-prefix lists rot as code moves between packages; `@NullMarked` travels with the code. Verify: grep the build file for `AnnotatedPackages=` in a module created after this rule lands — its presence is a finding.
3. **Never set both `AnnotatedPackages` and `OnlyNullMarked`, and never set neither.** Rationale: NullAway fails the build immediately either way; catching it in review is cheaper than in CI. Verify: grep for both flags co-occurring in one `options.errorprone.nullaway { }` block or one `-XepOpt:NullAway:` compiler arg string.
4. **Before setting `jspecifyMode = true`, confirm the CI/toolchain JDK is 22+, or 17.0.19+/21.0.8+ on an OpenJDK-family distribution with `-XDaddTypeAnnotationsToSymbol=true` set.** Rationale: the alternative is an `IllegalStateException` at compile time on the exact CI image that was supposed to be the safety net. Verify: check `gradle/wrapper` / toolchain declaration's JDK vendor and version against this precondition; grep for `-XDaddTypeAnnotationsToSymbol` when the JDK is below 22.
5. **Promote `DefaultLocale`, `StringCaseLocaleUsage`, `EqualsMissingNullable`, `FieldMissingNullable`, `VoidMissingNullable`, `CatchingUnchecked`, `UnusedException`, `ConstantPatternCompile`, `UnnecessaryDefaultInEnumSwitch` to `ERROR` on every new module.** Rationale: each catches a specific, recurring class of mistake in generated Java (see Finding 2's table) that `ENABLED_ERRORS`/`ENABLED_WARNINGS` do not cover. Verify: grep the build file's `error(...)`/`check("Name", CheckSeverity.ERROR)` list, or the Maven `-Xep:Name:ERROR` args, for all nine names (remembering `StringCaseLocaleUsage` needs only the severity bump, not activation).
6. **Any `catch` block that rethrows must pass the caught exception as `cause`.** Rationale: `UnusedException` exists because this is the single most common way agent-written error handling destroys debuggability. Verify: `-Xep:UnusedException:ERROR` failing the build is definitionally the check; as a reading heuristic, grep for `throw new \w+Exception\(` inside a `catch` block with no reference to the caught variable in the same statement.
7. **A `Pattern.compile(...)` call with a literal string argument must be a `static final` field, never inline in a method body.** Rationale: recompiling a regex per call is a measurable performance bug that is invisible in code review without knowing to look. Verify: `-Xep:ConstantPatternCompile:ERROR`; grep: `Pattern\.compile\("` inside a method body (not preceded by `static final Pattern`).
8. **An enum `switch` must never carry a `default:` branch when all constants are meant to be handled.** Rationale: `default:` silently absorbs new enum constants that should force a compile error; the correct pattern is exhaustive `case` coverage (or, in modern Java, a `switch` expression, which the compiler already makes exhaustive). Verify: `-Xep:UnnecessaryDefaultInEnumSwitch:ERROR`.
9. **Pick one Checkstyle base (`google_checks.xml` recommended for new code, for its record/text-block/annotation-era awareness) and commit the pruned copy to the repo — never reference the upstream file unmodified as the long-term config.** Rationale: the two shipped rulesets diverge on more than half their modules; treating either as a finished product misrepresents what real users do (7/8 measured Checkstyle users fork heavily). Verify: the project's own `config/checkstyle/*.xml` exists and differs from a fresh copy of `google_checks.xml`/`sun_checks.xml` (a byte-identical copy is itself a finding — it means no one has actually reviewed which checks apply).
10. **Do not add PMD to a new JVM project's gate.** Rationale: zero of 32 measured exemplars enforce it (declared-but-unbound in `apache/maven`, shipped-but-unused in `gradle/gradle`); its unique non-overlapping coverage (2 security rules, thin multithreading set) is better obtained from Error Prone + NullAway + find-sec-bugs. Verify: absence of `maven-pmd-plugin` with a bound `<execution>`, or absence of the Gradle `pmd { }` block with `check.dependsOn(pmdMain)`.
11. **SpotBugs earns a place in the gate only bundled with `find-sec-bugs` (`spotbugsPlugins("com.h3xstream.findsecbugs:findsecbugs-plugin:1.14.0")` or the Maven `<plugins>` equivalent), and only on modules that parse untrusted input.** Rationale: SpotBugs' own `SECURITY` category is thin by design; without find-sec-bugs it mostly duplicates Error Prone's compile-time findings at a slower, separate-pass cost. Verify: `spotbugsPlugins` dependency list contains `findsecbugs-plugin`; a module without untrusted-input handling running SpotBugs is a candidate for removal, not a violation.
12. **A public method's overridden `equals(Object)` parameter, and any field or `Void`-typed member holding a possibly-absent value, must be annotated `@Nullable` (JSpecify) rather than left bare.** Rationale: `EqualsMissingNullable`/`FieldMissingNullable`/`VoidMissingNullable` exist because NullAway's dataflow analysis needs the annotation to reason correctly — an unannotated nullable member is a silent hole in the null-safety net even with NullAway enabled. Verify: the three named checks at `ERROR`; as a reading heuristic, any `equals(Object o)` override whose parameter has no `@Nullable`.
13. **Never recommend "use JSpecify" as a bare instruction; state the coexistence with `jsr305`/Checker Framework and whether `jspecifyMode` is being flipped.** Rationale: JSpecify is declared in 9/32 exemplars, NullAway's JSpecify-native mode in only 2/32, against jsr305 in 13/32 — a bare instruction contradicts most of the measured corpus and gives no migration path. Verify: any rule text or generated code comment mentioning JSpecify also states what happens to existing `jsr305`/Checker annotations in the same module (reading heuristic — no automated check).
14. **New Java code targeting Java 21+ must not leak `this` from a constructor, and must not use `==`/`synchronized` on boxed primitives, records, or other value-based classes.** Rationale: `-Xlint:this-escape` and `-Xlint:identity` exist specifically because these patterns compiled silently under Java 8-17 and were always subtly wrong. Verify: `-Xlint:this-escape,identity` producing zero warnings on `javac` output; grep for `synchronized\s*\(\s*\w+\s*\)` where the variable's declared type is `Integer`/`Long`/`LocalDate`/etc.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| #1 (Error Prone + NullAway wired) | [`junit-team__junit-framework@35c56a8e02`](https://github.com/junit-team/junit-framework/blob/35c56a8e02f6f2ae6c0ea3616097b1cfefe17d2a/gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts) (both, every compile); [`uber__NullAway@519a1bb826:build.gradle:84-113`](https://github.com/uber/NullAway/blob/519a1bb8265bd7c3d4055d41b61e6a0a8da3b720/build.gradle#L84-L113) (Error Prone + `-Werror`) | 19/32 exemplars run neither ([exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md)) — the gate is a minority practice even among flagships, so treat #1 as a target state, not an existing norm |
| #2 (`OnlyNullMarked` over `AnnotatedPackages`) | `junit-team__junit-framework@35c56a8e02:...:61` (`onlyNullMarked = true`) | `uber__NullAway@519a1bb826:build.gradle` itself does not set either flag in the excerpt fetched — NullAway's own build predates 0.12.3-era `OnlyNullMarked` convergence; check its full `build.gradle` before assuming |
| #5 (nine promoted checks) | `uber__NullAway@519a1bb826:build.gradle:108-109` sets exactly two of the nine (`VoidMissingNullable`, `EqualsMissingNullable`) to `ERROR` — partial adoption, real-world | `FasterXML__jackson-databind@a906e1782b:pom.xml` sets none of the nine; it upgrades only `BoxedPrimitiveEquality` |
| #6 (`UnusedException` cause-chaining) | `uber__NullAway@519a1bb826:build.gradle:105` sets `UnusedException` to `ERROR` explicitly | — |
| #9 (fork Checkstyle, don't ship stock) | [gates](../jvm-audit/exemplar-quality-gates.md) measured 8/32 with a real wired Checkstyle config — cite that audit for which ones fork vs. use stock | — |
| #10 (no PMD) | `apache__maven@ea4a417bd2:pom.xml:800-810` — `maven-pmd-plugin` in `<pluginManagement>`, zero `<executions>` — exactly the "declared, not enforced" pattern the rule targets; `gradle__gradle` ships the Gradle PMD plugin as a feature without self-applying it | 0/32 exemplars enforce PMD — no counterexample found |
| #11 (SpotBugs only with find-sec-bugs) | [gates](../jvm-audit/exemplar-quality-gates.md): SpotBugs as a real gate in 3/32 | corpus does not confirm how many of those 3 also wire find-sec-bugs — re-measure before citing a specific repo@sha here if the number matters downstream |
| #13 (JSpecify coexistence note) | `junit-team__junit-framework@35c56a8e02` is the clean case: `jspecifyMode = true`, no jsr305 in the same module | 13/32 exemplars carry jsr305 dependencies per [gates](../jvm-audit/exemplar-quality-gates.md) — the coexistence is the norm, not the JUnit-style clean cutover |

## AI-agent angle

- **Catching `Exception` broadly "to be safe."** An LLM's training-data-median Java catches `Exception` even around blocks that can only throw unchecked exceptions, because it reads as defensive. `CatchingUnchecked` at `ERROR` catches this mechanically; the smallest check is `-Xep:CatchingUnchecked:ERROR` failing the specific line.
- **Rethrowing without a cause.** Converting a checked exception to unchecked (`catch (IOException e) { throw new RuntimeException("failed"); }`) is an extremely common LLM pattern because the "message" reads as sufficient context to a model that isn't the one debugging it later. `-Xep:UnusedException:ERROR` is the mechanical catch; the tell in review is a `throw new \w+Exception\("..."\)` inside a `catch` block that never references the caught variable.
- **`javax.annotation.Nullable` reflexively, because that's what most Java in training data uses.** An agent asked to write "null-safe" Java in 2026 will very likely reach for `javax.annotation.Nullable` (jsr305) by muscle memory rather than JSpecify's `org.jspecify.annotations.Nullable`, even inside a project that has already migrated. Smallest check: grep new files for `import javax.annotation.Nullable` in a module whose build already sets `jspecifyMode = true` — this combination is a contradiction and NullAway's JSpecify-mode semantics for a jsr305 annotation are undefined/inconsistent.
- **Pre-Java-9 module-oblivious constructor patterns that now trip `this-escape` and `missing-explicit-ctor`.** Registering a listener or starting a thread from inside a constructor was common, unflagged Java-8-era style; an LLM reproduces it verbatim. Smallest check: `-Xlint:this-escape` on the `javac` invocation, `@SuppressWarnings` count as a proxy for how much of it is being silenced rather than fixed.
- **Recompiling regexes inline because "it's just a helper method."** Agents write small validator/parser helpers with `Pattern.compile("...")` inline, since the method looks self-contained and the performance cost is invisible without profiling. `-Xep:ConstantPatternCompile:ERROR` is the exact mechanical catch.
- **Reaching for PMD or Checkstyle as "the" Java linter because both are widely documented in older tutorials and Maven archetypes.** An agent asked to "add a lint gate to this Java project" is likely to `mvn` in `maven-pmd-plugin` or a stock `sun_checks.xml` because that's the median tutorial-era answer, missing that neither catches the bug classes Error Prone/NullAway target and that PMD specifically is enforced in 0/32 real flagship exemplars. Smallest check: any newly-added `maven-pmd-plugin` or `checkstyle` block that is not paired with an Error Prone/NullAway wiring in the same module is a signal to ask why.
- **Treating a Checkstyle pass or SpotBugs pass as equivalent rigor to a compiler-integrated check.** An agent that adds Checkstyle and calls the "lint gate" done has added a style pass, not a bug-catching one — it will not catch a null-dereference or a swallowed exception. Smallest check: does the build have an Error Prone/NullAway wiring anywhere; if not, "lint gate added" is an incomplete claim regardless of how many Checkstyle modules are enabled.

## Contested / evolving

- **`JSpecifyExperimental` defaulting to on.** NullAway's own wiki states intent to flip `JSpecifyExperimental` on by default "in a future release" — as of this writing (fetched 2026-09-12) it is still opt-in. A rule pinned to "explicitly set `JSpecifyExperimental=true`" should be revisited once that default flips, since the flag will then be a no-op to set explicitly and its absence will mean something different.
- **Whether `OnlyNullMarked` fully replaces `AnnotatedPackages` in practice.** The measured corpus shows only 2/32 (`junit-framework`, NullAway's own `jdk-javac-plugin`) on the JSpecify-native path; the overwhelming majority of NullAway users measured are still on package-prefix-based `AnnotatedPackages`. The direction is clear from NullAway's own documentation and JSpecify's 1.0 stability guarantee, but "most real NullAway configs today" and "the recommended new-project default" are currently two different answers — state both when advising.
- **SpotBugs's long-run relevance next to Error Prone.** SpotBugs operates on bytecode after compilation; Error Prone operates during compilation with richer source-level context and faster feedback. Several of SpotBugs' `CORRECTNESS`/`MT_CORRECTNESS` findings now have Error Prone equivalents. Whether SpotBugs (minus find-sec-bugs) still earns a place in a 2026 gate at all, versus being fully subsumed, is genuinely unsettled in the ecosystem; this research treats it as earning a place only via find-sec-bugs, which sidesteps rather than resolves the question for the non-security categories.
- **google_checks.xml as "the" modern default.** It is the more actively-maintained-feeling of the two shipped rulesets (records, text blocks, annotation-location checks) but Google's own internal style guide has continued to evolve past what's encoded in the shipped XML; treating `google_checks.xml` as current Google style, rather than "Google style circa when someone last updated the file," slightly overstates its authority.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [github.com/google/error-prone `BuiltInCheckerSuppliers.java`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | Primary source, the actual runtime enabled/disabled registration | fetched 2026-09-12, `master` | Ground truth for the 187/312/150 split; the docs site derives from but does not equal this |
| [errorprone.info/bugpatterns](https://errorprone.info/bugpatterns) and per-check pages (`/bugpattern/DefaultLocale`, `/CatchingUnchecked`, `/UnusedException`, `/ConstantPatternCompile`) | Primary, generated from `@BugPattern` annotations | fetched 2026-09-12 | Per-check severity, explanation, example code for the promoted checks |
| [github.com/uber/NullAway/wiki/Configuration](https://github.com/uber/NullAway/wiki/Configuration) | Primary, tool's own wiki | fetched 2026-09-12 | `AnnotatedPackages`/`OnlyNullMarked` mutual-exclusivity error text, full flag reference |
| [github.com/uber/NullAway/wiki/JSpecify-Support](https://github.com/uber/NullAway/wiki/JSpecify-Support) | Primary, tool's own wiki | fetched 2026-09-12 | JDK toolchain precondition, `IllegalStateException` exact text, `-XDaddTypeAnnotationsToSymbol` OpenJDK-only caveat |
| [docs.oracle.com javac(1), JDK 25](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html) | Primary, official spec | fetched 2026-09-12, JDK 25 era | Full, exact `-Xlint` key list and wording, including post-8 additions |
| [checkstyle/checkstyle `google_checks.xml`](https://github.com/checkstyle/checkstyle/blob/master/src/main/resources/google_checks.xml) / [`sun_checks.xml`](https://github.com/checkstyle/checkstyle/blob/master/src/main/resources/sun_checks.xml) | Primary, the shipped rulesets themselves | fetched 2026-09-12, `master` | Direct module counts (89 vs 73) and the symmetric-difference module lists, not a summary of them |
| [spotbugs/spotbugs `spotbugs/etc/messages.xml`](https://github.com/spotbugs/spotbugs/blob/master/spotbugs/etc/messages.xml) | Primary, machine-readable bug-pattern source | fetched 2026-09-12, `master` | 519 patterns, 10 categories including confirming `SECURITY`'s narrowness |
| [find-sec-bugs.github.io](https://find-sec-bugs.github.io/) and [GitHub README](https://github.com/find-sec-bugs/find-sec-bugs) | Primary, project's own site/repo | fetched 2026-09-12, v1.14.0 (Apr 2025) | Vulnerability-type count, SpotBugs-plugin integration model |
| [jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/) | Primary, project announcement | fetched 2026-09-12; JSpecify 1.0 released 2024-07-17 | Stability/compatibility guarantee for the four annotations |
| [plugins.gradle.org/plugin/net.ltgt.errorprone](https://plugins.gradle.org/plugin/net.ltgt.errorprone) | Primary, Gradle Plugin Portal listing | fetched 2026-09-12, v5.1.1 | Exact Kotlin DSL `plugins {}` syntax and current version |
| [plugins.gradle.org/plugin/net.ltgt.nullaway](https://plugins.gradle.org/plugin/net.ltgt.nullaway) | Primary, Gradle Plugin Portal listing | checked 2026-09-12, v3.2.0 (25 Aug 2026) | Current `net.ltgt.nullaway` plugin id and version, paired with `net.ltgt.errorprone` |
| `junit-team/junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:21-63` | Exemplar corpus, strictest pole | measured 2026-09-12 | Real strict Error Prone + NullAway JSpecify-native config with named reasons for every disable |
| `uber/NullAway@519a1bb826:build.gradle:84-113` | Exemplar corpus, tool's own dogfooding | measured 2026-09-12 | `-Werror` + 14 forced-`ERROR` checks; the tool author's own bar for its own code |
| `FasterXML/jackson-databind@a906e1782b:pom.xml:336-431` | Exemplar corpus, most lenient pole | measured 2026-09-12 | Opt-in Maven profile shape; 20 years of legacy-debt-driven `OFF` entries with reasons, contrasted against a green-field default |
| [`.agents/research/jvm-audit/exemplar-quality-gates.md`](../jvm-audit/exemplar-quality-gates.md) | This program's own prior audit | measured this program, 2026-09 | Corpus-wide gate adoption counts (Error Prone 13/32, NullAway 4/32, Checkstyle-wired 8/32, SpotBugs-as-gate 3/32, PMD-enforced 0/32) cited throughout |
| [`.agents/research/jvm-topic-map/codified-lint-catalogue.md`](../jvm-topic-map/codified-lint-catalogue.md) | This program's own prior survey | measured this program, 2026-09 | Corroborates the 187/312/150 and 89/73 counts from an independent parse; PMD/SpotBugs rule-count breakdowns |
| [`.agents/research/jvm-topic-map.md`](../jvm-topic-map.md) (Conflicts resolved #8, #9) | This program's binding decision record | 2026-09 | The gate-of-record and JSpecify-coexistence decisions this document must follow rather than re-litigate |

