---
name: jvm-dependency-triage
description: Three-entry-point triage for JVM dependency problems, with the exact Gradle, Maven and rules_jvm_external commands and what each output shape means. Use when a resolved version is not the one that was declared, when a dependency sits on the wrong configuration or scope, when NoClassDefFoundError appears at runtime but the build compiled clean, when a version bump or a Dependabot or Renovate pull request needs review, when Gradle and Maven disagree about which version wins, or when a coordinate has to be checked against the real repository before it is written down. Not for choosing a library. The gradle-build and maven-build rules carry the standards this procedure enforces.
license: Apache-2.0
metadata:
  summary: Ordered triage for the three dependency questions an agent gets wrong, keyed to the tool that reports the reason rather than the tool that reports the list
  keywords: dependency,triage,gradle,maven,bazel,dependencyInsight,dependency-tree,mediation,version-conflict,api-implementation,compileOnly,dependency-analysis,projectHealth,version-bump,dependency-locking,verification-metadata,enforcer,dependabot,renovate
---

# jvm-dependency-triage

Answer one of three questions about a JVM dependency graph, with evidence, in the build system the repository actually uses.

Contents: [Stop condition](#stop-condition) · [The evidence rule](#the-evidence-rule) · [Pick the entry point](#pick-the-entry-point) ·
[1. A version you did not choose](#1-a-version-you-did-not-choose) · [2. A declaration that is wrong](#2-a-declaration-that-is-wrong) ·
[3. A version you are about to bump](#3-a-version-you-are-about-to-bump) · [Pinned defaults](#pinned-defaults) ·
[MUST rows this procedure enforces](#must-rows-this-procedure-enforces) · [Failure modes](#failure-modes)

## Stop condition

Stop when the triage names all three. Any one missing and it is a guess wearing a command line.

- **Which mechanism selected the version.** Conflict resolution, a constraint, a platform, a force,
  or `dependencyManagement`. "It resolved to X" is not a mechanism.
- **The file and line where the fix goes.** A fix at a layer that did not decide has no effect and
  passes review.
- **The command whose output changed.** Before and after, captured.

Four edits stay out of scope in every case, each turning a diagnosis into an outage: hand-editing
a lockfile, hand-editing `gradle/verification-metadata.xml`, disabling verification to clear a
failure, and adding `mavenLocal()` or a repository to make a resolution failure go away. Gradle's
documentation restricts `mavenLocal()` to prototyping, and it binds resolution to one machine.

## The evidence rule

Every version string this procedure emits has been observed to resolve against the real repository
in this session. Not recalled, not inferred from a changelog, not read off a documentation page
header. A version that was not resolved is not stated at all. That is `GRADLE-DEP-18`, it is
binary, and it carries no percentage on purpose: model-generated coordinates that never existed
are measured, and the rate moves with every model generation while the check does not.

## Pick the entry point

| The question in front of you | Go to |
|---|---|
| A version resolved that nobody declared, or a declared version lost | [1](#1-a-version-you-did-not-choose) |
| `NoClassDefFoundError` at runtime, a consumer's compile broke, or a configuration or scope looks wrong | [2](#2-a-declaration-that-is-wrong) |
| A bump is proposed, by a person or by a bot | [3](#3-a-version-you-are-about-to-bump) |

Establish the build system first. Gradle resolves per *configuration*, so `runtimeClasspath` and
`compileClasspath` can answer differently for the same coordinate. Maven resolves one tree per
scope, and neither answer transfers.

## 1. A version you did not choose

### 1.1 Run the tool that reports the reason, not the one that reports the list

`dependencies` and `dependency:list` print what won. The commands below print *why*.

```bash
# Gradle: one coordinate, one configuration, with the selection reason.
./gradlew :lib:dependencyInsight --configuration runtimeClasspath \
  --dependency com.google.guava:guava
./gradlew :lib:dependencyInsight --configuration compileClasspath \
  --dependency com.google.guava:guava

# Maven: -Dverbose keeps the losing edges. Plain dependency:tree deletes them.
mvn -q dependency:tree -Dverbose -Dincludes=com.google.guava:guava

# Maven: what dependencyManagement says after the whole parent chain applies.
mvn -q help:effective-pom -Doutput=effective-pom.xml
grep -n -B 2 -A 6 -e 'guava' effective-pom.xml
```

Empty `dependencyInsight` output means the coordinate is not on that configuration at all, which
answers a different question. Empty output from the `effective-pom` grep means no managed entry
exists and mediation really was in charge.

### 1.2 Read the output shape, then check two things before calling a version wrong

| Output you see | What actually decided it | Where the fix goes |
|---|---|---|
| Gradle: `…:32.1.3-jre -> 33.4.0` with `Selection reasons: By conflict resolution: between versions …` | Gradle's default is highest-version-wins across the whole graph | Your own declaration, raised to at least the winning version, or a constraint |
| Gradle: `(by constraint)`, or a `platform(…)` line in the path | A `dependencyConstraint` or a platform recommended it | The constraint or the platform module, never the dependency line |
| Gradle: `Forced`, `(selected by rule)`, or `(by ancestor)` | A `force`, `strictly`, `enforcedPlatform()` or a `resolutionStrategy` rule, which beats every higher transitive request | The forcing declaration. In a published library that declaration is itself the finding |
| Gradle: `FAILED` | The coordinate does not resolve from the declared repositories at all | The version does not exist, or the repository list does not reach it |
| Maven: `(omitted for conflict with 31.1-jre)` | Mediation: **nearest definition by tree depth**, first-declared breaking ties, never highest version | A direct declaration at depth 0, or a `dependencyManagement` entry |
| Maven: `(version managed from 31.1-jre)` | `dependencyManagement` decided it *before* mediation ran | The owning `dependencyManagement` block, own POM first, then up the parent chain |
| Maven: `(omitted for duplicate)` | The same coordinate and version reached twice. Not a conflict at all | Nowhere |

Two traps. A reviewer carrying Gradle or npm intuition into a POM reads every Maven conflict
backwards and bumps a deeper transitive, which has no effect because depth 0 always beats depth
one or more. And a managed entry matches on `{groupId, artifactId, type, classifier}`, so a
mismatched classifier or type silently fails to apply while looking correct.

Under Bazel with `rules_jvm_external`, `version_conflict_policy` defaults to `"default"`,
Coursier's highest-wins, so another module's transitive request can outrank your explicit
`maven.install` artifact. `"pinned"` makes your declaration win, and
`maven.artifact(force_version = "true")` is the single-artifact exception. Neither vets a version
(`rules_jvm_external` 7.1, 2026-07-23, verified 2026-09-12).

**Some absurd-looking versions are load-bearing.** Guava publishes
`com.google.guava:listenablefuture:9999.0-empty-to-avoid-conflict-with-guava`, an empty
jar whose purpose is to win highest-wins resolution against the real `1.0` so that
`ListenableFuture` comes from guava's own jar and not from two jars at once. Forcing
`1.0` restores the duplicate-class conflict the coordinate prevents.

**A coordinate served by an unexpected repository is no longer a version question.** An
internally-owned group must resolve through
`exclusiveContent { forRepository { … }; filter { includeGroup(…) } }`, because
non-exclusive `content { includeGroup(…) }` restricts what one repository is *asked* for and
does not stop another repository in the list from answering.

```bash
grep -rn -e 'exclusiveContent' -e 'includeGroup' \
  --include='settings.gradle' --include='settings.gradle.kts' \
  --include='*.settings.gradle.kts' --include='*.gradle.kts' --include='*.gradle' .
```

An `includeGroup` for an internal namespace with no wrapping `exclusiveContent` is the finding.
Empty output is the pass only where no non-public repository is declared.

## 2. A declaration that is wrong

### 2.1 Stop trusting the local build

"My module compiles" is not evidence about `api` versus `implementation`. The failure lands on the
*consumer's* compile, so a green local `./gradlew build` is green in exactly the case the rule
exists for.

```bash
./gradlew :lib:projectHealth     # one module
./gradlew buildHealth            # whole build
mvn -q dependency:analyze        # Maven, a narrower question
```

An empty wrong-configuration section is the pass, and any advice in it is the finding. If
neither Gradle task exists, `com.autonomousapps.dependency-analysis` is not applied and there
is no mechanical answer at all: wire it with at least one issue category set to
`severity("fail")` first, because a missing finding from a plugin that is not installed is not
evidence.

Maven has no `api`/`implementation` split, and every `compile`-scope dependency is transitive to
consumers. `dependency:analyze` prints two sections. "Used undeclared dependencies" names types
the module compiles against through a transitive, and each gets declared directly. "Unused
declared dependencies" is advisory only: a dependency reached by reflection, a `ServiceLoader` or
an annotation processor is invisible to bytecode analysis and is listed as unused while being
required at runtime, and deleting from that list is how a build starts throwing
`NoClassDefFoundError`.

### 2.2 The compileOnly trap

A dependency reached at runtime through reflection, generated bytecode or a
`ServiceLoader` must never stay on `compileOnly`. The failure is a production
`NoClassDefFoundError` that unit tests sharing the compile classpath never see.

```bash
./gradlew :lib:dependencies --configuration runtimeClasspath
mvn -q dependency:list -DincludeScope=runtime
```

Read these for the coordinate, not for emptiness. A coordinate declared `compileOnly` and
absent from `runtimeClasspath` is the finding, and the fix is `implementation` or
`runtimeOnly`. The same defect wears two other names on the Maven side:
`<scope>provided</scope>` and `<optional>true</optional>` both stop propagation, so a
consumer relying on either gets the identical runtime failure.

Annotation processors are the one case where `compileOnly` is correct, paired with the
processor on `annotationProcessor`. A processor coordinate sitting in `implementation` is
order-dependent and silently skippable, reported as `unusedAnnotationProcessors`.

When fixing, `./gradlew fixDependencies --upgrade` only adds or widens. A bare `fixDependencies`
can *remove* a dependency the declaring module does not use but a consumer reaches through a
leaked transitive, so a published module always gets `--upgrade`.

### 2.3 The declarations that are wrong by kind

For the first three greps, empty output is the pass.

```bash
grep -rn -e 'enforcedPlatform(' --include='*.gradle.kts' --include='*.gradle' .
grep -rn -e 'strictly(' --include='*.gradle.kts' --include='*.gradle' \
  --include='*.versions.toml' .
grep -rnE -B 4 -e '</?systemPath>' --include='pom.xml' .
grep -rn -A 24 -e 'maven-enforcer-plugin' --include='pom.xml' .
```

- **`enforcedPlatform()`**: grep, then **read the owning module**, because a raw count flags
  the repository that gets this right. A hit on `api(` or `implementation(` in a module applying
  `maven-publish` is the finding, since the override is transitive and beats a consumer's own
  explicit version. A hit in a test configuration, a leaf application, or a platform whose build
  file states it is internal is correct.
- **`strictly(...)` and `!!`**: a hit in a published library's own `api` or `implementation`
  declaration is the finding. It forces the version on every consumer, it can make a resolvable
  graph unresolvable, and it is lossy through a published POM, where only the strongest surviving
  declaration publishes and `reject` is dropped. Fine in an application, a CLI, or a
  distribution, test or build-logic catalog.
- **`<systemPath>`**: any hit is a review item, and one with no sibling `<scope>system</scope>`
  is the finding. That scope resolves from a local path.
- **`maven-enforcer-plugin`**: empty output means enforcer is not wired, itself the finding. A
  hit passes only when a nested `<goal>enforce</goal>` sits inside an `<executions>` block in the
  same `<plugin>` element, because the plugin ships 37 built-in rules and zero active (enforcer
  3.6.3, 2026-05-15, verified 2026-09-12).

### 2.4 A catalog is not a pin, and a filename is not a catalog

A version catalog constrains *declared requests* only. Gradle's documentation states the
resolved version may still differ due to conflict resolution, so a transitive requesting higher
wins silently, with no build failure and no diff in the TOML.

```bash
grep -rn -e 'versionCatalogs' --include='settings.gradle' \
  --include='settings.gradle.kts' --include='*.settings.gradle.kts' .
grep -rln -e 'alias(libs.' --include='*.gradle.kts' --include='*.gradle' .
find . -name gradle.lockfile -o -name buildscript-gradle.lockfile
```

A hit from either of the first two proves a catalog exists whatever the file is called, and the
conventional name is not guaranteed: real catalogs ship under other names and get wired
programmatically from settings files. Empty output from both is the only evidence of no catalog.
The `find` is the pin question, and it must return a committed file before any "pinned" claim.

## 3. A version you are about to bump

### 3.1 Resolve the coordinate before emitting it

```bash
# Gradle, on a throwaway worktree with the candidate substituted.
./gradlew :lib:dependencies --refresh-dependencies --configuration runtimeClasspath
# Maven, one coordinate, no project required.
mvn -q dependency:get -Dartifact=com.google.guava:guava:33.4.0-jre
# The registry itself, when no build is available.
curl -sf 'https://search.maven.org/solrsearch/select?q=g:com.google.guava+AND+a:guava&core=gav&rows=5&wt=json'
```

The coordinate must appear resolved with no `FAILED` line. A failure, or a run that was not
performed, means the version does not get written down, and the commit or pull request carrying the
bump links that run or its captured log.

Query the registry, never the vendor banner: a project's documentation site header can run ahead
of what the repository serves, and the newest artifact in a line is often a milestone or release
candidate rather than the newest general availability release. Name both the version and the date
it was verified in whatever you write, because a version with no date is the finding in review.

Then re-run entry point 1 on both sides of the change, because a direct bump moves transitives.
Capture `dependencyInsight` or `dependency:tree -Dverbose` for the affected coordinates and diff
them. A bump whose only evidence is a green build is a bump whose transitives nobody read.

### 3.2 Carry the lock and the verification metadata

```bash
# A dedicated, gated lockfile-update job. Never the release or test job.
./gradlew --write-locks
git diff --stat -- gradle.lockfile buildscript-gradle.lockfile
./gradlew --write-verification-metadata sha256,pgp
git diff -- gradle/verification-metadata.xml
```

Gradle does not write lock state when the build fails, so a lockfile left by a failed chain is
stale and looks fine. Read the diff, never the file's presence. Never lock a configuration
resolving a changing or `-SNAPSHOT` version, which Gradle's documentation calls a misunderstanding
of both features: ranges are lockable, changing coordinates are not.

The regenerated `verification-metadata.xml` is not the control, the reviewed diff is, because
the bootstrap trusts whatever the repositories currently serve. A **new hash for a coordinate
and version that already had one** is the signal. Count only `sha256` and `sha512` entries as
verification, key every trusted key by its full 40-character fingerprint, and fix a
`checksum is missing from verification metadata` failure (the transitive-dependency trap) by
re-running the bootstrap, never by hand editing the XML and never by disabling verification.

Locking pins *resolution*, never *legitimacy*: a malicious first resolution locks in as
faithfully as a good one. Locking answers "did resolution change", verification answers "are
these the publisher's bytes", and neither substitutes for the other.

### 3.3 The bump must not leak a dynamic version

```bash
grep -rnE -e '-SNAPSHOT' -e 'latest\.(release|integration)' -e ':[0-9][^"]*\.\+' -e '"[0-9][^"]*\.\+"' -e '[:"]\[[0-9]' \
  --include='*.gradle.kts' --include='*.gradle' --include='*.versions.toml' .
mvn -q enforcer:enforce -Drules=banDynamicVersions
mvn -q enforcer:enforce -Drules=banDuplicatePomDependencyVersions
```

Empty grep output is the pass, and Gradle has no built-in `banDynamicVersions`, so this grep *is*
the gate. The two enforcer runs must exit zero. They invoke the goal directly and do not need an
`<execution>`, which is why the binding is its own finding (MVN-DEP-03): without it nothing runs
during `mvn verify`. Note the Maven range edge: `2.0-rc1 < 2.0`, so `[1.0,2.0)` includes the release
candidate. After publishing, the served POM carries no range, `+`, `LATEST` or `RELEASE`.

Maven 4 is not a bump target: Central tops the 4.0 line out at `4.0.0-rc-6` with no plain
`4.0.0` (queried 2026-09-12), so `<packaging>bom</packaging>` and consumer-POM flattening are
migration preview, not shippable mechanism.

### 3.4 Bot pull requests

Dependabot and Renovate split the measured corpus at 13 repositories each out of 32 with zero
overlap (2026-09-05), so detect which configuration file the repository carries before writing or
editing bot configuration, and treat a bot's proposed version as satisfying the evidence rule only
to the extent that you read the bot's own resolution rather than retyping the number.

## Pinned defaults

Agreed decisions, not derivations. Each is a default an adopter overrides once, none re-litigated during a triage.

| Decision | Default (pinned) |
|---|---|
| Committed dependency locking | MUST for a repository with a hard release boundary and a reproducibility requirement, SHOULD for an adopter. Zero of the 32 measured exemplar repositories lock (2026-09-05), so this is a new commitment rather than a codified convention |
| Dependency verification with `sha256,pgp` | MUST alongside locking for those same repositories, CONSIDER for an adopter. One of 32 carries the file, and that one is a build tool verifying its own build |
| The wrong-configuration gate | `projectHealth` or `buildHealth` in the same change, never a local `build` |

## MUST rows this procedure enforces

Duplicated as a hedge against the scoped rule set not being loaded. The rule text, rationale and
full verification live in `gradle-build/dependencies.md` and `maven-build/dependencies.md`, and a
disputed row is settled there.

| # | Finding | Rule |
|---|---|---|
| 1 | A version string emitted without being resolved against the real repository in this session | GRADLE-DEP-18 |
| 2 | A type on the public surface whose dependency is declared `implementation`, or a purely internal one declared `api` | GRADLE-DEP-01 |
| 3 | A `compileOnly` coordinate reached at runtime through reflection, generated bytecode or a `ServiceLoader` | GRADLE-DEP-02 |
| 4 | An annotation processor on the compile classpath instead of `annotationProcessor` | GRADLE-DEP-03 |
| 5 | `enforcedPlatform()` in a module published or consumed as a library | GRADLE-DEP-05 |
| 6 | `strictly(...)` or `!!` in a published library's own `api` or `implementation` declaration | GRADLE-DEP-06 |
| 7 | A range, `+`, `latest.release`, `latest.integration` or `-SNAPSHOT` in a build that produces a release artifact | GRADLE-DEP-07 |
| 8 | "No version catalog" concluded from the conventional filename rather than from content | GRADLE-DEP-08 |
| 9 | "Versions are pinned" claimed on version-catalog evidence, with no committed lockfile | GRADLE-DEP-09 |
| 10 | An internal group resolvable from a repository that is not exclusively filtered for it | GRADLE-DEP-11 |
| 11 | Resolution unlocked where a hard release boundary is claimed, or a lockfile that is not committed | GRADLE-DEP-12 |
| 12 | A locked configuration that resolves a changing or `-SNAPSHOT` version | GRADLE-DEP-13 |
| 13 | A regenerated `verification-metadata.xml` that no human reviewed as a diff | GRADLE-DEP-15 |
| 14 | Verification disabled, hand-edited, or resting on `md5`/`sha1` entries or short key ids | GRADLE-DEP-16 |
| 15 | A Maven version pick explained by mediation without first ruling out a `dependencyManagement` entry | MVN-DEP-01 |
| 16 | A Maven conflict "fixed" by editing a deeper transitive's declared version | MVN-DEP-02 |
| 17 | `maven-enforcer-plugin` present with no `<execution>` binding the `enforce` goal | MVN-DEP-03 |
| 18 | `banDynamicVersions` unbound on a POM that is released | MVN-DEP-04 |
| 19 | `banDuplicatePomDependencyVersions` unbound on any POM | MVN-DEP-05 |
| 20 | `<systemPath>` present, or present without `<scope>system</scope>` | MVN-DEP-08 |
| 21 | A non-concrete `<version>` in a published POM | MVN-DEP-10 |
| 22 | A Maven 4 only feature adopted as shipped mechanism | MVN-DEP-11 |

## Failure modes

1. **Emitting a version string from training data.** Binary, no partial credit.
2. **Reading Maven mediation as highest-version-wins**, then "fixing" a POM that changes nothing. Gradle and Bazel default that way, Maven does not.
3. **Confusing `dependencyManagement` with mediation**: "Maven picked X because it is nearest" when a managed entry decided it first.
4. **Accepting "the build passes" as evidence about `api` versus `implementation`.** The leak compiles locally and fails at the consumer.
5. **Treating a version catalog as a lockfile.** The newer, better documented idiom, so the claim gets made while nothing constrains resolution.
6. **Forcing a version that looks absurd and is deliberate**, the `listenablefuture:9999.0-empty-to-avoid-conflict-with-guava` shape.
7. **Adding `mavenLocal()` or a repository to clear a resolution failure.** The reflex right after a bump, and it binds the build to one machine.
8. **Reaching for `enforcedPlatform()` when it means `platform()`.** One word apart, and the stronger-sounding one changes the override's transitivity.
9. **Deleting from `dependency:analyze`'s unused-declared list.** Reflection, `ServiceLoader` and processor dependencies are invisible to bytecode analysis.
10. **Stopping after `--write-verification-metadata`.** That produces a file, not a control. The reviewed diff is the control.
11. **Claiming locking prevents supply-chain attacks.** Category error, it prevents drift.
12. **Adding `maven-enforcer-plugin` with a `<rules>` block and no `<executions>`.** It compiles, it reviews clean, and it runs nothing.
13. **Running a bare `fixDependencies` on a published module**, deleting a dependency a consumer reaches through a leaked transitive.
14. **Assuming Maven 4 features are shippable** because "Maven 4" reads as released in older training snapshots.
