---
title: JVM expertise (Java, Kotlin, Gradle, Maven, Ant, Bazel-for-Java) — phase 0 frame
program: jvm
date: 2026-09-05
method: research-lang (two languages, three build systems, one build system's Java ruleset, and the SDK / plugin author's surface)
status: active
branch: cmake worktree (/home/mherwig/dev/grimoire-lore/.agents/worktrees/cmake) — the research lands on the `cmake` branch, not `main`
---

# JVM — the frame

Written before any worker was spawned. Everything below is a hypothesis the
grounding wave may overturn; corrections are appended at the bottom, never
edited into the body.

## The domain and its era

Two languages on one runtime, and the build tooling around them:

- **Java** as written in 2026: records, sealed hierarchies, pattern matching,
  virtual threads and structured concurrency, the FFM API, JSpecify nullness
  annotations, `--release`, JPMS as a packaging fact, `jlink`/`jpackage`,
  the 6-month cadence with 2-year LTS.
- **Kotlin/JVM** under the K2 compiler: coroutines and structured
  concurrency, explicit API mode, binary-compatibility validation, the
  Gradle Kotlin DSL as the default build language, KSP replacing kapt.
  Kotlin Multiplatform, Android and Compose are **out of scope** except
  where a build-logic exemplar happens to be Android (nowinandroid).
- **Gradle** (the requester's stated emphasis): the configuration cache,
  isolated projects, convention plugins in `build-logic/` vs `buildSrc`,
  version catalogs, toolchains and the foojay resolver, lazy task and
  property APIs, dependency verification and locking, the wrapper,
  `gradle/actions` in CI, build scans — and **plugin development** as its own
  discipline: `java-gradle-plugin`, TestKit, the Plugin Portal, compatibility
  matrices, configuration-cache and isolated-projects compliance.
- **Maven** as the still-dominant ecosystem format (POM, BOMs, enforcer,
  Central publishing via the Central Portal after the OSSRH sunset, Maven 4)
  and **Ant** as legacy to recognise and migrate, not to write.
- **Bazel for Java/Kotlin**: `rules_java` after Starlarkification,
  `rules_jvm_external` / `maven_install`, `rules_kotlin`, remote JDK
  toolchains, `java_binary` deploy jars, header compilation and strict deps,
  Error Prone under Bazel, coverage under Bazel — **as a complement to the
  Bazel program running concurrently on `main`**, whose topic map lists
  `rules_java`/`rules_kotlin` as explicitly out of its scope.
- **SDK development**: authoring a library other people depend on — API
  surface and evolution, binary compatibility gates (japicmp / revapi / BCV),
  nullness contracts, BOM publishing, JPMS metadata, `Automatic-Module-Name`,
  multi-release jars, shading vs relocation vs never-shade, Javadoc/Dokka,
  Central signing and provenance.
- **Fat / shadow jars** and the competing distribution shapes (application
  plugin distributions, `jlink` images, `jpackage`, Spring Boot's layered
  repackaging, container images via Jib, `java_binary` deploy jars).
- **Quality gates**: Error Prone, NullAway, Checkstyle, PMD, SpotBugs,
  detekt, ktlint, Spotless, SonarQube rules; JUnit 5/6, Kotest, Mockito,
  AssertJ, Testcontainers, JaCoCo and Kover; dependency analysis and
  vulnerability scanning; reproducible builds.

Era assumptions to **verify, not assume** (the recent-shifts scout owns these):
Java 25 is the current LTS (September 2025) with 26 shipped March 2026 and 27
due September 2026; Gradle 9.x with the configuration cache on by default and
Java 17 as the minimum runtime; Maven 4.0 GA; Kotlin 2.2/2.3 with K2; JUnit 6
(September 2025); Bazel 9 with `rules_java` fully external and
`--incompatible_autoload_externally` empty; the Central Portal as the only
publishing path since 2025-06-30; Shadow plugin under the `com.gradleup`
namespace; JSpecify 1.0 adopted by NullAway, Error Prone and Kotlin.

## The codebases that will adopt the output

Measured 2026-09-05 with `find /home/mherwig/dev -maxdepth 7` excluding
`node_modules`, `.git`, `target`:

**Zero Java or Kotlin exists in the fleet.** No `*.java`, `*.kt`, `*.kts`,
`pom.xml`, `build.gradle`, `build.xml`. The only JVM-adjacent artefacts are
`rules_ocx/MODULE.bazel` and two example modules (Bazel, not Java), and the
OCX mirror of the Bazel toolchain (`mirror-bazelbuild`).

This is the same situation the sibling Bazel program hit for C++, and it is
handled the same way: **grounding runs against an exemplar corpus of upstream
repositories, not the fleet.** The corpus is fetched by
`jvm-audit/scratch/fetch-exemplars.sh` as blob-less, depth-1 clones with a
sparse checkout of build and configuration files only (source blobs fetched
lazily on demand). Every audit records the commit SHA it measured, so every
number is re-runnable against that SHA.

The exemplar set is chosen for shape diversity, not popularity:

| Shape | Repos |
|---|---|
| Kotlin library, Gradle Kotlin DSL, publishes to Central | okhttp, kotlinx.coroutines, Exposed, ktor |
| Java library, Gradle, `build-logic` convention plugins | junit-framework, micronaut-core, spring-boot, mockito, testcontainers-java, assertj |
| Java library, Maven | guava, jackson-databind, error-prone, NullAway (Gradle, but a lint tool) |
| Gradle plugin as the product | shadow, detekt, sqldelight, apollo-kotlin, spotless, ktlint, gradle/actions |
| Gradle itself and its build-logic | gradle/gradle |
| Groovy-DSL holdouts and mixed builds | apache/kafka, testcontainers-java |
| Convention-plugin exemplar (Android) | android/nowinandroid |
| Java under Bazel, or Gradle + Bazel dual | dagger, grpc-java, bazelbuild/bazel |
| Bazel Java/Kotlin rulesets themselves | rules_java, rules_jvm_external, rules_kotlin |
| Maven builds Maven; Ant builds Ant | apache/maven, apache/ant |

The two **future** fleet consumers the request implies, and which the
artifacts must serve on day one:

1. **An OCX SDK for the JVM** — the analogue of `ocx-sdk-python` ("typed
   handles over ocx, wrapping the CLI one command at a time"): a published
   library with a public API, a CLI-subprocess boundary, a strict test and
   coverage gate, and Central publishing. Java-first with Kotlin-friendly
   API, or Kotlin-first with Java interop, is an owner decision the API
   design topic must frame.
2. **An OCX Gradle plugin** — the analogue of `rules_ocx` (Bazel) and
   `setup-ocx` (GitHub Actions): provisioning tools and toolchains through
   OCX from a Gradle build. This is why "Gradle plugin development" is in the
   brief; it is a product, not a curiosity.

The third audience is any adopter of the lore catalog with a JVM codebase,
which is why the artifacts publish rather than living in one repo.

## Existing AI config that already touches this domain

None governs Java, Kotlin, Gradle or Maven. The sibling lore sets whose
globs and rules a JVM set must not silently duplicate: `rust-cargo`
(`**/Cargo.toml`), `python-packaging` (`**/pyproject.toml`, `**/uv.lock`),
`typescript-packaging` (`**/package.json`, `**/tsconfig*.json`, lint
configs), `docs-quality` (READMEs, changelogs, docs sites — its tested-example
harness table has a per-language row the Java/Kotlin entries would extend),
and the in-flight `bazel-quality` (`**/BUILD.bazel`, `**/*.bzl`,
`**/MODULE.bazel`, rc files — see `../../../.agents/research/bazel-topic-map.md`
on `main`, section "Artifact set decision"). Rule ID prefixes in use:
bare families (`ARCH-`, `SEC-`, `TEST-`…) for Rust, `PY-`, `TS-`, `DOC-`,
`CSS-`, `BZL-` reserved. **`JAVA-`, `KT-`, `GRADLE-`, `MVN-` are free.**

## The requester's hypotheses (to test, not to assume)

1. Modern Gradle deserves more depth than Maven, and Ant is legacy.
2. Shadow / fat jars are a best-practice topic in their own right.
3. Gradle plugin development has enough distinct failure modes to be its own
   artifact rather than a section.
4. Linting and test-suite / coverage configuration are among the most
   prominent topics.
5. Bazel-for-Java is a complement to the Bazel program: it fills the
   `rules_java` / `rules_kotlin` gap that program declared out of scope.
6. SDK development and dependency management are load-bearing for the future
   OCX SDK.

Contradictions worth chasing: fat jars may be an anti-pattern for libraries
and a second-best for applications (jlink, jpackage, layered images);
Maven may still be the format an SDK must be *consumable* from even when it
is not the build; Kotlin may need its own rule rather than a section of a
Java one; and the Bazel-Java depth file may belong to the sibling
`bazel-quality` set rather than to this one.

## Artifact set (what this program must converge to)

Hypothesis, decided by the map after the scouts report:

| Artifact | Glob | Why this carrier |
|---|---|---|
| `rules/java-quality.md` + `rules/java-quality/` | `**/*.java` | Index of non-negotiables + task-worded routing; depth files hold the tables |
| `rules/kotlin-quality.md` + `rules/kotlin-quality/` | `**/*.kt` | Different glob, different idioms; shared JVM rows are duplicated *bounded* (the MUST list), never the depth. Open: one `jvm-quality` instead? |
| `rules/gradle-build.md` + `rules/gradle-build/` | `**/*.gradle.kts`, `**/*.gradle`, `**/settings.gradle{,.kts}`, `**/gradle.properties`, `**/gradle/libs.versions.toml`, `**/gradle/wrapper/gradle-wrapper.properties`, `**/gradle/verification-metadata.xml` | Every name is one the build system requires — a safe narrow glob. Plugin authoring, dependency management, fat-jar and distribution rules live here |
| Maven and Ant | `**/pom.xml`, `**/.mvn/**`, `**/build.xml` | Either extra globs on the same rule (`jvm-build`) or a thin `maven-build` sibling — the map decides on measured overlap |
| Bazel-for-Java | none of ours | Ships as a `java.md` depth-file candidate with a `BZL-JAVA` family for the sibling `bazel-quality/` support directory. Two rules globbing `BUILD.bazel` would double-load |
| Skills | — | At most two, procedures only: candidates are `gradle-plugin-dev` (scaffold → TestKit matrix → publish), `jvm-dependency-triage` (conflict / CVE / BOM alignment), `jvm-release` (Central publishing runbook). The map picks |
| `bundles/jvm-essentials.toml` | — | Members carry no tag |
| `docs/jvm-*.md`, `assets/lore-java.svg` (+ `glyphs/java.svg`) | — | Description companions; no JVM mark exists yet |

Not shipping: a linter, a formatter, or a Gradle plugin. The gate is the
existing tools' configuration, stated in one line each.

## Corpus namespace

`jvm-` throughout: `jvm-frame.md`, `jvm-topic-map.md`,
`jvm-topic-map/<scout>.md`, `jvm-audit/<axis>.md`, `jvm-<topic>.md`,
`jvm-<topic>/<worker>.md`. The exemplar fetch script and any measurement
scripts live in `jvm-audit/scratch/`; the clones themselves do not (scratchpad
only, SHAs recorded).

## Budget and sequencing

Two research programs share the account tonight (Bazel on `main`, this one).
Measured earlier today: ~3M subagent tokens per hour is the ceiling before
the session limit trips. So: waves of ≤ 12 workers, sonnet for every reader,
opus for the map and the consolidations, cross-cutting decision agents first
in each wave, and `resumeFromRunId` on any partial failure.

## Corrections

(Appended by the orchestrator as the grounding wave lands. Nothing above is
edited.)

## Exemplar corpus as fetched

Fetched 2026-09-05 22:58 CEST by `jvm-audit/scratch/fetch-exemplars.sh` into the session scratchpad (`/tmp/claude-1000/-home-mherwig-dev-grimoire-lore--agents-worktrees-cmake/0338694a-012b-46c4-935e-41953f5c1ce2/scratchpad/exemplars/<owner>__<repo>`). Blob-less depth-1 clones: `git ls-tree -r --name-only HEAD` lists every tracked path, the sparse checkout materialises build and config files only, and `git show HEAD:<path>` fetches any other blob on demand. Table generated by `jvm-audit/scratch/exemplar-table.sh`:

| repo | sha | build systems | gradle dsl | build-logic | checked-out files |
|---|---|---|---|---|---|
| android/nowinandroid | `12f80da651` | gradle | kts=39 groovy=0 | build-logic catalog | 141 |
| apache/ant | `8c96cd6869` | maven ant | kts=0 groovy=0 |  | 40 |
| apache/kafka | `940c100fab` | gradle maven | kts=0 groovy=9 |  | 229 |
| apache/maven | `ea4a417bd2` | maven | kts=0 groovy=0 |  | 138 |
| apollographql/apollo-kotlin | `c145295b72` | gradle | kts=211 groovy=3 | build-logic | 949 |
| assertj/assertj | `485502bad2` | maven | kts=0 groovy=0 |  | 40 |
| bazelbuild/bazel | `948b8c70e2` | gradle maven bazel ant | kts=0 groovy=15 |  | 4376 |
| bazelbuild/rules_java | `4206909b6d` | bazel | kts=0 groovy=0 |  | 189 |
| bazelbuild/rules_kotlin | `7c51dd1210` | gradle bazel | kts=0 groovy=1 |  | 179 |
| bazel-contrib/rules_jvm_external | `449754dcbb` | bazel | kts=0 groovy=0 | catalog | 236 |
| cashapp/sqldelight | `4580923af3` | gradle | kts=6 groovy=226 | catalog | 167 |
| detekt/detekt | `45672efb8b` | gradle | kts=50 groovy=2 | build-logic catalog | 661 |
| diffplug/spotless | `dc2a4cb9a3` | gradle | kts=0 groovy=17 | catalog | 43 |
| FasterXML/jackson-databind | `a906e1782b` | maven | kts=0 groovy=0 |  | 45 |
| google/dagger | `4fbc045d2b` | gradle maven bazel | kts=22 groovy=72 | buildSrc catalog | 1408 |
| google/error-prone | `c1f99ad5d3` | maven bazel | kts=0 groovy=0 |  | 29 |
| google/guava | `5fb424c43a` | gradle maven | kts=2 groovy=0 |  | 46 |
| gradle/actions | `a27deee331` | gradle | kts=6 groovy=19 | catalog | 127 |
| gradle/gradle | `ea17004a31` | gradle maven ant | kts=2435 groovy=2357 | build-logic catalog | 841 |
| GradleUp/shadow | `541b3be475` | gradle | kts=4 groovy=0 | catalog | 27 |
| grpc/grpc-java | `fc4314419d` | gradle maven bazel | kts=0 groovy=89 | buildSrc catalog | 225 |
| JetBrains/Exposed | `4be9aee04c` | gradle maven | kts=58 groovy=1 | buildSrc catalog | 192 |
| junit-team/junit-framework | `35c56a8e02` | gradle maven ant | kts=77 groovy=0 | gradle/plugins catalog | 252 |
| Kotlin/kotlinx.coroutines | `f63a04bacb` | gradle | kts=43 groovy=0 | buildSrc | 142 |
| ktorio/ktor | `f92fad0435` | gradle | kts=168 groovy=0 | build-logic catalog | 647 |
| micronaut-projects/micronaut-core | `d5842045bb` | gradle | kts=75 groovy=14 | buildSrc catalog | 152 |
| mockito/mockito | `5a676bcd9e` | gradle | kts=43 groovy=1 | buildSrc catalog | 76 |
| pinterest/ktlint | `4c933394a3` | gradle | kts=25 groovy=0 | build-logic catalog | 104 |
| spring-projects/spring-boot | `93b23c40c2` | gradle maven ant | kts=54 groovy=736 | buildSrc gradle/plugins | 792 |
| square/okhttp | `dfcfab3824` | gradle maven | kts=44 groovy=0 | build-logic catalog | 97 |
| testcontainers/testcontainers-java | `a4d3a033d8` | gradle | kts=1 groovy=98 | buildSrc | 167 |
| uber/NullAway | `519a1bb826` | gradle | kts=1 groovy=34 | buildSrc catalog | 66 |

## Corrections after wave 1 (2026-09-05, 23:35 CEST)

From the four audits and nine scouts (13 of 13 workers returned, 423 raw
candidates, 2.3M subagent tokens in 24 minutes). Source keys:
`jvm-audit/config-inventory.md` (cfg), `exemplar-build-shape.md` (shape),
`exemplar-quality-gates.md` (gates), `exemplar-publishing-ci-bazel.md` (pub),
`jvm-topic-map/recent-shifts.md` (shift).

1. **Maven 4.0 GA is not confirmed.** Latest verified is 4.0.0-rc-6 (shift).
   Treat Maven 4 as "release candidate" until a worker cites the GA note.
2. **Era otherwise holds, one release earlier than stated.** Java 25 LTS
   (2025-09-16), Java 26 (2026-03-17), Java 27 GA fixed 2026-09-15; JEPs
   483/491/493 shipped in JDK 24, not 25. Kotlin 2.4.0 (2026-06) ends K1
   outright; KSP2 default; Dokka 2.x K2-stable. Gradle 9.x: daemon floor
   Java 17, Kotlin 2.2/K2, Groovy 4, JSpecify on its own API. **The
   configuration cache is "preferred with fallback" in 9.x, not forced on**;
   isolated projects reached incubating only in 9.7.0. The stabilised key is
   `org.gradle.isolated-projects`, never `org.gradle.unsafe.isolated-projects`
   (0/32 use the old key; 5/32 the new) (shape, shift).
3. **JUnit 6 is shipped but not the corpus baseline.** 4/32 reference it;
   gradle/gradle pins 5.12.2 (gates). Rules must state the JUnit 5 → 6 floor
   explicitly, not assume 6.
4. **JSpecify adoption is overstated.** Declared in 9/32; NullAway's JSpecify
   mode in 2/32; jsr305 (13) and checker-framework (8) remain more common
   (gates). JSpecify is the direction, not the installed base.
5. **PMD is not a peer tool.** Enforced in 0/32 exemplars (gates). Error Prone
   (+ NullAway), Checkstyle, SpotBugs, Spotless, detekt and ktlint are the
   gate-of-record candidates.
6. **Fat jars are an executable-distribution topic, not a library topic.**
   Every shaded artifact in the corpus is a CLI, a javac plugin or a vendoring
   step; no consumable library shades (pub). Hypothesis 2 is reshaped, not
   refuted.
7. **Dependency locking and verification are unpractised**, even in Gradle-9
   repos: 0/32 lockfiles, 1/32 `verification-metadata.xml` (gradle/gradle),
   2/32 reproducible-archive settings (shape, pub). BOM/platform alignment is
   the practised half of "dependency management"; locking is a new commitment
   the rules would impose, not a convention they would codify.
8. **Coverage floors are rare**: 3/32 enforce any numeric minimum; the
   strictest is a Maven repo (assertj) (gates). Hypothesis 4 holds for lint,
   not for coverage.
9. **error-prone is Maven-built, only Bazel-consumed** (pub). The genuine
   Bazel-Java exemplars are dagger, grpc-java and bazelbuild/bazel; neither
   dual-build repo documents why it carries two systems (shape).
10. **Bytecode target lags the toolchain**: guava and grpc-java still ship
    Java 8 bytecode from their main build while building on modern JDKs
    (shape). Rules must separate toolchain floor from `--release` target.
11. **The sibling Bazel set treats its 12 depth files as closed** (cfg).
    Handing over `java.md` reopens a decision; the map must say how.
12. **Nothing in the catalog mentions the JVM** (0 hits across rules/ and
    skills/), so the duplication worry in the frame is moot; the house
    conventions to match are structural (index + depth, task-worded routing,
    language-prefixed ID families, verification cells that say what empty
    output means) (cfg).
13. Wave 1 ran 13 workers, one over the frame's ≤ 12; no session limit was hit.

14. 2026-09-06: exemplar clones moved from the session scratchpad to `/home/mherwig/dev/.tmp-jvm-exemplars/<owner>__<repo>` (tmpfs full). Same SHAs; the frame table stands.

## Corrections after wave 2 (2026-09-12)

From the six wave-2 consolidations, harvested into `jvm-topic-map.md` › "Wave 2 landed". Wave 3 is on hold by owner instruction; its revised briefs sit in `jvm-topic-map/scratch/wave3-briefs.json`.

1. 26. 'No consumable library shades' has a counterexample — kafka-clients ships shaded under primary coordinates (apache__kafka@940c100fab:build.gradle:2089-2100 with archiveClassifier = null, and :401-420 publishing components.shadow as the mavenJava publication). Corrects frame correction 11 and the measurement behind map conflict 1; DIST-02 survives as a MUST with three conjunctive carve-out conditions.
2. 27. `com.gradle.plugin-publish` does NOT auto-apply `com.gradleup.shadow` — it auto-publishes the shadow jar as the main artifact only if the module applies Shadow itself; GradleUp__shadow@541b3be475:build.gradle.kts applies plugin-publish and neither shades nor relocates, because Gradle isolates each `plugins { id(...) }` plugin into its own classloader. Corrects map conflict 1's plugin clause. NOTE FOR THE AUTHORING PASS: jvm-distribution.md verdict 4 still states the old version; jvm-gradle-plugin-dev.md conflict A wins on evidence rank (primary doc plus measurement beats a paraphrase of the map).
3. 28. google/error-prone does not relocate packages when shading — core/pom.xml has artifactSet/shadedClassifierName/createDependencyReducedPom and no <relocations> block; the repo's one <relocation> is a <distributionManagement> artifact-move notice in type_annotations/pom.xml:31-34. Corrects M-G-04 and the pub audit's Axis-2 count; it ships as a grep trap in DIST-11 instead.
4. 29. Maven 4.0.0 is still release-candidate as of 2026-09-12 — Central's index gives maven-core 3.9.16 stable and 4.0.0-rc-6 as the top of the 4.0 line, with no plain 4.0.0. Confirms frame correction 2 and closes map conflict 19, M-A-07 and M-J-13; bom packaging and consumer-POM flattening are migration-preview, not shippable mechanism.
5. 30. Error Prone's StringCaseLocaleUsage is an ENABLED_WARNINGS member (BuiltInCheckerSuppliers.java:1177, inside the 918-1236 range), not a DISABLED_CHECKS member — the action is `-Xep:StringCaseLocaleUsage:ERROR`, a severity bump, not an activation. A rule saying 'enable it' asks an agent to do nothing. Corrects M-R-01.
6. 31. gradle/gradle's binary-compatibility checker IS japicmp — JapicmpTaskWithKotlin extends me.champeau.gradle.japicmp.JapicmpTask; the bespoke part is the ViolationRule layer plus the reviewed accepted-public-api-changes.json allowlist, which is the shape to copy, not an alternative tool. Corrects the gates audit's filename inference.
7. 32. abiValidation{} is 2/32, not 0/32 — pinterest__ktlint@4c933394a3:build-logic/src/main/kotlin/KotlinCommonPlugin.kt:38-39 and detekt__detekt@45672efb8b:build-logic/src/main/kotlin/public-api.gradle.kts:13-14 both call it under @OptIn(ExperimentalAbiValidation::class). KT-API-03 becomes 'run exactly one', not a prohibition.
8. 33. spring-boot is NOT an enforcedPlatform() violator — of 13 hits, 5 are smoke-test configurations, 5 are test/intTest/systemTest, 2 are internal tooling modules, and the single api(enforcedPlatform(...)) sits at platform/spring-boot-internal-dependencies/build.gradle:254 whose line 258 reads '// Internal module so enforced platform dependencies are OK'. Zero violations exist in the corpus; GRADLE-DEP-05's verification must say 'read the owning module', not 'grep and flag', because a raw-count rule flags the repo that gets it right. Corrects M-C-07's framing.
9. 34. The Sonatype hallucination figure is a 7%-25%+ range by model generation, not a flat 28% — the number is removed from GRADLE-DEP-18 entirely and the rule cites the mechanism (resolve every coordinate against the real repository before emitting it), because a frontier-model agent reading a stale rate discounts the rule and the check is unconditional regardless. Corrects frame correction 25.
10. 35. Coverage: 3/32 DECLARE a numeric floor; exactly 1/32 (assertj) enforces one unconditionally — junit-framework disables its floor under predictive test selection and kotlinx.coroutines gates Kover behind -Pkover.enabled=true, so a bare ./gradlew check in either checks no coverage at all. Sharpens frame correction 13 and splits M-S-02 into a presence check and a read-the-enclosing-conditional check.
11. 36. A green Gradle 9 build is not a cached build — maven-publish with an explicit credentials {} block silently DISABLES the configuration cache for that task rather than failing (gradle/gradle#24040). The pass signal is the literal line 'Reusing configuration cache.' on a second identical invocation.
12. 37. junit-platform.properties keys carry the junit.jupiter. prefix — both wave-1 audits printed the suffix form (execution.parallel.enabled); verified verbatim against micronaut-core@d5842045bb and mockito@5a676bcd9e. A grep written from those tables matches nothing.
13. 38. Maven Surefire: 3.6.0-M1 (2026-06-02) is the newest artifact on Central and 3.5.6 the newest GA line, while the plugin's own doc-site header reads 'Version: 3.6.0, Last Published: 2026-08-31'. Extends frame correction 20 with the GA line and generalises into a method rule: query the registry, never the vendor banner.
14. 39. Isolated Projects cannot yet enforce what it forbids — Gradle's own 9.7.0 docs mark two of four constraint categories (cross-build access, build-to-project access) 'not fully enforced yet', and org.gradle.unsafe.isolated-projects is formally deprecated in 9.7.0 rather than merely stale. 5/32 adoption of the live property is not adoption of a gate.
15. 40. Gradle documents that a BuildServiceProvider cannot drive a ValueSource's parameters at configuration time — this fixes the ValueSource-vs-BuildService question as a one-way dependency (ValueSource reads, BuildService holds), not a stylistic choice, and it closes the cell config-inventory Axis 4 left open for the OCX Gradle plugin.
16. 41. The version-catalog accessor gap in precompiled script plugins is architectural, not unprioritised — gradle/gradle#15383 is open since 2020-12-01 with a maintainer stating precompiled plugins are compiled before the consuming catalog is known, and there is NO workaround at all, supported or unsupported, for alias(libs.plugins.x) inside a precompiled script plugin's plugins {} block. The rule therefore names the replacement code (VersionCatalogsExtension) and bans org.gradle.accessors.dm.LibrariesForLibs outright.

## Corrections after wave 3 (2026-09-12)

From the seven wave-3 consolidations and the convergence pass (`jvm-topic-map.md` › "Wave 3 landed"). Verdict: needs-another-round, a narrow wave 4 of six dives that opens no family.

1. 42. A preview-dependent class file is pinned to the exact JDK feature release that compiled it (JEP 12, minor_version all-16-bits-set) — a jar built with --enable-preview on JDK 26 will not load on JDK 27 even with the flag re-passed. Replaces map conflict 15's maturity argument with a technical constraint (conc).
2. 43. JEP 491 quotes JCIP §13.4 for defaulting to `synchronized` on JDK 24+ and says migrated code need not be reverted; the unconditional 'migrate to ReentrantLock to avoid pinning' formulation is wrong above 24 (conc).
3. 44. jackson-core made a lock-free BufferRecyclerPool the default in 2.17.0 and reverted it in 2.17.1, deprecating the pool in 2.18.0 — the flagship tried the blanket ThreadLocal swap in production and backed it out (conc).
4. 45. detekt's four coroutine-correctness rules ship active:false; 1/32 activates any (detekt itself, GlobalCoroutineUsage only) and 0/32 activate SuspendFunSwallowedCancellation or SuspendFunInFinallySection. 'detekt is configured' is not 'these checks run' (conc).
5. 46. The JVM has no killpg — destroy()/destroyForcibly() reach only the immediate child, so a forking CLI needs an explicit descendants() walk; on Windows destroy() is already TerminateProcess, so the grace window is POSIX-only (conc).
6. 47. java.net.http ships zero JSON support — BodyHandlers return only String/InputStream/Path. The hand-rolled reader is the only option the JDK leaves, not a corner being cut (conc).
7. 48. Gradle documents gradle.sharedServices.registerIfAbsent(...) as 'safe with Isolated Projects' — the reverse of the wave-2 brief's assumption that a Settings-plugin BuildService is IP-hostile. Bounded: two of IP's four constraint categories are still unenforced at 9.7.0 (settings).
8. 49. JavaToolchainDownload carries only a bare URI — there is no checksum field anywhere in the toolchain-resolver contract, and foojay (8/32) exposes no hash setting. Gradle's sanctioned toolchain seat never enforces a hash (settings).
9. 50. A subproject gradle.properties is 17/32 and zero are violations — every non-root file carrying an org.gradle.* key is a build root, and nowinandroid's cites gradle/gradle#2534 as the reason it must exist. The naive `find -mindepth 2` check flags 17 correct repos (settings).
10. 51. Duplicate subproject leaf names collide only under a uniform explicit `group` — Gradle's default group is the dotted parent path (Project.java:393-394). 3/32 carry duplicates; nowinandroid's are correct (settings).
11. 52. build-logic-settings splits are 3/32, not 1/32 — ktor's build-settings-logic is the cleanest instance and the copy-target, and junit-framework is a partial split, correcting jvm-gradle-core.md verdict 7 (settings).
12. 53. Shadow's shadow-configuration to RUNTIME-scope POM mapping dates to 1.1.0 (2014-08-26); kafka's hand-rolled pom.withXml avoids the coupled manifest Class-Path write (shadow#324), not a POM defect. GRADLE-DIST-13's rule survives, its rationale is wrong (pub).
13. 54. The Central Portal has no OIDC / trusted-publishing path in the guide, requirements, Publisher API or registration pages fetched 2026-09-12 — withdraws config-inventory Axis 3's assertion; a Portal token in CI secrets is the only documented path (pub).
14. 55. Error Prone is 11/32 and SpotBugs-as-a-gate is 2/32, not 13/32 and 3/32 — kafka's and maven's hits are error_prone_annotations exclusions with no plugin applied, and assertj's SpotBugs block is <reporting>-only with no workflow running mvn site or spotbugs:check. Every downstream N/32 claim inherits the correction (safety).
15. 56. Core SpotBugs has zero detectors for XXE, command injection or path traversal — total, not partial, for three of six JAVA-SEC shapes — but CORRECTNESS+MT_CORRECTNESS independently earns a slot for UL_UNRELEASED_LOCK and the annotation-free NP_* family. JAVA-LINT-10 is amended, not replaced (safety).
16. 57. fail_if_repin_required defaults to False (coursier.bzl:1683): a stale or hand-corrupted maven_install.json prints a warning and the build continues. Both lock-file self-checks are advisory until the flag is set — the opposite shape from crate_universe's unconditional gate (bazel).
17. 58. name_deploy.jar is an implicit output 'only built if explicitly requested' — a green `bazel build //...` never builds the shipped artifact. 5/32 declare java_binary(; 1/32 names a _deploy.jar path anywhere (bazel).
18. 59. x_lambdas defaults to "class" under rules_kotlin while Kotlin 2.x and Gradle both default to "indy"; 0/6 Bazel-carrying repos set it, and dagger compiles the same .kt files under both builds — a confirmed bytecode divergence (bazel).
19. 60. jackson-databind violates the JaCoCo argLine composition rule (pom.xml:44-46 is two bare --add-opens flags with no @{argLine}), with <jacocoStrict>false</jacocoStrict> and a non-failing requireFilesExist as its own smoking gun. It is the counterexample, not the exemplar (maven).
20. 61. `mvn verify` binds the CI gate, not every invocation — guava's -DskipTests install reactor bootstrap followed by a verify gate is correct; error-prone's install-then-test pipeline, which never reaches verify, is the violation (maven).
21. 62. Maven Resolver's own docs reject the 'MD5/SHA-1 are insecure' framing: checksums provide integrity only, never trust, and Maven has no verification-metadata.xml equivalent at all. Gradle's mental model does not transfer; the wrapper checksum is the one carve-out (maven).
22. 63. .mvn/extensions.xml is 0/32 committed and apache/maven's CI injects one — an extension can replace the local repository wholesale, so 'no extensions' read off git ls-tree is not a finding about the build that runs (maven).
23. 64. jvmToolchain(N) does not raise the bytecode target — jvmTarget still defaults to "1.8" and the toolchain only back-fills an unset value, so a Kotlin build compiling on JDK 21 and shipping Java 8 bytecode is the default state (plat).
24. 65. Kotlin's jvmDefault default flipped to ENABLE in 2.2.0, confirmed by two exemplars explicitly overriding back to NO_COMPATIBILITY. A library publishing interfaces that does not state it silently starts emitting real default methods on upgrade (plat).
25. 66. -language-version 1.8/1.9 was dropped in Kotlin 2.3.0; the K1 compiler was removed in 2.4.0. Two distinct facts — frame correction 2 states only the second, and a claim must name which it depends on (plat).
26. 67. Kover's check depends on koverVerify by default since 0.7.0 — the opposite default from JaCoCo, proven by a task tree and a maintainer's onCheck=false reply (kotlinx-kover#523) and stated in Kover's own docs nowhere (plat).
27. 68. mergeServiceFiles() merges into a LinkedHashSet, so merged META-INF/services order is classpath-resolution order, not sorted; Shadow's docs state this neither way. Any 'byte-identical shadowJar' claim made without locked dependency versions is unverified (plat).
28. 69. Oracle's seccodeguide.html is already edited for JDK 24 — all twenty section-9 Access Control guidelines carry a 'permanently disabled since Java 24' note, so the source resolves its own currency problem and does not need excluding wholesale (safety).
29. 70. CVE-2026-54512 and CVE-2026-54513 are two distinct bypass mechanisms in one advisory (generic-parameter substring check vs allowIfSubTypeIsArray() component check). Only a version bump closes both; a correctly configured PolymorphicTypeValidator closes neither (safety).
30. 71. rule-distillation's '60-100 shipped rules' band is per rule set, not per program. This program ships four rule sets plus a Bazel handoff; 296 merged IDs across 21 families at roughly 70 shipped per rule set is inside the funnel. The binding budgets are the per-index line count (under 200) and the per-depth-file size the catalog already ships (this map).
31. 72. A depth file's ID family does not decide its glob; the index it hangs from does. JAVA-PLAT rows whose edit site is a build file (source encoding, org.gradle.jvmargs, project.build.outputTimestamp, the floor numbers) cannot fire from **/*.java and belong to GRADLE-TOOL / MVN-BUILD (this map).
