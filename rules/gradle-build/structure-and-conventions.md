---
title: Build Structure and Convention Plugins
summary: The GRADLE-STRUCT family, which owns where shared build logic lives, how a precompiled script plugin reaches the version catalog, and the silent failures of the settings file
---

# Build Structure and Convention Plugins

Owns the shape of a Gradle build: which build shared logic lives in, how a
precompiled script plugin reaches a version catalog, what the root build file is
allowed to configure, and the settings-time decisions that fail without a message
(project-name collisions, misplaced `org.gradle.*` keys, an ungated build-cache
push). It does not own what goes *into* a catalog, locking or verification
metadata, which are `GRADLE-DEP` in `dependencies.md`. It does not own task
annotations or configuration-cache compatibility, which are `GRADLE-CACHE` in
`caching-and-correctness.md`. Authoring, testing and publishing a plugin
(including settings-time `BuildService` provisioning and `validatePlugins`) is
`GRADLE-PLUG` in `plugin-authoring.md`, and toolchain and wrapper pins are
`GRADLE-TOOL` in `toolchains-and-compilation.md`. `GRADLE-CI` in `ci.md` cites
`GRADLE-STRUCT-12` rather than restating it.

Contents: [Scope](#scope) · [Where Build Logic Lives](#where-build-logic-lives) ·
[The Catalog Seam in Precompiled Script Plugins](#the-catalog-seam-in-precompiled-script-plugins) ·
[The Root Build File and the Module List](#the-root-build-file-and-the-module-list) ·
[The Resolved Project List](#the-resolved-project-list) ·
[Every gradle.properties in the Tree](#every-gradleproperties-in-the-tree) ·
[Every Settings File and Settings Plugin](#every-settings-file-and-settings-plugin) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **`./gradlew build` fails for none of this.** Four of the twelve rules below
  describe defects that produce no message at all: a dropped project on a
  classpath, an `org.gradle.*` key nobody reads, a cache push from an untrusted
  run, and a module appended beside a generator instead of through it. The rest
  fail at a point far from the edit that caused them.
- **Kotlin DSL is the example language throughout.** A Groovy build is not a
  finding. Two public flagships in the survey ship hundreds of Groovy build files
  and no Kotlin ones.
- **Measured against Gradle 9.0.0 through 9.7.1 and a 32-repo survey of public
  JVM flagships, verified 2026-09-12.** Counts below come from that survey.
  Install this file with the `gradle-build` glob set, which reaches
  `*.gradle.kts`, `*.gradle`, `gradle.properties` and `*.versions.toml`. Note
  that `**/*.gradle.kts` covers `settings.gradle.kts` and every precompiled
  `*.settings.gradle.kts`, but a *grep* written for settings files does not,
  which is why every settings-shaped command below names `*.settings.gradle.kts`
  explicitly.

## Where Build Logic Lives

```bash
# Read the root settings file end to end first, then:
grep -rn --include='settings.gradle.kts' --include='settings.gradle' \
  -e 'includeBuild' -e 'pluginManagement' -e 'rootProject.name' .
ls -d build-logic buildSrc 2>/dev/null
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-01 | Put new shared build logic in an included build wired by `includeBuild("build-logic")` in the root settings file. Never call an existing `buildSrc` deprecated, legacy, or a defect, and never propose migrating one as a required fix. **Pinned default:** a greenfield repo starts with `build-logic`, an adopter may override that once for their own tree. | Any change under `buildSrc` invalidates the whole configuration phase, while an included build invalidates only the consumers of the changed subproject. But 9 of 32 actively maintained flagships still ship `buildSrc`, and Gradle has announced no deprecation as of 9.7.1 (verified 2026-09-12). "Preferred" is the strongest word the docs use, so a migration demand is a false blocker. | Gate block above. A `buildSrc` directory with no `includeBuild` in the root settings file marks a candidate for the *recommendation*, never a defect. A review comment using the words "deprecated" or "legacy" about `buildSrc` is itself the finding. | SHOULD |
| GRADLE-STRUCT-02 | When one build-logic build holds **both** Settings plugins (`*.settings.gradle.kts`) and ordinary convention plugins, split the Settings plugins into a separate minimal included build reached only from `pluginManagement { includeBuild(...) }`. | A build included from `pluginManagement` must be built before `settings.gradle.kts` is evaluated, which is before any configuration-cache entry can exist. Gradle's own caveat is that this "reduces Build Caching capability", so dragging ordinary convention plugins through that path costs caching for no benefit. 3 of 32 repos split, and ktor's `build-settings-logic` is the cleanest copy target because it contains nothing else. | Gate block above. If the build named by `pluginManagement { includeBuild(...) }` also contains precompiled plugins whose file names do **not** end `.settings.gradle.kts`, that is the finding. No `pluginManagement { includeBuild(...) }` at all means there is no split to audit, which is the pass. | SHOULD |

## The Catalog Seam in Precompiled Script Plugins

Type-safe catalog accessors are not generated for precompiled script plugins:
the plugin is compiled standalone, before Gradle knows which build, and so which
catalog, will apply it. [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383)
has been open since 2020-12-01 and is still open as of 2026-09-12. Nothing in
9.x changed it, and the thread's several false-hope moments make "surely fixed"
the plausible completion. One grep set catches all four rows.

```bash
grep -rn --include='*.gradle.kts' -e 'libs\.' -e 'org.gradle.accessors.dm' \
  -e 'alias(libs.plugins' build-logic buildSrc 2>/dev/null
grep -n -e 'versionCatalogs' buildSrc/settings.gradle.kts 2>/dev/null
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-03 | Never write a dot-notation catalog accessor (`libs.guava`, `libs.versions.jacoco`) inside a precompiled script plugin. Bind the catalog locally with `extensions.getByType<VersionCatalogsExtension>().named("libs")`, then call `findLibrary(...)`, `findVersion(...)` or `findPlugin(...)`. | The accessors do not exist in that compilation unit, so the plugin fails to compile, and the error surfaces at the consuming build rather than at the edit. | `grep -rn --include='*.gradle.kts' -e 'libs\.' build-logic buildSrc 2>/dev/null` and open each hit. A hit in a file that does not itself bind `libs` from `VersionCatalogsExtension` is the finding. Empty output is the pass. A repo with neither directory prints nothing and passes vacuously. | MUST |
| GRADLE-STRUCT-04 | Never import `org.gradle.accessors.dm.LibrariesForLibs`, or a per-catalog `LibrariesForX`, to restore dot notation. | It is a Gradle-internal generated class. It breaks across Gradle upgrades, breaks when one precompiled plugin applies another, and has a known classloading failure under `buildSrc` test source sets. Pre-documentation blog answers present it as *the* fix, so models reach for it. 0 of 32 surveyed repos use it. | `grep -rn -e 'org.gradle.accessors.dm' build-logic buildSrc 2>/dev/null`. Any hit is the finding, empty output is the pass. | MUST |
| GRADLE-STRUCT-05 | Never write `alias(libs.plugins.x)` inside a precompiled script plugin's `plugins {}` block. Declare the plugin's marker artifact in the build-logic module's own `dependencies {}` and apply it by `id("...")` in the script body. | The `plugins {}` block is extracted and evaluated against a dummy project before any catalog exists. There is no workaround, supported or otherwise, for this one case, and no Gradle version has ever accepted it. | `grep -rn --include='*.gradle.kts' -e 'alias(libs.plugins' build-logic buildSrc 2>/dev/null`. A hit inside a precompiled *script plugin* is the finding. A hit in `build-logic/build.gradle.kts` itself is correct and is the pass. | MUST |
| GRADLE-STRUCT-06 | If anything under `buildSrc` reads the main build's version catalog, `buildSrc/settings.gradle.kts` must re-declare it through `dependencyResolutionManagement { versionCatalogs { create("libs") { from(files("../gradle/libs.versions.toml")) } } }`. | `buildSrc` is an independent Gradle build and inherits no `dependencyResolutionManagement` from the root. Without the re-declaration the build fails at `buildSrc` configuration time with an unresolved catalog. | When the gate's first grep shows `libs.` or `versionCatalogs.named(` under `buildSrc`, the gate's second grep must be non-empty. Empty output there is the finding. | MUST |

The marker artifact is the plugin id, plus the suffix `.gradle.plugin`, under the
plugin id as group. Both halves of the fix are needed, and the wrong half alone
still compiles in an ordinary build script, which is what makes it convincing.

```kotlin
// wrong: build-logic/src/main/kotlin/app.jvm-conventions.gradle.kts
plugins { alias(libs.plugins.kotlinJvm) }     // no catalog exists at this point
dependencies { implementation(libs.guava) }   // unresolved reference: libs
```

```kotlin
// right: marker artifact declared in build-logic/build.gradle.kts, catalog bound here
plugins { id("org.jetbrains.kotlin.jvm") }
val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")
dependencies { implementation(libs.findLibrary("guava").get()) }
```

## The Root Build File and the Module List

```bash
grep -n -e 'allprojects' -e 'subprojects' -e 'project(":' build.gradle.kts build.gradle 2>/dev/null
grep -n -e 'rootProject.name' -e 'include' -e 'fileTree' -e 'listFiles' -e 'walk' \
  settings.gradle.kts settings.gradle 2>/dev/null
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-07 | Express cross-cutting configuration as a convention plugin. Do not configure subprojects from the root build file with `allprojects {}`, `subprojects {}` or `project(":x") {}` beyond a trivial `group` or `version` assignment. | Gradle's own docs name it an anti-pattern that "obscures build logic and introduces coupling that prevents optimizations". It is also the shape that makes a build hardest to get configuration-cache clean later. The survey's starkest case is kafka's 4425-line root build file, which configures every subproject inline. | Gate block above, first command. Any hit whose block does more than assign `group` or `version` is the finding. Empty output is the pass. A repo with only `build.gradle` or only `build.gradle.kts` gets one "No such file" on stderr, which the redirect swallows. | MUST |
| GRADLE-STRUCT-08 | Set `rootProject.name` explicitly in the root settings file. | Otherwise it defaults to the checkout directory name, so the same source tree produces differently named artifacts and cache keys depending on the directory it was cloned into. 6 of 20 surveyed root settings files leave it defaulted. | Gate block above, second command. **Empty output for `rootProject.name` is the finding**, a hit is the pass. | SHOULD |
| GRADLE-STRUCT-09 | Before adding a module, find out how the module list is produced. Where the build generates it (a directory walk, an `includeProject()` helper, a custom settings DSL), add the module through that mechanism. Never append a literal `include(":x")` beside a generator, and never count `include(` lines to enumerate modules. | 8 of 20 multi-module repos in the survey generate the list, ktor and gradle/gradle among them. A literal `include()` added next to a generator either duplicates an entry or is silently ignored, and the module then does not build with no error naming it. | Read `settings.gradle.kts` end to end before editing it. In the gate's second command, a loop, a `fileTree`/`listFiles`/`walk` call, or a helper function near the `include(` lines means the generated path is the one to use. Confirm the new module appears in the project-list scan below. | SHOULD |

## The Resolved Project List

```bash
./gradlew projects --console=plain -q \
  | grep -oE "Project ':[^']+'" \
  | sed -E "s/.*:([^:']+)'/\1/" | sort | uniq -d
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-10 | Never create two projects whose path's last segment is identical **in a build that also assigns a uniform explicit `group`** (a root `allprojects`/`subprojects { group = ... }`, or a publishing plugin driving `group` from one property). Give the colliding projects distinct groups, or rename one. | Gradle identifies dependency-graph nodes by group and name, so both projects resolve to the same coordinates with an unspecified version, and ordinary conflict resolution silently keeps one and drops the other. No failure, no warning, just a classpath missing classes ([gradle/gradle#847](https://github.com/gradle/gradle/issues/847), open since 2016-11-12, reproduced on 8.12.1 on 2025-06-30, still unfixed through 9.x as of 2026-09-12). The group conjunct is load-bearing: Gradle's default group is the project path with dots for separators, which already disambiguates nested duplicates, and a rule without the conjunct condemns Google's own modularisation sample. | Gate block above, then `grep -rn -e 'group =' -e 'group=' build.gradle.kts build.gradle gradle.properties 2>/dev/null`. Non-empty output from **both** is the violation. Either one empty is the pass. The rule is preventive: 3 of 32 repos carry duplicate leaf segments and 2 of those also assign a uniform group, but whether the collision enters one resolution graph is not detectable from the sources. | MUST |

## Every gradle.properties in the Tree

```bash
find . -path ./.git -prune -o -name gradle.properties -print | sort
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-11 | Never put an `org.gradle.*` key (`caching`, `configuration-cache`, `jvmargs`, `parallel`, `workers.max`, `vfs.watch`, `warning.mode`, and the rest) in a `gradle.properties` that is not the root of a build. A non-root file's own non-`org.gradle.*` keys are fine. | These are read once at daemon and settings-evaluation startup, from the build root and the Gradle user home, before any subproject is visited. A subproject override is never consulted at all, so `org.gradle.caching=false` dropped into a flaky module changes nothing and the team believes it did. | For each file the gate lists below the root, first classify its directory as a build root: it contains a `settings.gradle` or `settings.gradle.kts`, or it is `buildSrc`, or an `includeBuild(...)` names it. For the rest only, `grep -nE '^[[:space:]]*org\.gradle\.' path/to/gradle.properties` must be empty. **Empty output is the pass.** Do not flag on the file's existence: 17 of 32 surveyed repos have a non-root `gradle.properties` and **zero** are violations, because every one of them is a build root. | MUST |

## Every Settings File and Settings Plugin

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-STRUCT-12 | Gate remote build-cache push on possession of a write credential, read through `providers.environmentVariable("TOKEN_NAME").isPresent`. Never on CI-ness, a CI-vendor marker, or a branch name, and never through a raw `System.getenv`. | A fork pull request's run is "CI" too, and hosted CI strips repository secrets from it by design, so a credential the platform withholds from untrusted runs is the only predicate that distinguishes a trusted build from anyone's PR. A poisoned entry pushed once is then read by every trusted build afterwards. The `providers` half keeps the settings-time read a declared configuration-cache input. Floor: Gradle 7.0 for `providers.environmentVariable` (verified 2026-09-12). | `grep -rnE -e 'isPush' -e 'push[[:space:]]*=' --include='settings.gradle' --include='settings.gradle.kts' --include='*.settings.gradle.kts' .`. Every hit's right-hand side must contain a credential-presence conjunct. A bare CI marker is the violation, and so is a correct predicate read with `System.getenv`. **Empty output is the pass only when no `remote(` build-cache block exists**, so grep for that too before concluding. The `*.settings.gradle.kts` include is not optional: the repos that factored settings logic into precompiled plugins are exactly the ones a narrow grep misses. | MUST |

```kotlin
// wrong: a fork PR is "CI" too, and its run has no secret to push with
buildCache { remote<HttpBuildCache> { isPush = System.getenv("CI") != null } }
```

```kotlin
// right: possession of the write credential is the predicate, read through providers
val token = providers.environmentVariable("BUILD_CACHE_TOKEN")
buildCache {
    remote<HttpBuildCache> {
        credentials {
            username = "ci"
            password = token.getOrElse("")
        }
        isPush = token.isPresent
    }
}
```

The most portable public example is spotless, which sets push only inside a
user-and-password presence check, falls back to an anonymous read-only
credential, and uses plain `HttpBuildCache` rather than a vendor extension.

## What Agents Get Wrong Here

1. **Writes `libs.guava` inside a `build-logic` or `buildSrc` precompiled script
   plugin.** It works everywhere else in a Kotlin DSL build, so the exception is
   narrow and invisible. The single highest-frequency failure in this family.
2. **Suggests `alias(libs.plugins.x)` inside a precompiled plugin's `plugins {}`
   block** as the fix for "plugin version not found". No Gradle version supports
   it, and the suggestion reads as the obvious next step after the first failure.
3. **Recommends `org.gradle.accessors.dm.LibrariesForLibs` as the sanctioned
   fix.** Pre-documentation blog answers present it as *the* solution, and it
   even works for one Gradle version in one build shape.
4. **Calls `buildSrc` deprecated or legacy.** Strongly worded "always use
   build-logic" posts compress into a false deprecation claim that would flag
   9 flagships. The correct phrasing is "SHOULD migrate, not required".
5. **Gates cache push on `System.getenv("CI")`,** copied from generic "only push
   from CI" advice that predates fork-aware CI. Two surveyed repos ship exactly
   that.
6. **Flags every non-root `gradle.properties`.** The naive form of
   `GRADLE-STRUCT-11` condemns 17 of 32 repos, including `build-logic` roots that
   exist *because* root properties do not propagate to an included build
   ([gradle/gradle#2534](https://github.com/gradle/gradle/issues/2534)). Classify
   the directory first, then grep. Never the reverse order.
7. **Bans duplicate leaf names outright.** Without the uniform-group conjunct the
   rule fails Google's own modularisation sample and teaches the team to disable
   it.
8. **Greps only `settings.gradle*` for anything settings-shaped,** so the check
   reports clean on precisely the most sophisticated builds.
9. **Appends a literal `include(":new-module")` beside a generated module list.**
   The generator is usually a few lines above the `include(` calls the agent
   pattern-matched on, and the appended entry is silently ignored.
10. **Claims [gradle/gradle#847](https://github.com/gradle/gradle/issues/847) or
    [#15383](https://github.com/gradle/gradle/issues/15383) was fixed.** Both are
    old, heavily reacted, and open. Read the issue timeline before asserting any
    fix version.
11. **Configures new cross-cutting behaviour by adding to the root
    `subprojects {}` block** because that block is already there and the diff is
    one line. The convention plugin is the larger diff and the correct one.
