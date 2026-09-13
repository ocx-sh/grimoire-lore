---
title: "Language: the surface the SDK publishes"
topic: language-api
model: opus
id_family: [JAVA-API, KT-API]
consolidates:
  - jvm-language-api/java-api-evolution-and-nullness.md
  - jvm-language-api/kotlin-api-and-abi.md
date: 2026-09-12
---

# Language: the surface the SDK publishes

Consolidates the two `language-api` dives of wave 2 into the ruleset a later
author works from. Families owned here: **JAVA-API** (map rows M-K-01..09,
M-M-01/05/07 where they concern the *published surface*, M-Y-01/03) and
**KT-API** (M-T-01..10). Nullness *tooling* mechanics (NullAway's
`AnnotatedPackages`/`onlyNullMarked` exclusivity, `JSpecifyMode`'s toolchain
floor, the Error Prone nullness `DISABLED_CHECKS` — M-M-02/03/04/06) stay with
`JAVA-NULL` in the lint-gate group; only the annotation contract on the public
API is taken here. Kotlin/Java interop idiom beyond binary compatibility
(`@JvmStatic`/`@JvmName`/`@Throws` placement, `suspend` across the Java
boundary, value-class mangling — M-V-01..08) stays with `KT-INTEROP`.

## Verdict

1. **The Java binary-compatibility gate is japicmp, bound to `check`/`verify`
   and upstream of every publish task.** There is no single Java equivalent of
   Kotlin's BCV ([gates](jvm-audit/exemplar-quality-gates.md) §5), and revapi —
   the better-designed tool — is **0/32** in the corpus. Binds: library, SDK.
2. **gradle/gradle is a japicmp adopter, not a bespoke-checker counter-example.**
   [gates](jvm-audit/exemplar-quality-gates.md) recorded its
   `build-logic/binary-compatibility/` as "a custom Groovy-based checker, not
   japicmp/revapi"; [java](jvm-language-api/java-api-evolution-and-nullness.md)
   §8 read the class and found `JapicmpTaskWithKotlin` **extends**
   `me.champeau.gradle.japicmp.JapicmpTask`. The bespoke part is the
   `ViolationRule` layer and the reviewed JSON allowlist — which is the shape
   to copy, not the alternative to japicmp.
3. **The accepted-breaks list is a reviewed file with a reason per entry, never
   a suppression flag.** `gradle__gradle@ea17004a31:testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json`
   is the only exemplar-grade template in the corpus. Binds: library, SDK.
4. **The OCX SDK ships `module-info.java`, not `Automatic-Module-Name`.** The
   `exports` list is the compiler-enforced statement of the public surface —
   the JVM analogue of `ocx-sdk-python`'s 116-name `__all__`
   ([cfg](jvm-audit/config-inventory.md) Axis 3, M-Y-04). Cost to a classpath
   consumer: none. Binds: SDK, library. Application and CLI: CONSIDER.
5. **JSpecify is the SDK's day-one nullness contract and an adopter's
   direction, declared once at `module-info.java`.** MUST for new published
   surface; SHOULD with a coexistence note for an existing one — jsr305 is
   still 13/32 against JSpecify's 9/32 ([map](jvm-topic-map.md) conflict 8).
   What is never acceptable is *mixing* flavours inside one file.
6. **Kotlin's ABI gate: run exactly one, and the choice is now a real choice.**
   The Kotlin dive decided "standalone BCV, `abiValidation{}` is 0/32". That
   measurement is **wrong** — see Conflict 1 below: `pinterest__ktlint` and
   `detekt__detekt` both run `abiValidation()` under
   `@OptIn(ExperimentalAbiValidation::class)`. Resolved: standalone BCV stays
   the default for a greenfield library that will not carry an Experimental
   opt-in; `abiValidation()` is equally defensible where the build already
   does. Running **neither** is the finding, and running both is a conflict.
7. **`explicitApi()` strict is a MUST for a greenfield published Kotlin module
   and a SHOULD for an existing surface** ([map](jvm-topic-map.md) conflict 17)
   — and its verification must grep three spellings across
   `**/*.gradle.kts`, `**/*.gradle` **and** `build-logic/**/*.kt`, because the
   two wave-1 greps each missed a live adopter (Conflict 2).
8. **Never expose a `data class`, and never add a parameter — defaulted or
   not — to a published Kotlin function.** Both are hard `NoSuchMethodError`
   breaks; `@JvmOverloads` fixes neither for Kotlin callers, and the only
   mechanism that does (`@IntroducedAt`) is Experimental. State the gap; do not
   name a solved mechanism. Binds: library, SDK, Gradle plugin.
9. **A `switch` over a sealed type this codebase owns carries no `default`.**
   The defensive-looking choice is the wrong one: `default` silently absorbs a
   new permitted subtype at every downstream call site, with no compiler
   diagnostic anywhere. Binds: library, SDK.
10. **Under the map's default (Java-first SDK with a Kotlin-friendly surface,
    [map](jvm-topic-map.md) conflict 14 / owner Q1), JAVA-API binds the SDK
    core and KT-API binds adopters plus any Kotlin module the SDK later
    ships.** If the owner flips to Kotlin-first, KT-API-01 and KT-API-03 become
    SDK MUSTs and JAVA-API-13's `module-info.java` loses its natural
    `@NullMarked` carrier — say so before the flip, not after.

## The ruleset

### JAVA-API

**Caught by: japicmp diffed against the last published coordinate**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-01 | Never change a published method's parameter type or return type in place — add an overload and leave the original signature untouched. | Widening a parameter and narrowing a return type both recompile cleanly and both are a delete+add at the bytecode level ([JLS SE25 §13.4.14/.15](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)); un-recompiled callers get `NoSuchMethodError`. | `japicmp` with `oldVersion` = the last Central-published coordinate; any binary-incompatible finding not in the allowlist fails the build. | MUST | JLS SE 25; japicmp-maven-plugin or `me.champeau.gradle.japicmp` |
| JAVA-API-02 | Bind the japicmp task to `check`/`verify` and make every publish task depend on it; accepted breaks live in a version-controlled allowlist with a reason string per entry — never a bare `skip`/`ignoreMissingClasses`. | Central is immutable (M-H-10): the only remedy after upload is a new version number, which is exactly the cost the gate exists to make deliberate. | `./gradlew :module:publish --dry-run` (or `mvn -X deploy`) shows the japicmp task ahead of the upload; `grep -n 'ignoreMissingClasses\|<skip>true' build.gradle.kts pom.xml` with no accompanying allowlist file is the smell. | MUST | — |
| JAVA-API-03 | A published interface never gains an abstract method without a `default` body; if the implementation set must stay closed, seal the interface instead. | Linkage survives ([JLS §13.5.3](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)) but invoking the new method on a pre-existing implementation throws `AbstractMethodError`, and direct implementers fail to compile — the java dive's table understated this as "no runtime effect". | japicmp reports the added interface method; grep the diff for a new non-`default` member on any `public interface`. | MUST | Java 8+ (`default` methods) |
| JAVA-API-04 | Never change the value of a published `public static final` constant. | Callers keep the *old inlined value* until recompiled ([JLS §13.4.9](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)) — no `LinkageError`, no diagnostic, a silently wrong answer. The most dangerous row in the table because nothing signals it. | japicmp's report lists the field change; treat it as breaking even though it is classified binary-compatible. | SHOULD | — |

**Caught by: `javac -Xlint`**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-05 | Every `@Deprecated` element carries `since = "<version>"` and a Javadoc `@deprecated` tag — both present or both absent — and `forRemoval = true` appears only when the Javadoc body already names the removal version. Omit `forRemoval` for an ordinary deprecation. | [JEP 277](https://openjdk.org/jeps/277) calls the tag/annotation mismatch "a mistake" and gates `forRemoval` on "a clear and definite plan for removing that API". It is not a synonym for "we would like to remove this eventually". | `javac -Xlint:dep-ann,deprecation,removal -Werror` catches the tag-without-annotation half only; `grep -n '@Deprecated' -A2 src/**/*.java \| grep -v 'since'` for the other half — no compiler check exists for annotation-without-tag. | MUST | JDK 9+ |
| JAVA-API-06 | `Optional` is a return type only — never a field, a constructor parameter or a method parameter — and a public method returns an empty collection, never `null`, for "no result". | Goetz's stated design intent; still among the most commonly violated API rules in 2024-25 retrospectives ([prac](jvm-topic-map/practitioner-and-conferences.md), Effective Java Items 54/55). | `grep -nE 'Optional<[^>]*>\s+\w+\s*[;,)]' src/**/*.java` for the field/parameter shape (empty output is the pass); NullAway flags the null-return once the surface is `@NullMarked`. | SHOULD | — |

**Caught by: sealed-hierarchy review — no mechanical gate exists on the producer side**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-07 | A `switch` over a sealed type this codebase owns carries no `default` label and no catch-all type pattern. | [JEP 441](https://openjdk.org/jeps/441) proves exhaustiveness from the `permits` clause, so omitting `default` makes the compiler force every call site to be revisited when a subtype is added. With `default`, the new subtype is silently absorbed — no compile error, no runtime signal, frequently wrong behaviour. | Grep every `switch` whose selector type is declared `sealed` in this repo for `default` or an unconditional type pattern; Error Prone `UnnecessaryDefaultInEnumSwitch` (shipped in `DISABLED_CHECKS` — must be explicitly enabled) covers the enum half. | MUST | JDK 17 (JEP 409) / JDK 21 (JEP 441) |
| JAVA-API-08 | Classify "adding a permitted subtype" once, in a written compatibility policy (MINOR or MAJOR), rather than per PR. | It is source-breaking for exhaustive consumers and a silent semantic change for defensive ones — the producer's own build reports neither (M-K-06). | The PR that adds a `permits` entry must cite the policy; no mechanical check exists, because the entire effect is on the consumer's side. | SHOULD | — |

**Caught by: NullAway in JSpecify mode, plus an import grep**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-09 | Annotate the published surface with JSpecify and declare `@NullMarked` once in `module-info.java`. | `@NullMarked` at module scope cascades to every package the module declares; at *package* scope it does **not** cascade to subpackages ([jspecify.dev/docs/user-guide](https://jspecify.dev/docs/user-guide/)), so per-package declaration is 1:1 maintenance forever. JSpecify's four annotations are frozen for life ([1.0.0 release](https://jspecify.dev/blog/release-1.0.0/)), and Kotlin 2.1.0+ reports JSpecify violations as compile **errors** by default — the strict boundary jsr305's warn-only default never reached. | `grep -c '@NullMarked' src/main/java/module-info.java` = 1; NullAway configured `onlyNullMarked = true` + `jspecifyMode = true` (the `junit-framework` shape). | MUST (SDK, new published surface) / SHOULD (existing surface, with a migration note) | JSpecify 1.0.0; NullAway 0.12.3+; Kotlin 2.1.0+ on the caller side |
| JAVA-API-10 | Never mix nullness flavours in one file: no `javax.annotation`, `org.checkerframework`, `androidx.annotation` or JetBrains `@Nullable` in a file that imports `org.jspecify`. Migrate a package; do not layer. | Four incompatible systems are live in the corpus simultaneously ([gates](jvm-audit/exemplar-quality-gates.md) headline 3). They have different retention, different defaults and different Kotlin severity — a mixed file means nobody can state what the contract is. | `grep -rl 'org.jspecify' src \| xargs grep -n 'javax.annotation.Nullable\|org.checkerframework\|androidx.annotation\|org.jetbrains.annotations'` — empty output is the pass. | MUST | — |
| JAVA-API-11 | JSpecify annotations are `TYPE_USE`: write `Type @Nullable []` for a nullable array and `<T extends @Nullable Object>` for a type parameter that may be instantiated with a nullable type. | `@Nullable Object[]` means "array of nullable Object", the opposite of the usual intent, and a bare `<T>` under `@NullMarked` cannot be instantiated nullable at all ([jspecify.dev/docs/using](https://jspecify.dev/docs/using/)). Both compile either way. | `grep -nE '@Nullable +\w+(<[^>]*>)?\[\]' src/**/*.java` — a hit is a misplacement; NullAway's `jspecifyMode` flags the generic-bound case at compile time. | MUST | JSpecify 1.0.0 |

**Caught by: build-file and module-descriptor grep**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-12 | Ship `module-info.java` whose `exports` lists exactly the public packages. `Automatic-Module-Name` gives a stable module *name* and none of the encapsulation — it is not a substitute. | `exports` is the compiler-enforced statement of the public surface, the JVM analogue of `ocx-sdk-python`'s 116-name `__all__` ([cfg](jvm-audit/config-inventory.md) Axis 3). Cost to a classpath consumer is zero — the descriptor is inert off the module path. Where the base build targets Java 8, isolate the descriptor in an MR-JAR `META-INF/versions/9/` layer, as guava does. | `find . -name module-info.java` non-empty; diff its `exports` list against the Javadoc-generated public-package list. | MUST (SDK, library) / CONSIDER (application, CLI) | JDK 9+ |
| JAVA-API-13 | Compile with `--release` / `options.release`, never the `source`/`target` pair. | The pair does not check against the target platform's API, so a Java-8-targeted build silently links Java 9+ APIs; `--release` does. Separates the toolchain floor from the bytecode target ([frame](jvm-frame.md) correction 10). | `grep -n '<source>\|<target>\|sourceCompatibility\|targetCompatibility' pom.xml build.gradle.kts` — empty output is the pass. | MUST | JDK 9+ |

**Caught by: diff against the fleet's pinned prior art**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| JAVA-API-14 | Reproduce the 16-member sysexit table as an enum plus an exception hierarchy, mapping exit code → exception; never parse stderr text. | A pinned project decision, not a derivable rule: `ocx-sdk-python/src/ocx_sdk/_errors.py:28-46` and `rules_ocx/AGENTS.md:161-178` already agree byte-for-byte ([cfg](jvm-audit/config-inventory.md) Axis 3/4, M-Y-01). | Diff the enum's members against those two files; any divergence is a finding. | MUST (SDK, Gradle plugin) | — |
| JAVA-API-15 | Hold the zero-runtime-dependency commitment: `java.net.http` plus a hand-rolled reader over the CLI's `--format json`. JSpecify is `compileOnly`/`provided` (CLASS retention), so it does not break the commitment. | Carried forward from `ocx-sdk-python` ([cfg](jvm-audit/config-inventory.md) smell 5); it is reachable in Java and *not* in idiomatic Kotlin the moment `kotlinx.serialization` or `kotlinx.coroutines` enters — which is half of owner Q1. | The published POM's runtime-scope `<dependencies>` is empty; `./gradlew :sdk:dependencies --configuration runtimeClasspath` shows no entries. | MUST (SDK) | — |

### KT-API

**Caught by: `compileKotlin` — explicit API mode is a compiler error, not a lint task**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| KT-API-01 | Enable explicit API **strict** mode on every published module. `explicitApiWarning()` / `ExplicitApiMode.Warning` does not count — it produces warnings, not a failed build. | Strict mode makes "always specify visibility" and "always specify return and property types" — two of kotlinlang's three library rules — compile errors rather than review-time catches ([coding-conventions](https://kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries), [whatsnew14](https://kotlinlang.org/docs/whatsnew14.html)). | `grep -rnE 'explicitApi\s*\(\|ExplicitApiMode\.Strict\|-Xexplicit-api=strict' --include='*.gradle.kts' --include='*.gradle' --include='build-logic/**/*.kt' .` — all three spellings, and **including `.kt` convention-plugin sources**, or the check misses live adopters (Conflict 2). Absence on a module applying `maven-publish` is the finding. | MUST (greenfield published module) / SHOULD (existing published surface) | Kotlin 1.4+; K2 throughout the corpus |
| KT-API-02 | KDoc every public member except overrides that add no documentation. | The third of kotlinlang's three library rules, and the only one with no compiler enforcement — an asymmetry the rule must state rather than paper over. | `./gradlew dokkaGeneratePublicationHtml` with `dokka { dokkaPublications.configureEach { failOnWarning = true } }` — the shape `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/public-api.gradle.kts:7-9` already ships. | SHOULD | Dokka 2.x (K2-stable ≥ 2.2.0) |

**Caught by: `apiCheck` / `checkKotlinAbi` against the committed `.api` dump**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| KT-API-03 | Run exactly one ABI gate, with its `.api` dump committed and its check task wired into `check`. Default to the standalone `org.jetbrains.kotlinx.binary-compatibility-validator` (`apiDump`/`apiCheck`); the in-KGP `abiValidation()` (`updateKotlinAbi`/`checkKotlinAbi`) is equally defensible where the build already carries `@OptIn(ExperimentalAbiValidation::class)`. | Standalone is maintenance-mode but needs no Experimental opt-in and has 5 working corpus exemplars; `abiValidation()` is the stated direction and now has 2 (Conflict 1). Running neither is the real failure — the dump file is the only artefact that makes a descriptor change visible in a diff. | `grep -rn 'binary-compatibility-validator\|abiValidation' --include='*.gradle.kts' --include='build-logic/**/*.kt' .` returns exactly one family; `api/*.api` (or the KGP dump dir) exists and is non-empty; `./gradlew :module:check --dry-run` lists `apiCheck` or `checkKotlinAbi`. | MUST (published module) | BCV 0.18.x (Gradle ≥ 6.1.1, Kotlin ≥ 1.6.20) or Kotlin ≥ 2.2.0 for `abiValidation()` |
| KT-API-04 | Never add a parameter to a published function — a default value does not help — and never widen *or* narrow a published return type. | Both change the JVM descriptor; the call site is bound to the exact old descriptor and gets `NoSuchMethodError`. Narrowing is the counter-intuitive half: it preserves source compatibility, which is exactly why it looks safe in a diff ([backward-compatibility](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)). | `apiCheck` / `checkKotlinAbi` — any descriptor change on an existing entry is a break. | MUST | — |
| KT-API-05 | Never expose a `data class` in a published public API. | Adding one property changes the primary constructor *and* `copy()` simultaneously; reordering additionally changes every `componentN()`. None of that surface is optional to keep stable. Where a public value type is needed: a plain `class` with explicit `equals`/`hashCode`, or a `value class` for a single-field wrapper. | `grep -rnE '^\s*(public )?data class' src/main` scoped to published modules — a hit is a finding regardless of how small the class looks. | MUST | — |
| KT-API-06 | Review every `@PublishedApi internal` declaration under the same binary-compatibility checklist as a `public` one. | Its body is inlined into every compiled caller of the `public inline` function that references it, so a "harmless internal refactor" breaks already-compiled consumers. BCV's own "effectively public" definition already includes it. | `grep -rn '@PublishedApi' src/main`; `apiCheck` covers the signature half automatically, the *body* change is a reading heuristic on the diff. | MUST | — |
| KT-API-07 | Do not rely on `@JvmOverloads` to preserve binary compatibility when adding a default-valued parameter — it generates Java-visible overloads only. `@IntroducedAt` under `@OptIn(ExperimentalVersionOverloading::class)` is the only mechanism that covers Kotlin callers too, and it is Experimental. | There is no stable, non-experimental full fix today; hand-written overloads are the only stable alternative. A rule that names `@JvmOverloads` as the fix is wrong, and one that names `@IntroducedAt` without the Experimental caveat is premature. | `apiCheck` still reports a changed descriptor on the base function despite the annotation — the dump records the descriptor, not the annotation. | SHOULD | Kotlin 2.2+ for `@IntroducedAt` (Experimental) |

**Caught by: reading the diff — no mechanical gate**

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| KT-API-08 | Propagate an `@RequiresOptIn` marker through every public signature that mentions the marked type; do not absorb it with `@OptIn` on a public declaration. `@SubclassOptInRequired` is the separate extend-only case and does not inherit into nested classes. | Opt-in is not transitive: an un-propagated marker means callers depend on unstable API without ever opting in ([opt-in-requirements](https://kotlinlang.org/docs/opt-in-requirements.html)). | `grep -rn '@OptIn(' src/main`, cross-referenced against each marker's `@RequiresOptIn` declaration; a public declaration absorbing a marker needs a comment saying it is the deliberate safe-wrapper case. | MUST | — |
| KT-API-09 | Retire a shipped declaration with `@Deprecated(message, replaceWith, level)` walking WARNING → ERROR → HIDDEN → removal, one release per step. Never re-mark it `@RequiresOptIn`. | `@RequiresOptIn` says "not yet stable", which is a false statement about something already shipped as stable; kotlinlang names this exact misuse (M-T-10). Only the deprecation cycle keeps binary compatibility across each intermediate release. | A newly added `@RequiresOptIn` on a declaration that exists unmarked in a prior tag is the finding: `git log -S'@RequiresOptIn' -- <file>` against the release tags. | MUST | — |
| KT-API-10 | No bare `Boolean` parameter in a public constructor or top-level function — split into differently named functions, or use an `enum class`. Exempt: a fluent single-setter whose own name carries the meaning (`.followRedirects(true)`). | `doWork(true)` carries no intent at the call site ([readability](https://kotlinlang.org/docs/api-guidelines-readability.html)). Stated as SHOULD-with-a-carve-out rather than MUST because the dive itself carved one out (Conflict 5) — a MUST with an exception is not a MUST. | Reading heuristic over public signatures; a custom detekt rule scanning public function parameter types for `Boolean` is the mechanisable form. | SHOULD | — |
| KT-API-11 | Do not add an `AnnotationTarget` to a published `@Target` set without checking for Java-reflection consumers. | Kotlin prefers `PROPERTY` over `FIELD` when a member can carry either, so adding `PROPERTY` silently moves the annotation off the backing field and `Field.getAnnotation()` starts returning `null` — no compile error, no `NoSuchMethodError`, no `.api` diff (BCV does not track annotation target sets). | Reading heuristic on any diff touching `@Target(...)` of a published annotation class. | CONSIDER | — |

## Applied to the exemplars and the two future consumers

**Already satisfied by the strict exemplars**

| Rule | Exemplar |
|---|---|
| JAVA-API-01/02 (japicmp before publish) | `apache__kafka@940c100fab` (`api-checker/` custom japicmp wrapper module); `gradle__gradle@ea17004a31:build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java` (extends `me.champeau.gradle.japicmp.JapicmpTask`) |
| JAVA-API-02 (reviewed allowlist with a reason per entry) | `gradle__gradle@ea17004a31:testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json` — each entry names the member, the change type and an `"acceptation"` reason |
| JAVA-API-09 (JSpecify-native NullAway) | `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.java-errorprone-conventions.gradle.kts:52-63` — `onlyNullMarked = true`, `jspecifyMode = true`, `checkContracts = true`; `uber__NullAway@519a1bb826:build.gradle:84-113` is the same shape with `-Werror` |
| JAVA-API-12 (`module-info.java`) | `junit-team__junit-framework@35c56a8e02` (19 files), `square__okhttp@dfcfab3824` (15), `Kotlin__kotlinx.coroutines@f63a04bacb` (15), `gradle__gradle@ea17004a31` (11) — 12/32 repos, 79 files ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) headline 10) |
| KT-API-01 (explicit API strict) | `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/configure-compilation-conventions.gradle.kts:19` (`-Xexplicit-api=strict`); `pinterest__ktlint@4c933394a3:build-logic/src/main/kotlin/KotlinCommonPlugin.kt:36` — `explicitApi()` on **every** module, the CLI included |
| KT-API-02 (Dokka gate) | `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/public-api.gradle.kts:5-9` — `failOnWarning = true` on every Dokka publication |
| KT-API-03 (one ABI gate, dumps committed) | Standalone BCV: `apollographql__apollo-kotlin@c145295b72` (28 `.api` files), `JetBrains__Exposed@4be9aee04c` (21), `square__okhttp@dfcfab3824` (13), `cashapp__sqldelight@4580923af3` (9), `google__dagger@4fbc045d2b` (6). KGP `abiValidation()`: `pinterest__ktlint@4c933394a3:build-logic/src/main/kotlin/KotlinCommonPlugin.kt:38-39` (17 `.api` files), `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/public-api.gradle.kts:13-14` (8 `.api` files) |

**Violated by prominent exemplars**

| Rule | Violation |
|---|---|
| JAVA-API-12 | `grpc__grpc-java@fc4314419d` — zero `module-info.java` anywhere in the tree; `Automatic-Module-Name` set in **28** separate `build.gradle` files instead, with `options.release = 8`. A pure stable-name shop with none of the `exports` enforcement. |
| JAVA-API-13 | `google__guava@5fb424c43a:guava/pom.xml:118` — the deprecated `<source>1.8</source><target>1.8</target>` pair for the base classes, with `<release>9</release>` used only for the MR-JAR `module-info` layer. The module-info half is exemplary; the compile-flag half is the violation. |
| KT-API-01 | `ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11` — `explicitApi = null` per module, i.e. opt-in rather than repo-default. 26/32 corpus repos run no explicit API mode at all ([gates](jvm-audit/exemplar-quality-gates.md) §1, corrected in Conflict 2). |
| KT-API-01 | `square__okhttp@dfcfab3824` — explicit API mode on the `mockwebserver` module only, not on the published `okhttp` module itself ([gates](jvm-audit/exemplar-quality-gates.md) §1). |
| JAVA-API-01/02 | 25/32 exemplars carry **no confirmed build-blocking binary-compatibility gate**, and 6 of the japicmp hits (`apache/maven`, `assertj`, `gradle/gradle`, `grpc-java`, `micronaut-core`, `testcontainers-java`) are declared-but-not-confirmed-blocking within the checked-out slice ([gates](jvm-audit/exemplar-quality-gates.md) §5). |
| JAVA-API-09/10 | jsr305 is declared in **13/32** and checker-framework in 8/32, against JSpecify's 9/32, with only 2/32 using NullAway's JSpecify-native mode ([gates](jvm-audit/exemplar-quality-gates.md) headline 3). The rule states the direction, not the installed base. |

**New commitments — no exemplar to inherit them from**

- **OCX SDK**: JAVA-API-02 (japicmp gate ahead of publish, allowlist with reasons), JAVA-API-08 (a written sealed-hierarchy compatibility policy — no corpus exemplar states one), JAVA-API-09 at module scope, JAVA-API-12 (`module-info.java` as the `__all__` analogue), JAVA-API-14 (16-member sysexit enum diffed against the two prior-art sources), JAVA-API-15 (zero runtime dependencies). All six are impositions this program makes, not norms it codifies.
- **OCX Gradle plugin**: JAVA-API-14 (the same sysexit table, surfaced as typed `GradleException` subclasses with sysexit 75 retried before failing — [cfg](jvm-audit/config-inventory.md) Axis 4), plus KT-API-01/03 if the plugin's own public extension API is written in Kotlin, which is the corpus default for a Gradle plugin. Its configuration-cache obligations (M-Y-05) belong to `GRADLE-PLUG`, not here.

## AI-agent failure modes

Ranked by how often it bites, with the check that catches it.

1. **"Widen the parameter, it's more flexible."** An agent optimising ergonomics changes the existing signature in place (`int`→`long`, `List<T>`→`Collection<T>`) because from a source-only view it is strictly more permissive. *Check:* japicmp on every PR touching a public signature, not only on release branches (JAVA-API-01).
2. **`data class` for anything that returns structured data.** It is the idiomatic Kotlin default an LLM was trained on. *Check:* `grep -rnE '^\s*(public )?data class' src/main` on any published module (KT-API-05).
3. **Vendor `@Nullable` habit.** Told "add null-safety annotations", an agent reaches for `javax.annotation.Nullable` — runtime-retained, warn-only in Kotlin — instead of `org.jspecify.annotations.Nullable`, and often mixes both in one file. *Check:* the JAVA-API-10 cross-import grep.
4. **Bare `@Deprecated` with no `since` and no Javadoc tag.** Pre-2017 idiom dominates training data. *Check:* `javac -Xlint:dep-ann,deprecation,removal -Werror` plus the `since` grep (JAVA-API-05).
5. **`default: throw new IllegalStateException()` on a sealed switch.** It *looks* more defensive and is exactly backwards for a published hierarchy — it disables the one compiler signal the design exists to produce. *Check:* JAVA-API-07's grep; flag for review, never auto-accept.
6. **`@JvmOverloads` believed to "fix" binary compatibility for a default-parameter addition.** Java-interop tutorials dominate the training signal. *Check:* `apiCheck` still reports the changed descriptor (KT-API-07).
7. **`@Nullable Type[]` written for a nullable array.** Pre-`TYPE_USE` Java only had that form. *Check:* `grep -nE '@Nullable +\w+(<[^>]*>)?\[\]'` (JAVA-API-11).
8. **`Automatic-Module-Name` offered as "JPMS support".** One manifest line, nothing to get wrong, and none of the `exports` enforcement. *Check:* if the ask was encapsulation, `find . -name module-info.java` must return a hit (JAVA-API-12).
9. **A familiar linter named as the compatibility gate.** Checkstyle/SpotBugs/PMD diff nothing; an agent conflates "static analysis" with "compatibility checking". *Check:* the gate task must literally be a japicmp/BCV/`abiValidation` task id — grep the CI workflow for the plugin id, not for a job named "quality" (JAVA-API-02, KT-API-03).
10. **`explicitApiWarning()` generated when "strict" was asked for.** Only `explicitApi()` / `ExplicitApiMode.Strict` / `-Xexplicit-api=strict` fails the build. *Check:* `grep -rn 'explicitApiWarning\|ExplicitApiMode\.Warning'` on a module that is supposed to be gated (KT-API-01).
11. **`@RequiresOptIn` used as a soft `@Deprecated`.** It inverts the semantics — "not yet stable" about something already shipped. *Check:* a new `@RequiresOptIn` on a declaration present unmarked in a prior tag (KT-API-09).
12. **`abiValidation` emitted without the `@OptIn` import.** The build does not compile; and even fixed, it is an unreviewed Experimental adoption. *Check:* any generated `abiValidation` call must carry `@OptIn(ExperimentalAbiValidation::class)` (KT-API-03).

## Open questions

**Owner decisions**

- **Q1 stands: Java-first or Kotlin-first for the OCX SDK.** Nothing in this round changes the map's default (Java-first with a Kotlin-friendly surface) or its three premises. What this round adds: JAVA-API-15's zero-dependency commitment survives only under Java-first, and `module-info.java` (JAVA-API-12) is the natural `@NullMarked` carrier that a Kotlin-first SDK gives up.
- **Whether the OCX SDK carries an Experimental opt-in in its build.** KT-API-03's default (standalone BCV) exists to avoid `@OptIn(ExperimentalAbiValidation::class)`. Two flagship lint tools decided the other way. If the owner is comfortable with the opt-in, `abiValidation()` is the shorter path and the one JetBrains is steering to.
- **Where a sealed-hierarchy compatibility policy lives** — Javadoc, a changelog convention, or a machine-readable annotation. No JEP and no corpus exemplar prescribes a mechanism; JAVA-API-08 states the requirement without picking a format.

**Needs another research round**

- **Source-level public-API measurement (JAVA-API, KT-API).** Every wave-1 audit measured *config files only*. Nobody has grepped the corpus' `.java`/`.kt` sources for `public data class`, `Optional` in parameter position, `@Deprecated` without `since`, misplaced `@Nullable` array annotations, or `default` on a sealed switch. Question: **which of JAVA-API-04..11 and KT-API-04..11 do the strict exemplars actually satisfy in source, as opposed to in build configuration?** Six of this ruleset's rows are currently "not independently measured" in both dives. Budget: `git show HEAD:<path>` across the ~8 strictest repos, not all 32.
- **japicmp configuration depth (JAVA-API).** Question: **are the six "declared" japicmp repos actually build-blocking, and what does an accepted-breaks file look like outside gradle/gradle's Groovy scaffolding?** JAVA-API-02 currently has exactly one template, and it is wrapped in machinery no adopter will copy.
- **revapi revisit (JAVA-API).** Question: **has revapi acquired any adopter or a maintained Gradle plugin since 0.15.1?** The decision for japicmp rests entirely on 0/32 adoption, not on design; if that changes the decision should be re-taken rather than inherited.

## Sub-artifacts

- [jvm-language-api/java-api-evolution-and-nullness.md](jvm-language-api/java-api-evolution-and-nullness.md) — JLS ch.13 binary-vs-source compatibility table, JEP 277 deprecation mechanics, sealed-hierarchy downstream absorption, JSpecify placement and its Kotlin-caller effect, JPMS `module-info` vs `Automatic-Module-Name`, and the japicmp/revapi/Animal-Sniffer decision.
- [jvm-language-api/kotlin-api-and-abi.md](jvm-language-api/kotlin-api-and-abi.md) — explicit API mode, the three-rule library checklist, exact `NoSuchMethodError` bytecode consequences for default parameters / return-type variance / `data class` growth, `@PublishedApi`, opt-in propagation, the sanctioned deprecation cycle, and the standalone-BCV-vs-`abiValidation{}` decision.

## Key sources

| URL | Why |
|---|---|
| [docs.oracle.com/javase/specs/jls/se25/html/jls-13.html](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | Normative source for every binary-vs-source compatibility claim (JAVA-API-01/03/04) |
| [openjdk.org/jeps/277](https://openjdk.org/jeps/277) | Exact wording on `forRemoval`/`since`/Javadoc-tag pairing (JAVA-API-05) |
| [openjdk.org/jeps/409](https://openjdk.org/jeps/409) | `permits` clause and sealed-hierarchy exhaustiveness (JAVA-API-07) |
| [openjdk.org/jeps/441](https://openjdk.org/jeps/441) | Pattern-switch exhaustiveness checking and its backward-compatibility promise (JAVA-API-07) |
| [jspecify.dev/docs/user-guide](https://jspecify.dev/docs/user-guide/) | `@NullMarked` scope semantics and its non-hierarchical package scoping (JAVA-API-09) |
| [jspecify.dev/docs/using](https://jspecify.dev/docs/using/) | Array and generic-bound placement gotchas (JAVA-API-11) |
| [jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/) | The "never backwards-incompatible" stability guarantee, verbatim |
| [kotlinlang.org/docs/java-interop.html](https://kotlinlang.org/docs/java-interop.html) | Platform types, the JSpecify compiler-support version table, strict-by-default since Kotlin 2.1.0 |
| [siom79.github.io/japicmp](https://siom79.github.io/japicmp/) | The chosen Java compatibility gate: configuration model and JLS-based classification |
| [mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin](https://www.mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin/) | Confirms Animal Sniffer is a target-platform signature check, not a version diff — why 6/32 adoption is not a compatibility gate |
| [kotlinlang.org/docs/api-guidelines-backward-compatibility.html](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html) | Every Kotlin bytecode-consequence claim, with the printed `NoSuchMethodError` signatures (KT-API-04..07) |
| [kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries](https://kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries) | The verbatim three-rule library checklist (KT-API-01/02) |
| [kotlinlang.org/docs/opt-in-requirements.html](https://kotlinlang.org/docs/opt-in-requirements.html) | Opt-in propagation, `@SubclassOptInRequired`, and the "do not use to deprecate" guidance (KT-API-08/09) |
| [kotlinlang.org/docs/gradle-binary-compatibility-validation.html](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html) | `abiValidation{}` DSL, `ExperimentalAbiValidation`, `updateKotlinAbi`/`checkKotlinAbi` (KT-API-03) |
| [github.com/Kotlin/binary-compatibility-validator](https://github.com/Kotlin/binary-compatibility-validator/blob/master/README.md) | The maintenance-mode notice, `apiDump`/`apiCheck`, and the "effectively public" definition that includes `@PublishedApi` |
| [youtrack.jetbrains.com/issue/KT-71172](https://youtrack.jetbrains.com/issue/KT-71172/Stabilize-ABI-Validation-in-Kotlin-Gradle-Plugin) | Confirms `abiValidation{}` is still pre-stabilisation and under active development |
| [github.com/gradle/gradle — accepted-public-api-changes.json](https://github.com/gradle/gradle/blob/master/testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json) | The only exemplar-grade accepted-breaks allowlist in the corpus (JAVA-API-02) |

## Conflicts resolved

**1. `abiValidation{}` is not 0/32 — it is 2/32, and both adopters were mis-filed as "BCV wiring not locatable".**
[kotlin](jvm-language-api/kotlin-api-and-abi.md) §9 built its decision partly on "there is no live counter-example to learn a working `abiValidation{}` setup from", citing [gates](jvm-audit/exemplar-quality-gates.md) §1's flagged-not-claimed note that ktlint (17 `.api` files) and detekt (8) carry dumps with no locatable plugin application. Re-measured this session by fetching the build-logic sources the sparse checkout did not materialise:
`pinterest__ktlint@4c933394a3:build-logic/src/main/kotlin/KotlinCommonPlugin.kt:38-39` and
`detekt__detekt@45672efb8b:build-logic/src/main/kotlin/public-api.gradle.kts:13-14` both call `abiValidation()` under `@OptIn(ExperimentalAbiValidation::class)`. **Resolved on direct measurement (a fetched file beats an inference from a sparse listing):** the corpus is 5 standalone / 2 KGP, not 5/0, and ktlint/detekt are ABI-gated, not unwired. The *decision* survives — standalone still needs no Experimental opt-in — but its second rationale is withdrawn, and KT-API-03 is written as "run exactly one, here is the default and here is when the other is right" rather than as a prohibition.

**2. The explicit-API-mode adopter set: two wave-1 greps, two different answers, and both were low.**
[shape](jvm-audit/exemplar-build-shape.md) §"Kotlin compiler flags" reports 5/25 — dagger, shadow, ktor, ktlint, okhttp. [gates](jvm-audit/exemplar-quality-gates.md) §1 reports 5/32 — dagger, shadow, kotlinx.coroutines, ktor, okhttp. The sets differ by two repos. **Resolved by identifying what each grep missed:** shape matched `explicitApi()`/`ExplicitApiMode` and so missed kotlinx.coroutines' compiler-flag form (`-Xexplicit-api=strict`); gates missed ktlint because its call lives in a Kotlin convention-plugin *class* (`build-logic/src/main/kotlin/KotlinCommonPlugin.kt:36`), not in a `.gradle.kts` file — verified this session, and detekt confirmed as a genuine non-adopter. The union is **6/32**. The consequence is not the count but the check: KT-API-01's verification greps three spellings across `*.gradle.kts`, `*.gradle` **and** `build-logic/**/*.kt`, or it repeats both misses.

**3. gradle/gradle's binary-compatibility mechanism: bespoke checker, or japicmp?**
[gates](jvm-audit/exemplar-quality-gates.md) §5 lists it as "a custom Groovy-based checker … not japicmp/revapi", inferred from the file names in `build-logic/binary-compatibility/`. [java](jvm-language-api/java-api-evolution-and-nullness.md) §8 read the class: `JapicmpTaskWithKotlin` **extends** `me.champeau.gradle.japicmp.JapicmpTask`. **Resolved for the dive (source read beats filename inference).** Consequence: japicmp's real corpus footprint includes the flagship build tool, which strengthens JAVA-API-01/02 from "a tool 1 repo confirmedly runs" to "the mechanism the corpus converges on when it gates at all"; and the genuinely bespoke part — the `ViolationRule` layer plus the reasoned JSON allowlist — is a *pattern* to copy on top of japicmp, not a competing tool.

**4. "Every `@Deprecated` carries `forRemoval` and `since`" (M-K-02) versus "`forRemoval=true` only with a definite plan" (JEP 277).**
The map row and the java dive's candidates 2 and 3 pull opposite ways: candidate 2 asks for `forRemoval` on every deprecation, candidate 3 forbids it as a default posture. **Resolved on the normative source:** `since` is unconditional; `forRemoval` is a boolean defaulting to `false`, so *omitting* it is the correct spelling of an ordinary deprecation, and `forRemoval = true` requires a removal version already named in the Javadoc body. Merged into one rule (JAVA-API-05) so the two halves cannot drift apart again.

**5. "Adding an abstract method to an interface … no runtime effect for callers."**
[java](jvm-language-api/java-api-evolution-and-nullness.md) §1's table marks this binary-compatible with "no runtime effect for callers". **Resolved against [JLS §13.5.3](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html):** linkage survives, but invoking the new method on a pre-existing implementation throws `AbstractMethodError` at runtime. The row is not wrong about linkage and is misleading about consequence — which is exactly why JAVA-API-03 is a MUST requiring a `default` body rather than a note in the compatibility table.

**6. "Never take a bare `Boolean`" (kotlin dive candidate 3) versus the same dive's §8 carve-out for a fluent single-setter.**
**Resolved toward the carve-out, and the severity follows it:** KT-API-10 is a SHOULD with the exception named. A MUST that ships with a documented exception trains an agent to treat every MUST as negotiable.

**7. japicmp versus revapi for a greenfield 2026 SDK.**
revapi's design is better suited (pluggable analyzers, first-class intentional-change marking) and its adoption is **0/32**. **Resolved on measured practice over design:** japicmp, with the cost stated — one plugin, one `oldVersion` coordinate to bump per release, and an allowlist to maintain — and the decision flagged for re-taking (Open questions) rather than treated as settled forever.

**8. JSpecify's normative direction versus its installed base** ([map](jvm-topic-map.md) conflict 8, applied here).
**Resolved as a severity split rather than a single verdict:** MUST for new published surface and for the OCX SDK, SHOULD with a coexistence note for an existing one — and the non-negotiable half, MUST at every severity, is JAVA-API-10: never mix flavours inside one file. A bare "use JSpecify" would contradict 13/32 of the corpus; "do not mix" contradicts none of it.
