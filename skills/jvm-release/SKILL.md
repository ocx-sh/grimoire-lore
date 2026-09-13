---
name: jvm-release
description: Ordered runbook for publishing a Java or Kotlin artifact to Maven Central through the Central Portal, covering Gradle and Maven side by side, from namespace verification and the tag-versus-version gate through the binary-compatibility gate, the required per-file set, signing, and the exit semantics that decide whether a green job means live. Use when cutting a release, publishing or staging to Maven Central or the Central Portal, writing or reviewing a release workflow, wiring nmcp, the vanniktech plugin, maven-publish or central-publishing-maven-plugin, deciding whether a release job's green means published or only validated, or asking how to fix an artifact that is already on Central. Not for choosing dependency versions, and not for Gradle Plugin Portal publishing.
license: Apache-2.0
metadata:
  summary: Gate-ordered Maven Central release procedure for Gradle and Maven, built around Central's immutability, with the dead OSSRH paths named
  keywords: jvm,java,kotlin,release,maven-central,central-portal,publishing,gradle,maven,nmcp,vanniktech,signing,pgp,sigstore,japicmp,binary-compatibility,abi,sources-jar,javadoc-jar,pom,autopublish,ossrh
---

# jvm-release

## Central is immutable. Read this before step 1

Once a deployment reaches `PUBLISHED`, the component cannot be removed, updated,
modified, re-uploaded under the same coordinates, or re-signed. The only remedy
is a new version number. Sonatype states it plainly on the OSSRH end-of-life
page, and it is the reason this file is a list of gates rather than a list of
steps.

Two consequences bind everything below.

- **There is no fix-the-release path, so do not design one.** An agent that
  meets the constraint only after the ordered steps invents a rollback, a
  re-publish, or a "delete and retry" that cannot exist.
- **Every gate runs before the artifact leaves the machine.** A defect found
  after upload costs a version number. A defect found before upload costs a
  commit.

Contents: [Scope](#scope) · [Pinned defaults](#pinned-defaults) ·
[The runbook](#the-runbook) · [Dead paths](#dead-paths) ·
[Bazel does not publish](#bazel-does-not-publish) ·
[Gradle and Maven, side by side](#gradle-and-maven-side-by-side) ·
[The MUST rows this procedure enforces](#the-must-rows-this-procedure-enforces) ·
[What agents get wrong here](#what-agents-get-wrong-here)

## Scope

Publishing a library, SDK or BOM to Maven Central through the Central Portal,
from a Gradle or a Maven build. The Portal's requirements are identical for the
two, so each step states the requirement once and then gives both spellings.
Gradle Plugin Portal publishing is a different target with a different gate set
and is not covered here. Every version and count below was verified 2026-09-12
unless the line says otherwise.

## Pinned defaults

These four encode an agreed decision rather than a derived fact. Each is a
default an adopter overrides once, in their own build, and never per module.
Marked **pinned** so a later reader does not re-litigate them.

| Decision | Default | Override looks like |
|---|---|---|
| Gradle publishing plugin | `com.gradleup.nmcp`, or `com.vanniktech.maven.publish` | Raw `maven-publish` plus a hand-written Publisher API polling step. The corpus majority does this (18 of 32 repos, 7 with no higher-level plugin at all), and it predates both the configuration cache and Isolated Projects |
| Maven publishing plugin | `central-publishing-maven-plugin`, pinned at 0.7.0 or above (current line 0.9.x, 2026-09-12) | None that reaches the Portal natively |
| Java binary-compatibility gate | japicmp, bound to `check` or `verify` and upstream of every publish task | revapi, which is better designed and had 0 of 32 corpus adoption |
| Kotlin ABI gate | exactly one, defaulting to standalone `binary-compatibility-validator` | In-KGP `abiValidation()`, equally defensible where the build already carries `@OptIn(ExperimentalAbiValidation::class)` |

SNAPSHOT publishing through the Portal landed **in** `central-publishing-maven-plugin`
0.7.0. Below that floor the capability does not exist at all, so it is not a
degraded mode to work around. Compare the pin with a real version comparator,
because `0.10.0` sorts below `0.7.0` as a string.

## The runbook

Run the steps in order. The order is the product: steps 1 through 3 all exist to
fail before anything is signed or uploaded.

### 1. Verify the namespace

Prove ownership of the namespace before the release job builds anything. There
are two paths and no third: a reverse-domain namespace verified with a DNS TXT
record, or an `io.github.<user>` namespace verified through GitHub repository
ownership. Nothing can be uploaded until verification completes.

Record in the runbook which method was used and where the Portal token lives.

**Check:** a first upload returning 401 or 403 referencing namespace ownership
is this gate skipped, not a transient error. Do not retry it, and do not add a
retry loop around it.

### 2. Gate the tag against the declared version, before any build

Compare the git tag against the version the build file declares, in a step that
runs before the first build, sign or publish step, and exit non-zero on a
mismatch.

Nothing else catches a `v2.1.0` tag cut against a `2.0.0` property. No exemplar
in the 32-repo corpus derives its version from a tag plugin, and 14 of 32 keep a
literal in `gradle.properties`. Keep the literal. Introducing `axion-release`,
`nebula-release`, `reckon` or `gradle-git-version` to solve this replaces a
three-line check with a plugin nobody in the corpus runs.

```bash
# release workflow, first step, ahead of every build/sign/publish step
TAG_VERSION="${GITHUB_REF_NAME#v}"
DECLARED=$(grep -E '^version=' gradle.properties | cut -d= -f2)
# Maven: DECLARED=$(mvn -q -DforceStdout help:evaluate -Dexpression=project.version)
[ "$TAG_VERSION" = "$DECLARED" ] || { echo "tag $TAG_VERSION != declared $DECLARED"; exit 1; }
```

**Check:** read the release job top to bottom. The absence of such a step is the
finding. A step that runs after the build is the same finding, because the
mismatch is then discovered with artifacts already produced.

### 3. Run the binary-compatibility gate, before sign, checksum and upload

Diff the public surface against the last coordinate actually published to
Central, and fail the release on any break that is not in a reviewed allowlist.
This runs before signing, because a break found after upload is unrecoverable
and a break found here costs one commit.

**Java, pinned to japicmp.** Bind the japicmp task to `check` or `verify`, make
every publish task depend on it, and set `oldVersion` to the last
Central-published coordinate. Accepted breaks live in a version-controlled
allowlist with a reason string per entry, never a bare `skip` or
`ignoreMissingClasses`. The shape worth copying is a JSON file with one entry
per accepted change naming the member, the change type and the reason.

**Kotlin, exactly one ABI gate.** Standalone
`org.jetbrains.kotlinx.binary-compatibility-validator` (`apiDump` and
`apiCheck`) is the default. In-KGP `abiValidation()` (`updateKotlinAbi` and
`checkKotlinAbi`) is equally defensible where the build already carries
`@OptIn(ExperimentalAbiValidation::class)`, which needs Kotlin 2.2.0 or above.
The `.api` dump is committed, so a descriptor change is visible in a diff.
Running neither is the finding. Running both is a conflict, not extra safety.

```kotlin
// the gate is upstream of the upload, not parallel to it
tasks.withType<PublishToMavenRepository>().configureEach {
    dependsOn(tasks.named("japicmp")) // or "apiCheck", or "checkKotlinAbi"
}
```

**Check:** `./gradlew :module:publish --dry-run` must list the gate task ahead
of the upload task. For Maven the ordering is the bound phase, not a run:
`grep -rn -A 6 --include='pom.xml' -e 'japicmp-maven-plugin' .` must show an
`<execution>` whose `<phase>` is `verify` or earlier, which the lifecycle puts
ahead of `deploy`. An execution with no phase, or empty output, is the finding.
Never run `mvn deploy` to inspect ordering.
Output that lists the upload with no gate task before it is the finding. Then
`grep -rnE -e 'ignoreMissingClasses' -e '<(skip)>true' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .`
with no accompanying allowlist file: any hit is the finding, empty output is
the pass.

### 4. Assemble the required per-file set

Central checks the set per `<artifactId>-<version>` at upload, which is after
signing, and rejects the whole deployment on a single missing element. Assemble
it for **every** published artifact, not only the main one.

Per published artifact:

| Required | Notes |
|---|---|
| The main jar | |
| A matching `-sources.jar` | |
| A matching `-javadoc.jar` | A Dokka HTML jar published under the `javadoc` classifier satisfies this for a Kotlin module. A placeholder jar holding a README is Central's own documented fallback where real sources or docs cannot be produced |
| A complete POM | `name`, `description`, `url`, at least one `licenses` entry, at least one `developers` entry, and a full `scm` block with `connection`, `developerConnection` and `url` |
| `.asc`, `.md5` and `.sha1` per deployed file | `.sha256` and `.sha512` are supported and not required |

None of the six POM elements is derived from a Gradle project property.
`from(components["java"])` generates coordinates and `<dependencies>` and
nothing else. `url` is the element that goes missing: it reaches 8 of 32 corpus
repos against 15 to 17 of 32 for licenses, developers and scm, so a check that
covers the other three and skips `url` passes builds Central still rejects.

**Read the generated POM, never the build file.** Run
`./gradlew generatePomFileForMavenJavaPublication` first, then read
`build/publications/*/pom-default.xml`. Gradle Module Metadata is published
alongside the POM and never instead of it, and Maven tooling and Bazel or
Coursier never fetch the `.module` file at all. Deciding the POM is complete by
reading the `.module` is how a release ships without `<dependencies>`.

For the same reason, anything a non-Gradle consumer needs must be a classified
artifact or a separate publication. A feature variant, a Kotlin Multiplatform
target and Shadow's `shadowRuntimeElements` variant all exist only for Gradle
consumers. Republish it with an explicit classifier, or write into the build
file that non-Gradle consumption is out of scope for that artifact.

```bash
# every required POM element present at project level. Any output is the finding, empty output is the pass
for f in build/publications/*/pom-default.xml; do
  bare=$(sed -e '/<scm>/,/<\/scm>/d' -e '/<licenses>/,/<\/licenses>/d' -e '/<developers>/,/<\/developers>/d' "$f")
  for e in name description url; do
    printf '%s' "$bare" | grep -q "<$e>" || echo "MISSING $e in $f"
  done
  for e in licenses developers scm connection developerConnection; do
    grep -q "<$e>" "$f" || echo "MISSING $e in $f"
  done
done
```

```bash
# staged bundle: every base jar carries its siblings, and every deployed file its signature and checksums.
# Any output is the finding, empty output is the pass.
find . -type f -not -name '*.asc' -not -name '*.md5' -not -name '*.sha1' \
  -not -name '*.sha256' -not -name '*.sha512' -print0 |
  xargs -r -0 -I{} sh -c '
    case "$1" in
      *-sources.jar|*-javadoc.jar) ;;
      *.jar) for s in -sources.jar -javadoc.jar; do [ -e "${1%.jar}$s" ] || echo "MISSING ${1%.jar}$s"; done ;;
    esac
    for x in .asc .md5 .sha1; do [ -e "$1$x" ] || echo "MISSING $1$x"; done
  ' _ {}
```

### 5. Sign every publication

Signing is per file and per publication. A `signing` block scoped to one
publication leaves the others unsigned, and the deployment fails at upload with
everything already built.

- Gradle: `signing { sign(publishing.publications) }`, or `signAllPublications()`
  with the vanniktech plugin.
- Maven: `maven-gpg-plugin`, bound so it runs for every published module.

Supply the key to CI **in memory**, through `useInMemoryPgpKeys` or the
`ORG_GRADLE_PROJECT_signingInMemoryKey`, `...KeyId` and `...KeyPassword`
environment variables. `useGpgCmd` needs a configured gpg agent and keyring on
the runner, which is a second thing to provision and a second thing to break.
Measured across the corpus, 4 of 32 repos take the in-memory path against 2 of
32 on `useGpgCmd`.

A Sigstore bundle goes **beside** the `.asc`, never instead of it. The Portal
has validated Sigstore bundles since 2025-01-28 and Sonatype states they are not
required to publish, with no PGP replacement date set. Corpus adoption is 0 of
32, so adding one is a deliberate improvement rather than a norm, and it should
be described that way in the pull request.

**Check:** `grep -rn -e 'useGpgCmd' --include='*.gradle.kts' --include='*.gradle' .`
A hit reachable from a CI-invoked task is the finding. Empty output with signing
configured means the wrapper plugin supplies it, so read that plugin's docs
rather than treating empty as proof. A `.sigstore.json` present with no `.asc`
beside it is the finding.

### 6. Make the release job's exit code mean "live on Central"

Set `autoPublish` to true **and** `waitUntil` to `published`. The documented
deployment state machine is
`PENDING → VALIDATING → VALIDATED → PUBLISHING → PUBLISHED | FAILED`, and the
default stops at `VALIDATED`. A job that exits there reports success at a state
that still needs a human click and can still fail asynchronously with no CI
signal at all.

| Publisher | Spelling |
|---|---|
| nmcp | `publishingType = "AUTOMATIC"` |
| vanniktech | `publishToMavenCentral(automaticRelease = true)` |
| central-publishing-maven-plugin | `<autoPublish>true</autoPublish>` with `<waitUntil>published</waitUntil>` |

A job that deliberately stops at `VALIDATED` is allowed, on one condition: its
summary says "validated, not published" in those words. Silence is the defect,
not the choice.

Credentials in the same job are read through `providers.gradleProperty(...)` or
`providers.environmentVariable(...)`, never bound to a string literal in a
`credentials { }` block. On Gradle 8.x and below a literal hard-fails a
configuration-cache build. On Gradle 9.0 and above it silently disables the
configuration cache for that task instead, so the build stays green and gets
slower for reasons nothing reports. A literal in a committed build file is also
a secret in version control.

**Check:** `grep -rn -A3 -e 'credentials' --include='*.gradle.kts' --include='*.gradle' .`
Any `username` or `password` bound to a string literal is the finding, empty
output is the pass. Then run the publish task twice: the second run must print
the literal line `Reusing configuration cache.` Its absence, with no other
explanation, is this exact defect.

### 7. Prove the artifact is consumable from outside Gradle

Ship a small `maven-consumability` module: a standalone `pom.xml` declaring the
published coordinates plus one smoke test that resolves the runtime classpath
and touches a declared class. Run it after `publishToMavenLocal`, or against the
staged repository, as a release step.

This is the only mechanism that catches a POM or variant defect from the
consumer's side, and it is what the corpus actually does. Every Gradle-tagged
repo carrying a `pom.xml` uses it as a probe, okhttp's `maven-tests/` module
being the canonical shape. None of them builds the project with two build
systems, and wiring a second parallel Maven release pipeline because both file
kinds are present is a misreading of that pattern.

The module's `pom.xml` carries no `<parent>` pointing at the Gradle reactor, and
its test exits non-zero when the coordinate does not resolve.

Separately, `mavenLocal()` must not appear in any committed Gradle
`repositories { }` block: Gradle's own docs restrict it to prototyping rather
than production builds because it bypasses the dependency cache and makes
resolution depend on whatever is in that machine's `~/.m2` that day. Neither
`publishToMavenLocal` as a producer-side verification task nor the probe above,
a Maven module reading `~/.m2` as its default mechanism, is reached by it.

**Check:** `grep -rn -e 'mavenLocal()' --include='*.gradle.kts' --include='*.gradle' .`
A hit inside a committed `repositories { }` block is the finding, empty output
is the pass. A hit inside the consumability probe is the carve-out and is not
reported.

### 8. Upload, read the terminal state, and stop

The job is done when the deployment reports `PUBLISHED`, or failed when it
reports `FAILED`. Nothing else is a terminal state.

Treat the version number as spent from the moment a deployment reaches
`VALIDATED`. Whether a validated-but-unpublished deployment can be dropped and
its version reused was not settled by any primary source read on 2026-09-12, so
plan the release as if it cannot be, and bump rather than gamble.

After `PUBLISHED`, the fix for anything wrong is a new version number. Go back
to step 2.

## Dead paths

Every entry below is something a model proposes from pre-2025 training data.
None of them is a working target in 2026.

| Path | Why it is dead |
|---|---|
| `oss.sonatype.org` and `s01.oss.sonatype.org` | OSSRH reached end of life 2025-06-30. Measured 3 of 32 corpus repos still carry the string, in SNAPSHOT fallback plumbing rather than a release path, and that is exactly the string that gets copied |
| `nexus-staging-maven-plugin` and the `io.codearte.nexus-staging` Gradle plugin | 0 of 32 corpus usage. The Maven-native Portal path is `central-publishing-maven-plugin` |
| The OSSRH Staging API shim | Described by Sonatype as a compatibility service translating a subset of the Nexus 2 APIs to the Portal API. A migration bridge, never a target |
| `nexus-publish` (2 of 32) and `tech.yanand.maven-central-publish` (0 of 32) | Neither is the recommended path, and neither carries the configuration-cache and Isolated-Projects compatibility claim nmcp does |
| OIDC or "trusted publishing" against the Portal | Nothing in the Portal guide, requirements, Publisher API or registration pages fetched 2026-09-12 describes an OIDC path. PyPI has one, Central does not. Use a Portal token in CI secrets, and do not write a tokenless release job without a primary source |
| `maven.consumer.pom.flatten=true` and `<packaging>bom</packaging>` | Maven 4 only and opt-in. Central tops out at `maven-core` 4.0.0-rc-6 as of 2026-09-12, with no plain 4.0.0. An RC feature in a runbook breaks when the RC changes shape |

**Check:**
`grep -rn -e 'oss.sonatype.org' -e 's01.oss.sonatype' -e 'nexus-staging' -e 'codearte' .`
Any hit outside a migration-history comment is stale, empty output is the pass.
Before writing any Maven 4 claim, query the registry rather than the Maven
site's own version banner, which runs ahead of what Central serves:
`curl -s https://repo.maven.apache.org/maven2/org/apache/maven/maven-core/maven-metadata.xml`
A `<release>` other than a plain `4.0.0` means Maven 4 is still RC.

## Bazel does not publish

Bazel hands off to Gradle or Maven for the release. Run this runbook from the
Gradle or Maven build and let Bazel build and test.

Whether `rules_jvm_external`'s `java_export` and `maven_publish` produce a
Portal-acceptable bundle, meaning sources jar, javadoc jar, per-file GPG
signature and a complete POM, was not established as of 2026-09-12. The
corpus's canonical Bazel repository, dagger, keeps Gradle precisely for
publishing packaging. Until someone verifies the bundle against the step 4
table, treat Bazel as a non-publisher. In a repository that carries both, name
which build is canonical for the release, in writing, in the repository. Two
publishers for one coordinate is a race with an immutable prize.

## Gradle and Maven, side by side

Only the plugin differs. The Portal requirements are the same file set, the same
POM elements and the same state machine.

| Concern | Gradle | Maven |
|---|---|---|
| Publishing plugin | `com.gradleup.nmcp` or `com.vanniktech.maven.publish` | `central-publishing-maven-plugin` 0.7.0 or above |
| Declared version | `version=` in `gradle.properties` | `<version>`, read with `mvn -q -DforceStdout help:evaluate -Dexpression=project.version` |
| Sources and javadoc jars | `java { withSourcesJar(); withJavadocJar() }`, or the wrapper plugin's equivalent | `maven-source-plugin` and `maven-javadoc-plugin` |
| Signing | `signing { sign(publishing.publications) }` with `useInMemoryPgpKeys` | `maven-gpg-plugin` |
| POM under review | `build/publications/*/pom-default.xml`, generated | The POM itself, plus the deployed copy |
| ABI gate placement | japicmp or `apiCheck` bound to `check`, publish tasks depend on it | japicmp bound to `verify`, ahead of `deploy` |
| Exit semantics | `publishingType = "AUTOMATIC"` or `automaticRelease = true` | `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>` |
| Reproducible archives | Gradle archive settings, owned by the build rules | `<project.build.outputTimestamp>` as an explicit ISO-8601 UTC instant in every publishing POM |
| Last CI goal before the release job | The project's own `check` target | `verify`, never `install`, `test`, `package` or a hyphenated intermediate phase |

## The MUST rows this procedure enforces

Merge-blocking rows, restated here as findings so a review that runs this
procedure without the rule files loaded still reports them with the right ID.
The depth, rationale and full verification live in the rule sets named by the
ID, and are not duplicated here.

| # | Finding | Rule |
|---|---|---|
| 1 | Namespace verification is not a checked precondition of the release job | GRADLE-PUB-01, MVN-PUB-04 |
| 2 | No step compares the git tag against the declared version before the first build step | GRADLE-PUB-02, MVN-PUB-05 |
| 3 | The generated POM is missing `name`, `description`, `url`, `licenses`, `developers` or a full `scm` block | GRADLE-PUB-04, MVN-PUB-07 |
| 4 | A published artifact has no matching `-sources.jar` or `-javadoc.jar` | GRADLE-PUB-05, MVN-PUB-08 |
| 5 | A deployed file has no `.asc`, `.md5` or `.sha1`, or signing is scoped to one publication | GRADLE-PUB-06, MVN-PUB-09 |
| 6 | A `credentials` block binds `username` or `password` to a string literal | GRADLE-PUB-08, MVN-PUB-06 |
| 7 | A Gradle-only variant that non-Gradle consumers need is left visible only in Gradle Module Metadata | GRADLE-PUB-09 |
| 8 | The release job exits at `VALIDATED` while its summary claims the release is live | GRADLE-PUB-14, MVN-PUB-10 |
| 9 | `mavenLocal()` is declared in a committed `repositories { }` block | GRADLE-PUB-15 |
| 10 | The release targets `oss.sonatype.org`, the OSSRH Staging API, or a nexus-staging plugin | GRADLE-PUB-16, MVN-PUB-03 |
| 11 | A published method signature changed in place rather than gaining an overload | JAVA-API-01 |
| 12 | The japicmp task is absent, not upstream of every publish task, or its accepted breaks are a bare suppression flag | JAVA-API-02 |
| 13 | A published Kotlin module runs neither ABI gate, or runs both | KT-API-03 |
| 14 | `central-publishing-maven-plugin` is pinned below 0.7.0 while a SNAPSHOT channel is claimed | MVN-PUB-01 |
| 15 | Maven 4 consumer-POM flattening or `bom` packaging is presented as shipping mechanism | MVN-PUB-02 |
| 16 | A publishing POM has no explicit `<project.build.outputTimestamp>` | MVN-BUILD-10 |

## What agents get wrong here

Ranked by how often it bites.

1. **Writes the release against `oss.sonatype.org`, or reaches for
   `nexus-staging-maven-plugin`.** OSSRH dominated training data through 2024
   and the 2025-06-30 sunset postdates most pretraining.
2. **Adds `mavenLocal()` to `repositories { }` to fix a "Could not resolve"
   error.** It is the single most training-data-common fix for that message, and
   it silences the symptom locally every time.
3. **Writes inline `credentials { username = "x"; password = "y" }`.** Both
   spellings compile, both work outside the configuration cache, and the literal
   is the shortest thing that satisfies the API.
4. **Calls `autoPublish = true` with `waitUntil` unset a fully automated
   release.** The option names read as sufficient and the gap between
   `VALIDATED` and `PUBLISHED` is invisible from the name.
5. **Deletes the `pom { }` customization on the theory that Gradle Module
   Metadata now carries the metadata.** GMM has been additive since Gradle 5 and
   was never a POM replacement, but "newer format supersedes older" is a strong
   prior.
6. **Signs and uploads first, then runs the compatibility check.** The ordering
   looks like a preference. Immutability makes it the whole point.
7. **Assumes Central supports OIDC trusted publishing because PyPI does**, and
   writes a tokenless release job that cannot authenticate.
8. **Sees `build.gradle.kts` and `pom.xml` in one repository and wires a second,
   parallel Maven release pipeline.** Every such `pom.xml` in the corpus is a
   consumability probe, not a second build.
9. **Frames Sigstore or build provenance as matching JVM ecosystem norms.**
   Corpus adoption is 0 of 32 for both, including bazel and gradle themselves.
   Recommend them as a deliberate step ahead, or not at all.
10. **Retries a 401 or 403 on first upload.** That response is step 1 skipped,
    and no number of retries completes a DNS TXT verification.
