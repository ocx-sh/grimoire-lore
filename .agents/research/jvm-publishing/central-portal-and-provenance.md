---
title: The Central Portal runbook, the maven-publish cache trap, and how far provenance has actually got
topic: jvm-publishing
agent: central-portal-and-provenance
model: sonnet
date_researched: 2026-09-12
sources_count: 19
scope: |
  Covers: Central Portal publishing as a sequence of gates (namespace verification,
  per-artifact requirements, autoPublish/waitUntil, SNAPSHOT floor, immutability),
  the maven-publish x configuration-cache interaction on Gradle 9, mavenLocal()
  severity, and an honest placement of the supply-chain/provenance bar for a first
  OCX SDK release. Does not cover: GMM-vs-POM consumability across build systems
  (owned by the sibling `consumability-across-build-systems` dive), BOM/platform
  publishing mechanics (GRADLE-PUB M-H-07, owned by `jvm-dependencies.md`), or
  Gradle plugin-portal publishing (owned by `jvm-gradle-plugin-dev.md`).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Namespace verification is the mandatory precondition](#1-namespace-verification-is-the-mandatory-precondition)
   2. [The per-artifact requirement set](#2-the-per-artifact-requirement-set)
   3. [Publishing paths measured in the corpus](#3-publishing-paths-measured-in-the-corpus)
   4. [autoPublish and waitUntil: what each means for a CI job's exit](#4-autopublish-and-waituntil-what-each-means-for-a-ci-jobs-exit)
   5. [SNAPSHOT publishing needs central-publishing-maven-plugin ≥ 0.7.0](#5-snapshot-publishing-needs-central-publishing-maven-plugin--070)
   6. [OSSRH sunset and the Staging API as a bridge, not a target](#6-ossrh-sunset-and-the-staging-api-as-a-bridge-not-a-target)
   7. [Immutability is an absolute](#7-immutability-is-an-absolute)
   8. [SETTLED — maven-publish × configuration cache on Gradle 9](#8-settled--maven-publish--configuration-cache-on-gradle-9)
   9. [SETTLED — mavenLocal() severity](#9-settled--mavenlocal-severity)
   10. [The supply-chain bar, placed honestly](#10-the-supply-chain-bar-placed-honestly)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Namespace verification (DNS TXT for a reverse-domain namespace, or GitHub repo ownership for `io.github.*`) is a one-time account precondition that gates every later step — there is no path to upload a component to an unverified namespace ([publish-portal-guide](https://central.sonatype.org/publish/publish-portal-guide/)).
- Every deployed file needs a `.md5` and `.sha1` checksum (mandatory) plus a `.asc` GPG/PGP signature; `.sha256`/`.sha512` are supported but not required ([requirements](https://central.sonatype.org/publish/requirements/)).
- Every non-placeholder artifact needs a matching `-sources.jar` and `-javadoc.jar`; a placeholder jar with a README is Central's own documented fallback when real sources/docs cannot be produced — not a gap to leave silently unfilled ([requirements](https://central.sonatype.org/publish/requirements/)).
- The POM is rejected wholesale, not partially, if `name`, `description`, `url`, `licenses`, `developers`, or `scm` is missing — this is a hard upload-time gate, not a lint warning ([requirements](https://central.sonatype.org/publish/requirements/)).
- `autoPublish=false` (the default) stops at `VALIDATED` and needs a human click; `autoPublish=true` plus `waitUntil=published` is the only combination where a CI job's exit code reflects the artifact actually reaching Central, not just passing validation ([publish-portal-maven](https://central.sonatype.org/publish/publish-portal-maven/), [Publisher API](https://central.sonatype.org/publish/publish-portal-api/)).
- SNAPSHOT publishing through the Central Portal requires `central-publishing-maven-plugin` **≥ 0.7.0** — anything older cannot publish snapshots at all, it is not a degraded mode ([publish-portal-maven](https://central.sonatype.org/publish/publish-portal-maven/) plugin changelog referenced there).
- OSSRH reached end-of-life on **2025-06-30**; the "OSSRH Staging API Service" is an explicitly-labeled compatibility shim translating a subset of Nexus 2 APIs to the Portal API, positioned as a migration bridge, never as where a new project should start ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/), [sunset announcement](https://central.sonatype.org/news/20250326_ossrh_sunset/)).
- Once a component is `PUBLISHED`, Central will not let you remove, update, or modify it — "you will not be able to remove/update/modify your components" — the only recovery from a bad release is a new version number ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/)).
- **maven-publish on Gradle 9 is partially, not broadly, incompatible with the configuration cache**: [gradle/gradle#33830](https://github.com/gradle/gradle/pull/33830) (merged 2025-06-13, milestone 9.0.0 RC1) changed the failure mode for one specific case — a `credentials { username = "..."; password = "..." }` block with **literal, inline** values — from a hard build failure (Gradle 8.x) to *silently disabling the configuration cache for that publish task* (Gradle 9.0+). Provider-, property-, or environment-backed credentials are unaffected.
- The March-2025 Gradle blog's compatibility table marks Maven Publish with a bare warning triangle and no further detail — read alone it overstates the problem; the actual gap closed in code three months later is exactly one config shape ([road-to-configuration-cache](https://blog.gradle.org/road-to-configuration-cache)).
- The only reliable pass signal for "was this publish task cached" is the literal string `Reusing configuration cache.` on a second identical invocation — a green build tells you nothing.
- `mavenLocal()` as a repository in a **consuming** build is not a Gradle oversight to patch around — Gradle's own docs state it "completely bypasses its dependency cache," "can negatively impact performance," and "makes build reproducibility much harder to achieve," concluding "their use should be restricted to prototyping rather than production builds" ([declaring_repositories_basics](https://docs.gradle.org/current/userguide/declaring_repositories_basics.html)).
- `publishToMavenLocal` is the opposite case and is fine: it is a **producer**-side verification step (does the POM look right, do the artifacts resolve) before a real release, never a repository declaration a consumer keeps.
- Sigstore bundle validation at the Central Portal has existed since **2025-01-28** but Sonatype's own announcement states plainly "Sigstore signature files are not required to publish at this time," with no PGP-replacement date set ([sigstore announcement](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/)).
- Across all 32 exemplar repos — including `bazelbuild/bazel` and `gradle/gradle` themselves — usage of `actions/attest-build-provenance`, `sigstore/cosign`, `dependency-review-action`, and any container/dependency scanner is **zero** ([exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)#L50). SLSA-style attestation has not reached this corpus.
- A default GitHub Actions release job — checkout, build, upload artifacts, no attestation step — reaches **SLSA Build L1 at best** (provenance would need to *exist*, and none is emitted) and realistically sits at **L0**: no automatically-generated, verifiable provenance at all ([SLSA v1.1 levels](https://slsa.dev/spec/v1.1/levels)).
- Provenance attestation for the OCX SDK's release pipeline is therefore a rule this program **introduces deliberately**, not one it codifies from observed practice — say so explicitly rather than presenting it as "how JVM projects already do it."
- 0/32 exemplars derive their published version from a git-tag plugin (`axion-release`, `nebula-release`, `reckon`, `gradle-git-version` all zero; 14/32 use a literal in `gradle.properties`) — which makes a manual tag-vs-declared-version CI check *more* necessary, not less, because nothing else in the observed corpus enforces that consistency ([exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)#L44).
- `ocx-sdk-python`'s `release.yml` already runs this exact check (`TAG != PYPROJ` → `exit 1`) before any build step; the Gradle analogue is a one-step `grep` against `gradle.properties`/`build.gradle.kts` — carry the pattern over as a MUST, not a SHOULD.

## Findings

### 1. Namespace verification is the mandatory precondition

Central Portal onboarding is a hard gate before any upload: "Once you have registered your account, follow the instructions in our namespace registration page… After your namespace has been verified, you're finally ready to start uploading components to Maven Central!" ([publish-portal-guide](https://central.sonatype.org/publish/publish-portal-guide/)). Two proof mechanisms exist, split by namespace shape:

- **Reverse-domain namespace** (e.g. `com.example`, `dev.ocx`): prove domain control with a **DNS TXT record** — Sonatype issues a verification token and the applicant publishes it at the domain's TXT record ([register/central-portal](https://central.sonatype.org/register/central-portal/), which links to the dedicated `faq/how-to-set-txt-record/` and `faq/namespaces-and-dns/` pages for the mechanics).
- **`io.github.<username>` namespace**: proved by **GitHub repository ownership** instead of DNS — Central verifies you control the corresponding GitHub account, which is the path most individual/OSS-maintainer projects (including a first `io.github.*`-coordinate OCX SDK release) take instead of buying or delegating a domain.

There is no third path and no way to upload before verification completes — an agent scripting a release must treat "is the namespace verified" as a precondition check, not a retry-on-failure condition.

### 2. The per-artifact requirement set

Central's `/publish/requirements/` page states the checklist as absolutes, not recommendations:

| Requirement | Exact wording | Mandatory? |
|---|---|---|
| Sources jar | "For every `<artifactId>-<version>.jar` file, you must provide a corresponding `<artifactId>-<version>-sources.jar`" | Yes — placeholder-with-README acceptable if no real sources exist |
| Javadoc jar | same sentence, "…and a `<artifactId>-<version>-javadoc.jar`" | Yes — same placeholder fallback |
| GPG/PGP signature | "All files deployed need to be signed with GPG/PGP and a `.asc` file containing the signature must be included for each file" | Yes, per file |
| MD5 checksum | "`.md5` and `.sha1` are required" | Yes |
| SHA1 checksum | same | Yes |
| SHA256 / SHA512 | "supported but not mandatory" | No |
| POM `name`/`description`/`url` | "We require the presence of `name`, `description` and a `url`" | Yes |
| POM `licenses` | name + URL for every applicable license | Yes |
| POM `developers` | name, email, organization, organizationUrl | Yes |
| POM `scm` | `connection`, `developerConnection`, `url` | Yes |

Two things an agent tends to miss: (a) this is a **wholesale** rejection — a POM missing only `scm` fails upload exactly the same as one missing everything ([requirements](https://central.sonatype.org/publish/requirements/)); (b) the placeholder-jar escape hatch for sources/javadoc is Central's own documented answer for internal or generated-code-only modules, not something an agent should treat as forbidden and therefore skip the check that jars exist at all.

### 3. Publishing paths measured in the corpus

Three real options exist for Gradle, one for Maven, and the corpus shows all four in active use, unevenly:

| Plugin | Corpus hits (of 32) | Notes |
|---|---|---|
| `central-publishing-maven-plugin` (Maven, official) | 3 (`assertj`, `google/error-prone`, `guava`) | The Maven-native path |
| `com.vanniktech.maven.publish` (Gradle) | 8 | `id("com.vanniktech.maven.publish") version "0.37.0"` — the most-adopted Gradle wrapper |
| `com.gradleup.nmcp` / `.nmcp.aggregation` (Gradle) | 2 (`apollo-kotlin`, `junit-framework`) | Config-cache- and Isolated-Projects-compatible by design (classloader isolation) |
| `nexus-publish` (Gradle, OSSRH-era) | 2 | Superseded; do not recommend for a new project |
| raw `maven-publish`/`MavenPublication`, no wrapper | 18 (7 of those have *no* higher-level plugin at all) | Hand-rolled `pom {}` blocks — most common, least ergonomic |
| `nexus-staging-maven-plugin`, `tech.yanand.maven-central-publish` | 0 each | Dead-weight OSSRH-era names — "if you see this, migrate it" ([pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md)#L409) |

`vanniktech` DSL shape:

```kotlin
// build.gradle.kts
plugins {
  id("com.vanniktech.maven.publish") version "0.37.0"
}

mavenPublishing {
  publishToMavenCentral(automaticRelease = true)   // = autoPublish + waitUntil=published
  signAllPublications()
}
```

In-memory signing, CI-safe:

```
ORG_GRADLE_PROJECT_signingInMemoryKey=<ascii-armored key>
ORG_GRADLE_PROJECT_signingInMemoryKeyId=<8-char key id>
ORG_GRADLE_PROJECT_signingInMemoryKeyPassword=<passphrase>
```

`nmcp` DSL shape (settings-file credentials, project-file publication):

```kotlin
// settings.gradle.kts
plugins { id("com.gradleup.nmcp.settings") version "1.1.0" }
nmcpSettings {
  centralPortal {
    username = providers.gradleProperty("centralUsername")
    password = providers.gradleProperty("centralPassword")
  }
}
```

```kotlin
// build.gradle.kts (aggregation module)
plugins { id("com.gradleup.nmcp.aggregation") version "1.1.0" }
nmcpAggregation {
  centralPortal { publishingType = "AUTOMATIC" }  // vs "USER_MANAGED"
}
// ./gradlew publishAggregationToCentralPortal
```

`nmcp`'s own README states explicit compatibility with Configuration Cache and Isolated Projects via classloader isolation — a real reason to prefer it over raw `maven-publish` for a build already committed to those two ([nmcp README](https://raw.githubusercontent.com/GradleUp/nmcp/main/README.md), [nmcp docs](https://gradleup.com/nmcp/)).

### 4. autoPublish and waitUntil: what each means for a CI job's exit

The Publisher API's deployment states, exactly as documented ([Publisher API](https://central.sonatype.org/publish/publish-portal-api/)):

`PENDING` → `VALIDATING` → `VALIDATED` → `PUBLISHING` → `PUBLISHED` (or `FAILED` at any point, with error detail in the `errors` field).

| `autoPublish` | `waitUntil` | Build exits after | What a green exit actually proves |
|---|---|---|---|
| `false` (default) | `validated` | `VALIDATED` | The bundle is well-formed and passed automated checks — **not published**; a human must click "Publish" |
| `false` | `uploaded` | Upload accepted | Even weaker — validation hasn't run yet |
| `true` | `validated` | `VALIDATED`, publish then proceeds async | CI cannot tell if the async publish later failed |
| `true` | `published` | `PUBLISHED` (or `FAILED`) | The only combination where CI's exit code reflects Central's actual final state — required for a release job that must fail loudly |

An agent-authored release job that stops polling at `validated` and reports success is reporting a false positive for "released": the artifact may still fail during the async `PUBLISHING` step with no CI signal at all.

### 5. SNAPSHOT publishing needs central-publishing-maven-plugin ≥ 0.7.0

The Central Portal's Maven-plugin release notes cited from `/publish/publish-portal-maven/` state SNAPSHOT support ("Support for `-SNAPSHOT` publishing") landed in **0.7.0**; any pin below that version cannot publish snapshots through the Portal at all — this is a hard floor for a build that wants a snapshot channel, not a soft recommendation. The current plugin line is 0.9.x.

### 6. OSSRH sunset and the Staging API as a bridge, not a target

- OSSRH reached end-of-life on **2025-06-30** ("As of June 30, 2025 OSSRH has reached end of life and has been shut down") ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/)); the March-2025 sunset announcement gives the same date and frames it as tied to Nexus Repository Manager v2's own end-of-life, with the closing line "If you have been holding off migrating to the Central Publisher Portal, now is the time to start your preparations" ([sunset announcement](https://central.sonatype.org/news/20250326_ossrh_sunset/)).
- The **OSSRH Staging API Service** is explicitly labeled a "compatibility service that translates a subset of the Nexus 2 APIs to the Portal API" — Sonatype's own framing is migration convenience ("the fastest way to continue publishing" for an existing pipeline), never a recommended target for a new project's first release configuration ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/)). An OCX SDK's first release should be authored directly against the Portal (Publisher API, or `central-publishing-maven-plugin`/vanniktech/nmcp), not against the shim.

### 7. Immutability is an absolute

"Once released/published, you will not be able to remove/update/modify your components" ([ossrh-eol](https://central.sonatype.org/pages/ossrh-eol/), repeated across the guide). There is no delete, no patch release under the same coordinates, no re-signing to fix a bad artifact — the only recovery is a new version number. This has to be the *first* consequence stated in a release runbook, before any step description, because every other gate exists to prevent reaching `PUBLISHED` with something wrong.

### 8. SETTLED — maven-publish × configuration cache on Gradle 9

This was left open after wave 2 (frame correction 36, [jvm-gradle-core.md](../jvm-gradle-core.md) GRADLE-CACHE-08, SHOULD-severity, unresolved as "fully / partially / broadly incompatible"). Fetching the issue thread and the PR that closed it settles it precisely.

**Timeline, from the primary source (the issue itself, not a paraphrase):**

- Gradle ≤ 8.x, config cache enabled, explicit `credentials { username = "..."; password = "..." }` block with literal values → **hard build failure**: `The following Gradle properties are missing for '<Repo>' credentials: - <Repo>Username - <Repo>Password` ([gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040), issue body).
- Gradle 9.0.0 (fixed by [gradle/gradle#33830](https://github.com/gradle/gradle/pull/33830) "Adopt graceful degradation from Maven and Ivy Publish plugins", merged 2025-06-13, milestone **9.0.0 RC1**) → same trigger, **different failure mode**: "when explicit credentials are used, instead of causing a build failure, explicit credentials disable the configuration cache" (comment from Gradle team member `@abstratt` on the issue, dated after the fix landed).
- The March-2025 Gradle blog post's compatibility table marks Maven Publish with a bare warning icon and no elaboration ([road-to-configuration-cache](https://blog.gradle.org/road-to-configuration-cache), published 2025-03-14) — read in isolation this overstates the problem; the PR three months later shows the actual gap is exactly one configuration shape, not the whole plugin.

**Answer, in GRADLE-CACHE-08's shape**: maven-publish is **partially incompatible** on Gradle 9.7.x — scoped precisely to a `credentials {}` block with **literal inline values**. Everything else (property-, environment-, or provider-backed credentials via `providers.gradleProperty(...)`/`providers.environmentVariable(...)`, which is also the officially-documented externalization pattern) is cache-compatible. The fix is mechanical:

```kotlin
// WRONG — disables the configuration cache for this publish task on Gradle 9,
// and hard-fails the build entirely on Gradle 8.x
maven(url = uri("https://example.com/repo")) {
  credentials {
    username = "alice"
    password = "hunter2"
  }
}

// CORRECT — cache-compatible on both 8.x and 9.x
maven(url = uri("https://example.com/repo")) {
  credentials {
    username = providers.gradleProperty("repoUsername").orNull
    password = providers.gradleProperty("repoPassword").orNull
  }
}
```

The pass signal is unchanged and must be stated explicitly in the runbook: run the publish task twice; the second invocation must print the literal line `Reusing configuration cache.` — its absence is the finding, regardless of exit code.

### 9. SETTLED — mavenLocal() severity

Also left open after wave 2 (42 corpus build files declare `mavenLocal()`, no dive, [jvm-dependencies.md](../jvm-dependencies.md) named it a follow-up explicitly). `declaring_repositories.html` and `best_practices_dependencies.html` — the two pages the brief named — turn out to say **nothing** about it (checked directly, not from a snippet); the actual warning lives one page over, in `declaring_repositories_basics.html`:

> "When such a repository is configured, Gradle completely bypasses its dependency cache for it, as there is no guarantee that the content will remain unchanged between executions. This limitation can negatively impact performance. Additionally, using local Maven or Ivy repositories make build reproducibility much harder to achieve. Therefore, their use should be restricted to prototyping rather than production builds."
> — [docs.gradle.org/current/userguide/declaring_repositories_basics.html](https://docs.gradle.org/current/userguide/declaring_repositories_basics.html)

This settles the pair the brief asked for:

- **`publishToMavenLocal`** (a task the `maven-publish` plugin adds; installs to `~/.m2/repository`) — a legitimate **producer-side, local release-verification step**: does the POM resolve, do the artifacts look right, before a real Central upload. Keep it.
- **`mavenLocal()`** (a repository declaration inside a **consuming** build's `repositories {}` block) — Gradle's own docs call this out as reproducibility-breaking and performance-harming, restricted to prototyping. This is the severity call: **MUST NOT** appear in a committed build file's `repositories {}` for a consuming project (it silently makes dependency resolution machine-dependent — whatever happens to be in that developer's `~/.m2` on that day) — verified as a project-file grep, not a documentation nudge.

```kotlin
// WRONG — resolution silently depends on what's already in ~/.m2/repository
// on this machine; a teammate or CI runner without that artifact gets a
// different (or failing) build with the same source tree
repositories {
    mavenLocal()
    mavenCentral()
}

// CORRECT — no local-repo dependency; verify a not-yet-published artifact
// with a real composite build or an included build, not mavenLocal()
repositories {
    mavenCentral()
}
```

### 10. The supply-chain bar, placed honestly

- Sigstore bundle **validation** (not requirement) shipped at the Central Portal on **2025-01-28**: "We would like to stress that Sigstore signature files are not required to publish at this time," with Sonatype stating only that it is "monitoring adoption" and "may eventually make both Sigstore and PGP signatures required" — no date attached, and an explicit "we have no intention of replacing PGP signatures" framing at launch ([sigstore announcement](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/)).
- SLSA Build levels, exactly as specified: **L0** "no requirements — represents the lack of SLSA"; **L1** "provenance exists… trivial to bypass or forge"; **L2** "generated and signed [provenance from] a hosted build platform… forging requires an explicit attack"; **L3** "hardened builds… tamper protection… isolating signing secrets from user-defined build steps" ([SLSA v1.1 levels](https://slsa.dev/spec/v1.1/levels)).
- A default GitHub Actions release workflow — checkout, build, sign with a stored GPG key, upload — emits **no machine-verifiable provenance document at all**. That is **Build L0**, not L1: L1 requires provenance to *exist and be available*, which nothing in a bare `actions/checkout` → `./gradlew publish` pipeline produces. Adding `actions/attest-build-provenance` (GitHub's hosted, keyless, Sigstore-backed attestation action) is what would lift a workflow to **L2** — signed provenance from a hosted platform — without further hardening.
- The measured fact, not an assumption: **0 of 32 exemplar repos use `actions/attest-build-provenance`, `sigstore/cosign`, `dependency-review-action`, or any container/dependency scanner** — including `bazelbuild/bazel` and `gradle/gradle` themselves ([exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)#L50, #L410).
- **Conclusion, stated as the brief requires**: provenance attestation is **not** a practice this program codifies from observed JVM-ecosystem behavior — it is a forward-looking rule this program introduces deliberately, ahead of the corpus, because the corpus's own most sophisticated build-tool authors have not adopted it either. A rule that presents `actions/attest-build-provenance` as "how mature JVM projects already release" would be teaching a fiction; a rule that recommends it as a genuine security improvement worth adding to a *new* pipeline, while saying plainly that the ecosystem hasn't caught up, is honest.

## Normative guidance candidates

1. **GRADLE-PUB-01 (MUST).** Treat namespace verification as a release precondition, checked before the release job runs, not discovered as an upload failure. *Rationale*: an unverified namespace cannot upload at all; failing at that point wastes the build/sign/checksum work. *Verify*: the release runbook/skill names the DNS-TXT or GitHub-ownership method used and where the token lives; a CI job that hits `403`/`401` referencing namespace ownership on first upload is this rule violated, not a transient error to retry.

2. **GRADLE-PUB-02 (MUST).** Every published artifact ships a matching `-sources.jar` and `-javadoc.jar` — placeholder-with-README is acceptable, silent absence is not. *Rationale*: Central rejects the whole deployment, not just the missing file. *Verify*: `find . -name '*.jar' ! -name '*-sources.jar' ! -name '*-javadoc.jar' ! -name '*-sources-placeholder.jar'` against the staged bundle, cross-checked 1:1 against the base jar list; or, for Gradle, `withSourcesJar()`/`withJavadocJar()` present on the `java {}` extension.

3. **GRADLE-PUB-03 (MUST).** The POM declares `name`, `description`, `url`, at least one `licenses` entry, at least one `developers` entry, and a full `scm` block (`connection`, `developerConnection`, `url`) before the first real release. *Rationale*: wholesale upload rejection on any single missing field. *Verify*: grep the generated POM (`build/publications/*/pom-default.xml` for Gradle, `target/*.pom` for Maven) for all six element names; absence of any one is a finding, not a warning.

4. **GRADLE-PUB-04 (MUST).** Every deployed file carries `.md5`, `.sha1`, and a `.asc` GPG/PGP signature. *Rationale*: hard Central requirement, checked at upload. *Verify*: for each artifact `X`, confirm `X.md5`, `X.sha1`, `X.asc` all exist in the staged bundle before invoking the publish task — `signAllPublications()` (vanniktech) or the `signing` plugin applied to every publication, not just the main one.

5. **GRADLE-PUB-05 (MUST).** A release CI job sets `autoPublish = true` and `waitUntil = "published"` (or the vanniktech `publishToMavenCentral(automaticRelease = true)` / nmcp `publishingType = "AUTOMATIC"` equivalent) if the job's exit code is meant to mean "this is live on Central." *Rationale*: `waitUntil = "validated"` (the default) reports success at a state that still requires a human click — a CI green check that does not mean "published" is worse than an honest red one. *Verify*: grep the release workflow for `waitUntil`/`automaticRelease`/`publishingType`; any release job with no such setting is implicitly the weakest (`validated`) state and must say so in its job summary.

6. **GRADLE-PUB-06 (MUST).** SNAPSHOT publishing through the Central Portal pins `central-publishing-maven-plugin` to **≥ 0.7.0** (current: 0.9.x). *Rationale*: below 0.7.0, SNAPSHOT publishing is not a degraded mode — it does not exist. *Verify*: `grep -A1 'central-publishing-maven-plugin' pom.xml` and compare the `<version>` against `0.7.0` with a real version comparator, not a string comparison (`0.10.0 < 0.7.0` lexically).

7. **GRADLE-PUB-07 (MUST).** The release job fails the build when the git tag and the declared build-file version disagree, before any build/sign/publish step runs. *Rationale*: nothing in the observed corpus enforces this any other way — 0/32 exemplars use a tag-driven version plugin, so a manual mismatch (tag `v2.1.0`, `gradle.properties` still `2.0.0`) ships silently otherwise; `ocx-sdk-python`'s `release.yml` already does exactly this for the sibling fleet consumer. *Verify*: a release-workflow step comparing `${GITHUB_REF_NAME#v}` against the value read from `gradle.properties` (`grep -E '^version='`) or `build.gradle.kts`, `exit 1` on mismatch, run before the build job's other steps — mirror `ocx-sdk-python`'s exact shape.

8. **GRADLE-PUB-08 (MUST — absolute, stated first in the runbook).** Design every release step around the fact that a `PUBLISHED` component can never be removed, updated, or re-signed — only a new version number recovers from a mistake. *Rationale*: Central's own words; this is not a policy choice to weigh, it is the shape everything else exists to protect. *Verify*: a reading heuristic — does the runbook state this before step 1, or only in a footnote? The former passes.

9. **GRADLE-PUB-09 (SHOULD, not MUST for a Gradle 9 build).** Never write a `credentials { username = "literal"; password = "literal" }` block in a publishing repository declaration; use `providers.gradleProperty(...)`/`providers.environmentVariable(...)`. *Rationale*: on Gradle ≤ 8.x this hard-fails a config-cache build; on Gradle 9.0+ it silently disables the configuration cache for that one task instead — either way the literal form is strictly worse and there is no reason to write it. *Verify*: `grep -rn -A3 'credentials\s*{' '*.gradle.kts'` — any block whose `username`/`password` is a string literal (not `providers.*`, not `System.getenv(...)` via a `ValueSource`) is the finding; confirm by running the publish task twice and checking for `Reusing configuration cache.` on the second run.

10. **GRADLE-PUB-10 (MUST).** Never declare `mavenLocal()` in the `repositories {}` block of a project meant to build reproducibly (CI, a committed build file any teammate runs) — restrict it to documented, ad-hoc local prototyping that never lands in version control. *Rationale*: Gradle's own docs — bypassed dependency cache, machine-dependent resolution, explicitly "restricted to prototyping." *Verify*: `grep -rn 'mavenLocal()' --include='*.gradle.kts' --include='*.gradle'`; any hit inside a committed `repositories {}` (not a local, gitignored override file) is the finding. `publishToMavenLocal` as a *task* invocation is unaffected by this rule and stays a MAY-level local-verification step.

11. **GRADLE-PUB-11 (SHOULD, not MUST, for the OCX SDK's first release).** Sign with Sigstore (`sigstore-maven-plugin` or the Gradle Sigstore plugin) alongside — never instead of — PGP. *Rationale*: validated at the Portal since 2025-01-28 but explicitly not required, and zero corpus adoption; a SHOULD gives the SDK a real, low-cost security improvement without inventing a compliance obligation the ecosystem itself has not adopted. *Verify*: presence of a `.sigstore.json`/`.sigstore` bundle alongside the `.asc` signature in the staged deployment; absence is not a failure, presence with the `.asc` absent is (PGP stays mandatory).

12. **GRADLE-PUB-12 (CONSIDER, explicitly not a MUST).** Add `actions/attest-build-provenance` (or equivalent) to the release workflow to reach SLSA Build L2. *Rationale*: this is the program introducing a forward-looking practice, not codifying one — say so in the rule text itself, because an agent reading a bare MUST here would reasonably (and wrongly) infer this is standard JVM-release practice today. *Verify*: presence of the attestation step in the release workflow is a positive signal to note, not a gate to fail CI on; do not grep the corpus for this and report a violation — the corpus overwhelmingly does not do it, by design of this recommendation.

## Exemplar evidence

| Candidate | Satisfies | Violates / gap |
|---|---|---|
| GRADLE-PUB-01 (namespace verification) | `io.github.*`-coordinate projects generally (not independently re-measured; out of scope for a static grep) | — |
| GRADLE-PUB-02/03 (sources/javadoc/POM completeness) | `square/okhttp` via `com.vanniktech.maven.publish.base`, declared in `gradle/libs.versions.toml:168`, applied `build.gradle.kts:9` ([pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md)#L97) | licenses/developers/scm travel together in 15-17/32 while `url` lags at only 8/32 per the map's M-H-03 measurement — a rule that only checks `licenses`+`developers`+`scm` and skips `url` would pass builds Central would still reject |
| GRADLE-PUB-04 (signing) | `gradle/gradle` (signing plugin + `useInMemoryPgpKeys`), `Exposed`, `mockito` — 4/32 in-memory, 2/32 `useGpgCmd`, 6/32 signing plugin total ([pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md)) | `apache/kafka` uses `maven-gpg-plugin` (Maven-side) with no in-memory-key equivalent noted — CI-safety of its key handling not independently verified here |
| GRADLE-PUB-05 (autoPublish/waitUntil) | `nmcp`-using repos (`apollo-kotlin`, `junit-framework`) default to explicit `publishingType` | raw `maven-publish` repos (18/32, 7 with no higher-level plugin at all) hand-roll upload logic where `waitUntil` has no equivalent — these need a bespoke poll-the-Publisher-API step or they cannot claim GRADLE-PUB-05 at all |
| GRADLE-PUB-06 (SNAPSHOT floor) | `assertj`, `google/error-prone`, `guava` use `central-publishing-maven-plugin` (3/32) — exact pinned versions not independently re-verified here; check against 0.7.0 at authoring time | — |
| GRADLE-PUB-07 (tag-vs-version) | `ocx-sdk-python`'s `.github/workflows/release.yml:20-28` — `TAG != PYPROJ` → `exit 1`, run before any build step (fleet cross-language precedent, not JVM corpus) | **0/32 JVM exemplars** use a tag-driven version plugin at all (`axion-release`/`nebula-release`/`reckon`/`gradle-git-version` all zero, [pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md)#L44) — none of the 32 can be cited as satisfying this rule; it is a gap the program closes, not one it observes closed |
| GRADLE-PUB-08 (immutability) | universal by Central's own enforcement — no exemplar can violate it and survive | — |
| GRADLE-PUB-09 (credentials-vs-cache) | `nmcp`-using repos avoid the shape by construction (settings-plugin credentials, provider-backed) | not independently re-greppped per-repo for this dive; the mechanism is sourced from the Gradle issue tracker, not corpus measurement — flagged as such |
| GRADLE-PUB-10 (mavenLocal) | none confirmed clean by this dive (not re-measured file-by-file) | **42 corpus build files** declare `mavenLocal()` per the wave-2 dependencies consolidation's follow-up note ([jvm-dependencies.md](../jvm-dependencies.md), "Deserves another research round") — the scale of the gap this rule closes |
| GRADLE-PUB-11 (Sigstore) | none — 0/32 | 0/32, consistent with the "validated since 2025-01-28, adopted nowhere yet" finding |
| GRADLE-PUB-12 (provenance) | none — 0/32, including `bazelbuild/bazel`, `gradle/gradle` | 0/32 ([exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)#L50) — this is the point: a rule with zero precedent, stated as such |

## AI-agent angle

| Characteristic mistake | Why a model makes it | Smallest mechanical check |
|---|---|---|
| Writes to `oss.sonatype.org` / `s01.oss.sonatype.org` staging URLs | OSSRH dominated training data through 2024; the sunset (2025-06-30) postdates most pretraining | `grep -rn 'oss\.sonatype\.org\|s01\.oss\.sonatype' .` — any hit outside a migration-history comment is stale. Measured: 3/32 exemplars still reference `oss.sonatype.org` somewhere in their build files ([pub audit](../jvm-audit/exemplar-publishing-ci-bazel.md) table) |
| Reaches for `nexus-staging-maven-plugin` or the `io.codearte.nexus-staging` Gradle plugin | Was the standard OSSRH answer for years; 0/32 corpus usage now | Same grep for the plugin id/coordinate; any hit is an era marker to replace with `central-publishing-maven-plugin`/vanniktech/nmcp |
| Treats `autoPublish=true, waitUntil=validated` (or omits `waitUntil` entirely) as "fully automated release" | The names read as sufficient; the state-machine gap between `VALIDATED` and `PUBLISHED` is not obvious from the option name alone | Read the release job's final step: does it poll or wait for `PUBLISHED`/`FAILED`, or does it exit right after `VALIDATED`? |
| Adds `mavenLocal()` to a `repositories {}` block to "fix" a `Could not resolve` error | It is the single most training-data-common fix for that exact error message, and it silences the symptom locally every time | `grep -rn 'mavenLocal()' --include='*.gradle.kts'`; if a change touches dependency resolution, check whether `mavenLocal()` was added in the same diff |
| Writes an inline `credentials { username = "x"; password = "y" }` block, or reads them from `project.properties["x"]` without a `Provider` wrapper | Both compile, both "work" outside the configuration cache, and inline literals are the shortest thing that satisfies the plugin's API | Run the publish task twice; look for the literal line `Reusing configuration cache.` on the second run — its absence with no other explanation is this exact bug |
| States "Gradle 9 has the configuration cache on by default" as grounds for skipping the `gradle.properties` check | Plausible generalization from "Gradle 9 defaults changed a lot" | `grep -n 'configuration-cache' gradle.properties` before asserting anything about caching behavior — the config cache is preferred-with-fallback in 9.x, not forced on ([jvm-gradle-core.md](../jvm-gradle-core.md) correction 2) |
| Recommends `actions/attest-build-provenance` and frames it as "matching JVM ecosystem norms" | Confuses "this is a good idea" with "this is what everyone does" — no training signal distinguishes a security best-practice recommendation from an observed convention | Cross-check any "as is standard" or "as JVM projects typically do" claim about provenance/Sigstore against the corpus count (0/32) before writing it into a rule |
| Assumes JUnit-era `nexus-publish` snapshot repository URLs (`https://oss.sonatype.org/content/repositories/snapshots/`) still work for SNAPSHOT publishing | Same OSSRH-era training bias | SNAPSHOT publishing now routes through the Portal's own snapshot repository via `central-publishing-maven-plugin` ≥ 0.7.0 — grep for the plugin version, not the URL |

## Contested / evolving

- **Sigstore vs PGP as the required signature.** As of 2026-09-12, Sonatype validates but does not require Sigstore, and states only that it "may eventually" require both — no committed date. The direction is toward Sigstore becoming load-bearing, not PGP's replacement being scheduled; treat any future rule claiming "Sigstore is now required" as needing a fresh primary-source check, not an extrapolation from this trend.
- **maven-publish's configuration-cache compatibility is still evolving, not finished.** The 9.0.0 fix (graceful degradation) resolves the *failure mode* for the one documented case (literal inline credentials); it does not make that case cache-*compatible* — the task still silently loses caching. Whether a future Gradle release closes that remaining gap (by supporting encrypted, persisted literal credentials in the cache) is an open item Gradle's own issue thread leaves unresolved as of the PR's merge.
- **Whether the OCX SDK should suppress Gradle Module Metadata publishing** touches this dive only at the edges (GMM/POM consumability is the sibling `consumability-across-build-systems` dive's job) but interacts with GRADLE-PUB-02/03: a GMM-visible variant with its own sources/javadoc requirement is easy to under-provision if the rule set only checks the "main" publication.
- **Provenance attestation adoption trajectory.** Zero corpus adoption today does not predict zero adoption in 12 months — GitHub's `attest-build-provenance` action and Sigstore's ecosystem push are both recent (2024-2025) and the corpus's own maintainers (Gradle, Bazel) are exactly the population most likely to adopt early once tooling friction drops. Recheck this count at the next research wave rather than assuming it holds.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [central.sonatype.org/publish/publish-portal-guide/](https://central.sonatype.org/publish/publish-portal-guide/) | Official Central Portal publishing guide | Current (2026) | Primary — the workflow overview, deployment states, immutability statement |
| [central.sonatype.org/publish/requirements/](https://central.sonatype.org/publish/requirements/) | Official per-artifact requirements | Current | Primary — the exact checksum/signature/sources/javadoc/POM checklist |
| [central.sonatype.org/publish/publish-portal-maven/](https://central.sonatype.org/publish/publish-portal-maven/) | Official Maven-plugin publishing guide | Current | Primary — `central-publishing-maven-plugin` config, `autoPublish`/`waitUntil`, SNAPSHOT floor (0.7.0) |
| [central.sonatype.org/publish/publish-portal-api/](https://central.sonatype.org/publish/publish-portal-api/) | Official Publisher API reference | Current | Primary — exact deployment-status enum (PENDING/VALIDATING/VALIDATED/PUBLISHING/PUBLISHED/FAILED) |
| [central.sonatype.org/register/central-portal/](https://central.sonatype.org/register/central-portal/) | Official namespace-registration guide | Current | Primary — namespace verification as precondition; links to DNS-TXT and `io.github.*` mechanics |
| [central.sonatype.org/pages/ossrh-eol/](https://central.sonatype.org/pages/ossrh-eol/) | Official OSSRH end-of-life page | 2025-06-30 EOL | Primary — EOL date, Staging API shim framing, immutability wording |
| [central.sonatype.org/news/20250326_ossrh_sunset/](https://central.sonatype.org/news/20250326_ossrh_sunset/) | Official sunset announcement | 2025-03-26 | Primary — migration-urgency framing, ties EOL to Nexus 2's own EOL |
| [central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/](https://central.sonatype.org/news/20250128_sigstore_signature_validation_via_portal/) | Official Sigstore-validation announcement | 2025-01-28 | Primary — "not required," no PGP-replacement commitment |
| [slsa.dev/spec/v1.1/levels](https://slsa.dev/spec/v1.1/levels) | SLSA specification, Build track levels | v1.1 | Primary — exact L0-L3 definitions used to place a bare GitHub Actions release |
| [vanniktech/gradle-maven-publish-plugin README](https://raw.githubusercontent.com/vanniktech/gradle-maven-publish-plugin/main/README.md) + [central setup docs](https://vanniktech.github.io/gradle-maven-publish-plugin/central/) | Plugin's own docs | v0.37.0 current | Primary (tool's own repo) — DSL shape, in-memory signing env vars, supported project-type list |
| [GradleUp/nmcp README](https://raw.githubusercontent.com/GradleUp/nmcp/main/README.md) + [docs site](https://gradleup.com/nmcp/) | Plugin's own docs | Current | Primary (tool's own repo) — plugin ids, settings-plugin credential shape, config-cache/Isolated-Projects compatibility claim |
| [gradle/gradle#24040](https://github.com/gradle/gradle/issues/24040) | Gradle issue tracker, closed issue + fix thread | Filed 2023, closed 2025-06 | Primary — the exact before/after failure-mode change, from a Gradle team member's own comment |
| [gradle/gradle#33830](https://github.com/gradle/gradle/pull/33830) | The merged PR that fixed #24040 | Merged 2025-06-13, milestone 9.0.0 RC1 | Primary — pins the exact Gradle version where graceful degradation shipped |
| [blog.gradle.org/road-to-configuration-cache](https://blog.gradle.org/road-to-configuration-cache) | Official Gradle blog | 2025-03-14 | Primary — the compatibility-table claim the brief asked to weigh against the issue/PR |
| [docs.gradle.org/current/userguide/declaring_repositories_basics.html](https://docs.gradle.org/current/userguide/declaring_repositories_basics.html) | Official Gradle user guide | Current | Primary — the actual `mavenLocal()` warning ("restricted to prototyping"), found here rather than on the two pages the brief named |
| [docs.gradle.org/current/userguide/declaring_repositories.html](https://docs.gradle.org/current/userguide/declaring_repositories.html) | Official Gradle user guide | Current | Checked as instructed; confirms no `mavenLocal()` warning lives here (negative result, worth recording) |
| [docs.gradle.org/current/userguide/best_practices_dependencies.html](https://docs.gradle.org/current/userguide/best_practices_dependencies.html) | Official Gradle Best Practices | Current | Checked as instructed; confirms `mavenLocal()` is not mentioned on this page either |
| `/home/mherwig/dev/ocx-sdk-python/.github/workflows/release.yml` | Fleet's own Python SDK release workflow | Current (this repo) | Cross-language precedent for the tag-vs-version gate (GRADLE-PUB-07) |
| [jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own wave-1 audit | 2026-09-05/06 | Corpus measurement — publishing-plugin census, zero-provenance-adoption finding, cited rather than re-measured per instructions |
