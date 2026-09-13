---
title: Writing a Gradle Plugin
summary: The GRADLE-PLUG family, covering the load-time contract of a Plugin<Project> or Plugin<Settings>, the ValueSource and BuildService split, the TestKit matrix and its configuration-cache leg, and what a Portal publish makes permanent
---

# Writing a Gradle Plugin

Owns the plugin as a published product: what plugin code may touch while it loads,
where an impure read is allowed to happen, how the plugin proves cross-version and
configuration-cache compatibility, and what it commits to permanently when it publishes.
It does not own ordinary build-script authoring, input annotations or `Task.getProject()`
at execution time, which are GRADLE-CACHE in this rule's caching-and-correctness file, nor
the settings file's own silent failures (duplicate leaf names, subproject
`gradle.properties`, build-cache push gating), which are GRADLE-STRUCT in the
structure-and-conventions file. Publishing a library to a Maven repository is GRADLE-PUB in
the publishing file, and the shading taxonomy for application distributions is GRADLE-DIST
in the distribution file. Rows GRADLE-PLUG-05, -07 and -09 carry only the plugin-author
formulation of an overlap GRADLE-CACHE states once.

Contents: [The Two Validation Gates](#the-two-validation-gates) · [The Load-Time Contract](#the-load-time-contract) ·
[ValueSource Reads, BuildService Enforces](#valuesource-reads-buildservice-enforces) · [The TestKit Matrix](#the-testkit-matrix) ·
[The Portal and the One-Way Doors](#the-portal-and-the-one-way-doors) · [What Agents Get Wrong Here](#what-agents-get-wrong-here)

Rows marked **pinned** encode an agreed decision rather than a derived fact. They are
defaults an adopter overrides once, in their own build, never per call site. Every version
below was verified 2026-09-12.

## The Two Validation Gates

`validatePlugins` is a gate you run, not a gate you get.

```bash
./gradlew validatePlugins        # its own CI step, exit code gates the job
grep -rln --include='build.gradle.kts' --include='build.gradle' 'com.gradle.plugin-publish' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PLUG-01 | Run `./gradlew validatePlugins` as its own CI step whose exit code gates the job. Never rely on the `jar`-time warning being noticed. | `java-gradle-plugin` emits warnings, not failures, during `jar`, so a plugin can ship with every task property unannotated and a green build. | `grep -rn 'validatePlugins' .github/workflows/` must land in a step that can fail the job. Empty output in a repository that has a `gradlePlugin {}` block is the finding, not the pass. | MUST |
| GRADLE-PLUG-02 | In every module that applies `com.gradle.plugin-publish`, set `validatePlugins { enableStricterValidation = true }`. | The default run checks only the plugin's own task types. Stricter mode also checks the types the plugin exports, where a missing `@Input` or `@OutputFile` becomes a silent up-to-date and configuration-cache defect in every consumer's build rather than in yours. Adoption is 1 of 32 measured repositories (detekt), and this row departs from that count deliberately. | Take the gate's routing list, then `grep -rn --include='build.gradle.kts' --include='build.gradle' 'enableStricterValidation' .`. A module in the first list absent from the second is the violation. An empty routing list means nothing publishes and the row does not apply. | MUST |

## The Load-Time Contract

Four things plugin code gets wrong by default, all caught by reading its own sources.

```bash
grep -rn --include='*.kt' --include='*.java' 'import org\.gradle\..*\.internal\.' src
grep -rn --include='*.kt' --include='*.java' -e 'afterEvaluate' -e 'extensions.getByType' -e 'plugins.hasPlugin' src
grep -rn --include='*.kt' --include='*.java' -e '.getProperties()' -e 'project.container(' src
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PLUG-03 | Never import a Gradle type from a package with an `internal` path segment, and never reference a Gradle type whose name ends `Internal` or `Impl`. Copy the code, or extend a public type. | Gradle reserves the right to break these during any release, including a minor one, so a consumer's routine Gradle bump becomes a `NoSuchMethodError` in every build that applies the plugin. | The gate's first grep, plus a scan of referenced `org.gradle` type names for an `Internal` or `Impl` suffix. Empty output is the pass. A compile-classpath scan beats a source grep where such types are re-exported transitively. | MUST |
| GRADLE-PLUG-04 | Never assume another plugin is already applied. Apply it explicitly with `pluginManager.apply("id")` for a hard dependency, or react with `pluginManager.withPlugin("id") { }` for an optional integration. | Application order across convention plugins, subprojects and included builds is deterministic but not reasonable-about, and the failure surfaces when someone reorders a `plugins {}` block in a repository you do not own. | Every `extensions.getByType` or `plugins.hasPlugin` hit from the gate must sit inside a `withPlugin {}` block, or follow an explicit `pluginManager.apply(...)` in the same `apply()`. A hit at the top of `apply()` is the violation, and an empty gate grep is the pass. | MUST |
| GRADLE-PLUG-05 | Never call `afterEvaluate {}` in plugin code. The one carve-out is fail-fast validation of your own extension's final state. Use `convention()` for defaults, a lazy `Property` or `Provider` for deferred values, and `pluginManager.withPlugin()` for cross-plugin coordination. | Registration order between callbacks is fragile, task-configuration avoidance is defeated, and captured project state does not serialize into the configuration cache. A plugin that uses it forces every consumer into it. | The gate's second grep. Every hit must be justified in review as own-state validation of the plugin's own extension. Empty output is the pass. | MUST |
| GRADLE-PLUG-06 | Do not use `Project.getProperties()` or `Project.container(Class, ...)` in new plugin code. Use `findProperty()` or `providers.gradleProperty(...)`, and `objects.domainObjectContainer(...)`. | Both are deprecated across the Gradle 9.x line and scheduled for removal in Gradle 10 (deprecated list read 2026-09-12), and `project.container()` is the reflex for backing a `NamedDomainObjectContainer` DSL block. | The gate's third grep. Empty output is the pass. | CONSIDER |

## ValueSource Reads, BuildService Enforces

One line runs through all nine rows: a `ValueSource` **computes**, a
`BuildService` **enforces**. `ValueSource.obtain()` is the one mechanism exempt
from automatic configuration-cache input detection, and it returns a value with
no authority to fail anything, so a check performed there is documentation. A
shared `BuildService` can fail the build and still adds no cache input, because
its parameters are serialized into the entry while its own work runs after cache
restoration.

```bash
./gradlew help --configuration-cache --configuration-cache-problems=warn
./gradlew help -Dorg.gradle.isolated-projects.diagnostics=true
grep -rn --include='*.kt' --include='*.java' -e 'System.getenv()' -e 'ProcessBuilder(' -e 'Runtime.getRuntime().exec' -e 'MessageDigest' -e 'sharedServices' -e 'JavaToolchainResolver' src
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PLUG-07 | Plugin code must never call unqualified `System.getenv()`, `ProcessBuilder`, `Runtime.exec` or `ExecOperations.exec` at configuration time. Route the read through `providers.exec()` for simple output capture, or a custom `ValueSource` for parsing, injected services and combined reads. | These are either opaque to configuration-cache input tracking or turn every environment variable into a cache-invalidating input. `ValueSource` is the one documented exemption, because only `obtain()`'s return value is tracked (Gradle 8.0 and later). | The gate's problems run, read for unexpected build-configuration inputs, plus the gate grep. A hit outside a `ValueSource.obtain()` body is the violation, and empty grep output is the pass. | MUST |
| GRADLE-PLUG-08 | Read an external CLI once inside a `ValueSource` with injected `ExecOperations`, and hold the parsed result for the rest of the build in a `BuildService` whose parameter is the already-obtained value. Never let a `BuildService` drive a `ValueSource`. | Documented and unsupported in the reverse direction: a `BuildServiceProvider` cannot drive a `ValueSource` at configuration time. Only service parameters are cached and instances are recreated, so the service must hold derived values, never a process handle. | Reading heuristic on the dependency direction. `ValueSource.obtain()` must reference no `BuildService`-derived `Provider`, and the service parameters may hold the obtained text or parsed map. A provider flowing from a service into a `ValueSource` parameter is the violation. | MUST |
| GRADLE-PLUG-09 | A task that spawns an external tool builds the child process's environment explicitly from declared, annotated task inputs and passes it to `ExecOperations.exec { environment(map) }`. Never let the process inherit the daemon's ambient environment. | An inherited environment is invisible to the cache key and to a build scan, so the same task produces different output on two machines under a green up-to-date check. Building the map from a `MapProperty` input keeps the read declared. | `grep -rn -A 30 --include='*.kt' --include='*.java' '@TaskAction' src`. Every `exec {}` or `javaexec {}` in the printed output carries an `environment(...)` call. A block with none is the violation, and no `@TaskAction` that spawns anything is the pass. | MUST |
| GRADLE-PLUG-22 | Never implement `JavaToolchainResolver`, and never add a `toolchainManagement { jvm { javaRepositories { } } }` entry, to provision a tool that is not a JDK. | `JavaToolchainRequest` models only language version, vendor and implementation, and `JavaToolchainDownload.fromUri(URI)` carries no checksum field anywhere in the API (incubating since Gradle 7.6, unchanged through 9.7). A successful resolve also registers the binary in Gradle's own JDK toolchain table, corrupting real toolchain resolution. | Reading heuristic, and no functional test strengthens it. `grep -rn --include='*.kt' --include='*.java' --include='*.gradle.kts' -e 'JavaToolchainResolver' -e 'toolchainManagement' .` Every hit must resolve an actual JDK. A hit naming a CLI tool is the violation, and empty output is the pass. | MUST |
| GRADLE-PLUG-23 | Provision a pinned external binary from a `BuildService` registered exactly once by `gradle.sharedServices.registerIfAbsent(...)` inside `Plugin<Settings>.apply()`, with the download performed in the service's own execution-time method. Never in `apply()`, never in `ValueSource.obtain()`. | It is the only seat that is shared from settings scope across every project, can fail the build, and adds no configuration-cache input. An `ArtifactTransform` needs an invented coordinate first, and the toolchain seat is structurally excluded by GRADLE-PLUG-22. | Reading heuristic on `apply()`: exactly one `registerIfAbsent` call, and no network or filesystem write reachable from `apply()` itself. Then two TestKit legs. Registered once: a functional test with at least two subprojects consuming the service, whose execution-time code appends one marker line to a fixed file, after which one `build()` leaves exactly one entry. No Gradle API or build-scan value reports instantiation count, so the marker file is the mechanism, and a static counter or `withDebug(true)` is not evidence (GRADLE-PLUG-15). Configuration cache: run `help --configuration-cache` twice against the same project directory and require the literal `Reusing configuration cache.` in the second `BuildResult` output. | MUST |
| GRADLE-PLUG-24 | Enforce a provisioned binary's sha256 by throwing from execution-time code before the file reaches any task's classpath or `PATH`. Never compute a hash for enforcement inside a `ValueSource`. | `obtain()` returns a value and cannot fail a task, so a comparison made there is swallowed, and it re-hashes the whole binary on every configuration phase. Enforcement belongs where the build can die. | `grep -rn --include='*.kt' --include='*.java' -e 'MessageDigest' -e 'sha256' src`. A hit inside a class implementing `ValueSource` is a violation on sight, and the `check(...)` must sit in the service or a task action. **Empty grep output is the finding, not the pass, on a plugin that provisions a binary: it means no hash is computed at all.** Then prove it fires: a functional test with a deliberately tampered expected hash must reach `buildAndFail()` with the consuming task never executed, repeated under `--configuration-cache`. A grep alone passes a provider nothing ever calls `.get()` on. | MUST |
| GRADLE-PLUG-25 | Cache the provisioned binary under `GRADLE_USER_HOME` or a dedicated tool home, never under the project's `build/` directory, and key the already-provisioned skip on the expected sha256 rather than on file presence. | `clean` wipes `build/`, so every CI job re-downloads, and a presence-only check trusts a partially written file or a stale binary left by an earlier pin. | Two TestKit legs, because a source read cannot tell `exists()` from a hash compare whose result is discarded. Survives clean: build, run `clean`, build again with `forwardOutput()`, and a re-download marker on the second run proves the cache path was under `build/`. Hash, not presence: pre-place a file at the expected cache path with the right name and wrong content, and the build must re-fetch or fail the hash check, never accept it. | MUST |
| GRADLE-PLUG-26 | Set a shared `BuildService`'s parameters inline in `registerIfAbsent(...) { parameters { } }`, never mutate them afterwards, and read the service back only through `findByName(String)`. | Gradle documents `registerIfAbsent` as safe with Isolated Projects under exactly those conditions, and every other method on the shared-services registry emits Isolated Projects violations. Post-registration mutation from a per-project callback is the build-to-project access IP does not yet enforce and will (IP incubating since Gradle 9.7.0, 2026-08-06). | Reading heuristic, named as one, because no dynamic test adds independent signal. `grep -rn --include='*.kt' --include='*.java' 'sharedServices' src`. Every hit is either the single registration or a `findByName`. A `.parameters` assignment outside the registration block is the violation, and empty output is the pass for a plugin that registers no service. | MUST |
| GRADLE-PLUG-27 | Run `./gradlew help -Dorg.gradle.isolated-projects.diagnostics=true` against the plugin's own functional-test build at least once per release, and never wire `org.gradle.isolated-projects=true` into a required CI job. | Diagnostics mode configures projects sequentially and reports every violation without failing, which is the only proof available. Two of IP's four constraint categories are not fully enforced as of 9.7.0, so a green run is evidence rather than proof. Consistent with GRADLE-CACHE-10, which owns the diagnostics-only stance for builds. | TestKit for the diagnostics half: `GradleRunner.create().withArguments("help", "-Dorg.gradle.isolated-projects.diagnostics=true").build()`, then assert the `BuildResult` output carries no violation summary. The output is never empty, because diagnostics always stores and then discards a cache entry, so never assert on emptiness, and treat the summary wording as a dated re-check against the pinned Gradle version. CI half: `grep -rn 'isolated-projects' .github/workflows/` must return nothing inside a job triggered by a pull request or a push, and the deprecated `org.gradle.unsafe.isolated-projects` key must appear nowhere. | SHOULD |

```kotlin
// wrong: the hash is computed where nothing can fail, and recomputed every configuration phase
abstract class ToolHash : ValueSource<String, ToolHash.Params> {
    override fun obtain(): String = sha256(parameters.binary.get().asFile)
}
```

```kotlin
// right: the ValueSource reads the pin, the service verifies and throws before anyone holds the binary
abstract class ToolService : BuildService<ToolService.Params> {
    fun binary(): File = download().also { check(sha256(it) == parameters.expected.get()) }
}
```

## The TestKit Matrix

The matrix, not a coverage percentage, is a plugin's gate of record, and
configuration-cache compatibility is a separate leg from the version legs.

```bash
grep -rn --include='*.kt' --include='*.java' --include='*.groovy' 'withGradleVersion' src
grep -rn -e 'release-candidate' -e 'configuration-cache' .github/workflows/
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PLUG-11 | Declare a consumer-Gradle floor consistent with the DSL the plugin is written in, and test that floor. **Pinned default:** a Kotlin-DSL plugin built on the Gradle 9.x line requires consumer Gradle 8.11 or newer, a Groovy-DSL one reaches 7.0, and the Kotlin Gradle Plugin dependency is 2.0.0 or newer. | Gradle 8.11 is the first release embedding Kotlin metadata version 2. Below it the plugin fails to *load*, with a metadata-version error rather than a message about the Gradle version. The DSL choice is therefore a one-way door decided before the first line of the plugin, not after. | A functional test calling `GradleRunner.withGradleVersion(...)` with the declared floor as its literal argument. A floor stated only in a README, with no test pinned to it, is the violation. | MUST |
| GRADLE-PLUG-12 | The TestKit matrix has at least two legs, the declared floor and the current stable Gradle. **Pinned default:** floor 8.11 and the current 9.x release, both on the pull-request job. | A suite that runs only against the Gradle that built it cannot detect a floor regression, so the floor claim is untested by construction. | The gate's `withGradleVersion` grep shows at least two distinct targets, or an equivalent second source set or task pinned to the floor. One target is the violation, and empty output on a module that ships a plugin is the finding. | MUST |
| GRADLE-PLUG-13 | Add a `release-candidate` leg on a scheduled or manually dispatched job, never on the pull-request job. **Pinned default:** scheduled only. | An RC break is an upstream regression rather than the contributor's, and a red pull request for it teaches people to ignore the whole matrix. Finding out at Gradle GA is still too late for a published plugin. | `grep -rn 'release-candidate' .github/workflows/` must land in a workflow whose trigger is `schedule:` or `workflow_dispatch:`. A hit under `pull_request:` is the violation, and no hit at all is the finding on a published plugin. | SHOULD |
| GRADLE-PLUG-10 | Run a dedicated functional-test leg with `--configuration-cache`, separate from the version matrix, and declare `compatibility { features { configurationCache = true } }` only once that leg is green. | Since `com.gradle.plugin-publish` 2.1.0 (March 2026) the declaration is a public Portal claim, so an undertested declaration is a false claim rather than a gap. Shadow ships exactly that mismatch today, declaring the feature with no distinct leg. | The gate's second grep must show a leg distinct from the matrix legs, then cross-check that the `compatibility` block's value matches whether that leg passes. A declaration with no leg is the violation, and neither a leg nor a declaration is the pass. | MUST |
| GRADLE-PLUG-14 | If the plugin declares `compileOnly` on another plugin's API, its functional tests must not use `GradleRunner.withPluginClasspath()`. Publish to a local Maven repository and declare it in the test project's `pluginManagement { repositories { } }`. | The recommended dependency shape defeats the recommended TestKit shortcut. The symptom is a `ClassNotFoundException` naming the *other* plugin's class, so the debugging trail leads away from the cause. | `grep -rn --include='build.gradle.kts' 'compileOnly(' .` paired with `grep -rn --include='*.kt' --include='*.groovy' 'withPluginClasspath' src`, the second restricted to the functional-test source set. Co-occurrence within one module is the violation, and either grep empty is the pass. | MUST |
| GRADLE-PLUG-15 | A functional test asserts only on `BuildResult`, task outcomes and files on disk. Never on statics, thread-locals or any other in-process state of the plugin under test. | TestKit runs the build in a separate process through the Tooling API, with its own classpath, classloaders and daemons, so an in-process assertion tests the test JVM rather than the plugin. | Reading heuristic. Bind the plugin's base package first, `PKG=com.example.gradle`, then `grep -rn --include='*.kt' --include='*.groovy' "$PKG" src` restricted to the functional-test source set. A functional test importing the plugin's own implementation classes, or asserting on a static field, is the finding. | SHOULD |
| GRADLE-PLUG-16 | Pin `org.gradle.testkit.dir`, or call `withTestKitDir(...)`, to a project-relative path that `clean` sweeps, on any CI that reuses runners. | TestKit's per-test working directories are deliberately not deleted, so a self-hosted or long-lived runner accumulates them without bound. | `grep -rn --include='*.kt' --include='*.kts' --include='*.groovy' -e 'testkit.dir' -e 'withTestKitDir' .` Absence is a finding only on reused runners, never on ephemeral hosted ones. | CONSIDER |
| GRADLE-PLUG-29 | A `Plugin<Settings>`'s functional test applies the plugin under test from the generated test project's `settings.gradle(.kts)` `plugins {}` block, never from a generated `build.gradle(.kts)`. Prefer publishing to a `file://` Maven repository resolved through `pluginManagement { repositories { maven(...) } }`, and fall back to `withPluginClasspath()` only where GRADLE-PLUG-14's `compileOnly` trap is provably absent. | A settings plugin applied from a build script is never applied to a `Settings` at all, so the test passes for the wrong reason or fails with a misleading plugin-not-found, and every hash, cache-directory, configuration-cache and diagnostics assertion in GRADLE-PLUG-23, -24, -25 and -27 then passes vacuously. `withPluginClasspath()` does reach settings scope, but its injected classpath comes from the main runtime classpath, so the `compileOnly` gap is identical there. | The generated test project contains a `settings.gradle` or `settings.gradle.kts` whose `plugins {}` block names the plugin under test, with `pluginManagement {}` as its first block. A functional test for a class implementing `Plugin<Settings>` whose only `plugins {}` block sits in a build file is the violation whether or not it is green. | MUST |

```kotlin
// wrong: a Plugin<Settings> applied from the generated build file is never applied to a Settings
projectDir.resolve("build.gradle.kts").writeText("""plugins { id("com.example.tools") }""")
```

```kotlin
// right: the settings file, pluginManagement first, so the plugin applies at settings scope
val settings = projectDir.resolve("settings.gradle.kts")
settings.writeText("""pluginManagement { repositories { maven(uri(localRepo)) } }""")
settings.appendText("\nplugins { id(\"com.example.tools\") version \"0.1.0\" }")
```

## The Portal and the One-Way Doors

Every row here binds a **published** plugin only, on GRADLE-PLUG-20's routing condition. An
internal convention plugin registers `validatePlugins` too and is not judged against these.

```bash
./gradlew publishPlugins --validate-only      # exit 0 is the pass
grep -rn -e 'publishPlugins' -e 'gradle.publish.key' -e 'gradle.publish.secret' .github/workflows/
grep -rn --include='build.gradle.kts' --include='build.gradle' -e 'johnrengelman' -e 'relocate(' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PLUG-20 | Do not conclude that a module publishes a Gradle plugin from the presence of `validatePlugins`. The signal is `com.gradle.plugin-publish` in that module's `plugins {}` block. | `java-gradle-plugin` registers `validatePlugins` for any internal convention-plugin module. 10 of 32 measured repositories hit the task name across 7 repositories, and 7 of those carry no Portal signal at all, so a rule routed on the task name fires on builds that are correct. | `grep -rln --include='build.gradle.kts' --include='build.gradle' 'com.gradle.plugin-publish' .` is the routing list for this whole section. Empty output means no Portal row applies, which is the pass. | SHOULD |
| GRADLE-PLUG-17 | A Portal-published `gradlePlugin {}` block sets top-level `website` and `vcsUrl`, and per plugin `id`, `implementationClass`, `displayName`, `description`, `tags`, plus `compatibility { features { configurationCache = ... } }`. | That is the literal submission requirement. Omitting `tags` is accepted and measurably hurts discovery, and the corpus's largest publisher (spring-boot) omits it. Omitting `compatibility` is deprecated since plugin-publish 2.1.0 with a stated intent to reject outright. As of 2026-09-12 `configurationCache` is the only declarable feature. | `./gradlew publishPlugins --validate-only`, where exit 0 is the pass, then read every `create(...)` or `register(...)` entry and confirm all seven fields are non-empty. | MUST |
| GRADLE-PLUG-18 | Run `publishPlugins --validate-only` on every pull request, and run bare `publishPlugins` only in a job gated on a tag or release trigger that reads `GRADLE_PUBLISH_KEY` and `GRADLE_PUBLISH_SECRET` from the environment. | `--validate-only` catches metadata and packaging defects before the Portal's manual review queue does, at no cost and with no credential exposure. No such step was found in any of the 32 measured repositories, so its absence is the norm this row corrects. | `grep -rn 'publishPlugins' .github/workflows/`, where every unqualified occurrence must sit under a tag, release or environment-gated job, and a bare occurrence reachable from a fork's pull request is the violation. `grep -rn -e 'gradle.publish.key' -e 'gradle.publish.secret' .` must print nothing in tracked files, where empty output is the pass. | MUST |
| GRADLE-PLUG-19 | Choose the reverse-DNS plugin id before the first `publishPlugins` run: lowercase, at least one dot, and a top-level namespace you actually control, such as `io.github.` plus your own account name. | Ids cannot be renamed or reassigned after publish without Gradle's dispute process. It is a one-way door for which a model cheerfully invents a plausible value. | Reading check, once, before the first publish. Confirm the id inside `gradlePlugin { plugins { } }` against a Plugin Portal search for that exact string, and against the module's `group` coordinate. No automated check catches an id already taken by someone else. | MUST |
| GRADLE-PLUG-21 | Shading a plugin's own dependencies is opt-in through `com.gradleup.shadow` (`GRADLE-DIST-12` owns the dead-id rule at MUST), and it does not imply relocation. Add `relocate(...)` only for a dependency at genuine risk of colliding in a shared, non-isolated classloader, and name that collision in an adjacent comment. | `plugins { id(...) }` gives each plugin its own classloader, so the sharp relocation case does not generalise, and blanket relocation bloats the jar and mangles stack traces. `com.gradle.plugin-publish` does not apply Shadow for you: it publishes the shadow jar as the main artifact only where the module applies Shadow itself, and Shadow's own build applies plugin-publish while neither shading nor relocating. The id moved at Shadow 8.3.0, and Shadow 9.5.0 and later need Gradle 9.2 and Java 17. | The gate's third grep. A `johnrengelman` hit is `GRADLE-DIST-12`'s finding, not this row's; empty output is the pass. Every `relocate(` hit in a plugin module carries an adjacent comment naming the collision it prevents. | SHOULD |
| GRADLE-PLUG-28 | Do not treat replacing `javax.annotation` (JSR-305) with `org.jspecify.annotations` on a plugin's exported types as a routine change. It needs a major version and a migration note. | Kotlin reports JSR-305 mismatches as warnings (`-Xjsr305=warn`, the default since Kotlin 1.1.50 and unaffected by K2) and JSpecify mismatches as errors (`-Xjspecify-annotations=strict`, the default since Kotlin 2.1). Modernising the annotations converts silent consumer warnings into consumer build failures, the reverse of the usual direction. | Review half: a diff moving `javax.annotation` to `org.jspecify.annotations` on any non-internal type reachable from the plugin's API carries a changelog entry and a major-version bump in the same diff. Runnable half: a Kotlin-DSL consumer fixture with a genuine nullness mismatch, run under TestKit against both plugin versions, must flip from `build()` succeeding with a warning to `buildAndFail()`. A fixture that does not flip means consumer-visible behaviour did not change, and the major-version claim is unfounded for that type. | MUST |

## What Agents Get Wrong Here

1. **Reaching for `afterEvaluate {}` to "wait until configuration is done."**
   The most-cited plugin-authoring mistake and the idiom every pre-2024 tutorial
   teaches (GRADLE-PLUG-05).
2. **Generating `GradleRunner.create().withPluginClasspath()` as the default
   functional-test scaffold.** Tutorial-shaped, and silently wrong the moment
   the plugin has a `compileOnly` dependency on another plugin's API
   (GRADLE-PLUG-14).
3. **Writing a Settings plugin's functional test as if it were a project
   plugin's,** applying it from a generated build file. Every TestKit example in
   training data is a project plugin, so the test goes green having applied
   nothing (GRADLE-PLUG-29).
4. **Treating `System.getenv()` as free because it is "just reading an env
   var,"** or hedging with
   `providers.environmentVariable("X").getOrElse(System.getenv("X"))`, which
   looks defensive and reintroduces the untracked read (GRADLE-PLUG-07).
5. **Reaching for `JavaToolchainResolver` because "toolchain" is the Gradle
   noun for downloading and pinning a tool.** Nothing in the toolchain examples
   says the request type is JDK-only (GRADLE-PLUG-22).
6. **Putting the sha256 comparison in a `ValueSource`** because that is "the
   configuration-cache-safe place to do impure things," then proving it with a
   grep. The shape that passes that grep and does nothing is a provider nothing
   ever calls `.get()` on (GRADLE-PLUG-24).
7. **Writing `com.github.johnrengelman.shadow`,** dead past Shadow 8.3.0 and
   still dominant in training data (GRADLE-PLUG-21).
8. **Calling `project.exec {}` or `Runtime.exec()` inside a `@TaskAction`,** or
   casting to an `*Internal` type to reach the one method that is not public
   yet. Both are common in real flagship plugin source (GRADLE-PLUG-09, -03).
9. **Calling "tested against the Gradle that built it" a TestKit matrix.**
   Produces green CI over a floor nothing exercises (GRADLE-PLUG-12).
10. **Omitting `compatibility { features { } }`, or inventing a feature name.**
    plugin-publish 2.1.0 is newer than most training data, and
    `configurationCache` is still the only declarable feature (GRADLE-PLUG-17).
11. **Reaching for a static counter and `withDebug(true)` to prove a
    `BuildService` was created once,** or hallucinating an instantiation-count
    API. No such surface exists, and `withDebug` defeats the process isolation
    that makes the assertion mean anything (GRADLE-PLUG-23, -15).
12. **Assuming JSpecify is a free upgrade from JSR-305,** whose Kotlin default
    is `warn` where JSpecify's is `strict` (GRADLE-PLUG-28).
13. **Caching a provisioned binary under `build/`,** the reflex location for
    anything a build produces, which `clean` wipes before every CI job
    (GRADLE-PLUG-25).
14. **"Rewriting" one `gradlePlugin { plugins { } }` id idiom into the other.**
    Both the map-key form, `create("com.example.tools") { }`, and an explicit
    `id = "..."` property compile identically, and the corpus is split with no
    winner across 13 plugin-shipping repositories. An id-idiom change with no
    other change in the diff is churn. Reject it.
