---
title: "Publishing: getting an artifact out, and keeping consumers working"
topic: jvm-publishing
model: opus
id_family: GRADLE-PUB
consolidates:
  - jvm-publishing/central-portal-and-provenance.md
  - jvm-publishing/consumability-across-build-systems.md
builds_on:
  - jvm-audit/exemplar-publishing-ci-bazel.md
  - jvm-audit/config-inventory.md
  - jvm-audit/exemplar-build-shape.md
  - jvm-audit/exemplar-quality-gates.md
  - jvm-topic-map.md (rows M-H-01 … M-H-10)
date: 2026-09-12
---

# Publishing: getting an artifact out, and keeping consumers working

## Verdict

1. **A release is a sequence of gates, not a sequence of steps, because Central is
   immutable.** "Once released/published, you will not be able to remove/update/modify
   your components" ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/)) — the
   only recovery is a new version number. Every rule below exists to stop a build from
   reaching `PUBLISHED` wrong. Binds every consumer kind that publishes at all.
2. **A green release job must mean "live on Central", not "validated".** `autoPublish=false`
   / `waitUntil=validated` is the default and reports success at a state a human still has
   to click. Only `autoPublish=true` + `waitUntil=published` ties the exit code to Central's
   final state. Binds library, SDK and CLI publishers.
3. **The OCX SDK does not hand-roll `maven-publish`.** The corpus majority does (18/32 use
   the raw primitive, 7 of those with no higher-level plugin at all) and we depart from it
   deliberately: pick `com.gradleup.nmcp` — it is Configuration-Cache- and Isolated-Projects-
   compatible by construction via classloader isolation — or `com.vanniktech.maven.publish`
   (8/32, the most-adopted wrapper). `nexus-publish`, `nexus-staging-maven-plugin` and
   `tech.yanand.maven-central-publish` are dead paths (2/32, 0/32, 0/32).
4. **Literal credentials in a publishing repository are a MUST NOT, not a SHOULD NOT** —
   raising `central-portal-and-provenance`'s own severity. On Gradle ≤ 8.x a literal
   `credentials { username = "…" }` hard-fails a config-cache build; on Gradle 9.0+
   ([gradle/gradle#33830](https://github.com/gradle/gradle/pull/33830), milestone 9.0.0 RC1)
   it *silently disables the configuration cache* for that task instead. The dive's own
   rationale concedes there is no case where the literal form is better — and a literal in a
   committed build file is also a secret in version control. A rule with no legitimate
   exception is a MUST.
5. **Gradle Module Metadata stays on, and stays invisible.** GMM costs a Maven or
   Bazel/Coursier consumer nothing (it is never fetched) and buys Gradle consumers
   variant-aware resolution for free. Suppress it only per-module, only when that module
   shades under its own primary coordinates (the `GRADLE-DIST-02` carve-out) —
   `apache__kafka@940c100fab:build.gradle:2068-2070` is the template. Binds library / SDK.
6. **Anything that matters to a non-Gradle consumer must be a classified artifact or a
   separate publication.** A feature variant, a KMP target, or Shadow ≥ 9.0.0's
   `shadowRuntimeElements` variant simply does not exist for Maven or Bazel. Binds SDK.
7. **The tag-versus-declared-version check is a MUST, and its absence in the corpus is the
   argument for it, not against.** 0/32 exemplars derive their version from a tag plugin
   (`axion-release`, `nebula-release`, `reckon`, `gradle-git-version` all zero; 14/32 use a
   literal in `gradle.properties`), so nothing else catches a `v2.1.0` tag against a `2.0.0`
   property. `ocx-sdk-python`'s `release.yml` already does exactly this; carry the shape over.
   Keep the literal-in-`gradle.properties` convention — do not introduce a tag-driven plugin.
8. **Provenance is a commitment we introduce, not a practice we codify.** 0/32 exemplars use
   `actions/attest-build-provenance`, `sigstore/cosign`, `dependency-review-action` or any
   scanner — including `bazelbuild/bazel` and `gradle/gradle` themselves. A bare
   `checkout → ./gradlew publish` workflow is SLSA Build **L0** (no provenance exists at all),
   not L1. Sigstore is a SHOULD (the Portal validates bundles since 2025-01-28, so a consumer
   can act on one); attestation is a CONSIDER (nothing Portal-side validates it yet). Any rule
   text that implies either is current JVM norm is teaching a fiction.
9. **Cross-build-system consumability is proved by a small verification module, never by a
   second build system.** 0/10 Gradle-tagged repos carrying a `pom.xml` actually build with
   both; every one is an `okhttp`-style `maven-tests/` probe. The OCX SDK ships one. Binds SDK.
10. **Maven 4 is not shipping mechanism.** `maven-core` 4.0.0-rc-6 is still the ceiling on
    Central as of 2026-09-12, so `maven.consumer.pom.flatten=true` and `<packaging>bom</packaging>`
    are a dated migration-preview row with a re-check command, never a release-runbook dependency.

## The ruleset

Two families. **GRADLE-PUB** is what an agent needs while editing a Gradle publishing block
or a release workflow; **MVN-PUB** is what it needs inside a `pom.xml`. The rows are kept
apart even where they answer the same question, because the two file kinds load different
rules. Grouped by the check that clears them.

### GRADLE-PUB

#### Group 1 — Preconditions: read the release workflow before it builds anything

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-PUB-01** | Treat Central namespace verification as a checked precondition of the release job, not a failure to retry: prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repo ownership. | There is no third path and no way to upload before verification completes; discovering it at upload wastes the whole build/sign/checksum pass. | The runbook names the method used and where the token lives. A first upload returning `401`/`403` referencing namespace ownership is this rule violated, not a transient error. | MUST | Central Portal (post 2025-06-30) |
| **GRADLE-PUB-02** | Fail the release job when the git tag and the declared build-file version disagree, in a step that runs **before** any build, sign or publish step. | 0/32 exemplars use a tag-driven version plugin, so nothing else enforces the match; `ocx-sdk-python`'s `release.yml:20-28` already does exactly this for the sibling fleet consumer. | The workflow compares `${GITHUB_REF_NAME#v}` against `grep -E '^version=' gradle.properties` (or the `version =` assignment in `build.gradle.kts`) and `exit 1`s on mismatch. No such step = the finding. | MUST | — |
| **GRADLE-PUB-03** | State the immutability consequence — no removal, no update, no re-signing, version bump only — as the first line of the release runbook, above step 1. | Every other gate exists to prevent reaching `PUBLISHED` wrong; an agent that meets the constraint after the ordered steps will design a "fix the release" path that cannot exist. | Reading check: is immutability stated before step 1, or in a footnote? The former passes. No command. | MUST | — |

#### Group 2 — One read of the publishing block and the generated POM clears five rules

Read `build/publications/*/pom-default.xml` after `./gradlew generatePomFileForMavenJavaPublication`
— the build file is not the artifact.

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-PUB-04** | Write `name`, `description`, `url`, ≥1 `licenses` entry, ≥1 `developers` entry and a full `scm` block (`connection`, `developerConnection`, `url`) explicitly inside `pom { }`. | None of the six is derived from any Gradle project property — `from(components["java"])` generates coordinates and `<dependencies>` and nothing else — and Central rejects the deployment **wholesale** on any single missing element. | `for e in name description url licenses developers scm; do grep -q "<$e>" build/publications/*/pom-default.xml \|\| echo "MISSING $e"; done` — any output is the finding. `url` is the one that goes missing (8/32 vs 15-17/32 for the other three). | MUST | — |
| **GRADLE-PUB-05** | Ship a matching `-sources.jar` and `-javadoc.jar` for **every** published artifact, not just the main one; a placeholder jar containing a README is Central's own documented fallback when real sources or docs cannot be produced. | Central checks per-`<artifactId>-<version>.jar` at upload — late, after signing — and rejects the deployment. Agents treat the placeholder as forbidden and then skip the check entirely. | `java { withSourcesJar(); withJavadocJar() }` present (or the wrapper plugin's equivalent), then against the staged bundle: every base jar has a sibling `-sources.jar` and `-javadoc.jar` 1:1. Empty diff = pass. | MUST | — |
| **GRADLE-PUB-06** | Sign every publication, not just the main one, and confirm `.asc`, `.md5` and `.sha1` exist per deployed file. | `.md5`/`.sha1`/`.asc` are hard Central requirements per file; `.sha256`/`.sha512` are supported but not required. A `signing` block scoped to one publication leaves the others unsigned. | `signAllPublications()` (vanniktech) or `signing { sign(publishing.publications) }`; then for each artifact `X` in the staged bundle, `X.md5`, `X.sha1`, `X.asc` must all exist. | MUST | — |
| **GRADLE-PUB-07** | Supply the PGP key to CI in memory (`useInMemoryPgpKeys`, or `ORG_GRADLE_PROJECT_signingInMemoryKey`/`…KeyId`/`…KeyPassword`), not `useGpgCmd`. | `useGpgCmd` needs a configured gpg agent and keyring on the runner; the in-memory path is a secret-shaped env var. Measured 4/32 in-memory vs 2/32 `useGpgCmd` — the majority of signing repos already take the CI-safe path. | `grep -rn 'useGpgCmd\|useInMemoryPgpKeys' --include='*.gradle*' .` — a `useGpgCmd` hit reachable from a CI-invoked task is the finding. Empty output with signing configured means the wrapper plugin handles it; check its docs. | SHOULD | Gradle `signing` plugin |
| **GRADLE-PUB-08** | Never write a `credentials { username = "literal"; password = "literal" }` block; read them through `providers.gradleProperty(…)` / `providers.environmentVariable(…)`. | Gradle ≤ 8.x hard-fails a config-cache build on this shape; Gradle 9.0+ ([#33830](https://github.com/gradle/gradle/pull/33830)) silently disables the configuration cache for that task instead — and a literal in a committed build file is a secret in version control. | `grep -rn -A3 'credentials\s*{' --include='*.gradle.kts' --include='*.gradle' .` — any `username`/`password` bound to a string literal is the finding. Confirm by running the publish task twice: the second run must print the literal line `Reusing configuration cache.` | MUST | Gradle 9.0.0 RC1 changed the failure mode, not the defect |

#### Group 3 — What a non-Gradle consumer sees: read the POM, never the `.module`

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-PUB-09** | Republish any Gradle-only variant that non-Gradle consumers need — a feature variant, a KMP target, Shadow's `shadowRuntimeElements` — as a classified artifact or a separate publication; never leave it GMM-only. | GMM is published *alongside* the POM and never fetched by Maven tooling or by Bazel/Coursier; the POM carries only a `<!-- do_not_remove: published-with-gradle-metadata -->` marker for Gradle's own benefit. A GMM-only variant does not exist for two of the three consumer kinds. | For every `create<MavenPublication>` whose component has >1 variant, confirm a matching `artifact(…)` with an explicit `classifier`, or a written statement that non-Gradle consumption is out of scope for that artifact. | MUST | GMM since Gradle 5; marker text asserted at `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java:69-77` |
| **GRADLE-PUB-10** | Scope any GMM suppression — `GenerateModuleMetadata { enabled = false }`, or `shadow { addShadowVariantIntoJavaComponent = false }` — to the single module that needs it, with the reason in an adjacent comment. | Build-wide suppression discards variant-aware resolution (test fixtures, platform BOM, sources) for consumers who gain nothing from it; the shadow-variant flag exists for `afterEvaluate`-timing conflicts ([shadow#1662](https://github.com/GradleUp/shadow/issues/1662)), not as general advice. | `grep -rn 'GenerateModuleMetadata\|addShadowVariantIntoJavaComponent' --include='*.gradle*' .` — a hit inside a build-wide `allprojects`/`subprojects`/bare `tasks.withType(...).configureEach`, or a `= false` with no adjoining reason, is the finding. | SHOULD | Shadow ≥ 9.1.0 for the opt-out flag (9.0.0 added the variant, on by default) |
| **GRADLE-PUB-11** | To keep a dependency out of a shaded jar but correct in the published POM, put it in Shadow's built-in `shadow` configuration — do not hand-roll `pom.withXml`. | The `shadow` configuration → `RUNTIME`-scope POM mapping has existed since **Shadow 1.1.0 (2014-08-26)**; a hand-rolled loop re-implements a decade-old built-in. The one legitimate exception is kafka's: `shadow` *also* writes those coordinates into the jar's `META-INF/MANIFEST.MF` `Class-Path` header ([shadow#324](https://github.com/GradleUp/shadow/issues/324)), which some artifacts must avoid. | `grep -n 'pom.withXml' **/build.gradle.kts **/build.gradle` — a hit whose body appends `<dependency>` nodes for dependencies also on a Shadow exclude list is deletable in favour of `shadow("g:a:v")`, **unless** a comment names the manifest `Class-Path` objection. | SHOULD | Shadow 1.1.0 |
| **GRADLE-PUB-12** | When publishing a `java-platform` BOM, treat the `api`/`runtime` constraint split as a Gradle-only distinction that collapses on export, and comment any dependency constrained on one side only. | Maven has one `<dependencyManagement>`; the collapse is silent and one-directional, so a divergence surfaces as a Maven consumer resolving a different version than a Gradle consumer of the identical coordinate. | Diff the `api` and `runtime` constraint sets in the platform module's `constraints { }` block; any dependency present in one but not the other needs an explicit comment. Identical sets = pass. | CONSIDER | `java-platform`, 7/32 corpus adoption |
| **GRADLE-PUB-13** | Ship a `maven-consumability` module — a standalone `pom.xml` declaring the SDK's published coordinates plus one smoke test that resolves the runtime classpath — run after `publishToMavenLocal` or against the staged repository, as a release step, never as a second build system. | This is the corpus's real cross-build-system proof: `square__okhttp@dfcfab3824:maven-tests/pom.xml`, `google__dagger@4fbc045d2b:examples/maven/coffee/pom.xml`, `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/`. It is the only mechanism that catches GRADLE-PUB-04/09 defects from the consumer side. | The module's `pom.xml` has no `<parent>` pointing at the Gradle reactor, and its single test exits non-zero when the coordinate does not resolve or a declared class is missing from the classpath. | SHOULD | — |

#### Group 4 — Release-job exit semantics and repository hygiene

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **GRADLE-PUB-14** | Set `autoPublish = true` **and** `waitUntil = "published"` (vanniktech `publishToMavenCentral(automaticRelease = true)`; nmcp `publishingType = "AUTOMATIC"`) in any release job whose exit code is meant to mean "live on Central". | The documented state machine is `PENDING → VALIDATING → VALIDATED → PUBLISHING → PUBLISHED \| FAILED`. Exiting at `VALIDATED` — the default — reports success at a state that still needs a human click and can still fail asynchronously with no CI signal. | `grep -rn 'waitUntil\|automaticRelease\|publishingType' .github/workflows/ **/*.gradle*` — a release job with none of these is implicitly at the weakest (`validated`) state; if that is intended, the job summary must say "validated, not published". | MUST | Central Publisher API |
| **GRADLE-PUB-15** | Never declare `mavenLocal()` in a committed `repositories { }` block. `publishToMavenLocal` as a *producer-side* verification task is unaffected and stays fine. | Gradle's own docs: it "completely bypasses its dependency cache", "can negatively impact performance", and makes "build reproducibility much harder to achieve… their use should be restricted to prototyping rather than production builds". Resolution silently depends on whatever is in that machine's `~/.m2` that day. | `grep -rn 'mavenLocal()' --include='*.gradle.kts' --include='*.gradle' .` — any hit inside a committed `repositories { }` is the finding. **Carve-out:** the GRADLE-PUB-13 consumability probe is a Maven module resolving a deliberately unpublished artifact from the local repo; it is not a Gradle `repositories { }` declaration and this rule does not reach it. | MUST | — |
| **GRADLE-PUB-16** | Author a new release against the Central Portal directly; never against `oss.sonatype.org`/`s01.oss.sonatype.org`, the `io.codearte.nexus-staging` Gradle plugin, or the OSSRH Staging API shim. | OSSRH reached end of life **2025-06-30**; the Staging API is explicitly "a compatibility service that translates a subset of the Nexus 2 APIs to the Portal API" — a migration bridge, never a target. These names dominate pre-2025 training data. | `grep -rn 'oss\.sonatype\.org\|s01\.oss\.sonatype\|nexus-staging\|codearte' .` — any hit outside a migration-history comment is stale. Measured: 3/32 exemplars still carry a reference. | MUST | OSSRH EOL 2025-06-30 |
| **GRADLE-PUB-17** | Sign with Sigstore alongside — never instead of — PGP. | The Portal has validated Sigstore bundles since **2025-01-28**, so a bundle is something a consumer can actually verify; Sonatype states plainly they "are not required to publish at this time" and sets no PGP-replacement date. 0/32 corpus adoption, so this is a deliberate improvement, not a norm. | A `.sigstore.json` bundle beside the `.asc` in the staged deployment. Absence is not a failure; presence **without** the `.asc` is (PGP stays mandatory). | SHOULD | Portal Sigstore validation, 2025-01-28 |
| **GRADLE-PUB-18** | Add `actions/attest-build-provenance` to the release workflow to reach SLSA Build L2, and say in the rule/PR text that this is ahead of the ecosystem rather than matching it. | A bare `checkout → build → upload` workflow emits no machine-verifiable provenance and is Build **L0**, not L1. Adding GitHub's hosted, keyless, Sigstore-backed attestation lifts it to L2 without further hardening. 0/32 corpus adoption, including `bazelbuild/bazel` and `gradle/gradle`. | Presence of the attestation step is a positive signal to note, never a gate to fail CI on. **Do not grep the corpus for this and report violations** — the corpus does not do it, by design of this recommendation. | CONSIDER | SLSA v1.1 Build track |

**GRADLE-PUB tally — 18 rules: 11 MUST, 5 SHOULD, 2 CONSIDER.**
MUST: 01, 02, 03, 04, 05, 06, 08, 09, 14, 15, 16. SHOULD: 07, 10, 11, 13, 17. CONSIDER: 12, 18.

### MVN-PUB

Handed to `rules/maven-build/publishing.md`. Same Portal, different file kind — an agent
editing a `pom.xml` never loads the Gradle rows.

| ID | Rule | Rationale | Verification | Severity | Version floor |
|---|---|---|---|---|---|
| **MVN-PUB-01** | Pin `central-publishing-maven-plugin` to **≥ 0.7.0** before relying on a SNAPSHOT channel. | SNAPSHOT publishing through the Portal *landed in* 0.7.0 — below it the capability does not exist at all, it is not a degraded mode. Current line is 0.9.x. | `grep -A2 'central-publishing-maven-plugin' pom.xml` and compare `<version>` with a real version comparator, not a string compare (`0.10.0 < 0.7.0` lexically). | MUST | 0.7.0 |
| **MVN-PUB-02** | Do not propose `maven.consumer.pom.flatten=true` or `<packaging>bom</packaging>` as shipping mechanism. | Both are Maven 4 only and opt-in; Central's index gives `maven-core` 3.9.16 stable and `4.0.0-rc-6` as the top of the 4.0 line as of 2026-09-12 — no plain `4.0.0` exists. 0/32 corpus usage. An RC feature in a runbook breaks when the RC changes shape. | `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json"` — a `v` matching `4\.0\.0$` with no suffix is the only signal that changes this rule. Query the registry, never the Maven site's own version banner. | MUST | Re-check dated 2026-09-12 |
| **MVN-PUB-03** | Replace any `nexus-staging-maven-plugin` and any `<distributionManagement>` pointing at `oss.sonatype.org` with `central-publishing-maven-plugin`. | 0/32 corpus usage of `nexus-staging-maven-plugin` and 0/32 of `tech.yanand.maven-central-publish`: the OSSRH-era Maven path is dead weight that pre-2025 training data still emits. The Maven-native Portal path is `central-publishing-maven-plugin` (3/32: assertj, error-prone, guava). | `grep -n 'nexus-staging\|oss\.sonatype\.org' pom.xml` must print nothing. Empty output is a pass, not a skipped check. | MUST | OSSRH EOL 2025-06-30 |

**MVN-PUB tally — 3 rules, all MUST. Combined MUST count across both families: 14.**

## Applied to the exemplars and the two future consumers

### Already satisfied by the strict exemplars

| Rule | Who satisfies it, and where |
|---|---|
| GRADLE-PUB-04/05/06 | `square__okhttp@dfcfab3824` via `com.vanniktech.maven.publish.base` — declared `gradle/libs.versions.toml:168`, applied `build.gradle.kts:9`; the wrapper supplies all three by construction |
| GRADLE-PUB-06/07 | `gradle__gradle@ea17004a31` (signing plugin + `useInMemoryPgpKeys`), `JetBrains__Exposed@4be9aee04c`, `mockito__mockito@5a676bcd9e` — 4/32 in-memory, 6/32 signing plugin total |
| GRADLE-PUB-09 | `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/src/test/java/platform/tooling/support/tests/MavenPomFileTests.java:69-77` — a snapshot test asserting the exact GMM marker text in the generated POM, i.e. the consumer view is under test |
| GRADLE-PUB-10 | `apache__kafka@940c100fab:build.gradle:2068-2070` — `tasks.withType(GenerateModuleMetadata) { enabled = false }` scoped inside `project(':clients')` alone, not build-wide. The template |
| GRADLE-PUB-13 | `square__okhttp@dfcfab3824:maven-tests/pom.xml` (imports `okhttp-bom`, declares three artifacts with no versions — the BOM must resolve them); `google__dagger@4fbc045d2b:examples/maven/coffee/pom.xml`; `junit-team__junit-framework@35c56a8e02:platform-tooling-support-tests/` |
| GRADLE-PUB-14 | `apollographql__apollo-kotlin@c145295b72` and `junit-team__junit-framework@35c56a8e02` via `com.gradleup.nmcp`, which forces an explicit `publishingType` |
| MVN-PUB-03 | `assertj__assertj@485502bad2`, `google__error-prone@c1f99ad5d3`, `google__guava@5fb424c43a` — the three `central-publishing-maven-plugin` users; `nexus-staging-maven-plugin` is 0/32 corpus-wide |

### Violated by prominent exemplars

| Rule | Violation |
|---|---|
| GRADLE-PUB-04 | The `url` element is the corpus's standing gap: `pom_licenses`/`pom_developers`/`pom_scm` travel together in 15-17/32 while `pom_url` reaches only **8/32** ([pub audit](jvm-audit/exemplar-publishing-ci-bazel.md):182). A rule that checks licenses+developers+scm and skips `url` passes builds Central would still reject |
| GRADLE-PUB-02 | **0/32.** No exemplar has a tag-vs-version gate, and none uses a tag-driven version plugin (`axion-release`/`nebula-release`/`reckon`/`gradle-git-version` all zero, 14/32 use a literal) ([pub audit](jvm-audit/exemplar-publishing-ci-bazel.md):44). Only `ocx-sdk-python:.github/workflows/release.yml:20-28` satisfies it, cross-language |
| GRADLE-PUB-11 | `apache__kafka@940c100fab:build.gradle:410-420` hand-rolls a 20-line `pom.withXml` loop that Shadow's `shadow` configuration has done for free since 1.1.0 — **deliberately**, to avoid the paired `META-INF/MANIFEST.MF` `Class-Path` write ([shadow#324](https://github.com/GradleUp/shadow/issues/324)), which the rule's exception clause exists to not flag |
| GRADLE-PUB-15 | **42 corpus build files** declare `mavenLocal()` ([jvm-dependencies.md](jvm-dependencies.md), "Deserves another research round"). Per-repo attribution was never done — see Open questions |
| GRADLE-PUB-16 | 3/32 still reference `oss.sonatype.org`: `google__error-prone@c1f99ad5d3`, `bazelbuild__bazel@948b8c70e2`, `apollographql__apollo-kotlin@c145295b72` — SNAPSHOT fallback plumbing, not the release path, but exactly the string an agent copies |
| GRADLE-PUB-17 / -18 | **0/32 each**, including `bazelbuild/bazel` and `gradle/gradle` ([pub audit](jvm-audit/exemplar-publishing-ci-bazel.md):50,410). This is the point: two rules with no precedent, stated as such |
| GRADLE-PUB-14 | The 18/32 raw-`maven-publish` repos (7 with no higher-level plugin at all) have no `waitUntil` equivalent to set; they would need a bespoke Publisher-API polling step or they cannot claim the rule |

### New commitments for the OCX SDK (a case-(c) library, `GRADLE-DIST-01`)

- Publish through `com.gradleup.nmcp` (config-cache and Isolated-Projects compatible by
  classloader isolation) — not raw `maven-publish`, against the corpus majority (verdict 3).
- Full six-field `pom { }` block written by hand; `url` is the one that gets forgotten (PUB-04).
- `withSourcesJar()` + a javadoc/Dokka jar for every published module including the BOM (PUB-05).
- In-memory PGP signing from CI secrets (PUB-07); `autoPublish`+`waitUntil=published` (PUB-14).
- Tag-vs-`gradle.properties` gate as the release workflow's first step, ported from
  `ocx-sdk-python:.github/workflows/release.yml:20-28` (PUB-02).
- GMM stays **on** — the SDK ships no shaded module under primary coordinates, so the
  `GRADLE-DIST-02` carve-out never applies and PUB-10's suppression never fires.
- A `maven-consumability/` module in the `okhttp` shape, run after `publishToMavenLocal` (PUB-13).
- Sigstore bundles beside the `.asc` (PUB-17); `actions/attest-build-provenance` under
  consideration (PUB-18) — both flagged in the PR as ahead of the ecosystem.
- **Open, not decided here:** Java-first vs Kotlin-first decides whether the javadoc-jar
  requirement is met by `javadoc` or by a Dokka HTML jar renamed to the required classifier.

### New commitments for the OCX Gradle plugin (a case-(b) host-loaded plugin)

- Plugin Portal publishing is `GRADLE-PLUG`'s (see [jvm-gradle-plugin-dev.md](jvm-gradle-plugin-dev.md));
  everything in Group 1, Group 2 and Group 4 above applies unchanged if it *also* publishes to Central.
- PUB-08 is the load-bearing one: the plugin is the fleet artifact most likely to carry a
  publishing repository with credentials, and a silently uncached publish task on Gradle 9
  is invisible without the `Reusing configuration cache.` check.
- PUB-09 matters if the plugin ever exposes a marker artifact or a variant beyond the plugin
  marker itself — a Gradle-only variant is fine *here*, because every consumer is a Gradle build.
  State that exemption in the build file so PUB-09 is not mechanically applied.

## AI-agent failure modes

Ranked by how often it bites.

| # | Failure mode | Why the model does it | Mechanical check |
|---|---|---|---|
| 1 | Writes a release against `oss.sonatype.org` / `s01.oss.sonatype.org`, or reaches for `nexus-staging-maven-plugin` / `io.codearte.nexus-staging` | OSSRH dominated training data through 2024; the 2025-06-30 sunset postdates most pretraining | `grep -rn 'oss\.sonatype\.org\|s01\.oss\.sonatype\|nexus-staging\|codearte' .` — any hit outside a migration comment is stale (PUB-16, MVN-PUB-03) |
| 2 | Adds `mavenLocal()` to `repositories { }` to fix a `Could not resolve` error | It is the single most training-data-common fix for that exact message, and it silences the symptom locally every time | `grep -rn 'mavenLocal()' --include='*.gradle*' .`; on any diff touching dependency resolution, check whether `mavenLocal()` appeared in the same change (PUB-15) |
| 3 | Writes inline `credentials { username = "x"; password = "y" }`, or reads properties without a `Provider` | Both compile, both work outside the configuration cache, and the literal is the shortest thing satisfying the API | Run the publish task twice; the second run must print `Reusing configuration cache.` Its absence with no other explanation is this exact bug (PUB-08) |
| 4 | Calls `autoPublish=true, waitUntil=validated` (or omits `waitUntil`) a "fully automated release" | The option names read as sufficient; the `VALIDATED`→`PUBLISHED` gap is invisible from the name | Read the job's final step: does it wait for `PUBLISHED`/`FAILED`, or exit at `VALIDATED`? (PUB-14) |
| 5 | "Modernizes" a publishing block by deleting `pom { }` customization on the theory that GMM now carries the metadata | GMM has been additive since Gradle 5 and was never a POM replacement, but the mental model "newer format supersedes older" is strong | Read `build/publications/*/pom-default.xml` alone and confirm it carries every dependency and all six metadata elements with no `.module` file present (PUB-04, PUB-09) |
| 6 | Reaches for `pom.withXml` the moment a shaded module's POM is missing a dependency | Trained on kafka-shaped examples and on pre-1.1.0 Shadow Stack Overflow answers | Before writing `pom.withXml`: `grep -n '^\s*shadow(' build.gradle.kts` — if the dependency is not there, add it there and delete the block, unless a comment names the `Class-Path` objection (PUB-11) |
| 7 | Presents Maven 4's consumer-POM flattening or `<packaging>bom</packaging>` as available today | "Maven 4" has been discussed as imminent since 2023; a model rounds it up to shipped | Query Central's Solr API for `maven-core`, never the Maven site banner (MVN-PUB-02) — the site header is known to run ahead of what Central serves |
| 8 | Sees `build.gradle*` + `pom.xml` in one repo and wires up a second, parallel Maven release pipeline | "Dual build system" is the obvious reading | `find . -maxdepth 3 -iname pom.xml \| xargs -r dirname` — if every hit's path contains `test`, `example` or `tooling-support`, it is a consumability probe (10/10 in the corpus), not a second build |
| 9 | Assumes Central supports OIDC "trusted publishing" because PyPI does, and writes a tokenless release job | The fleet's own Python SDK uses PyPI trusted publishing, and `config-inventory.md` Axis 3 asserts a Central analogue exists | Nothing in the Portal guide, requirements, Publisher API or registration pages fetched 2026-09-12 describes an OIDC path. Do not write one without a primary source — see Open questions |
| 10 | Frames Sigstore or `attest-build-provenance` as "matching JVM ecosystem norms" | No training signal separates "this is a good idea" from "this is what everyone does" | Cross-check any "as is standard" claim about provenance against the corpus count (0/32) before it goes into a rule (PUB-17, PUB-18) |
| 11 | Cites [shadow#324](https://github.com/GradleUp/shadow/issues/324) as an open POM defect | Pattern-matches kafka's inline comment ("shadow#324" next to a POM patch) | `gh api repos/GradleUp/shadow/issues/324 --jq '.title,.state'` — the title says `Class-Path`, not POM, and it closed 2025-01-24 |

## Conflicts resolved

1. **`maven-publish` × configuration cache: SHOULD (dive) → MUST (here).**
   `central-portal-and-provenance` §Candidate 9 rates the literal-credentials ban a SHOULD
   because Gradle 9 degrades gracefully rather than failing. Raised to MUST: the dive's own
   rationale states there is no case where the literal form is better, the Gradle 8.x
   behaviour is still a hard failure, and a literal credential in a committed build file is a
   secret in version control — three independent reasons, no legitimate exception. Also closes
   [jvm-gradle-core.md](jvm-gradle-core.md) `GRADLE-CACHE-08`'s open "fully / partially /
   broadly incompatible" question: **partially**, scoped to exactly one config shape.
2. **`GRADLE-DIST-13`'s rationale is wrong; its rule survives.**
   [jvm-distribution.md](jvm-distribution.md) `GRADLE-DIST-13` argues "Gradle does not make
   this free: kafka needed a hand-rolled `pom.withXml`". `consumability-across-build-systems`
   §6 shows Shadow's `shadow` configuration → `RUNTIME`-scope POM mapping has existed since
   **1.1.0 (2014-08-26)**, and §7 shows kafka's reason is the coupled manifest `Class-Path`
   write, not a POM defect. Primary docs + changelog + the issue's own title outrank an
   inference drawn from reading kafka's build file. The published-POM-must-match rule stands;
   the mechanism is GRADLE-PUB-11, and DIST-13's rationale clause needs the correction at
   authoring time.
3. **OIDC "trusted publishing" at the Central Portal: asserted, unverified → do not rely on it.**
   [config-inventory.md](jvm-audit/config-inventory.md) Axis 3 states "Central Portal publishing
   supports OIDC-based trusted publishing too (post-OSSRH-sunset) — direct analogue".
   `central-portal-and-provenance` fetched the Portal guide, requirements, Publisher API and
   registration pages on 2026-09-12 and found no OIDC path at any of them. Evidence rank:
   primary-source negative beats an unsourced analogy. The OCX SDK release job uses a Portal
   token in CI secrets; the OIDC claim goes to Open questions, not into a rule.
4. **`mavenLocal()` MUST NOT (PUB-15) vs the consumability probe that needs it (PUB-13).**
   Both dives are right and the collision is real. Resolved by carve-out rather than by
   weakening either: PUB-15 governs a Gradle **consuming** build's `repositories { }` — a
   machine-dependent resolution path for production code. PUB-13's probe is a Maven module
   whose entire purpose is resolving a deliberately-not-yet-public artifact from the local
   repository, and `mvn` reads `~/.m2` as its default mechanism rather than through a declared
   Gradle repository. The carve-out is written into PUB-15's verification cell so an agent
   running the grep does not flag the probe.
5. **Publishing-plugin choice: corpus majority vs recommendation.** 18/32 hand-roll raw
   `maven-publish`; the recommendation is `nmcp` or vanniktech. Resolved by naming the
   departure (verdict 3) rather than following the count: the majority pattern predates both
   the configuration cache and Isolated Projects, and `nmcp` documents compatibility with both
   by construction. A rule that codified the majority here would codify technical debt.
6. **Sigstore SHOULD vs provenance CONSIDER, both at 0/32.** The brief left the Sigstore
   severity open. Split on *whether a consumer can act on the artifact*: Central validates
   Sigstore bundles (since 2025-01-28), so a published bundle is verifiable — SHOULD. Nothing
   Portal-side consumes a GitHub provenance attestation, so its value today is purely
   forward-looking — CONSIDER.

## Open questions

**Needs an owner decision**

1. **Is the OCX SDK Java-first or Kotlin-first?** It decides whether GRADLE-PUB-05's javadoc-jar
   requirement is met by `javadoc` or by a Dokka HTML jar published under the `javadoc`
   classifier, and whether the binary-compatibility gate (which must run *before* upload, since
   PUB-03 makes a bad release unrecoverable) is japicmp or Kotlin BCV —
   see [jvm-language-api.md](jvm-language-api.md) `JAVA-API`/`KT-API`.
2. **Does the SDK publish a SNAPSHOT channel at all?** If not, MVN-PUB-01 is inert and the
   Gradle-side snapshot path never needs settling. If yes, see the research gap below.
3. **Portal token in CI secrets, or hold the release until OIDC is confirmed?** Conflict 3
   above. A token is the only path any primary source describes today.

**Deserves another research round**

- **Central Portal authentication and the Gradle-side SNAPSHOT path** — does the Portal support
  OIDC/tokenless publishing (config-inventory asserts yes, primary sources are silent), and what
  is the snapshot equivalent of `central-publishing-maven-plugin ≥ 0.7.0` for `nmcp` and
  vanniktech? Neither dive covered a Gradle snapshot channel at all.
- **The 42-file `mavenLocal()` census** — which repos, and in which of them is the declaration
  inside a committed consuming `repositories { }` (PUB-15's finding) versus a gitignored local
  override or a consumability probe (the carve-out)? Without per-repo attribution, PUB-15 has a
  count but no named violator.
- **Release-gate ordering for the `jvm-release` skill** — at which point does the
  binary-compatibility gate run relative to sign/checksum/upload, and can a failed `VALIDATED`
  deployment be dropped without burning the version number? Immutability makes the ordering
  load-bearing and no dive established it.
- **Whether `GradleUp/shadow#324`'s 2025-01-24 closure changed the `shadow` configuration's
  manifest `Class-Path` behaviour** or was closed "working as intended, use a different
  configuration name". PUB-11's exception clause depends on the answer; the current docs still
  describe the coupled behaviour, which suggests the latter, but the comment thread was not read.
- **`version-catalog` plugin publishing (M-H-08)** — 1/32 (ktor), deferred by the map to this
  dive and answered by neither. A MAY-level row at most; it earns a rule only if the OCX Gradle
  plugin ships a catalog for consumers.

## Sub-artifacts

- [central-portal-and-provenance.md](jvm-publishing/central-portal-and-provenance.md) — the
  Central Portal as an ordered gate list (namespace, per-file requirements, `autoPublish`/
  `waitUntil`, SNAPSHOT floor, immutability), the settled `maven-publish` × configuration-cache
  and `mavenLocal()` severity questions, and an honest placement of the SLSA/Sigstore bar.
- [consumability-across-build-systems.md](jvm-publishing/consumability-across-build-systems.md) —
  what a Maven, Gradle and Bazel consumer each resolve from the same coordinates; GMM's
  invisibility to Maven; the `java-platform`/BOM triangle; Shadow's POM mechanism dated to
  1.1.0; and the maven-consumability verification module as the corpus's real dual-build pattern.

## Key sources

| URL | Why |
|---|---|
| [central.sonatype.org/publish/requirements/](https://central.sonatype.org/publish/requirements/) | The exact per-file checklist: sources, javadoc, `.asc`, `.md5`, `.sha1`, and the six POM elements — PUB-04/05/06 |
| [central.sonatype.org/publish/publish-portal-api/](https://central.sonatype.org/publish/publish-portal-api/) | The deployment state machine `PENDING→VALIDATING→VALIDATED→PUBLISHING→PUBLISHED\|FAILED` — PUB-14 |
| [central.sonatype.org/publish/publish-portal-maven/](https://central.sonatype.org/publish/publish-portal-maven/) | `central-publishing-maven-plugin` config, `autoPublish`/`waitUntil`, the 0.7.0 SNAPSHOT floor — MVN-PUB-01 |
| [central.sonatype.org/pages/ossrh-eol/](https://central.sonatype.org/pages/ossrh-eol/) | The 2025-06-30 EOL, the Staging API framed as a shim, and the immutability wording — PUB-03, PUB-16 |
| [central.sonatype.org/register/central-portal/](https://central.sonatype.org/register/central-portal/) | Namespace verification as a precondition; DNS TXT vs `io.github.*` GitHub ownership — PUB-01 |
| [central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/) | "Sigstore signature files are not required to publish at this time" — why PUB-17 is a SHOULD |
| [slsa.dev/spec/v1.1/levels](https://slsa.dev/spec/v1.1/levels) | The L0/L1/L2 definitions that place a bare Actions release at L0 — PUB-18 |
| [docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html](https://docs.gradle.org/current/userguide/publishing_gradle_module_metadata.html) | GMM is published *alongside* the POM, never instead; the marker comment; "degraded mode" — PUB-09 |
| [docs.gradle.org/current/userguide/publishing_maven.html](https://docs.gradle.org/current/userguide/publishing_maven.html) | What `from(components["java"])` does and does not generate — PUB-04 |
| [docs.gradle.org/current/userguide/declaring_repositories_basics.html](https://docs.gradle.org/current/userguide/declaring_repositories_basics.html) | The actual `mavenLocal()` warning — "restricted to prototyping rather than production builds" — PUB-15 |
| [gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040) + [#33830](https://github.com/gradle/gradle/pull/33830) | The before/after failure-mode change for literal credentials, pinned to 9.0.0 RC1 — PUB-08 |
| [gradleup.com/shadow/publishing/](https://gradleup.com/shadow/publishing/) + [CHANGELOG](https://raw.githubusercontent.com/GradleUp/shadow/main/CHANGELOG.md) | The `shadow` configuration → `RUNTIME`-scope POM mapping dated to 1.1.0, and the 9.0.0 `shadowRuntimeElements` GMM variant — PUB-10, PUB-11 |
| [GradleUp/nmcp README](https://raw.githubusercontent.com/GradleUp/nmcp/main/README.md) + [docs](https://gradleup.com/nmcp/) | Settings-plugin credentials and the Configuration-Cache/Isolated-Projects compatibility claim — verdict 3 |
| [vanniktech/gradle-maven-publish-plugin central setup](https://vanniktech.github.io/gradle-maven-publish-plugin/central/) | `publishToMavenCentral(automaticRelease = true)`, `signAllPublications()`, in-memory signing env vars — PUB-07, PUB-14 |
| [bazel-contrib/rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | `maven_install.json` as the post-pin source of truth, `boms =`, `version_conflict_policy` — the Bazel consumer's view |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Build POM vs consumer POM, `maven.consumer.pom.flatten`, `bom` packaging — all opt-in and RC — MVN-PUB-02 |

## Revision log (2026-09-13, orchestrator)

**`GRADLE-PUB-15` census (authoring-notes §12 defect 1) — settled, the number may ship with its attribution.** One grep over the 32 exemplar clones (`grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'mavenLocal()'`, 2026-09-13): 53 declarations in 42 distinct files across 8 of 32 repos (grpc-java 21 files, dagger 19, kotlinx.coroutines 8, and one each in NullAway, mockito, ktor, Exposed, guava). Attribution by context:

| Class | Files | Where |
|---|---|---|
| Integration-test or example build consuming the just-published local artifact (the `publishToMavenLocal`-then-verify pair the rule permits) | 37 | grpc-java `examples/**` (20), dagger `javatests/artifacts/**` (17) |
| Same, but in a build-support tree | 4 | guava `integration-tests/gradle`, kotlinx.coroutines `integration-testing/**` and `buildSrc/**` |
| Guarded by a property (`shouldUseLocalMaven(rootProject)`) or a CI-only init script | 3 declarations | kotlinx.coroutines root (2 of its 3 declarations), NullAway `.github/workflows/use-snapshot.gradle.kts` |
| A publish *target* under `publishing.repositories`, not consumption | 1 | ktor `build-logic/.../ktorbuild.publish.gradle.kts` |
| Bare `mavenLocal()` in a main build's consuming `repositories { }` — the finding | 4 | Exposed root (listed *before* `mavenCentral()`), dagger `tools/shader`, grpc-java root (scoped with `metadataSources`), mockito root `buildscript` (commented "for local testing") |

So the honest sentence is: 42 files declare it, 4 of them are the anti-pattern the rule targets, and the rest are the carve-out. The drafted artifacts ship the mechanism and the carve-out without the count (checked 2026-09-13: no shipped file carries "42").

**`MVN-PUB-04` to `MVN-PUB-10` allocated at authoring (2026-09-13).** The consolidation shipped three MVN-PUB rows; the `maven-build/publishing.md` drafter transposed seven GRADLE-PUB rows to the `pom.xml` glob under the notes' parallel-row principle (§4) and allocated the IDs itself. The review flagged the allocation as unrecorded, not the content, which each parent row supports. Recorded here so a later reviser resolves the IDs. The MVN-PUB tally is now **10 rules, all MUST**.

| Maven row | Transposes | Subject |
|---|---|---|
| MVN-PUB-04 | GRADLE-PUB-01 | Central namespace verification as a checked precondition |
| MVN-PUB-05 | GRADLE-PUB-02 | Tag-versus-`<version>` gate before build, sign or deploy |
| MVN-PUB-06 | GRADLE-PUB-08 | Credentials in `settings.xml` `<server>`, never in `pom.xml` |
| MVN-PUB-07 | GRADLE-PUB-04 | Required POM elements (name, description, url, licenses, developers, scm) |
| MVN-PUB-08 | GRADLE-PUB-05 | Sources and javadoc jars bound in the release profile |
| MVN-PUB-09 | GRADLE-PUB-06 | Sign every deployed file with `maven-gpg-plugin` in batch mode |
| MVN-PUB-10 | GRADLE-PUB-14 | `autoPublish` plus `waitUntil=published` so green means live |
