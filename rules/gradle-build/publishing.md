---
title: Publishing a Gradle Build to Central
summary: The GRADLE-PUB family, covering the publishing plugin and its credentials, the POM metadata Central rejects on, the signed per-file bundle, Gradle Module Metadata and what a non-Gradle consumer actually resolves, release-job exit semantics, and the dead OSSRH paths
---

# Publishing a Gradle Build to Central

Owns getting a Gradle build's artifacts onto Maven Central through the Central
Portal and keeping the people who consume them working: the publishing plugin,
the credentials it reads, the generated POM, Gradle Module Metadata and the
variants a Maven or Bazel consumer cannot see, the signed per-file bundle, and
what a green release job is allowed to mean. It does not own producing something
that runs, which is fat jars, start scripts, runtime images and containers in the
GRADLE-DIST family. Publishing a plugin to the Gradle Plugin Portal, the plugin
marker and the TestKit cross-version matrix are GRADLE-PLUG. Repositories you
resolve *from*, version catalogs, locking and verification metadata are
GRADLE-DEP, and the pipeline that runs the release job is GRADLE-CI. The
binary-compatibility gate that must pass before an upload is JAVA-API in the
`java-quality` rule and KT-API in `kotlin-quality`. The Maven statement of these
same Portal gates is MVN-PUB in the separate `maven-build` rule, which a
`build.gradle.kts` edit never loads, so every row here is complete on its own.

Contents: [Before Anything Is Built](#before-anything-is-built) ·
[The Publishing Block and Its Credentials](#the-publishing-block-and-its-credentials) ·
[One Read of the Generated POM](#one-read-of-the-generated-pom) ·
[Proving It From the Consumer Side](#proving-it-from-the-consumer-side) ·
[The Bundle Central Validates at Upload](#the-bundle-central-validates-at-upload) ·
[What a Green Release Job Means](#what-a-green-release-job-means) ·
[Provenance, Ahead of the Ecosystem](#provenance-ahead-of-the-ecosystem) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Before Anything Is Built

**Central is immutable.** Sonatype's own wording is that once a component is
published you cannot remove, update or modify it. There is no re-sign, no patch,
no re-upload of a consumed version. The only recovery is a new version number.
Say that in the release runbook above step 1 rather than after the ordered steps,
because an agent that meets the constraint late designs a "fix the release" path
that cannot exist. Every row in this file is a gate that stops a build from
reaching `PUBLISHED` wrong.

Gate: read the release workflow top to bottom before opening any build file, and
confirm both preconditions below are steps in it rather than assumptions.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-01 | Treat Central namespace verification as a checked precondition of the release job, not a failure to retry. Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership. | There is no third path and no way to upload before verification completes. Discovering it at upload wastes the whole build, sign and checksum pass, and on an immutable registry that pass is the cheap half of what is lost. | Reading check, no command. The runbook names which of the two methods was used and where the Portal token lives. A first upload returning `401` or `403` referencing namespace ownership is this rule violated, not a transient error to retry. | MUST |
| GRADLE-PUB-02 | Fail the release job when the git tag and the declared build-file version disagree, in a step that runs before any build, sign or publish step. | 0 of 32 measured JVM repositories derive their version from a tag-driven plugin (axion-release, nebula-release, reckon and gradle-git-version are each at zero, and 14 of 32 carry a literal in `gradle.properties`), so nothing else enforces the match. A mismatch found after upload burns the version number permanently. | `grep -rn -e 'GITHUB_REF_NAME' -e 'github.ref_name' .github/workflows`. Empty output is the finding, not the pass. On a hit, read the step: it compares the tag against the `version` line in `gradle.properties` and exits non-zero on mismatch, before anything is compiled. | MUST |

## The Publishing Block and Its Credentials

Both rows are read off the build files, and the second is confirmed by running
the publish task twice.

Gate, two greps over the build scripts:

- `grep -rn -A3 --include='*.gradle.kts' --include='*.gradle' 'credentials' .`
- `grep -rn -e 'useGpgCmd' -e 'useInMemoryPgpKeys' --include='*.gradle.kts' --include='*.gradle' .`

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-08 | Never write a `credentials { }` block whose `username` or `password` is bound to a string literal. Read both through `providers.gradleProperty(...)` or `providers.environmentVariable(...)`. | Gradle 8.x and below hard-fail a configuration-cache build on this shape. Gradle 9.0.0 RC1 changed the failure mode, not the defect ([gradle/gradle#33830](https://github.com/gradle/gradle/pull/33830), verified 2026-09-12): the build now *silently disables* the configuration cache for that task, so the publish task quietly stops being cached and nothing says so. A literal in a committed build file is also a secret in version control. | The first gate grep: any `username` or `password` bound to a string literal is the finding, and empty output is the pass. Confirm by running the publish task twice. The second run must print the literal line `Reusing configuration cache.`, and its absence with no other explanation is this defect. | MUST |
| GRADLE-PUB-07 | Supply the PGP key to CI in memory, through `useInMemoryPgpKeys` or the `ORG_GRADLE_PROJECT_signingInMemoryKey`, `...KeyId` and `...KeyPassword` environment variables, rather than `useGpgCmd`. | `useGpgCmd` needs a configured gpg agent and keyring on the runner, so the release signs on a developer machine and fails in CI, usually after the artifacts have been assembled. Measured 4 of 32 repositories in memory against 2 using `useGpgCmd`, so the CI-safe path is already the majority among signing repositories. | The second gate grep: a `useGpgCmd` hit reachable from a CI-invoked task is the finding. Empty output is **not** automatically a pass. With signing configured, empty output means a wrapper plugin supplies the key, so read that plugin's documentation before concluding anything. | SHOULD |

```kotlin
// wrong: hard-fails config cache on Gradle 8.x, silently disables it on 9.x, and commits a secret
repositories { maven { url = uri(portalUrl); credentials { username = "deploy-bot"; password = "s3cr3t" } } }
```

```kotlin
// right: a Provider, so the value is read at execution time and never stored in the build file
repositories { maven { url = uri(portalUrl); credentials {
  username = providers.environmentVariable("CENTRAL_USERNAME").get()
  password = providers.environmentVariable("CENTRAL_PASSWORD").get()
} } }
```

## One Read of the Generated POM

The build file is not the artifact. `from(components["java"])` generates
coordinates and a `<dependencies>` list and nothing else, so everything Central
checks has to be written by hand and then read back off the generated file.

Gate: run `./gradlew generatePomFileForMavenJavaPublication` (substitute your
publication's name), then read `build/publications/mavenJava/pom-default.xml`.
Four rows clear on that one read plus two greps.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-04 | Write `name`, `description`, `url`, at least one `licenses` entry, at least one `developers` entry and a full `scm` block (`connection`, `developerConnection`, `url`) explicitly inside `pom { }`, for every publication including a BOM or platform. | None of the six is derived from any Gradle project property, and Central rejects the deployment **wholesale** on any single missing element, at upload, after signing. `url` is the element that goes missing: present in 8 of 32 measured repositories against 15 to 17 for licenses, developers and scm. A check that covers the familiar three still passes a POM Central will reject. | `for e in name description url licenses developers scm; do [ "$(xmllint --xpath "boolean(/*/*[local-name()='$e'])" build/publications/mavenJava/pom-default.xml 2>/dev/null)" = true ] \|\| echo "MISSING $e"; done`. Any output is the finding, empty output is the pass. A grep on the element name cannot work here: `<url>` also appears inside `<scm>`, so a POM missing the project-level `url`, the element this row exists for, passes a grep. Run it against every publication that is deployed, not only the primary one. | MUST |
| GRADLE-PUB-09 | Republish any Gradle-only variant that non-Gradle consumers need, whether a feature variant, a KMP target or Shadow's `shadowRuntimeElements`, as a classified artifact or a separate publication. Never leave it visible only in Gradle Module Metadata. | GMM is published *alongside* the POM and is never fetched by Maven tooling or by Bazel and Coursier. All the POM carries for them is a `do_not_remove: published-with-gradle-metadata` marker comment for Gradle's own benefit, which junit-framework's own test suite asserts as a golden line. A GMM-only variant therefore does not exist for two of the three consumer kinds. | Reading check against the generated POM. For each publication whose component carries more than one variant, confirm a matching `artifact(...)` with an explicit classifier, or a written statement in the build file that non-Gradle consumption is out of scope for that artifact. `grep -rn -e 'registerFeature' -e 'shadowRuntimeElements' --include='*.gradle.kts' --include='*.gradle' .` lists the variants worth checking, and empty output means there are none, which is a pass. | MUST |
| GRADLE-PUB-10 | Scope any GMM suppression, whether `GenerateModuleMetadata { enabled = false }` or `shadow { addShadowVariantIntoJavaComponent = false }`, to the single module that needs it, with the reason in an adjacent comment. | Build-wide suppression discards variant-aware resolution (test fixtures, platform BOMs, sources) for consumers who gain nothing from the suppression. The shadow-variant flag exists for `afterEvaluate` timing conflicts, not as general advice. Shadow 9.0.0 added the variant on by default and 9.1.0 added the opt-out flag, verified 2026-09-12. kafka is the template: it disables the task for its shaded clients module alone, not build-wide. | `grep -rn -e 'GenerateModuleMetadata' -e 'addShadowVariantIntoJavaComponent' --include='*.gradle.kts' --include='*.gradle' .`. A hit inside `allprojects`, `subprojects` or a bare `tasks.withType(...).configureEach`, or a `= false` with no adjoining comment naming the reason, is the finding. Empty output is the pass. | SHOULD |
| GRADLE-PUB-11 | To keep a dependency out of a shaded jar but correct in the published POM, declare it in Shadow's built-in `shadow` configuration. Do not hand-roll `pom.withXml`. | The `shadow` configuration to `RUNTIME`-scope POM mapping has existed since Shadow 1.1.0, released 2014-08-26 and verified 2026-09-12, so a hand-rolled loop reimplements a decade-old built-in. The one legitimate exception is kafka's: the `shadow` configuration *also* writes those coordinates into the jar's `META-INF/MANIFEST.MF` `Class-Path` header, which some artifacts must avoid. GRADLE-DIST-13, which the GRADLE-DIST family owns in this rule's distribution file, cites this row for the mechanism. | `grep -rn 'pom.withXml' --include='*.gradle.kts' --include='*.gradle' .`. A hit whose body appends dependency nodes for coordinates that also sit on a Shadow exclude list is deletable in favour of a `shadow(...)` declaration, unless an adjacent comment names the manifest `Class-Path` objection. Empty output is the pass. | SHOULD |

```kotlin
// wrong: XML surgery for a mapping Shadow has shipped since 1.1.0
pom.withXml { asNode().appendNode("dependencies").let { n -> unshadedCoords.forEach { /* ... */ } } }
```

```kotlin
// right: one declaration, and the POM comes out with RUNTIME scope
dependencies { shadow("org.slf4j:slf4j-api:2.0.17") }
```

## Proving It From the Consumer Side

A generated POM that reads correctly and a coordinate that actually resolves are
different claims. The only mechanism in the measured corpus that tests the second
one is a small probe module, and it is the only thing that catches a
GRADLE-PUB-04 or GRADLE-PUB-09 defect from outside Gradle.

Gate: `./gradlew publishToMavenLocal`, then build the probe module against the
published coordinates.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-13 | Prove cross-build-system consumability with a small standalone verification module, never with a second build system. Ship one `pom.xml` declaring the published coordinates plus one smoke test that resolves the runtime classpath, and run it after `publishToMavenLocal` or against the staged repository, as a release step. | 0 of the 10 Gradle-tagged repositories carrying a `pom.xml` actually build with both systems. Every one is a probe, in the shape okhttp, dagger and junit-framework each ship. A second real pipeline doubles the release surface and still proves nothing about what a consumer resolves. | `find . -maxdepth 3 -iname pom.xml \| xargs -r dirname` locates the probe. For a build that claims Maven consumers, empty output is the finding. On a hit, confirm the module's `pom.xml` has no `<parent>` pointing at the Gradle reactor and that its test exits non-zero when a coordinate does not resolve or a declared class is missing from the classpath. | SHOULD |
| GRADLE-PUB-12 | When publishing a `java-platform` BOM, treat the `api` and `runtime` constraint split as a Gradle-only distinction that collapses on export, and comment any dependency constrained on one side only. | Maven has a single `<dependencyManagement>` section, so the collapse is silent and one-directional. The divergence surfaces later as a Maven consumer resolving a different version than a Gradle consumer of the identical coordinate, with nothing in either build pointing at the cause. | Diff the `api` and `runtime` constraint sets in the platform module's `constraints { }` block. Identical sets is the pass. Any dependency present in one set and not the other needs an explicit comment. No `java-platform` module in the build makes this row inert, which is also a pass. | CONSIDER |

## The Bundle Central Validates at Upload

Both rows are checked against the assembled bundle, never against the build file.
A declaration proves a jar is configured for the module it sits in, not that it
exists for every deployed artifact.

Gate: `./gradlew publishToMavenLocal`, then list what actually landed under the
group's directory in the local repository and count the siblings.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-05 | Ship a matching `-sources.jar` and `-javadoc.jar` for **every** published artifact, not just the primary one. A placeholder jar containing a README is Central's own documented fallback where real sources or docs cannot be produced. | Central checks per artifact and version at upload, which is late, after signing, and rejects the whole deployment. Agents treat the placeholder as forbidden and then skip the requirement entirely for BOM and platform modules rather than shipping the sanctioned stub. | From the staged listing, every base jar has a `-sources.jar` and a `-javadoc.jar` sibling, one to one. A base jar with no sibling pair is the finding, a clean one-to-one listing is the pass. `grep -rn -e 'withSourcesJar' -e 'withJavadocJar' --include='*.gradle.kts' --include='*.gradle' .` shows the declaration, which is necessary and never sufficient. | MUST |
| GRADLE-PUB-06 | Sign every publication rather than one named publication, and confirm that `.asc`, `.md5` and `.sha1` exist for each deployed file. | `.asc`, `.md5` and `.sha1` are hard per-file Central requirements, while `.sha256` and `.sha512` are accepted and not required. A `signing` block scoped to a single publication by name leaves every other publication unsigned, and the rejection arrives at upload. | From the staged listing, the count of `.asc` files equals the count of deployable files, and the same for `.md5` and `.sha1`. Any shortfall is the finding. `grep -rn -e 'signAllPublications' -e 'sign(publishing.publications' --include='*.gradle.kts' --include='*.gradle' .`. A `signing` block naming one publication instead is the defect this row exists for. | MUST |

## What a Green Release Job Means

Gate: `grep -rn -e 'waitUntil' -e 'automaticRelease' -e 'publishingType' .` and
then read the release job's final step, asking which deployment state it exits
at and which repository it points at.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-14 | Set `autoPublish = true` **and** `waitUntil = "published"` in any release job whose exit code is meant to mean "live on Central". The shipped spellings are `publishToMavenCentral(automaticRelease = true)` for vanniktech and `publishingType = "AUTOMATIC"` for nmcp. **Pinned default**: publish through `com.gradleup.nmcp`, or `com.vanniktech.maven.publish`, rather than hand-rolling `maven-publish`. An adopter overrides this once, in one place. | The documented state machine is `PENDING`, `VALIDATING`, `VALIDATED`, `PUBLISHING`, then `PUBLISHED` or `FAILED`. The default exits at `VALIDATED`, reporting success at a state that still needs a human click and can still fail asynchronously with no CI signal. The pinned default departs deliberately from the 18-of-32 raw-`maven-publish` majority: that pattern predates both the configuration cache and Isolated Projects, and nmcp documents compatibility with both by construction through classloader isolation. `nexus-publish`, `nexus-staging-maven-plugin` and `tech.yanand.maven-central-publish` are dead paths at 2 of 32, 0 and 0. | The gate grep. A release job with none of the three keys sits at the weakest state, which is the finding unless the job summary says in words "validated, not published". A raw `maven-publish` build has no `waitUntil` to set at all and needs a bespoke Publisher API polling step before it can claim this row. | MUST |
| GRADLE-PUB-16 | Author a new release against the Central Portal directly. Never against `oss.sonatype.org` or `s01.oss.sonatype.org`, the `io.codearte.nexus-staging` plugin, or the OSSRH Staging API shim. | OSSRH reached end of life 2025-06-30, and the Staging API is explicitly a compatibility service translating a subset of the Nexus 2 APIs to the Portal API, which makes it a migration bridge and never a target. These names dominate pre-2025 training data, and 3 of 32 measured repositories still carry a reference, mostly as SNAPSHOT fallback plumbing rather than the release path. | `grep -rn -e 'oss.sonatype.org' -e 's01.oss.sonatype' -e 'nexus-staging' -e 'codearte' .` must print nothing. Empty output is the pass, not a skipped check. Any hit outside a migration-history comment is stale, including one in SNAPSHOT plumbing, because that is exactly the string an agent copies. | MUST |
| GRADLE-PUB-15 | Never declare `mavenLocal()` in a committed `repositories { }` block. `publishToMavenLocal` as a producer-side verification task is unaffected and stays fine. | Gradle's own documentation says it "completely bypasses its dependency cache", "can negatively impact performance", and makes "build reproducibility much harder to achieve", restricting it to prototyping rather than production builds. Resolution then depends silently on whatever is in that machine's `~/.m2` that day, so the build is green on the laptop that seeded it and red everywhere else. | `grep -rn 'mavenLocal()' --include='*.gradle.kts' --include='*.gradle' .`. Any hit inside a committed `repositories { }` block is the finding, and empty output is the pass. **Carve-out:** the GRADLE-PUB-13 probe is a Maven module reading `~/.m2` through Maven's own default mechanism, not a Gradle `repositories { }` declaration. This rule does not reach it, so do not flag it. | MUST |

## Provenance, Ahead of the Ecosystem

Both rows sit at 0 of 32 corpus adoption, including bazel and gradle themselves.
That is the point: they are deliberate improvements, and any rule text or PR
description presenting either as current JVM norm is teaching a fiction. The
severity split is whether a consumer can act on the artifact today.

Gate: list the staged deployment and look for a `.sigstore.json` beside each
`.asc`, then read the release workflow's steps.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-PUB-17 | Sign with Sigstore alongside PGP, never instead of it. | The Portal has validated Sigstore bundles since 2025-01-28, verified 2026-09-12, so a published bundle is something a consumer can actually verify. Sonatype states plainly that Sigstore signature files "are not required to publish at this time" and sets no date for replacing PGP, so dropping the `.asc` breaks the upload. | A `.sigstore.json` bundle beside each `.asc` in the staged deployment. Absence is not a failure. Presence **without** the `.asc` is the finding, because PGP stays mandatory. | SHOULD |
| GRADLE-PUB-18 | Add `actions/attest-build-provenance` to the release workflow to reach SLSA v1.1 Build L2, and say in the PR text that this is ahead of the ecosystem rather than matching it. | A bare checkout, build and upload workflow emits no machine-verifiable provenance at all, which is Build L0 and not L1. GitHub's hosted, keyless, Sigstore-backed attestation lifts it to L2 with no further hardening. Nothing Portal-side consumes the attestation yet, which is why this is a CONSIDER and not a SHOULD. | `grep -rn 'attest-build-provenance' .github/workflows`. A hit is a positive signal worth noting in the PR text. Empty output is **not** a finding and this row never gates CI. Do not survey a codebase for this and report violations. | CONSIDER |

## What Agents Get Wrong Here

1. **Writing a release against `oss.sonatype.org` or `s01.oss.sonatype.org`, or
   reaching for `nexus-staging-maven-plugin` or `io.codearte.nexus-staging`.**
   The highest-frequency failure by a wide margin. OSSRH dominated training data
   through 2024 and the 2025-06-30 sunset postdates most pretraining, so the dead
   path is the fluent one (GRADLE-PUB-16).
2. **Adding `mavenLocal()` to `repositories { }` to clear a `Could not resolve`
   error.** The most training-data-common fix for that exact message, and it
   silences the symptom locally every time. On any diff touching dependency
   resolution, check whether `mavenLocal()` arrived in it (GRADLE-PUB-15).
3. **Writing inline `credentials { username = "x"; password = "y" }`, or reading
   properties without a `Provider`.** Both compile, both work outside the
   configuration cache, and the literal is the shortest thing that satisfies the
   API. On Gradle 9 the only symptom is a missing `Reusing configuration cache.`
   line (GRADLE-PUB-08).
4. **Calling `autoPublish = true` with `waitUntil` unset a fully automated
   release.** The option names read as sufficient and the `VALIDATED` to
   `PUBLISHED` gap is invisible from them (GRADLE-PUB-14).
5. **"Modernising" a publishing block by deleting `pom { }` customisation on the
   theory that Gradle Module Metadata now carries the metadata.** GMM has been
   additive since Gradle 5 and was never a POM replacement, but the mental model
   that a newer format supersedes an older one is strong. Read the generated POM
   alone and confirm it still carries every dependency and all six elements
   (GRADLE-PUB-04, GRADLE-PUB-09).
6. **Reaching for `pom.withXml` the moment a shaded module's POM is missing a
   dependency.** Trained on kafka-shaped examples and on Shadow answers that
   predate 1.1.0. Check the `shadow` configuration first and delete the block
   (GRADLE-PUB-11).
7. **Assuming Central supports OIDC trusted publishing because PyPI does, and
   writing a tokenless release job.** Nothing in the Portal guide, the
   requirements page, the Publisher API or the registration pages described an
   OIDC path when all four were read on 2026-09-12. A Portal token in CI secrets
   is the only path any primary source documents. Do not write one without a
   primary source.
8. **Seeing `build.gradle.kts` and `pom.xml` in one repository and wiring up a
   second, parallel Maven release pipeline.** In the measured corpus every such
   `pom.xml` sits under a test, example or tooling-support path and is a
   consumability probe, not a second build system (GRADLE-PUB-13).
9. **Framing Sigstore or build provenance as matching JVM ecosystem norms.** No
   training signal separates "this is a good idea" from "this is what everyone
   does". Cross-check any "as is standard" provenance claim against the 0-of-32
   count before it reaches a rule or a PR description (GRADLE-PUB-17, -18).
