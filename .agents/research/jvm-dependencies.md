---
title: "Dependencies — what version wins, and can you trust it"
topic: jvm-dependencies
model: opus
id_family:
  - GRADLE-DEP
  - MVN-DEP
consolidates:
  - jvm-dependencies/declaration-and-catalogs.md
  - jvm-dependencies/locking-verification-supply-chain.md
  - jvm-dependencies/maven-mediation-and-enforcer.md
date: 2026-09-12
---

# Dependencies — what version wins, and can you trust it

Consolidates the three `GRADLE-DEP` / `MVN-DEP` dives into the single artifact a
later author works from. Binding scope decisions come from
[jvm-topic-map.md](jvm-topic-map.md) (§ "Artifact set decision", rows M-C-01…13
and M-J-01…04); this file owns depth, resolved conflicts, and severities.

Every version-bearing claim is dated **2026-09-12** and tagged with the tool
version it was measured or read against. Corpus counts are over the 32 exemplar
repos at the SHAs in [jvm-frame.md](jvm-frame.md) § "Exemplar corpus as fetched".
Re-measurements marked **(this file)** were run today against
`/home/mherwig/dev/.tmp-jvm-exemplars/` and are new evidence the dives did not have.

## Verdict

1. **The api/implementation boundary is the highest-blast-radius decision in a
   published JVM library, and "my module compiles" is not evidence about it.**
   The failure lands on the *consumer's* `compileJava`, so the rule's
   verification cell is a bytecode-ABI check (DAGP `projectHealth`), never a
   local build. Binds: library, SDK.
2. **A version catalog is a request, never a pin.** Gradle's own docs:
   "Overwriting a version only affects what is imported and used when declaring
   dependencies. The actual resolved dependency version may differ due to
   conflict resolution"
   ([version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html)).
   Any artifact claiming "versions are pinned" on catalog evidence alone is
   wrong. Binds: all.
3. **Locking pins resolution; a platform does not.** Against
   [declaration-and-catalogs](jvm-dependencies/declaration-and-catalogs.md)'s
   candidate 5, platform alignment is **not** an acceptable substitute for
   locking: a platform constrains which versions are *allowed* for coordinates
   it names, and records nothing about what was actually resolved for the ones
   it does not. Locking is **MUST for the OCX SDK and the OCX Gradle plugin**
   (hard release boundary, reproducibility requirement), **SHOULD** for an
   adopter — and it is a new commitment, not a codified convention: **0/32
   exemplars lock** ([shape](jvm-audit/exemplar-build-shape.md) headline).
4. **Locking and verification are independent controls and neither is a
   supply-chain guarantee on its own.** Locking answers "did resolution change
   since last time"; verification answers "are these the publisher's bytes". A
   PR claiming "dependency locking prevents supply-chain attacks" is a category
   error — a malicious first resolution gets locked in exactly as faithfully as
   a good one.
5. **`enforcedPlatform()` is banned in anything consumed as a library and
   permitted in a leaf application or an internal, never-published platform.**
   The corpus's only user documents this split itself (see § Applied).
6. **`strictly` / `!!` is banned in a published library's own declarations and
   fine in a distribution, test, or build-logic catalog.** Re-measured today:
   3 `strictly(` call sites corpus-wide, all build-logic/CLI/compat; 98 `!!`
   catalog pins, all in gradle/gradle's *distribution*, *test* and *provided*
   catalogs. The measurement supports MUST-with-scope, not the SHOULD the dive
   hedged to.
7. **Maven resolves by nearest-definition-by-depth, not by highest version —
   and `dependencyManagement` is a different mechanism that runs first.** A
   reviewer or agent carrying Gradle/npm intuition into a Maven POM will
   misdiagnose every conflict and then "fix" it in a file that has no effect.
   Binds: any Maven consumer, including a Maven consumer of the Gradle-built SDK.
8. **`maven-enforcer-plugin` ships with zero rules active** (v3.6.3,
   2026-05-15). "We use enforcer" is meaningless without a bound
   `<execution><goal>enforce</goal>`. Prescribe it: `requireUpperBoundDeps` as
   the universal floor (cheap, real adoption base), `dependencyConvergence` only
   where multiple paths genuinely share a library (assertj's shape),
   `banDynamicVersions` + `banDuplicatePomDependencyVersions` always.
9. **Maven 4 is still RC.** Central shows `3.9.16` stable and `4.0.0-rc-6` as
   the top of the 4.0 line; no plain `4.0.0` exists (queried 2026-09-12). Maven
   4's `bom` packaging and consumer-POM flattening are migration-preview, not
   shippable mechanism. This settles the topic map's hedge and frame correction 1.
10. **The single highest-yield agent rule in this whole family is mechanical and
    carries no percentage**: resolve every proposed coordinate+version against
    the real repository before emitting the string. Rate-quoting the Sonatype
    hallucination research ages badly (7 %–25 %+ depending on model generation);
    the check is unconditional regardless of the rate.
11. **A Gradle-built, Maven-consumed SDK needs nothing Maven-specific beyond a
    complete POM with concrete versions.** The one real leak risk is an
    unresolved dynamic version reaching the published POM, which trips
    `banDynamicVersions` on the consumer's side. Binds: SDK.

## The ruleset

Severity reads: **MUST** = block, **SHOULD** = warn, **CONSIDER** = suggest —
matching the catalog convention in `rules/rust-quality.md:100-102`
([cfg](jvm-audit/config-inventory.md) Axis 1.1).

### GRADLE-DEP — editing `**/*.gradle.kts`, `**/*.gradle`, `**/settings.gradle{,.kts}`, `**/gradle/*.versions.toml`, `**/gradle.lockfile`, `**/gradle/verification-metadata.xml`

#### Caught by `./gradlew buildHealth` (dependency-analysis-gradle-plugin)

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-01 | Declare a dependency `api` when any of its types appears in a public superclass or interface, a public method parameter or return type (generics included), a public field, or a public annotation; declare it `implementation` otherwise. | Gradle's own ABI boundary; too narrow breaks the consumer's compile, too wide leaks classpath to every consumer. | `./gradlew :<module>:projectHealth` — **empty** wrong-configuration section = pass. Never `./gradlew build`: the leak does not fail the declaring module. | MUST | Gradle 9.x; `java-library` |
| GRADLE-DEP-02 | Never leave a dependency on `compileOnly` when it is reached at runtime through reflection, generated bytecode, or a `ServiceLoader`; use `implementation`/`runtimeOnly`. | `NoClassDefFoundError` in production, invisible to unit tests that share the compile classpath ([failb](jvm-topic-map/failure-build-and-deps.md) via map row M-C-02). | `./gradlew :<module>:dependencies --configuration runtimeClasspath` and confirm the coordinate is present; a `compileOnly`-only coordinate absent here is the finding. | MUST | Gradle 9.x |
| GRADLE-DEP-03 | Declare annotation processors on the `annotationProcessor` configuration (paired with `compileOnly` for the annotations), never on the compile classpath. | The two-configuration pattern is how Dagger/MapStruct/Lombok are declared today; a processor on the compile classpath is order-dependent and silently skippable (map row M-C-03). | `./gradlew :<module>:projectHealth` — no `unusedAnnotationProcessors` advice and no processor coordinate in `implementation`. | MUST | Gradle 9.x |
| GRADLE-DEP-04 | Wire `com.autonomousapps.dependency-analysis` (or `build-health`) and set at least one issue category to `severity("fail")`; run `fixDependencies` with `--upgrade` on any published module. | It is the only mechanism that catches wrong-configuration/unused-transitive before a consumer's build. `--upgrade` only adds or widens (`implementation`→`api`) and never removes — unrestricted `fixDependencies` can delete a dependency the *declaring* module does not use but a *consumer* reaches through a leaked transitive ([DAGP README](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc)). | `grep -rn 'autonomousapps' settings.gradle.kts build.gradle.kts build-logic/` — a hit plus a `severity("fail")` in the same block is the pass; presence with no `severity` left at the default `warn` is the finding. Then `grep -rn 'fixDependencies' .github/ *.sh` — a bare invocation on a published module is a finding. | SHOULD | DAGP 3.x |

#### Caught by a grep over build scripts and catalogs

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-05 | Never use `enforcedPlatform()` in a module that is published or consumed as a library; use `platform()`. `enforcedPlatform()` is acceptable only in a leaf application, a test/smoke-test configuration, or an internal platform that is never published. | The override is transitive and beats a consumer's own explicit version; the consumer's only defence is a per-dependency `exclude` ([platforms.html](https://docs.gradle.org/current/userguide/platforms.html)). | `grep -rn 'enforcedPlatform(' --include='*.gradle' --include='*.gradle.kts' .` then read each hit's module: a hit on `api(`/`implementation(` in a module that applies `maven-publish` is the finding; a hit in a test configuration or a module whose build file states it is internal is not. | MUST | Gradle 9.x |
| GRADLE-DEP-06 | Never use `strictly(...)` or the `!!` shorthand in a published library's own `api`/`implementation` declarations. Both are fine in an application, a distribution/test/provided catalog, a build-logic platform, or a CLI module. | A strict constraint from a library acts as a forced version for every consumer and can make an otherwise-resolvable graph unresolvable; it is also lossy through a published POM — only the strongest surviving declaration publishes and `reject` is dropped entirely ([dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html)). | `grep -rn 'strictly(\|[0-9]!!"' --include='*.gradle*' --include='*.versions.toml' .` then check the owning module: a hit inside a `maven-publish`-applying module's own dependency block is the finding. | MUST | Gradle 9.x |
| GRADLE-DEP-07 | Never declare a version range, a `+` suffix, `latest.release`/`latest.integration`, or a `-SNAPSHOT` coordinate in a build that produces a release artifact. | Not reproducible and not re-resolvable by a consumer months later; **Gradle has no built-in `banDynamicVersions` equivalent**, so the grep *is* the gate ([lint](jvm-topic-map/codified-lint-catalogue.md), map row M-C-12). | `grep -rnE ':[0-9][^"'"'"']*\.\+["'"'"']\|latest\.(release\|integration)\|-SNAPSHOT' --include='*.gradle*' --include='*.versions.toml' .` — **empty output is the pass**. Measured 0 hits corpus-wide **(this file)**, so any hit is a genuine outlier. | MUST | Gradle 9.x |
| GRADLE-DEP-08 | Never conclude "no version catalog" from a `**/gradle/libs.versions.toml` glob; detect a catalog by content. | The filename is not guaranteed: `apollographql/apollo-kotlin@c145295b72:settings.gradle.kts:26-29` names its file `gradle/libraries.toml`, and gradle/gradle wires three named catalogs programmatically from `build-logic-settings/settings.gradle.kts:17-27` — the tool that invented the feature is a false negative for a filename check. | `grep -rn 'versionCatalogs\s*{' --include='settings.gradle*' .` or `grep -rln 'alias(libs\.' --include='*.gradle*' .` — either hit proves a catalog exists regardless of filename. | MUST | Gradle 7.4+ |
| GRADLE-DEP-09 | Never state that versions are pinned on the strength of a version catalog. A catalog constrains declared requests only. | Gradle's own docs: the resolved version "may differ due to conflict resolution" ([version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html)). A transitive requesting a higher version wins silently, with no build failure and no diff in the TOML. | Before accepting a "pinned" claim, require a committed `*.lockfile` on disk (`find . -name 'gradle.lockfile' -o -name 'buildscript-gradle.lockfile'`). A catalog hit alone is not sufficient. | MUST | Gradle 7.4+ |

#### Caught by reading `settings.gradle{,.kts}`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-10 | Declare repositories once in `dependencyResolutionManagement` and set `repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)`. | One line closes the "a subproject silently adds its own repository" loophole, and it is the precondition that makes content filtering enforceable at all. Only **4/25** Gradle exemplars set it ([shape](jvm-audit/exemplar-build-shape.md) §2). | `grep -n 'FAIL_ON_PROJECT_REPOS' settings.gradle.kts` — a hit is the pass. Then `grep -rn '^\s*repositories\s*{' --include='build.gradle*' .` outside the root — hits are the finding. | SHOULD | Gradle 6.8+ |
| GRADLE-DEP-11 | Resolve every internally-owned group through `exclusiveContent { forRepository { … }; filter { includeGroup(…) } }`, not a bare `content { includeGroup(…) }`. | Non-exclusive filtering restricts what one repo is *asked* for; it does not stop another repo in the list from answering. The Jackson prefix-swap (`org.fasterxml.jackson.core` against the real `com.fasterxml.jackson.core`, attacker-owned `fasterxml.org` passing Central's domain-exact verification on its own terms) makes this a live attack, not a theoretical one ([aikido.dev](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware)). | `grep -rn 'exclusiveContent\|includeGroup' --include='settings.gradle*' --include='*.gradle*' .` — an `includeGroup` for an internal namespace without a wrapping `exclusiveContent` is the finding. Measured 3/32 use `exclusiveContent` at all (apollo-kotlin, detekt ×2) **(this file)**. | MUST *(when any non-public repository is declared)* | Gradle 6.2+ |

#### Caught by the lockfile on disk and its git history

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-12 | Enable `dependencyLocking { lockAllConfigurations() }` and commit the resulting `gradle.lockfile` (plus `buildscript-gradle.lockfile` where the buildscript classpath is locked). | Without it, "same commit, different day" can resolve a different graph. Once locked, Gradle enforces each locked version as if declared `strictly()`, so drift becomes a build failure instead of a silent upgrade ([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)). | `find . -name 'gradle.lockfile'` non-empty **and** `git ls-files --error-unmatch <path>` exits 0. New commitment: **0/32 exemplars** ([shape](jvm-audit/exemplar-build-shape.md), [pub](jvm-audit/exemplar-publishing-ci-bazel.md)) — ground any authored example synthetically, never cite a repo. | MUST *(OCX SDK, OCX Gradle plugin)* / SHOULD *(adopter)* | Gradle 4.8+; 9.x shapes |
| GRADLE-DEP-13 | Never lock a configuration that resolves a changing or `-SNAPSHOT` version. | Gradle's own docs call the combination "a misunderstanding of these features" that "can lead to unpredictable results". Dynamic versions (ranges) *are* lockable — changing coordinates are not. | On any module with locking enabled: `grep -n 'SNAPSHOT\|changing = true' build.gradle.kts` — a hit is a defect, not a style nit. | MUST *(given GRADLE-DEP-12)* | Gradle 4.8+ |
| GRADLE-DEP-14 | Run `--write-locks` only in a dedicated, gated lockfile-update job, never in the same job as the release or test build, and never infer success from the lockfile merely existing afterwards. | "Gradle won't write the lock state to disk if the build fails" — a `--write-locks && …` chain that fails downstream leaves a stale lockfile that looks fine ([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)). | Read the CI workflow: a `--write-locks` invocation inside the main build/release job is the finding. After any local `--write-locks`, check `git diff --stat -- '**/gradle.lockfile'` rather than the file's presence. | SHOULD | Gradle 4.8+ |

#### Caught by `gradle/verification-metadata.xml` and the CI workflow

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-15 | Bootstrap `gradle/verification-metadata.xml` with `./gradlew --write-verification-metadata sha256,pgp`, commit it, and require a human review of **every** regeneration diff. | The bootstrap "trusts whatever is currently in your repositories" — Gradle's own docs call this "a critical security limitation". The file is not the control; the reviewed diff is. A new hash for an existing coordinate+version is the signal. | File present **and** a branch-protection/CODEOWNERS rule covering `gradle/verification-metadata.xml`. Measured **1/32** (gradle/gradle: 1030 lines, `verify-metadata=false`, `verify-signatures=true`, 258 trusted keys) — cite it as "how the build tool's own maintainers do it", never as ecosystem practice. | MUST *(OCX SDK, OCX Gradle plugin)* / CONSIDER *(adopter)* | Gradle 6.2+ |
| GRADLE-DEP-16 | Count only `sha256`/`sha512` entries as verification, and key every `<trusted-key>` by its full 40-character PGP fingerprint. Never "fix" `checksum is missing from verification metadata` by disabling verification. | Gradle's docs: "only SHA-256 and SHA-512 are considered secure… SHA-1 has known collisions and MD5 should not be used." Signature verification proves "signed by a specific key", never "the signatory was legitimate" — the `<trusted-keys>` allowlist does the work; short key ids are rejected to limit collision attacks. The missing-checksum failure is the *transitive*-dependency trap, fixed by re-running the bootstrap, never by hand-editing the XML. | `grep -c '<sha256>\|<sha512>' gradle/verification-metadata.xml` nonzero per component; `grep -c '<md5>\|<sha1>'` with no sibling sha256/512 is the finding; every `trusted-key id="…"` must be 40 hex chars. | MUST *(given GRADLE-DEP-15)* | Gradle 6.2+ |
| GRADLE-DEP-17 | Validate the committed `gradle-wrapper.jar` checksum in CI via `gradle/actions/wrapper-validation`, unless `gradle/actions/setup-gradle@v4`+ (which validates automatically) is already present. | Free, zero-config, no false-positive risk, and it guards the one binary a JVM repo commits. `distributionSha256Sum` is set in only 12/21 wrapper files ([shape](jvm-audit/exemplar-build-shape.md) §1) and the standalone action is used by 1/32 ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 3). | `grep -rn 'wrapper-validation\|setup-gradle@v[4-9]' .github/workflows/` — either hit is the pass; both absent while `gradle/wrapper/gradle-wrapper.jar` is tracked is the finding. | MUST *(any repo committing a wrapper)* | `gradle/actions` v3+ |

#### Caught by the agent's own procedure

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| GRADLE-DEP-18 | Never emit a dependency version string that has not been observed to resolve against the real repository in this session. Resolve the candidate coordinate first; if resolution fails or was not run, do not state the version. | Sonatype checked ~37 000 unique package-version pairs (~258 000 AI upgrade recommendations) across Maven/npm/PyPI/NuGet and found non-existent versions at rates from ~7 % (2026 frontier models) to ~25 %+ (older models) ([sonatype.com](https://www.sonatype.com/resources/research/making-ai-work-safely)). Grounding the recommendation in a registry lookup is the measured mitigation. The rule quotes no rate because the rate moves; the check does not. | `./gradlew :<module>:dependencies --refresh-dependencies` with the candidate substituted, on a throwaway worktree — the coordinate must appear resolved, with no `FAILED` line. The commit or PR bumping a version links that run or its captured log. | MUST | any |

### MVN-DEP — editing `**/pom.xml`, `**/.mvn/**`, `**/mvnw*`

#### Caught by `mvn dependency:tree -Dverbose` / `mvn help:effective-pom`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-DEP-01 | Before explaining any Maven version pick by mediation, confirm no `dependencyManagement` entry matches — own POM first, then up the parent chain. | "Dependency management takes precedence over dependency mediation for transitive dependencies" — it is consulted *before* mediation runs, so a managed version never competes on depth. Conflating the two misdiagnoses the fix and edits the wrong POM ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)). | `mvn help:effective-pom` and read the effective `<dependencyManagement>` for the artifact: an entry there means mediation was never consulted. Note the match key is {groupId, artifactId, type, classifier} — a classifier/type mismatch silently fails to apply. | MUST | Maven 3.9.x |
| MVN-DEP-02 | Force a version by a direct declaration or by `dependencyManagement`, never by editing a deeper transitive's declared version. Maven mediates by **nearest definition by tree depth**, first-declared breaking ties — never by highest version. | Depth 0 always beats depth ≥1, so a direct declaration is the mechanical fix; a deeper edit has no effect. The docs' own example has `D:1.0` at depth 2 beating `D:2.0` at depth 3 ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)). | `mvn dependency:tree -Dverbose` — the omitted-for-conflict lines show why a version won. A resolved version at a *shallower* depth than the one expected means the tree is right and the explanation was wrong. | MUST | Maven 3.9.x |

#### Caught by `mvn validate` / `mvn enforcer:enforce`

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-DEP-03 | Bind `maven-enforcer-plugin` with an explicit `<execution><goals><goal>enforce</goal></goals></execution>`; never treat the plugin's presence — or a `<rules>` block with no execution — as enforcement. | The plugin ships 37 built-in rules and **zero active**; nothing runs until bound. When bound, the goal defaults to the `validate` phase, so failures are cheap ([usage.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/usage.html), [enforce-mojo.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/enforce-mojo.html)). | `grep -A6 'maven-enforcer-plugin' pom.xml` must show `<executions>` containing `<goal>enforce</goal>` within the same `<plugin>` block. A `<pluginManagement>`-only version pin is inert. | MUST | enforcer 3.6.3 (2026-05-15) |
| MVN-DEP-04 | Bind `banDynamicVersions` with its default all-`false` allow flags on any POM that is released. | A released artifact carrying a range, `LATEST`, `RELEASE`, or `-SNAPSHOT` is neither reproducible nor safely re-resolvable later. Note the range sharp edge: `2.0-rc1 < 2.0`, so `[1.0,2.0)` *includes* the release candidate ([pom.html](https://maven.apache.org/pom.html)). | `mvn enforcer:enforce -Drules=banDynamicVersions`. Fast local proxy: `grep -rE '<version>(\[\|\(\|.*-SNAPSHOT\|LATEST\|RELEASE)</version>' pom.xml`. | MUST | enforcer 3.6.3 |
| MVN-DEP-05 | Bind `banDuplicatePomDependencyVersions` (zero configuration) on every POM. | A dependency declared twice in one `<dependencies>` with matching groupId+artifactId+type+classifier is always a copy-paste or merge artifact; the rule has no configuration surface to get wrong and **0/32 exemplars enable it** despite that. | `mvn enforcer:enforce -Drules=banDuplicatePomDependencyVersions` — failure names the duplicated coordinate. | MUST | enforcer 3.6.3 |
| MVN-DEP-06 | Bind `requireUpperBoundDeps` on every reactor as the universal floor; add `dependencyConvergence` only where two or more paths genuinely reach the same library (logging façades, test libraries, protobuf/grpc runtimes). | Mediation has no floor check of its own: a shallow, stale direct pin beats a deeper edge that needs something newer. `requireUpperBoundDeps` catches exactly that and nothing else — far fewer false positives in a large reactor than full convergence, and it has a real adoption base (grpc-java's 8 example POMs) where convergence has one (assertj). | `mvn enforcer:enforce -Drules=requireUpperBoundDeps` — failure names one resolved version and one required floor. A `dependencyConvergence` failure instead names **two paths**: match the fix to the message shape, not to the more familiar rule name. | SHOULD | enforcer 3.6.3 |
| MVN-DEP-07 | Bind `requirePluginVersions` (sub-flags `banLatest`/`banRelease`/`banSnapshots`/`banTimestamps` all default `true`) rather than relying on manual `pluginManagement` discipline. | assertj and guava both pin every plugin version by hand — the practice is right, but manual discipline degrades under future edits with no build-time backstop, and **0/32 bind the rule that would enforce it**. | `mvn enforcer:enforce -Drules=requirePluginVersions` — failure names the unversioned plugin. | SHOULD | enforcer 3.6.3 |

#### Caught by a grep over the POM

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| MVN-DEP-08 | Never set `<systemPath>` without `<scope>system</scope>`, and prefer neither — `system` scope resolves from a local filesystem path and is explicitly not recommended. | Stated in the POM reference as a build error waiting to happen; it is also the one scope that makes a build machine-specific (map row M-J-04). | `grep -n -B4 '<systemPath>' pom.xml` — any hit without a sibling `<scope>system</scope>` is the finding; any hit at all is a review item. | MUST | Maven 3.9.x |
| MVN-DEP-09 | Before assuming a child POM's plugin `<configuration>` list *adds to* or *replaces* the parent's, check for `combine.children`/`combine.self` on that element. | The unannotated default is `merge` — neither append nor full override. A reviewer carrying Gradle collection-property intuition will miss a child that silently dropped half a parent's `<excludes>` list. `combine.children="append"` concatenates; `combine.self="override"` discards the parent; both set means `override` wins ([pom.html](https://maven.apache.org/pom.html)). | `grep -n 'combine\.' pom.xml` in the child **and every ancestor** POM; absence on a list-shaped element means positional/identity merge, not concatenation. | CONSIDER | Maven 3.9.x |
| MVN-DEP-10 | Ensure every `<version>` in a **published** POM is a concrete resolved string — no `+`, no range, no `LATEST`/`RELEASE`, no catalog placeholder. | Maven mediation and enforcer both operate purely on the flattened POM text. The one thing a Gradle build can leak into it is an unresolved dynamic version, which fails `banDynamicVersions` on the consumer side. This is the whole Maven-specific surface a Gradle-built, Maven-consumed SDK needs. | After publishing: `curl -s <repo>/<group>/<artifact>/<version>/<artifact>-<version>.pom \| grep -E '<version>(\+\|\[\|\(\|LATEST\|RELEASE)'` — **empty output is the pass**. | MUST *(OCX SDK)* | Maven 3.9.x |
| MVN-DEP-11 | Do not adopt Maven 4's `<packaging>bom</packaging>` or consumer-POM flattening (`maven.consumer.pom.flatten=true`) as a shipped mechanism; treat both as migration preview. | Central lists `3.9.16` as the newest stable `org.apache.maven:maven-core` and tops the 4.0 line out at `4.0.0-rc-6`; no plain `4.0.0` exists (queried 2026-09-12). Recommending an RC-only feature strands Maven 3.x consumers. `<packaging>bom</packaging>` is 0/32 in the corpus. | Re-run the Central query `https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json` and look for `"v":"4.0.0"` with no suffix — absence is "still RC"; presence is the trigger to revise this row. | MUST | Maven 4.0.0-rc-6 as of 2026-09-12 |

## Applied to the exemplars and the two future consumers

### Already satisfied

| Rule | Exemplar evidence |
|---|---|
| GRADLE-DEP-01 | `gradle/gradle@ea17004a31` — 2051 `api(` / 1620 `implementation(` across a 25-year codebase, a disciplined split ([shape](jvm-audit/exemplar-build-shape.md) §6). |
| GRADLE-DEP-04 | **2/32, re-measured (this file)**: `gradle__gradle@ea17004a31:build-logic/root-build/src/main/kotlin/gradlebuild.root-build.gradle.kts:25` applies `com.autonomousapps.dependency-analysis` with `issues { all { onDuplicateClassWarnings { severity("fail") } } }`; `detekt__detekt@45672efb8b:settings.gradle.kts:54` applies `com.autonomousapps.build-health` 3.19.1. |
| GRADLE-DEP-06 | **3/32 `strictly(` call sites, re-measured (this file)**, none in a published library's own declarations: `gradle__gradle@ea17004a31:build-logic-commons/build-platform/build.gradle.kts:17` (`strictly(embeddedKotlinVersion)`, build logic), `junit-team__junit-framework@35c56a8e02:gradle/plugins/common/src/main/kotlin/junitbuild.junit4-compatibility.gradle.kts:17` (`strictly("4.12")`, a compatibility source set), `detekt__detekt@45672efb8b:detekt-cli/build.gradle.kts:26` (a CLI). |
| GRADLE-DEP-07 | **0 hits corpus-wide (this file)** — no exemplar declares a range, `+`, `latest.release` or a release-build `-SNAPSHOT` in a Gradle file. This rule codifies practice rather than imposing it. |
| GRADLE-DEP-11 | 3/32 use `exclusiveContent` **(this file)**: `apollographql__apollo-kotlin@c145295b72:gradle/repositories.gradle.kts:11-17,51-54`, `detekt__detekt@45672efb8b:settings.gradle.kts:89-95,98-101`. |
| GRADLE-DEP-15/16 | `gradle__gradle@ea17004a31:gradle/verification-metadata.xml` — 1030 lines, `verify-metadata=false` / `verify-signatures=true`, 258 `<trusted-key>` entries ([shape](jvm-audit/exemplar-build-shape.md):374). |
| MVN-DEP-06 | `grpc__grpc-java@fc4314419d:examples/pom.xml:109-124` and 7 sibling `examples/example-*/pom.xml` bind `requireUpperBoundDeps` with defaults. `assertj__assertj@485502bad2:pom.xml:246-247` binds `dependencyConvergence` (+ `reactorModuleConvergence`) — the corpus's only convergence user. |
| MVN-DEP-07 *(practice, not the rule)* | `assertj__assertj@485502bad2:pom.xml` and `google__guava@5fb424c43a:pom.xml:169-330` pin every `pluginManagement` plugin version explicitly — 23 plugins/25 versions and 19/26 respectively ([shape](jvm-audit/exemplar-build-shape.md) §6) — without ever binding `requirePluginVersions`. |

### Violated

| Rule | Violation |
|---|---|
| GRADLE-DEP-12 | **32/32.** Not one exemplar locks. The single `gradle.lockfile` path in the corpus is a documentation snippet: `gradle__gradle@ea17004a31:platforms/documentation/docs/src/snippets/reference/dependency-management/dependency-management/dependencyLocking-lockingSingleFilePerProject/common/gradle.lockfile` ([pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 5). |
| GRADLE-DEP-15 | **31/32.** Only gradle/gradle carries a `verification-metadata.xml`. |
| GRADLE-DEP-10 | **21/25 Gradle repos.** Only nowinandroid, detekt, dagger and ktlint set `FAIL_ON_PROJECT_REPOS` ([shape](jvm-audit/exemplar-build-shape.md) §2) — including repos that have adopted a central catalog and still leave per-project repositories unconstrained. |
| GRADLE-DEP-17 | `gradle__gradle@ea17004a31`, `GradleUp__shadow@541b3be475`, `micronaut-projects__micronaut-core@d5842045bb`, `spring-projects__spring-boot@93b23c40c2`, `square__okhttp@dfcfab3824`, `apollographql__apollo-kotlin@c145295b72`, `grpc__grpc-java@fc4314419d`, `JetBrains__Exposed@4be9aee04c`, `google__dagger@4fbc045d2b` — 9 of 21 wrapper-bearing repos ship no `distributionSha256Sum`, and only `mockito__mockito@5a676bcd9e` runs the standalone wrapper-validation action ([shape](jvm-audit/exemplar-build-shape.md) §1, [pub](jvm-audit/exemplar-publishing-ci-bazel.md) Axis 3). |
| MVN-DEP-03/06 | `google__guava@5fb424c43a:pom.xml:169-186` binds enforcer through an `enforce-versions` execution whose `<rules>` are only `requireMavenVersion` (3.0.5) and `requireJavaVersion` (1.8.0) — enforcer is present and wired, and the entire drift class is unguarded. Repeated in `android/pom.xml`. |
| MVN-DEP-05 | **0/32.** `grep -rl banDuplicatePomDependencyVersions --include=pom.xml` across all 32 clones returns nothing ([maven-mediation-and-enforcer](jvm-dependencies/maven-mediation-and-enforcer.md) exemplar re-measurement). |
| MVN-DEP-07 | **0/32.** No exemplar binds `requirePluginVersions`. |
| MVN-DEP-11 *(inverted — nobody adopts it)* | 0/32 declare `<packaging>bom</packaging>` or a classifier-qualified BOM import, consistent with the RC status. |

### Corrections to the wave-1 measurement

**`spring-boot` is not a `enforcedPlatform()` violation, and the topic map, the
build-shape audit and both Gradle dives all repeat the same grep-without-reading
error.** The claim is that `spring-projects__spring-boot@93b23c40c2` is "the
corpus's only `enforcedPlatform()` user (13 hits) and it is a library, the exact
case the docs warn against" ([shape](jvm-audit/exemplar-build-shape.md) smell 4,
[jvm-topic-map.md](jvm-topic-map.md) row M-C-07,
[declaration-and-catalogs](jvm-dependencies/declaration-and-catalogs.md) §2,
[locking-verification-supply-chain](jvm-dependencies/locking-verification-supply-chain.md)
exemplar evidence). Reading all 13 hits **(this file)**:

- 5 are custom test configurations in one smoke test —
  `spring-projects__spring-boot@93b23c40c2:smoke-test/spring-boot-smoke-test-cache/build.gradle:44,47,50,54,58`.
- 5 more are `testImplementation`/`intTestImplementation`/`systemTestImplementation`
  in test, integration-test and system-test modules
  (`core/spring-boot-autoconfigure-processor/build.gradle:26`,
  `integration-test/spring-boot-sni-integration-tests/build.gradle:39`,
  `configuration-metadata/spring-boot-configuration-processor/build.gradle:41`,
  `system-test/spring-boot-deployment-system-tests/build.gradle:43`,
  `configuration-metadata/spring-boot-configuration-metadata-changelog-generator/build.gradle:31`).
- 2 are `implementation` in internal tooling / integration-test modules
  (`integration-test/spring-boot-configuration-processor-integration-tests/build.gradle:26`,
  `configuration-metadata/spring-boot-configuration-metadata-changelog-generator/build.gradle:28`).
- 1 is the only `api(enforcedPlatform(…))`, in
  `platform/spring-boot-internal-dependencies/build.gradle:254` — a platform
  whose next line reads, verbatim, `// Internal module so enforced platform
  dependencies are OK` (line 258).

**Zero hits land in a published, consumer-facing library module.** spring-boot
is a *positive* exemplar for GRADLE-DEP-05: it uses `enforcedPlatform()` exactly
where the rule permits it and annotates the one borderline case in the build
file. The corpus therefore contains **no** `enforcedPlatform()` violation, and
GRADLE-DEP-05's verification cell must say "read the owning module", not "grep
and flag" — a raw-count rule would flag the repo that gets this right.

### New commitments for the OCX SDK and the OCX Gradle plugin

| Commitment | Rules | Why it is new |
|---|---|---|
| Dependency locking, committed, updated only in a gated job | GRADLE-DEP-12, -13, -14 | 0/32 precedent. Justified for these two by a hard release boundary and the reproducibility requirement `ocx-sdk-python` already carries ([cfg](jvm-audit/config-inventory.md) Axis 3). Cost: every transitive change becomes a reviewed diff. |
| Dependency verification with `sha256,pgp` and a reviewed regeneration diff | GRADLE-DEP-15, -16 | 1/32 precedent, and that one is the build tool verifying its own build. The control is the CODEOWNERS rule, not the file. |
| DAGP wired with a failing issue category | GRADLE-DEP-04 | 2/32 precedent **(this file)**, and neither adopter fails on *all* categories. The SDK is the case where `api`/`implementation` correctness is load-bearing, so it adopts a stricter setting than either exemplar. |
| `exclusiveContent` around any OCX-internal coordinate | GRADLE-DEP-11 | 3/32 precedent, all for third-party repositories rather than internal namespaces. The moment the SDK or plugin resolves anything from a non-public repo, this is the control against the Jackson-shaped attack. |
| A concrete-version published POM verified after release | MVN-DEP-10 | The SDK is Gradle-built and Maven-consumed; this is the only Maven-specific obligation it inherits. Nothing else in `MVN-DEP` binds it as a publisher. |
| Every version bump grounded in a live resolution | GRADLE-DEP-18 | No exemplar precedent exists because no exemplar is written by an agent. This is the fleet-specific rule. |
| Sysexit-to-exception mapping around any `ocx` invocation the plugin makes | — *(routes to `GRADLE-PLUG`)* | Noted here only because dependency provisioning is what the OCX Gradle plugin does; the 14-sysexit table is `rules_ocx/AGENTS.md:161-178` ([cfg](jvm-audit/config-inventory.md) Axis 4, 7). |

## AI-agent failure modes

Ranked by how often it bites, each with the mechanical check.

1. **Emitting a version string from training data.** The headline failure for
   this whole family: a plausible-looking version that never existed, stated
   confidently. *Check:* GRADLE-DEP-18 — resolve it, or do not say it. Binary,
   no partial credit.
2. **Treating a version catalog as a lockfile.** Catalogs are the newer,
   better-documented idiom, so a model claims "versions are pinned via the
   catalog" when nothing constrains resolution. *Check:* require a `*.lockfile`
   on disk before accepting the claim (GRADLE-DEP-09).
3. **Accepting "the build passes" as evidence about `api`/`implementation`.**
   The leak compiles locally and fails at the consumer. *Check:* a
   `projectHealth`/`buildHealth` run in the same diff (GRADLE-DEP-01).
4. **Reading Maven mediation as highest-version-wins.** A Gradle/npm-trained
   model explains a Maven conflict backwards and then bumps a transitive that
   has no effect. *Check:* `mvn dependency:tree -Dverbose`; the shallower
   version is right and the explanation is wrong (MVN-DEP-02).
5. **Confusing `dependencyManagement` with mediation.** "Maven picked X because
   it's nearest" when a managed entry decided it before mediation ran. *Check:*
   `mvn help:effective-pom` and look for the entry first (MVN-DEP-01).
6. **Reaching for `enforcedPlatform()` when it means `platform()`.** One word
   apart; the stronger-sounding one changes the *transitivity* of the override.
   *Check:* grep, then **read the owning module** — the corpus's only user is a
   correct one, so a raw grep flags the wrong repo (GRADLE-DEP-05).
7. **Adding `<plugin><artifactId>maven-enforcer-plugin</artifactId>` with a
   `<rules>` block and no `<executions>`.** Compiles, reviews clean, runs
   nothing. *Check:* the nested `<goal>enforce</goal>` must be present
   (MVN-DEP-03).
8. **Stopping after `--write-verification-metadata`.** The command produces a
   file, not a control. *Check:* does the PR touching
   `verification-metadata.xml` carry a review on that specific diff
   (GRADLE-DEP-15).
9. **Claiming locking prevents supply-chain attacks.** Category error: locking
   prevents *drift*; a malicious version resolved once is locked in faithfully.
   *Check:* the two controls are separate rows and neither substitutes.
10. **Concluding "no version catalog" from the conventional filename.**
    apollo-kotlin and gradle/gradle both defeat it. *Check:* grep
    `versionCatalogs\s*{` in settings files (GRADLE-DEP-08).
11. **Proposing `dependencyConvergence` when the failure shape is an
    upper-bound violation.** The heavier rule generates far more noise in a
    large reactor. *Check:* read the message — convergence names two *paths*,
    upper-bound names one resolved version and one floor (MVN-DEP-06).
12. **Writing `!!` / `strictly` into a library "to be safe"**, carried over
    from application-shaped examples. *Check:* any hit inside a
    `maven-publish`-applying module's own dependency block (GRADLE-DEP-06).
13. **Treating Central namespace verification or a PGP signature as "safe to
    add".** Verification proves domain or SCM control at registration time,
    never artifact contents — exactly the gap the Jackson typosquat exploited.
    *Check:* cross-reference the proposed groupId against the project's actual
    published domain before accepting a lookalike prefix.
14. **Proposing per-module `repositories { }` blocks**, a pre-`dependencyResolutionManagement`
    idiom. *Check:* `grep -rn '^\s*repositories\s*{' --include='build.gradle*'`
    outside the root once centralization is adopted (GRADLE-DEP-10).
15. **Assuming Maven 4 features are shippable** because "Maven 4" reads as
    released in older training snapshots. *Check:* the Central query in
    MVN-DEP-11.

## Open questions

**Needs an owner decision**

- **Q-DEP-1 — Is locking a MUST for the OCX SDK and plugin, or a SHOULD for
  them too?** This file rules MUST, on a hard release boundary plus the
  `fail_under = 100` precedent from `ocx-sdk-python`. But the cost is real and
  the precedent is 0/32. If the owner wants the SDK to look like the ecosystem
  rather than ahead of it, this drops to SHOULD and GRADLE-DEP-14 goes with it.
- **Q-DEP-2 — Does `bundles/jvm-essentials` ship a `jvm-dependency-triage`
  skill?** The topic map's conflict 6 assigns the two skill slots to
  `jvm-release` and `jvm-dependency-triage`. Half of this family's content
  (conflict diagnosis, CVE response, BOM alignment) is procedural and would fit;
  the other half is editing-time standards that belong in the rule. The split
  point is an authoring decision, not a research one.
- **Q-DEP-3 — Which DAGP issue categories fail the build for the SDK?** The
  corpus's two adopters chose narrowly (gradle/gradle: duplicate-class warnings
  only). `onAny { severity("fail") }` is the maximal form the dive quotes. This
  file leaves the rule at "at least one category" and defers the exact set.

**Deserves another research round**

- **Subarea: `mavenLocal()` and repository hygiene beyond content filtering.**
  Question: *does the JVM rule set ban `mavenLocal()` outright, and at what
  severity, given 42 build files across the corpus declare it?* No dive covered
  it and Gradle's Best Practices page (which names it) was not fetched for this
  family, so no rule was written. It is the second-most-likely thing an agent
  adds to "fix" a resolution failure after a version bump, and it silently makes
  a build machine-dependent.
- **Subarea: Maven-side checksum and verification policy.** Question: *what is
  the Maven equivalent of `verification-metadata.xml`, and does the aether
  checksum-algorithm list weaken or strengthen a build?* The corpus's only
  checksum configuration is `assertj__assertj@485502bad2:.mvn/maven.config`,
  which sets `-Daether.checksums.algorithms=SHA-512,SHA-256,SHA-1,MD5
  -Daether.connector.smartChecksums=false` — enumerating two algorithms Gradle's
  own docs call insufficient, in the same list as two secure ones. Whether that
  is a hardening (checking more) or a weakening (accepting weaker) was not
  settled by any source read here, and `MVN-DEP` currently has **no
  supply-chain-integrity row at all** while `GRADLE-DEP` has three.
- **Subarea: dependency-update automation as a rule surface.** Question: *does
  the rule set say anything about Dependabot vs Renovate configuration, given
  13/32 each with zero overlap and an agent is the thing reviewing their PRs?*
  [pub](jvm-audit/exemplar-publishing-ci-bazel.md) headline 7 measured the
  split; no dive turned it into guidance, and GRADLE-DEP-18 (resolve before
  emitting) has an obvious interaction with a bot that proposes bumps
  automatically.

## Sub-artifacts

- [declaration-and-catalogs.md](jvm-dependencies/declaration-and-catalogs.md) —
  the api/implementation ABI contract and its verification, `platform()` vs
  `enforcedPlatform()`, rich versions and the `!!` shorthand, what a version
  catalog does and does not pin, and DAGP's advice model.
- [locking-verification-supply-chain.md](jvm-dependencies/locking-verification-supply-chain.md)
  — dependency locking commands and lockfile shapes, verification bootstrap and
  its documented trust limitation, repository content filtering, wrapper
  checksum validation, Central namespace verification's limits, the Jackson
  typosquat, and the AI-hallucinated-version research.
- [maven-mediation-and-enforcer.md](jvm-dependencies/maven-mediation-and-enforcer.md)
  — nearest-wins mediation, scope propagation, `dependencyManagement`
  precedence, `combine.children`/`combine.self`, the 37-rule enforcer catalogue
  with exact config for the five drift rules, the ASF parent POM's actual
  enforcement surface, Maven 4's GA status, and the Gradle/Maven/Bazel
  BOM-and-pinning equivalence table.

## Key sources

| URL | Why |
|---|---|
| [docs.gradle.org/current/userguide/java_library_plugin.html](https://docs.gradle.org/current/userguide/java_library_plugin.html) | The exact `api` / `implementation` / `compileOnlyApi` definitions (GRADLE-DEP-01). |
| [docs.gradle.org/current/userguide/platforms.html](https://docs.gradle.org/current/userguide/platforms.html) | `platform()` vs `enforcedPlatform()` and the verbatim library-author warning (GRADLE-DEP-05). |
| [docs.gradle.org/current/userguide/dependency_versions.html](https://docs.gradle.org/current/userguide/dependency_versions.html) | strictly/require/prefer/reject, the `!!` shorthand, and the lossy-publish statement (GRADLE-DEP-06). |
| [docs.gradle.org/current/userguide/version_catalogs.html](https://docs.gradle.org/current/userguide/version_catalogs.html) | The "declared, not resolved" sentence that GRADLE-DEP-09 rests on. |
| [docs.gradle.org/current/userguide/dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html) | Lock commands, lockfile shapes, lock modes, the `-SNAPSHOT` incompatibility, and "won't write the lock state if the build fails" (GRADLE-DEP-12…14). |
| [docs.gradle.org/current/userguide/dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html) | Bootstrap command, the "trusts whatever is currently in your repositories" limitation, the secure-hash list, the signature-vs-legitimacy distinction, the exact missing-checksum failure text (GRADLE-DEP-15, -16). |
| [docs.gradle.org/current/userguide/filtering_repository_content.html](https://docs.gradle.org/current/userguide/filtering_repository_content.html) | `exclusiveContent` vs `content { includeGroup }` (GRADLE-DEP-11). |
| [docs.gradle.org/current/userguide/best_practices_dependencies.html](https://docs.gradle.org/current/userguide/best_practices_dependencies.html) | Named catalog practices: centralize, name entries appropriately, avoid misuse. |
| [github.com/autonomousapps/dependency-analysis-gradle-plugin](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/blob/main/README.asciidoc) + [wiki/Home](https://github.com/autonomousapps/dependency-analysis-gradle-plugin/wiki/Home) | The four advice categories and the exact `fixDependencies --upgrade` semantics (GRADLE-DEP-04). |
| [github.com/gradle/actions/blob/main/wrapper-validation/README.md](https://github.com/gradle/actions/blob/main/wrapper-validation/README.md) | Current action name, and that `setup-gradle@v4`+ already validates (GRADLE-DEP-17). |
| [maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) | Nearest-wins mediation, scope propagation, `dependencyManagement` precedence (MVN-DEP-01, -02). |
| [maven.apache.org/pom.html](https://maven.apache.org/pom.html) | Scopes, `combine.children`/`combine.self`, version-range notation and the `2.0-rc1 < 2.0` edge (MVN-DEP-04, -09). |
| [maven.apache.org/enforcer/enforcer-rules/index.html](https://maven.apache.org/enforcer/enforcer-rules/index.html) + [usage.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/usage.html) | The 37-rule catalogue at v3.6.3 (2026-05-15) and the "nothing runs without an execution" statement (MVN-DEP-03…07). |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) + [search.maven.org maven-core query](https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json) | `bom` packaging and consumer-POM flattening, and the Central query that settles GA (MVN-DEP-11). |
| [aikido.dev/blog/maven-central-jackson-typosquatting-malware](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware) + [central.sonatype.org/faq/verify-ownership](https://central.sonatype.org/faq/verify-ownership/) | The dated, concrete attack that makes content filtering non-hypothetical, and the exact limits of namespace verification (GRADLE-DEP-11). |
| [sonatype.com/resources/research/making-ai-work-safely](https://www.sonatype.com/resources/research/making-ai-work-safely) | The ~37 000-pair hallucination measurement behind GRADLE-DEP-18 — cited for the mechanism, not the rate. |
| [github.com/bazel-contrib/rules_jvm_external](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | `version_conflict_policy`, `maven.install(boms=…)`, `maven_install.json` — the third column of the equivalence table, owned by the Bazel-Java depth file, not by these two families. |
