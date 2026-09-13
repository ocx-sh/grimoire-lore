---
title: "Gradle: the build that configures itself correctly"
topic: gradle-core
model: opus
id_family: [GRADLE-CACHE, GRADLE-STRUCT]
consolidates:
  - jvm-gradle-core/config-cache-contract.md
  - jvm-gradle-core/build-logic-and-catalog-seam.md
  - jvm-gradle-core/task-inputs-and-cache-hits.md
date: 2026-09-12
---

# Gradle: the build that configures itself correctly

Consolidates three wave-2 dives into the authoritative source for
`rules/gradle-build/caching-and-correctness.md` (`GRADLE-CACHE`) and
`rules/gradle-build/structure-and-conventions.md` (`GRADLE-STRUCT`).
Everything below is measured against Gradle 9.0.0-9.7.1 and the 32-repo
exemplar corpus at the SHAs in [jvm-frame.md](jvm-frame.md).

## Verdict

1. **The configuration cache is a SHOULD for an adopter's build and a MUST for
   anything this program authors.** Gradle 9.x is *preferred with automatic
   graceful fallback*, and the default-on target slipped from Gradle 10 to 11
   ([cc-dive §1](jvm-gradle-core/config-cache-contract.md),
   [road-to-cc](https://blog.gradle.org/road-to-configuration-cache)). The frame
   and [shape](jvm-audit/exemplar-build-shape.md)'s "Contradictions" section
   both said "on by default in Gradle 9" — both are wrong; the topic map's
   conflict 18 is binding and the dive re-confirmed it from the 9.0.0 release
   notes.
2. **For a Gradle plugin (the OCX Gradle plugin), configuration-cache
   compatibility is a day-one release gate, not a roadmap item** — the plugin
   author does not control when consumers turn it on, and Gradle's trajectory
   makes it a "when" ([cc-dive](jvm-gradle-core/config-cache-contract.md)
   verdict (a)).
3. **Migration order is plugins first, your own tasks second.** Square's
   rollout was blocked by third-party plugins (Anvil, Wire), never by their own
   task code. A rule that opens with `@Inject FileSystemOperations` teaches the
   smaller half of the problem.
4. **Isolated Projects is diagnostics-only.** Incubating since 9.7.0
   (2026-08-06), with two of four constraint categories unenforced by Gradle's
   own admission. Never a failing CI gate in 2026; the live key is
   `org.gradle.isolated-projects` (5/32 corpus; the `unsafe.` key is 0/32).
5. **Gradle 9 flipped archive reproducibility on, which inverts the advice
   everyone repeats.** `reproducibleFileOrder` false→true,
   `preserveFileTimestamps` true→false, permissions umask→0755/0644. The right
   rule is no longer "add the block" — it is "read the wrapper version, then
   treat any explicit setting as an opt-out needing a comment."
   This resolves [pub](jvm-audit/exemplar-publishing-ci-bazel.md) headline 5
   against itself (below).
6. **`build-logic` over `buildSrc` is a SHOULD, and `buildSrc` is never called
   deprecated or legacy** — 9/32 flagships still ship on it, including
   spring-boot's 249-file/25,907-LOC `buildSrc`. Gradle's own page says
   "preferred," not "required."
7. **The Settings-plugin split (`build-logic-settings`) is a SHOULD, not the
   MUST the sub-dive proposed** (conflict resolved below): Gradle's wording is
   comparative ("A better solution"), the cost is build-caching throughput, not
   correctness, and junit-framework plus Gradle's own Developer Advocate's
   reference repo both ship the merged form.
8. **The version-catalog accessor gap is permanent, so the rule names the
   replacement code, not the complaint.** [#15383](https://github.com/gradle/gradle/issues/15383)
   is open since 2020-12-01 with a maintainer calling it architecturally hard;
   `VersionCatalogsExtension.named("libs").findLibrary(...)` is the sanctioned
   form and `org.gradle.accessors.dm.LibrariesForLibs` is banned outright.
9. **Task-input annotations are a correctness surface, not a performance
   surface** — a missing annotation silently disables up-to-date checking for
   the whole task, and `validatePlugins` (which fails the build) is a different
   gate from the jar-time check (which only warns). Any published plugin runs
   the former as an explicit CI step.
10. **Consumer-kind split, stated once**: *library/application* — cache on via
    `gradle.properties`, archive defaults untouched. *Gradle plugin* —
    plus a TestKit `--configuration-cache` assertion and
    `validatePlugins { enableStricterValidation = true }`. *SDK* — same as
    library, plus the catalog-accessor discipline from day one because its
    build starts on `build-logic`.

## The ruleset

Severity: **MUST** = block · **SHOULD** = warn · **CONSIDER** = suggest.
Version floor is blank where the rule predates Gradle 9 and is unchanged by it.

### GRADLE-CACHE — `rules/gradle-build/caching-and-correctness.md`

**Group 1 — caught by running the real build with `--configuration-cache`.**
Verification for all of 01-05: run the invocation CI uses with
`--configuration-cache` appended. Gradle prints an "N problems were found" line
and writes `build/reports/configuration-cache/**/configuration-cache-report.html`
*only when problems exist* — **no line and no report file is the pass signal**;
there is no separate check task
([cc-dive §5](jvm-gradle-core/config-cache-contract.md)). The greps below are
pre-filters for a diff review, not substitutes.

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-CACHE-01 | Never touch a `Project` from a task action — no `Task.getProject()`, no `project.copy {}`, no `project.exec {}`, no `project.logger`. Inject `FileSystemOperations`/`ExecOperations` and bind every value read from `Project` to a `Property<T>` at configuration time. | Hard configuration-cache violation and an independently-stated Gradle Best Practice; the "obvious" API still compiles. | The Group-1 command; pre-filter `grep -rn 'getProject()\|project\.' --include='*.gradle.kts' --include='*.kt' --include='*.java'` inside `doLast`/`doFirst`/`@TaskAction` bodies. | MUST | |
| GRADLE-CACHE-02 | Never read a file, spawn a process, or resolve a `Configuration` at configuration time. Use `providers.fileContents(f).asText`, `providers.exec()`/`providers.javaexec()`, a `ValueSource` for anything else, and defer resolution into the task action behind a `FileCollection`/`Provider`. | An undeclared read or exec is an untracked cache input; resolution-at-configuration-time also defeats configuration avoidance. It is still *legal* — [#2298](https://github.com/gradle/gradle/issues/2298) is open — so no tool fails it for you. | The Group-1 command; pre-filter `grep -rn 'readText()\|Files.readString\|Files.readAllLines\|ProcessBuilder(\|Runtime.getRuntime().exec' --include='*.gradle.kts' --include='*.kt'` outside task actions. | MUST | |
| GRADLE-CACHE-03 | Never enumerate `System.getenv()` or `System.getProperties()`. Read one named key, or `providers.environmentVariablesPrefixedBy("PREFIX")`. | "Every available property becomes one [cache input]" — a single `.forEach {}` turns the whole environment into cache-busting state. | The Group-1 command; pre-filter `grep -rn 'System\.getenv()\.\|System\.getProperties()\.' --include='*.gradle.kts' --include='*.kt'` — any hit with no argument to `getenv` is the finding. | MUST | |
| GRADLE-CACHE-04 | Never register a `BuildListener` or `TaskExecutionListener` from a plugin or build script. Use a Build Service implementing `OperationCompletionListener`, registered through `BuildEventsListenerRegistry`. | Flatly disallowed with **no fallback flag** — and still an unsolved migration gap for build-start/finish hooks ([#18520](https://github.com/gradle/gradle/issues/18520), open). | `grep -rn 'addBuildListener\|gradle.addListener\|TaskExecutionListener\|BuildListener' --include='*.gradle.kts' --include='*.kt' --include='*.java'` — any hit is the finding. | MUST | |
| GRADLE-CACHE-05 | Never hold live-JVM state in a task field or capture it in a task action: `ClassLoader`, `Thread`, `Socket`, `OutputStream`, `Lock`, `ReadWriteLock`, `Semaphore`, `CountDownLatch`, `CyclicBarrier`, `Phaser` — nor `Gradle`, `Settings`, `SourceSet`, `Configuration`, `SourceDirectorySet` as inputs. A Build Service holds shared live state; `FileCollection`/`FileTree`/`Provider<ResolvedComponentResult>` replace the coarse types. | These "do not represent task inputs or outputs" and cannot be serialized into a cache entry. `System.in/out/err` are the one documented exception, for `Exec`/`JavaExec`. | The Group-1 command names the offending field and class. | MUST | |
| GRADLE-CACHE-06 | Turn the cache on with `org.gradle.configuration-cache=true` in the root `gradle.properties`, not with a CI-only `--configuration-cache` flag, and leave `--configuration-cache-problems` at its default `fail`. `warn` is a migration aid with a tracked expiry, never a steady state. | CI overwhelmingly inherits the property (10/32) rather than re-asserting the flag (3/32), so "check `gradle.properties` first" is the reading heuristic. Gradle 9 also removed warn mode's old escape hatch: a task marked `notCompatibleWithConfigurationCache` now always discards the entry. | `grep -n 'configuration-cache' gradle.properties` — absent means opt-in has not happened; then `grep -rn 'configuration-cache-problems=warn' .github/` — any hit without a linked tracking issue is the finding. | SHOULD | 9.0.0 |
| GRADLE-CACHE-07 | A published Gradle plugin MUST carry a TestKit test asserting `GradleRunner.withArguments(..., "--configuration-cache").build()` succeeds with zero reported problems, run in plugin CI. | Plugin authors do not control when consumers enable the cache, and an incompatible plugin is what actually blocks *their* migration (Square). | The TestKit test's own assertion; in CI, the job must exist and be required. | MUST (plugin) | 9.0.0 |
| GRADLE-CACHE-08 | Never read "the build went green" as "the build was cached". Gradle 9 silently *disables* the cache for a task rather than failing in several documented cases — a `maven-publish` repository with explicit `credentials {}` is the named one ([#24040](https://github.com/gradle/gradle/issues/24040)). | "Automatic graceful fallback" means a permanently-uncached task produces no error at all. | Run the build twice; the second run must print `Reusing configuration cache.` — absence of that line on the second identical invocation is the finding. Pre-filter `grep -rn -A3 'credentials' build.gradle.kts` for literal credential blocks vs `PasswordCredentials`/env-backed providers. | SHOULD | 9.0.0 |
| GRADLE-CACHE-09 | Write `org.gradle.isolated-projects`; never `org.gradle.unsafe.isolated-projects`. | The `unsafe.` key is the name that dominated blogs and training data for years; deprecated as of 9.7.0 and slated for removal. 0/32 corpus repos use it, 5/32 use the live key. | `grep -rn 'unsafe.isolated-projects' **/gradle.properties` — **any** hit is the finding; empty output is the pass. | MUST | 9.7.0 |
| GRADLE-CACHE-10 | Do not gate CI on Isolated Projects. Run it manually in Diagnostics mode to collect violations; keep it out of the required checks. | Incubating only since 9.7.0 (2026-08-06); Gradle's own docs say cross-build and build-to-project constraints are "not fully enforced yet", and `group`/`version` are mutable despite looking like identity. | `grep -n 'isolated-projects' gradle.properties` plus the CI workflow: the property set *and* the job required is the finding. | SHOULD | 9.7.0 |

**Group 2 — caught by `./gradlew validatePlugins` (with `enableStricterValidation = true`).**
The task fails the build by default; the jar-time check that `java-gradle-plugin`
also installs only *warns*. Empty output from `validatePlugins` is the pass.

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-CACHE-11 | Every task and artifact-transform property carries exactly one of `@Input`/`@InputFile`/`@InputDirectory`/`@InputFiles`/`@OutputFile`/`@OutputDirectory`/`@Nested`/`@Internal`/`@Console`. `@Optional` is a modifier, never the whole annotation. | An unannotated property silently disables up-to-date checking and caching for the **whole task** — no error, just a task that always reruns or never does. | `./gradlew validatePlugins` reports `missing_annotation`. | MUST | |
| GRADLE-CACHE-12 | Never annotate a `File`/`RegularFileProperty`/`DirectoryProperty` with `@Input`. Use `@InputFile`/`@InputDirectory`. | Gradle stores the *value* (the path), not the content — the file can change under you undetected. This is the most natural-language-plausible mistake in the whole annotation set. | `validatePlugins` reports `incorrect_use_of_input_annotation`; reviewer heuristic — "does the declared type implement `FileSystemLocation`/`File`/`FileCollection`? then `@Input` is wrong on sight". | MUST | |
| GRADLE-CACHE-13 | Every file input of a cacheable task declares a normalization strategy: `@PathSensitive(NONE)` for a single file, `@PathSensitive(RELATIVE)` for a directory, `@Classpath`/`@CompileClasspath` for a classpath. Never `ABSOLUTE`, and never `ABSOLUTE` on a cacheable transform at all. | `ABSOLUTE` makes the build cache non-relocatable across machines and checkout locations — the top named cause of cross-machine misses. Without any strategy, Gradle's own text says caching is "highly ineffective". | `validatePlugins` reports `missing_normalization_annotation` and `cacheable_transform_cant_use_absolute_sensitivity`; pre-filter `grep -rn 'PathSensitivity.ABSOLUTE'`. | MUST | |
| GRADLE-CACHE-14 | A JVM *compile* classpath input is `@CompileClasspath`, not `@InputFiles` and not `@Classpath`. | `@CompileClasspath` ignores everything but ABI-affecting class changes (method bodies, private members, resources, manifests, debug info, jar paths, entry order) — it is what makes compile avoidance possible. `@InputFiles` busts the cache on an upstream jar's timestamp. | `grep -rn -B2 '[Cc]lasspath' <task sources>` — a property named `*[Cc]lasspath` or fed from `sourceSets.*.compileClasspath` annotated anything but `@CompileClasspath` is the finding. | SHOULD | |
| GRADLE-CACHE-15 | Wire a task's dependency on another task's output through the `Provider`/task-output chain (`.from(producerTask)`, `.set(producer.flatMap { it.outputFile })`). Never a bare `File`/`archivePath` reference, with or without `dependsOn`. | `implicit_dependency`: the build then works only by incidental ordering and breaks on `--parallel` or a clean checkout. `dependsOn` orders but does not declare the input. | `validatePlugins` reports `implicit_dependency`; reproduce with a clean checkout plus `--parallel`. | MUST | |
| GRADLE-CACHE-16 | A module that publishes a Gradle plugin runs `./gradlew validatePlugins` as its own explicit CI step, with `validatePlugins { enableStricterValidation = true }`. Never assume `build`/`check`/`jar` pulls it in. | Two different checks exist: the jar-time one warns, `ValidatePlugins` fails. `java-gradle-plugin` registers the task on any convention-plugin module too, so the task's *existence* proves nothing — 10/32 corpus hits are internal build-logic modules with no Portal publishing at all. | The CI workflow file contains the literal `validatePlugins` invocation; the routing condition for "does this repo publish a plugin" is `com.gradle.plugin-publish`, never the presence of `validatePlugins`. | MUST (plugin) | |

**Group 3 — caught by reading `gradle/wrapper/gradle-wrapper.properties` first, then grepping.**

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-CACHE-17 | On Gradle ≥ 9.0.0, do not add `reproducibleFileOrder`/`preserveFileTimestamps`/`useFileSystemPermissions()` to an archive task; read any existing setting as a reproducibility **opt-out** that must carry a justifying comment or be deleted. On Gradle < 9.0.0, the absence of `reproducibleFileOrder = true; preserveFileTimestamps = false` is the finding instead. | 9.0.0 flipped all three defaults together (`false→true`, `true→false`, umask→0755/0644). Setting them to the *new* values is dead code; setting them to the *old* values is an active regression to non-deterministic archives, usually carried forward unexamined across the 8→9 upgrade. | Read `distributionUrl` in `gradle/wrapper/gradle-wrapper.properties`; if ≥ 9.0, `grep -rn 'reproducibleFileOrder\|preserveFileTimestamps\|useFileSystemPermissions' --include='*.gradle*'` — any hit without an adjacent justifying comment is the finding. Note the grep over-reports ~3x: `preserveFileTimestamps` is also a hand-written Shadow `Transformer` parameter name; read each hit's task context. | MUST | 9.0.0 |

### GRADLE-STRUCT — `rules/gradle-build/structure-and-conventions.md`

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-STRUCT-01 | Put new shared build logic in an included `build-logic` build wired by `includeBuild("build-logic")` in the root settings file. Do **not** call an existing `buildSrc` deprecated, legacy, or a defect, and do not propose migrating one as a required fix. | Any change under `buildSrc` invalidates the entire configuration phase; an included build invalidates only the consumers of the changed subproject. But 9/32 actively-maintained flagships still ship `buildSrc`, and Gradle has announced no deprecation — "preferred" is the strongest word the docs use. | `test -d buildSrc && ! grep -q 'includeBuild' settings.gradle*` flags a candidate for the *recommendation*; a review comment using "deprecated" or "legacy" about `buildSrc` is itself the finding. | SHOULD | |
| GRADLE-STRUCT-02 | When a repo's build-logic holds **both** Settings plugins and ordinary convention plugins, split the Settings plugins into a separate minimal included build (`build-logic-settings`) included only from `pluginManagement { includeBuild(...) }`. | A build included from `pluginManagement` must be built before `settings.gradle.kts` is even evaluated, i.e. before any cache entry can exist; Gradle's own caveat is that this "reduces Build Caching capability". Dragging ordinary convention plugins through that path costs caching for no benefit. | `grep -n -A3 'pluginManagement' settings.gradle.kts` for `includeBuild`; then list that build's plugin sources — if it also contains non-`*.settings.gradle.kts` precompiled plugins, that is the finding. | SHOULD | |
| GRADLE-STRUCT-03 | Never write a dot-notation version-catalog accessor (`libs.guava`, `libs.versions.jacoco`) inside a precompiled script plugin. Bind the catalog locally: `val libs = extensions.getByType<VersionCatalogsExtension>().named("libs")`, then `libs.findLibrary("guava").get()` / `findVersion(...)` / `findPlugin(...)`. | Type-safe accessors are not generated for precompiled scripts — the plugin is compiled standalone, before Gradle knows which build (and catalog) will apply it. [#15383](https://github.com/gradle/gradle/issues/15383) has been open since 2020-12-01 and nothing in 9.x changed it. | `grep -rn 'libs\.[a-zA-Z]' build-logic/*/src/main/kotlin/*.gradle.kts buildSrc/src/main/kotlin/*.gradle.kts` — any hit in a file that does not itself bind `libs` from `VersionCatalogsExtension` is a compile error waiting to surface. | MUST | |
| GRADLE-STRUCT-04 | Never import `org.gradle.accessors.dm.LibrariesForLibs` (or a per-catalog `LibrariesFor<Name>`) to restore dot-notation. | It is a Gradle-internal generated class: it breaks across Gradle upgrades, breaks when one precompiled plugin applies another, and has a known classloading failure under `buildSrc/test`. Multiple pre-docs-page blog answers present it as *the* fix, so models reach for it. | `grep -rn 'org.gradle.accessors.dm' build-logic/ buildSrc/` — any hit is the finding; empty output is the pass. | MUST | |
| GRADLE-STRUCT-05 | Never write `alias(libs.plugins.x)` inside a precompiled script plugin's `plugins {}` block. Declare the plugin's marker artifact (`<pluginId>:<pluginId>.gradle.plugin:<version>`) in the build-logic module's own `dependencies {}` and apply it by `id("...")` in the script body. | The `plugins {}` block is extracted and evaluated against a dummy project before any catalog exists — there is no workaround, supported or otherwise, for this one case. | `grep -n 'alias(libs.plugins' build-logic/*/src/main/kotlin/*.gradle.kts` — a hit inside a precompiled *script plugin* is the finding; `alias(...)` in `build-logic/build.gradle.kts` itself is fine. | MUST | |
| GRADLE-STRUCT-06 | If anything under `buildSrc` reads the main build's version catalog, `buildSrc/settings.gradle.kts` must re-declare it: `dependencyResolutionManagement { versionCatalogs { create("libs") { from(files("../gradle/libs.versions.toml")) } } }`. | `buildSrc` is an independent Gradle build and inherits no `dependencyResolutionManagement` from the root; without this the build fails at `buildSrc` configuration time with an unresolved catalog. | If `buildSrc/**` references `libs.` or `versionCatalogs.named(`, `grep -n 'versionCatalogs' buildSrc/settings.gradle.kts` must be non-empty. | MUST | |
| GRADLE-STRUCT-07 | Express cross-cutting configuration as a convention plugin. Do not configure subprojects from the root build file with `allprojects {}` / `subprojects {}` / `project(":x") { }` beyond trivial `group`/`version` assignment. | Gradle's own docs name it an anti-pattern that "obscures build logic and introduces coupling that prevents optimizations"; it is also the shape that makes a build hardest to make configuration-cache- and Isolated-Projects-clean later. | `grep -n 'allprojects\s*{\|subprojects\s*{' build.gradle build.gradle.kts` in the **root** file — any hit doing more than `group`/`version` is the finding. | MUST | |
| GRADLE-STRUCT-08 | Set `rootProject.name` explicitly in the root settings file. | Otherwise it defaults to the checkout directory name, so the same source tree produces differently-named artifacts and cache keys in different directories. 6/20 corpus root settings files leave it defaulted. | `grep -q 'rootProject.name' settings.gradle*` — empty is the finding. | SHOULD | |
| GRADLE-STRUCT-09 | Before adding a module, find out how the module list is produced. Where a build generates it (directory walk, an `includeProject()` helper, a custom settings DSL), add the module through that mechanism — never append a literal `include(":x")` beside it, and never count `include(` lines to enumerate modules. | 8 of 20 multi-module corpus repos generate the list, including ktor (whose settings file says so in a comment) and gradle/gradle. A literal `include()` added next to a generator either duplicates an entry or is silently ignored. | Read `settings.gradle.kts` end to end before editing it; `grep -n 'include\|fileTree\|listFiles\|walk' settings.gradle*` — a loop or helper function means the generated path is the one to use. | SHOULD | |

## Applied to the exemplars and the two future consumers

**Already satisfied by the strict exemplars**

| Rule | Evidence |
|---|---|
| GRADLE-CACHE-09 | `android__nowinandroid@12f80da651:gradle.properties`, `gradle__gradle@ea17004a31:gradle.properties`, GradleUp/shadow, junit-framework, okhttp all use `org.gradle.isolated-projects`; **0/32** use the `unsafe.` key ([shape §4](jvm-audit/exemplar-build-shape.md)) |
| GRADLE-CACHE-06 | 11/20 `gradle.properties`-bearing repos set `org.gradle.configuration-cache=true`; 19/20 set `org.gradle.caching=true` ([shape §4](jvm-audit/exemplar-build-shape.md)) |
| GRADLE-CACHE-16 | `detekt__detekt@45672efb8b:detekt-gradle-plugin/build.gradle.kts:229-231` — `validatePlugins { enableStricterValidation = true }`, the only corpus instance ([gates](jvm-audit/exemplar-quality-gates.md) §5) |
| GRADLE-STRUCT-02 | `gradle__gradle@ea17004a31:settings.gradle.kts:9-11` + `build-logic-settings/` (5 settings-only sub-builds); `ktorio__ktor@f92fad0435:settings.gradle.kts:8-17` + `build-settings-logic/` |
| GRADLE-STRUCT-03 | `google__dagger@4fbc045d2b:buildSrc/src/main/kotlin/dagger/gradle/build/VersionCatalogs.kt:1-38`; `detekt__detekt@45672efb8b:build-logic/src/main/kotlin/module.gradle.kts:14`; `square__okhttp@dfcfab3824:build-logic/src/main/kotlin/okhttp.jvm-conventions.gradle.kts:9-13` |
| GRADLE-STRUCT-04 | **0/32** — no corpus repo at the measured SHAs uses the internal `LibrariesForLibs` hack |

**Violated by prominent exemplars**

| Rule | Violation |
|---|---|
| GRADLE-CACHE-17 | `apache__kafka@940c100fab:build.gradle:362-364` sets `reproducibleFileOrder = false; preserveFileTimestamps = true; useFileSystemPermissions()` — byte-for-byte Gradle's own "restore pre-9.0 behaviour" snippet — while its wrapper pins **9.7.1**. An active, total opt-out of reproducible archives, with no comment. |
| GRADLE-CACHE-17 (dead code) | `micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:74-75` and `diffplug__spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209` both set the values that are now the 9.x defaults — correct for pre-9, dead on 9+. |
| GRADLE-STRUCT-07 | `apache__kafka@940c100fab:build.gradle` — a 4425-line root file configuring every subproject inline through `subprojects {}`/`project(":x") {}`, the corpus's starkest cohesion smell ([shape §7, Smells #3](jvm-audit/exemplar-build-shape.md)). |
| GRADLE-STRUCT-02 | `junit-team__junit-framework@35c56a8e02:settings.gradle.kts:2-4` includes two ordinary modules (`gradle/base`, `gradle/plugins`) inside one `pluginManagement {}` block with no settings-only module; jjohannes's `gradle-project-setup-howto` goes further and ships one merged `gradle/plugins`. This is why the rule is SHOULD. |
| GRADLE-STRUCT-08 | 6/20 leave `rootProject.name` defaulted: kafka, sqldelight, spotless, micronaut-core, testcontainers-java, NullAway ([shape §7](jvm-audit/exemplar-build-shape.md)). |
| GRADLE-CACHE-16 (routing trap, not a violation) | `android__nowinandroid@12f80da651` and `cashapp__sqldelight@4580923af3` run `validatePlugins` with **zero** Plugin Portal signal — internal convention-plugin modules. A rule keying "publishes a plugin" off `validatePlugins` misfires ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) §Patterns). |

**Not measurable in the corpus.** GRADLE-CACHE-01..05 and -15 are task/plugin-internals
violations the wave-1 audits never source-grepped for. They rest on Gradle's own
documented contract plus live tracker evidence ([#18520](https://github.com/gradle/gradle/issues/18520),
[#19793](https://github.com/gradle/gradle/issues/19793),
[#24040](https://github.com/gradle/gradle/issues/24040)), not on corpus
counter-examples. Say so in the depth file rather than implying a measurement.

**New commitments for the OCX SDK (JVM)**

- `build-logic` included build from the first commit (GRADLE-STRUCT-01) — greenfield,
  so the SHOULD is free — with GRADLE-STRUCT-03/04/05 binding from day one.
- `org.gradle.configuration-cache=true` in `gradle.properties`, problems mode left at
  `fail` (GRADLE-CACHE-06 raised to MUST for this repo).
- Archive reproducibility: add nothing (GRADLE-CACHE-17). This is a *new* posture —
  only 2/32 exemplars configure archives reproducibly at all, and on Gradle 9 the
  correct configuration is the empty one.
- The SDK's CI matrix (ubuntu/macos/windows × JDK versions, mirroring
  `ocx-sdk-python`'s, [cfg Axis 3](jvm-audit/config-inventory.md)) must not re-assert
  `--configuration-cache` per job; the property is the single switch.

**New commitments for the OCX Gradle plugin**

- GRADLE-CACHE-07 and GRADLE-CACHE-16 are MUSTs on day one, with the cross-version
  TestKit matrix the corpus already demonstrates (`gradle/actions` matrixes 6.9 →
  `release-candidate`; detekt runs a parallel `…MinSupportedGradle` functional-test
  task) ([gates](jvm-audit/exemplar-quality-gates.md) §Patterns 5).
- The plugin's own mechanics are GRADLE-CACHE-02 and -05 stated positively:
  `ocx --format json env` / `inspect --closure` must be read through a **`ValueSource`**,
  and the resolved `OCX_HOME`/tool paths held in a **Build Service** exposing
  `Provider<RegularFile>` to consuming tasks. This is the same discipline `rules_ocx`
  already enforces on the Bazel side ("no `module_ctx.os`, no getenv — repository rules
  only"), which [cfg Axis 4](jvm-audit/config-inventory.md) calls the single most
  load-bearing carry-over in the file.
- `OCX_ENV_CLASSES`' four classes (site/translucent/explicit/pinned) map onto
  GRADLE-CACHE-03: the plugin builds the spawned-process environment explicitly and
  never enumerates the ambient one.
- GRADLE-STRUCT-02 does **not** yet apply to the plugin's own repo: it is a Settings
  plugin, but the split concerns the plugin author's *own* build-logic, and consumers
  apply the published plugin through ordinary `pluginManagement { plugins { id(...) } }`,
  never `includeBuild`. It becomes live the moment that repo grows a second, ordinary
  build-logic module.

## Conflicts resolved

1. **Kafka's archive block: no-op or opt-out?** [pub](jvm-audit/exemplar-publishing-ci-bazel.md)
   headline 5 and footnote ‡‡ call it "Gradle's own defaults, a no-op" and drop the real
   reproducible-archive count to 2/32 on that basis. The
   [task-inputs dive](jvm-gradle-core/task-inputs-and-cache-hits.md) §6-7 re-fetched
   `upgrading_major_version_9.html` and the `AbstractArchiveTask` javadoc: those were the
   **pre-9.0** defaults, kafka's wrapper pins 9.7.1, and the block is line-for-line
   Gradle's documented revert snippet. **Resolved for the dive** (release notes are
   normative over an audit's inference): it is an active opt-out. This is what makes
   GRADLE-CACHE-17 a version-gated rule instead of the usual "add the block" advice.
2. **Configuration cache on by default in Gradle 9?** [shape](jvm-audit/exemplar-build-shape.md)
   "Contradictions" asserts "Gradle 9's default is already on regardless of the property";
   the [cc dive](jvm-gradle-core/config-cache-contract.md) §1 fetched the 9.0.0 release
   notes and `road-to-configuration-cache` and found preferred-with-fallback, default
   targeted at **11**. **Resolved for the dive**; the topic map's conflict 18 already
   bound this and the audit sentence is an overstatement, not a corrected fact.
3. **`build-logic-settings`: MUST or SHOULD?** The
   [build-logic dive](jvm-gradle-core/build-logic-and-catalog-seam.md) candidate #2 says
   MUST once the repo carries an ordinary build-logic module; its own "Contested" section
   then records junit-framework and jjohannes's reference repo doing the merged form and
   concludes the split correlates with build *size*, with no stated threshold anywhere.
   **Resolved to SHOULD** (GRADLE-STRUCT-02): Gradle's own wording is comparative ("A
   better solution"), the cost is caching throughput rather than correctness, and a MUST
   would flag JUnit and the Gradle Developer Advocate's own teaching repo.
4. **Does CI have to pass `--configuration-cache`?** The cc dive's candidate #6 reads as
   "CI must actually run with the flag"; [pub](jvm-audit/exemplar-publishing-ci-bazel.md)
   §9 measured the flag in 3/32 workflows against the property in 10/32. **Resolved:** the
   property is the canonical switch and the check reads `gradle.properties` first
   (GRADLE-CACHE-06); a CLI flag in CI is for *overriding* the property in one job, and
   requiring it would flag almost every adopter.
5. **`validatePlugins`: warns or fails?** The map's M-D-05 and `java_gradle_plugin.html`
   say "only warns at jar time"; the `ValidatePlugins` javadoc says the task fails the
   build by default. **Resolved: both, and they are two different gates** — the jar-time
   check warns, the task fails, and a plugin author who only runs `build` never hits the
   second. GRADLE-CACHE-16 requires the explicit invocation for exactly this reason.
6. **Isolated Projects as a maturity signal.** 5/32 adoption reads as "ready" until the
   9.7.0 docs' own "not fully enforced yet" on two constraint categories is read.
   **Resolved:** adoption of the *property* is not adoption of a *gate* (GRADLE-CACHE-10).

## AI-agent failure modes

Ranked by how often the failure fires when an agent edits a Gradle build,
each with the check that catches it mechanically.

1. **Writes `project.copy {}` / `project.exec {}` / `Task.project` inside a task
   action.** The idiomatic Groovy-era pattern, saturating training data, still
   compiles, and is a hard cache violation. → Group-1 command; the correct shape
   shows `@get:Inject abstract val fs: FileSystemOperations`.
2. **Writes `libs.guava` inside a `build-logic`/`buildSrc` precompiled script
   plugin.** It works everywhere else in a Kotlin-DSL build; the exception is
   narrow and invisible. → `grep -rn 'libs\.[a-zA-Z]'` under
   `*/src/main/kotlin/*.gradle.kts` where `libs` is not locally bound.
3. **Asserts "Gradle 9 has the configuration cache on by default."** Plausible,
   half-true, and it makes the agent skip the `gradle.properties` line that
   actually turns it on. → `grep -n 'configuration-cache' gradle.properties`
   before asserting anything.
4. **Emits `org.gradle.unsafe.isolated-projects`.** The key that dominated blogs
   and talks for years. → `grep -rn 'unsafe.isolated-projects'`; any hit is stale.
5. **Annotates a file property `@Input`.** "Input" reads as the generic choice.
   → `validatePlugins` → `incorrect_use_of_input_annotation`; or the type test
   ("implements `FileSystemLocation`? then `@Input` is wrong on sight").
6. **Annotates a compile classpath `@InputFiles`.** The tutorial-era default for
   every file collection. → grep any `*[Cc]lasspath` property's annotation.
7. **Copy-pastes "add `preserveFileTimestamps = false`" as the reproducibility
   fix.** On Gradle 9 it is dead code, and pattern-matching the *inverse* as
   "already fixed" is actively wrong (kafka). → read
   `gradle-wrapper.properties` before touching archive tasks.
8. **Recommends `org.gradle.accessors.dm.LibrariesForLibs` as the sanctioned
   fix.** Pre-docs-page blog answers present it as *the* solution. → `grep -rn
   'org.gradle.accessors.dm'`.
9. **Calls `buildSrc` "deprecated" or "legacy".** Strongly-worded "always use
   build-logic" posts compress into a false deprecation claim that would flag 9
   flagships. → flag the words themselves in a review comment; the correct
   phrasing is "SHOULD migrate; not required".
10. **Writes `gradle.addBuildListener(...)` for a "log build start/finish"
    helper.** The textbook implementation of a very common ask, and the API still
    compiles. → `grep -rn 'addBuildListener\|addListener'`.
11. **Enumerates `System.getenv()` "to be safe"** when asked to read one
    templated env var. → `grep -rn 'System\.getenv()\.'` (no argument).
12. **Reports a plugin as validating cleanly because `./gradlew tasks` lists
    `validatePlugins`.** → run the task; read `BUILD FAILED`/`BUILD SUCCESSFUL`.
13. **Suggests `alias(libs.plugins.x)` inside a precompiled plugin's `plugins {}`
    block** as the fix for "plugin version not found". No Gradle version supports
    it. → `grep -n 'alias(libs.plugins' build-logic/*/src/main/kotlin/*.gradle.kts`.
14. **Treats Isolated Projects as production-ready because "it's in Gradle 9."**
    → any guidance recommending it as a required CI gate must name the incubating
    status and the two unenforced constraint categories, or it is ahead of reality.
15. **Assumes #15383 was fixed** because the thread has had several false-hope
    moments. → re-fetch the issue state; open as of 2026-09-12.

## Open questions

**Owner decisions**

1. **Is the OCX Gradle plugin a Settings plugin, a project plugin, or both?**
   [cfg Axis 4](jvm-audit/config-inventory.md) maps `rules_ocx`'s root-only
   `download`/`policy` tag classes onto a Settings plugin and its per-module
   `package` tag onto a project extension — i.e. *both*. That decides whether
   GRADLE-STRUCT-02 binds its own repo, and whether the TestKit matrix in
   GRADLE-CACHE-07 must exercise settings-time application (which is where
   `pluginManagement`-included builds hit the pre-cache path).
2. **Does the OCX SDK's and plugin's CI run Isolated Projects in diagnostics mode
   now, or wait?** GRADLE-CACHE-10 says never gate; running diagnostics early is
   cheap and would make the eventual flip boring, but it is a standing time cost
   on a feature Gradle itself calls incubating.
3. **Coverage-style hard floors vs Gradle's own posture**: GRADLE-CACHE-06 is
   SHOULD for adopters and MUST for this program's own repos. Confirm that
   asymmetry is wanted before it is written into a published rule.

**Subareas that deserve another research round**

| Subarea | Question |
|---|---|
| `maven-publish` × configuration cache | Is `maven-publish` fully cache-compatible on Gradle 9.7.x, partially (only the explicit-credentials path falls back), or still broadly incompatible? The cc dive fetched [#24040](https://github.com/gradle/gradle/issues/24040) and a March-2025 Gradle blog claim and could **not** resolve it. This blocks a precise GRADLE-CACHE-08 and touches `GRADLE-PUB` directly. |
| GRADLE-STRUCT rows never dived | M-B-05 (two subprojects sharing a leaf name causing wrong conflict resolution, [#847](https://github.com/gradle/gradle/issues/847), 137 reactions, **no build failure**) and M-B-07 (a subproject `gradle.properties` overriding root settings the configuration cache assumes fixed) were both adjudicated P0/P1 and neither wave-2 dive covered them. Both are silent-failure shapes, which is exactly where a rule earns its keep. |
| Remote build cache push-gating | 10 `buildCache {}` blocks across 6 repos, but **no** checked-out `settings.gradle*` showed `remote(HttpBuildCache) { isPush = ... }` — the push conditions live in build-logic the sparse checkout never materialised ([gates](jvm-audit/exemplar-quality-gates.md) §Gaps). "Who may push to the shared cache" is the one build-cache correctness question the corpus has not answered. |
| Gradle 10 archive defaults | GRADLE-CACHE-17 is framed 9-vs-8. Nothing in the 9.0.0/9.7.0 notes says whether Gradle 10 changes archive reproducibility again; re-check when 10's notes exist. |

## Sub-artifacts

- [config-cache-contract.md](jvm-gradle-core/config-cache-contract.md) — the Gradle 9.x
  configuration-cache contract: every disallowed type and configuration-time operation
  with its documented replacement, the CLI/property surface, Isolated Projects' real
  status, and Square's migration postmortem.
- [build-logic-and-catalog-seam.md](jvm-gradle-core/build-logic-and-catalog-seam.md) —
  `buildSrc` vs included `build-logic` (invalidation scope, both named caveats) and the
  version-catalog accessor gap in precompiled script plugins, with the supported
  workaround written as code.
- [task-inputs-and-cache-hits.md](jvm-gradle-core/task-inputs-and-cache-hits.md) — the
  full incremental-build annotation table, `@PathSensitive` per input kind,
  `@Classpath` vs `@CompileClasspath`, all 31 validation-problem IDs classified, and the
  Gradle 9 reproducible-archive flip resolved against three exemplar hits.

## Key sources

| URL | Why |
|---|---|
| [configuration_cache_requirements.html](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html) | The grep-able contract behind GRADLE-CACHE-01..05 |
| [configuration_cache_enabling.html](https://docs.gradle.org/current/userguide/configuration_cache_enabling.html) | Exact flags and properties; `fail` is the documented default problems mode |
| [isolated_projects.html](https://docs.gradle.org/current/userguide/isolated_projects.html) | The live key, the forbidden-state list, and the two "not fully enforced yet" categories |
| [docs.gradle.org/9.0.0/release-notes.html](https://docs.gradle.org/9.0.0/release-notes.html) | "Preferred mode", automatic fallback, warn-mode discard change, archive reproducibility |
| [docs.gradle.org/9.7.0/release-notes.html](https://docs.gradle.org/9.7.0/release-notes.html) | Isolated Projects experimental→incubating; `unsafe.` key deprecation |
| [upgrading_major_version_9.html](https://docs.gradle.org/current/userguide/upgrading_major_version_9.html) | The exact old→new archive defaults and Gradle's own revert snippet |
| [blog.gradle.org/road-to-configuration-cache](https://blog.gradle.org/road-to-configuration-cache) | The 10.0→11.0 default-target slip |
| [incremental_build.html](https://docs.gradle.org/current/userguide/incremental_build.html) | The full annotation table and `@Classpath` vs `@CompileClasspath` semantics |
| [best_practices_tasks.html](https://docs.gradle.org/current/userguide/best_practices_tasks.html) | `@PathSensitive` per-kind rule, "don't access Project at execution", "avoid dependsOn" |
| [validation_problems.html](https://docs.gradle.org/current/userguide/validation_problems.html) | All 31 problem IDs, 9 of them caching-correctness |
| [ValidatePlugins javadoc](https://docs.gradle.org/current/javadoc/org/gradle/plugin/devel/tasks/ValidatePlugins.html) | The task fails by default; `enableStricterValidation` |
| [java_gradle_plugin.html](https://docs.gradle.org/current/userguide/java_gradle_plugin.html) | The jar-time check warns only — the other half of conflict 5 |
| [best_practices_structuring_builds.html](https://docs.gradle.org/current/userguide/best_practices_structuring_builds.html) | "Preferred location … not `buildSrc`", verbatim, plus both caveats |
| [version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html) | `VersionCatalogsExtension` workaround and the `buildSrc` catalog re-import |
| [gradle/gradle#15383](https://github.com/gradle/gradle/issues/15383) | The accessor gap: architectural cause, every workaround, still open 2026-06-22 |
| [gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040) | Gradle 9 silently disables the cache for credentialed publish tasks |
| [Square: 5,400 hours a year](https://developer.squareup.com/blog/5-400-hours-a-year-saving-developers-time-and-sanity-with-gradles/) | The load-bearing precedent that plugins, not tasks, block migration |
