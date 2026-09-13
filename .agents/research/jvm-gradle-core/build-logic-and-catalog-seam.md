---
title: "build-logic vs buildSrc and the version-catalog accessor seam"
topic: gradle-convention-plugin-layout
agent: jvm-gradle-core/build-logic-and-catalog-seam
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers where shared Gradle build logic should live (buildSrc vs an included
  build-logic build), the documented invalidation and caching differences
  between them, the two named caveats (Settings plugins, very-large
  subproject counts), and the version-catalog type-safe-accessor gap in
  precompiled script plugins (gradle/gradle#15383) with its supported
  workaround. Does not cover convention-plugin *content* (compiler flags,
  test wiring — GRADLE-PLUG territory), Kotlin Multiplatform build-logic
  shapes, or Bazel/Maven equivalents.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [buildSrc vs included build-logic: the documented trade-off](#1-buildsrc-vs-included-build-logic-the-documented-trade-off)
   2. [Caveat 1 — Settings plugins and build-logic-settings](#2-caveat-1--settings-plugins-and-build-logic-settings)
   3. [Caveat 2 — very-large subproject counts and Build Services](#3-caveat-2--very-large-subproject-counts-and-build-services)
   4. [The version-catalog accessor seam (#15383)](#4-the-version-catalog-accessor-seam-15383)
   5. [The supported workaround, in code](#5-the-supported-workaround-in-code)
   6. [Corpus layout census](#6-corpus-layout-census)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Gradle's own Best Practices page names an included build (typically `build-logic`) as **the preferred location for build logic, not `buildSrc`** — normative, but phrased as a recommendation, not a hard requirement ([docs](https://docs.gradle.org/current/userguide/best_practices_structuring_builds.html)).
- The load-bearing mechanical difference: **any change under `buildSrc` invalidates the whole configuration phase**, forcing recompilation and re-execution of every task; an included build's changes invalidate **only the projects that consume the changed subproject's output** ([docs: sharing_build_logic_between_subprojects](https://docs.gradle.org/current/userguide/sharing_build_logic_between_subprojects.html)).
- Severity here is **SHOULD, not MUST**: 9 of the 32-repo corpus's most actively maintained builds — dagger, grpc-java, Exposed, micronaut-core, mockito, kotlinx.coroutines, spring-boot (249-file/25,907-LOC `buildSrc`), testcontainers-java, NullAway — still ship on `buildSrc` in 2026. A rule that calls `buildSrc` a defect is wrong about 9 flagships out of 32.
- Gradle's docs name exactly two caveats where staying on `buildSrc`, or special-casing an included build, is still the right call: **Settings plugins** (need `pluginManagement{}` inclusion, which "reduces Build Caching capability") and **very-large subproject counts** (per-subproject classpath variation from different plugin combinations "can cause features like Build Services to break in difficult to diagnose ways").
- The documented fix for the Settings-plugin caveat is **a second, separate, minimal included build** (`build-logic-settings`), holding only Settings plugins, included via `pluginManagement { includeBuild("build-logic-settings") }` — never folded into the main `build-logic` module.
- Type-safe version-catalog accessors (`libs.guava`) generated for ordinary build scripts are **not generated inside precompiled script plugins** — confirmed still open as of the issue's last activity, 2026-06-22, with 171 comments and no shipped fix in Gradle 9.x ([gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383)).
- The **officially documented, non-hacky workaround** is the string-keyed `VersionCatalogsExtension` API: `extensions.getByType<VersionCatalogsExtension>().named("libs").findLibrary("guava").get()` (also `findVersion`, `findPlugin`) — this is what Gradle's own docs show and what a Gradle contributor on the issue calls "the way they are intended to be used in such a case" ([docs: version_catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html), [#15383 comment](https://github.com/gradle/gradle/issues/15383#issuecomment-1590558090)).
- A second, **unsupported** workaround exists (reflectively grabbing the internal `org.gradle.accessors.dm.LibrariesForLibs` class via `the<LibrariesForLibs>()`) — it restores dot-notation but relies on a Gradle-internal API, breaks across Gradle upgrades, breaks when applying one precompiled plugin from another, and has a known classloading bug in `buildSrc/test` ([#15383 thread](https://github.com/gradle/gradle/issues/15383)).
- Version-catalog access from `buildSrc` requires an extra step the main-build catalog does not: `buildSrc/settings.gradle.kts` must explicitly re-import the catalog via `dependencyResolutionManagement { versionCatalogs { create("libs") { from(files("../gradle/libs.versions.toml")) } } }` before it is visible even to `buildSrc`'s own `build.gradle.kts` dependencies block.
- There is **no accessor path at all** for `alias(libs.plugins.x)` inside a precompiled script plugin's `plugins {}` block — the block is extracted and evaluated against a dummy project before any version catalog exists, so even the string-keyed workaround cannot reach it. The supported pattern is to declare the plugin as a marker-artifact dependency (`<pluginId>:<pluginId>.gradle.plugin:<version>`) in `build-logic/build.gradle.kts` and `apply(plugin = "id")` in the script body instead.
- Nine years running (opened 2020-12-01), the issue remains open with no roadmap commitment; a maintainer (`melix`) states directly that arbitrary type-safe accessors for externally-supplied catalogs are architecturally hard because a precompiled-plugin build "does not know onto which build it eventually will be applied," so it cannot know which catalog entries will exist at compile time.
- A third-party plugin, [`radoslaw-panuszewski/typesafe-conventions-gradle-plugin`](https://github.com/radoslaw-panuszewski/typesafe-conventions-gradle-plugin), restores real dot-notation accessors in precompiled scripts; corpus and thread sentiment is split — some adopters use it, others avoid it for relying on Gradle internals and scanning the whole project tree for `.versions.toml` files.
- **build-logic-settings is not universally practised even among split-adopting repos.** gradle/gradle and ktor both carry a dedicated minimal settings-only included build (`build-logic-settings`, `build-settings-logic`); junit-framework instead includes two ordinary modules (`gradle/base`, `gradle/plugins`) together in one `pluginManagement{}` block without a settings-only third module; jjohannes's reference repo puts a Settings plugin in the *same* single `gradle/plugins` build-logic module with no split at all.
- For the future **OCX Gradle plugin** (a Settings plugin that provisions tools before projects configure): the build-logic-settings split is a repo-internal build-logic decision for the plugin's *own* development build, not something its consumers ever see — consumers apply the published plugin via ordinary `pluginManagement { plugins { id(...) version(...) } }`, never via `includeBuild`. It is a MUST only once that repo's own build grows a second, ordinary build-logic module and needs a Settings plugin drawn from build-logic early; on a single-module plugin repo it does not yet apply.
- Convention-plugin taxonomy in production reference material (jjohannes's `gradle-project-setup-howto`) groups plugins into four categories — `base.*`, `feature.*` (including `feature.*.settings.gradle.kts` for Settings plugins), `report.*`, `component.*` — living in one `gradle/plugins` included build; this is a concrete, citable taxonomy a rule can point to rather than inventing category names.

## Findings

### 1. buildSrc vs included build-logic: the documented trade-off

Gradle's Best Practices page states directly: *"The preferred location for build logic is an included build (typically called `build-logic`), not in `buildSrc`."* Four reasons are given, verbatim from the fetched page ([Best Practices: Structuring Builds](https://docs.gradle.org/current/userguide/best_practices_structuring_builds.html)):

1. **Classloader simplicity** — "There are classloader differences in how these 2 approaches behave that can be surprising; included builds are treated just like external dependencies, which is a simpler mental model."
2. **Finer-grained invalidation** — "Any change in `buildSrc` causes the entire build to become out-of-date, whereas changes in a subproject of an included build only cause projects in the build using the products of that particular subproject to be out-of-date." This is the exact invalidation difference the brief asks to pin down: `buildSrc` invalidation is all-or-nothing at the *configuration phase*; an included build's invalidation is scoped to the consumers of whichever subproject changed.
3. **Independent usability** — "Included builds are complete Gradle builds and can be opened, worked on, and built independently as standalone projects."
4. **Publishability** — the same independence makes it "straightforward to publish their products, including plugins, in order to share them with other projects."

The companion page adds the mechanism for `buildSrc` specifically: Gradle "compiles all classes and scripts in `buildSrc`… before evaluating any other build scripts" and "makes the compiled classes and scripts available on the classpath of all other project build scripts" — this single shared classpath, compiled as one unit ahead of everything else, is *why* any edit invalidates the whole configuration phase ([Sharing build logic between subprojects](https://docs.gradle.org/current/userguide/sharing_build_logic_between_subprojects.html)).

Despite the recommendation's strength, corpus measurement in [shape](../jvm-audit/exemplar-build-shape.md) shows a near-even split: 10 repos on an included build (gradle/gradle, ktor, detekt, shadow, sqldelight, ktlint, okhttp, nowinandroid, junit-framework, apollo-kotlin) against 9 still on `buildSrc` — dagger, grpc-java, Exposed, micronaut-core, mockito, kotlinx.coroutines, spring-boot, testcontainers-java, NullAway (frame table, corrected 2026-09-06). None of the 9 read as neglected or legacy; several ship `buildSrc`-internal helpers (dagger's `VersionCatalogs.kt`, see §5) that show active, careful engineering *within* `buildSrc`, not abandonment of it.

### 2. Caveat 1 — Settings plugins and build-logic-settings

Gradle's own Best Practices page names this caveat explicitly: *"One important caveat to this recommendation is when creating `Settings` plugins. Defining these in a `build-logic` project requires it to be included in the `pluginManagement` block of the main build's `settings.gradle(.kts)` file, in order to make these plugins available to the build early enough to be applied to the `Settings` instance. This is possible, but reduces Build Caching capability, potentially impacting performance."* The documented fix: *"A better solution is to use a separate, minimal, included build (e.g. `build-logic-settings`) to hold only `Settings` plugins."*

Why pluginManagement inclusion costs caching: a build included via `pluginManagement { includeBuild(...) }` must be built and its plugins made available **before Gradle can even start evaluating `settings.gradle.kts`** — i.e., before the configuration cache or any project-level cache entry can exist yet. Folding ordinary project convention plugins into the same module forces them through that same early, cache-poor path even though they don't need it.

Corpus confirmation, at the SHA:

- `gradle__gradle@ea17004a31:settings.gradle.kts:9-11` — `pluginManagement { repositories { gradlePluginPortal() }; includeBuild("build-logic-settings") }`, with ordinary project build-logic pulled in *separately*, later, as `includeBuild("build-logic-commons")` / `includeBuild("build-logic")` (not inside `pluginManagement`).
- `gradle__gradle@ea17004a31:build-logic-settings/` contains five settings-only sub-builds (`architecture-docs`, `build-environment`, `configuration-cache-compatibility`, `default-settings-plugins`, `version-catalogs`), each a tiny module whose own `build.gradle.kts` produces exactly one `*.settings.gradle.kts` precompiled plugin.
- `ktorio__ktor@f92fad0435:settings.gradle.kts:8-17` mirrors this: `pluginManagement { ...; includeBuild("build-settings-logic") }`, and ktor's ordinary `build-logic` is a separate, larger module included later.

Not every split-adopting repo goes this far, though: `junit-team__junit-framework@35c56a8e02:settings.gradle.kts:2-4` includes **two** ordinary-shaped modules (`gradle/base`, `gradle/plugins`) directly inside the same `pluginManagement{}` block, with no dedicated settings-only third module — its Settings plugin (`junitbuild.settings-conventions`) simply lives in one of those two. jjohannes's `gradle-project-setup-howto` goes further still: a *single* `gradle/plugins` build-logic module holds both ordinary and `*.settings.gradle.kts` plugins side by side, and the whole module is included via `pluginManagement { includeBuild("gradle/plugins") }` — see [Contested / evolving](#contested--evolving).

### 3. Caveat 2 — very-large subproject counts and Build Services

The second named caveat, verbatim from the Best Practices page: *"Another potential reason to use `buildSrc` is if you have a very large number of subprojects within your included `build-logic`. Applying a different set of `build-logic` plugins to the subprojects in your **including** build will result in a different classpath being used for each. This may have performance implications and make your build harder to understand."* And directly: *"Using different plugin combinations can cause features like Build Services to break in difficult to diagnose ways."*

The mechanism: an included build's subprojects each compile to their own classpath; if the *consuming* build applies different combinations of those subprojects' plugins to different consuming subprojects, each ends up on a distinct classpath/classloader. A [Build Service](https://docs.gradle.org/current/userguide/build_services.html) is meant to be a single shared instance across a build, but a Build Service class loaded from two different classloaders is treated as two different types by the JVM — hence the "difficult to diagnose" failure mode (a `ClassCastException` or a service silently not being shared) rather than a build error.

No corpus repo was found citing a Build-Service break directly (none of the 32 repos names this failure in a commit message or comment reachable at the SHAs measured); this caveat is carried here as Gradle's own documented reasoning, not as a corpus-confirmed incident, and a rule row should say so rather than imply it was observed.

### 4. The version-catalog accessor seam (#15383)

[gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383), "Make generated type-safe version catalogs accessors accessible from precompiled script plugins," opened 2020-12-01, **still open**, last comment 2026-06-22, 171 comments, 387 reactions on the issue body as of the topic map's count. Full-thread read (not just the title) confirms:

- **The root cause is architectural, not a bug queued for a fix.** A Gradle contributor (`Vampire`) lays it out precisely: type-safe accessors are only generated for things Gradle can prove will exist at runtime. For a `plugins {}` block, Gradle extracts it, applies it to a dummy project, and inspects what got added to generate accessors for. But a precompiled script plugin living in `buildSrc` or an included `build-logic` is compiled **standalone**, before Gradle knows which consuming build (and which version catalog, with which entries) will apply it — "this project does not know onto which build it eventually will be applied." A former Gradle employee (`melix`) confirms this on the same thread and adds a second problem: nothing stops a `build-logic`/`buildSrc` catalog from being published externally, so making catalogs blindly visible risks leaking catalog contents into published plugin artifacts.
- **No milestone, no roadmap commitment, as of the last read (2026-06-22).** A comment from a Kotlin Konf 2026 attendee ("I'm at Kotlin Konf 26 and have this exact issue... 7 years old") got only a community reply pointing at *other* still-open type-safe-accessor issues ([#17379](https://github.com/gradle/gradle/issues/17379), [#16608](https://github.com/gradle/gradle/issues/16608)), not a Gradle-team commitment.
- **9.x changed nothing here.** No comment in the full thread, and nothing in the fetched `version_catalogs.html` doc page, indicates any 9.x-era change to this specific gap — the last comments (2026) are still discussing the same string-keyed and internal-class workarounds used since 2021.
- **The `plugins {}` block has no workaround at all**, supported or unsupported: since the block is evaluated against a dummy project before any real project (and its catalog) exists, `alias(libs.plugins.x)` cannot resolve inside a precompiled script plugin under any known trick, confirmed independently by two thread participants (`yogurtearl`, `Vampire`) years apart.

### 5. The supported workaround, in code

Gradle's own docs and the thread converge on the same shape: reach the catalog through `VersionCatalogsExtension` by name, using the `find*` methods, which return `Optional<Provider<...>>`/`Optional<...>` rather than dot-notation accessors.

```kotlin
// gradle/plugins/src/main/kotlin/example.jvm-conventions.gradle.kts  (a precompiled script plugin)
val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")

dependencies {
    implementation(libs.findLibrary("guava").get())
}

jacoco.toolVersion = libs.findVersion("jacoco").get().requiredVersion
```

For a plugin id + version (the `plugins {}`-block case), declare the plugin as an ordinary dependency using its marker-artifact GAV and apply it programmatically instead of through `alias(...)`:

```kotlin
// build-logic/build.gradle.kts
dependencies {
    implementation(libs.kotlin.gradle.plugin)   // ordinary catalog entry, works fine here
}
```
```kotlin
// build-logic/src/main/kotlin/example.kotlin-conventions.gradle.kts
plugins {
    // no accessor reachable here — apply by id instead of `alias(libs.plugins.kotlin.jvm)`
    id("org.jetbrains.kotlin.jvm")
}
```

For `buildSrc` specifically, the catalog must be re-imported before even the string-keyed API works, because `buildSrc` is its own independent Gradle build and does not automatically inherit `dependencyResolutionManagement` from the root:

```kotlin
// buildSrc/settings.gradle.kts
dependencyResolutionManagement {
    versionCatalogs {
        create("libs") {
            from(files("../gradle/libs.versions.toml"))
        }
    }
}
```

**The unsupported alternative**, shown for contrast and explicitly to be flagged in review rather than copied:

```kotlin
// Unsupported: reaches into a Gradle-internal generated class.
// Breaks across Gradle versions, breaks when one precompiled plugin
// applies another, and has a known classloading bug under buildSrc/test.
import org.gradle.accessors.dm.LibrariesForLibs
val libs = the<LibrariesForLibs>()
dependencies {
    implementation(libs.guava)   // dot-notation restored, at this cost
}
```

### 6. Corpus layout census

Real code from the corpus, all using the supported string-keyed API — confirming this is standard practice, not a theoretical fallback:

- `google__dagger@4fbc045d2b:buildSrc/src/main/kotlin/dagger/gradle/build/VersionCatalogs.kt:1-38` — a dedicated `Project.versionCatalog` extension property plus `getVersionByName`/`getPluginIdByName` helpers wrapping `VersionCatalogsExtension.find("libs")`, `findVersion`, `findPlugin`. This is the cleanest corpus example of centralizing the workaround into one small file rather than repeating it per convention plugin.
- `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/module.gradle.kts:14,16,59,88,98` — `val versionCatalog = versionCatalogs.named("libs")` at the top of the file, then `versionCatalog.findVersion("jacoco").get().requiredVersion` etc. reused four times in one convention plugin.
- `square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.jvm-conventions.gradle.kts:9-13` — `val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")` plus small local `library(alias)`/`version(alias)` helper functions built on `findLibrary`/`findVersion`.

## Normative guidance candidates

1. **Prefer an included `build-logic` build over `buildSrc` for new convention-plugin work; do not treat an existing `buildSrc` as a defect to migrate away from.**
   Rationale: an included build scopes invalidation to actual consumers instead of the whole configuration phase, per Gradle's own Best Practices page; but 9/32 corpus flagships (including spring-boot's 249-file `buildSrc`) show the SHOULD is correctly a SHOULD, not a MUST.
   Verify: `test -d buildSrc && ! grep -q 'includeBuild' settings.gradle*` flags a `buildSrc`-only build for the *recommendation*, not a required fix; a reviewer reads this as "consider migrating," never as a required change.

2. **Any Settings plugin in the repo's own build-logic MUST live in a separate, minimal included build (e.g. `build-logic-settings`), included only via `pluginManagement { includeBuild(...) }`, once that repo already carries an ordinary build-logic module.**
   Rationale: folding a Settings plugin into the same module as ordinary convention plugins forces the whole module through the pre-configuration-cache `pluginManagement` path, per Gradle's own documented caveat.
   Verify: `grep -n 'includeBuild' settings.gradle.kts` inside the `pluginManagement{}` block — if the included path also contains non-`*.settings.gradle.kts` precompiled plugins, flag it. Confirmed shape: `gradle__gradle@ea17004a31:build-logic-settings/` and `ktorio__ktor@f92fad0435:build-settings-logic/` contain **only** `*.settings.gradle.kts`-suffixed plugin sources.

3. **Never write a version-catalog dot-notation accessor (`libs.guava`) inside a precompiled script plugin.** It will not compile — accessors are not generated for precompiled scripts, and no Gradle version through 9.x changes this.
   Rationale: confirmed root cause in [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383) — the precompiled plugin is compiled standalone before any consuming catalog is known.
   Verify: `grep -rn 'libs\.[a-zA-Z]' build-logic/**/src/main/kotlin/*.gradle.kts` — any match that is not `val libs = ...VersionCatalogsExtension...` assigned locally is a compile-time bug waiting to surface. (Note: the local variable is conventionally also named `libs`, so check it resolves via `extensions.getByType<VersionCatalogsExtension>()`, not via the catalog's generated class.)

4. **Inside a precompiled script plugin, read catalog coordinates through `extensions.getByType<VersionCatalogsExtension>().named("<catalog>")` and its `findLibrary`/`findVersion`/`findPlugin` methods — never through the internal `LibrariesForLibs` (or per-catalog `LibrariesFor<Name>`) generated class.**
   Rationale: the internal class is not a public API — it breaks across Gradle upgrades, breaks when one precompiled plugin applies another, and has a documented classloading failure under `buildSrc/test` ([#15383 comment thread](https://github.com/gradle/gradle/issues/15383)).
   Verify: `grep -rn 'org.gradle.accessors.dm' build-logic/ buildSrc/` — any hit is the unsupported workaround; flag for replacement with the `VersionCatalogsExtension` form.

5. **A plugin id consumed via `alias(libs.plugins.x)` inside a precompiled script plugin's `plugins {}` block MUST instead be declared as a marker-artifact dependency (`<pluginId>:<pluginId>.gradle.plugin:<version>`) in the build-logic module's own `dependencies {}`, and applied by `id("...")` or `pluginManager.apply("...")` in the script body.**
   Rationale: the `plugins {}` block is evaluated against a dummy project before any catalog exists at all — confirmed independently by two `#15383` participants years apart; no accessor, supported or not, reaches it.
   Verify: `grep -n 'alias(libs.plugins' build-logic/**/*.gradle.kts` inside a file that is itself a precompiled *script plugin* (as opposed to the top-level `build-logic/build.gradle.kts`, where `alias(...)` in `dependencies {}` is fine) — a hit there will fail to compile.

6. **`buildSrc/settings.gradle.kts` must explicitly re-declare the main build's version catalog via `dependencyResolutionManagement { versionCatalogs { create("libs") { from(files("<path>/libs.versions.toml")) } } }` before any catalog access (string-keyed or otherwise) works inside `buildSrc`.**
   Rationale: `buildSrc` is an independent Gradle build and does not inherit `dependencyResolutionManagement` from the root by default (`docs.gradle.org` version_catalogs page).
   Verify: if `buildSrc/build.gradle.kts` references `libs.*` or `versionCatalogs.named("libs")` anywhere, `buildSrc/settings.gradle.kts` must contain a matching `versionCatalogs { create(...) }` block, or the build fails at `buildSrc` configuration time with an unresolved catalog.

7. **The future OCX Gradle plugin's own development build does not need a `build-logic-settings` split on day one (single-module plugin repo); it becomes a MUST the moment that repo grows a second, ordinary build-logic module while still needing a Settings plugin available early.**
   Rationale: the split is a repo-internal build-logic decision about the plugin *author's* own build, not something consumers of the published plugin ever encounter — consumers apply it via ordinary `pluginManagement { plugins { id("...") version("...") } }`, never `includeBuild`.
   Verify: reading heuristic — check whether the plugin repo's own `settings.gradle.kts` has both (a) an `includeBuild` inside `pluginManagement{}` and (b) that included build also containing non-Settings convention plugins. If both are true, require the split; if the repo is still single-module, no action needed yet.

8. **Do not use `allprojects {}` / `subprojects {}` for cross-cutting build configuration as a substitute for either `buildSrc` or `build-logic`.**
   Rationale: Gradle's own docs name this an anti-pattern that "obscures build logic and introduces coupling that prevents optimizations" (fetched from `sharing_build_logic_between_subprojects.html`); one corpus repo (`apache__kafka@940c100fab:build.gradle`, a 4425-line root file) is the corpus's starkest example of the smell this guidance warns against (per [M-B-04](../jvm-topic-map.md) in the topic map).
   Verify: `grep -n 'subprojects\s*{' build.gradle.kts` in the root build file — any match outside of trivial `group`/`version` assignment is a candidate for conversion to a convention plugin.

## Exemplar evidence

| Candidate | Satisfies | Violates / contradicts |
|---|---|---|
| #1 (build-logic preferred, buildSrc not a defect) | gradle/gradle, ktor, detekt, shadow, sqldelight, ktlint, okhttp, nowinandroid, junit-framework, apollo-kotlin (10/32, included build) | dagger, grpc-java, Exposed, micronaut-core, mockito, kotlinx.coroutines, spring-boot, testcontainers-java, NullAway (9/32, `buildSrc`) — none flagged as a defect by this rule |
| #2 (settings-plugin split) | `gradle__gradle@ea17004a31:build-logic-settings/` (5 settings-only sub-modules); `ktorio__ktor@f92fad0435:build-settings-logic/` | `junit-team__junit-framework@35c56a8e02:settings.gradle.kts:2-4` includes ordinary `gradle/base` + `gradle/plugins` together, no settings-only module — see Contested section |
| #3/#4 (string-keyed VersionCatalogsExtension, no dot-notation in precompiled plugins) | `google__dagger@4fbc045d2b:buildSrc/src/main/kotlin/dagger/gradle/build/VersionCatalogs.kt`; `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/module.gradle.kts:14`; `square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.jvm-conventions.gradle.kts:9` | none found — no corpus repo at the measured SHAs uses the internal `LibrariesForLibs` hack in checked-out convention plugins |
| #6 (buildSrc catalog re-import) | pattern documented in `docs.gradle.org/current/userguide/version_catalogs.html`; not independently re-verified against a corpus `buildSrc/settings.gradle.kts` in this pass (would require re-measurement beyond brief scope) | — |
| #8 (no subprojects{} cross-config) | most Gradle-DSL repos in corpus use convention plugins | `apache__kafka@940c100fab:build.gradle` (4425 lines, root-level `subprojects {}` configuring everything inline) |

## AI-agent angle

- **Writing `libs.guava` (or any dot-notation catalog accessor) directly inside a file under `build-logic/**/src/main/kotlin/*.gradle.kts` or `buildSrc/**/src/main/kotlin/*.gradle.kts`.** This compiles fine in an LLM's mental model because it works everywhere else in a Gradle Kotlin DSL build — training data is saturated with `libs.guava` in ordinary `build.gradle.kts` files, and the precompiled-script-plugin restriction is a narrow, easy-to-miss exception. Mechanical check: any `libs.<segment>` reference inside a file matching `*/src/main/kotlin/*.gradle.kts` under a `build-logic`/`buildSrc` directory, where the file does not itself locally bind `libs` via `extensions.getByType<VersionCatalogsExtension>()`, is either a compile error or (worse) accidentally correct because a stray internal-class import made it resolve — both are wrong for different reasons.
- **Recommending the internal `org.gradle.accessors.dm.LibrariesForLibs` hack as if it were the sanctioned fix**, because multiple StackOverflow-era answers and blog posts (pre-dating the docs page's own current VersionCatalogsExtension example) present it as *the* solution rather than as a known-fragile workaround. Mechanical check: `grep -rn 'org.gradle.accessors.dm'` in any generated `build-logic`/`buildSrc` code.
- **Suggesting `alias(libs.plugins.x)` inside a precompiled script plugin's `plugins {}` block** as a fix for a "plugin version not found" error, when no version of Gradle through 9.x supports this at all — an LLM pattern-matches on the syntax working in ordinary build scripts and does not know the `plugins {}` block is evaluated against a dummy project with no catalog present.
- **Calling `buildSrc` "deprecated" or "legacy."** It is neither — Gradle has made no deprecation announcement, and 9/32 actively maintained corpus flagships use it in 2026. An LLM trained on strongly-worded "always use build-logic" blog posts characteristically overstates this into a false deprecation claim. Mechanical check: a rule row or generated comment using the words "deprecated" or "legacy" about `buildSrc` should be flagged and corrected to "SHOULD migrate; not required."
- **Proposing a single `build-logic` module that mixes a Settings plugin with ordinary project convention plugins** without naming the caching cost, because the two-caveat structure of Gradle's own guidance is easy to compress into "just put everything in `build-logic`." Mechanical check: does the generated/reviewed `settings.gradle.kts`'s `pluginManagement { includeBuild(...) }` target a module that also contains non-`*.settings.gradle.kts` files? If yes and the repo is large/multi-module, this is the exact anti-pattern the caveat warns against.
- **Assuming the version-catalog accessor gap was fixed in some recent Gradle release** because an LLM's training data includes speculative "coming in Gradle X" comments from the issue thread's history (the issue has had multiple false-hope moments since 2020). Mechanical check: re-fetch [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383) state before asserting it is closed; as of 2026-09-12 it is open.

## Contested / evolving

- **Whether the Settings-plugin split needs its own dedicated module, or can share a module with ordinary convention plugins, is not settled practice.** Gradle's own giant build (`gradle/gradle`) and ktor both go to the trouble of a dedicated `build-logic-settings`/`build-settings-logic` module holding *only* Settings plugins. junit-framework includes two ordinary-shaped modules together in `pluginManagement{}` without a settings-only module. jjohannes's widely-cited reference repo (`gradle-project-setup-howto`, a Gradle Developer Advocate's own teaching material) puts a Settings plugin in the *same* single `gradle/plugins` module as everything else, with the whole module in `pluginManagement{}`. Reading the corpus, the split appears to correlate with build *size* (subproject count, build-logic module count) rather than being a categorical best practice independent of scale — a small build-logic build does not yet pay a caching cost worth splitting for. As of 2026-09, no source states a subproject-count threshold; this is an unresolved judgment call the rule should surface as "SHOULD once build-logic itself is multi-module," not a bright line.
- **The version-catalog accessor gap (#15383) shows no sign of being fixed** and, per a maintainer's own words on the thread, may be architecturally intractable rather than merely unprioritized — trending toward "permanently a documented limitation with a supported workaround," not toward a future fix. Third-party plugins (`typesafe-conventions-gradle-plugin`) are trending upward in visibility on the thread (mentioned twice in 2026 comments) but remain a minority choice; corpus measurement at the fetched SHAs found zero adopters of that specific plugin.
- **`buildSrc` vs included build-logic adoption itself may still be shifting**, but the corpus captures a snapshot (SHAs dated 2026-09-05/06) showing a near-even 10/9 split rather than a clear trend line — this file cannot claim a direction, only the current state, without re-measuring the same repos at an earlier date.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org: Best Practices — Structuring Builds](https://docs.gradle.org/current/userguide/best_practices_structuring_builds.html) | Official Gradle userguide | Gradle 9.x current docs | Primary source for the buildSrc-vs-build-logic recommendation and both named caveats, verbatim |
| [docs.gradle.org: Sharing build logic between subprojects](https://docs.gradle.org/current/userguide/sharing_build_logic_between_subprojects.html) | Official Gradle userguide | Gradle 9.x current docs | Primary source for the exact invalidation-scope mechanism and the `buildSrc` compilation model |
| [docs.gradle.org: Version Catalogs](https://docs.gradle.org/current/userguide/version_catalogs.html) | Official Gradle userguide | Gradle 9.x current docs | Primary source for the `VersionCatalogsExtension` workaround, the `buildSrc` catalog re-import requirement, and type-safe accessor generation rules |
| [blog.gradle.org: Best practices for naming version catalog entries](https://blog.gradle.org/best-practices-naming-version-catalog-entries) | Official Gradle blog | Current | Primary; naming-convention rules for catalog aliases (not accessor-seam content, but a required source per brief) |
| [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383) | GitHub issue, official Gradle repo, full 171-comment thread read | Opened 2020-12-01, still open, last activity 2026-06-22 | Primary; the definitive record of the accessor gap, its architectural cause (per Gradle contributors/ex-employee), every workaround tried, and current (non-)status |
| [jjohannes/gradle-project-setup-howto](https://github.com/jjohannes/gradle-project-setup-howto) (README + `gradle/plugins/build.gradle.kts` + `feature.use-all-catalog-versions.gradle.kts`) | Reference repo by a Gradle Developer Advocate | Actively maintained | Primary; a concrete, opinionated convention-plugin taxonomy (base/feature/report/component) and a real string-keyed catalog-access convention plugin |
| `gradle/gradle@ea17004a31` (exemplar corpus) | The build tool's own build | Measured 2026-09-05 | Ground truth for the full `build-logic-settings`/`build-logic-commons`/`build-logic` three-way split at scale |
| `ktorio/ktor@f92fad0435` (exemplar corpus) | Kotlin server framework | Measured 2026-09-05 | Second corpus example of the dedicated settings-only module (`build-settings-logic`) |
| `google/dagger@4fbc045d2b` (exemplar corpus) | DI framework, `buildSrc`-based | Measured 2026-09-05 | Cleanest corpus example of centralizing the string-keyed catalog workaround into one helper file inside `buildSrc` |
| `detekt/detekt@45672efb8b` (exemplar corpus) | Kotlin static-analysis tool, included build-logic | Measured 2026-09-05 | Corpus example of the string-keyed workaround used repeatedly within one convention plugin |
| `square/okhttp@dfcfab3824` (exemplar corpus) | HTTP client, included build-logic | Measured 2026-09-05 | Corpus example of wrapping `VersionCatalogsExtension` in small local helper functions |
| `junit-team/junit-framework@35c56a8e02` (exemplar corpus) | JUnit itself, two-module build-logic without a settings-only split | Measured 2026-09-05 | Counter-example showing the settings-split is not universal even among included-build adopters |
| [jvm-audit/exemplar-build-shape.md](../jvm-audit/exemplar-build-shape.md) | This program's own wave-1 audit | 2026-09-05 | Source of the 10-vs-9 buildSrc/build-logic corpus count and the kafka `subprojects{}` finding, re-cited rather than re-measured |
| [jvm-topic-map.md](../jvm-topic-map.md), Conflict #4 and rows M-B-01–M-B-03 | This program's own adjudicated map | 2026-09-05 | The binding prior adjudication (SHOULD, not MUST) this file confirms rather than re-decides |
