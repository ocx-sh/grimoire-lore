---
title: Nullness Flavours and the @NullMarked Boundary
summary: The JAVA-NULL family. Which nullness annotation set a module declares, where @NullMarked is written and what it cascades to, and how a package leaves JSR-305 without stranding half of itself
---

# Nullness Flavours and the `@NullMarked` Boundary

Owns which nullness annotation set a module declares and where the marking
lives: the flavour choice, the scope `@NullMarked` is written at, and what a
half-migrated package does to a Kotlin caller. Does not own the tooling that
reads the annotations (`JAVA-LINT` wires NullAway and Error Prone, in
`lint-gate.md`), the published-API annotation contract or `TYPE_USE` placement
(`JAVA-API`, in `api-and-evolution.md`), or the Kotlin-side compiler flags that
decide a flavour's severity for a Kotlin caller (`KT-INTEROP`, in the
`kotlin-quality` set).

Contents: [Scope](#scope) · [Where the Marking Lives](#where-the-marking-lives) ·
[Choosing a Flavour, and Leaving One](#choosing-a-flavour-and-leaving-one) ·
[Turning the Mode On](#turning-the-mode-on) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **`javac` catches none of this at any `-Xlint` setting.** An unannotated Java
  type compiles exactly like an annotated one. The only mechanical gate is
  NullAway in JSpecify mode, and standing it up is `JAVA-LINT-04` (set exactly
  one of `OnlyNullMarked` and `AnnotatedPackages`) plus `JAVA-LINT-05` (the JDK
  precondition the flag imposes on the toolchain). Until both hold, every rule
  below is a grep or a read, by necessity rather than by choice.
- **Two neighbouring rules already cover the file granularity.**
  `JAVA-LINT-06` forbids an `import javax.annotation.Nullable` in a module whose
  build sets `jspecifyMode`, and `JAVA-API-10` forbids mixing flavours inside
  one file. This file works at the package and module granularity, which
  neither of them reaches. The three Error Prone nullness checks
  (`EqualsMissingNullable`, `FieldMissingNullable`, `VoidMissingNullable`) are
  part of `JAVA-LINT-02`'s promotion list and are not restated here.
- **The direction is not the installed base, and a rule that ignores that
  contradicts most of the ecosystem.** Measured across 32 flagship JVM
  repositories, 2026-09-12: JSpecify declared in 9, JSR-305 in 13, Checker
  Framework in 8, and NullAway's JSpecify-native mode in 2. So every rule below
  is written as a direction with a migration path, never as a claim about what
  a repository already contains.

## Where the Marking Lives

Two commands cover the section. `grep -rn --include='module-info.java' -e '@NullMarked' src/main/java`
finds the module-scope form, and `find src/main/java -name 'package-info.java' -printf '%h\n'`
lists the packages carrying the package-scope form. Which one is the finding
depends on the row.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-NULL-01 | Every package holding a type that a Kotlin module calls, or that a published surface exposes, sits inside a `@NullMarked` scope. A package that is merely "mostly annotated" is not marked. | Outside a `@NullMarked` scope a Java type reaches Kotlin as a platform type. Kotlin applies no check in either direction, so the call site compiles, the value is used as non-null, and the NPE surfaces later at an arbitrary frame with no annotation anywhere to blame. This is the exact boundary JSpecify plus NullAway plus Kotlin's strict default exist to close. | `grep -rln --include='*.java' -e '@NullMarked' src/main/java`. Java source present with empty output is the finding. Then, for each package a Kotlin module or a published type reaches, confirm it is covered by a module-scope marking or by its own `package-info.java`. An uncovered package is the finding. | MUST |
| JAVA-NULL-02 | Declare `@NullMarked` once in `module-info.java` where the module ships one. Where it does not, every package needs its own `package-info.java`, and adding a subpackage means adding its `package-info.java` in the same change. | Module scope cascades to every package the module declares. **Package scope does not cascade to subpackages**, so `com.example.api` being marked says nothing about `com.example.api.model`, and the new subpackage an agent creates is unmarked and silent. Per-package declaration is 1:1 maintenance for the life of the module. `JAVA-API-12` decides whether the module ships a descriptor at all. | Where the module-scope grep returns one hit, the check ends there. Otherwise `find src/main/java -name '*.java' -not -name 'package-info.java' -not -name 'module-info.java' -printf '%h\n'` lists every package directory holding source, and the `package-info.java` listing above lists the marked ones. A directory present in the first listing and absent from the second is the finding. Equal coverage is the pass. | MUST |
| JAVA-NULL-03 | Do not write `@NonNull` on an ordinary parameter, return or field type inside a `@NullMarked` scope. The one place it carries meaning is a type-parameter bound, which `JAVA-API-11` owns. | Inside a `@NullMarked` scope an unannotated type usage already *is* non-null. A file sprinkled with `@NonNull` reads as if the marking were absent, and the next reader cannot tell an emphasised contract from an unmarked package. Reviewers then start treating the absence of `@NonNull` as unknown, which is the opposite of what the scope declares. | `grep -rn --include='*.java' -e '@NonNull' src/main/java`. Inside a marked scope, every hit outside a type-parameter bound is the finding. Empty output is the pass. | SHOULD |

```java
// wrong: com/example/api/package-info.java. com.example.api.model is NOT covered by this.
import org.jspecify.annotations.NullMarked;

@NullMarked
package com.example.api;
```

```java
// right: module scope, one declaration, cascades to every package the module declares
import org.jspecify.annotations.NullMarked;

@NullMarked
module com.example.api {
    exports com.example.api;
    exports com.example.api.model;
}
```

## Choosing a Flavour, and Leaving One

The gate is one grep over the build files and one over the imports:
`grep -rn -e 'jspecify' -e 'jsr305' -e 'checker-qual' -e 'org.jetbrains:annotations' --include='*.versions.toml' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .`
names every flavour the module can resolve, and
`grep -rln --include='*.java' -e 'org.jspecify' src/main/java` names the packages that have moved.

| Flavour | Import root | Severity for a Kotlin caller | Adoption, 32 repos, 2026-09-12 |
|---|---|---|---|
| JSpecify (1.0.0, 2024-07-17, verified 2026-09-12), annotation set frozen for life | `org.jspecify.annotations` | **error** by default from Kotlin 2.1.0, the only flavour whose Kotlin default is strict | declared 9/32, read natively by NullAway in 2/32 |
| JSR-305 | `javax.annotation` | warning by default | 13/32, still the most common |
| Checker Framework | `org.checkerframework.checker.nullness.qual` | set by a compiler flag, not by the annotation. `KT-INTEROP` owns the flags | 8/32 |
| JetBrains | `org.jetbrains.annotations` | set by a compiler flag, as above | not measured |
| Spring's own `@Nullable` | `org.springframework.lang` | set by a compiler flag, as above | retired upstream: Spring Framework 7 and Boot 4 completed the move to JSpecify in November 2025 |

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-NULL-04 | **pinned.** JSpecify is the flavour for new Java source and for any module a Kotlin consumer calls. This is a default an adopter overrides once, module-wide, in one build file. Never per package and never per file. | It is the only flavour whose Kotlin default is strict, so it is the only one that turns a nullness mismatch into a compile error rather than a warning a build already ignores. Four independent moves point the same way: JSpecify 1.0's own promise never to make a backwards-incompatible change, Kotlin's strict default since 2.1.0, Spring's completed migration (November 2025), and Gradle 9 switching its own API annotations off JSR-305. The counterweight is adoption, which is why this is a direction with a migration path and not a claim about the installed base. | The build-file grep above returns exactly one flavour family for the module. Two families is the finding. Zero, in a module that publishes a surface or is called from Kotlin, is also the finding. | MUST |
| JAVA-NULL-05 | Migrate a whole package in one change: replace every old-flavour import in it, mark it, and remove the old flavour's coordinate from the build in the same change. Never layer a new flavour over a package that still resolves the old one. | As long as the old coordinate resolves, the wrong import is one completion away, and NullAway's default mode matches `@Nullable` by simple name across packages, so the layered state produces no diagnostic at all until `jspecifyMode` is set. `JAVA-API-10` catches the mix once it lands inside a single file. This row is what stops the package getting there. | `grep -rln --include='*.java' -e 'javax.annotation.Nullable' -e 'org.checkerframework' -e 'org.jetbrains.annotations' -e 'org.springframework.lang' src/main/java` against the `org.jspecify` listing above: a package directory appearing in both is half-migrated and is the finding. Then the build-file grep, which must show no surviving old coordinate for that module. Empty output on both is the pass. | MUST |

## Turning the Mode On

One gate, and it is a diff review rather than a command:
`git diff --stat` on the change that first sets `jspecifyMode = true` must show
build files only.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-NULL-06 | Enable `jspecifyMode` in a change that touches no production source, read the diagnostics, and only then promote it into the gate. Where generic-heavy or lambda-heavy call chains produce findings you believe are wrong, narrow the scope or report upstream. Do not clear the build by adding suppressions. | JSpecify mode is the strictest setting NullAway has and it has known gaps on lambda-heavy call patterns ([NullAway#1290](https://github.com/uber/NullAway/issues/1290)), so the first run on an existing module is not a list of real defects. A batch of `@SuppressWarnings("NullAway")` added to reach green leaves the module claiming a guarantee it is no longer checking, which is worse than leaving the flag off. `JAVA-LINT-05` is the separate precondition that the toolchain can run the mode at all. | `grep -rn --include='*.java' -e 'SuppressWarnings("NullAway")' src/main/java`. A suppression introduced by the same change that sets the flag is the finding. Empty output is the pass. A pre-existing suppression carrying a reason on the same line or the line above is not this row's business. | SHOULD |

## What Agents Get Wrong Here

1. **Reaching for `javax.annotation.Nullable` on the instruction "add
   null-safety annotations".** The highest-frequency failure in this family, and
   both consolidations rank it first. JSR-305 is 13 of 32 measured repositories
   and far more of the training distribution, so the reflex fires even inside a
   module that has already migrated. Caught by `JAVA-NULL-05`, and by
   `JAVA-LINT-06` once the mode is on.
2. **Marking one package and reporting the module null-safe.** The package-scope
   non-cascade is not intuitive and produces no diagnostic. The subpackage the
   agent created two edits earlier is unmarked, and the grep for `@NullMarked`
   returns a hit, so the check reads as clean.
3. **Layering rather than migrating.** Asked to "adopt JSpecify", an agent adds
   the dependency and the annotations and leaves the old coordinate and the old
   imports in place. The result compiles, resolves, and produces no finding
   until the day `jspecifyMode` is set, at which point the two systems disagree
   about every mixed file at once.
4. **Annotating everything `@NonNull` inside a `@NullMarked` scope**, on the
   theory that explicit is better. It inverts the reading of every type that is
   correctly left bare.
5. **Setting `jspecifyMode = true` and clearing the fallout with
   suppressions.** The flag looks like the finishing touch on a nullness task,
   the first run is noisy on exactly the code most worth checking, and the
   suppression is the documented way to silence it.
6. **Blaming Kotlin for a platform-type NPE.** The crash surfaces on the Kotlin
   side, so the offered fix is `!!` or a Kotlin-side null check, which hides the
   unannotated Java package that caused it and leaves every other caller exposed.
7. **Declaring `@NullMarked` on the package that happens to hold
   `module-info.java` instead of on the module declaration itself.** One
   character of syntax apart, and only one of the two cascades.
