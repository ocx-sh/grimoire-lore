---
title: "Gradle: the settings-time surface"
topic: gradle-settings
model: opus
id_family: GRADLE-PLUG
consolidates:
  - jvm-gradle-settings/settings-time-surface-and-tool-provisioning.md
  - jvm-gradle-settings/settings-plugin-testkit-verification.md
date: 2026-09-12
revised: 2026-09-12
---

# Gradle: the settings-time surface

Consolidates the one wave-3 dive into the four follow-ups wave 2 left open, all
of which live in `settings.gradle.kts` or in a precompiled `*.settings.gradle.kts`
Settings plugin, plus the wave-4 follow-up this file itself commissioned
(Settings-plugin functional testing). Ships `GRADLE-PLUG-22…29` (the provisioning
and verification half, extending
[jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md)) and `GRADLE-STRUCT-10…12`
(the settings-file half, extending [jvm-gradle-core.md](jvm-gradle-core.md)).
Every count below was re-measured against the 32-repo corpus at the SHAs in
[jvm-frame.md](jvm-frame.md) on 2026-09-12; five of the dive's own counts did
not survive that re-measurement and are corrected here.

**Revised 2026-09-12** after the TestKit follow-up: every `GRADLE-PLUG-22…28`
verification cell is rewritten, four of them from a source-read heuristic to a
runnable negative test; `GRADLE-PLUG-29` is new. See the [Revision log](#revision-log).

## Verdict

1. **A non-JVM CLI cannot be provisioned through Gradle's toolchain seat at all
   — not "with workarounds."** `JavaToolchainRequest` models only
   `languageVersion`/vendor/implementation and `JavaToolchainDownload` carries a
   bare `URI` with **no checksum field anywhere in the API**; a successful
   "resolve" also registers the download into Gradle's own JDK toolchain table
   ([dive §1](jvm-gradle-settings/settings-time-surface-and-tool-provisioning.md)).
   `ArtifactTransform` is excluded for a different reason: it transforms bytes
   Gradle already resolved through a `Configuration`, so using it needs an
   invented coordinate and a flat-dir repository first. Binds the **OCX Gradle
   plugin**.
2. **The provisioning seat is a `BuildService`, registered once from
   `Plugin<Settings>.apply()` via `gradle.sharedServices.registerIfAbsent(…)`,
   with the download and the sha256 `check()` inside the service's own
   execution-time method.** It is the only seat that is shareable from settings
   scope across every project, *able to fail the build*, and invisible to the
   configuration cache by construction — the parameters are cache inputs, the
   download is not, because it happens after cache restoration.
3. **Compute-vs-enforce is the line, and `ValueSource` is on the wrong side of
   it.** A `ValueSource.obtain()` can hash a file but has no authority to fail a
   task, so a hash computed there is documentation, not a control. This is the
   precise complement of GRADLE-PLUG-08 (`ValueSource` reads, `BuildService`
   holds): the *version pin* is a configuration-time read, the *verification* is
   an execution-time gate.
4. **A Settings plugin registering one shared `BuildService` is the
   Isolated-Projects-*safe* shape, not the hostile one** — the reverse of what
   the wave-2 brief assumed. Gradle's own IP page says `registerIfAbsent(…)` is
   "safe with Isolated Projects," with two conditions: parameters fixed inline
   at registration and never mutated afterwards, and no registry access beyond
   `findByName`. The claim is bounded, not absolute: two of IP's four constraint
   categories are "not fully enforced yet" as of 9.7.0, so a clean diagnostics
   run is evidence, not proof. IP stays diagnostics-only (GRADLE-CACHE-10).
5. **Keeping JSR-305 on a plugin's public API does not break a consumer's Kotlin
   DSL script; migrating that API to JSpecify can.** `-Xjsr305` defaults to
   `warn` (unchanged since Kotlin 1.1.50, unaffected by K2);
   `-Xjspecify-annotations` defaults to `strict`/errors since Kotlin 2.1. The
   "modern annotation set" swap is a consumer-breaking change needing a major
   version and a migration note. Binds **Gradle plugins**; the **OCX SDK**'s own
   nullness choice is JAVA-API's, not this file's.
6. **`gradle/gradle#847` is real, unfixed since 2016, and narrower than the dive
   stated.** Two subprojects sharing a leaf name collide only when the build
   also assigns a *uniform explicit* `group` — because Gradle's default group is
   "the path with dots as separators"
   (`gradle__gradle@ea17004a31:subprojects/core-api/src/main/java/org/gradle/api/Project.java:393-394`),
   which already disambiguates nested paths. The rule therefore carries the
   group conjunct. Without it, it flags `android/nowinandroid`'s five `:api` and
   six `:impl` modules, which are correct.
7. **The dive's `gradle.properties` verification is rejected and replaced.**
   `find . -mindepth 2 -name gradle.properties` → MUST-fail flags **17 of 32**
   corpus repos, and every one of them is right: each such file carrying an
   `org.gradle.*` key is the root of a *separate build* (`build-logic`,
   `buildSrc`, an `includeBuild`, a sample, a docs snippet). The shippable rule
   is narrow: **no `org.gradle.*` key in a `gradle.properties` that is not a
   build root**, because those keys are read once at daemon/settings startup and
   a subproject override is never consulted at all. Same failure shape as frame
   correction 33 — a raw-count rule flags the repo that gets it right.
8. **Remote build-cache push is gated on possession of a write credential,
   never on CI-ness.** A fork PR's run is also "CI" and GitHub Actions strips
   secrets from it by design, so a CI-only gate lets any pull request poison a
   cache every trusted build then reads. Two corpus repos get this right, two
   get it wrong, and **no corpus repo does both halves right**: detekt uses the
   cache-correct read (`providers.environmentVariable`) with the wrong
   predicate; spotless and testcontainers use the right predicate with a raw
   `System.getenv`. The rule requires both. Binds any **multi-module build** with
   a remote cache, and the **OCX Gradle plugin** if it ever ships a settings
   convention.
9. **The verification glob for anything in `buildCache{}` must include
   `**/*.settings.gradle.kts`.** The dive's "no corpus `settings.gradle*` gates
   push on more than CI-ness" is a scope artifact: ktor's and junit's cache
   configuration lives inside precompiled Settings plugins, invisible to that
   grep. A rule whose check only reads `settings.gradle*` misses exactly the
   repos that factored their settings logic properly.
10. **Everything here is depth-file material for `rules/gradle-build/`, not a
    skill** — same conclusion as [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md)
    verdict 10. Every rule fires while editing a file the `gradle-build` glob
    already covers.
11. **TestKit does reach settings scope, and the previous "reading source is all
    we have" framing is retired.** `GradleRunner.withPluginClasspath()` wires the
    injected classpath as a `PluginResolver` at `Scope.Build`, and
    `DefaultPluginRequestApplicator.applyPlugins(…, PluginManagerInternal target, …)`
    never branches on target type — a `Settings`'s plugin manager is built by
    `SettingsScopeServices` through the same `DefaultPluginManager` /
    `ImperativeOnlyPluginTarget` machinery as a project's, parameterised only by
    `PluginTargetType.SETTINGS`, which routes *application*, not *resolution*
    ([follow-up §1](jvm-gradle-settings/settings-plugin-testkit-verification.md)).
    Both routes Gradle's own configuration-cache TestKit suite names are legal at
    settings scope: `INJECTED_CLASSPATH` (`withPluginClasspath()`) and
    `MAVEN_REPO` (publish locally, resolve through `pluginManagement { repositories {} }`).
    Consequence: six of the seven `GRADLE-PLUG-22…28` cells gain a genuinely
    runnable assertion — mostly **negative** tests (tamper the input, assert the
    build dies in the right place) rather than greps — and the whole family stops
    being verified by reading alone.
12. **Three documented gaps, recorded as gaps rather than answered.** (a) **No
    Gradle API and no build-scan value reports how many times a shared
    `BuildService` was instantiated** — `BuildServiceRegistry` exposes only
    `registerIfAbsent(…)` and `getRegistrations()`, and "exactly once" is a
    construction-time property of `registerIfAbsent`, not an introspectable one.
    The file-marker assertion in GRADLE-PLUG-23 is this program's own
    construction, not a documented Gradle idiom; `withDebug(true)` would make an
    in-process counter readable and is **rejected**, because it defeats exactly
    the process isolation GRADLE-PLUG-15 requires. (b) **Isolated Projects
    diagnostics' console wording is not pinned by any source.** The *mechanism*
    is source-confirmed — `IsolatedProjectsMode.DIAGNOSTICS` forwards to
    `assertStateStoredAndDiscarded`, so diagnostics always stores-then-discards
    and reports through the configuration-cache problem pipeline, which makes
    `BuildResult.getOutput()` a legal TestKit surface — but IP has been incubating
    for five weeks (9.7.0, 2026-08-06) and the literal string is a dated re-check,
    not a rule constant. GRADLE-PLUG-27's cell therefore asserts on the
    presence/absence of a violation report, never on frozen wording. (c) **Nobody
    exercises a Settings plugin under TestKit at all**: 0/32 corpus repos (ktor's
    `build-settings-logic` and junit's `gradle/base/settings-conventions` ship no
    test source directory of any kind) and 0 of gradle/gradle's own TestKit
    integration tests apply a plugin from a generated `settings.gradle` — every
    `settings.gradle` write in `GradleRunnerPluginClasspathInjectionIntegrationTest.groovy`
    is a bare `include`. The mechanism is real; the exemplar does not exist, and
    GRADLE-PLUG-29 exists because of that.

### Conflicts resolved

**A. Does any corpus repo violate the duplicate-leaf-name ban?** The dive says
no ("all 32 exemplars' include-lists were checked … without a collision flag";
the rule is "preventive"). Re-measured: three repos carry duplicate leaf
segments, and two of them also assign a uniform group —
`cashapp__sqldelight@4580923af3:settings.gradle:62,67` (`:sqldelight-compiler:environment`
and `:sqlite-migrations:environment`, with `GROUP=app.cash.sqldelight` in the
root `gradle.properties`) and `testcontainers__testcontainers-java@a4d3a033d8:settings.gradle:30-31`
(`:docs:examples:junit5:redis` and `:docs:examples:spock:redis`, with
`subprojects { group = "org.testcontainers" }` at `build.gradle:29,38`).
`android__nowinandroid@12f80da651:settings.gradle.kts:69-79` has the most
duplicates and is **not** a violation, because it assigns no group at all.
**Resolved toward measurement, and the rule gains the group conjunct** —
otherwise it condemns Google's flagship modularisation sample.

**B. Is a subproject `gradle.properties` observed in the corpus?** The dive says
not observed and proposes `find . -mindepth 2 -name gradle.properties` as a
MUST-fail. Re-measured: 17/32 repos have one, up to 73 in gradle/gradle and 36
in sqldelight. **Zero are violations.** Every non-root file containing an
`org.gradle.*` key is a build root — `android__nowinandroid@12f80da651:build-logic/gradle.properties`
even carries the comment *"Gradle properties are not passed to included builds
[gradle/gradle#2534](https://github.com/gradle/gradle/issues/2534)"*, i.e. the
file exists **because** the root's properties do not reach it. The genuine
subproject files (ktlint, sqldelight, ktor) carry only `POM_*`, `target.js.*`
and `ksp.*` keys, which Gradle does read per-project. **Resolved: the dive's
verification is discarded; the rule is scoped to `org.gradle.*` keys outside a
build root, and the general "no subproject `gradle.properties`" best practice is
deliberately not shipped** — it would flag five healthy repos for a documented,
working publishing convention.

**C. Is spotless a repo with "no gate at all"?** The dive lists
`diffplug__spotless@dc2a4cb9a3:settings.gradle:24-30` under "no gate at all —
local-only cache config, remote push never configured." Read in full, that file
is the corpus's **cleanest** credential gate: `settings.gradle:32-46` configures
`remote(HttpBuildCache)` and sets `push = true` only inside
`if (user != null && pass != null)`, with the comment *"but we only push if it's
a trusted build (not PRs)"* and an `anonymous` read-only credential otherwise.
**Resolved toward the source**: spotless moves from the violator list to the
exemplar list, and — using plain `HttpBuildCache` rather than Develocity — it is
the most portable shape for an adopter to copy.

**D. Is the push-gate measurement complete?** The dive's claim ("no checked-out
`settings.gradle*` in the corpus") was produced by a grep over `settings.gradle*`
only. Extending it to `**/*.settings.gradle.kts` adds two repos:
`ktorio__ktor@f92fad0435:build-settings-logic/src/main/kotlin/ktorsettings.develocity.settings.gradle.kts:75`
(`isPush = isCIRun`, a second CI-only gate — and the one that matters most,
since it sits in a reusable Settings plugin) and
`junit-team__junit-framework@35c56a8e02:gradle/base/settings-conventions/src/main/kotlin/junitbuild.settings-conventions.settings.gradle.kts:50`
(`isPush = buildParameters.junit.develocity.buildCache.pushEnabled`, declared
`defaultValue = false` at `gradle/base/build-parameters/build.gradle.kts:37-41`
— explicit opt-in, default deny). **Resolved: the verification glob changes**,
and the corpus tally becomes 3 satisfy / 2 violate rather than 1 / 1.

**E. Is gradle/gradle the corpus's only `build-logic-settings` split?** The dive
and GRADLE-STRUCT-02 both say 1/32. Re-measured: **3/32**. `ktorio__ktor@f92fad0435:settings.gradle.kts:18`
includes `build-settings-logic` from `pluginManagement`, and that build contains
only `*.settings.gradle.kts` precompiled plugins — the cleanest instance in the
corpus and the copy-target for the OCX Settings plugin, ahead of gradle/gradle.
`junit-team__junit-framework@35c56a8e02:settings.gradle.kts:1-7` includes both
`gradle/base` (settings conventions) and `gradle/plugins` (project conventions),
a *partial* split: one Settings plugin leaked into the project-conventions build
at `gradle/plugins/publishing/src/main/kotlin/junitbuild.maven-central-publishing.settings.gradle.kts`.
**Resolved: the count is corrected to 3/32 and [jvm-gradle-core.md](jvm-gradle-core.md)
verdict 7's "junit-framework … ship[s] the merged form" is half right.**
GRADLE-STRUCT-02 stays SHOULD — the cost argument (build-caching throughput) is
unchanged by the count.

**F. Is "diagnostics output reports no violation (empty is the pass)" true?**
The wave-3 cell for GRADLE-PLUG-27 said so. Reading gradle/gradle's own fixture
([follow-up §5](jvm-gradle-settings/settings-plugin-testkit-verification.md)):
`IsolatedProjectsFixture.groovy:124-132` routes `IsolatedProjectsMode.DIAGNOSTICS`
to `assertStateStoredAndDiscarded`, i.e. diagnostics **always** stores a
configuration-cache entry and discards it, printing through the same
problem-reporting channel `--configuration-cache` uses. The output is therefore
never empty, and the exact violation-summary phrase is unpinned by any primary
doc read in this program. **Resolved against the old cell: it overclaimed.** The
rewritten cell asserts on the presence/absence of a violation report, carries a
dated re-check for the phrase, and gains the fact that `BuildResult.getOutput()`
is a *legal* TestKit assertion surface for it (GRADLE-PLUG-15's sanctioned
category), which the old cell did not know.

## The ruleset

Severity: **MUST** = block · **SHOULD** = warn · **CONSIDER** = suggest.
Numbering continues the families' existing sequences (GRADLE-PLUG ended at 21 in
[jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md), GRADLE-STRUCT at 09 in
[jvm-gradle-core.md](jvm-gradle-core.md)); nothing here renumbers or restates an
existing row.

### GRADLE-PLUG — provisioning and Isolated Projects from a Settings plugin

Eight rules, grouped by the check that catches them. Destination depth file:
`rules/gradle-build/plugin-authoring.md`. Every verification cell below was
rewritten on 2026-09-12; a cell that stays a source read now says **"reading
heuristic"** in those words rather than presenting a grep as if it were a test.

#### Caught by a grep over the Settings plugin's own source

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-PLUG-22 | Never implement `JavaToolchainResolver`, and never add a `toolchainManagement { jvm { javaRepositories { … } } }` entry, to provision a non-JDK tool. | `JavaToolchainRequest` models only `languageVersion`/vendor/implementation and `JavaToolchainDownload.fromUri(URI)` has no checksum field; a "successful" resolve also registers the binary in Gradle's own JDK toolchain table, corrupting real toolchain resolution. | **Reading heuristic — no TestKit assertion strengthens this one.** `grep -rn 'JavaToolchainResolver\|toolchainManagement' <plugin>/src settings.gradle*` — every hit must resolve an actual JDK. A hit naming a CLI tool is the violation; empty output is the pass. A functional test could apply the plugin and request an unrelated JDK toolchain to observe the *symptom* (a corrupted toolchain table), but at far lower signal than reading the ~3 places `JavaToolchainResolver` can legally be implemented. | MUST | Gradle 7.6 (`@Incubating`) |
| GRADLE-PLUG-24 | Enforce a provisioned binary's sha256 by throwing from execution-time code before the file reaches any task's classpath or `PATH`. Never compute a hash for enforcement inside a `ValueSource`. | `ValueSource.obtain()` returns a value and cannot fail a task, so a hash compared there is swallowed; it also re-hashes the whole binary on every configuration phase. Enforcement belongs where the build can die. | **Runnable negative test, not only a grep.** `grep -rn 'MessageDigest\|sha256\|Sha256' <plugin>/src` — a hit inside a class implementing `ValueSource` is a violation on sight, and the `check(...)`/`require(...)` must sit in the `BuildService` or a task action. **Then prove it fires**: run a functional test with a deliberately tampered expected sha256; `buildAndFail()` must occur, and the consuming task must not have executed (inspect `BuildResult` task outcomes). Repeat the tampered case with `--configuration-cache`. A grep alone passes for a `Provider` nothing ever calls `.get()` on — a check computed and never consumed. | MUST | Gradle 8.0 |
| GRADLE-PLUG-28 | Do not treat replacing `javax.annotation.*` (JSR-305) with `org.jspecify.annotations.*` on a plugin's exported types as a routine change: it needs a major version and a migration note. | Kotlin reports JSR-305 mismatches as warnings (`-Xjsr305=warn`, the default since 1.1.50 and unaffected by K2) and JSpecify mismatches as **errors** (`-Xjspecify-annotations=strict`, the default since 2.1). The swap converts silent consumer warnings into consumer build failures. | **A diff-review gate plus a runnable compatibility fixture.** Review half (unchanged): `git diff --stat` touching `javax.annotation` → `org.jspecify.annotations` on any non-`internal` type reachable from the plugin's API requires a changelog entry and a major-version bump in the same diff. Runnable half (new): a Kotlin-DSL consumer fixture with a genuine nullness mismatch against the plugin's public API, run under TestKit against both plugin versions — pre-migration expects `build()` to succeed with a warning (`-Xjsr305=warn`), post-migration expects `buildAndFail()` (`-Xjspecify-annotations=strict`, Kotlin 2.1 default). A migration whose fixture does **not** flip from `build()` to `buildAndFail()` has not changed consumer-visible behaviour, and the major-version claim is unfounded for that type. | MUST | Kotlin 2.1 for the `strict` default |

#### Caught by reading `Plugin<Settings>.apply()`

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-PLUG-23 | Provision a pinned external binary from a `BuildService` registered exactly once by `gradle.sharedServices.registerIfAbsent(…)` inside `Plugin<Settings>.apply()`, with the download performed in the service's own execution-time method — never in `apply()` and never in `ValueSource.obtain()`. | It is the only seat that is shared across all projects from settings scope, can fail the build, and adds zero configuration-cache inputs: parameters are serialized into the cache entry, the download runs after cache restoration. `ArtifactTransform` needs an invented coordinate first; `JavaToolchainResolver` is structurally excluded (GRADLE-PLUG-22). | **One reading heuristic plus two runnable TestKit legs.** (a) Reading heuristic on `apply()`: exactly one `registerIfAbsent` call, and no network or filesystem write reachable from `apply()` itself. (b) Runnable — *registered once*: a ≥2-subproject functional test in which every subproject consumes the service; the service's own execution-time code appends a marker line to a fixed file on first use; after one `build()`, that file must contain exactly one entry. No Gradle API or build-scan value reports instantiation count, so this file **is** the mechanism; a static counter or `withDebug(true)` is not legal evidence (GRADLE-PLUG-15 — TestKit runs the build in another process). (c) Runnable — *configuration cache*: `GradleRunner` runs `help --configuration-cache` twice against the same project dir; the second `BuildResult.output` must contain the literal `Reusing configuration cache.` (frame correction 36 / [#24040](https://github.com/gradle/gradle/issues/24040)). For a Settings plugin this leg cannot miss its target — the settings file is the only place the plugin is applied. | MUST | Gradle 8.0 |
| GRADLE-PLUG-25 | Cache the provisioned binary under `GRADLE_USER_HOME` or a dedicated tool home, never under the project's `build/` directory, and key the "already provisioned" skip on the expected sha256 rather than file presence. | `clean` wipes `build/`, so a per-invocation re-download on every CI job; and a presence-only check trusts a partially written file or a stale binary left by a previous pin. | **Two runnable TestKit legs, replacing the source read.** (a) *Survives `clean`*: run the functional-test build, run `clean`, run again with `forwardOutput()` — the second run must show no re-download marker; a re-download proves the cache path was under `build/`. (b) *Hash, not presence*: pre-place a file at the expected cache path with the correct filename and wrong content, then run the build — it must re-fetch or fail on the hash check, never silently accept the stale file. A source read cannot distinguish `exists()` from a hash compare that is computed and discarded. | MUST | Gradle 8.0 |
| GRADLE-PLUG-26 | Set a shared `BuildService`'s parameters inline in `registerIfAbsent(…) { parameters { … } }` and never mutate them afterwards; read the service back only through `findByName(String)`. | Gradle documents `registerIfAbsent` as "safe with Isolated Projects" under exactly these conditions — every other method on the shared-services registry "emit[s] Isolated Projects violations," and post-registration mutation from a per-project callback is a build-to-project access that IP does not yet enforce but will. | **Reading heuristic, named as one — no dynamic test adds independent signal.** `grep -rn 'sharedServices' <plugin>/src` — every hit must be either the single registration or a `findByName`; any `.parameters` assignment outside the registration block is the violation. Its only dynamic corroboration is GRADLE-PLUG-27's diagnostics leg, not a functional test of its own: post-registration mutation is exactly the build-to-project access IP diagnostics is built to surface, *once that constraint category is fully enforced* — it is one of the two that are not, as of 9.7.0. | MUST | Gradle 9.7.0 for the IP guarantee |

#### Caught by running Isolated Projects diagnostics

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-PLUG-27 | Run `./gradlew help -Dorg.gradle.isolated-projects.diagnostics=true` against the plugin's own functional-test build at least once per release, and never wire `org.gradle.isolated-projects=true` into a required CI job. | Diagnostics mode configures projects sequentially and reports every violation without failing, which is the only proof available; but IP is incubating since 9.7.0 (2026-08-06) and two of its four constraint categories are "not fully enforced yet," so a green run today is evidence, not proof. Consistent with GRADLE-CACHE-10. | **Runnable via TestKit for the diagnostics half; a static grep for the CI half — neither substitutes for the other.** Diagnostics: `GradleRunner.create().withArguments("help", "-Dorg.gradle.isolated-projects.diagnostics=true").build()`, then assert `BuildResult.output` carries no violation-summary text. This is a *legal* `BuildResult` assertion (GRADLE-PLUG-15) because diagnostics stores-then-discards through the configuration-cache problem pipeline — but the output is **never empty** (conflict F) and the exact phrase is a **dated re-check against the pinned Gradle version**, not a constant this file freezes. CI half: `grep -rn 'isolated-projects' .github/workflows/` must return nothing inside a job triggered by `pull_request:`/`push:` — TestKit cannot see the consumer's CI YAML at all. The deprecated `org.gradle.unsafe.isolated-projects` key must appear nowhere. | SHOULD | Gradle 9.7.0 |

#### Caught by reading the functional test's own generated project

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-PLUG-29 | A `Plugin<Settings>`'s functional test must apply the plugin under test from the **generated test project's `settings.gradle(.kts)`** `plugins {}` block — never from a generated `build.gradle(.kts)`. Prefer the `MAVEN_REPO` route (publish to a `file://` repo, resolve through `pluginManagement { repositories { maven(…) } }`) and fall back to `withPluginClasspath()` only where GRADLE-PLUG-14's `compileOnly` trap is provably absent. | A settings plugin applied from a build script is never applied to a `Settings` at all: the test passes for the wrong reason (the id resolves against core or a cached artifact) or fails with a misleading "plugin not found" — and every `--configuration-cache`, sha256, cache-dir and diagnostics assertion in GRADLE-PLUG-23/24/25/27 then passes **vacuously**. `withPluginClasspath()` does reach settings scope (verdict 11), but the injected classpath is the one `implementation-classpath` entry of `plugin-under-test-metadata.properties`, computed from the `main` runtime classpath — so a `compileOnly` dependency is missing there at settings scope exactly as at project scope; it is the same defect object, not an analogue. The `MAVEN_REPO` route is additionally higher-fidelity: it is the mechanism a real consumer uses. | The generated test project must contain a `settings.gradle(.kts)` whose `plugins {}` block names the plugin under test, with `pluginManagement {}` as its first block. Then: `grep -rln 'withPluginClasspath' <module>/src/*[Ff]unctional*/` co-occurring with `grep -rn 'compileOnly(' <module>/build.gradle.kts` is the violation (GRADLE-PLUG-14, applied at settings scope). A functional test for a class implementing `Plugin<Settings>` whose only `plugins {}` block sits in a `build.gradle(.kts)` is the violation regardless of whether it is green. | MUST | Gradle 7.0 (`withPluginClasspath`); Gradle 6.0 for `pluginManagement` in the test fixture |

**MUST count for GRADLE-PLUG: 7 of 8.**

### GRADLE-STRUCT — the settings file's silent failures

Three rules, an addendum to [jvm-gradle-core.md](jvm-gradle-core.md)'s
GRADLE-STRUCT-01…09. Destination depth file:
`rules/gradle-build/structure-and-conventions.md`. These fire while editing a
settings file, which is why they are GRADLE-STRUCT and not GRADLE-CI, and why
`gradle-build/ci.md` must cross-reference GRADLE-STRUCT-12 rather than restate
it.

#### Caught by a scan of the resolved project list

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-STRUCT-10 | Never create two projects whose path's last segment is identical **in a build that also assigns a uniform explicit `group`** (a root `allprojects`/`subprojects { group = … }`, or a publishing plugin driving `group` from one property). Give the colliding projects distinct groups, or rename one. | Gradle identifies dependency-graph nodes by `group:name`, so both become `<group>:<leaf>:unspecified` and ordinary conflict resolution silently keeps one and drops the other — no failure, no warning, just a classpath missing classes ([#847](https://github.com/gradle/gradle/issues/847), open since 2016-11-12, reproduced on 8.12.1 on 2025-06-30, unfixed through 9.x). The group conjunct is load-bearing: Gradle's default group is "the path with dots as separators," which already disambiguates nested duplicates. | `./gradlew projects --console=plain -q \| grep -oE "Project ':[^']+'" \| sed -E "s/.*:([^:']+)'/\1/" \| sort \| uniq -d` — **non-empty output is a finding only if** `grep -rn 'group\s*=' build.gradle* gradle.properties` shows a uniform assignment. Both non-empty is the violation. | MUST | any |

#### Caught by a scan of every `gradle.properties` in the tree

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-STRUCT-11 | Never put an `org.gradle.*` key (`caching`, `configuration-cache`, `jvmargs`, `parallel`, `workers.max`, `vfs.watch`, `warning.mode`, …) in a `gradle.properties` that is not the root of a build. A subproject's own non-`org.gradle.*` keys are fine. | These are read once at daemon/settings-evaluation startup from the build root and `GRADLE_USER_HOME`, before any subproject is visited — a subproject override is **never consulted at all**, so `org.gradle.caching=false` dropped into a flaky module changes nothing and the team believes it did. Gradle's own Best Practices page names the broader anti-pattern and ships `avoidGradlePropertiesInSubProjects-avoid` snippets. | For each `gradle.properties` below the root, first decide whether its directory is a build root (contains `settings.gradle*`, or is `buildSrc/`, or is named by an `includeBuild(...)`). If it is not, `grep -E '^\s*org\.gradle\.' <file>` must be empty. **Do not flag on the file's existence** — that flags 17/32 correct repos. | MUST | any |

#### Caught by a scan of every settings file and settings plugin

| ID | Rule | Rationale | Verification | Sev | Floor |
|---|---|---|---|---|---|
| GRADLE-STRUCT-12 | Gate remote build-cache push on possession of a write credential, read through `providers.environmentVariable("<TOKEN>").isPresent` — never on CI-ness, a CI-vendor marker, or a branch name, and never through a raw `System.getenv`. | A fork PR's run is "CI" too, and GitHub Actions strips repository secrets from it by design; a credential the platform withholds from untrusted runs is the only predicate that distinguishes our CI from anyone's PR. A poisoned entry pushed once is then read by every trusted build. The `providers` half keeps the settings-time read a declared configuration-cache input, the same mechanic GRADLE-PLUG-07 enforces in plugin code. | `grep -rnE 'isPush|[^A-Za-z]push\s*=' --include='settings.gradle' --include='settings.gradle.kts' --include='*.settings.gradle.kts' .` — every hit's right-hand side must contain a credential-presence conjunct; a bare `isCiBuild`/`System.getenv("CI") != null` is the violation, and so is a correct predicate read with `System.getenv`. The `*.settings.gradle.kts` pattern is not optional (conflict D). | MUST | Gradle 7.0 for `providers.environmentVariable` |

**MUST count for GRADLE-STRUCT: 3 of 3. Total across both families: 10 MUST of 11 rules.**

## Applied to the exemplars and the two future consumers

**Already satisfied by the strict exemplars.**

| Rule | Exemplar | Evidence |
|---|---|---|
| STRUCT-12 | **spotless** | `diffplug__spotless@dc2a4cb9a3:settings.gradle:32-46` — `remote(HttpBuildCache)` with `push = true` only inside `if (user != null && pass != null)`, comment *"but we only push if it's a trusted build (not PRs)"*, anonymous read-only credential otherwise. The only plain-`HttpBuildCache` instance in the corpus, so the most portable shape. Misses the `providers` half (raw `System.env`). |
| STRUCT-12 | **testcontainers** | `testcontainers__testcontainers-java@a4d3a033d8:settings.gradle:44` — `push = isCI && !System.getenv("READ_ONLY_REMOTE_GRADLE_CACHE") && System.getenv("DEVELOCITY_ACCESS_KEY") != null`, replicated identically in `examples/settings.gradle:45` and `smoke-test/settings.gradle:30`. Same `providers` gap. |
| STRUCT-12 | **junit-framework** | `junit-team__junit-framework@35c56a8e02:gradle/base/settings-conventions/src/main/kotlin/junitbuild.settings-conventions.settings.gradle.kts:50` — `isPush = buildParameters.junit.develocity.buildCache.pushEnabled`, declared `defaultValue = false` (`gradle/base/build-parameters/build.gradle.kts:37-41`). Default-deny opt-in, the strongest form. |
| STRUCT-11 | **32 of 32** | Zero violations. `android__nowinandroid@12f80da651:build-logic/gradle.properties` is the clearest *correct* case: five `org.gradle.*` keys in a directory that is its own included build, with a comment citing [#2534](https://github.com/gradle/gradle/issues/2534) explaining why the file must exist. |
| STRUCT-10 | **nowinandroid** | `android__nowinandroid@12f80da651:settings.gradle.kts:69-79` — five `:api` and six `:impl` leaf names, and **no** group assignment anywhere in the root build or `build-logic/convention`, so each resolves under its dotted parent path. Correct, and the case a leaf-name-only rule would wrongly condemn. |
| PLUG-26 (structure) | **ktor** | `ktorio__ktor@f92fad0435:settings.gradle.kts:18` + `build-settings-logic/src/main/kotlin/*.settings.gradle.kts` — a `pluginManagement`-included build containing only precompiled Settings plugins, and `ktorsettings.develocity.settings.gradle.kts:13` reads CI-ness through `providers.environmentVariable(...)`, the sanctioned settings-time form. |

**Violated by prominent exemplars.**

| Rule | Violator | Evidence |
|---|---|---|
| STRUCT-12 | **detekt** | `detekt__detekt@45672efb8b:settings.gradle.kts:82` — `isPush = isCiBuild` where `isCiBuild = providers.environmentVariable("CI").isPresent` (:59), replicated in `build-logic/settings.gradle.kts:31` and `detekt-gradle-plugin/settings.gradle.kts:69` under a comment *"Ensure buildCache config is kept in sync with all builds"*. Sharpest instance in the corpus: the same file gates the **build scan** on `publishing.onlyIf { it.isAuthenticated }` (:67) and does not apply that test to the cache push six lines below. |
| STRUCT-12 | **ktor** | `ktorio__ktor@f92fad0435:build-settings-logic/src/main/kotlin/ktorsettings.develocity.settings.gradle.kts:75` and `build-settings-logic/settings.gradle.kts:60` — `isPush = isCIRun`, where `isCIRun` is the presence of `TEAMCITY_VERSION`. Mitigating: a CI-vendor marker on a TeamCity install is a weaker exposure than GitHub Actions fork PRs. Aggravating: it ships inside a reusable Settings plugin that every included build applies, so the wrong predicate propagates. |
| STRUCT-10 | **sqldelight** | `cashapp__sqldelight@4580923af3:settings.gradle:62,67` — `:sqldelight-compiler:environment` and `:sqlite-migrations:environment`, with `GROUP=app.cash.sqldelight` in the root `gradle.properties` applied uniformly. The `POM_ARTIFACT_ID` overrides (`compiler-env`, `migration-env`) fix the *published* coordinates and not the in-build module identity, which is what conflict resolution reads. |
| STRUCT-10 | **testcontainers** | `testcontainers__testcontainers-java@a4d3a033d8:settings.gradle:30-31` — `:docs:examples:junit5:redis` and `:docs:examples:spock:redis`, with `subprojects { … group = "org.testcontainers" }` at `build.gradle:29,38`. Both resolve to `org.testcontainers:redis`. |
| PLUG-22…27 | **0/32 measurable** | No corpus repo provisions a non-JVM binary from a Settings plugin, and no repo registers a shared `BuildService` from settings scope. The foojay adoption sweep is the nearest neighbour: `org.gradle.toolchains.foojay-resolver-convention` at `1.0.0` in 8/32, every one configuring nothing and exposing no checksum setting — structural confirmation that the toolchain seat never enforces a hash. |
| PLUG-29 | **0/32, and 0 upstream** | No corpus repo tests a Settings plugin under TestKit at all: `ktorio__ktor@f92fad0435:build-settings-logic/` (11 tracked files, all `src/main/kotlin`) and `junit-team__junit-framework@35c56a8e02:gradle/base/settings-conventions/` carry no `src/test`, `src/functionalTest` or `src/integTest` path. Nor does Gradle: every `settings.gradle` write in `gradle__gradle@ea17004a31:platforms/extensibility/test-kit/src/integTest/groovy/org/gradle/testkit/runner/GradleRunnerPluginClasspathInjectionIntegrationTest.groovy` (:113, :128, :151, :170, :345) is a bare `include '…'`, never a `plugins {` block. The mechanism is proved by source, the exemplar does not exist — which is exactly why the rule is a MUST. |

Both STRUCT-10 violators ship green today, because the collision only resolves
wrongly when both colliding projects enter one resolution graph. That is why the
severity is MUST for *creating* the collision and why the check is cheap — the
defect is latent, not absent, and there is no build failure to discover it with.

**New commitments for the OCX Gradle plugin.** This is the consumer the
GRADLE-PLUG half exists for, and all eight rows are corpus-unconfirmed:

- **GRADLE-PLUG-22/23/24/25** are the provisioning spine for `ocx` itself,
  derived from primary Gradle docs plus the `rules_ocx` no-ambient-environment
  invariant. They complete GRADLE-PLUG-07/08's configuration-time half with the
  execution-time gate: `ocx.lock` is read by a `ValueSource`, the version and
  expected hash become `BuildServiceParameters`, and the download-and-verify runs
  the first time a task asks for the binary.
- **GRADLE-PLUG-26/27** make the IP claim testable rather than assumed. The
  plugin cannot *declare* IP compatibility — it is not a `plugin-publish`
  Compatibility Plugin feature as of 2026-09-12 (GRADLE-PLUG-17) — so the
  diagnostics run is the only artifact, and it is a TestKit leg asserting on
  `BuildResult.output`, not a human-read report.
- **GRADLE-PLUG-29 is the precondition for the other seven.** The plugin's
  functional-test fixture publishes the plugin to a `file://` Maven repo and
  applies it from the generated test project's `settings.gradle.kts` through
  `pluginManagement { repositories { maven(…) } }` — the `MAVEN_REPO` route, not
  `withPluginClasspath()`, because the plugin is expected to carry `compileOnly`
  on at least Gradle's own API surface and the trap is identical at settings
  scope. Build this fixture first: every runnable cell in GRADLE-PLUG-23/24/25/27
  is an assertion *on top of it*, and without it they are green for free.
- **Structural:** house the Settings plugin in a `pluginManagement`-included
  build containing only `*.settings.gradle.kts` files. Copy
  `ktorio__ktor@f92fad0435:build-settings-logic`, not `gradle/gradle`'s
  `build-logic-settings`: it is smaller, it is pure, and it demonstrates a
  Settings plugin that reads the environment through `providers`. GRADLE-STRUCT-02
  stays SHOULD at the corrected 3/32.
- **GRADLE-PLUG-28** binds the plugin's exported types. Under owner Q1's standing
  default (Java-first, [jvm-language-api.md](jvm-language-api.md) verdict 10), the
  plugin's API is consumed from Kotlin DSL scripts, so the annotation choice is a
  consumer-compatibility decision made once, before the first publish, and not
  revisited casually.

**For the OCX SDK: only GRADLE-STRUCT-10/11/12 can ever bind it**, and only if it
becomes multi-module with a remote cache. None of GRADLE-PLUG-22…29 applies to a
library — the same routing GRADLE-PLUG-20 already enforces. GRADLE-STRUCT-10 is
worth stating at scaffold time anyway: an SDK that publishes under one
`group` and later grows a `:core:api` plus a `:testing:api` has created the
collision on the day it adds the second module.

## AI-agent failure modes

Ranked by how often it bites.

1. **Reaching for `JavaToolchainResolver` because "toolchain" is the Gradle noun
   for "download and pin a tool."** The training data is full of toolchain
   examples and none of them says the request type is JDK-only. Check: does the
   resolver's `resolve()` handle anything other than a JDK? If the tool is not a
   JDK, this is the wrong file to be editing at all (GRADLE-PLUG-22).
2. **Putting the sha256 comparison in a `ValueSource` because that is "the
   configuration-cache-safe place to do impure things."** True for reads, false
   for enforcement. Check: `grep -rn 'MessageDigest' <plugin>/src` — a hit inside
   a `ValueSource` is a routing defect dressed as a security control.
3. **Gating cache push on `System.getenv("CI")`,** copied from generic
   "only push from CI" advice that predates fork-aware CI — and two corpus
   repos ship exactly that. Check: does the `isPush`/`push` expression `&&` a
   secret-presence test? A fork PR satisfies "CI" every time.
4. **Grepping only `settings.gradle*` for anything settings-shaped.** The repos
   that factored their settings logic into precompiled plugins are precisely the
   ones a narrow grep misses, so the rule reports clean on the most sophisticated
   builds. Check: every settings-file grep in this file's verification column
   includes `--include='*.settings.gradle.kts'`.
5. **Flagging every non-root `gradle.properties`.** The naive form of
   GRADLE-STRUCT-11 condemns 17/32 corpus repos including `build-logic` roots
   that exist *because* root properties do not propagate. Check: classify the
   directory as a build root first, then grep for `org.gradle.` — never the
   reverse order.
6. **Assuming a Settings plugin's shared `BuildService` is Isolated-Projects-hostile**
   because "one object shared across all projects" sounds like the mutable state
   IP forbids. The docs say the opposite about the registration; the risk is
   what happens after it. Check: does anything outside the single
   `registerIfAbsent { parameters { … } }` touch the parameters or the registry?
7. **Assuming JSpecify is a free upgrade from JSR-305.** Its Kotlin default is
   `strict`, JSR-305's is `warn`, so "modernising the annotations" is a
   consumer-breaking change — the reverse of the usual direction. Check: does
   the diff move `javax.annotation.*` to `org.jspecify.annotations.*` on an
   exported type? Then it is a compatibility review, not a rename.
8. **Banning duplicate leaf names outright.** The rule without the group
   conjunct fails Google's own modularisation sample and teaches the team to
   disable it. Check: run the leaf-name scan and the group grep together; one
   without the other is not a finding.
9. **Claiming `gradle/gradle#847` was fixed.** Eight years old and 137
   reactions makes "surely fixed by now" the plausible completion. It is open;
   read the issue timeline before asserting any fix version.
10. **Caching the provisioned binary under `build/`,** which is the reflex
    location for anything a build produces — and which `clean` wipes, so every CI
    job re-downloads. Check: the service's cache dir must not derive from
    `layout.buildDirectory`.
11. **Writing a Settings plugin's functional test as if it were a project
    plugin,** applying it from a generated `build.gradle.kts` — because every
    TestKit example in the training data, including Gradle's own walkthrough, is
    a project-plugin example. The test then goes green having applied nothing.
    Check: the generated `settings.gradle(.kts)`, not the build file, carries the
    `plugins { id(…) }` line (GRADLE-PLUG-29).
12. **Reaching for a static counter and `withDebug(true)` to prove a
    `BuildService` was created once,** because it is the shortest path to an
    assertion that reads like a unit test. It works, and it silently stops
    testing what a real daemon does. Check: `grep -rn 'withDebug' <plugin>/src/*[Ff]unctional*/`
    — any hit paired with a static-field assertion is the smell; the fix is the
    marker file. Adjacent: **hallucinating a build-scan value or a
    `BuildServiceRegistration.instantiationCount`** when asked to prove
    singleton-ness — no such surface exists.
13. **Proving sha256 enforcement with a grep alone.** The common shape that
    passes it and does nothing is a `Provider<String>` computed from a
    `ValueSource` that nothing ever `.get()`s. Check: tamper the pin, assert
    `buildAndFail()` (GRADLE-PLUG-24).

## Open questions

**Owner decisions.**

- **Q1 — Where does the OCX binary's expected sha256 come from, and who signs
  it?** GRADLE-PLUG-24 enforces a hash but this program never established the
  source of truth: `ocx.lock` in the consuming repo (which the plugin reads with
  a `ValueSource`), a checksum file published beside the release, or a value
  baked into the plugin per version. Each has a different trust boundary and only
  the first survives a plugin release cadence slower than the CLI's.
- **Q2 — Does the OCX Gradle plugin ship a build-cache settings convention at
  all?** If it does, GRADLE-STRUCT-12 becomes something the plugin *provides* to
  adopters rather than something it obeys, and the credential name becomes part
  of its public contract.
- **Q3 — Is GRADLE-STRUCT-11 worth a MUST at zero corpus violations?** We say
  yes: the cost is nil, the failure is silent, and the rule's real work is
  stopping an agent from shipping the naive 17/32-flagging version. The owner may
  prefer CONSIDER.

**Subareas deserving another research round.**

1. **Which application route should be a Settings plugin's *default*, absent the
   `compileOnly` trap.** The follow-up settled that both routes work at settings
   scope and recommends `MAVEN_REPO` on fidelity grounds — it is the mechanism a
   real consumer uses — but no primary source, no corpus repo and no
   gradle/gradle test settles it for settings scope, because none exists.
   GRADLE-PLUG-29 ships that recommendation as a preference, not a measured
   default. *Question:* does the local-publish step's cost (or its
   `maven-publish` + configuration-cache interaction, [#24040](https://github.com/gradle/gradle/issues/24040))
   make `withPluginClasspath()` the better default for a plugin with no
   `compileOnly` dependency?
2. **The cold-runner cost of execution-time provisioning.** GRADLE-PLUG-23 moves
   the download to first task execution, which is correct for the configuration
   cache and possibly wrong for wall-clock: on a cold runner the download now
   serialises against the task graph rather than overlapping configuration.
   *Question:* what does the first-task-pays model cost on a GitHub-hosted runner
   versus provisioning in a `setup-ocx`-style CI step, and does that change
   whether the Gradle plugin should provision at all when a CI action already did?
3. **Latent-collision detection for GRADLE-STRUCT-10.** The rule is preventive
   because we could not establish whether sqldelight's and testcontainers'
   collisions ever enter one resolution graph. *Question:* is there a
   Gradle-side way to *detect* an actually-losing project (a resolution-result
   walk, a build scan dependency view, a `dependencies` report diff) so the rule
   can report a real defect rather than a latent one?

## Revision log

**2026-09-12 — folded in `settings-plugin-testkit-verification`** (the follow-up
this file's own open question 1 commissioned). No existing rule ID was
renumbered, retired or re-meant; every change is a Verification cell, plus one
new ID.

| Change | IDs | Why |
|---|---|---|
| Verification rewritten from a source read to a **runnable negative test** (tamper the pin → `buildAndFail()`, plus a `--configuration-cache` repeat) | GRADLE-PLUG-24 | The old cell's grep passes for a hash that is computed and never consumed — a `Provider` nothing `.get()`s. Overclaim: it proved *where* the check lives, not that it fires. |
| Verification rewritten from a source read to **two runnable legs** (survives `clean`; wrong-content file at the right path is rejected) | GRADLE-PLUG-25 | A source read cannot tell `exists()` from a hash compare whose result is discarded. |
| Verification gains the **marker-file leg** proving "registered exactly once", and names `withDebug(true)` / static counters as rejected | GRADLE-PLUG-23 | No API or build-scan value reports instantiation count; the old cell asserted the guarantee without a way to observe it. |
| Verification corrected: **"diagnostics output reports no violation (empty is the pass)" was wrong** — diagnostics always stores-then-discards, so output is never empty; the phrase to grep is a dated re-check; `BuildResult.output` is now known to be a legal TestKit surface | GRADLE-PLUG-27 | Conflict F. The old cell overclaimed a guarantee (empty output) the mechanism does not provide. |
| Verification gains a **runnable consumer-compatibility fixture** alongside the diff-review gate | GRADLE-PLUG-28 | A migration whose fixture does not flip `build()` → `buildAndFail()` has not broken consumers, and the major-version claim is unfounded for that type. |
| Verification explicitly labelled **"reading heuristic"**; substance unchanged | GRADLE-PLUG-22, GRADLE-PLUG-26 | The follow-up checked whether a dynamic test adds signal and found none; saying so stops a reader treating the grep as a test. |
| **New rule** — apply a Settings plugin's functional test from the generated *settings* file, prefer the `MAVEN_REPO` route | GRADLE-PLUG-29 (MUST) | Without it, every runnable cell above is green for free: a settings plugin applied from a `build.gradle.kts` is never applied to a `Settings` at all. 0/32 corpus and 0 upstream exemplars. |
| Verdict 11 added (TestKit reaches settings scope; mechanism and both routes) and verdict 12 added (three documented gaps: no instantiation-count surface, unpinned IP diagnostics wording, no exemplar anywhere) | — | Open question 1 answered; the parts that are gaps rather than answers moved into the Verdict per the revision contract. |
| Open question 1 replaced: "how does `GradleRunner` apply a Settings plugin" (answered) → "which route should be the default absent the `compileOnly` trap" (genuinely unsettled) | — | The follow-up's own contested item; GRADLE-PLUG-29 ships a preference, not a measurement. |
| MUST count 9/10 → **10/11**; GRADLE-PLUG 6/7 → **7/8** | — | One new MUST, no severity changed. |

## Sub-artifacts

- [`jvm-gradle-settings/settings-time-surface-and-tool-provisioning.md`](jvm-gradle-settings/settings-time-surface-and-tool-provisioning.md)
  — the four wave-2 follow-ups read against primary docs: which Gradle seat can
  download and verify a pinned non-JVM binary (`JavaToolchainResolver` vs
  `ArtifactTransform` vs `BuildService`), whether a Settings plugin's shared
  `BuildService` can be Isolated-Projects-compatible on 9.7, the two never-dived
  settings-file defects ([#847](https://github.com/gradle/gradle/issues/847) and
  subproject `gradle.properties`), remote build-cache push-gating, and the
  JSR-305-vs-JSpecify default-report-level question. Five of its corpus counts
  are corrected above (conflicts A-E); every primary-doc finding stands.
- [`jvm-gradle-settings/settings-plugin-testkit-verification.md`](jvm-gradle-settings/settings-plugin-testkit-verification.md)
  — the wave-4 follow-up: whether and how `GradleRunner` exercises a
  `Plugin<Settings>`, read out of gradle/gradle's own TestKit,
  plugin-resolution and configuration-cache source at `ea17004a31`. Supplies
  every rewritten Verification cell above, the `withDebug(true)` rejection, the
  marker-file pattern, and the three gaps in verdict 12. One of its cells is
  corrected here (conflict F names the overclaim in the *old* cell, which the
  follow-up itself diagnosed); its rule text, rationale and severities were frozen
  by the map and are unchanged.

## Key sources

1. [Toolchain resolver plugins](https://docs.gradle.org/current/userguide/toolchain_plugins.html) — the `toolchainManagement` registration shape and the resolver contract that excludes non-JDK tools.
2. [`JavaToolchainDownload` javadoc](https://docs.gradle.org/current/javadoc/org/gradle/jvm/toolchain/JavaToolchainDownload.html) — confirms the type carries only a `URI`, with no checksum field anywhere.
3. [Shared build services](https://docs.gradle.org/current/userguide/build_services.html) — `BuildService` lifecycle, lazy creation on first use, parameter serialization into the configuration cache, and the Isolated-Projects registry restrictions.
4. [Configuration cache requirements](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html) — `ValueSource`/`obtain()`, `ExecOperations` injection, and why `ValueSource` is the one mechanism exempt from automatic input detection.
5. [Artifact transforms](https://docs.gradle.org/current/userguide/artifact_transforms.html) — confirms transforms act on already-resolved dependency artifacts, ruling the seat out for an arbitrary binary URL.
6. [Isolated Projects](https://docs.gradle.org/current/userguide/isolated_projects.html) — the four constraint categories and which two are "not fully enforced yet," plus the `registerIfAbsent` safety statement and its caveat.
7. [Gradle 9.7.0 release notes](https://docs.gradle.org/9.7.0/release-notes.html) — IP experimental→incubating (2026-08-06), `org.gradle.isolated-projects` vs the deprecated `unsafe` key, and diagnostics mode.
8. [Build cache](https://docs.gradle.org/current/userguide/build_cache.html) — the `remote<HttpBuildCache> { isPush = … }` DSL, the CI-populates/developers-read recommendation, and the local-push-on/remote-push-off defaults.
9. [Best practices — general](https://docs.gradle.org/current/userguide/best_practices_general.html) — "Do not use `gradle.properties` in subprojects," with the `avoidGradlePropertiesInSubProjects` snippets shipped in gradle/gradle's own docs tree.
10. [`Project` javadoc — `getGroup()`](https://docs.gradle.org/current/javadoc/org/gradle/api/Project.html#getGroup()) — "The group defaults to the path with dots as separators," the sentence that makes GRADLE-STRUCT-10's conjunct necessary; verbatim in `gradle__gradle@ea17004a31:subprojects/core-api/src/main/java/org/gradle/api/Project.java:393-394`.
11. [gradle/gradle#847](https://github.com/gradle/gradle/issues/847) — root cause (`group:name` module identity), the "closer to conflict resolution than dependency substitution" explanation, every community workaround, and the 2025-06-30 reproduction on 8.12.1.
12. [gradle/gradle#2534](https://github.com/gradle/gradle/issues/2534) — Gradle properties are not passed to included builds; the reason a `build-logic/gradle.properties` full of `org.gradle.*` keys is correct rather than a violation.
13. [Calling Java from Kotlin — nullability annotations](https://kotlinlang.org/docs/java-interop.html) — the exact defaults: `-Xjsr305=warn` since 1.1.50, `-Xjspecify-annotations=strict` since 2.1.
14. [gradle/foojay-toolchains](https://github.com/gradle/foojay-toolchains) — scope limited to JDK archives and no checksum configuration, corroborating that the sanctioned toolchain seat never enforces a hash.
15. [gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040) — `maven-publish` with an explicit `credentials {}` silently disables the configuration cache; the reason GRADLE-PLUG-23's verification is the literal `Reusing configuration cache.` line and not a green build.
16. [Testing Gradle plugins](https://docs.gradle.org/current/userguide/test_kit.html) — `GradleRunner`, the verbatim `compileOnly` × `withPluginClasspath()` incompatibility and its `ClassNotFoundException` symptom, and — by its silence on settings scope — the confirmation that the mechanism had to be read out of the source.
17. [`BuildServiceRegistry` javadoc](https://docs.gradle.org/current/javadoc/org/gradle/api/services/BuildServiceRegistry.html) — only `registerIfAbsent(…)` and `getRegistrations()`; no instantiation count anywhere, the gap behind the marker-file pattern.
18. [Working with Plugins](https://docs.gradle.org/current/userguide/plugins_intermediate.html) — the canonical `pluginManagement { repositories { maven(…) } }` shape and the "must be the first block in the file" rule GRADLE-PLUG-29's fixture depends on.
19. `gradle__gradle@ea17004a31:platforms/extensibility/plugin-use/src/main/java/org/gradle/plugin/use/internal/{PluginResolverFactory.java:56-86,DefaultPluginRequestApplicator.java:82-131}` plus `subprojects/core/src/main/java/org/gradle/internal/service/scopes/SettingsScopeServices.java:98-117` — plugin resolution is target-type-agnostic and a `Settings`'s plugin manager is built by the same machinery as a project's: the source proof behind verdict 11.
20. `gradle__gradle@ea17004a31:platforms/core-configuration/configuration-cache/src/integTest/groovy/org/gradle/internal/cc/impl/{ConfigurationCacheTestKitIntegrationTest.groovy:36-48,isolated/IsolatedProjectsFixture.groovy:124-132}` — Gradle's own doc comment naming the `INJECTED_CLASSPATH` and `MAVEN_REPO` routes, and the fixture proving IP diagnostics stores-then-discards through the configuration-cache problem pipeline (conflict F).
