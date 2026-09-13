---
title: "api versus implementation, and the catalog that does not pin"
topic: gradle-dependency-declaration
agent: declaration-and-catalogs
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers Gradle dependency-declaration mechanics for a library author: the
  api/implementation contract and its verification, platform() vs
  enforcedPlatform(), rich versions (strictly/require/prefer/reject, `!!`),
  version catalogs and what they do and do not pin, and DAGP's
  projectHealth/fixDependencies workflow. Does NOT cover dependency locking,
  dependency verification (checksums/PGP), repository content filtering, or
  supply-chain/malware topics in depth — those belong to the sibling dive
  `locking-verification-supply-chain` (same GRADLE-DEP family); this file only
  states the boundary between catalog-pinning and locking where the brief's
  DECIDE (c) requires it. Maven dependency mediation (GAV-depth-wins,
  `dependencyManagement`) is out of scope — MVN-DEP family, `maven-build/`.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The api/implementation contract](#1-the-apiimplementation-contract)
   2. [platform() vs enforcedPlatform()](#2-platform-vs-enforcedplatform)
   3. [Rich versions: strictly/require/prefer/reject and `!!`](#3-rich-versions-strictlyrequirepreferreject-and-)
   4. [Version catalogs: declared, not resolved](#4-version-catalogs-declared-not-resolved)
   5. [DAGP: projectHealth, the four advice types, and fixDependencies](#5-dagp-projecthealth-the-four-advice-types-and-fixdependencies)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- An `api` dependency is one whose types leak into the library's ABI: superclass/interface types, public method parameter or return types (including generics), public field types, and public annotation types ([java_library_plugin](https://docs.gradle.org/current/userguide/java_library_plugin.html)).
- Everything else — types used only in method bodies, private members, or internal classes — is `implementation`; Gradle's own rule of thumb is to prefer `implementation` "when possible" because it keeps the type off the *consumer's* compile classpath ([java_library_plugin](https://docs.gradle.org/current/userguide/java_library_plugin.html)).
- `compileOnlyApi` exists for the third case: needed to compile the module **and** its consumers, but not at runtime (typically a shaded/repackaged dependency) ([java_library_plugin](https://docs.gradle.org/current/userguide/java_library_plugin.html)).
- The wrong-configuration failure surfaces at the **consumer's** `compileJava`/`compileKotlin` task, not the declaring module's — a leaked type compiles fine locally and only breaks downstream, which is why "does my module build" is not a valid check.
- The verification cell is DAGP's `./gradlew :module:projectHealth` (or `buildHealth` for the whole build): it performs bytecode-level ABI analysis, not text matching, so it catches the leak before any consumer's build does. Empty/no advice under the wrong-configuration category is the pass signal.
- DAGP's four dependency-related advice categories: unused dependencies, dependencies on the wrong configuration (`api`/`implementation`/`compileOnly`, variant-aware), transitively-used dependencies that should be declared directly, and unused annotation processors — plus plugin-level advice ("applied but unused": `kotlin-jvm`, `java-library`, `kapt`) ([DAGP Home wiki](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home)).
- `./gradlew fixDependencies --upgrade` is DAGP's safe mode: it will only add or upgrade a declaration (e.g. `implementation` → `api`), never remove or downgrade one — because an unused-*looking* dependency in the declaring module may still be required by a consumer relying on a leaked transitive type ([DAGP README](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc)).
- `platform()` imports a BOM's constraints as recommendations that other graph entries can still override; `enforcedPlatform()` forces every BOM version to win over anything else in the graph, **including a version a consumer declared directly themselves** ([platforms.html](https://docs.gradle.org/current/userguide/platforms.html)).
- Gradle's own docs warn explicitly against `enforcedPlatform()` for anything published for reuse: "exercise caution if your software component is intended for consumption by others… If they disagree with any enforced versions, they'll need to use `exclude`" ([platforms.html](https://docs.gradle.org/current/userguide/platforms.html)).
- `enforcedPlatform()` is acceptable in exactly one shape: a leaf application module (never `api`-published, never consumed as a library) that needs to force a coherent, non-negotiable transitive version set — e.g. to force a CVE fix across a large graph regardless of what any dependency requests.
- `spring-projects/spring-boot@93b23c40c2` is the corpus's only `enforcedPlatform()` user (13 hits) — and it is a library, the exact case the docs warn against ([shape audit](../jvm-audit/exemplar-build-shape.md)).
- The rich-version hierarchy, strongest to weakest: `strictly`/`!!` (excludes any non-matching version, can downgrade a direct dependency, fails resolution for an unsatisfiable transitive), `require` (the default for a direct dependency — a floor that conflict resolution can raise), `prefer` (the softest — only wins if nothing stronger is declared); `reject` sits outside the hierarchy and fails resolution if the rejected version would otherwise be selected ([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html)).
- Rich versions are Gradle Module Metadata-only: converting to a POM or Ivy descriptor is lossy — "The highest level of version declaration — strictly or require over prefer — will be published, and any reject will be ignored" ([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html)).
- "Using `strictly` in a library requires careful consideration, as it affects downstream consumers" — a strict constraint acts like a forced version and can break a consumer's own resolution ([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html)).
- A version catalog constrains **declared** requests only: Gradle's own docs state "Overwriting a version only affects what is imported and used when declaring dependencies. The actual resolved dependency version may differ due to conflict resolution" ([version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html)).
- A catalog alone does **not** satisfy "versions are pinned." Pinning what is actually *resolved* needs either dependency locking (a checked-in lockfile of the resolved graph) or platform/BOM alignment participating in conflict resolution — the catalog is a single source of truth for what you *ask for*, never a guarantee of what you *get*. Locking mechanics are the sibling dive's depth (`locking-verification-supply-chain`, same `GRADLE-DEP` family); this file states the boundary, not the mechanics.
- A glob or grep for the conventional path (`**/gradle/libs.versions.toml`) will miss a real, wired catalog: `apollographql/apollo-kotlin@c145295b72:settings.gradle.kts:26-29` names its catalog file `gradle/libraries.toml` and wires it via `versionCatalogs { create("libs") { from(files("gradle/libraries.toml")) } }` — a filename check finds nothing, but a grep for `versionCatalogs` or `alias(libs.` usage in build files does.
- gradle/gradle itself does not use the conventional path either: it wires three named catalogs (`libs`, `testLibs`, `buildLibs`) programmatically from `build-logic-settings/settings.gradle.kts:17-27` — the tool that invented version catalogs is a false negative for a filename-only rule ([shape audit](../jvm-audit/exemplar-build-shape.md)).
- Best Practices for Dependencies names catalog-adjacent practices explicitly: "Use Version Catalogs to Centralize Dependency Versions," "Name Version Catalog Entries Appropriately" (dashes, derived from group:artifact, no generic names), and "Avoid Misusing Version Catalogs" (don't store unrelated shared strings or plugin config in them) ([best_practices_dependencies.html](https://docs.gradle.org/current/userguide/best_practices_dependencies.html)).

## Findings

### 1. The api/implementation contract

Gradle's `java-library` plugin (as of the current 9.7.1 documentation) exposes two dependency-declaration configurations with different consumer visibility:

**`api`** — the dependency is on the consumer's compile classpath too. A dependency belongs here when at least one of its types is exposed in the module's ABI:

- types used in superclasses or interfaces,
- types used in public method parameters, including generic parameter types (where "public" includes Java's `public`, `protected`, and package-private members visible to the compiler),
- types used in public fields,
- public annotation types.

**`implementation`** — the dependency stays off the consumer's compile classpath. This is everything irrelevant to the ABI: types used exclusively in method bodies, exclusively in private members, or exclusively inside internal classes ([java_library_plugin.html](https://docs.gradle.org/current/userguide/java_library_plugin.html)).

Gradle's own rule of thumb, quoted verbatim: **"Prefer the `implementation` configuration over `api` when possible. This keeps the dependencies off of the consumer's compilation classpath."** The direct consequence: an `implementation` type leaking into a public signature does not fail the *declaring* module's build — it compiles locally either way — it fails the *consumer's* `compileJava`/`compileKotlin` task instead, with an error the consuming team sees and the library author never will, unless they check.

`compileOnlyApi` is the third, less common configuration: "dependencies which are required at compile time by your module and consumers, but not at runtime" — the shape for a shaded/repackaged dependency that the public API still references by type ([java_library_plugin.html](https://docs.gradle.org/current/userguide/java_library_plugin.html)).

```kotlin
// build.gradle.kts — CORRECT
plugins { `java-library` }

dependencies {
    // HttpClient appears in a public constructor parameter -> api
    api("com.squareup.okhttp3:okhttp:5.x")
    // ExceptionUtils is used only inside method bodies -> implementation
    implementation("org.apache.commons:commons-lang3:3.x")
}
```

```kotlin
// build.gradle.kts — WRONG: leaks a type through implementation
dependencies {
    implementation("com.squareup.okhttp3:okhttp:5.x")
}

// public API of THIS module:
class HttpClientWrapper(val client: OkHttpClient) // OkHttpClient is public API -> must be `api`
```

The wrong version compiles in the declaring module. It fails only when a consumer writes `HttpClientWrapper(myOkHttpClient)` and gets a compile error because `OkHttpClient` is not on their compile classpath — the exact "failure surfaces downstream" property the brief calls out.

**Verification cell.** Because the failure is invisible at the declaring module's own `compileJava`, "the build passes" is not evidence. The actual check is DAGP's bytecode-ABI analysis, which does not rely on the declared configuration at all — it inspects what the compiled classes actually reference:

```
./gradlew :the-module:projectHealth
```

or, for the whole build:

```
./gradlew buildHealth
```

Read `build/reports/dependency-analysis/<variant>/build-health-report.txt` (or the JSON `Advice` output). **Empty output under the wrong-configuration category is the pass signal** — no line where `fromConfiguration` (currently `implementation`) differs from `toConfiguration` (what DAGP's ABI scan says it should be, `api`). A non-empty result names the exact dependency and the exact configuration it belongs on, before any consumer's build ever sees the leak ([DAGP Home wiki](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home)).

### 2. platform() vs enforcedPlatform()

The `java-platform` plugin lets a project declare a BOM: constraints on the `api` configuration are inherited by runtime and tests; constraints on `runtime` apply only at runtime. Constraints are advisory in the sense that "constraints will only apply if such a component is added to the dependency graph, either directly or transitively" ([java_platform_plugin.html](https://docs.gradle.org/current/userguide/java_platform_plugin.html)). A platform project rejects raw dependencies by default; `javaPlatform { allowDependencies() }` must be set explicitly to mix in real dependencies alongside constraints.

A consumer imports a platform with `platform(...)` or `enforcedPlatform(...)` — and the two behave very differently:

- **`platform(...)`** — the BOM's versions participate in normal conflict resolution as recommendations. Something else in the graph, including a version the consumer declares directly, can still win.
- **`enforcedPlatform(...)`** — the BOM's versions **override any other version found in the graph** — including one a consumer explicitly declared themselves ([platforms.html](https://docs.gradle.org/current/userguide/platforms.html)).

The docs' own warning against `enforcedPlatform()` for a reusable component, quoted verbatim:

> "When using `enforcedPlatform`, exercise caution if your software component is intended for consumption by others. This declaration is transitive and affects the dependency graph of your consumers. If they disagree with any enforced versions, they'll need to use `exclude`." ([platforms.html](https://docs.gradle.org/current/userguide/platforms.html))

```kotlin
// build.gradle.kts — a LIBRARY doing the exact thing the docs warn against
dependencies {
    api(enforcedPlatform("com.fasterxml.jackson:jackson-bom:2.x"))
    // any consumer's own jackson-databind version is now silently overridden
}
```

```kotlin
// build.gradle.kts — the library-safe form
dependencies {
    api(platform("com.fasterxml.jackson:jackson-bom:2.x"))
    // consumers who need a different jackson version still can
}
```

**When `enforcedPlatform()` is acceptable.** Exactly one shape: a leaf *application* module — never published as, or consumed as, a library — that needs a non-negotiable, coherent transitive version set across its own dependency graph (the textbook case is forcing a CVE-patched version onto every transitive user regardless of what any dependency's own POM asks for). The moment the module is `api`-published or `implementation`-depended-on by anything else, `enforcedPlatform()` becomes the anti-pattern the docs describe, because the override is transitive and the only defense a consumer has is `exclude(...)` per-dependency.

`spring-projects/spring-boot@93b23c40c2` is the corpus's only `enforcedPlatform(` user — 13 hits — and it is a library other projects depend on, the exact case the warning targets ([shape audit §6](../jvm-audit/exemplar-build-shape.md)). No other exemplar in the 32-repo corpus uses it at all.

### 3. Rich versions: strictly/require/prefer/reject and `!!`

Gradle's rich version block supports four declarations, strongest to weakest:

| Declaration | Behavior | Dynamic versions? |
|---|---|---|
| `strictly` (or `!!`) | Excludes any version that doesn't match. On a *direct* dependency it can even **downgrade** the resolved version. On a *transitive* dependency, resolution **fails** if no version in range satisfies it. | yes |
| `require` | The default behavior for a plain direct-dependency declaration. A floor: conflict resolution can still pick something higher. | yes |
| `prefer` | "The softest version declaration" — wins only if nothing stronger (a non-dynamic `strictly`/`require`) is declared elsewhere. | no |
| `reject` (outside the hierarchy) | Names versions that must never be selected; resolution fails if a rejected version would otherwise win. | yes |

([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html))

The `!!` shorthand is `strictly` inline:

```kotlin
dependencies {
    // short-hand
    implementation("org.slf4j:slf4j-api:1.7.15!!")
    // equivalent to
    implementation("org.slf4j:slf4j-api") { version { strictly("1.7.15") } }
}
```

Extended form combines a strict range with a preference: `"org:foo:[1.7, 1.8[!!1.7.25"` means *"must resolve inside `[1.7, 1.8[`, prefer `1.7.25` within that range."*

**Publishing is lossy.** Rich version metadata survives only in Gradle Module Metadata. Converting to a POM or Ivy descriptor loses information: **"The highest level of version declaration — strictly or require over prefer — will be published, and any `reject` will be ignored."** A Maven consumer resolving your published artifact never sees the `reject` list, and sees only the strongest surviving declaration, not the full richness ([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html)).

**The library warning, quoted verbatim:** "Using `strictly` in a library requires careful consideration, as it affects downstream consumers." A strict constraint from a library behaves like a forced version for anyone who depends on that library — it can make an otherwise-satisfiable consumer graph unresolvable. `strictly` belongs in an application's own top-level declarations (or to intentionally document known-incompatible ranges), not scattered through a published library's dependency block.

### 4. Version catalogs: declared, not resolved

A version catalog (conventionally `gradle/libs.versions.toml`) centralizes coordinates under `[versions]`, `[libraries]`, `[bundles]`, and `[plugins]` and exposes them as type-safe accessors (`libs.groovy.core`, an alias `ktor-client-core` becomes `libs.ktor.client.core`) ([version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html)).

**The exact boundary the brief asks to pin down**, quoted verbatim from Gradle's own docs: **"Overwriting a version only affects what is imported and used when declaring dependencies. The actual resolved dependency version may differ due to conflict resolution."** A catalog entry is a *request*; Gradle's normal conflict resolution (highest version wins, unless a `strictly`/platform constraint intervenes) still runs afterward and can produce a different resolved version than the one written in the TOML file.

```toml
# gradle/libs.versions.toml
[versions]
okio = "3.9.0"

[libraries]
okio = { module = "com.squareup.okio:okio", version.ref = "okio" }
```

Declaring `implementation(libs.okio)` here does **not** guarantee `okio:3.9.0` is what ends up on the runtime classpath — a transitive dependency elsewhere in the graph requesting `okio:3.10.0` wins under normal `require` conflict resolution, silently, with no build failure and no line in the catalog that changed.

**A catalog alone does not satisfy "versions are pinned."** Making the *resolved* graph deterministic needs one of:

- **dependency locking** — a checked-in lockfile records the actual resolved set and Gradle fails the build if resolution would produce something different (depth belongs to the sibling `locking-verification-supply-chain` dive, same `GRADLE-DEP` family), or
- **platform/BOM alignment** — a `platform(...)` import that participates in conflict resolution as a first-class constraint, narrowing what "wins" rather than merely stating a request.

A catalog without either is a single source of truth for what the build *asks for*, not a guarantee of what it *gets*.

**Detection: what a glob or grep can and cannot see.** 15/32 exemplars use the conventional path `gradle/libs.versions.toml` ([shape audit](../jvm-audit/exemplar-build-shape.md)), but two corpus repos prove a filename-only glob is unsound:

- `apollographql/apollo-kotlin@c145295b72:settings.gradle.kts:26-29` names its catalog file `gradle/libraries.toml` (no "versions" in the name at all) and wires it explicitly:

  ```kotlin
  dependencyResolutionManagement {
    versionCatalogs {
      create("libs") {
        from(files("gradle/libraries.toml"))
      }
    }
  }
  ```

  A rule that globs `**/gradle/libs.versions.toml` finds nothing here, even though the repo has a real, fully-wired catalog.

- `gradle/gradle` — the tool that *invented* version catalogs — does not use the conventional path for its own build either: it wires three named catalogs (`libs`, `testLibs`, `buildLibs`) programmatically from `build-logic-settings/settings.gradle.kts:17-27` ([shape audit](../jvm-audit/exemplar-build-shape.md)).

The reliable check is not a filename glob but a content grep: `grep -rn 'versionCatalogs\s*{' settings.gradle.kts` (finds the wiring regardless of the target filename) or `grep -rln 'alias(libs\.' **/*.gradle.kts` (finds catalog *usage* even when you can't find the declaration file by name).

**Naming and misuse.** Gradle's Best Practices name two catalog-specific practices: "Name Version Catalog Entries Appropriately" (dashes/underscores as separators, derived from group:artifact, avoid generic single-word names) and "Avoid Misusing Version Catalogs" — don't store unrelated shared strings or plugin-specific configuration in `[versions]`/`[libraries]`; use a catalog only for what it is, a dependency-coordinate table ([best_practices_dependencies.html](https://docs.gradle.org/current/userguide/best_practices_dependencies.html)).

A project can also *publish* its own version catalog via the `version-catalog` plugin: the catalog is packaged as a Maven artifact and imported by consumers through `dependencyResolutionManagement` in their own settings file — a MAY-level pattern (1/32 corpus repos, ktor; [M-H-08](../jvm-topic-map.md)).

### 5. DAGP: projectHealth, the four advice types, and fixDependencies

The Dependency Analysis Gradle Plugin (`com.autonomousapps.dependency-analysis` / `com.autonomousapps.build-health`) runs against modules with `java-library`, `org.jetbrains.kotlin.jvm`, KMP `jvm`/`androidLibrary` targets, or Android library/application plugins applied ([DAGP README](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc)).

`./gradlew buildHealth` runs the whole-project analysis; `./gradlew <module>:projectHealth` scopes it to one module. The **four dependency-related advice types**, quoted from the plugin's own wiki:

1. **Unused dependencies** which should be removed.
2. **Declared dependencies on the wrong configuration** (`api` vs `implementation` vs `compileOnly`) — variant-aware, so it can recommend `debugImplementation`.
3. **Transitively-used dependencies that ought to be declared directly**, and on which configuration.
4. **Unused annotation processors** that could be removed.

Plus one plugin-level category: **"plugins that are applied but which can be removed"** — currently checked for `kapt`, `java-library`, and `kotlin-jvm` ([DAGP Home wiki](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home)).

The JSON `Advice` model encodes the fix directly: `fromConfiguration` (where it's declared today, or absent if the dependency is transitive) and `toConfiguration` (where it should be, or absent if it should be removed entirely).

**Why `--upgrade` is the safe mode**, quoted from the README: with `./gradlew fixDependencies --upgrade`, "the `fixDependencies` task will not remove or 'downgrade' any dependency declarations. It will only add or 'upgrade' declarations (e.g., from `implementation` to `api`)." Plain `./gradlew fixDependencies` (no flag) *can* remove a dependency DAGP judges unused in the declaring module ([DAGP README](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc)).

This matters precisely because DAGP's unused-dependency detection is scoped to what the *declaring* module's own bytecode references — it cannot see that a consumer relies on a type the module re-exports transitively (a leaked `api` dependency the consumer's code imports directly through your module). Removing an "unused-looking" dependency in a published library can silently break every consumer that was relying on the transitive leak, with no signal until their build breaks. `--upgrade` mode is a one-way ratchet — safe to run unattended, because it only ever widens visibility (`implementation`→`api`) or adds a missing direct declaration, never narrows it.

```
# Rollout pattern for an existing library with unaddressed advice
./gradlew fixDependencies --upgrade     # safe: adds/upgrades only
# ... release, let consumers catch up ...
./gradlew fixDependencies               # unrestricted: now safe to remove/downgrade
```

## Normative guidance candidates

1. **A dependency whose type appears in a public superclass/interface, a public method signature, a public field, or a public annotation MUST be declared `api`; everything else MUST be `implementation`.**
   Rationale: this is Gradle's own ABI-boundary definition — anything narrower breaks consumer compilation later, anything wider leaks unnecessary classpath surface to every consumer.
   Verify: `./gradlew :module:projectHealth`; read the wrong-configuration section of the report. Empty = pass. (Not `compileJava` — the failure does not surface there.)

2. **A published library MUST NOT use `enforcedPlatform()`.**
   Rationale: it overrides even a consumer's own explicit version declaration, transitively, and the consumer's only defense is a per-dependency `exclude` — Gradle's own docs name this a caution specifically for reusable components.
   Verify: `grep -rn 'enforcedPlatform(' **/*.gradle.kts **/*.gradle` — any hit inside a module that is `api`-published or consumed as a library is a finding. (`spring-boot@93b23c40c2`, 13 hits, is the negative exemplar.)

3. **`enforcedPlatform()` is CONSIDER-acceptable only in a leaf application module that is never consumed by anything else** (no `api`-published artifact, not depended on by other modules in or outside the build).
   Rationale: the transitivity that makes it dangerous for a library is exactly the property that makes it useful for forcing a coherent, non-negotiable version set at the end of a dependency graph.
   Verify: confirm the module carries no `maven-publish`/`MavenPublication` and has zero project-to-project `implementation(project(...))` consumers before allowing the grep hit above to pass.

4. **A library's own dependency declarations MUST NOT use `strictly`/`!!`.**
   Rationale: a strict constraint from a library acts like a forced version for every consumer and can make an otherwise-resolvable consumer graph fail; it is also lossy when published (a POM only sees the strongest surviving declaration, and `reject` disappears entirely).
   Verify: `grep -rn 'strictly(\|!!"' **/*.gradle.kts` scoped to non-test, non-application source sets.

5. **Every dependency coordinate SHOULD come from a version catalog, but a catalog entry MUST NOT be read as "this version is what gets resolved."**
   Rationale: Gradle's own docs state the catalog constrains the declared request only; conflict resolution can still produce a different resolved version with no build failure and no diff in the catalog file.
   Verify: for "is a catalog present," do not glob only `**/gradle/libs.versions.toml` — grep `versionCatalogs\s*{` in every `settings.gradle*` and `alias\(libs\.` usage in build files, since apollo-kotlin (`gradle/libraries.toml`) and gradle/gradle itself (three named catalogs wired programmatically) both fail a filename-only check. For "is the version pinned," a catalog hit alone is NOT sufficient — require also a lockfile (`*.lockfile` present) or an enforced platform import before calling a version pinned.

6. **A library SHOULD run `./gradlew buildHealth` (via `com.autonomousapps.build-health`) as a CI gate**, with `dependencyAnalysis { issues { all { onAny { severity("fail") } } } }`.
   Rationale: it is the only measured mechanism in the corpus that catches wrong-configuration, unused-transitive, and unused-annotation-processor issues before a consumer's build does.
   Verify: `dependencyAnalysis` block present in the root build script with `severity("fail")` (or per-issue severities) set, not left at the default `warn`.

7. **`fixDependencies` MUST be run with `--upgrade` first for any library with pre-existing, unaddressed DAGP advice; unrestricted `fixDependencies` is CONSIDER-only, after a release cycle lets consumers absorb the widened surface.**
   Rationale: unrestricted auto-fix can remove or downgrade a declaration the declaring module doesn't need but a *consumer* does (a leaked transitive type) — `--upgrade` only ever widens visibility, never narrows it.
   Verify: check CI/release-runbook scripting for a bare `fixDependencies` invocation without `--upgrade` on a library module; flag it for review.

8. **A `gradlePlugin{}`-shipping module MUST be excluded from the api/implementation review above unless it also publishes as a consumable library artifact separately.**
   Rationale: `dependency-analysis-gradle-plugin`'s own "applications have no API" model applies structurally the same way to Gradle plugin modules whose only consumer is the Gradle plugin classloader, not a Java/Kotlin compile classpath — but this is a scoping note, not an exemption from the same rules for any library jar the plugin also ships.
   Verify: read heuristic only — check whether the module is declared under `gradlePlugin { plugins { ... } }` with no separate `java-library`-shaped public jar.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| 1 (api/implementation) | `gradle/gradle@ea17004a31` — 2051 `api(` / 1620 `implementation(` hits, disciplined split across a 25-year-old codebase ([shape audit §6](../jvm-audit/exemplar-build-shape.md)) | none measured directly — no exemplar's DAGP report was re-run in this dive; absence of a corpus-wide DAGP-adoption count is a gap (see Contested) |
| 2 (no enforcedPlatform in a library) | every corpus repo except one | **`spring-projects/spring-boot@93b23c40c2`** — 13 `enforcedPlatform(` hits, and spring-boot is unambiguously a library other projects depend on ([shape audit §6](../jvm-audit/exemplar-build-shape.md)) |
| 4 (no strictly/!! in a library) | `gradle/gradle@ea17004a31` uses `constraints{}` (2 hits) and `resolutionStrategy` (3 hits) rather than blanket `strictly` in its published modules ([shape audit §6](../jvm-audit/exemplar-build-shape.md)) | not individually re-measured per-repo in this dive; the `strictly(` grep in §3 above is untested against the corpus and should be run before shipping this row as MUST rather than SHOULD |
| 5 (catalog ≠ pinned; glob limits) | 15/32 repos at the conventional path ([shape audit](../jvm-audit/exemplar-build-shape.md)) | **`apollographql/apollo-kotlin@c145295b72:settings.gradle.kts:26-29`** — catalog named `gradle/libraries.toml`, invisible to a conventional-path glob; **`gradle/gradle@ea17004a31:build-logic-settings/settings.gradle.kts:17-27`** — three named catalogs wired programmatically, same blind spot |
| 5 (locking as the pinning complement) | none — **0/32 exemplars use dependency locking** ([shape audit](../jvm-audit/exemplar-build-shape.md)); this is the sharpest gap between "catalog present" and "versions actually pinned" measured anywhere in the corpus | — |
| 6/7 (DAGP as a gate) | not measured in this dive — no audit recorded which exemplars apply `com.autonomousapps.dependency-analysis`; **flagged as a surprise/gap below** | — |

## AI-agent angle

- **Confusing "my module compiles" with "the configuration is correct."** A model trained on `implementation`-by-default tutorials will happily leave a leaked type on `implementation` because the local build is green — it has no way to see the downstream consumer failure without being told to check DAGP. Mechanical check: never accept "the build passes" as evidence for an api/implementation change; require a `projectHealth`/`buildHealth` run in the same diff.
- **Reaching for `enforcedPlatform()` when it means `platform()`.** The two names differ by one word and an LLM asked to "pin a BOM's versions" will often pick the stronger-sounding one without knowing it changes the *transitivity* of the override. Mechanical check: `grep -rn 'enforcedPlatform(' **/*.gradle.kts` on any diff touching a published module; a hit is a stop-and-explain, not a style nit.
- **Treating a version catalog as equivalent to a lockfile.** Because catalogs are the newer, more-praised idiom in training data, a model will often claim "versions are pinned via the catalog" when no lockfile or platform constraint exists — the exact conflation the brief asks to correct. Mechanical check: before accepting a "dependencies are pinned" claim, require either a `*.lockfile` on disk or an explicit `platform(...)`/constraint import in the same review.
- **Hallucinating a `compileOnly` + `annotationProcessor` fix for an `api`/`implementation` finding.** These are two different rows (M-C-01 vs M-C-03) with different failure surfaces; a model conflating them will suggest `annotationProcessor` for a plain leaked-type problem, which does nothing. Mechanical check: confirm the DAGP advice line actually says `wrongConfiguration` (api/implementation/compileOnly), not `unusedAnnotationProcessors`, before applying either fix.
- **Assuming `gradle/libs.versions.toml` is the only valid catalog path** and reporting "no catalog found" on a repo like apollo-kotlin's. Mechanical check: grep for `versionCatalogs\s*{` in settings files before concluding a catalog is absent — never conclude from a single filename glob.
- **Writing `!!`-strict pins into a library's own build script "to be safe," carried over from application-shaped training examples.** Mechanical check: any `strictly(`/`!!` hit outside a `test`/`application`-plugin-bearing module in a diff that touches a published artifact should be flagged, not auto-applied.

## Contested / evolving

- **Corpus-wide DAGP adoption was not measured by any wave-1 audit or this dive.** The brief's numeric evidence (13 enforcedPlatform hits, 2051/1620 and 1045/350 api/implementation counts) comes from raw grep counts in the shape audit, not from actually running `projectHealth` against any exemplar — none of the 32 repos was confirmed to apply `com.autonomousapps.dependency-analysis` itself. Trending: DAGP is presented industry-wide (conference talks, its own README's "use cases") as the standard tool for this problem, but this dive cannot cite a single corpus repo using it. A follow-up measurement (`grep -rl 'autonomousapps.dependency-analysis' **/*.gradle.kts` across the corpus) would settle whether the OCX SDK would be adopting a widely-recommended-but-locally-unproven tool.
- **`compileOnlyApi` usage vs recommendation.** Documented clearly in `java_library_plugin.html`, but this dive did not measure how often exemplars actually use it versus how often they should (a shaded dependency referenced by public API type without `compileOnlyApi` is a silent gap DAGP's wrong-configuration advice would catch as "should be `compileOnlyApi`," but that specific advice subtype was not independently confirmed against the wiki).
- **The line between "catalog + platform alignment" and "catalog + locking" as the required pinning pair is this dive's synthesis, not a single normative Gradle statement** — Gradle's docs describe locking and platforms as separate features without an explicit joint statement that a catalog needs one of them. The synthesis follows directly from the "declared not resolved" quote plus the corpus's 0/32 locking measurement, but a reviewer should treat DECIDE (c) above as *this dive's answer*, cross-checked against the sibling locking dive rather than independently re-derived there.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/java_library_plugin.html](https://docs.gradle.org/current/userguide/java_library_plugin.html) | Official Gradle userguide, `java-library` plugin | Current docs (Gradle 9.7.1 site) | The primary, exact api/implementation/compileOnlyApi definitions |
| [docs.gradle.org/current/userguide/java_platform_plugin.html](https://docs.gradle.org/current/userguide/java_platform_plugin.html) | Official Gradle userguide, `java-platform` plugin | Current docs | How a BOM/platform is authored (`api`/`runtime` constraint blocks, `allowDependencies()`) |
| [docs.gradle.org/current/userguide/platforms.html](https://docs.gradle.org/current/userguide/platforms.html) | Official Gradle userguide, platform consumption | Current docs | The exact `platform()` vs `enforcedPlatform()` contract and the library-author warning |
| [docs.gradle.org/current/userguide/dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html) | Official Gradle userguide, rich versions | Current docs | strictly/require/prefer/reject hierarchy, `!!` shorthand, lossy-publish statement |
| [docs.gradle.org/current/userguide/version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html) | Official Gradle userguide, version catalogs | Current docs | The exact "declared, not resolved" statement; catalog publishing via the `version-catalog` plugin |
| [docs.gradle.org/current/userguide/best_practices_dependencies.html](https://docs.gradle.org/current/userguide/best_practices_dependencies.html) | Official Gradle "Best Practices for Dependencies" | Current docs | Named practices: centralize/name catalogs correctly, avoid misusing them, single-GAV-string form |
| [github.com/autonomousapps/dependency-analysis-gradle-plugin README.asciidoc](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc) | DAGP's own repository README | Fetched 2026-09-12, `main` branch | Exact `fixDependencies --upgrade` semantics, `projectHealth`/`buildHealth` task names |
| [github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home) | DAGP's own wiki, Home page | Fetched 2026-09-12 (cloned wiki repo) | The exact four dependency-advice categories plus the plugin-applied-but-unused advice |
| [github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/FAQ](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/FAQ) | DAGP's own wiki, FAQ page | Fetched 2026-09-12 | Operational gotchas (Kotlin-plugin classloader requirement, metaspace tuning) — used to confirm the FAQ does not (yet) define the four advice types, which live on Home instead |
| [jvm-audit/exemplar-build-shape.md](../jvm-audit/exemplar-build-shape.md) | This program's own wave-1 audit of the 32-repo exemplar corpus | Measured 2026-09-05/06 at the pinned SHAs | Source of every corpus count in this file (enforcedPlatform 13 hits in spring-boot, api/implementation counts, 15/32 conventional catalogs, 0/32 locking) |
| `apollographql/apollo-kotlin@c145295b72:settings.gradle.kts` | Exemplar corpus, direct read | Pinned SHA, read 2026-09-12 | Confirms the non-conventional `gradle/libraries.toml` catalog path and its exact wiring lines |
| `spring-projects/spring-boot@93b23c40c2` (grep target) | Exemplar corpus | Pinned SHA | The corpus's sole, and library-shaped, `enforcedPlatform()` user — the negative exemplar for rule 2 |
| `gradle/gradle@ea17004a31:build-logic-settings/settings.gradle.kts` | Exemplar corpus, cited via audit | Pinned SHA | The tool that invented version catalogs not using its own conventional filename — the sharpest glob-blind-spot evidence |
| [jvm-topic-map.md §3 dive brief and conflict 1](../jvm-topic-map.md) | This program's own phase-3 topic map | 2026-09-05, opus-authored | Binding scope decisions this dive follows: GRADLE-DEP family boundary, what the sibling locking dive owns, the exact DECIDE questions |
