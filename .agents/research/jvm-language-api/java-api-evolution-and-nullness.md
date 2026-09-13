---
title: "Java public API evolution and nullness: the OCX SDK's surface"
topic: java-api-evolution-and-nullness
agent: jvm-language-api-scout
model: sonnet
date_researched: 2026-09-12
sources_count: 17
scope: >
  Covers: JLS ch.13 binary-compatibility rules for a published Java library's
  public surface; JEP 277 deprecation mechanics; sealed-hierarchy exhaustiveness
  and its cross-consumer trap; Data-Oriented Programming v1.1; the JSpecify
  annotation set and its Kotlin-caller effect; JPMS module-info vs
  Automatic-Module-Name; and a decision among japicmp, revapi, Animal Sniffer
  and a bespoke accepted-changes allowlist for the OCX SDK's compatibility gate.
  Does not cover: Kotlin-side binary compatibility or BCV (owned by
  kotlin-quality), Gradle plugin publishing mechanics (owned by gradle-build),
  general Java lint/Error-Prone catalogue (owned by java-quality/lint-gate),
  or JPMS runtime concerns beyond the module-info authoring decision (`jlink`,
  service loading depth) which M-Q rows other than M-Q-01/M-Q-02 own.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Binary vs. source compatibility (JLS ch.13)](#1-binary-vs-source-compatibility-jls-ch13)
   2. [JEP 277: deprecation with intent](#2-jep-277-deprecation-with-intent)
   3. [Sealed hierarchies and the downstream-`default`-absorption trap](#3-sealed-hierarchies-and-the-downstream-default-absorption-trap)
   4. [Pattern matching and record patterns: exhaustiveness mechanics](#4-pattern-matching-and-record-patterns-exhaustiveness-mechanics)
   5. [Data-Oriented Programming v1.1 (2024)](#5-data-oriented-programming-v11-2024)
   6. [JSpecify: the annotation set and what `@NullMarked` actually changes](#6-jspecify-the-annotation-set-and-what-nullmarked-actually-changes)
   7. [JPMS: module-info vs. Automatic-Module-Name](#7-jpms-module-info-vs-automatic-module-name)
   8. [The binary-compatibility tool landscape: japicmp, revapi, Animal Sniffer, and Gradle's own allowlist](#8-the-binary-compatibility-tool-landscape-japicmp-revapi-animal-sniffer-and-gradles-own-allowlist)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- A widened parameter type, a narrowed/changed return type, or a moved method between static/instance is binary-incompatible even though it recompiles cleanly — never ship one without a major-version bump or an overload that preserves the old signature ([JLS §13.4.14/.15/.19](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)).
- Adding a new overload is binary-*compatible* by itself — pre-existing binaries keep calling the signature they were compiled against — but it can silently change which overload *new* compilations resolve to, which is a source-compatibility hazard, not a binary one ([JLS §13.4.23](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)).
- Changing a `public static final` constant's value does not break pre-existing binaries; it just means they silently keep the *old inlined value* until recompiled — a correctness bug, not a link error ([JLS §13.4.9](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html)).
- Adding an abstract method to an interface is binary-compatible for existing implementers' *linkage* (JLS §13.5.4) but breaks *source* compatibility for anyone who implements the interface directly without a default method — the OCX SDK's public interfaces should ship a `default` body or be `sealed` before this ever becomes a decision.
- `@Deprecated(forRemoval=…, since=…)` and the Javadoc `@deprecated` tag must both be present or both absent — JEP 277 calls the mismatch a documented mistake, and `-Xlint:dep-ann` only catches the tag-without-annotation half ([JEP 277](https://openjdk.org/jeps/277)).
- `forRemoval=true` requires "a clear and definite plan for removing that API" — do not set it on day one of a deprecation; set it only when a removal version is already decided ([JEP 277](https://openjdk.org/jeps/277)).
- A sealed hierarchy lets a compiler prove switch exhaustiveness from the `permits` clause, but adding a new permitted subtype is *source-breaking* for any downstream `switch` that already covers every case without a `default` — and silently absorbed (no compile error, no runtime signal) by any downstream `switch` that used `default`/`else` ([JEP 409](https://openjdk.org/jeps/409); [JEP 441](https://openjdk.org/jeps/441)).
- The 2024 Data-Oriented Programming v1.1 essay changed its fourth principle from "validate at the boundary" (2022) to "separate operations from data" — do not cite the 2022 four principles as current ([inside.java, 2024-05-23](https://inside.java/2024/05/23/dop-v1-1-introduction/)).
- JSpecify's four annotations (`@Nullable`, `@NonNull`, `@NullMarked`, `@NullUnmarked`) are frozen for life — the project's 1.0 release states "we will never make backwards-incompatible changes to them" ([jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/)).
- `@NullMarked` at package or module scope makes every *unannotated* type-use in that scope implicitly `@NonNull` — it is an opt-in default, not a global scan, and packages do not inherit it hierarchically (`@NullMarked` on `com.foo` does not cover `com.foo.bar`) ([jspecify.dev/docs/user-guide](https://jspecify.dev/docs/user-guide/)).
- For a Kotlin caller, an unannotated Java type is a platform type (`String!`) with all null-checks relaxed; a JSpecify-annotated one becomes a real Kotlin nullable/non-null type, and Kotlin 2.1.0+ reports JSpecify nullness violations as compile **errors** by default, not warnings ([kotlinlang.org/docs/java-interop.html](https://kotlinlang.org/docs/java-interop.html)).
- JSpecify array syntax is a real footgun: `@Nullable Object[]` under type annotations means "array of nullable Object", not "nullable array" — a nullable array is `Object @Nullable []` ([jspecify.dev/docs/using](https://jspecify.dev/docs/using/)).
- There is no single Java equivalent of Kotlin's binary-compatibility-validator: the corpus splits across japicmp (Maven-plugin/`.api`-adjacent), Animal Sniffer (a *signature-surface* check, not a version-diff), and gradle/gradle's own tooling — which itself wraps japicmp (`me.champeau.gradle.japicmp.JapicmpTask`) rather than being a from-scratch mechanism, plus a hand-maintained accepted-changes JSON allowlist ([gradle/gradle@ea17004a31:build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java](https://github.com/gradle/gradle/blob/master/build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java)).
- Animal Sniffer checks your bytecode against a *target platform's* signature set (e.g. Android API level, Java 8) — it does not diff your library's v1 API against v2 at all, and cannot substitute for a binary-compatibility gate ([mojohaus.org/animal-sniffer](https://www.mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin/)).
- **Decision: the OCX SDK gates on japicmp**, run in CI before any artifact reaches the immutable Central upload step (per M-H-10), against the last-published release coordinate as `oldVersion`, with any accepted break requiring an explicit, reviewed exclusion in the plugin's `<parameter>` block — not a silent skip.
- **Decision: the OCX SDK ships `module-info.java`**, not `Automatic-Module-Name` — the corpus shows libraries pick one and rarely both (module-info 12/32, Automatic-Module-Name 10/32) ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) §Q-01), and a real module gives the SDK's public-surface control (`exports` list) a compiler-enforced form of M-K-06's compatibility policy for free.
- The cost of `module-info.java` to a non-modular (classpath) consumer is near zero — it becomes an automatic module named from the manifest/jar filename and works exactly as before; the cost is paid by the SDK's own maintainers, who must keep the module's `exports` list in lockstep with the public API and cannot add a second unnamed-module-only escape hatch without `Automatic-Module-Name` too (rarely done — 10/32 vs. 12/32, largely disjoint sets).
- Do not skip `--release` for a modular library: guava's own root POM still configures the legacy `<source>1.8</source><target>1.8</target>` pair for its base classes, then separately sets `<release>9</release>` only for the module-info-bearing MR-JAR layer (`google__guava@5fb424c43a:guava/pom.xml:118`) — the OCX SDK should use `--release` (or `options.release`) everywhere, never the deprecated pair.

## Findings

### 1. Binary vs. source compatibility (JLS ch.13)

JLS chapter 13 defines binary compatibility as: a change is binary-compatible if it does not cause a `LinkageError` in pre-existing, un-recompiled binaries. Several changes that a Java author intuitively expects to be "safe" because the source still compiles are binary-incompatible, and the reverse also happens.

| Change | Source-compatible? | Binary-compatible? | JLS clause | Failure mode |
|---|---|---|---|---|
| Widen a parameter type (e.g. `int`→`long`) | Yes (with implicit widening at call sites that still compile) | **No** — it is a new signature | [§13.4.14](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `NoSuchMethodError` in un-recompiled callers |
| Narrow or change a return type | Only if covariant-legal | **No** — combined delete+add of a new method | [§13.4.15](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `NoSuchMethodError` |
| Add a new overload | Yes | **Yes** — old binaries keep resolving to the signature they were compiled against | [§13.4.23](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | None at the binary level; can *silently redirect new source compilations* to the new overload — a source-compatibility, not binary-compatibility, hazard |
| Change a `static final` constant's value | Yes | **Yes**, technically — but un-recompiled callers keep the old inlined value | [§13.4.9](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | Silent staleness, not a crash — the most dangerous class because nothing signals the problem |
| Add an abstract method to an interface | **No**, for anyone implementing it directly | Yes, for existing compiled implementers (nothing calls the new method through the old vtable shape until relinked) | [§13.5.4](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | Compile failure for direct implementers; no runtime effect for callers |
| Change access from `public`→`protected`/package/`private` | No | **No** | [§13.4.7](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `IllegalAccessError` |
| Add `final` to a previously non-final field | Yes | **No**, for writers | [§13.4.9](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `IllegalAccessError` on write |
| Move a member between `static` and instance | No | **No** | [§13.4.19](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `IncompatibleClassChangeError` |
| Add `final` to a previously overridable method | Yes, for non-overriders | **No**, for subclasses that override it | [§13.4.17](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `IncompatibleClassChangeError` at the overriding class's link time |
| Make a concrete method `abstract` | No | **No** | [§13.4.16](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | `AbstractMethodError` |

The row that most often surprises: **adding an overload is binary-safe but the widened-parameter case is not**. An agent asked to "accept a wider numeric type" for convenience will change the existing method's signature in place — the wrong move. The correct move is to add a second overload and leave the original signature untouched.

### 2. JEP 277: deprecation with intent

JEP 277 (finalized JDK 9, still the governing model in JDK 25) sets two rules the OCX SDK's compatibility policy must encode literally:

1. The `@Deprecated` annotation and the Javadoc `@deprecated` tag "should both be present or both be absent… the presence of one without the other is considered to be a mistake." `-Xlint:dep-ann` only flags the tag-without-annotation half — there is no compiler warning for the annotation-without-tag half, so a rule must check it separately ([JEP 277](https://openjdk.org/jeps/277)).
2. `forRemoval=true` "should be applied only when there is a clear and definite plan for removing that API" — it is not a synonym for "we'd like to remove this eventually." Pair it with a `since` version and a stated removal target in the Javadoc body.

`-Xlint:deprecation,removal` (not just `deprecation`) is the compiler check that surfaces both ordinary and `forRemoval` deprecated-API usage; `removal` is the one that matters for an SDK's own consumers upgrading past a removal.

### 3. Sealed hierarchies and the downstream-`default`-absorption trap

`sealed` (finalized JDK 17, [JEP 409](https://openjdk.org/jeps/409)) lets a `permits` clause enumerate every direct subtype, in the same module (or same package in an unnamed module). This is what lets the compiler treat a `switch` over the sealed type as exhaustive without a `default` label — JEP 441 states: "If the type of the selector expression is a sealed class then the type coverage check can take into account the `permits` clause… to determine whether a switch block is exhaustive" ([JEP 441](https://openjdk.org/jeps/441)).

The evolution trap the brief flags is real and has no compiler-side fix: **adding a new permitted subtype to a sealed interface is source-breaking for a downstream switch that lists every case explicitly** (it now fails to compile, forcing the consumer to handle the new case — the *intended* signal) **but is silently absorbed by any downstream switch that has a `default` or `else` branch** (it compiles unchanged, runs unchanged, and the new case falls into whatever the `default` branch does — frequently wrong, and there is no compiler diagnostic at all). JEP 441 only guarantees "all existing switch statements will compile unchanged" for backward compatibility — it makes no promise about correctness once a new subtype exists.

Practical consequence for the OCX SDK: adding a case to a sealed result/error hierarchy the SDK exposes is a **source-compatibility break for well-written consumer code and a silent semantic change for defensively-written consumer code**. Both need documenting in the SDK's own compatibility policy (M-K-06) as a MINOR-vs-MAJOR decision, not treated as "just adding a case."

### 4. Pattern matching and record patterns: exhaustiveness mechanics

Record patterns ([JEP 440](https://openjdk.org/jeps/440), finalized JDK 21) destructure a record's components inline: `case Point(int x, int y) -> …` instead of calling accessors. Nested record patterns compose recursively — "a value fails to match a nested pattern if either, or both, of the subpatterns fail to match" — and this nesting is what lets a `switch` over `Pair<I>` (a generic record over a sealed `I`) be checked for exhaustiveness across the full cross-product of `I`'s permitted subtypes, not just `Pair` itself.

This deepens the trap in §3: a switch that pattern-matches into a record's components inherits the same sealed-exhaustiveness guarantees, and the same silent-absorption failure mode the moment a `default`/type-pattern catch-all is present instead of full decomposition.

### 5. Data-Oriented Programming v1.1 (2024)

The four DOP v1.1 principles, as republished 2024-05-23 (not the 2022 essay's version):

1. Model data immutably and transparently.
2. Model the data, the whole data, and nothing but the data.
3. Make illegal states unrepresentable.
4. Separate operations from data. — **this replaces the 2022 fourth principle, "validate at the boundary."**

([inside.java, 2024-05-23](https://inside.java/2024/05/23/dop-v1-1-introduction/)) A rule or example citing "validate at the boundary" as one of DOP's four current tenets is citing withdrawn guidance; validation-at-the-boundary is still good practice, it is simply no longer one of the four named DOP principles.

### 6. JSpecify: the annotation set and what `@NullMarked` actually changes

JSpecify 1.0 (released 2024, `org.jspecify:jspecify:1.0.0`) ships exactly four annotation types in `org.jspecify.annotations`: `@Nullable`, `@NonNull`, `@NullMarked`, `@NullUnmarked`. The 1.0 release note is explicit about the stability bar: "we will never make backwards-incompatible changes to them" ([jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/)).

`@NullMarked` is a *scope default*, applied to a class, a package (via `package-info.java`), or a module (via `module-info.java`). Inside that scope, "unannotated types in that scope are treated as if they were annotated with `@NonNull`" — the annotation you write is `@Nullable` only where null is actually allowed, not `@NonNull` everywhere else. Scoping is **not hierarchical**: `@NullMarked` on `com.foo` does not extend to `com.foo.bar` — each package needs its own `package-info.java` (or the module needs `@NullMarked` at `module-info.java`, which does cascade to every package the module declares) ([jspecify.dev/docs/user-guide](https://jspecify.dev/docs/user-guide/)).

Type-annotation placement has two gotchas an author moving from vendor `@Nullable` (JSR-305, Checker Framework, JetBrains `annotations`) will get wrong on the first attempt, because JSpecify annotations are `TYPE_USE`:

```java
// WRONG — this is "array of nullable Object", not "nullable array"
@Nullable Object[] items;

// RIGHT — nullable array of non-null Object
Object @Nullable [] items;

// WRONG under @NullMarked with an unbounded type parameter
class Box<T> { }

// RIGHT — lets T itself be instantiated with a nullable type
class Box<T extends @Nullable Object> { }
```

([jspecify.dev/docs/using](https://jspecify.dev/docs/using/))

**What a Kotlin caller sees.** An unannotated Java type reaching Kotlin is a *platform type* (rendered `String!`), and Kotlin relaxes its null-checks for it — a silent hole. A JSpecify-annotated type (via `@NullMarked` scope defaulting or explicit `@Nullable`) becomes a real Kotlin `String` or `String?`, checked like native Kotlin code. Kotlin's compiler support: `@Nullable`/`@NullMarked` since 1.8.20, `@NonNull` since 2.0.0, `@NullUnmarked` since 2.0.20; and **as of Kotlin 2.1.0 the compiler reports JSpecify nullness violations as compile errors by default**, not warnings — a strictness level JSR-305's default (`@ParametersAreNonnullByDefault`, warn-only) never reached ([kotlinlang.org/docs/java-interop.html](https://kotlinlang.org/docs/java-interop.html); corroborated as [conflict 8](../jvm-topic-map.md) in the topic map). This is the concrete mechanism behind the map's "JSpecify is the only flavour whose Kotlin default is `strict`."

### 7. JPMS: module-info vs. Automatic-Module-Name

`module-info.java` directives, verified against the JPMS quick-start and the JLS module chapter:

| Directive | Syntax | Effect |
|---|---|---|
| `module` | `module com.example.sdk { … }` | Declares the module; name is typically reverse-DNS, matching the SDK's base package |
| `requires` | `requires com.example.other;` | Makes the other module's `exports`-ed packages visible at compile+run time |
| `requires transitive` | `requires transitive com.example.other;` | Same, and re-exports that dependency's readability to *this* module's own consumers (needed when a public method's signature exposes the other module's types) |
| `requires static` | `requires static com.example.tool;` | Compile-time-only dependency, absent at runtime if the consumer doesn't have it (used for optional annotation-processor-only deps) |
| `exports` | `exports com.example.sdk.api;` | Makes the package's public types accessible to *every* module that requires this one |
| `exports … to` | `exports com.example.sdk.internal to com.example.sdk.test;` | Same, restricted to named modules only — the mechanism for "public for testing, not for the world" |
| `opens` | `opens com.example.sdk.model;` | Grants deep (setAccessible) reflection to every module — needed for frameworks doing reflective field access (Jackson, Hibernate, JUnit) on types the module does not otherwise `exports` |
| `opens … to` | `opens com.example.sdk.model to com.fasterxml.jackson.databind;` | Same, restricted |
| `uses` | `uses com.example.sdk.spi.Provider;` | Declares this module as a `ServiceLoader` consumer of the named service type |
| `provides … with` | `provides com.example.sdk.spi.Provider with com.example.sdk.impl.DefaultProvider;` | Declares this module as a service implementation |

([openjdk.org/projects/jigsaw/quick-start](https://openjdk.org/projects/jigsaw/quick-start) for `module`/`requires`/`exports`/`uses`/`provides…with`; `exports…to`/`opens`/`opens…to`/`requires transitive`/`requires static` are standard JPMS directives documented in the JLS module system chapter and `java.base`'s own `module-info.java`, not shown in the quick-start's minimal example.)

**The corpus split is real and asymmetric.** `module-info.java` appears in 12/32 exemplars (79 files total); `Automatic-Module-Name` in 10/32 — largely a *different* set of repos, confirming "a library picks one strategy, rarely both" ([pub](../jvm-audit/exemplar-publishing-ci-bazel.md) M-Q-01). Re-measured directly against the exemplar corpus for this brief:

- `junit-team/junit-framework@35c56a8e02`: **19** `module-info.java` files.
- `square/okhttp@dfcfab3824`: **15** `module-info.java` files.
- `google/guava@5fb424c43a`: **3** `module-info.java` files (`guava/src/module-info.java`, `guava-testlib/src/module-info.java`, `futures/failureaccess/src/module-info.java`), while the *base* build still targets Java 8 bytecode via the deprecated `<source>1.8</source><target>1.8</target>` pair (`guava/pom.xml`) — the module-info files live in a separate MR-JAR layer compiled with `<release>9</release>` (`guava/pom.xml:118`). Guava is the concrete proof that shipping `module-info.java` and shipping Java-8 bytecode are not mutually exclusive, provided the module descriptor is isolated to a multi-release-jar `META-INF/versions/9/` layer.
- `grpc/grpc-java@fc4314419d`: `Automatic-Module-Name` set in **28** `build.gradle` files, **zero** `module-info.java` anywhere in the tree, and `options.release = 8` / `sourceCompatibility = JavaVersion.VERSION_1_8` in its root build — a pure Automatic-Module-Name shop that has never adopted a real module descriptor.

**What choosing `module-info.java` costs a non-modular consumer:** effectively nothing on the classpath. A consumer on the classpath (not the module path) ignores the module descriptor entirely and consumes the jar exactly as before; `module-info.java` only activates when the consumer itself opts into the module path. The real cost is borne by the SDK's own authors: every public package must be explicitly `exports`-ed (an omission is a compile error for consumers, not a runtime surprise), and internal packages become genuinely inaccessible across the module boundary — a stronger encapsulation guarantee than "package-private by convention," which is exactly the SDK's public-surface control the map's M-Q-02 wants. Automatic-Module-Name costs nothing to the maintainer (a one-line manifest entry) but provides none of that enforcement — it exists purely so a *filename-derived* automatic module name (which is unstable across releases with dots or version numbers in the filename) doesn't leak into a modular consumer's `requires` clause.

### 8. The binary-compatibility tool landscape: japicmp, revapi, Animal Sniffer, and Gradle's own allowlist

There is no single tool that plays the role Kotlin's binary-compatibility-validator plays for a Kotlin library. Four different mechanisms exist in the corpus, and they check different things:

**japicmp** ([siom79.github.io/japicmp](https://siom79.github.io/japicmp/)) compares two built jars directly (via javassist bytecode inspection, not reflection, so it needs no dependency classpath) and classifies each difference as source- and/or binary-(in)compatible per JLS ch.13. Maven coordinates `com.github.siom79.japicmp:japicmp-maven-plugin`, bound to the `verify` phase; `oldVersion`/`newVersion` name the two artifacts to diff (typically the last-published Central coordinate vs. the just-built jar). It supports `--semantic-versioning` (fail if the detected changes don't match the version bump declared) and a Groovy post-processing hook for filtering accepted breaks — a japicmp-native equivalent of gradle/gradle's JSON allowlist. Measured in the corpus at `apache/kafka` (`api-checker/` custom wrapper module) plus declared (not confirmed build-blocking within the sparse checkout) at apache/maven, assertj, gradle/gradle, grpc-java, micronaut-core, testcontainers-java ([gates](../jvm-audit/exemplar-quality-gates.md) §5).

**revapi** ([revapi.org](https://revapi.org/revapi-site/main/index.html)) is architecturally broader: a pipeline of pluggable API analyzers (Java bytecode+source, plus JSON/YAML schema analyzers for non-Java surfaces), difference detectors, transforms, and reporters. Its headline differentiator over japicmp is first-class support for "intentional API changes" a maintainer explicitly marks acceptable, baked into the pipeline rather than bolted on as a post-filter. Maven plugin at 0.15.1, an Ant task, and a standalone CLI exist; no Gradle-native plugin is documented on its own site. **Measured 0/32 in the corpus** ([gates](../jvm-audit/exemplar-quality-gates.md) §5) — not one exemplar uses it, despite its stronger design.

**Animal Sniffer** ([mojohaus.org/animal-sniffer](https://www.mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin/)) solves a different problem entirely: it checks that your compiled bytecode does not call any API absent from a *target platform signature* (a specific Android API level, or `java18`/`java21` signature artifacts), which is a forward-compatibility-with-a-runtime check, not a version-diff. It has **no concept of "your v1 API vs. your v2 API"** at all — it will not flag a removed public method, a widened parameter, or any of the JLS ch.13 changes. Measured 6/32 in the corpus (jackson-databind, guava, grpc-java, kotlinx.coroutines, mockito, okhttp), and every one of those repos uses it for target-platform floor checking (e.g. "don't accidentally call a Java 9+ API from a Java-8-targeted class"), never as a compatibility gate.

**gradle/gradle's own mechanism is not, contrary to a first read of its docs, a from-scratch bespoke checker — it is japicmp underneath.** `build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java` extends `me.champeau.gradle.japicmp.JapicmpTask` (the community Gradle wrapper for japicmp), and the "bespoke" part is a layer of custom `ViolationRule`s and a hand-maintained JSON allowlist consumed by `AcceptedApiChangesJsonFileManager.groovy` at `testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json` ([gradle/gradle@ea17004a31:build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java](https://github.com/gradle/gradle/blob/master/build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java), [testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json](https://github.com/gradle/gradle/blob/master/testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json)). Each entry in that JSON names the exact member, the change type, and an `"acceptation"` reason string — a human-reviewed audit trail, not a silent suppression. This is the shape worth copying even while adopting japicmp directly rather than gradle/gradle's Groovy scaffolding around it.

**Decision for the OCX SDK: adopt japicmp directly**, not revapi (zero corpus adoption despite better design — no precedent to lean on, and the OCX SDK does not need revapi's multi-format analyzer pipeline since its only API surface is Java bytecode) and not Animal Sniffer alone (wrong problem — it never diffs versions). Cost: one Maven/Gradle plugin dependency, one `oldVersion` coordinate to maintain per release (the last Central-published version), and a reviewed `<parameter>`/`richReport` exclusion list for any accepted break, following gradle/gradle's JSON-allowlist shape (a reason string per entry) rather than a bare exclusion.

**Gate point: before Central upload, not after.** Per M-H-10, Central is immutable — no republish, no patch. japicmp must run and fail the build (bound to `verify`/`check`, ahead of the publish task) before an artifact is ever staged for upload, because the only remedy after upload is a new version number, which is exactly the cost the gate exists to make deliberate rather than accidental.

## Normative guidance candidates

1. **Never widen a public method's parameter type or change its return type in place — add a new overload or bump the major version instead.** *Rationale:* both are binary-incompatible per JLS §13.4.14/.15 even though the change compiles cleanly against the SDK's own sources. *Verify:* japicmp run with `oldVersion` = last-published Central coordinate; any `METHOD_PARAMETER_TYPE_CHANGED`/`METHOD_RETURN_TYPE_CHANGED` binary-incompatible finding not present in the accepted-changes allowlist fails the build.

2. **Every `@Deprecated` element carries `forRemoval` and `since`, and the Javadoc `@deprecated` tag is present if and only if the annotation is.** *Rationale:* JEP 277 calls a mismatch a "mistake"; a bare `@Deprecated` with no plan misleads consumers about urgency. *Verify:* `javac -Xlint:dep-ann` for tag-without-annotation; a `grep -B2 '@Deprecated'` heuristic reading each hit's accompanying Javadoc block for the reverse case (no automated compiler check exists for annotation-without-tag).

3. **`forRemoval=true` is set only alongside a stated target removal version in the Javadoc body — never as a default deprecation posture.** *Rationale:* JEP 277's bar is "a clear and definite plan," not "we might remove this." *Verify:* reading heuristic — every `forRemoval=true` hit's Javadoc must name a version; `-Xlint:removal` in the SDK's own build (compiling against itself) surfaces any internal use of a `forRemoval` member that should already be gone.

4. **A public sealed hierarchy's compatibility policy is stated explicitly (M-K-06): "adding a permitted subtype is a MINOR/MAJOR change" is decided once, in writing, not re-litigated per PR.** *Rationale:* the change is source-breaking for exhaustive consumer switches and silently absorbed by defensive ones — there is no compiler signal either way from the SDK's own build. *Verify:* a reading heuristic on any PR that adds a `permits` entry — does the SDK's changelog/compatibility doc classify it per the stated policy; no mechanical check exists because the effect is entirely on the consumer's side.

5. **The SDK ships `module-info.java`, `exports` lists exactly the public API packages, and no package is exported that is not intended as public surface.** *Rationale:* JPMS's `exports` gives a compiler-enforced form of "public API" the classpath alone cannot express, at near-zero cost to classpath consumers. *Verify:* `jdeps --jdk-internals` plus a manual diff of `module-info.java`'s `exports` list against the Javadoc-generated public-package list; japicmp (finding 1) also catches an accidentally-unexported package once a consumer build starts using the module path.

6. **JSpecify `@NullMarked` is declared at `module-info.java` (covers every package the module declares in one line) rather than per-package, unless a specific package must stay unmarked.** *Rationale:* `@NullMarked` does not cascade across packages — a per-package declaration is 1:1 maintenance overhead the module-level declaration avoids entirely, and the SDK already ships a `module-info.java` per candidate 5. *Verify:* `grep -c '@NullMarked' module-info.java` is 1 and non-zero; NullAway's `onlyNullMarked=true` mode (not `AnnotatedPackages`) then requires no per-package list to maintain.

7. **japicmp gates the build before the publish task, comparing against the last Central-published coordinate, with any accepted break requiring a reviewed, reasoned entry in a version-controlled exclusions file — not a silent suppression flag.** *Rationale:* Central is immutable (M-H-10); the only recovery from an unintended binary break already uploaded is a new version, so the gate belongs before upload, not after. *Verify:* the japicmp Gradle/Maven task is a dependency of `check`/`verify`, which is itself a dependency of the publish task; `grep` the build for a bare `ignoreMissingClasses`/`skip` flag with no accompanying reasoned exclusions file as a smell.

8. **Array-typed and generic-bounded JSpecify annotations use `Type @Nullable []` and `<T extends @Nullable Object>`, never `@Nullable Type[]` or a bare `<T>` under `@NullMarked`.** *Rationale:* under `TYPE_USE` semantics `@Nullable Object[]` means "array of nullable elements," the opposite of a nullable-array intent, and an unbounded `<T>` under `@NullMarked` cannot be instantiated with a nullable type argument at all. *Verify:* NullAway's JSpecify mode (`jspecifyMode=true`) flags the generic-bounds case at compile time; the array-placement case needs a reading heuristic since it compiles either way — grep for `@Nullable \w+\[\]` as a smell to hand-review.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (japicmp/binary-compat gate before publish) | `apache/kafka@940c100fab` (`api-checker/` custom japicmp wrapper); gradle/gradle wraps japicmp in `build-logic/binary-compatibility/` | 25/32 exemplars have no confirmed build-blocking binary-compat gate at all ([gates](../jvm-audit/exemplar-quality-gates.md) §5) — this is a MUST this program imposes on the OCX SDK, not a corpus norm to inherit |
| 2/3 (JEP 277 both-or-neither, forRemoval with a plan) | Not independently re-measured at source level in this pass (would require reading Javadoc source across the corpus, out of this brief's budget) | — |
| 4 (sealed-hierarchy compat policy documented) | No exemplar was found stating this explicitly as policy | This is a genuinely new imposition — sealed hierarchies are recent enough (JDK 17, 2021) that public-API compatibility policy for them is not yet a corpus norm |
| 5 (module-info with a minimal, exact `exports` list) | `junit-team/junit-framework@35c56a8e02` (19 files), `square/okhttp@dfcfab3824` (15 files), `google/guava@5fb424c43a` (3 files, isolated to an MR-JAR `release 9` layer while the base targets Java 8) | `grpc/grpc-java@fc4314419d` — zero `module-info.java`, `Automatic-Module-Name` set in 28 separate `build.gradle` files instead, and still on `options.release = 8` |
| 6 (`@NullMarked` at module scope) | `junit-team/junit-framework@35c56a8e02` and NullAway's own `jdk-javac-plugin` module are the only 2/32 exemplars using NullAway's JSpecify-native `onlyNullMarked`/`jspecifyMode` ([gates](../jvm-audit/exemplar-quality-gates.md) headline 3) | 13/32 still declare `jsr305` and 8/32 `checker-framework`; JSpecify itself only 9/32 — this candidate states the *direction*, not the installed base |
| 7 (accepted-break allowlist, reviewed and reasoned) | `gradle/gradle@ea17004a31:testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json` — every entry carries an `"acceptation"` reason string, the exemplar-grade template | No other exemplar in the corpus was found with an equivalent reviewed-exclusions file for japicmp/Animal Sniffer |
| 8 (JSpecify array/generic placement) | Not independently re-measured at source level | The jspecify.dev docs themselves call this out as a common migration error, implying it is a live footgun, not a hypothetical one |

## AI-agent angle

- **Training-data staleness on `@Deprecated`.** Pre-2017 idiom is `@Deprecated` with no `forRemoval`/`since` at all, sometimes without even a Javadoc `@deprecated` tag. An agent asked to deprecate a method will very often emit exactly the bare, mismatched form JEP 277 calls a mistake. *Check:* `javac -Xlint:dep-ann` plus a grep for `@Deprecated` without an adjacent `since =`.
- **"Widen the parameter, it's more flexible" is a common LLM refactor that breaks binary compatibility.** An agent optimizing an API for ergonomics (e.g. `int`→`long`, `List<T>`→`Collection<T>`) will change the existing signature in place rather than adding an overload, because from a pure-source-compiled view the change looks strictly more permissive. *Check:* japicmp on every PR touching a public method signature, not just on release branches.
- **Sealed-hierarchy `switch` with a `default` looks *more* defensive to an LLM, not less — exactly backwards for a library's public API.** Training data associates `default: throw new IllegalStateException(...)` with "handles the unexpected case safely." For a sealed hierarchy the safer choice is the *opposite*: no `default`, so the compiler forces every call site to be revisited when a new subtype appears. *Check:* a grep for `default` or an unconditional `else`/type-pattern in any `switch` over a type this SDK controls and has sealed; flag for review rather than auto-accept.
- **Vendor `@Nullable` habit (JSR-305's `javax.annotation.Nullable`, Android's, JetBrains') persists strongly in training data and is not equivalent to JSpecify.** An agent told "add null-safety annotations" will very often reach for `javax.annotation.Nullable` (implicit target `RUNTIME`, warn-only in Kotlin) rather than `org.jspecify.annotations.Nullable`, silently missing the `strict`-by-default Kotlin behavior the map's conflict 8 documents. *Check:* `grep -rn 'import javax.annotation.Nullable\|import androidx.annotation.Nullable'` in any file also importing `org.jspecify` — mixing systems in one file is close to always wrong.
- **`@Nullable Type[]` vs `Type @Nullable []` is a syntax an LLM gets backwards by default**, because pre-type-annotation Java only had the first, pre-array-annotation form, and most training corpora predate widespread `TYPE_USE` annotation adoption. *Check:* grep for `@Nullable \w+(<[^>]*>)?\[\]` (annotation immediately before the array type) as a near-certain misplacement smell.
- **Recommending PMD, Checkstyle, or SpotBugs core as the binary-compatibility gate.** None of the three diff versions; an agent conflating "static analysis" with "compatibility checking" will reach for a familiar linter name instead of japicmp/revapi. *Check:* the build's compatibility-gate task must literally invoke a japicmp/revapi/BCV task — grep the CI workflow for one of those three plugin ids, not for "lint" or "quality" job names.
- **Automatic-Module-Name presented as equivalent to a real `module-info.java`.** An LLM asked "make this library JPMS-compatible" will often add only a manifest `Automatic-Module-Name` entry and call it done, because it is a one-line change with no compile-time consequences to get wrong. It provides a stable module *name* but none of the `exports` enforcement or module-graph benefits. *Check:* if the task explicitly asked for module boundaries/encapsulation (not just a stable name for module-path consumers), `find . -name module-info.java` must return a hit.

## Contested / evolving

- **japicmp vs. revapi for a fresh 2026 project.** revapi's design (pluggable analyzers, first-class "intentional change" marking) is arguably better-suited to a greenfield SDK than japicmp's diff-plus-post-filter model, but it has **zero adoption in the 32-repo corpus** as of this survey — there is no exemplar to imitate, no community Gradle-plugin ecosystem as mature as japicmp's, and adopting it would be a bet against observed practice rather than a codification of it. Revisit if revapi's Maven-plugin release cadence (0.15.1 as measured) and Gradle-side tooling mature, or if a future audit finds real adopters.
- **Whether `forRemoval` deprecation is being used at all outside the JDK itself.** JEP 277's mechanism is JDK-native and well-specified, but this survey did not find corpus-level measurement of third-party library adoption of `forRemoval=true` with a stated plan (vs. bare `@Deprecated`) — flagged as a gap, not resolved here.
- **JSpecify's installed base vs. its normative direction remains a live gap, not a settled transition.** Four nullness annotation systems coexist in the corpus (JSpecify 9/32, jsr305 13/32, checker-framework 8/32, JetBrains `annotations` 8/32) as of this survey; JSpecify is the trend (Spring Framework 7/Boot 4 completed migration November 2025, Gradle 9 switched its own API annotations from JSR-305) but is not yet the majority. Track Spring/Gradle-class migrations as the leading indicator that the balance is tipping.
- **Whether a sealed-hierarchy compatibility policy belongs in Javadoc, a changelog convention, or a machine-readable annotation** is genuinely unsettled — no JEP or corpus exemplar prescribes a mechanism, only that *some* stated policy needs to exist (M-K-06). This program's candidate 4 states the requirement without picking the format; revisit once a corpus exemplar sets a precedent.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.oracle.com/javase/specs/jls/se25/html/jls-13.html](https://docs.oracle.com/javase/specs/jls/se25/html/jls-13.html) | JLS SE 25, Chapter 13 (Binary Compatibility) | Current spec, Java 25 (LTS, 2025-09) | Primary, normative source for every binary-vs-source-compatibility claim in this file |
| [openjdk.org/jeps/277](https://openjdk.org/jeps/277) | JEP 277, Enhanced Deprecation | Finalized JDK 9 (2017), still governing | Primary; exact wording on `forRemoval`/`since`/Javadoc-tag pairing |
| [openjdk.org/jeps/409](https://openjdk.org/jeps/409) | JEP 409, Sealed Classes | Finalized JDK 17 (2021) | Primary; `permits` clause rules and exhaustiveness rationale |
| [openjdk.org/jeps/441](https://openjdk.org/jeps/441) | JEP 441, Pattern Matching for switch | Finalized JDK 21 (2023) | Primary; exact exhaustiveness-checking and backward-compatibility wording |
| [openjdk.org/jeps/440](https://openjdk.org/jeps/440) | JEP 440, Record Patterns | Finalized JDK 21 (2023) | Primary; nested-pattern matching semantics that feed sealed-hierarchy exhaustiveness |
| [inside.java/2024/05/23/dop-v1-1-introduction](https://inside.java/2024/05/23/dop-v1-1-introduction/) | Data-Oriented Programming v1.1 essay | 2024-05-23 | Primary, current version of the four DOP principles — supersedes the 2022 original |
| [jspecify.dev/docs/start-here](https://jspecify.dev/docs/start-here/) | JSpecify project overview | Project docs, current as of 1.0 | Primary; scope of the annotation artifact and specification |
| [jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/) | JSpecify 1.0.0 release announcement | 2024 (1.0 release) | Primary; the "never backwards-incompatible" stability guarantee, verbatim |
| [jspecify.dev/docs/user-guide](https://jspecify.dev/docs/user-guide/) | JSpecify user guide | Project docs, current | Primary; `@NullMarked` scope semantics, non-hierarchical package scoping |
| [jspecify.dev/docs/using](https://jspecify.dev/docs/using/) | JSpecify practical adoption guide | Project docs, current | Primary; array/generic-bounds annotation placement gotchas |
| [openjdk.org/projects/jigsaw/quick-start](https://openjdk.org/projects/jigsaw/quick-start) | Project Jigsaw quick-start | Original JPMS docs (JDK 9 era), directive syntax unchanged since | Primary; base `module`/`requires`/`exports`/`uses`/`provides…with` directive syntax |
| [siom79.github.io/japicmp](https://siom79.github.io/japicmp/) | japicmp project site/docs | Current, actively maintained tool | Primary (tool's own docs); configuration model, JLS-based classification |
| [revapi.org/revapi-site/main/index.html](https://revapi.org/revapi-site/main/index.html) | revapi project site/docs | Current, actively maintained tool | Primary (tool's own docs); pipeline architecture, comparison basis against japicmp |
| [mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin](https://www.mojohaus.org/animal-sniffer/animal-sniffer-maven-plugin/) | Animal Sniffer Maven plugin docs | Current | Primary (tool's own docs); confirms it is a target-platform signature check, not a version-diff tool |
| [kotlinlang.org/docs/java-interop.html](https://kotlinlang.org/docs/java-interop.html) | Kotlin/Java interop reference | Current, Kotlin 2.x docs | Primary (tool's own docs); platform types, JSpecify compiler-support version table, strict-by-default since 2.1.0 |
| [github.com/gradle/gradle — build-logic/binary-compatibility](https://github.com/gradle/gradle/blob/master/build-logic/binary-compatibility/src/main/groovy/gradlebuild/binarycompatibility/JapicmpTaskWithKotlin.java) and [accepted-public-api-changes.json](https://github.com/gradle/gradle/blob/master/testing/architecture-test/src/changes/accepted-changes/accepted-public-api-changes.json) | gradle/gradle's own binary-compatibility build logic and allowlist, re-measured directly against `gradle__gradle@ea17004a31` in this session | Repo as measured 2026-09 | Primary (exemplar corpus); reveals the "bespoke" mechanism is a japicmp wrapper plus a reviewed JSON allowlist — the concrete shape candidate 7 recommends |
| `.agents/research/jvm-audit/exemplar-quality-gates.md` and `.agents/research/jvm-audit/exemplar-publishing-ci-bazel.md` | This program's own wave-1 audits over the 32-repo exemplar corpus | 2026-09-05/06 | Corpus-measured evidence for tool-adoption counts (japicmp/revapi/Animal Sniffer, module-info/Automatic-Module-Name) cited throughout |
