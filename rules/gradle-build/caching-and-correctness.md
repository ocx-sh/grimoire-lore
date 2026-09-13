---
title: Configuration Cache and Task Correctness
summary: The GRADLE-CACHE family, covering configuration-cache compatibility, task input and output declaration, Isolated Projects, and the Gradle 9 archive defaults
---

# Configuration Cache and Task Correctness

Owns whether a build can configure without touching forbidden state, whether a
task declares its own inputs and outputs so caching works, and what Gradle 9
already does to archives without being asked. Does not own where build logic
lives or how a version catalog is bound (`GRADLE-STRUCT`, in
`structure-and-conventions.md`), the plugin-side CI gates that run these checks
for a published plugin (`GRADLE-PLUG`, in `plugin-authoring.md`), toolchains and
compiler arguments (`GRADLE-TOOL`), or publishing tasks (`GRADLE-PUB`).

Contents: [Scope](#scope) ·
[The Configuration-Cache Run](#the-configuration-cache-run) ·
[Turning It On and Proving It Stayed On](#turning-it-on-and-proving-it-stayed-on) ·
[Isolated Projects](#isolated-projects) ·
[Task Inputs and Outputs](#task-inputs-and-outputs) ·
[Archive Reproducibility](#archive-reproducibility) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **Measured against Gradle 9.0.0 through 9.7.1, verified 2026-09-12.** Corpus
  counts below are over 32 surveyed public flagship repositories.
- **The configuration cache is not on by default in Gradle 9.** 9.x is preferred
  with automatic graceful fallback, and the default-on target slipped from
  Gradle 10 to Gradle 11 (verified 2026-09-12 against the 9.0.0 release notes).
  Guidance that assumes it is already on skips the one line that turns it on.
- **No linter reaches any of this.** There are exactly three gates: the real
  build run with `--configuration-cache`, the `validatePlugins` task, and reading
  the wrapper's `distributionUrl` before touching an archive task.
- **Migration order is other people's plugins first, your own tasks second.** The
  published rollout precedent (Square) was blocked by third-party plugins, never
  by the team's own task code. Rows 01 to 05 are the smaller half of the problem.
- **Rows 01 to 05 and 15 are contract-derived, not measured.** They describe task
  and plugin internals the 32-repo survey never source-grepped. They rest on
  Gradle's documented requirements plus live trackers
  ([#18520](https://github.com/gradle/gradle/issues/18520),
  [#24040](https://github.com/gradle/gradle/issues/24040)), not on counted
  counter-examples. Every row that does carry a count says so in its own cell.
- `GRADLE-CACHE-07` is retired, and so is `GRADLE-CACHE-16`. Neither number is
  reused. Both said what `GRADLE-PLUG-01`, `GRADLE-PLUG-02` and `GRADLE-PLUG-10`
  say in `plugin-authoring.md`: a published plugin runs `validatePlugins` as its
  own required CI step and carries a TestKit leg asserting a
  `--configuration-cache` run succeeds.

## The Configuration-Cache Run

One gate covers rows 01 to 05. Run the invocation CI uses, with the flag
appended:

```bash
./gradlew build --configuration-cache   # substitute the task list CI actually invokes
```

Gradle prints an "N problems were found" line and writes a report under
`build/reports/configuration-cache/` **only when problems exist**. No line and no
report file is the pass. There is no separate check task. The greps in the rows
below are diff-review pre-filters, never substitutes for the run.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CACHE-01 | Never touch a `Project` from a task action: no `Task.getProject()`, no `project.copy {}`, no `project.exec {}`, no `project.logger`. Inject `FileSystemOperations` or `ExecOperations`, and bind every value read from `Project` to a `Property<T>` at configuration time. | A hard configuration-cache violation that still compiles, and the shape that saturates Groovy-era training data. | The gate run above. Pre-filter: `grep -rn --include='*.kt' --include='*.gradle.kts' --include='*.java' -e 'getProject()' -e 'project.copy' -e 'project.exec' -e 'project.logger' .`, then read whether each hit sits inside a `doLast`, `doFirst` or `@TaskAction` body. Empty pre-filter output clears the pre-filter, not the rule. | MUST |
| GRADLE-CACHE-02 | Never read a file, spawn a process, or resolve a `Configuration` at configuration time. Use `providers.fileContents(f).asText`, `providers.exec()` or `providers.javaexec()`, a `ValueSource` for anything else, and defer resolution into the task action behind a `FileCollection` or `Provider`. | An undeclared read or exec is an untracked cache input, and resolving at configuration time also defeats configuration avoidance. It stays legal ([#2298](https://github.com/gradle/gradle/issues/2298) is open), so no tool fails it for you. | The gate run above. Pre-filter: `grep -rn --include='*.kt' --include='*.gradle.kts' -e 'readText()' -e 'Files.readString' -e 'Files.readAllLines' -e 'ProcessBuilder(' -e 'Runtime.getRuntime().exec' .` and read each hit that is outside a task action. Empty pre-filter output clears the pre-filter, not the rule. | MUST |
| GRADLE-CACHE-03 | Never enumerate `System.getenv()` or `System.getProperties()`. Read one named key, or use `providers.environmentVariablesPrefixedBy("PREFIX")`. | Gradle's own wording: every available property becomes one cache input. A single `.forEach {}` turns the whole ambient environment into cache-busting state. | `grep -rn --include='*.kt' --include='*.gradle.kts' -e 'System.getenv()' -e 'System.getProperties()' .` Any hit calling `getenv` with no argument is the finding. Empty output is the pass. | MUST |
| GRADLE-CACHE-04 | Never register a `BuildListener` or `TaskExecutionListener` from a plugin or a build script. Use a Build Service implementing `OperationCompletionListener`, registered through `BuildEventsListenerRegistry`. | Flatly disallowed with no fallback flag, and still an unsolved migration gap for build-start and build-finish hooks ([#18520](https://github.com/gradle/gradle/issues/18520), open as of 2026-09-12). | `grep -rn --include='*.kt' --include='*.gradle.kts' --include='*.java' -e 'addBuildListener' -e 'addListener(' -e 'TaskExecutionListener' -e 'BuildListener' .` Any hit is the finding. Empty output is the pass. | MUST |
| GRADLE-CACHE-05 | Never hold live-JVM state in a task field or capture it in a task action: `ClassLoader`, `Thread`, `Socket`, `OutputStream`, `Lock`, `ReadWriteLock`, `Semaphore`, `CountDownLatch`, `CyclicBarrier`, `Phaser`. The same bar rejects `Gradle`, `Settings`, `SourceSet`, `Configuration` and `SourceDirectorySet` as inputs. A Build Service holds shared live state, and `FileCollection`, `FileTree` or `Provider<ResolvedComponentResult>` replace the coarse types. | These do not represent task inputs or outputs and cannot be serialized into a cache entry. `System.in`, `System.out` and `System.err` are the one documented exception, for `Exec` and `JavaExec`. | The gate run above names the offending field and its owning class. No report file is the pass. | MUST |

```kotlin
// wrong: compiles, runs, and is a hard configuration-cache violation
abstract class Bundle : DefaultTask() {
    @TaskAction fun run() = project.copy { from("src"); into(layout.buildDirectory.dir("out")) }
}
```

```kotlin
// right: the operation is injected, the value is bound at configuration time
abstract class Bundle : DefaultTask() {
    @get:Inject abstract val fs: FileSystemOperations
    @get:OutputDirectory abstract val outDir: DirectoryProperty
    @TaskAction fun run() = fs.copy { from("src"); into(outDir) }
}
```

## Turning It On and Proving It Stayed On

Read `gradle.properties` before asserting anything about this build, then run the
build twice.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CACHE-06 | Turn the cache on with `org.gradle.configuration-cache=true` in the root `gradle.properties`, never with a CI-only `--configuration-cache` flag, and leave `--configuration-cache-problems` at its default `fail`. `warn` is a migration aid with a tracked expiry, never a steady state. **pinned**: SHOULD for an existing build, raised to MUST for any module you publish. Override the raise once, in your own config, not per module. | CI overwhelmingly inherits the property (10 of 32) rather than re-asserting the flag (3 of 32), so reading `gradle.properties` first is the reliable heuristic. Gradle 9.0.0 also removed warn mode's old escape hatch: a task marked `notCompatibleWithConfigurationCache` now always discards the entry (verified 2026-09-12). | `grep -rn --include='gradle.properties' -e 'configuration-cache' .` Here **empty output is the finding**: opt-in has not happened. Then `grep -rn -e 'configuration-cache-problems=warn' .` and treat any hit with no linked tracking issue as the finding, with empty output the pass. | SHOULD |
| GRADLE-CACHE-08 | Never read "the build went green" as "the build was cached". Gradle 9 silently disables the cache for a task rather than failing, in several documented cases. The named one is a `maven-publish` repository with an explicit `credentials {}` block ([#24040](https://github.com/gradle/gradle/issues/24040)). | Automatic graceful fallback means a permanently uncached task produces no error at all, so the only observable difference is a line of build output. | Run the identical invocation twice. The second run must print `Reusing configuration cache.` Absence of that line is the finding. Pre-filter for the known trap: `grep -rn -A3 --include='*.gradle.kts' --include='*.gradle' -e 'credentials' .` and check each hit for a literal credential block rather than `PasswordCredentials` or an environment-backed provider. | SHOULD |

## Isolated Projects

Incubating since Gradle 9.7.0 (2026-08-06, verified 2026-09-12). Two of its four
constraint categories are unenforced by Gradle's own admission, and `group` and
`version` stay mutable while looking like identity.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CACHE-09 | Write `org.gradle.isolated-projects`. Never `org.gradle.unsafe.isolated-projects`. | The `unsafe.` spelling dominated blogs and talks for years and is what a model reaches for. It was deprecated in 9.7.0 and is slated for removal. 0 of 32 surveyed repos use it, 5 of 32 use the live key. | `grep -rn --include='gradle.properties' -e 'unsafe.isolated-projects' .` Any hit is the finding. Empty output is the pass. | MUST |
| GRADLE-CACHE-10 | Do not gate CI on Isolated Projects. Run it manually in diagnostics mode to collect violations, and keep it out of the required checks. | Adoption of the property is not adoption of a gate. 5 of 32 surveyed repos set the key, which reads as ready until the 9.7.0 docs' own "not fully enforced yet" on two constraint categories is read. | `grep -rn --include='gradle.properties' -e 'isolated-projects' .` and `grep -rn --include='*.yml' --include='*.yaml' -e 'isolated-projects' .` The property set **and** the CI job listed as a required check is the finding. Empty output from either is the pass. | SHOULD |

## Task Inputs and Outputs

One gate covers rows 11 to 15, and it is not the one a plugin author usually
runs:

```bash
./gradlew validatePlugins   # with validatePlugins { enableStricterValidation = true }
```

The task fails the build by default. The jar-time check that `java-gradle-plugin`
also installs only warns, so a module that runs `build` alone never hits the real
gate. `BUILD SUCCESSFUL` with no reported problem is the pass. Wiring this task
as its own required CI step belongs to `GRADLE-PLUG-01` and `GRADLE-PLUG-02` in
`plugin-authoring.md`, and the `--configuration-cache` TestKit leg to
`GRADLE-PLUG-10`. The presence of the task proves nothing about whether it runs.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CACHE-11 | Every task property and every artifact-transform property carries exactly one of `@Input`, `@InputFile`, `@InputDirectory`, `@InputFiles`, `@OutputFile`, `@OutputDirectory`, `@Nested`, `@Internal` or `@Console`. `@Optional` is a modifier, never the whole annotation. | An unannotated property silently disables up-to-date checking and caching for the **whole task**. There is no error, just a task that always reruns or never does. | `validatePlugins` reports `missing_annotation`. No reported problem is the pass. | MUST |
| GRADLE-CACHE-12 | Never annotate a `File`, `RegularFileProperty` or `DirectoryProperty` with `@Input`. Use `@InputFile` or `@InputDirectory`. | Gradle stores the value (the path), not the content, so the file changes under you undetected. This is the most natural-language-plausible mistake in the whole annotation set. | `validatePlugins` reports `incorrect_use_of_input_annotation`, and no reported problem is the pass. Reading test for a diff: does the declared type implement `FileSystemLocation`, or is it a `File` or `FileCollection`? Then `@Input` is wrong on sight. | MUST |
| GRADLE-CACHE-13 | Every file input of a cacheable task declares a normalization strategy: `@PathSensitive(NONE)` for a single file, `@PathSensitive(RELATIVE)` for a directory, `@Classpath` or `@CompileClasspath` for a classpath. Never `ABSOLUTE`, and never `ABSOLUTE` on a cacheable transform at all. | `ABSOLUTE` makes the build cache non-relocatable across machines and checkout locations, the top named cause of cross-machine misses. With no strategy at all, Gradle's own text calls caching "highly ineffective". | `validatePlugins` reports `missing_normalization_annotation` and `cacheable_transform_cant_use_absolute_sensitivity`, and no reported problem is the pass. Pre-filter: `grep -rn --include='*.kt' --include='*.java' -e 'PathSensitivity.ABSOLUTE' .`, where any hit is the finding. | MUST |
| GRADLE-CACHE-14 | A JVM **compile** classpath input is `@CompileClasspath`, not `@InputFiles` and not `@Classpath`. | `@CompileClasspath` ignores everything but ABI-affecting class changes, which is what makes compile avoidance possible. `@InputFiles` busts the cache on an upstream jar's timestamp. `validatePlugins` does not catch this one, because all three annotations are individually legal. | `grep -rn -B2 --include='*.kt' --include='*.java' -e 'compileClasspath' -e 'Classpath' .` A property named with a `Classpath` suffix, or fed from a source set's `compileClasspath`, that carries anything but `@CompileClasspath` is the finding. Empty output is the pass. | SHOULD |
| GRADLE-CACHE-15 | Wire a task's dependency on another task's output through the provider chain: `.from(producerTask)`, or `.set(producer.flatMap { it.outputFile })`. Never a bare `File` or `archivePath` reference, with or without `dependsOn`. | `dependsOn` orders but does not declare the input, so the build then works only by incidental ordering and breaks on `--parallel` or on a clean checkout. | `validatePlugins` reports `implicit_dependency`, and no reported problem is the pass. Reproduce a suspected hit with a clean checkout plus `--parallel`. | MUST |

## Archive Reproducibility

Read `distributionUrl` in `gradle/wrapper/gradle-wrapper.properties` **before**
editing any archive task. The correct edit inverts at 9.0.0.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CACHE-17 | On Gradle 9.0.0 and later, do not add `reproducibleFileOrder`, `preserveFileTimestamps` or `useFileSystemPermissions()` to an archive task, and read any existing setting as a reproducibility **opt-out** that must carry a justifying comment or be deleted. Below 9.0.0, the absence of `reproducibleFileOrder = true` plus `preserveFileTimestamps = false` is the finding instead. | 9.0.0 flipped all three defaults together: file order false to true, timestamps true to false, permissions umask to 0755 and 0644 (verified 2026-09-12). Setting them to the new values is dead code. Setting them to the old values is an active regression to non-deterministic archives, usually carried forward unexamined across an 8 to 9 upgrade. | Read `distributionUrl` first. On 9.0.0 or later: `grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'reproducibleFileOrder' -e 'preserveFileTimestamps' -e 'useFileSystemPermissions' .` Any hit with no adjacent justifying comment is the finding, and empty output is the pass. This grep over-reports roughly threefold, because `preserveFileTimestamps` is also a hand-written Shadow `Transformer` parameter name, so read each hit's task context. | MUST |

Both directions occur in public builds. Kafka pins wrapper 9.7.1 and sets all
three properties back to the pre-9 values, line for line Gradle's own revert
snippet, with no comment: a total opt-out of reproducible archives. Two other
surveyed repos set the values that are now the 9.x defaults, which was correct
before 9 and is dead code after it. Only 2 of 32 surveyed repos configure
archives reproducibly at all, and on Gradle 9 the correct configuration is the
empty one.

## What Agents Get Wrong Here

1. **Writing `project.copy {}`, `project.exec {}` or `Task.project` inside a task
   action.** The idiomatic Groovy-era pattern, saturating training data, still
   compiling, and a hard cache violation. Caught by the gate run, fixed by the
   injected-operations shape above.
2. **Asserting that Gradle 9 has the configuration cache on by default.**
   Plausible, half-true, and it makes the agent skip the `gradle.properties` line
   that actually turns it on.
3. **Emitting `org.gradle.unsafe.isolated-projects`.** The key that dominated
   blogs and conference talks for years, and 0 of 32 surveyed repos still use it.
4. **Annotating a file property `@Input`.** "Input" reads as the generic choice,
   and the wrong answer stores a path where the content was meant.
5. **Annotating a compile classpath `@InputFiles`.** The tutorial-era default for
   every file collection, and the one row in this family `validatePlugins` will
   not flag for you.
6. **Copy-pasting "add `preserveFileTimestamps = false`" as the reproducibility
   fix.** On Gradle 9 it is dead code, and pattern-matching the inverse setting as
   "already fixed" is actively wrong.
7. **Writing `gradle.addBuildListener(...)` for a "log build start and finish"
   helper.** The textbook implementation of a very common ask, and the API still
   compiles.
8. **Enumerating `System.getenv()` to be safe** when asked to read one templated
   environment variable, which turns the whole ambient environment into a cache
   input.
9. **Reporting a plugin as validating cleanly because `./gradlew tasks` lists
   `validatePlugins`.** Run the task and read the build result. Registration
   proves nothing.
10. **Treating Isolated Projects as production-ready because it is in Gradle 9.**
    Any recommendation of it as a required CI gate has to name the incubating
    status and the two unenforced constraint categories, or it is ahead of
    reality.
