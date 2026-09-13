---
title: "What a Gradle plugin must not do, and how the build proves it"
topic: gradle-plugin-dev / plugin-contract-and-validation
agent: jvm-gradle-plugin-dev-dive-1
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  The contract a published binary Gradle plugin honours (internal-API avoidance,
  plugin-ordering independence, afterEvaluate replacements, task-property
  annotation, plugin-id permanence, DSL/consumer version floors) and the
  configuration-cache-safe mechanism a Settings plugin uses to shell to an
  external CLI (`ocx --format json`) at configuration time, holding the result
  for later tasks, plus explicit environment classification for spawned
  processes via ExecOperations. Does not cover TestKit cross-version matrices
  or Plugin Portal publishing metadata (see the sibling
  `testkit-matrix-and-portal` dive) or general configuration-cache mechanics
  beyond the plugin-author surface (see the `configuration-cache-and-isolated-projects`
  dive for the full disallowed-types/replacement table).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Internal APIs are permanently unstable](#1-internal-apis-are-permanently-unstable)
   2. [Never assume another plugin is applied](#2-never-assume-another-plugin-is-applied)
   3. [afterEvaluate: three replacements and one carve-out](#3-afterevaluate-three-replacements-and-one-carve-out)
   4. [Every task property needs an annotation, enforced by validatePlugins](#4-every-task-property-needs-an-annotation-enforced-by-validateplugins)
   5. [The plugin id is permanent — choose it deliberately](#5-the-plugin-id-is-permanent--choose-it-deliberately)
   6. [Version floors as hard numbers](#6-version-floors-as-hard-numbers)
   7. [Reading `ocx --format json env` without breaking the configuration cache](#7-reading-ocx---format-json-env-without-breaking-the-configuration-cache)
   8. [ValueSource vs BuildService: the seat decision](#8-valuesource-vs-buildservice-the-seat-decision)
   9. [Classified environment for spawned processes via ExecOperations](#9-classified-environment-for-spawned-processes-via-execoperations)
   10. [Gradle 10 removals a plugin author must not lean on](#10-gradle-10-removals-a-plugin-author-must-not-lean-on)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Never import a Gradle type from a package with an `internal` segment, or a type suffixed `Internal`/`Impl` — Gradle explicitly reserves the right to break these "during any new Gradle release, even during minor releases" ([internal APIs](https://docs.gradle.org/current/userguide/best_practices_general.html#do_not_use_internal_apis)).
- Never assume a companion plugin is already applied; either apply it explicitly in `Plugin.apply()` (`pluginManager.apply("id")`) or react with `pluginManager.withPlugin("id") {}` — both are order-independent, unlike `subprojects{}`/`afterEvaluate{}` ([Don't Assume plugin order](https://docs.gradle.org/current/userguide/best_practices_general.html#dont_assume_plugin_applied_after_another)).
- `afterEvaluate{}` has three named replacements, not one: lazy `Property`/`Provider` wiring resolved at execution time, `convention()` for a default that only applies if the user never sets a value, and `pluginManager.withPlugin()`/`plugins.withType{}` for cross-plugin coordination ([Avoid afterEvaluate](https://docs.gradle.org/current/userguide/best_practices_general.html#avoid_after_evaluate)).
- The one documented carve-out for `afterEvaluate` is fail-fast validation of *your own plugin's* final state (plus diagnostic logging), and even then only if your callback is the last one registered ([same section](https://docs.gradle.org/current/userguide/best_practices_general.html#avoid_after_evaluate)).
- `java-gradle-plugin` only *warns* about missing task-property annotations at `jar` time; the enforced gate is running `validatePlugins` explicitly, and CI must call it, not rely on the warning ([Java Gradle Plugin reference](https://docs.gradle.org/current/userguide/java_gradle_plugin.html); confirmed 0-fail-by-default behaviour cross-checked against [exemplar-quality-gates.md:197](../jvm-audit/exemplar-quality-gates.md)).
- A plugin id is reverse-DNS, lowercase, at least one `.`, globally unique, and — because the Plugin Portal never lets you rename or reassign an id once published — must be chosen before the first publish, not iterated on afterward ([Implementing plugins](https://docs.gradle.org/current/userguide/implementing_gradle_plugins_binary.html)).
- Hard version floors from Gradle 9's own upgrade guide: a Kotlin-DSL plugin built with Gradle 9.x needs consumer Gradle ≥ 8.11 (first release embedding Kotlin metadata version 2); a Groovy-DSL plugin needs consumer Gradle ≥ 7.0; the minimum supported Kotlin Gradle Plugin (KGP) version is 2.0.0 as of Gradle 9.0.0 ([Upgrading to Gradle 9](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html)).
- `rules_ocx`'s "extension implementations get no `module_ctx.os`/getenv — repository rules only" invariant ([AGENTS.md:65](file:///home/mherwig/dev/rules_ocx/AGENTS.md)) has an exact Gradle analogue: a Settings plugin must not read the environment or shell out directly inside `Plugin<Settings>.apply()`; it must go through a `ValueSource`, the one documented escape hatch that is exempt from Gradle's automatic configuration-cache-input detection ([Configuration cache requirements — ValueSource](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:value_source)).
- `ValueSource` is the correct seat for the one-shot `ocx --format json env` read: it supports injected `ExecOperations` even at configuration time, its `obtain()` result — not the individual env-var/process reads inside it — becomes the single build-configuration input, and Gradle re-runs `obtain()` every build only to check freshness ([same section](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:value_source)).
- `BuildService` is the wrong seat for the read itself but the right seat for *holding* the parsed result for the rest of the build: a `BuildServiceProvider` cannot drive a `ValueSource`'s parameters at configuration time, so the dependency direction is ValueSource → parsed value → BuildService parameter, never the reverse ([Configuration cache requirements — Build Services](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:build_services)).
- Do not enumerate `System.getenv()` with a predicate/filter inside build logic — that makes *every* environment variable a cache-invalidating input; either name variables explicitly, use `providers.environmentVariablesPrefixedBy()`, or push the read into a `ValueSource` (env vars read inside `obtain()` do not individually become inputs) ([Reading env vars](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:reading_sys_props_and_env_vars)).
- Never call `ProcessBuilder`/`Runtime.exec`/`ExecOperations.exec` directly in build-script or plugin code evaluated at configuration time; use `providers.exec()` for simple output capture or a `ValueSource` with injected `ExecOperations` for anything more complex ([Running external processes](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:external_processes)).
- A task must never touch `Task.getProject()` at execution time; the fix for a spawned process is the same shape as for file operations — `@get:Inject abstract val exec: ExecOperations` on the task, not `project.exec{}` ([Using Project at execution time](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:use_project_during_execution)).
- `ExecOperations.exec {}` accepts an explicit `environment(map)` (replacing the whole map) rather than inheriting the daemon's ambient environment — this is the Gradle primitive an OCX plugin must build its site/translucent/explicit/pinned classification on top of, because Gradle gives you full control of the child process's env but no built-in classification scheme of its own.
- `validatePlugins` presence in a build is not evidence a repo *publishes* a plugin — 10/32 corpus repos run it purely for internal convention-plugin modules via `java-gradle-plugin`, with zero Plugin Portal signal; the actual "this ships as a product" signal is `com.gradle.plugin-publish` ([exemplar-publishing-ci-bazel.md:182,420](../jvm-audit/exemplar-publishing-ci-bazel.md)).
- Settings plugins carry one extra structural cost: including one in a shared `build-logic` composite build forces `pluginManagement{}` inclusion, which "reduces Build Caching capability" — Gradle's own guidance is to isolate Settings plugins in a separate minimal `build-logic-settings` included build ([gradle-canonical.md:105](../jvm-topic-map/gradle-canonical.md)).
- Two Gradle-10-bound removals bite plugin authors specifically: `Project.getProperties()` (removed in 10.0.0, use `findProperty()`/`ProviderFactory.gradleProperty()`) and `Project.container(Class, ...)` (superseded now by `ObjectFactory.domainObjectContainer(...)`, a common pattern for extension DSL containers) ([deprecated-list.html](https://docs.gradle.org/current/javadoc/deprecated-list.html)).

## Findings

### 1. Internal APIs are permanently unstable

Gradle's own Best Practices page states the rule as a MUST, not a style preference: "Do not use APIs from a package where any segment of the package is `internal`, or types that have `Internal` or `Impl` as a suffix in the name." The stated reason: "Gradle and many plugins (such as Android Gradle Plugin and Kotlin Gradle Plugin) treat these internal APIs as subject to unannounced breaking changes during any new Gradle release, even during minor releases." The documented workaround when a public API is genuinely missing is to file a feature request, and as a stopgap, copy the needed code into your own codebase and extend a Gradle public type rather than cast to the internal one ([Do Not Use Internal APIs](https://docs.gradle.org/current/userguide/best_practices_general.html#do_not_use_internal_apis)).

```kotlin
// Don't do this
import org.gradle.api.internal.attributes.AttributeContainerInternal
val badMap = (attributes as AttributeContainerInternal).asMap()

// Do this instead
val goodMap = attributes.keySet().associate {
    Attribute.of(it.name, it.type) to attributes.getAttribute(it)
}
```

The mechanical check is a grep over the plugin's own source and its compile classpath's declared imports: any `import` line containing `.internal.` (as a whole package segment) or any referenced type ending in `Internal`/`Impl` from an `org.gradle.*` package.

### 2. Never assume another plugin is applied

Gradle's plugin application order is deterministic across a single build script, but "difficult to reason about, especially across multiple build scripts, projects, convention plugins, or included builds" ([Don't Assume plugin order](https://docs.gradle.org/current/userguide/best_practices_general.html#dont_assume_plugin_applied_after_another)). The page states the rule for plugin authors precisely: a plugin must behave correctly whether the user applies it before or after a plugin it integrates with. Two sanctioned shapes:

```kotlin
// If your plugin cannot function without another plugin: apply it explicitly
class MyPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        project.pluginManager.apply("com.example.required-plugin")
    }
}

// If your plugin only needs to react when another plugin happens to be present:
project.pluginManager.withPlugin("com.example.required-plugin") { /* ... */ }
```

Never do this instead (the doc's own "Don't Do This" example): a root build using `subprojects { afterEvaluate { pluginManager.apply("java") } } ` combined with a subproject that calls `extensions.getByType<JavaPluginExtension>()` unconditionally — this "results in an error" the moment structure changes, because `afterEvaluate` in the root project runs after the subproject's own build script has already been evaluated.

### 3. afterEvaluate: three replacements and one carve-out

The doc frames `afterEvaluate{}` as a historical workaround for "delaying" a read until configuration finishes, broken for three concrete reasons: fragile registration-order dependence between multiple `afterEvaluate` callbacks, defeat of task configuration avoidance (tasks touched inside `afterEvaluate` are configured eagerly even if never executed), and incompatibility with the configuration cache (captured mutable project state cannot be serialized reliably) ([Avoid afterEvaluate](https://docs.gradle.org/current/userguide/best_practices_general.html#avoid_after_evaluate)).

The three documented replacements, matched to the brief's phrasing:

| Replacement | What it does | Doc's own words |
|---|---|---|
| Lazy `Property`/`Provider` wiring | An extension property is wired at configuration time but its value is resolved only when read (typically at execution) — order-independent by construction | "Gradle's lazy `Property` and `Provider` types solve the same underlying problem — deferring value resolution — without any of these drawbacks" |
| `convention()` for defaults (explicit opt-in) | Sets a default value used **only if the user never calls `set()`** — no `afterEvaluate` check needed to see "did the user configure this" | "`convention()` provides a default value that is used only if no explicit value is set via `set()`" |
| `pluginManager.withPlugin()` / `plugins.withType{}` for cross-plugin coordination | Fires exactly once when the named plugin is applied, in either application order, never invoked if the plugin never applies | "reacts to plugin application safely and immediately, regardless of when the plugin is actually applied — no callback ordering to worry about" |

The one carve-out: "Fail-fast validation — verifying that required project configuration has been set and failing the build early with a clear error message" — explicitly scoped to your own plugin's final state, plus (secondarily) diagnostic logging. Even there the doc warns your callback must be the *last* one registered to see final state, and closes with "afterEvaluate should be a last resort, not a first choice."

Before/after, condensed from the doc's own worked example:

```kotlin
// Don't do this — reads a Property before the consumer's own afterEvaluate can set it
class AppInfoPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val ext = project.extensions.create("appInfo", AppInfoExtension::class.java)
        project.afterEvaluate {
            val name = ext.appName.getOrElse("unnamed")   // resolved too early
            tasks.register("printAppInfo") { doLast { println("App: $name") } }
        }
    }
}

// Do this instead — convention() default + lazy Provider + withPlugin
class AppInfoPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val ext = project.extensions.create("appInfo", AppInfoExtension::class.java)
        ext.appName.convention("unnamed")
        project.tasks.register("printAppInfo") {
            doLast { println("App: ${ext.appName.get()}") }   // resolved at execution
        }
        project.pluginManager.withPlugin("java-library") { /* ... */ }
    }
}
```

### 4. Every task property needs an annotation, enforced by validatePlugins

`java-gradle-plugin` (applied automatically once you register a `gradlePlugin {}` block) runs a set of validation checks *during the `jar` task*: "Each property getter or the corresponding field must be annotated with a property annotation like `@InputFile` and `@OutputDirectory`", and properties deliberately excluded from up-to-date checks require `@Internal` instead ([Java Gradle Plugin reference](https://docs.gradle.org/current/userguide/java_gradle_plugin.html)). Critically: "Failed validations generate warning messages rather than build failures" at `jar` time — the gate that actually fails a build is running the `validatePlugins` task explicitly (`./gradlew validatePlugins`), and CI must invoke it as its own step rather than trust the `jar`-time warning to be noticed. The measured corpus behaviour confirms the warning-only default: [exemplar-quality-gates.md:197](../jvm-audit/exemplar-quality-gates.md) records `detekt-gradle-plugin/build.gradle.kts:229-231` turning on `validatePlugins { enableStricterValidation = true }` — a deliberate strictness *opt-in* on top of the default, not a default-strict posture.

### 5. The plugin id is permanent — choose it deliberately

Plugin identifiers follow a reverse-DNS convention: "May contain any alphanumeric character, '.', and '-'", "Must contain at least one '.' character separating the namespace from the plugin's name", "Conventionally use a lowercase reverse domain name convention for the namespace", and must be globally unique to prevent collisions on the Plugin Portal ([Implementing Gradle plugins: binary plugins](https://docs.gradle.org/current/userguide/implementing_gradle_plugins_binary.html)). Once published to the Plugin Portal an id cannot be reassigned or transferred without going through Gradle's own dispute process — treat the choice as a one-way door made before the first `publishPlugins` run, not something to bikeshed after.

```kotlin
gradlePlugin {
    plugins {
        register("ocxProvision") {
            id = "dev.ocx.gradle"          // permanent once published — choose deliberately
            implementationClass = "dev.ocx.gradle.OcxSettingsPlugin"
        }
    }
}
```

### 6. Version floors as hard numbers

Gradle 9's own upgrade guide states these as measured facts, not recommendations, and each is a hard compatibility floor, not a suggestion:

- "Plugins written with the Kotlin DSL require Gradle >= 8.11" — "When building and publishing plugins using the Kotlin DSL on Gradle 9.x.x, those plugins will only be usable on Gradle 8.11 or newer. This is because Gradle 8.11 is the first release that embeds Kotlin 2.0 or higher, which is required to interpret Kotlin metadata version 2."
- "Plugins written with the Groovy DSL require Gradle >= 7.0" — built with Gradle 9.x.x, a Groovy-DSL plugin "require[s] Gradle 7.0 or newer to run."
- "Starting with Gradle 9.0.0, the minimum supported Kotlin Gradle Plugin version is 2.0.0." (Also stated: minimum AGP 8.4.0, minimum Gradle Enterprise Plugin 3.13.1 — cited here only for completeness; out of this dive's scope.)

(All three: [Upgrading your build from Gradle 8.x to 9.0](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html).)

These floors compound: a Kotlin-DSL OCX plugin built on Gradle 9.x cannot be loaded by a consumer on Gradle 8.10 or earlier — the failure mode is a load-time metadata-version mismatch, not a helpful "your Gradle is too old" message, so the floor must be tested (TestKit's `withGradleVersion("8.11")`), not just declared in a README.

### 7. Reading `ocx --format json env` without breaking the configuration cache

`rules_ocx/AGENTS.md:65`'s invariant — extension implementations never read `module_ctx.os` or call `getenv` directly, because only repository-rule implementations (Bazel's designated impure boundary) may do so — has an exact structural analogue in Gradle's configuration cache. The parallel: Bazel's repository-rule/extension-impl split polices *where* impure reads are allowed; Gradle's configuration-cache-input detection polices the same thing by turning any configuration-time read into a tracked cache key unless it is funnelled through one of a small set of documented mechanisms.

Concretely, none of these are safe to call directly inside a Settings plugin's `apply()` or inside build-script configuration code:

```kotlin
// All of these poison or bypass config-cache-input tracking if called directly
System.getenv()                     // enumeration → every env var becomes an input
ProcessBuilder(...).start()         // opaque to Gradle — undetectable input
project.exec { commandLine(...) }   // Project not usable at execution time either
```

The documented, config-cache-safe replacement for "run a process at configuration time and use its output" is `providers.exec()` for the simple case, and a custom `ValueSource` for anything requiring more control (parsing structured output, injecting `ExecOperations`, combining multiple reads):

```kotlin
abstract class OcxEnvValueSource : ValueSource<String, ValueSourceParameters.None> {
    @get:Inject
    abstract val execOperations: ExecOperations

    override fun obtain(): String {
        val out = ByteArrayOutputStream()
        execOperations.exec {
            commandLine("ocx", "--format", "json", "env")
            standardOutput = out
        }
        return out.toString(Charsets.UTF_8)
    }
}

// in the Settings plugin
val ocxEnvJson: Provider<String> = providers.of(OcxEnvValueSource::class) {}
```

Because `ValueSource` "is exempt from the automatic detection of configuration cache inputs" — reads inside `obtain()` (env vars, files, process output) do not individually become inputs — "[o]nly the value returned by `obtain()` is tracked", and that value is what invalidates the cache when it changes ([Configuration cache requirements — ValueSource](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:value_source)). `ExecOperations` is explicitly listed as an injectable service usable inside a `ValueSource` "even at configuration time"; the same doc warns "`obtain()` is called on every build", so only fast-running commands belong here — `ocx --format json env` is exactly the shape this is designed for (single JSON-emitting CLI call, no interactivity).

### 8. ValueSource vs BuildService: the seat decision

**ValueSource reads it; BuildService holds it.** The dependency direction only works one way. Gradle's own docs state the failure mode of the reverse direction explicitly: "A `BuildServiceProvider` cannot drive a `ValueSource` at configuration time. Passing a provider of a `BuildService`... as a `ValueSourceParameters` value that is read at configuration time is not supported" ([Configuration cache requirements — Build Services](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html#config_cache:requirements:build_services)). So a `BuildService` cannot itself perform or parameterize the `ocx env` read — it can only be handed the already-`obtain()`-ed value as an `@Internal`-annotated (or parameter-typed) input.

The correct shape for "read once, hold for later tasks":

```kotlin
// 1. ValueSource does the one-shot read (config-cache-safe, see §7)
val ocxEnvJson: Provider<String> = providers.of(OcxEnvValueSource::class) {}

// 2. BuildService holds the parsed result for every task in the build
abstract class OcxEnvironment : BuildService<OcxEnvironment.Params> {
    interface Params : BuildServiceParameters {
        val envJson: Property<String>
    }
    val parsedEnv: Map<String, String> by lazy { parseOcxEnvJson(parameters.envJson.get()) }
}

val ocxEnvService = gradle.sharedServices.registerIfAbsent("ocxEnv", OcxEnvironment::class) {
    parameters.envJson.set(ocxEnvJson)
}

// 3. Tasks declare it as an input via @ServiceReference or an injected Provider
```

Reasons this is the right seat, not the alternative of holding everything in a `ValueSource`-backed `Provider` alone: (a) a `BuildService` is Gradle's documented mechanism "to share state across tasks" and to be the safe replacement for `BuildListener`-style hooks; (b) `BuildService` parameter values are what gets serialized into the cache entry, so the *parsed* environment (a `Map<String,String>` or similar) is a cache-compatible parameter type where the live `ExecOperations`-driven process itself is not; (c) the service lifecycle is well-defined under the configuration cache — "Only the parameters are cached — service instances are not," recreated on first use at execution time, including possibly twice in one build — which is fine for a pure derived-value holder and would be a correctness risk for a stateful process handle. Reject a third option — recomputing `ocx env` at execution time inside every task that needs it — because it multiplies process spawns needlessly and reintroduces the exact env-poisoning risk §7 rules out if any task calls `System.getenv()` as a fallback.

### 9. Classified environment for spawned processes via ExecOperations

`rules_ocx`'s `OCX_ENV_CLASSES` taxonomy (site/translucent/explicit/pinned — [AGENTS.md:211-249](file:///home/mherwig/dev/rules_ocx/AGENTS.md)) has no built-in Gradle equivalent, but the primitive it needs exists: `ExecOperations.exec {}` (and `javaexec {}`) accept an `environment(map)` call that **replaces** the process's environment map rather than appending to the daemon's ambient one when built explicitly from an empty/controlled base:

```kotlin
abstract class RunOcxTool @Inject constructor(
    private val execOperations: ExecOperations
) : DefaultTask() {

    @get:Input
    abstract val siteVars: MapProperty<String, String>       // forwarded verbatim

    @get:Input
    abstract val translucentVars: MapProperty<String, String> // ambient-unless-overridden

    @get:Input
    abstract val explicitVars: MapProperty<String, String>    // never ambient

    @get:Input
    abstract val pinnedVars: MapProperty<String, String>      // fixed every invocation

    @TaskAction
    fun run() {
        val classified = buildMap {
            putAll(siteVars.get())
            translucentVars.get().forEach { (k, v) -> putIfAbsent(k, System.getenv(k) ?: v) }
            putAll(explicitVars.get())
            putAll(pinnedVars.get())
        }
        execOperations.exec {
            commandLine("ocx", "run", ...)
            environment(classified)          // explicit map, not inherited ambient env
        }
    }
}
```

The load-bearing point: because the task builds `classified` itself from four declared, task-input-annotated `MapProperty` sources rather than reading `System.getenv()` inside the task action, the classification decision is captured as ordinary task inputs (cache-correct, and each class's members are individually visible to a build scan), and the only place ambient environment is consulted at all is the narrow `translucentVars` fallback — exactly the "ambient-unless-overridden" semantics of that one class, and nowhere else. This mirrors the `rules_ocx` contract's second half: a spawned process gets an explicitly-built environment, never `execOperations.exec { }`'s (undocumented, JVM-default) ambient inheritance.

### 10. Gradle 10 removals a plugin author must not lean on

Two entries in the current deprecated-API list are specifically load-bearing for plugin authors (checked against the Gradle 9.7.1 javadoc's deprecated list, which marks Gradle-10-scheduled removals):

- `Project.getProperties()` — "This method will be removed in Gradle 10.0.0. Use `Project.findProperty(String)` or `ProviderFactory.gradleProperty(String)` instead."
- `Project.container(Class<T>[, ...])` — superseded now by `ObjectFactory.domainObjectContainer(Class[, NamedDomainObjectFactory])`; extension authors commonly reach for `project.container()` to back a `NamedDomainObjectContainer`-shaped DSL block and should use the `ObjectFactory` form so the container is created through the injected service rather than a `Project` call.

(Both: [Gradle API 9.7.1 deprecated list](https://docs.gradle.org/current/javadoc/deprecated-list.html).) Neither is scheduled for removal *yet* in 9.x, so code using them still builds today — the risk is silent breakage on a future Gradle 10 upgrade for a plugin published now and not revisited.

## Normative guidance candidates

1. **Never import a Gradle type whose package has an `internal` segment, or a type suffixed `Internal`/`Impl`.** Rationale: Gradle explicitly reserves the right to break these across any release, including minors. Verify: `grep -rn 'import org\.gradle\.[a-zA-Z.]*\.internal\.' --include='*.kt' --include='*.java' <plugin-src>` and a manual scan of imported type names ending `Internal`/`Impl`.
2. **A plugin must never assume another plugin is already applied; use `pluginManager.apply(id)` (hard dependency) or `pluginManager.withPlugin(id) {}` (optional integration).** Rationale: application order across multi-project builds is opaque even though deterministic. Verify: `grep -rn 'plugins\.hasPlugin\|extensions\.getByType' <plugin-src>` outside a `withPlugin`/explicit-apply guard is a hit.
3. **Never call `project.afterEvaluate {}` inside plugin code except for fail-fast validation of the plugin's own extension state.** Rationale: fragile registration-order semantics, defeats task configuration avoidance, incompatible with the configuration cache. Verify: `grep -rn 'afterEvaluate' <plugin-src>`; every hit must be justified as validation-only in review, or replaced with `convention()` / lazy `Provider` / `withPlugin()`.
4. **Every custom task getter must carry an incremental-build annotation (`@Input`/`@InputFile`/`@OutputDirectory`/etc.) or `@Internal` if deliberately excluded, and CI must run `validatePlugins` as an explicit step, not rely on the `jar`-time warning.** Rationale: `java-gradle-plugin`'s built-in check only warns at `jar` time by default. Verify: `./gradlew validatePlugins` in CI with its exit code gating the job; grep for `enableStricterValidation = true` as the stricter-mode opt-in.
5. **Choose the plugin's reverse-DNS id deliberately before the first Plugin Portal publish; it is permanent.** Rationale: ids cannot be reassigned post-publish. Verify: a named reading heuristic — confirm the `gradlePlugin { plugins { register(...) { id = "..." } } }` id matches an owned, globally-unique reverse-DNS namespace, checked once in review before `publishPlugins` ever runs, not re-checked mechanically thereafter.
6. **A Kotlin-DSL plugin built on Gradle 9.x must declare (and TestKit-test) a consumer floor of Gradle ≥ 8.11; a Groovy-DSL one, Gradle ≥ 7.0; and the plugin's KGP dependency must be ≥ 2.0.0.** Rationale: these are hard load-time compatibility floors from Gradle's own 9.0 upgrade notes, not soft recommendations. Verify: a `GradleRunner.withGradleVersion("8.11")` (or the declared floor) functional test in the plugin's own test suite; grep `libs.versions.toml`/`build.gradle.kts` for the declared KGP version.
7. **A Settings plugin (or any plugin) must never call `System.getenv()`, `ProcessBuilder`, `Runtime.exec`, or `ExecOperations.exec` directly at configuration time; route any such read through `providers.exec()` or a custom `ValueSource`.** Rationale: these calls are either opaque to configuration-cache-input tracking or make every environment variable a cache-invalidating input. Verify: `grep -rn 'System\.getenv()\.\|ProcessBuilder(\|Runtime\.getRuntime()\.exec\|\.exec(' <plugin-src>` outside a `ValueSource.obtain()` implementation or `providers.exec {}` call is a hit; the Configuration Cache report itself also lists such inputs when `--configuration-cache-problems=warn` is used.
8. **The one-shot `ocx --format json env` read is a `ValueSource`; the parsed result for the rest of the build is held in a `BuildService`, never the reverse.** Rationale: a `BuildServiceProvider` cannot drive a `ValueSource`'s parameters at configuration time (documented, unsupported). Verify: code review of the dependency direction — `ValueSource.obtain()` must contain no reference to a `BuildService`-derived `Provider`; `BuildServiceParameters` may hold the already-obtained JSON/parsed map.
9. **A task spawning an OCX-provisioned tool must build the child process's environment explicitly from its declared, task-input-annotated site/translucent/explicit/pinned sources and pass it to `ExecOperations.exec { environment(...) }`; it must never let the process inherit the daemon's ambient environment implicitly.** Rationale: mirrors `rules_ocx`'s "explicit-only env, never ambient" invariant and keeps the classification cache-input-correct. Verify: grep the task action for a call to `environment(...)`/`environment(mapOf(...))` before every `execOperations.exec {}`/`javaexec {}` call; absence of a bare `commandLine(...)` with no `environment(...)` override.
10. **Do not lean on `Project.getProperties()` or `Project.container(...)` in new plugin code; use `findProperty()`/`ProviderFactory.gradleProperty()` and `ObjectFactory.domainObjectContainer(...)` respectively.** Rationale: both are on Gradle's deprecated list scheduled for removal in Gradle 10. Verify: `grep -rn '\.getProperties()\|project\.container(' <plugin-src>`.

## Exemplar evidence

- **`validatePlugins` strictness is opt-in, confirming Finding 4's default-warns claim**: `detekt/detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts:229-231` sets `validatePlugins { enableStricterValidation = true }` — a deliberate strengthening past the tool's own default ([exemplar-quality-gates.md:197](../jvm-audit/exemplar-quality-gates.md)).
- **`validatePlugins` presence is not a "this repo publishes a plugin" signal (relevant to reviewers scoping which rows apply)**: `android/nowinandroid@12f80da651` and `cashapp/sqldelight@4580923af3` both run `validatePlugins` for internal `build-logic` convention-plugin modules with zero Plugin Portal signal anywhere else in the build — `java-gradle-plugin` registers the task independent of Portal intent, so the actual routing condition for "does GRADLE-PLUG's publish-facing rows apply" is `com.gradle.plugin-publish` presence, not `validatePlugins` ([exemplar-publishing-ci-bazel.md:182,420](../jvm-audit/exemplar-publishing-ci-bazel.md)).
- **`gradlePlugin{}` metadata completeness (adjacent to Finding 5's id-permanence point)**: `website`/`vcsUrl`/`tags` travel together in `detekt`, `spotless`, and `GradleUp/shadow`; `spring-boot` sets `website`+`vcsUrl` but omits `tags` — confirms the metadata block is treated as a unit by most publishers but not universally complete ([exemplar-publishing-ci-bazel.md:182](../jvm-audit/exemplar-publishing-ci-bazel.md)).
- **Settings-plugin build-caching caveat (Finding on `build-logic-settings`, contextual for the OCX plugin's own repo layout)**: `gradle/gradle@ea17004a31:settings.gradle.kts` includes a separate minimal `build-logic-settings` build specifically to avoid folding Settings-plugin logic into the main `build-logic` composite build and losing build-cache capability ([gradle-canonical.md:105](../jvm-topic-map/gradle-canonical.md)).
- **No exemplar in the 32-repo corpus is itself a Settings plugin that shells to an external CLI** — this is the one row this dive could not corroborate with exemplar evidence; the OCX Gradle plugin will be the first such artifact the fleet's own catalog can measure against. Treat Findings 7-9 as design guidance derived from primary Gradle docs plus the `rules_ocx` analogy, not as corpus-confirmed patterns, until the plugin itself exists.

## AI-agent angle

- **Reaching for `afterEvaluate` as the default way to "wait until configuration is done."** This is exactly the outdated idiom pre-2024 Gradle tutorials teach, and it is the single most-cited plugin-authoring mistake per the topic map's practitioner survey (M-D-04). Mechanical check: `grep -rn 'afterEvaluate' <plugin-src>` in review; any hit not justified as fail-fast validation of the plugin's own state is a rewrite target.
- **Casting to an `*Internal`/`*Impl` type "just to get one method that isn't public yet."** An LLM trained on real-world Gradle plugin source will have seen this pattern in mature codebases (it is common even in flagship plugins under time pressure) and will reproduce it without flagging the risk. Mechanical check: the internal-API grep in Finding 1/Rule 1; a compile-classpath scan for `org.gradle.*.internal.*` imports is more reliable than a source grep alone since some frameworks re-export internal types transitively.
- **Assuming `System.getenv()` is free of configuration-cache consequences because "it's just reading an env var."** Training data from pre-configuration-cache-era Gradle (7.x and earlier, and most Stack Overflow answers) treats ambient environment reads as ordinary code. Mechanical check: enabling `--configuration-cache-problems=warn` and reading the Configuration Cache report for unexpected build-configuration-input entries; a nonzero count of environment-variable inputs where the code intends to read one named variable indicates the enumeration antipattern.
- **Writing `project.exec {}` or `Runtime.exec()` inside a task's `@TaskAction` because it "worked in a script."** Correct in a `build.gradle.kts` top-level statement (configuration time, still discouraged but legal with a `ValueSource`), wrong inside a task action (execution time, `Project` is unusable there at all). Mechanical check: `grep -n '@TaskAction' -A 20 <file>` and confirm no `project.` reference appears in the following block.
- **Hallucinating a `GradleRunner.withPluginClasspath()` call that "just works" when the plugin under test declares `compileOnly` on another plugin's API.** This combination throws a misleading `ClassNotFoundException` at functional-test time (per the map's M-F-02) rather than the expected classpath assembly; an LLM will produce the naive TestKit setup because it matches the vast majority of tutorial code, which does not use `compileOnly` cross-plugin dependencies. Mechanical check: if the plugin has a `compileOnly` dependency on another plugin's API and its functional tests use `withPluginClasspath()`, the fix (a local Maven repo publish step ahead of TestKit) belongs in the sibling `testkit-matrix-and-portal` dive; flag the combination in review even if this dive doesn't own the fix.
- **Declaring a plugin id like `com.example.myplugin` or `myPluginId` (missing the required `.` separator, or not reverse-DNS) because it "reads fine."** LLM-generated scaffolds frequently invent a plausible-looking id without checking Plugin Portal uniqueness or the syntactic rule (must contain a `.` separating namespace from name). Mechanical check: a one-time manual Portal search for the exact id string before first publish; no automated check catches "id already taken by someone else."
- **Writing `providers.environmentVariable("OCX_HOME").getOrElse(System.getenv("OCX_HOME") ?: "...")` — mixing the tracked provider API with a raw `System.getenv()` fallback in the same expression.** This looks defensive but reintroduces an untracked read that undermines the whole point of using the provider. Mechanical check: grep for `System.getenv` co-occurring with `providers.environmentVariable` in the same file; any co-occurrence outside a `ValueSource.obtain()` body is suspect.

## Contested / evolving

- **Whether Settings plugins deserve a separate `build-logic-settings` composite build is a real Gradle-doc caveat but a rare pattern in the exemplar corpus** — only `gradle/gradle` itself (the tool's own build) is confirmed doing it in the sources checked here. As of 2026-09-12 this reads as "documented best practice, not yet a widely-adopted convention" — worth a SHOULD for the OCX plugin (which is itself a Settings plugin) rather than a MUST, pending broader corpus confirmation from the sibling `build-logic-and-catalog-seam` dive.
- **The `ValueSource`/`ExecOperations` combination for reading a CLI's JSON output at configuration time is Gradle's own documented, current-as-of-9.x recommendation, but the docs simultaneously warn `obtain()` runs "on every build."** For a CLI as potentially slow as a tool-provisioning command (`ocx --format json env` may itself perform network or filesystem checks), this trades correctness for a per-build cost that isn't necessarily negligible. Direction: no alternative mechanism is emerging in Gradle 9.x/10 roadmap material found here; the open question is whether `ocx env` itself should cache internally (outside Gradle's knowledge) to keep `obtain()` fast, which is an OCX CLI design question, not a Gradle one.
- **Gradle 10's Provider API migration (targeted 2026, per the topic map's M-F-12) is expected to further restrict eager `Property` initialization patterns that are still legal in 9.x.** Nothing in the fetched Gradle-10-removals list (the current deprecated-list javadoc) yet names a hard removal date for eager-Property patterns specifically — this is flagged in the map as a forward-looking risk, not a settled fact, and should be re-verified once Gradle 10 release notes exist.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/java_gradle_plugin.html](https://docs.gradle.org/current/userguide/java_gradle_plugin.html) | Official Gradle User Manual — Java Gradle Plugin Development reference | Gradle 9.7.1 (current, fetched 2026-09-12) | Primary source for `validatePlugins`, task-property-annotation requirement, plugin-descriptor generation, and the warn-not-fail default behaviour |
| [docs.gradle.org/current/userguide/implementing_gradle_plugins_binary.html](https://docs.gradle.org/current/userguide/implementing_gradle_plugins_binary.html) | Official Gradle User Manual — implementing binary plugins | Gradle 9.7.1 (current) | Primary source for plugin-id naming rules, the plugin/extension/task-type architecture, and Settings-vs-Project plugin framing |
| [docs.gradle.org/current/userguide/best_practices_general.html](https://docs.gradle.org/current/userguide/best_practices_general.html) | Official Gradle User Manual — general Best Practices (part of Gradle's own 2025-introduced Best Practices series) | Gradle 9.7.1 (current) | Primary, verbatim source for the internal-API prohibition, the plugin-ordering-independence rule, and the three afterEvaluate replacements with worked before/after code |
| [docs.gradle.org/current/userguide/configuration_cache_requirements.html](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html) | Official Gradle User Manual — Configuration Cache requirements (plugin-author half) | Gradle 9.7.1 (current) | Primary source for ValueSource, BuildService/ValueSource interaction rules, ExecOperations at configuration time, and the environment-variable-enumeration antipattern |
| [docs.gradle.org/current/userguide/upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html) | Official Gradle User Manual — Upgrading from Gradle 8.x to 9.0 | Published with Gradle 9.0.0 (2025-07-31), viewed at the "current" alias 2026-09-12 | Primary, exact-wording source for the Kotlin-DSL ≥8.11 / Groovy-DSL ≥7.0 / KGP ≥2.0.0 version floors |
| [docs.gradle.org/current/javadoc/deprecated-list.html](https://docs.gradle.org/current/javadoc/deprecated-list.html) | Gradle API 9.7.1 Javadoc — deprecated-list | Gradle 9.7.1 (current) | Primary source enumerating Gradle-10-scheduled removals relevant to plugin authors (`Project.getProperties()`, `Project.container(...)`, and dozens of IDE-plugin/testing-API removals) |
| [rules_ocx/AGENTS.md](file:///home/mherwig/dev/rules_ocx/AGENTS.md) (local, read-only) | The OCX Bazel-extension contract this dive's Gradle analogue is drawn from | Fleet prior art, dated as of this research's fetch | The source of the "no `module_ctx.os`/getenv — repository rules only" invariant (line 65) and the `OCX_ENV_CLASSES` taxonomy (lines 211-249) this dive maps onto Gradle primitives |
| [jvm-audit/config-inventory.md](../jvm-audit/config-inventory.md) | Wave-1 audit of fleet config, `ocx-sdk-python`, and `rules_ocx`/`setup-ocx` prior art (Axis 4) | Fetched/measured 2026-09-05 | Establishes the Gradle-concept mapping table this dive resolves the "open" cells of (ValueSource/BuildService seat, explicit-env classification) |
| [jvm-audit/exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md) | Wave-1 measurement of quality-gate practice across the 32-repo exemplar corpus | Measured against SHAs recorded 2026-09-05 | Source for the `validatePlugins`/`enableStricterValidation` exemplar evidence and the cross-version-matrix pattern (detekt, gradle/actions) |
| [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | Wave-1 measurement of publishing/CI/Bazel practice across the corpus | Measured against SHAs recorded 2026-09-05 | Source for the "`validatePlugins` ≠ publishes a plugin" finding and `gradlePlugin{}` metadata-completeness counts |
| [jvm-topic-map/gradle-canonical.md](../jvm-topic-map/gradle-canonical.md) | Wave-1 canonical-Gradle-practice scout report | Compiled 2026-09-05, itself citing Gradle's structuring-builds doc | Source for the Settings-plugin/`build-logic-settings` build-caching caveat and the `buildSrc`-vs-`build-logic` adoption split |
| [jvm-topic-map.md](../jvm-topic-map.md) | Phase-3 consolidated topic map (conflicts resolved, section F rows M-F-01..12, section D rows M-D-01..04) | Adjudicated 2026-09-05/06 | Binding decisions this dive works within: GRADLE-PLUG's scope, the `validatePlugins`-is-not-a-publish-signal correction, and the exact dive brief this file answers |
| [Gradle Docs — Configuration Cache overview](https://docs.gradle.org/current/userguide/configuration_cache.html) | Official Gradle User Manual — Configuration Cache feature overview | Gradle 9.7.1 (current) | Background context for why the requirements page's rules exist (preferred-with-fallback execution mode in 9.x, per the map's conflict 18) — read for framing, not quoted directly in this file |

