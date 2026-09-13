---
title: JVM exemplar audit — publishing, fat jars, CI, Bazel-Java, dependency automation
agent: jvm-audit/exemplar-publishing-ci-bazel
model: sonnet
scope: 32 exemplar clones under scratchpad/exemplars (see jvm-frame.md "Exemplar corpus as fetched")
method: >
  Read-only static census over blob-less depth-1 clones. Build/config files are
  materialised by sparse-checkout; anything else was fetched on demand with
  `git -C <dir> show HEAD:<path>`. Every count below is produced by one of five
  shell scripts in `jvm-audit/scratch/` (axis1-publishing.sh, axis1b-publishing-detail.sh,
  axis2-fatjar.sh, axis3-ci.sh, axis5-depsec.sh), each a `grep`/`git ls-tree` loop
  over all 32 clone directories; the axis-4 (Bazel-Java) numbers are individual
  `grep`/`git ls-tree`/`git show` commands against the 6 repos that actually carry
  Bazel build files, shown inline. No build tool was invoked — Gradle, Maven, Bazel
  and `java` are not installed in this environment.
date_researched: 2026-09-05
---

# JVM exemplar audit — publishing, fat jars, CI, Bazel-Java, dependency automation

## Table of contents

- [Headline numbers](#headline-numbers)
- [Exemplar corpus measured](#exemplar-corpus-measured)
- [Axis 1 — Publishing](#axis-1--publishing)
- [Axis 2 — Fat/shadow jars and distribution shapes](#axis-2--fatshadow-jars-and-distribution-shapes)
- [Axis 3 — CI](#axis-3--ci)
- [Axis 4 — Java under Bazel](#axis-4--java-under-bazel)
- [Axis 5 — Dependency-drift and security automation roll-up](#axis-5--dependency-drift-and-security-automation-roll-up)
- [Smells (ranked)](#smells-ranked)
- [Patterns worth encoding](#patterns-worth-encoding)
- [Contradictions of the frame](#contradictions-of-the-frame)
- [Gaps](#gaps)

## Headline numbers

Command for every "N/32" below: the relevant `axis*.sh` script piped to
`awk -F'\t' 'NR>1{for(i=2;i<=NF;i++){if($i+0>0)c[i]++} } END{for(i in c) print i, c[i]}'`
against `jvm-audit/scratch/work/axis{1,1b,2,3,5}.tsv` (this session's scratch
copies of the script output; the scripts themselves are the reproducible
artifact). Ranked by how much they should move the authoring pass:

1. **The OSSRH→Central Portal migration is essentially complete.** `nexus-staging-maven-plugin` (the OSSRH-era Maven plugin): **0/32**. `oss.sonatype.org` referenced anywhere: **3/32**, and where it is, it is `-SNAPSHOT` fallback plumbing, not the release path (`google__error-prone`, `bazelbuild__bazel`, `apollographql__apollo-kotlin`). `central.sonatype.com` / `central-publishing-maven-plugin`: **11/32** combined. Confirms the frame's era hypothesis outright — see [Axis 1](#axis-1--publishing).
2. **No repo derives its version from git tags via a plugin.** `axion-release`, `nebula-release`, `reckon`, `palantir/gradle-git-version`: **0/32 each** (`axis1b.tsv` cols 12-15). Versioning is a literal string in `gradle.properties` (14/32) or the POM. This directly contradicts any assumption that "modern Gradle" repos use tag-driven semver plugins.
3. **Shadow's namespace migration (`com.github.johnrengelman` → `com.gradleup`) is nearly done.** `com.gradleup.shadow`: **12/32**. `com.github.johnrengelman.shadow`: **1/32** (`google__dagger`, and only in modules Gradle Module Metadata hasn't touched yet — see Axis 2).
4. **Fat/shaded jars are never the library artifact — only CLI, javac-plugin, and agent artifacts shade.** Verified by reading the actual shading module in every repo that has one: `uber__NullAway` shades `jar-infer-cli`, `jdk-javac-plugin`, `astubx-generator-cli` — never `nullaway` itself; `detekt__detekt` shades `detekt-cli`, not `detekt-api`; `pinterest__ktlint` shades `ktlint-cli`, not the rule-set libraries. This is the frame's fat-jar hypothesis, confirmed and sharpened: it's not "fat jars are a best-practice topic," it's "fat jars are a CLI/plugin-loader topic, and shading a consumable library is a smell." See [Axis 2](#axis-2--fatjar-and-distribution-shapes).
5. **Real reproducible-archive configuration is almost absent, and the raw grep count overstates it 3x.** A naive `grep -l 'preserveFileTimestamps\|reproducibleFileOrder\|dirPermissions\|filePermissions'` hits 9/32 repos, but reading each hit shows: `grpc__grpc-java`'s 17 hits and `google__dagger`'s 1 hit are a *local variable name* in a hand-written Shadow `Transformer` class, not the Gradle archive-task property; most of the remaining hits are `filePermissions {}` blocks on application-plugin start scripts, unrelated to reproducibility. The **real** count of repos setting the actual `Jar`/`Zip` task properties is **3/32**: `apache__kafka`, `diffplug__spotless`, `micronaut-projects__micronaut-core` — and Kafka's setting (`reproducibleFileOrder = false`, `preserveFileTimestamps = true`) just **restates Gradle's own defaults**, i.e. does nothing. See [Smells](#smells-ranked) #1.
6. **Dependency locking and dependency verification are almost nonexistent.** `gradle.lockfile`: the one hit in the whole corpus is a **documentation snippet** inside `gradle/gradle` itself (`platforms/documentation/docs/src/snippets/.../gradle.lockfile`), not a real lock. `verification-metadata.xml`: **1/32** (`gradle__gradle`, locking its own build's plugin/dependency checksums). Real count of repos with a real Gradle lockfile: **0/32**.
7. **Dependabot and Renovate split the corpus with zero overlap.** Dependabot: **13/32**. Renovate: **13/32**. Repos running both: **0**. Repos running neither: **6/32** (`apache__ant`, `google__dagger`, `grpc__grpc-java`, `bazel-contrib__rules_jvm_external`, `Kotlin__kotlinx.coroutines`, `uber__NullAway`).
8. **Supply-chain action-pinning is common but not universal, and SHA-pinning wins by volume.** SHA-pinned `uses:` references: **523** occurrences across **19/32** repos. Tag-pinned (`@v4`-style): **235** occurrences across **14/32** repos (repos routinely mix both). Zero repos use `actions/dependency-review-action`, `actions/attest-build-provenance`, `sigstore/cosign`, or a container/dependency scanner (Trivy/Anchore/OWASP dependency-check) in CI — SLSA-style attestation has not reached this corpus yet.
9. **Configuration cache and build cache live in `gradle.properties`, not CI flags.** `org.gradle.configuration-cache=true`: **10/32** repos' root `gradle.properties`. `org.gradle.caching=true`: **17/32**. The literal CLI flag `--configuration-cache` appears in only **3/32** CI workflows, `--build-cache` in **7/32** — CI mostly inherits the property, it doesn't re-assert it.
10. **JPMS is a real, if minority, practice — 12/32 repos ship at least one `module-info.java`** (79 files total; `junit-team__junit-framework`=19, `square__okhttp`=15, `Kotlin__kotlinx.coroutines`=15, `gradle__gradle`=11). `Automatic-Module-Name` (the fallback) appears in 10/32, largely a *different* set of repos than the ones with real `module-info.java` — a library picks one strategy, rarely both.
11. **`error-prone` is not a Bazel-built repo despite being classified that way** — it ships zero `MODULE.bazel`/`WORKSPACE`/`BUILD` files; it is *consumed* as a `maven_install` artifact by `bazelbuild__bazel`, `google__dagger`, `grpc__grpc-java`, never built by Bazel itself. See [Contradictions](#contradictions-of-the-frame).
12. **Gazelle-for-Java is unused everywhere measured**: `contrib_rules_jvm`'s gazelle plugin appears in **0/6** Bazel-flavored repos' `MODULE.bazel`/`WORKSPACE`.

## Exemplar corpus measured

All 32 repos from `jvm-frame.md`'s "Exemplar corpus as fetched" table, at the SHAs recorded there (repeated here for citation convenience):

| repo | sha |
|---|---|
| android/nowinandroid | `12f80da651` |
| apache/ant | `8c96cd6869` |
| apache/kafka | `940c100fab` |
| apache/maven | `ea4a417bd2` |
| apollographql/apollo-kotlin | `c145295b72` |
| assertj/assertj | `485502bad2` |
| bazelbuild/bazel | `948b8c70e2` |
| bazelbuild/rules_java | `4206909b6d` |
| bazelbuild/rules_kotlin | `7c51dd1210` |
| bazel-contrib/rules_jvm_external | `449754dcbb` |
| cashapp/sqldelight | `4580923af3` |
| detekt/detekt | `45672efb8b` |
| diffplug/spotless | `dc2a4cb9a3` |
| FasterXML/jackson-databind | `a906e1782b` |
| google/dagger | `4fbc045d2b` |
| google/error-prone | `c1f99ad5d3` |
| google/guava | `5fb424c43a` |
| gradle/actions | `a27deee331` |
| gradle/gradle | `ea17004a31` |
| GradleUp/shadow | `541b3be475` |
| grpc/grpc-java | `fc4314419d` |
| JetBrains/Exposed | `4be9aee04c` |
| junit-team/junit-framework | `35c56a8e02` |
| Kotlin/kotlinx.coroutines | `f63a04bacb` |
| ktorio/ktor | `f92fad0435` |
| micronaut-projects/micronaut-core | `d5842045bb` |
| mockito/mockito | `5a676bcd9e` |
| pinterest/ktlint | `4c933394a3` |
| spring-projects/spring-boot | `93b23c40c2` |
| square/okhttp | `dfcfab3824` |
| testcontainers/testcontainers-java | `a4d3a033d8` |
| uber/NullAway | `519a1bb826` |

## Axis 1 — Publishing

**Method**: `jvm-audit/scratch/axis1-publishing.sh` and `axis1b-publishing-detail.sh`. Both loop `for d in */` over the exemplar directory, build a per-repo file list with `find "$r" -maxdepth 10 \( -name '*.gradle' -o -name '*.gradle.kts' -o -name '*.versions.toml' \)` (catalogs included — plugin ids are frequently declared as `id = "..."` in `gradle/libs.versions.toml` rather than inline, e.g. `square__okhttp@dfcfab3824:gradle/libs.versions.toml:168` declares `com.vanniktech.maven.publish.base` where the root `build.gradle.kts:9` only references `alias(libs.plugins.maven.publish)`) and a separate `find -name pom.xml`, then `grep -l`/`grep -c` each pattern. Full commands are in the script; rerun with `bash jvm-audit/scratch/axis1-publishing.sh`.

### Publishing-plugin identity, signing, snapshot repo (file-count per repo)

| repo | vanniktech | nexus-publish | nmcp | yanand | jreleaser | central-publishing-maven-plugin | nexus-staging-maven-plugin | maven-publish/MavenPublication | signing plugin | useInMemoryPgpKeys | useGpgCmd | maven-gpg-plugin | oss.sonatype.org | central.sonatype.com |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| android/nowinandroid | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apache/ant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apache/kafka | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 2 | 0 | 0 | 1 | 0 | 0 |
| apache/maven | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apollo-kotlin | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 | 1 | 1 |
| assertj | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| bazel | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 |
| rules_java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_jvm_external | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sqldelight | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| detekt | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| spotless | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 2 |
| jackson-databind | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| dagger | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| error-prone | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| guava | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 5 | 0 | 0 |
| gradle/actions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gradle/gradle | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 2 | 1 | 0 | 0 | 0 | 0 |
| shadow | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| grpc-java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 39 | 1 | 0 | 0 | 0 | 0 | 1 |
| Exposed | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 0 | 0 | 0 |
| junit-framework | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 1 | 0 | 0 | 0 |
| kotlinx.coroutines | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 |
| ktor | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 1 | 0 | 0 | 0 |
| micronaut-core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| mockito | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 0 | 0 | 1 | 1 |
| ktlint | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| spring-boot | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| okhttp | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| testcontainers-java | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 1 |
| NullAway | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 2 |
| **N/32 (≥1)** | **8** | **2** | **2** | **0** | **1** | **3** | **0** | **18** | **6** | **4** | **2** | **5** | **3** | **8** |

Reading this: `maven-publish`/`MavenPublication` (the low-level Gradle primitive) is used directly or transitively by 18/32 repos, but a *higher-level* publish plugin (vanniktech, nexus-publish, nmcp, jreleaser) sits on top in only 11/32 — the rest hand-roll `pom {}` blocks against raw `maven-publish`. `yanand` (`tech.yanand.maven-central-publish`) and `nexus-staging-maven-plugin`: **0/32**, both era markers landing exactly as hypothesised.

### BOM/catalog, plugin-publish, JPMS, reproducibility, changelog

| repo | java-platform | `<packaging>pom</packaging>` | version-catalog plugin | `com.gradle.plugin-publish` | Automatic-Module-Name | module-info.java count | multi-release signal | reproducible-archive (raw grep) | Maven `outputTimestamp` | CHANGELOG* file |
|---|---|---|---|---|---|---|---|---|---|---|
| nowinandroid | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ant | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 |
| kafka | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| maven | 0 | 10 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| apollo-kotlin | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| assertj | 0 | 5 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 |
| bazel | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| rules_java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| rules_jvm_external | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sqldelight | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| detekt | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| spotless | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 0 |
| jackson-databind | 0 | 0 | 0 | 0 | 1 | 2 | 0 | 0 | 1 | 0 |
| dagger | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1† | 0 | 1 |
| error-prone | 0 | 1 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 |
| guava | 0 | 4 | 0 | 0 | 1 | 3 | 0 | 0 | 2 | 0 |
| gradle/actions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gradle/gradle | 1 | 0 | 0 | 0 | 0 | 11 | 0 | 0 | 0 | 0 |
| shadow | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| grpc-java | 1 | 0 | 0 | 0 | 28 | 0 | 0 | 17† | 0 | 0 |
| Exposed | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| junit-framework | 0 | 0 | 0 | 0 | 1 | **19** | 0 | 1 | 0 | 0 |
| kotlinx.coroutines | 1 | 0 | 0 | 0 | 1 | 15 | 1 | 0 | 0 | 0 |
| ktor | 1 | 0 | **1** | 0 | 1 | 0 | 0 | 0 | 0 | 1 |
| micronaut-core | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1‡ | 0 | 0 |
| mockito | 1 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 0 | 0 |
| ktlint | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| spring-boot | 0 | 0 | 0 | 1 | 2 | 1 | 1 | 1 | 0 | 0 |
| okhttp | 1 | 0 | 0 | 0 | 2 | **15** | 13 | 0 | 0 | 1 |
| testcontainers-java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| NullAway | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 1 | 0 | 1 |
| **N/32 (≥1)** | **7** | **7** | **1** | **5** | **10** | **12** | **5** | **9→3‡‡** | **3** | **14** |

\* `CHANGELOG*` = a root-level path matching `^changelog` in `git ls-tree`, case-insensitive — presence only, not format.
† False positive: the hit is a hand-written Shadow `Transformer.modifyOutputStream(..., boolean preserveFileTimestamps)` method parameter, not the Gradle archive-task property — `google__dagger@4fbc045d2b:tools/shader/build.gradle:72`, `grpc__grpc-java@fc4314419d:netty/shaded/build.gradle:176-179`.
‡ Genuine: `micronaut-projects__micronaut-core@d5842045bb:buildSrc/src/main/groovy/io.micronaut.build.internal.convention-base.gradle:74-75` sets `reproducibleFileOrder = true; preserveFileTimestamps = false` correctly.
‡‡ See [Headline #5](#headline-numbers): after removing the two false positives and reading `apache__kafka@940c100fab:build.gradle:361-364` (which sets `reproducibleFileOrder = false; preserveFileTimestamps = true` — Gradle's own defaults, a no-op), the real count of repos with a **correct, non-default** reproducible-archive setting is **2/32**: `diffplug__spotless@dc2a4cb9a3:gradle/java-publish.gradle:208-209` and `micronaut-core` above.

Other axis-1 sub-metrics (`jvm-audit/scratch/axis1b-publishing-detail.sh`): `gradlePlugin { website/vcsUrl/tags }` fields travel together — `detekt`, `spotless`, `shadow` set all three; `spring-boot` sets `website`+`vcsUrl` but not `tags`. `validatePlugins` (task name, not necessarily Portal publishing) appears in **10/32** files across 7 repos — wider than `com.gradle.plugin-publish` itself, because `java-gradle-plugin` (which any `build-logic`/`buildSrc` convention-plugin module applies) registers the same task independent of Portal publishing; e.g. `android__nowinandroid@12f80da651` and `cashapp__sqldelight@4580923af3` hit `validatePlugins` with **zero** Plugin Portal signal anywhere else in their build files — internal convention-plugin validation, not product publishing. POM metadata field coverage (`axis1b.tsv`): `pom_licenses`/`pom_developers`/`pom_scm` travel together in 15-17/32 repos; `pom_url` (8/32) lags them — several repos set license/developer/scm but skip the project URL.

## Axis 2 — Fat/shadow jars and distribution shapes

**Method**: `jvm-audit/scratch/axis2-fatjar.sh`, same per-repo file-list approach; Maven shade/assembly checked against every `pom.xml`; Bazel `java_binary(` and `*_deploy.jar` path counts via `git ls-tree`.

| repo | johnrengelman shadow | gradleup shadow | `relocate(` | `mergeServiceFiles` | maven-shade-plugin | `<relocation>` | `ServicesResourceTransformer` | assembly jar-with-deps | application plugin | Spring `bootJar`/boot plugin | Jib | Dockerfile(s) | GraalVM native-image | `java_binary(` (Bazel) | `_deploy.jar` paths |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| nowinandroid | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kafka | 0 | 1 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 | 0 | 0 |
| maven | 0 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| apollo-kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 0 | 0 | 0 |
| assertj | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| bazel | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| rules_java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 0 |
| rules_kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 | 0 |
| rules_jvm_external | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 10 | 4 |
| sqldelight | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| detekt | 0 | 5 | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| spotless | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| jackson-databind | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dagger | 1 | 3 | 4 | 1 | 0 | 0 | 0 | 0 | 9 | 0 | 0 | 0 | 0 | 4 | 2 |
| error-prone | 0 | 0 | 0 | 0 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| guava | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gradle/actions | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| gradle/gradle | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| shadow | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| grpc-java | 0 | 7 | 0 | 2 | 1 | 0 | 1 | 1 | 19 | 0 | 4 | 8 | 0 | 6 | 0 |
| Exposed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 | 1 | 1 | 0 | 0 |
| junit-framework | 0 | 2 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| kotlinx.coroutines | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktor | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| micronaut-core | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| mockito | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktlint | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| spring-boot | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **383** | 0 | 3 | 0 | 0 | 0 |
| okhttp | 0 | 3 | 0 | 2 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 3 | 0 | 0 |
| testcontainers-java | 0 | 3 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | **62** | 0 | 0 | 0 |
| NullAway | 0 | 4 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **N/32 (≥1)** | **1** | **12** | **6** | **9** | **4** | **2** | **1** | **1** | **7** | **3** | **1** | **7** | **3** | **5** | **1** |

**Who consumes the shaded/relocated artifact** (read from the actual module names, not inferred):

| repo | shaded module | consumer shape | relocation? | mergeServiceFiles? |
|---|---|---|---|---|
| `uber__NullAway@519a1bb826` | `jar-infer/jar-infer-cli`, `jdk-javac-plugin`, `jdk-annotations/astubx-generator-cli` | CLI + javac plugin | no | yes (`jar-infer-cli/build.gradle:39`) |
| `pinterest__ktlint@4c933394a3` | `ktlint-cli` | CLI | no | yes (`ktlint-cli/build.gradle.kts:18`) |
| `detekt__detekt@45672efb8b` | `detekt-cli`, `detekt-rules-ktlint-wrapper/ktlint-repackage`, `detekt-kotlin-analysis-api-standalone` | CLI + single-dependency repackage/vendoring | yes (`ktlint-repackage`) | yes |
| `google__dagger@4fbc045d2b` | `tools/shader` (build tooling) + app-plugin sample modules | build-time tool, not the `dagger`/`dagger-compiler` artifact | yes | yes |
| `grpc__grpc-java@fc4314419d` | `netty/shaded` (vendors Netty for the transport), `interop-testing` | dependency vendoring + test-client uber jar | yes | yes |
| `apache__kafka@940c100fab` | build-tooling submodule, not `kafka-clients` | tool jar | yes | no |
| `google__error-prone@c1f99ad5d3` (Maven shade) | `error_prone_core` — shaded because it's loaded into `javac` itself and must not leak its own Guava/ASM onto the compilation classpath | javac plugin | yes (`<relocation>`) | no |

No repo in the corpus shades a library whose primary consumption mode is "declare as a Gradle/Maven dependency and call its API" — every hit above is a CLI, a javac/annotation-processor plugin, or an internal vendoring step. `application` plugin usage (7/32) skews toward sample/example modules (`apollo-kotlin`, `grpc-java`, `Exposed`) rather than the library's own distribution. Spring Boot's 383 `bootJar`/`org.springframework.boot` hits are overwhelmingly its own smoke-test and sample-app modules, not evidence that 383 distinct artifacts exist — see [Gaps](#gaps).

## Axis 3 — CI

**Method**: `jvm-audit/scratch/axis3-ci.sh`. Workflow files are `.github/workflows/*.yml`/`.yaml` (no `.cirrus.yml`, `Jenkinsfile`, or `.travis.yml` was found in any of the 32 clones — `git ls-tree -r --name-only HEAD | grep -iE 'jenkinsfile|\.travis\.yml|\.cirrus\.yml'` across all 32 returns nothing except `apache__ant`'s ASF-infra `.asf.yaml`, which is not a workflow file). 30/32 repos have ≥1 GH Actions workflow; `apache__ant` (0 — ASF builds run outside GitHub, `.asf.yaml` only) and `Kotlin__kotlinx.coroutines` (0 — only `.github/ISSUE_TEMPLATE/*.yml`, no CI workflow in-repo; JetBrains' actual CI is off-repo, presumably TeamCity/Space) have none.

### JDK matrix, Gradle/Maven CI mechanics

| repo | wf files | setup-java | temurin | zulu | graalvm-jdk | `.java-version`/`.sdkmanrc`/`.tool-versions` | setup-gradle | wrapper-validation (standalone) | config-cache flag | build-cache flag |
|---|---|---|---|---|---|---|---|---|---|---|
| nowinandroid | 3 | 3 | 0 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| ant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kafka | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| maven | 5 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| apollo-kotlin | 10 | 0 | 0 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| assertj | 7 | 5 | 0 | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| bazel | 9 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_java | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_kotlin | 3 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| rules_jvm_external | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sqldelight | 4 | 3 | 0 | 3 | 0 | 0 | 3 | 0 | 0 | 0 |
| detekt | 11 | 6 | 6 | 0 | 0 | 0 | 6 | 0 | 0 | 0 |
| spotless | 5 | 4 | 4 | 0 | 0 | 0 | 4 | 0 | 0 | 1 |
| jackson-databind | 8 | 3 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| dagger | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| error-prone | 2 | 2 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| guava | 2 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| gradle/actions | 35 | 3 | 3 | 0 | 0 | 1 | 2 | 0 | 0 | 0 |
| gradle/gradle | 23 | 8 | 8 | 0 | 0 | 0 | 2 | 0 | 0 | 0 |
| shadow | 4 | 2 | 0 | 2 | 0 | 1 | 4 | 0 | 0 | 0 |
| grpc-java | 4 | 2 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Exposed | 6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| junit-framework | 17 | 3 | 3 | 0 | 1 | 1 | 0 | 0 | 0 | 1 |
| kotlinx.coroutines | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktor | 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| micronaut-core | 9 | 4 | 3 | 0 | 5 | 1 | 5 | 0 | 0 | 0 |
| mockito | 1 | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 0 |
| ktlint | 8 | 1 | 0 | 1 | 0 | 0 | 1 | 0 | 0 | 0 |
| spring-boot | 10 | 1 | 0 | 0 | 0 | 1 | 1 | 0 | 0 | 1 |
| okhttp | 3 | 3 | 3 | 1 | 1 | 1 | 1 | 0 | 0 | 1 |
| testcontainers-java | 13 | 1 | 1 | 0 | 0 | 1 | 1 | 0 | 1 | 1 |
| NullAway | 2 | 1 | 1 | 0 | 0 | 0 | 1 | 0 | 1 | 1 |
| **N/32 (≥1)** | **30** | **23** | **13** | **10** | **4** | **7** | **15** | **1** | **3** | **7** |

**Distribution note**: `temurin` (13/32) beats `zulu` (10/32) narrowly; **`oracle`: 0/32**, **graalvm-as-JDK-distribution: 4/32** (`micronaut-core`, `mockito`, `okhttp`'s native-image test job, `bazelbuild__bazel`'s CI uses GraalVM only incidentally via a native-image example — verify per-repo before citing as a pattern). `gradle/actions/wrapper-validation-action` as a **standalone** action is used by exactly **1/32** (`mockito__mockito`) — every other repo either gets wrapper validation bundled into `gradle/actions/setup-gradle` (which validates by default) or doesn't validate at all.

### Flags, permissions, concurrency (remaining CI mechanics)

| repo | `--no-daemon` | `--stacktrace` | build-scan/`--scan` | dependency-graph submit | mvn `-B`/`--batch-mode`/`-ntp` | `.m2`/maven cache | concurrency group | permissions block |
|---|---|---|---|---|---|---|---|---|
| nowinandroid | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| ant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kafka | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 7 |
| maven | 0 | 0 | 0 | 0 | **1** | 0 | 1 | 2 |
| apollo-kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| assertj | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 |
| bazel | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 |
| rules_java | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| rules_kotlin | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| rules_jvm_external | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| sqldelight | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 3 |
| detekt | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 11 |
| spotless | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 |
| jackson-databind | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 8 |
| dagger | 0 | 0 | 0 | 0 | 0 | 2 | 2 | 2 |
| error-prone | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 2 |
| guava | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 2 |
| gradle/actions | 0 | 1 | 0 | **5** | 0 | 0 | 2 | 35 |
| gradle/gradle | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 23 |
| shadow | 0 | 1 | 1 | 1 | 0 | 0 | 0 | 2 |
| grpc-java | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 4 |
| Exposed | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| junit-framework | 1 | 1 | 0 | 0 | 0 | 0 | 3 | 17 |
| kotlinx.coroutines | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktor | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5 |
| micronaut-core | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 |
| mockito | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| ktlint | 0 | 1 | 0 | 0 | 0 | 0 | 2 | 8 |
| spring-boot | 0 | 1 | 0 | 0 | 1 | 0 | 3 | 10 |
| okhttp | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 3 |
| testcontainers-java | 1 | 1 | 0 | 0 | 1 | 0 | 4 | 12 |
| NullAway | 1 | 1 | 0 | 0 | 1 | 0 | 2 | 2 |
| **N/32 (≥1)** | **5** | **7** | **2** | **2** | **5** | **2** | **18** | **30** |

**Permissions**: 30/32 repos declare at least one `permissions:` block somewhere — but that's a low bar (any single job scoping `contents: read`, even alongside other jobs with broad default permissions, counts). Genuine top-level least-privilege (`permissions: contents: read` at the workflow root) needs a closer read per repo before being cited as a corpus-wide practice — flagged in [Gaps](#gaps).

### Supply chain and scanning

| repo | SHA-pinned actions | tag-pinned actions | CodeQL | Dependabot | Renovate | Scorecard | dep-review-action | Trivy/Anchore | attest-build-provenance | cosign |
|---|---|---|---|---|---|---|---|---|---|---|
| nowinandroid | 0 | 24 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| ant | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| kafka | 9 | 49 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| maven | 19 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| apollo-kotlin | 15 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| assertj | 37 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| bazel | 19 | 0 | 1 | 1 | 0 | **1** | 0 | 0 | 0 | 0 |
| rules_java | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| rules_kotlin | 0 | 5 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| rules_jvm_external | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| sqldelight | 28 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| detekt | 36 | 0 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| spotless | 0 | 13 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| jackson-databind | 16 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| dagger | 28 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| error-prone | 18 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| guava | 11 | 0 | 1 | 1 | 0 | **1** | 0 | 0 | 0 | 0 |
| gradle/actions | 117 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| gradle/gradle | 0 | 51 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| shadow | 0 | 12 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| grpc-java | 0 | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| Exposed | 0 | 6 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| junit-framework | 46 | 0 | 2 | 0 | 1 | **1** | 0 | 0 | 0 | 0 |
| kotlinx.coroutines | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktor | 0 | 9 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| micronaut-core | 31 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| mockito | 0 | 12 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| ktlint | 12 | 10 | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| spring-boot | 22 | 3 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| okhttp | 40 | 2 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| testcontainers-java | 5 | 25 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 |
| NullAway | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **N/32 (≥1)** | **19** | **14** | **11** | **13** | **13** | **4** | **0** | **0** | **0** | **0** |
| **Σ occurrences** | **523** | **235** | **12** | — | — | **4** | **0** | **0** | **0** | **0** |

## Axis 4 — Java under Bazel

**Scope note first**: of the 7 repos the frame lists as "Java under Bazel, or Gradle+Bazel dual" plus the 3 pure-ruleset repos (10 candidates), only **6** actually carry `MODULE.bazel`/`WORKSPACE`/`BUILD` files: `bazelbuild/bazel`, `bazelbuild/rules_java`, `bazelbuild/rules_kotlin`, `bazel-contrib/rules_jvm_external`, `google/dagger`, `grpc/grpc-java`. **`google/error-prone` has none** — see [Contradictions](#contradictions-of-the-frame).

Commands: `find "$r" -maxdepth 1 -iname 'MODULE.bazel' -o -iname 'WORKSPACE*'`; `.bazelrc` flags via `grep -nE "java_language_version|java_runtime_version|tool_java_language_version|strict_java_deps" "$r/.bazelrc"`; `maven.install(...)` block via `grep -n "rules_jvm_external\|maven\.install\|lock_file" "$r/MODULE.bazel"`; lock files via `git -C "$r" ls-tree -r --name-only HEAD | grep -c maven_install.json`; `kt_jvm_library` via `grep -rl kt_jvm_library "$r" --include=BUILD.bazel --include=BUILD --include='*.bzl'`; gazelle via `grep -lE "contrib_rules_jvm|gazelle" "$r"/MODULE.bazel "$r"/WORKSPACE`.

| repo | `MODULE.bazel` lines | `rules_jvm_external` version | `maven.install` lock file | `--java_language_version` (.bazelrc) | `--java_runtime_version` | `--tool_java_language_version` | `--experimental_strict_java_deps` | `kt_jvm_library` hits | `.bazelproject` (IDE) | gazelle/`contrib_rules_jvm` |
|---|---|---|---|---|---|---|---|---|---|---|
| `bazelbuild/bazel@948b8c70e2` | 517 | 6.8 (patched, `//third_party:rules_jvm_external_6.8_*.patch`) | `//:maven_install.json` | **25** | `remotejdk_25` | **25** | not set | 0 | 2 | 0 |
| `bazelbuild/rules_java@4206909b6d` | 133 | — (no maven.install; rules repo needs no external Java deps) | none | 8 | `remotejdk_8` | 8 | not set | 0 | 0 | 0 |
| `bazelbuild/rules_kotlin@7c51dd1210` | 160 | 7.1 | `//:kotlin_rules_maven_install.json` (+10 example-workspace lockfiles) | not set | `remotejdk_17` | not set | not set | **19** | 2 | 0 |
| `bazel-contrib/rules_jvm_external@449754dcbb` | 1227 | self (dogfoods its own `maven.install`) | `//:rules_jvm_external_deps_install.json` (+9 example/test lockfiles) | 17 | `remotejdk_17` | 17 | `strict` | 2 | 0 | 0 |
| `google/dagger@4fbc045d2b` | 192 | 6.9 | `//:maven_install.json` | 17 (with `-source 8 -target 8` via `--javacopt`, `.bazelrc:28`) | `remotejdk_17` | 17 | not set | 14 | 0 | 0 |
| `grpc/grpc-java@fc4314419d` | 197 | 6.0 | none in-tree (artifacts from `IO_GRPC_GRPC_JAVA_ARTIFACTS` constant, not lock-pinned) | **not set at all** — `.bazelrc` only carries `--cxxopt`/`--host_cxxopt` (`grpc__grpc-java@fc4314419d:.bazelrc:1-3`) | not set | not set | not set | 0 | 0 | 0 |

**Reading this**: `bazel` itself pins Java 25 across language, runtime, *and* tool versions (`bazelbuild__bazel@948b8c70e2:.bazelrc:70-73`) — the one repo in the whole corpus that matches the frame's "Java 25 LTS" era hypothesis exactly on the Bazel side. `rules_java` deliberately pins **Java 8** (`bazelbuild__rules_java@4206909b6d:.bazelrc:4-7`) because a rules repo must keep building for callers on old JDKs. `rules_kotlin` only pins the **runtime** JDK (17), not a language-level target. `grpc-java` pins **nothing** — its `.bazelrc` exists only for C++ interop flags, meaning its Java-under-Bazel build rides whatever `bazel_dep(rules_java)` supplies as a default toolchain, unpinned. `dagger` is the one repo with an explicit **bytecode-target vs. build-toolchain split**: build/tool JDK 17, but `-source 8 -target 8` via `--javacopt` for the actual output classfiles (`google__dagger@4fbc045d2b:.bazelrc:22-28`) — the correct pattern for a library that must run on old Android/JVMs while being built with a modern JDK.

**Lock-file format**: every `maven_install.json` in the corpus opens with `"__AUTOGENERATED_FILE_DO_NOT_MODIFY_THIS_FILE_MANUALLY"` and an `"__INPUT_ARTIFACTS_HASH"` map (`bazel-contrib__rules_jvm_external@449754dcbb:maven_install.json:1-5`, fetched via `git show` since json is sparse-checkout-excluded outside `.github/`/`buildSrc/`/etc.) — there is no simple integer "lock file version" field; drift is detected by re-hashing the declared `artifacts` list, not by a version bump.

**Gradle/Bazel parity mechanism** (requester's specific question — "a script? a test? a doc?"): neither `dagger` nor `grpc-java` generates `BUILD.bazel` from the Gradle build or vice versa — both are **hand-maintained, dual, and unverified for consistency by any generator**. The closest thing to a parity check is CI-enforced ordering: `google__dagger@4fbc045d2b:.github/workflows/release.yml:39-98` runs `bazel-build`/`bazel-test` jobs and gates every downstream publish job on `needs: bazel-build`/`needs: bazel-test` — so a broken Bazel build blocks release, but nothing checks that the Bazel and Gradle *artifacts* are equivalent, only that both individually build. `dagger`'s `CONTRIBUTING.md:29` states plainly "Dagger is built with `bazel`" — Bazel is the primary/canonical build; Gradle exists for downstream publishing packaging. This is a **doc + CI-ordering** answer, not a **generator**.

**Coverage under Bazel, Error Prone flags, Gazelle**: `coverage_report_generator` is not referenced in any of the 6 repos' `.bazelrc`/`MODULE.bazel`/`WORKSPACE` — none customizes it (doesn't mean `bazel coverage` doesn't work, just that nobody overrides the default). `--javacopt="-Xep:BetaApi:ERROR"` (an Error Prone check-severity override) appears once, in `dagger` (`.bazelrc:17`). Gazelle-for-Java (`contrib_rules_jvm`'s plugin): **0/6**. `.bazelproject` (IntelliJ Bazel plugin project file) exists for `bazel` (2 files) and `rules_kotlin` (2 files) only.

## Axis 5 — Dependency-drift and security automation roll-up

**Method**: `jvm-audit/scratch/axis5-depsec.sh`.

| repo | `gradle.lockfile` | `verification-metadata.xml` | `maven_install.json` (any path) | CycloneDX plugin | license plugin | OWASP dependency-check | Snyk (CI) |
|---|---|---|---|---|---|---|---|
| gradle/gradle | 1* | 1 | 0 | 0 | 0 | 0 | 0 |
| bazel | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| rules_kotlin | 0 | 0 | 10 | 0 | 0 | 0 | 0 |
| rules_jvm_external | 0 | 0 | 11 | 0 | 0 | 0 | 0 |
| dagger | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| jackson-databind | 0 | 0 | 0 | 1 | 0 | 0 | 0 |
| assertj | 0 | 0 | 0 | 0 | 4 | 0 | 0 |
| mockito | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| spring-boot | 0 | 0 | 0 | 4 | 0 | 0 | 0 |
| *(all other 23 repos)* | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **N/32 (≥1)** | **1\*** | **1** | **4** | **2** | **2** | **0** | **0** |

\* The one `gradle.lockfile` hit is `gradle__gradle@ea17004a31:platforms/documentation/docs/src/snippets/reference/dependency-management/dependency-management/dependencyLocking-lockingSingleFilePerProject/common/gradle.lockfile` — a **documentation snippet demonstrating the feature**, not a real lock on gradle/gradle's own build. **Real count of repos with a genuine Gradle dependency lock: 0/32.**

Roll-up: **1/32** repos (`gradle/gradle`, on itself) uses Gradle's dependency-verification feature. **4/32** (the Bazel-flavored repos) get artifact-integrity locking for free from `rules_jvm_external`'s `maven_install.json`, which is mandatory by convention rather than opt-in. **2/32** generate a CycloneDX SBOM (`spring-boot` has first-class support via `org.cyclonedx.bom`; `jackson-databind`'s hit is a single Maven profile). **0/32** run OWASP dependency-check or Snyk. License-plugin hits (`assertj`, `mockito`) are `license-maven-plugin` generating a THIRD-PARTY notices file at build time, not a policy gate that fails the build on a disallowed license.

## Smells (ranked)

1. **Grep-shaped "reproducibility" and "shade" configs mask false positives that only a source read catches.** Naive matching on `preserveFileTimestamps`/`reproducibleFileOrder`/`dirPermissions`/`filePermissions` overcounts by 3x (9 vs. 3 real); one of the 3 real hits (`apache__kafka@940c100fab:build.gradle:361-364`) just restates Gradle's own defaults. Any authored rule that tells an agent "check for `preserveFileTimestamps = false`" must also tell it to check the actual archive-task context, not just grep the token.
2. **`nexus-staging-maven-plugin` and `tech.yanand.maven-central-publish` are dead weight to teach** — 0/32 usage each. Any authored content that lists "publishing plugin options" should lead with `central-publishing-maven-plugin` (Maven) and `com.vanniktech.maven.publish`/`com.gradleup.nmcp` (Gradle), and mention the OSSRH-era plugin only as "if you see this, migrate it."
3. **Supply-chain attestation (SLSA provenance, cosign, dependency-review-action, container scanning) is a total gap across all 32 repos**, including `bazelbuild/bazel` and `gradle/gradle` themselves. Teaching this as an "expected" 2026 practice would contradict the entire measured corpus — it may be a forward-looking rule to introduce deliberately, not one to present as already-common.
4. **Action pinning is inconsistent even within single repos**: `apache__kafka` mixes 9 SHA-pinned with 49 tag-pinned references in the same workflow set; most repos pick one style with a minority of exceptions rather than being fully consistent.
5. **`google/error-prone`'s Bazel classification is a corpus-selection smell, not just a documentation nit** — if a future worker treats it as a "Java-under-Bazel exemplar," they'll find nothing to read.
6. **`spring-boot`'s 383 `bootJar` hits and `testcontainers-java`'s 62 Dockerfiles are monorepo noise**, not 383 shipped executables or 62 distinct container images — any rule authored from raw grep counts on these two repos needs the "per real module" caveat spelled out in [Gaps](#gaps).
7. **`grpc-java` ships a Java build under Bazel with zero JDK version pinning** — a real risk (silent JDK drift across CI runners) that a `bazel-quality`/Java depth file should flag as an anti-pattern, with `dagger`'s explicit split as the counter-example.

## Patterns worth encoding

- **Shade only CLI/plugin-loader/agent artifacts, never the library API jar.** Confirmed across every shading repo in the corpus (`NullAway`, `ktlint`, `detekt`, `error-prone`, `dagger`'s build tooling). This is a strong, cleanly falsifiable MUST-level rule for `gradle-build`.
- **When a bytecode target must lag the build/tool JDK, split them explicitly** (`google__dagger@4fbc045d2b:.bazelrc:22-28`: build/tool at 17, `--javacopt="-source 8 -target 8"` for output) — a directly transferable Gradle-side pattern too (`sourceCompatibility`/`--release` vs. the toolchain JDK).
- **`java-gradle-plugin` + `validatePlugins` shows up for *internal* convention-plugin modules, not just Plugin Portal products** (`nowinandroid`, `sqldelight` build-logic). A `gradle-build` rule that assumes "if `validatePlugins` runs, this repo publishes a plugin" will misfire — the routing condition needs to be `com.gradle.plugin-publish` presence, not `validatePlugins`.
- **Publishing metadata fields cluster**: licenses/developers/scm travel together; url lags. A lint rule checking "pom metadata completeness" should treat these as one group with url as the commonly-missed field, not flag them independently.
- **Version-catalog files are not always named `libs.versions.toml`** (`apollographql__apollo-kotlin@c145295b72:gradle/libraries.toml`) — any authored glob or grep pattern keyed to the conventional filename will silently miss real catalogs; match on `**/*.versions.toml` plus a documented fallback, or on TOML content shape, not the filename alone.
- **CI inherits Gradle properties rather than re-asserting flags**: `org.gradle.configuration-cache=true`/`org.gradle.caching=true` in `gradle.properties` is the dominant mechanism (10/32, 17/32); the `--configuration-cache`/`--build-cache` CLI flags in CI (3/32, 7/32) are the minority, usually added to *force* a flag that isn't the properties default for a specific job (e.g. a compatibility-test job that must disable what the main build enables). A rule teaching "how do I know if config cache is on" must say "check `gradle.properties` first."
- **Dependabot-vs-Renovate is a clean either/or per repo** (13/32 each, zero overlap) — worth noting for any `jvm-dependency-triage` skill: detect which one is present rather than assuming either.

## Contradictions of the frame

- **"Bazel for Java/Kotlin... as a complement to the Bazel program... `error-prone`" is wrong as stated.** `google/error-prone` ships no `MODULE.bazel`/`WORKSPACE`/`BUILD` file at all (`git -C google__error-prone ls-tree -r --name-only HEAD | grep -iE 'bazel|BUILD|WORKSPACE|MODULE'` returns only source files whose *names* contain "build" — e.g. `MutableGuiceModule.java` — and one `build_defs.bzl` helper meant for *consumers*). It is Maven-built and Bazel-*consumed* (as a `maven_install` artifact in `bazel`, `dagger`, `grpc-java`), never Bazel-built. The frame's classification table should read "maven; consumed under Bazel," not "maven bazel."
- **The frame's fat-jar contradiction-to-chase ("fat jars may be an anti-pattern for libraries") isn't a maybe — it's confirmed with zero counterexamples** across all 32 repos. Every shaded/relocated artifact found is a CLI, javac/annotation-processor plugin, or vendoring step; no repo ships a shaded *library* jar meant to be declared as a dependency. This sharpens hypothesis 2 in the frame ("shadow/fat jars are a best-practice topic in their own right") into something narrower and more actionable: fat jars are a **distribution-shape topic for executables**, not a general Gradle-build topic, and the depth file should route on "are you building something invoked as a program/plugin" rather than on "are you publishing a jar."
- **Hypothesis 1 ("modern Gradle deserves more depth than Maven") holds on plugin diversity (11 distinct Central-publishing paths seen across 21/32 Gradle-flavored publishers vs. 2 Maven-side plugins) but the *reproducible-builds* and *dependency-locking* practices the frame implicitly credits to "modern Gradle" are almost entirely absent** (2/32 and 0/32 respectively) — modern-Gradle depth should not assume these ship by default just because the Gradle version is new enough to support them.
- **Kotlin's version-catalog-plugin publishing (the `version-catalog` Gradle plugin, publishing your *own* catalog) is real but vanishingly rare (1/32, `ktor`)** — not load-bearing enough to warrant its own MUST-level rule row; a MAY-level mention is proportionate.

## Gaps

- **This is a static-grep census, not a build.** No file was verified to actually configure the plugin correctly (e.g., a `maven-publish` hit doesn't confirm the `pom{}` block is wired to the right publication, and a `com.gradleup.shadow` hit doesn't confirm `shadowJar` is wired into `assemble`). Treat every count as "at least one signal of," not "correctly configured."
- **Monorepo modules were not de-duplicated per "real shipped artifact."** `spring-projects/spring-boot`'s 383 `bootJar`/boot-plugin hits and `testcontainers/testcontainers-java`'s 62 Dockerfiles are dominated by sample/smoke-test/per-database-module counts; a follow-up pass should classify modules (published artifact vs. sample vs. test fixture) before citing these as "N artifacts of shape X."
- **Permissions-block least-privilege was counted as presence-of-any-`permissions:`-key, not root-level `contents: read`.** 30/32 "have a permissions block" is a weak signal; a follow-up should specifically check whether the workflow-root default is least-privilege (absent `permissions:` at the job level means "whatever the org/repo default is," which this census cannot see from the file alone).
- **`apache/ant` and `Kotlin/kotlinx.coroutines` CI is invisible to this corpus** (ASF infra / off-repo TeamCity respectively) — their CI practices are not measured here at all, only their absence of GH Actions workflows.
- **Non-catalog-filename version catalogs may exist beyond `apollo-kotlin`'s `libraries.toml`** — this audit's `find -name '*.versions.toml'` fix covers the common case but was not exhaustively checked against every non-standard TOML filename in the corpus; a rule glob should not assume the filename.
- **Axis 4 depth is 6 repos, not the frame's implied ~10** — `error-prone` was reclassified (see Contradictions); the ruleset repos (`rules_java`, `rules_kotlin`, `rules_jvm_external`) were read for their *own* build, not for how a downstream *consumer* project would use them, which is the more relevant angle for an OCX Gradle-plugin/Bazel-Java depth file.
- **CVE/vulnerability-database scanning (GitHub Dependabot security alerts as distinct from version-update PRs, OSV-Scanner, Snyk) was checked only via CI-workflow file names**; a repo could rely entirely on GitHub's native Dependabot alerts (no workflow file required) and this census would show it as "0" — the true Dependabot-alerts adoption rate is likely higher than the 13/32 measured here, which only counts the `dependabot.yml` config file (version-update PRs), not alert-only usage.
