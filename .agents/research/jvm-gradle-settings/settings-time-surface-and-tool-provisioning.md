---
title: "Settings-time surface: tool provisioning, Isolated Projects, and settings-file defects"
topic: jvm-gradle-settings
agent: settings-time-surface-and-tool-provisioning
model: sonnet
date_researched: 2026-09-12
sources_count: 17
scope: >
  Four wave-2 follow-ups that all live in settings.gradle.kts: (1) which Gradle
  seat can download-and-verify a pinned non-JVM binary for a Settings plugin
  (GRADLE-PLUG), (2) whether a Settings plugin registering a shared BuildService
  can be Isolated-Projects-compatible on Gradle 9.7 (GRADLE-PLUG), (3) two
  never-dived settings-file defects — duplicate subproject leaf names and
  subproject gradle.properties — plus remote-build-cache push-gating
  (GRADLE-STRUCT), (4) JSR-305-vs-JSpecify breakage on a plugin's public API
  under Kotlin 2.2/K2 (GRADLE-PLUG). Not covered: everything already shipped in
  jvm-gradle-core.md and jvm-gradle-plugin-dev.md (ValueSource/BuildService
  spine for `ocx env` reads, TestKit matrix, Portal metadata, shading) — this
  file extends those, it does not restate them.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [The provisioning seat for a pinned binary](#1-the-provisioning-seat-for-a-pinned-binary)
   2. [Isolated Projects for a Settings plugin](#2-isolated-projects-for-a-settings-plugin)
   3. [Duplicate subproject leaf names (gradle/gradle#847)](#3-duplicate-subproject-leaf-names-gradlegradle847)
   4. [Subproject gradle.properties vs the configuration cache](#4-subproject-gradleproperties-vs-the-configuration-cache)
   5. [Remote build-cache push-gating](#5-remote-build-cache-push-gating)
   6. [JSR-305 vs JSpecify on a plugin's public API](#6-jsr-305-vs-jspecify-on-a-plugins-public-api)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **Custom `JavaToolchainResolver` cannot provision `ocx` at all** — `resolve(JavaToolchainRequest)` only accepts JDK-shaped requests (`languageVersion`/vendor/implementation) and returns a bare `URI` to a zip/tar with no checksum field in the contract; there is no way to ask it for a non-JDK CLI tool, and doing so anyway pollutes Gradle's own `~/.gradle/jdks` toolchain table.
- **The provisioning seat is a `BuildService`-backed download-and-verify, registered once from `Plugin<Settings>.apply()` via `gradle.sharedServices.registerIfAbsent(...)`** — download and sha256 verification happen inside the service's own execution-time methods, not at configuration time.
- **The sha256 check must be *enforced* (thrown on mismatch, before the binary is put on any task's classpath/PATH), not merely *computed*** — a `ValueSource` can compute a hash but has no authority to fail a task; only execution-time code (the `BuildService`, or a task action that consumes it) can gate.
- **This introduces zero configuration-cache inputs by construction**, because the download/verify work runs at first task-execution, never inside `apply()` or `obtain()`; only the *version pin* (read from `ocx.lock`) belongs in a `ValueSource` at configuration time (GRADLE-PLUG-08 already owns that half).
- **On a cold CI runner with an empty Gradle user home, the first task that touches the service pays the download cost** — same behavior class as toolchain auto-provisioning; the fix is caching the destination under `GRADLE_USER_HOME` (or `OCX_HOME`) so a second invocation on the same runner is a no-op, and making the check-before-download idempotent on the sha256 itself.
- **`ArtifactTransform` is not a viable seat**: it transforms artifacts Gradle has already resolved through a `Configuration`; there is no sanctioned way to hang an arbitrary, non-Maven-repository URL off it without first inventing a fake dependency coordinate, and its `TransformParameters` contract documents no injectable process/HTTP service.
- **A Settings plugin CAN be Isolated-Projects-compatible on Gradle 9.7 today, for one specific shape**: register the shared `BuildService` exactly once, with parameters fixed entirely from settings-scope values (no per-project mutation afterward) — Gradle's own docs call `gradle.sharedServices.registerIfAbsent(…)` "safe with Isolated Projects" in general.
- **That safety claim is bounded, not absolute**: only two of IP's four constraint categories (cross-project access, project-to-build access) are actively enforced; cross-build and build-to-project access are "not fully enforced yet" as of 9.7.0 — so a build that passes diagnostics today is not proven safe against those two categories tomorrow.
- **The diagnostic that proves it is `-Dorg.gradle.isolated-projects.diagnostics=true`**, run against a real task graph — it configures projects sequentially and reports every violation without failing the build. Per GRADLE-CACHE-10, this stays a manual/scheduled check, never a required CI gate, because IP is incubating only since 9.7.0 (2026-08-06).
- **`gradle/gradle#847` ("two subprojects sharing a leaf name") is open since 2016-11-12 with 137 👍, still reproducing as of a 2025-06-30 comment on Gradle 8.12.1, and unfixed through the current 9.x line** — root cause is that Gradle derives the resolved module coordinate from `group:<leaf-path-segment>`, so `:a:foo` and `:b:foo` both become `org.test:foo`, and conflict resolution silently keeps one and drops the other with no build failure.
- **Given there is no build failure to hang the defect on, its severity is higher than a build failure, not lower** — a silently wrong runtime classpath is undetectable except by symptom-hunting; treat "commit a duplicate leaf name" as a MUST-fail-CI lint, enforced by a script since Gradle itself will never fail the build for it.
- **Detection is `./gradlew projects` plus a duplicate-leaf-name scan** — no built-in Gradle report calls this out; a reviewer (or CI script) must diff the leaf segments of every included project path.
- **`gradle.properties` in a subproject is a documented Gradle Best Practice violation** ("Do not use `gradle.properties` in subprojects") because AGP/KGP and Gradle itself don't reliably read it there — but the sharper failure mode is `org.gradle.*` build-environment keys specifically (`org.gradle.caching`, `org.gradle.configuration-cache`, `org.gradle.jvmargs`, `org.gradle.parallel`, `org.gradle.workers.max`): these are read once at daemon/settings startup from the root and `GRADLE_USER_HOME`, so a subproject-level override is silently never consulted at all, not merely "inconsistently" — the configuration cache's own key assumes these are build-wide constants.
- **No checked-out `settings.gradle*` in the corpus sets `remote(HttpBuildCache) { isPush = ... }` gated on anything but CI-ness** — `detekt` gates push on `isCiBuild` alone, which is also true on a fork PR's CI run; `testcontainers-java` gates on `isCI && !READ_ONLY_REMOTE_GRADLE_CACHE && DEVELOCITY_ACCESS_KEY != null`, which a fork PR (no injected secrets) structurally cannot satisfy.
- **The push-gating rule is: gate on possession of a write credential, never on CI-ness or branch name alone** — CI-ness is true for fork-triggered runs too; a credential GitHub Actions strips from fork PRs is the only thing that actually distinguishes "our CI" from "anyone's PR CI."
- **`apache__kafka`'s build-scan gate (`publishing.onlyIf { it.authenticated }`) is the same shape one level up** — it gates a *different* Develocity publish action on the same "do we hold real credentials" test, and is the pattern a build-cache push rule should echo structurally, even though kafka's own `buildCache{}` block disables its remote push outright (`remote(develocity.buildCache) { enabled = false }`) rather than gating it.
- **JSR-305 on a plugin's public API does not break a consumer's Kotlin DSL build script under Kotlin 2.2/K2 — it only warns** — `-Xjsr305` defaults to `warn`, unchanged since Kotlin 1.1.50/1.2, and is unaffected by K2.
- **JSpecify on that same API is the riskier migration, not the safer one** — `-Xjspecify-annotations` defaults to `strict` (errors) since Kotlin 2.1, so replacing JSR-305 with JSpecify annotations on a plugin's exported types can turn previously-silent consumer nullability mismatches into consumer build failures; this needs a major-version note, not a routine annotation swap.
- **The foojay-resolver-convention plugin (8/32 corpus adoption, all pinned at `1.0.0`) exposes no checksum configuration whatsoever** — confirms structurally that JDK provisioning through Gradle's sanctioned toolchain-resolver seat never enforces a hash, which is one more reason that seat cannot double as the sha256-enforcing mechanism the OCX plugin needs.

## Findings

### 1. The provisioning seat for a pinned binary

**The candidates, read from primary docs.**

`JavaToolchainResolver` is registered from a Settings plugin via `toolchainManagement`:

```kotlin
// settings.gradle.kts
toolchainManagement {
    jvm {
        javaRepositories {
            repository("ocxResolver") {
                resolverClass = com.example.OcxToolchainResolver::class.java
            }
        }
    }
}
```

Its contract is narrow and JVM-shaped: `Optional<JavaToolchainDownload> resolve(JavaToolchainRequest request)` on an interface that itself extends `BuildService<BuildServiceParameters.None>` — the interface is `@Incubating` since Gradle 7.6 ([Toolchain resolver plugins](https://docs.gradle.org/current/userguide/toolchain_plugins.html)). `JavaToolchainRequest`/`JavaToolchainSpec` model `languageVersion`, vendor and implementation — there is no field for an arbitrary tool name or version string, and `JavaToolchainDownload` is `static JavaToolchainDownload fromUri(URI uri)` with the URI required to be an HTTPS zip or tar — **no checksum field exists anywhere in this API** ([JavaToolchainDownload javadoc](https://docs.gradle.org/current/javadoc/org/gradle/jvm/toolchain/JavaToolchainDownload.html)). A resolved download is registered into Gradle's own JDK toolchain table; there is no sanctioned way to satisfy a request for "ocx 1.4.2" without lying about it being a JDK, which corrupts that table for real toolchain resolution. **Answer: a non-JVM CLI cannot use `JavaToolchainResolver` at all** — not "with workarounds," structurally excluded by the request/response types.

`ArtifactTransform` operates on artifacts Gradle has already resolved through a `Configuration`; it runs during dependency resolution rather than as an independent action ([Artifact Transforms](https://docs.gradle.org/current/userguide/artifact_transforms.html)). `TransformParameters` in the documented examples carry only `@Input`/`@CompileClasspath`-style declared inputs; there is no injectable `ExecOperations` or download-capable service in the contract, and the whole mechanism presumes the bytes already arrived via ordinary Maven/Ivy repository resolution — which `ocx`'s registry is not. Using it would require first inventing a synthetic dependency coordinate and a flat-dir repository just to get Gradle to hand a transform a file to "verify," which is indirection with no documented support, not a sanctioned pattern.

`BuildService` is scoped to the whole build (not per-project) and is explicitly documented as shareable "by the tasks of all projects" via `Project.getGradle().getSharedServices()` ([Shared build services](https://docs.gradle.org/current/userguide/build_services.html)). It is created lazily — "this happens on demand when a task first uses the service" — and closed after the last consuming task, invoking `close()` if `AutoCloseable`. Its own execution-time code can inject `ExecOperations` (the same mechanism already sanctioned inside a `ValueSource`) or use plain `java.net.http.HttpClient`/`MessageDigest` — nothing here needs a special impurity boundary because it runs at **execution** time, not configuration time.

**Decision: a `BuildService`-backed download-and-verify, registered from the Settings plugin.**

```kotlin
// build-logic-settings module, applied from a Settings plugin
abstract class OcxProvisionerService : BuildService<OcxProvisionerService.Params> {
    interface Params : BuildServiceParameters {
        val pinnedVersion: Property<String>
        val expectedSha256: Property<String>
        val cacheDir: DirectoryProperty
    }

    fun ensureProvisioned(): RegularFile {
        val dest = parameters.cacheDir.get().file("ocx-${parameters.pinnedVersion.get()}")
        if (dest.asFile.exists() && sha256Of(dest) == parameters.expectedSha256.get()) return dest
        download(dest) // execution-time network I/O, plain stdlib
        val actual = sha256Of(dest)
        check(actual == parameters.expectedSha256.get()) {
            "ocx binary sha256 mismatch: expected ${parameters.expectedSha256.get()}, got $actual"
        }
        return dest
    }
}

// settings.gradle.kts — Plugin<Settings>.apply()
val provisioner = gradle.sharedServices.registerIfAbsent("ocxProvisioner", OcxProvisionerService::class) {
    parameters {
        pinnedVersion.set(providers.of(OcxLockValueSource::class) { }.map { it.version })
        expectedSha256.set(providers.of(OcxLockValueSource::class) { }.map { it.sha256 })
        cacheDir.set(layout.settingsDirectory.dir(".gradle/ocx-cache"))
    }
}
```

Correct/incorrect side by side — where the check must live:

```kotlin
// WRONG — computes the hash but never enforces it; a mismatch is silently logged
override fun obtain(): String = sha256Of(downloadedFile) // ValueSource.obtain(), read-only

// RIGHT — the BuildService throws, failing the build before any task consumes the binary
check(actual == expected) { "sha256 mismatch for ocx binary" }
```

**Configuration cache:** because the network call and the `check()` both run inside `ensureProvisioned()`, invoked from a task action the first time a task needs the binary, none of it is visible to the configuration phase. `BuildService` parameters are serialized into the cache entry and the service instance is recreated on every build ([Shared build services — Configuration Cache](https://docs.gradle.org/current/userguide/build_services.html)) — this is exactly the intended shape: the *parameters* (version, expected hash) are cache inputs; the *download* is not, because it happens after cache restoration, at execution time.

**Cold CI runner, empty `GRADLE_USER_HOME`:** the first task to call `ensureProvisioned()` pays the full download+verify cost, identical in kind to toolchain auto-provisioning on a fresh runner. The cache directory must live under a location that survives across separate Gradle invocations in the same job (`GRADLE_USER_HOME` or a dedicated `OCX_HOME`, never inside the project's `build/` directory, which `clean` wipes) and the existence check must itself be keyed on the sha256 (not just file presence), so a partially-written or stale file from a previous pinned version is re-downloaded rather than trusted.

### 2. Isolated Projects for a Settings plugin

Gradle's own docs, current as of 9.7.0, name exactly four constraint categories and split their enforcement:

| Category | Status |
|---|---|
| Cross-project access | actively enforced |
| Project-to-build access | actively enforced |
| Cross-build access | **not fully enforced yet** |
| Build-to-project access | **not fully enforced yet** |

([Isolated Projects](https://docs.gradle.org/current/userguide/isolated_projects.html))

On shared services specifically, the same page states: *"Generally speaking, registering a build service via `gradle.sharedServices.registerIfAbsent(…)` is safe with Isolated Projects,"* with one caveat: *"Any mutation of the build service parameters outside of `registerIfAbsent(…) { parameters { …​ } }` should be avoided."* Separately, `getRegistrations()` on the shared-services registry is restricted under IP to `findByName(String)` only — every other method on that returned set "emit[s] Isolated Projects violations."

**This changes the brief's framing.** A Settings plugin that registers one `BuildService` is not IP-hostile *by construction* — it is the explicitly documented safe shape, provided:

- registration happens exactly once, in `Plugin<Settings>.apply()`, with `parameters { ... }` set inline at registration (not mutated afterward from a per-project callback);
- no project build script or convention plugin later enumerates or re-touches other projects' registrations (only `findByName` is legal under IP);
- nothing in the plugin reads another project's mutable state to decide *what* to register (that is cross-project access — enforced, and will fail fast if violated).

What remains genuinely open, and is the reason the answer is bounded rather than unconditional: cross-build access (e.g., anything reaching into `gradle.parent` from an included build) and build-to-project access (a `beforeProject`/`afterEvaluate`-style callback capturing build-scope mutable state during project evaluation) are **not fully enforced yet**. A plugin can pass every IP check today by accident of incomplete enforcement and still be relying on a shape that breaks once Gradle finishes enforcing those two categories.

**Diagnostic:** run any real task invocation with diagnostics mode, which reports without failing:

```
./gradlew help -Dorg.gradle.isolated-projects.diagnostics=true
```

This "runs configuration of projects sequentially" and "deterministically reports constraint violations" in one pass ([9.7.0 release notes](https://docs.gradle.org/9.7.0/release-notes.html)). Per GRADLE-CACHE-10 (`jvm-gradle-core.md`), this stays a SHOULD-run-manually / scheduled-only check — **never a required CI gate** — because Isolated Projects is incubating only since 9.7.0 (2026-08-06) and the property is `org.gradle.isolated-projects`, never the deprecated `org.gradle.unsafe.isolated-projects`.

### 3. Duplicate subproject leaf names (gradle/gradle#847)

[gradle/gradle#847](https://github.com/gradle/gradle/issues/847), filed 2016-11-12, **still open** as of 2026-09-12, 137 👍 / 7 😕 / 3 ❤️, with a comment as recent as 2025-12-03 (a linked Kotlin YouTrack ticket) and explicit reproduction on Gradle 8.12.1 dated 2025-06-30 ("Still a problem in Gradle 8.12.1. Hope it will be fixed someday"). No Gradle release across the 8.x or 9.x lines has fixed it.

Root cause, per Gradle team member `@bigdaz` on the thread: *"there's not actually any dependency substitution going on here. The problem is that both 'foo' projects produce modules with exactly the same module identifier — `org.test:foo:unspecified`. We use module identifiers to identify nodes in the dependency graph. So the choosing of `a:foo` over `b:foo` is closer to conflict resolution than dependency substitution."* Given:

```
// settings.gradle
include 'a:foo'
include 'b:foo'
```

both resolve to the same `group:name`, and when both are depended on, Gradle's ordinary conflict resolution keeps one and silently drops the other — **no build failure, no warning task output**, just a classpath missing classes from whichever project lost.

Community workarounds (none from Gradle itself): give the colliding subprojects distinct `group`s; alias with `include(':a:foo-a')` + `project(':a:foo-a').projectDir = file('a/foo')`; or rename post-hoc with `findProject(':a:foo')?.name = 'foo-a'`.

**Detection:** `./gradlew projects` lists every included project path, but nothing in Gradle flags a collision — a script must extract each path's leaf segment and diff:

```bash
./gradlew projects --console=plain -q | \
  grep -oE "Project ':[^']+'" | \
  sed -E "s/.*:([^:']+)'/\1/" | sort | uniq -d
```

Non-empty output is the failure signal.

### 4. Subproject gradle.properties vs the configuration cache

Gradle's own Best Practices doc names this directly: **"Do not use `gradle.properties` in subprojects."** Rationale, quoted: *"Gradle allows `gradle.properties` files in both the root project and subprojects, but support for subproject properties is inconsistent. Gradle itself and many popular plugins (such as the Android Gradle Plugin and Kotlin Gradle Plugin) do not reliably handle this pattern."* Its remedy: single-subproject properties belong directly in that subproject's `build.gradle(.kts)`; properties shared across several subprojects belong in a convention plugin, not a scattered `gradle.properties` per module ([Gradle Best Practices — general](https://docs.gradle.org/current/userguide/best_practices_general.html)).

**The sharper, root-only symptom the map's row is chasing:** Gradle's own `org.gradle.*` build-environment keys — `org.gradle.caching`, `org.gradle.configuration-cache`, `org.gradle.jvmargs`, `org.gradle.parallel`, `org.gradle.workers.max`, `org.gradle.vfs.watch` — are read once, from the root project's `gradle.properties` and `GRADLE_USER_HOME/gradle.properties`, at daemon/settings-evaluation startup, before any subproject is ever visited. A subproject-level `org.gradle.caching=false` is not merely "inconsistently handled" — it is never consulted for these specific keys at all. The symptom: a team drops `org.gradle.caching=false` into one flaky module's `gradle.properties` believing they've scoped the change, and every build keeps caching that module's tasks anyway, because the daemon already fixed its cache-affecting startup properties before that file was ever read. This is distinct from ordinary custom extension properties (`myPlugin.enabled=true`), which Gradle *does* read per-project fine — the restriction is specific to `org.gradle.*` keys, which the configuration cache's own key treats as build-wide constants.

### 5. Remote build-cache push-gating

Gradle's docs state the intended shape directly: *"The recommended use case for the remote build cache is that your continuous integration server populates it from clean builds while developers only load from it,"* configured as:

```kotlin
// settings.gradle.kts
buildCache {
    remote<HttpBuildCache> {
        url = uri("https://cache.example.com/cache/")
        isPush = isCiServer
    }
}
```

and by default "the local build cache has push enabled, and the remote build cache has push disabled" ([Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)). No corpus repo's checked-out `settings.gradle*` shows this exact `isPush = ...` gated on anything beyond CI-ness alone, and that gap matters: **a fork PR's CI run is also "CI."** GitHub Actions runs `pull_request`-triggered jobs from forks on the same runners with the same environment markers, but strips repository secrets from them by design. A gate that only checks `System.getenv("CI") != null` (or an equivalent `isCiBuild`) does not distinguish "our trusted CI" from "anyone's fork PR," and a poisoned/malicious cache entry pushed from a fork would be pulled by every subsequent trusted build.

The corpus shows both shapes side by side:

```kotlin
// detekt__detekt@45672efb8b:settings.gradle.kts:74-84 — CI-only gate
buildCache {
    local { isEnabled = !isCiBuild }
    remote(develocity.buildCache) {
        server = "https://community.develocity.cloud"
        isEnabled = true
        isPush = isCiBuild   // true on a fork PR's CI run too
    }
}
```

```groovy
// testcontainers__testcontainers-java@a4d3a033d8:settings.gradle:37-46 — credential-gated
buildCache {
    local { enabled = !isCI }
    remote(develocity.buildCache) {
        enabled = true
        // Check access key presence to avoid build cache errors on PR builds when access key is not present
        push = isCI && !System.getenv("READ_ONLY_REMOTE_GRADLE_CACHE") && System.getenv("DEVELOCITY_ACCESS_KEY") != null
    }
}
```

`apache__kafka@940c100fab:settings.gradle:39-73` echoes the same discipline one layer up, on the build-scan publish rather than the cache push, and is the exact shape the map's brief points at: `publishing.onlyIf { it.authenticated }` — the publish only proceeds if the invocation carries valid Develocity credentials, which a fork PR structurally lacks. Kafka's own `buildCache{}` block sidesteps the question entirely by disabling remote push outright (`remote(develocity.buildCache) { enabled = false }`) rather than gating it.

**Rule: gate push on possession of a write credential, never on CI-ness or branch name alone.** `isCiBuild` / `System.getenv("CI")` is necessary but not sufficient; a secret injected only into trusted runs (`DEVELOCITY_ACCESS_KEY`, an access-key `Provider` backed by `providers.environmentVariable(...).isPresent`) is the discriminator that a fork PR cannot forge.

### 6. JSR-305 vs JSpecify on a plugin's public API

Kotlin's own interop docs give both defaults explicitly and unambiguously ([Calling Java from Kotlin](https://kotlinlang.org/docs/java-interop.html)):

- **JSR-305** (`javax.annotation.@Nonnull`/`@Nullable`/`@CheckForNull`): *"The default behavior is the same to `-Xjsr305=warn`. The `strict` value should be considered experimental."* This default has held since Kotlin 1.1.50/1.2 and is untouched by K2. Built-in JSR-305 annotations are *always enabled* and affect Kotlin's inferred types regardless of the flag, but a **mismatch is a warning**, not a compile error.
- **JSpecify** (`org.jspecify.annotations.@Nullable`/`@NullMarked`): *"By default, the Kotlin compiler reports nullability mismatches for JSpecify annotations as errors"* — JSpecify is, verbatim, *"the only supported flavor that uses `strict` report level by default."* This has held since Kotlin 2.1.

**Answer to the DECIDE:** keeping JSR-305 on a Gradle plugin's public API does **not** break a consumer's Kotlin DSL build script under Kotlin 2.2/K2 — a mismatch is a compiler warning, the build still succeeds. It is migrating that same API *to* JSpecify that is the compatibility-risk move: any consumer call site that previously relied on an unenforced `@Nullable` now gets a hard compile error under Kotlin 2.1+'s default. This is exactly backwards from an agent's likely instinct ("JSpecify is the modern, stricter, better-designed annotation set — upgrade to it"), and it needs to ship as a documented breaking change (major version bump, migration note), not a routine dependency-and-annotation swap.

## Normative guidance candidates

1. **Do not implement `JavaToolchainResolver` (or register a `toolchainManagement.jvm.javaRepositories` entry) to provision a non-JDK CLI tool.** Rationale: the interface's request/response types (`JavaToolchainRequest`/`JavaToolchainDownload`) are JDK-shaped with no version-floor or checksum field, and a successful "resolve" pollutes Gradle's own JDK toolchain table. Verify: `grep -rn 'JavaToolchainResolver\|toolchainManagement' src/` in the plugin's source — any hit outside genuine JDK provisioning is the defect. — MUST. Family: **GRADLE-PLUG**.
2. **Provision a pinned, checksum-verified binary from a Settings plugin via a `BuildService` registered through `gradle.sharedServices.registerIfAbsent(...)` in `Plugin<Settings>.apply()`, with the download and sha256 check performed inside the service's own execution-time method, never in `apply()` or a `ValueSource.obtain()`.** Rationale: this is the only seat that is (a) shareable across every project from settings scope, (b) able to fail the build on a bad hash, and (c) invisible to the configuration cache by construction. Verify: read the Settings plugin's `apply()` for a `registerIfAbsent` call, and confirm the checksum `check()`/`require()` lives inside the service class, not a `ValueSource`. — MUST. Family: **GRADLE-PLUG**.
3. **Never compute a sha256 for enforcement purposes inside a `ValueSource`.** Rationale: `ValueSource.obtain()` can compute a value but has no mechanism to gate task execution; a mismatch there is either swallowed or turns every configuration phase into a full re-verification of a potentially large binary. Verify: grep any `ValueSource` subclass for `MessageDigest`/`sha256` — a hit is a routing defect, not a security control. — MUST. Family: **GRADLE-PLUG**.
4. **Cache the provisioned binary under `GRADLE_USER_HOME` (or an equivalent tool-managed home directory), never under the project's `build/` directory, and key the on-disk cache check on the pinned sha256, not mere file presence.** Rationale: a cold CI runner pays the download cost once; a location `clean` can wipe, or a presence-only check that trusts a stale file from a prior pinned version, defeats that amortization or the verification itself. Verify: read the `BuildService`'s cache-dir wiring and its skip-condition. — MUST. Family: **GRADLE-PLUG**.
5. **A Settings plugin's shared `BuildService` registration is Isolated-Projects-safe only if registered exactly once with parameters fixed entirely at `registerIfAbsent { parameters { ... } }` time — never mutated afterward, and never read back via any registry method but `findByName`.** Rationale: this is Gradle's own documented safe shape; any deviation (per-project parameter mutation, enumerating other registrations) is either an enforced cross-project violation today or an unenforced build-to-project/cross-build violation that will start failing once Gradle finishes IP enforcement. Verify: `grep -rn 'sharedServices' settings-plugin/src` and manually confirm no mutation site exists outside the registration call. — MUST for new Settings-plugin provisioning code. Family: **GRADLE-PLUG**.
6. **Run Isolated Projects diagnostics (`-Dorg.gradle.isolated-projects.diagnostics=true`) on the Settings plugin's own functional-test build at least once per release, but never wire `org.gradle.isolated-projects=true` into a required CI job.** Rationale: two of four IP constraint categories are not fully enforced as of 9.7.0, so a clean diagnostics run today is evidence, not proof, and IP itself is incubating. Verify: diagnostics output is empty; CI workflow contains no `isolated-projects=true` in a required job (consistent with GRADLE-CACHE-10). — SHOULD. Family: **GRADLE-PLUG**.
7. **Ban two subprojects sharing the same leaf path segment across the whole settings tree**, regardless of nesting, because Gradle derives the resolved module identifier from `group:<leaf-segment>` and silently keeps one on conflict. Verify: `./gradlew projects --console=plain -q | grep -oE "Project ':[^']+'" | sed -E "s/.*:([^:']+)'/\1/" | sort | uniq -d` — any output is a MUST-fail. — MUST. Family: **GRADLE-STRUCT**.
8. **Never place a `gradle.properties` file in any subproject directory.** Rationale: Gradle's own Best Practices name this explicitly; `org.gradle.*` build-environment keys are read once from root/`GRADLE_USER_HOME` and never consulted per-subproject at all, silently ignoring an override rather than merely handling it "inconsistently." Verify: `find . -mindepth 2 -name gradle.properties` (excluding the root and `GRADLE_USER_HOME`) — any hit is a MUST-fail. — MUST. Family: **GRADLE-STRUCT**.
9. **Any `remote(HttpBuildCache) { isPush = ... }`/`push = ...` expression must include a credential-presence conjunct, not CI-ness or branch name alone.** Rationale: fork-triggered CI runs are still "CI" but structurally lack injected secrets; gating on CI-ness alone lets a fork PR poison a shared cache that trusted builds later pull from. Verify: grep every `buildCache { remote(...) { ... } }` block in `settings.gradle*` for the push assignment; flag any expression that does not `&&` a secret/credential-presence check (`System.getenv("<TOKEN>") != null`, `providers.environmentVariable(...).isPresent`). — MUST. Family: **GRADLE-STRUCT**.
10. **Do not treat migrating a plugin's public API from JSR-305 to JSpecify annotations as a routine or purely-additive change.** Rationale: JSR-305 mismatches default to `-Xjsr305=warn` (non-breaking) while JSpecify mismatches default to `-Xjspecify-annotations=strict` (compile error) since Kotlin 2.1; the swap can turn silent consumer warnings into consumer build failures. Verify: a diff touching `javax.annotation.*` → `org.jspecify.annotations.*` on any exported (non-internal) type triggers a required changelog/major-version-bump note in review. — MUST. Family: **GRADLE-PLUG**.

## Exemplar evidence

- **Duplicate leaf names**: no corpus repo currently violates this (all 32 exemplars' `settings.gradle*` include-lists were checked in wave-1/2 shape audits without a collision flag); the defect is corroborated entirely by [gradle/gradle#847](https://github.com/gradle/gradle/issues/847)'s issue thread, not by a corpus hit — the rule is preventive, and the audit trail is the issue itself (137 👍, open, reproduced on 8.12.1 as recently as 2025-06-30).
- **Subproject `gradle.properties`**: not observed in the corpus's checked-out files either (a subproject `gradle.properties` would need per-repo sparse-checkout confirmation beyond this dive's budget); the rule rests on the primary doc's named anti-pattern, cited by `jvm-topic-map/codified-lint-catalogue.md:179`.
- **Push-gating, violates (CI-only)**: `detekt__detekt@45672efb8b:settings.gradle.kts:74-84` — `isPush = isCiBuild` with no credential check.
- **Push-gating, satisfies**: `testcontainers__testcontainers-java@a4d3a033d8:settings.gradle:37-46` — `push = isCI && !System.getenv("READ_ONLY_REMOTE_GRADLE_CACHE") && System.getenv("DEVELOCITY_ACCESS_KEY") != null`.
- **Push-gating, adjacent shape to echo**: `apache__kafka@940c100fab:settings.gradle:39-41` — `publishing.onlyIf { it.authenticated }` on the build-scan publish (not the cache push, which kafka disables outright at `settings.gradle:70-72`).
- **Push-gating, no gate at all**: `diffplug__spotless@dc2a4cb9a3:settings.gradle:24-30`, `mockito__mockito@5a676bcd9e:settings.gradle.kts:69-73` — local-only cache config, remote push never configured.
- **JavaToolchainResolver adoption**: `org.gradle.toolchains.foojay-resolver-convention` version `1.0.0` appears in 8/32 corpus repos (`apollographql__apollo-kotlin`, `cashapp__sqldelight`, `detekt__detekt`, `ktorio__ktor`, `mockito__mockito`, `pinterest__ktlint`, `square__okhttp`, `uber__NullAway`) — every instance pins the same version and configures nothing beyond applying the convention plugin; none exposes a checksum setting, corroborating that this seat structurally never enforces one.
- **`build-logic-settings` split (context for the provisioning plugin's own home)**: `gradle__gradle@ea17004a31:settings.gradle.kts:8-13` — `pluginManagement { includeBuild("build-logic-settings") }`, the corpus's only (1/32) example of a Settings plugin living in its own included build (GRADLE-STRUCT-02, already SHOULD not MUST per jvm-gradle-core.md).

## AI-agent angle

- **Reaching for `JavaToolchainResolver` because "toolchains" sounds like the right Gradle noun for "provision a pinned binary."** An LLM trained on Gradle toolchain examples will pattern-match "download + pin + version" to the toolchain API without checking that its request/response types are JDK-only. Smallest check: does the resolver's `resolve()` ever construct a `JavaToolchainRequest`/read a `JavaToolchainSpec`? If the "tool" isn't a JDK, this is the wrong file to be editing at all.
- **Putting the sha256 check inside a `ValueSource` because that's "the configuration-cache-safe place to do impure things."** True for reads, false for enforcement — a `ValueSource` has no way to fail a task. Smallest check: grep for `MessageDigest`/hash comparison inside any class extending `ValueSource`; it belongs in the `BuildService` or a task action instead.
- **Assuming a Settings plugin registering a shared `BuildService` is automatically Isolated-Projects-hostile**, because "one shared object across all projects" sounds exactly like the cross-project mutable state IP forbids. The primary docs say the opposite for the *registration* itself; the actual risk is in what happens *after* registration (per-project mutation, cross-registry enumeration). Smallest check: does anything outside the single `registerIfAbsent { parameters { ... } } ` call touch the service's parameters or the registrations set?
- **Assuming JSpecify is a safe, purely-beneficial upgrade from JSR-305** because it is "the modern, spec-blessed annotation set." Its Kotlin default is stricter (`strict`/errors) than JSR-305's (`warn`), so the swap is a potential breaking change for consumers, the reverse of what "upgrading annotations" usually means. Smallest check: does the diff replace `javax.annotation.*` with `org.jspecify.annotations.*` on any type reachable from the plugin's public/exported API? If so, treat it as a compatibility-review item, not a mechanical rename.
- **Gating build-cache push on `System.getenv("CI")` alone**, copied from generic "only push from CI" advice that predates fork-PR-aware CI. Smallest check: does the `isPush`/`push` expression `&&` a secret-presence test, or is CI-ness the only predicate? A fork PR satisfies "CI" every time.
- **Treating `gradle/gradle#847` as fixed** because it "sounds like the kind of thing Gradle would have fixed by now" (137 reactions, eight-plus years old). It is not — an agent citing this defect from training data risks stating a stale "this was fixed in Gradle X" claim; the smallest check is reading the issue's own timeline for the newest comment before asserting a fix version.

## Contested / evolving

- **Isolated Projects' safe-shared-service guidance is recent and still incubating** (9.7.0, 2026-08-06) — Gradle's own docs flag two of four constraint categories as "not fully enforced yet." A plugin architecture built around the documented-safe shape today could still need rework once cross-build and build-to-project enforcement lands; there is no dated commitment for when that happens.
- **`com.gradle.plugin-publish` 2.1.0 auto-applying the Compatibility Plugin** makes a configuration-cache compatibility declaration "deprecated if absent" with an undated intent to hard-reject in future — GRADLE-PLUG-17 already carries this; Isolated Projects is not yet a declarable feature in that same Compatibility Plugin surface, so a plugin cannot make an IP compatibility *claim* the Portal will validate, only run its own diagnostics privately.
- **Whether Gradle will ever add checksum verification to `JavaToolchainDownload` itself** is unresolved — its absence today is either a permanent design choice (Gradle trusts HTTPS + the resolver's own vetting) or a gap the team has not prioritized; nothing in the fetched docs states which.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Toolchain resolver plugins](https://docs.gradle.org/current/userguide/toolchain_plugins.html) | Gradle User Manual, primary | current (9.x) | `JavaToolchainResolver` registration shape, `toolchainManagement` DSL, auto-download/auto-detect properties |
| [JavaToolchainDownload javadoc](https://docs.gradle.org/current/javadoc/org/gradle/jvm/toolchain/JavaToolchainDownload.html) | Gradle Javadoc, primary | since 7.6, `@Incubating` | Confirms the type carries only a URI, no checksum field |
| [Shared build services](https://docs.gradle.org/current/userguide/build_services.html) | Gradle User Manual, primary | current (9.x) | `BuildService` lifecycle, parameters, cross-project sharing, configuration-cache serialization, IP registry restrictions |
| [Configuration Cache requirements](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html) | Gradle User Manual, primary | current (9.x) | `ValueSource`/`obtain()`/`ExecOperations` injection, why it is exempt from automatic cache-input detection |
| [Artifact Transforms](https://docs.gradle.org/current/userguide/artifact_transforms.html) | Gradle User Manual, primary | current (9.x) | Confirms transforms operate on already-resolved dependency artifacts, ruling the seat out for arbitrary binary download |
| [Isolated Projects](https://docs.gradle.org/current/userguide/isolated_projects.html) | Gradle User Manual, primary | current (9.x), incubating since 9.7.0 | The four constraint categories and their enforcement status, the shared-`BuildService` safety statement, diagnostics mode |
| [Gradle 9.7.0 release notes](https://docs.gradle.org/9.7.0/release-notes.html) | Gradle release notes, primary | 2026-08-06 | IP's experimental→incubating transition, `org.gradle.isolated-projects` vs the deprecated `unsafe` key, diagnostics/dangerously-ignore-problems flags |
| [Build Cache](https://docs.gradle.org/current/userguide/build_cache.html) | Gradle User Manual, primary | current (9.x) | `buildCache{}`/`remote<HttpBuildCache>`/`isPush` DSL, the CI-populates/developers-only-read recommendation, local-push-on/remote-push-off defaults |
| [Best Practices — General](https://docs.gradle.org/current/userguide/best_practices_general.html) | Gradle User Manual, primary | current (9.x) | "Do not use `gradle.properties` in subprojects," "Don't assume your plugin is applied after another," `./gradlew projects` usage |
| [gradle/gradle#847](https://github.com/gradle/gradle/issues/847) | GitHub issue thread, primary (project's own tracker) | filed 2016-11-12, open, last comment 2025-12-03 | Full root-cause discussion and every community workaround for duplicate-leaf-name conflict resolution |
| [Calling Java from Kotlin — nullability annotations](https://kotlinlang.org/docs/java-interop.html) | Kotlin docs, primary | current, JSpecify default since Kotlin 2.1 | Exact default report levels for `-Xjsr305` (warn) and `-Xjspecify-annotations` (strict) |
| [foojay-toolchains repository](https://github.com/gradle/foojay-toolchains) | Plugin's own repository, primary | current | Confirms the plugin's scope (JDK archives only: zip/tar/tgz) and absence of checksum configuration |
| `apache__kafka@940c100fab:settings.gradle` | Exemplar corpus, own measurement | measured 2026-09-12 | Fork-safe build-scan publish gate (`onlyIf { it.authenticated }`) and a disabled-rather-than-gated remote cache push |
| `testcontainers__testcontainers-java@a4d3a033d8:settings.gradle` | Exemplar corpus, own measurement | measured 2026-09-12 | The one corpus repo whose push-gate conjuncts a credential-presence check |
| `detekt__detekt@45672efb8b:settings.gradle.kts` | Exemplar corpus, own measurement | measured 2026-09-12 | The CI-only push-gate that is not fork-PR-safe by this file's stricter definition |
| `gradle__gradle@ea17004a31:settings.gradle.kts` | Exemplar corpus, own measurement | measured 2026-09-12 | The corpus's only `build-logic-settings` included-build split, context for where a provisioning Settings plugin's own build logic lives |
| Foojay adoption sweep across 8/32 corpus `settings.gradle*` files | Exemplar corpus, own measurement | measured 2026-09-12 | Confirms uniform `1.0.0` pin and zero checksum configuration across every adopter |
