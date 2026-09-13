---
title: Locking, Verification, and the 28% Problem
topic: gradle-dependency-supply-chain
agent: jvm-dependencies/locking-verification-supply-chain
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers Gradle dependency locking (`dependencyLocking`, lockfile shapes, lock
  modes), Gradle dependency verification (checksums, PGP, bootstrapping),
  repository content filtering, Gradle wrapper checksum validation, Maven
  Central namespace verification, and the AI-agent-specific hallucinated
  dependency-version failure mode with its required mitigation. Does not cover
  BOM/platform version alignment (well-practiced, covered elsewhere in the
  `gradle-build/dependencies.md` depth file — M-C-04 through M-C-08, M-C-13),
  Maven's `enforcer-plugin` equivalents, or Bazel's `maven_install.json` pinning
  (sibling topic).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Dependency locking: commands, on-disk shape, and failure semantics](#1-dependency-locking-commands-on-disk-shape-and-failure-semantics)
   2. [Dependency verification: bootstrap, hashes, signatures, and the trust bootstrap problem](#2-dependency-verification-bootstrap-hashes-signatures-and-the-trust-bootstrap-problem)
   3. [Repository content filtering](#3-repository-content-filtering)
   4. [Gradle wrapper checksum validation in CI](#4-gradle-wrapper-checksum-validation-in-ci)
   5. [Maven Central namespace verification and its limits](#5-maven-central-namespace-verification-and-its-limits)
   6. [Real-world exploit: the Jackson prefix-swap typosquat](#6-real-world-exploit-the-jackson-prefix-swap-typosquat)
   7. [Supply-chain scale and the AI-assisted 28% problem](#7-supply-chain-scale-and-the-ai-assisted-28-problem)
   8. [SLSA and OSSF Scorecard as the wider frame](#8-slsa-and-ossf-scorecard-as-the-wider-frame)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Dependency locking pins exact resolved versions but is **not enabled by
  default** and **0/32 exemplars use it for real** — a new commitment this
  rule set imposes, not a convention it codifies ([shape](../jvm-audit/exemplar-build-shape.md), [pub](../jvm-audit/exemplar-publishing-ci-bazel.md)).
- Dependency verification (`gradle/verification-metadata.xml`) is even rarer:
  **1/32 exemplars** (gradle/gradle's own build), 1030 lines, PGP signatures
  on, raw metadata-file verification off ([shape](../jvm-audit/exemplar-build-shape.md)).
- Locking answers "did resolution change since last time" (integrity of
  *your own* history); verification answers "is this byte the one the
  publisher shipped" (integrity against a *third party*). They are
  independent controls — enabling one does nothing for the other.
- Locking is fundamentally incompatible with `-SNAPSHOT`/changing versions:
  Gradle's own docs call combining them "a misunderstanding of these
  features" that "can lead to unpredictable results" — never recommend both
  together in the same rule.
- A failed build **never persists** lock-state changes — "Gradle won't write
  the lock state to disk if the build fails" — so a CI job that runs
  `--write-locks` and then fails for an unrelated reason leaves the
  lockfile untouched; agents must not treat lockfile silence as success.
- The bootstrap command `--write-verification-metadata sha256,pgp` **trusts
  whatever is currently resolvable right now** — Gradle's own docs state this
  plainly as "a critical security limitation." The generated file is not
  evidence of security; the reviewed *diff* against the previous file is the
  actual control.
- Only **SHA-256 and SHA-512** count as secure per Gradle's docs; MD5 and
  SHA-1 are explicitly named as insufficient ("SHA-1 has known collisions and
  MD5 should not be used").
- PGP signature verification proves an artifact "was signed by a specific
  key," never that "the signatory was legitimate" — Gradle's own docs state
  this distinction verbatim. A trusted-key allowlist is what does the actual
  work, not the presence of a signature.
- The exact failure text on an unverified new dependency is
  `Dependency verification failed for configuration ':<name>': ... checksum
  is missing from verification metadata.` — this is the string an agent
  should recognize and never "fix" by disabling verification.
- Repository content filtering (`exclusiveContent { … }`,
  `includeGroup`) is the documented Gradle control against dependency
  confusion, but only **4/25** Gradle exemplars set even the weaker
  `repositoriesMode(FAIL_ON_PROJECT_REPOS)` — measured, not codified practice.
- The Jackson prefix-swap malware (`org.fasterxml.jackson.core` vs the real
  `com.fasterxml.jackson.core`) is the concrete case for content filtering:
  Maven Central's own namespace verification checks only the exact domain
  (`fasterxml.org` vs `fasterxml.com`), so a malicious namespace one
  character off from a real one passes verification on its own merits.
- Central Portal namespace verification proves domain or SCM-repo control,
  never artifact-content legitimacy — the FAQ is explicit that fake
  components impersonating `org.apache` or `com.google`-style prefixes are
  exactly what it is meant to stop, but it says nothing about the bytes
  inside a verified namespace's own releases.
- Sonatype's 2026 supply-chain research measured ~37,000 unique
  package-version pairs (~258,000 total recommendations) across
  Maven/npm/PyPI/NuGet; hallucination rates per model ranged from ~25%
  (Claude Sonnet 3.7, Gemini 2.5 Pro, older-generation models) down to ~7%
  (frontier 2026 models), with "around one in four" cited as the
  representative older-model rate — this is the empirical source for the
  brief's "28%" figure.
- The agent-specific mitigation is mechanical, not judgment-based: before
  proposing any version bump, resolve the *exact* coordinate+version against
  the real repository (`./gradlew dependencies --write-locks` in a scratch
  invocation, or a direct Maven Central/Central Portal API lookup) and refuse
  to emit a version string that did not come back from that resolution.
- `gradle-wrapper.jar` checksum validation (`gradle/actions/wrapper-validation`,
  superseding `gradle/wrapper-validation-action` as of v3) is a MUST for any
  repo that commits a wrapper — it is the one control in this file that is
  free, fast, and has zero adoption cost.
- SLSA Build L1 ("provenance exists") is achievable by any CI-built JVM
  artifact; L2 (signed provenance, hosted build platform) and L3 (hermetic,
  isolated builds) are aspirational for a Gradle/Maven build today and should
  not be asserted as met without an actual signed-provenance step in CI.
- OSSF Scorecard's `Pinned-Dependencies`, `Signed-Releases`, `SBOM`, and
  `Dependency-Update-Tool` checks are the closest existing automated proxies
  for "does this repo practice supply-chain hygiene" and are a cheap
  CI addition independent of anything Gradle-specific.

## Findings

### 1. Dependency locking: commands, on-disk shape, and failure semantics

Locking is opt-in per configuration or globally via
`dependencyLocking { lockAllConfigurations() }` in `build.gradle.kts`, and
locks only the *project* configurations by default, not the buildscript
classpath — locking the buildscript needs its own opt-in and produces a
separate file:

```kotlin
// build.gradle.kts
dependencyLocking {
    lockAllConfigurations()
}
```

Generate or refresh lock state by re-running any resolving task with
`--write-locks`:

```bash
./gradlew dependencies --write-locks
```

Update only named modules without touching the rest of the lock state:

```bash
./gradlew dependencies --update-locks org.apache.commons:commons-lang3,org.slf4j:slf4j-api
```

`--update-locks` takes a comma-separated list of `group:module` notations and
supports wildcards (`org.apache.commons:*`, `*:guava`)
([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).

On-disk shape, `gradle.lockfile` at the project root (per-project, not a
single root-level file for multi-module builds — every subproject that locks
gets its own):

```
# This is a Gradle generated file for dependency locking.
# Manual edits can break the build and are not advised.
# This file is expected to be part of source control.
# To regenerate this file, run: ./gradlew :dependencies --write-locks
org.springframework:spring-beans:5.0.5.RELEASE=compileClasspath, runtimeClasspath
org.springframework:spring-core:5.0.5.RELEASE=compileClasspath, runtimeClasspath
empty=annotationProcessor
```

Each line is `group:artifact:version=configuration[, configuration...]`,
alphabetically ordered for stable diffs; a configuration with nothing locked
still appears on an `empty=` line so its absence from the lockfile is never
ambiguous with "not yet locked"
([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).
The buildscript classpath locks to a **differently named** file —
`buildscript-gradle.lockfile` — because it is resolved before the project
build script and cannot share the project's lock state
([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).

Lock modes, set via `dependencyLocking { lockMode = LockMode.STRICT }`:

| Mode | Behavior |
|---|---|
| `DEFAULT` | Resolution must match lock state exactly; new/removed dependencies fail the build |
| `STRICT` | All of `DEFAULT`, plus: a configuration marked locked with **no** lock state at all is a hard failure (catches "someone deleted the lockfile") |
| `LENIENT` | Dynamic versions are still pinned, but adding/removing dependencies and transitive shifts no longer fail the build — explicitly recommended only "for testing nightly or snapshot builds" |

([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html))

Once locked, Gradle enforces the locked version **as if declared with
`strictly()`**: a `build.gradle.kts` declaration of a *higher* version than
the lockfile fails resolution rather than silently upgrading — the fix is
always `--write-locks`, never editing the lockfile by hand
([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).

Two hard incompatibilities:

- **Changing/`-SNAPSHOT` versions.** "It should not be used with changing
  versions (e.g., `-SNAPSHOT`)... Using dependency locking with changing
  versions indicates a misunderstanding of these features and can lead to
  unpredictable results" — Gradle's own docs, verbatim
  ([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).
  Locking is compatible with *dynamic* versions (ranges) — it pins them to a
  resolved value — but not with content-mutable coordinates.
- **Failed builds never persist lock changes.** "Gradle won't write the lock
  state to disk if the build fails, preventing the persistence of potentially
  invalid states" ([dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html)).
  An agent scripting `./gradlew dependencies --write-locks && ./gradlew build`
  must check the *first* command's own exit code and the lockfile's git diff,
  not infer success from the lockfile simply existing afterward.

### 2. Dependency verification: bootstrap, hashes, signatures, and the trust bootstrap problem

Bootstrap by running the project once with the flag, which resolves every
dependency, computes checksums (and PGP signatures if requested), and writes
`gradle/verification-metadata.xml`:

```bash
./gradlew --write-verification-metadata sha256,pgp
```

`sha256` alone is valid too, but signatures are "recommended when signatures
are available"
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html)).
The flag requires the list of checksum kinds, or `pgp`, or both — there is no
bare `--write-verification-metadata` with an implicit default.

Only two hash algorithms are treated as secure. Gradle's docs list all four
it supports and then narrow them explicitly: "Gradle supports MD5, SHA1,
SHA-256, and SHA-512 checksums. However, only SHA-256 and SHA-512 are
considered secure for modern use. SHA-1 has known collisions and MD5 should
not be used."
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html)).
A rule that accepts `md5` or `sha1` entries in `verification-metadata.xml` as
satisfying "verified" is wrong on Gradle's own terms.

The exact failure text on a dependency resolved without a matching metadata
entry (e.g. a new transitive dependency the bootstrap run never saw):

```
Execution failed for task ':compileJava'.
> Dependency verification failed for configuration ':compileClasspath':
    - On artifact commons-logging-1.2.jar (commons-logging:commons-logging:1.2) in repository 'MavenRepo': checksum is missing from verification metadata.
    - On artifact commons-logging-1.2.pom (commons-logging:commons-logging:1.2) in repository 'MavenRepo': checksum is missing from verification metadata.
```
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html))

This is a **transitive-dependency trap**: adding a checksum for a direct
dependency without re-running the bootstrap for its transitives reliably
produces this failure the first time the graph resolves in CI. The
prescribed fix is re-running `--write-verification-metadata` to append the
new entries, never hand-editing the XML
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html)).

Signature verification proves provenance, not trustworthiness. Verbatim:
"Not all artifacts are published with signatures, and signature verification
doesn't guarantee the signatory was legitimate—only that the artifact was
signed by a specific key"
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html)).
The actual control is the `<trusted-keys>` allowlist, keyed by full 40-character
PGP fingerprints (Gradle requires the full fingerprint for `trusted-key`,
rejecting short/long key IDs "to minimize the risk of collision attacks"):

```xml
<trusted-keys>
   <trusted-key id="8756c4f765c9ac3cb6b85d62379ce192d401ab61" group="com.github.javaparser"/>
</trusted-keys>
```
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html))

The chicken-and-egg problem is stated by Gradle itself, not inferred:
"bootstrapping has a critical security limitation: it trusts whatever is
currently in your repositories. If a malicious dependency has already been
introduced into your build (or into a repository you use), Gradle will
record the compromised artifact's checksum or signature"
([dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html)).
Practically: the bootstrap command produces a file, not a verdict. The
control is a human (or a separate, independently-sourced trust anchor)
reviewing the **diff** the bootstrap run produces against the previously
committed file — new hash for an existing coordinate/version is the signal
worth flagging, not the presence of the file.

### 3. Repository content filtering

Two forms exist. Non-exclusive `content { includeGroup(...) }` restricts what
a *given* repository is asked to serve, without stopping other repositories
from serving the same coordinate:

```kotlin
repositories {
    maven {
        url = uri("https://repo.mycompany.com/maven2")
        content {
            includeGroup("my.company")
        }
    }
}
```

`exclusiveContent { }` is the confusion-proof form — it makes coordinates
matched by the filter resolvable **only** from the named repository, and
nowhere else in the repository list:

```kotlin
repositories {
    mavenCentral()
    exclusiveContent {
        forRepository {
            maven { url = uri("https://repo.mycompany.com/maven2") }
        }
        filter {
            includeGroup("my.company")
        }
    }
}
```

This is the documented Gradle Best Practice for internal-coordinate safety —
"an artifact declared in a repository can't be found in any other" once
`exclusiveContent` names it
([filtering_repository_content.html](https://docs.gradle.org/current/userguide/filtering_repository_content.html)).
`includeGroupByRegex(...)` is available for pattern-based internal-namespace
prefixes. One caveat: applying exclusive filtering inside
`pluginManagement { repositories { } }` makes it "illegal to add more
repositories through the project `buildscript.repositories`" — a
settings-level decision, not one to make lightly per-module
([filtering_repository_content.html](https://docs.gradle.org/current/userguide/filtering_repository_content.html)).

### 4. Gradle wrapper checksum validation in CI

`gradle/wrapper-validation-action` is superseded by
`gradle/actions/wrapper-validation` as of `v3` — the old action now
transparently delegates:

```yaml
# current (gradle/actions)
- uses: actions/checkout@v6
- uses: gradle/actions/wrapper-validation@v6
```

The action "validates the checksums of all Gradle Wrapper JAR files present
in the repository and fails if any unknown Gradle Wrapper JAR files are
found," run recursively from the repo root
([gradle/actions wrapper-validation README](https://github.com/gradle/actions/blob/main/wrapper-validation/README.md)).
As of `gradle/actions/setup-gradle@v4`, wrapper validation runs
**automatically on every execution**, so a repo already using `setup-gradle`
v4+ in CI does not need the separate action — an agent proposing to add
`wrapper-validation` should first check whether `setup-gradle@v4` (or later)
is already present
([gradle/actions wrapper-validation README](https://github.com/gradle/actions/blob/main/wrapper-validation/README.md)).

### 5. Maven Central namespace verification and its limits

Central Portal registration requires proving control of either the DNS
domain backing the namespace or the source-code host (GitHub sign-in grants
an automatic `io.github.<username>` namespace, "which reduces the effort
required to publish to Maven Central by offloading part of the verification
process... to GitHub")
([central.sonatype.org/faq/verify-ownership](https://central.sonatype.org/faq/verify-ownership/)).
DNS verification is domain-exact: "the automated system checks the exact
domain for the namespace... you must add a TXT record with the verification
key associated with the namespace registration request"
([central.sonatype.org/faq/verify-ownership](https://central.sonatype.org/faq/verify-ownership/)).

The FAQ states its own purpose directly: "We require some basic verification
steps for your requested group ID to help protect both publishers and
consumers of the Central Repository," naming the two threats it targets —
"fake components published by someone that's impersonating an organization
such as org.apache or com.google" and "namespace squatted on by someone who
does not control your DNS domain or SCM hosted project"
([central.sonatype.org/faq/verify-ownership](https://central.sonatype.org/faq/verify-ownership/)).
Nowhere does this page, or any linked Central Portal doc, extend that
guarantee to artifact *contents*: verification is proof of domain/repo
control at registration time, not an audit of what gets published under that
namespace afterward, ever.

### 6. Real-world exploit: the Jackson prefix-swap typosquat

In late 2025/2026 Aikido Security found a malicious package published as
`org.fasterxml.jackson.core:jackson-databind` — the real library is
`com.fasterxml.jackson.core:jackson-databind`. The attacker registered
`fasterxml.org` (the real project owns `fasterxml.com`) and passed Central's
domain-exact DNS verification for the `org.fasterxml.jackson.core` namespace
on its own terms — verification worked correctly and still let the attack
through, because verification proves domain control, not "this is the
project you think it is"
([aikido.dev](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware)).
The payload was a Cobalt Strike beacon (`svchosts.exe` on Windows, `update`
on Linux/macOS) delivered via a trojan downloader triggered by
`@Configuration` auto-scanning; Maven Central removed it roughly 1.5 hours
after it was reported
([aikido.dev](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware)).
This is the concrete case for content filtering (Finding 3): a build that
never asks a public repository for `org.fasterxml.jackson.core` in the first
place cannot resolve the malicious package regardless of what Central allows
to exist.

### 7. Supply-chain scale and the AI-assisted 28% problem

Sonatype's 2026 research analysed ~37,000 unique package-version pairs
(~258,000 total upgrade recommendations) across Maven Central, npm, PyPI, and
NuGet, checking every AI-recommended version against the real registries.
Non-existent versions were classified as hallucinations. Per-model rates
ranged widely: older/ungrounded models (Claude Sonnet 3.7, Gemini 2.5 Pro)
hallucinated roughly a quarter of recommendations ("around one in four"),
mid-tier models (GPT-5) around 15%, and 2026 frontier models (Claude Opus
4.6, Gemini 3 Pro, GPT-5.2) down to 7–8%
([sonatype.com/resources/research/making-ai-work-safely](https://www.sonatype.com/resources/research/making-ai-work-safely)).
The brief's "28%" figure sits at the upper end of this range — the
aggregate/older-model rate, not the frontier-model rate — and the report's
own framing is that "hallucinations are not an edge-case anomaly" at that
rate ([sonatype.com/resources/research/making-ai-work-safely](https://www.sonatype.com/resources/research/making-ai-work-safely)).
Grounding the recommendation in a real registry lookup (Sonatype's own
mitigation, and the general prescription below) cut the best small grounded
model's hallucination rate to 6.8% while achieving a 269–309% mean security
score improvement over ungrounded frontier models
([sonatype.com/press-releases/sonatype-research-on-ai-coding-safety](https://www.sonatype.com/press-releases/sonatype-research-on-ai-coding-safety)).
Sonatype's separate 2026 malware census found 454,648 new malicious open
source packages in 2025 (up ~75% year over year) across npm, PyPI, Maven
Central, NuGet, and Hugging Face, with npm carrying over 99% of the raw
count — Maven Central's malware count is comparatively small in absolute
terms, but the Jackson case (Finding 6) shows a single high-value-namespace
hit is enough to matter
([sonatype.com/press-releases](https://www.sonatype.com/press-releases/sonatype-research-reveals-open-malware-grows-75-percent)).

### 8. SLSA and OSSF Scorecard as the wider frame

SLSA v1.1 Build levels, each strictly containing the guarantees of the one
below:

| Level | Guarantee | Achievable today for a Gradle/Maven build |
|---|---|---|
| L1 — Provenance exists | "Can be used to prevent mistakes but is trivial to bypass or forge" | Yes — any CI job emitting a build manifest qualifies |
| L2 — Hosted build platform | Provenance is signed by the platform itself; "forging... requires an explicit attack" | Yes on GitHub Actions/other hosted CI with signed attestations, but requires an explicit signing step most JVM builds do not have today |
| L3 — Hardened builds | Isolation between builds and secret material inaccessible to build steps; forging "requires exploiting a vulnerability" | Aspirational — no exemplar in this corpus demonstrates it |

([slsa.dev/spec/v1.1/levels](https://slsa.dev/spec/v1.1/levels))

OSSF Scorecard's most relevant automated checks for this topic:
`Pinned-Dependencies` (are dependencies pinned to a specific version/hash,
not a floating range), `Signed-Releases` (are releases cryptographically
signed), `SBOM` (is a software bill of materials published), and
`Dependency-Update-Tool` (is Dependabot/Renovate or similar configured) —
none of these are Gradle- or Maven-specific, so they are a cheap orthogonal
gate to run regardless of build tool
([ossf/scorecard docs/checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md)).

## Normative guidance candidates

1. **A published library or an OCX SDK build MUST enable dependency locking
   on every non-changing configuration** (`dependencyLocking {
   lockAllConfigurations() }` plus a committed `gradle.lockfile` per
   project). *Rationale*: without it, "same commit, different day" can
   resolve a different dependency graph on a dynamic version. *Verify*:
   `test -f gradle.lockfile` (or per-subproject) exists and is tracked by
   git; `git log -- '**/gradle.lockfile'` shows it changing only alongside a
   deliberate dependency-version commit, never silently.
2. **Never combine dependency locking with a `-SNAPSHOT`/changing version
   in the same configuration.** *Rationale*: Gradle's own docs call this
   "a misunderstanding of these features" with unpredictable results.
   *Verify*: `grep -n "SNAPSHOT\|changing = true" build.gradle.kts` on any
   module whose configurations are locked; a hit is a defect, not a style
   nit.
3. **CI MUST treat a missing lock-state update as a build failure, not a
   silent pass-through, by running the normal build first and
   `--write-locks` only in a separate, gated "update lockfile" job.**
   *Rationale*: a failed build never persists lock changes, so
   `--write-locks && exit 0` in the main job masks failures behind an
   apparently-clean lockfile. *Verify*: read the CI workflow YAML for a
   `--write-locks` invocation inside the same job as the release/test build,
   not a dedicated maintenance job.
4. **An SDK or plugin project MUST bootstrap and commit
   `gradle/verification-metadata.xml` with `sha256,pgp`, and every
   regeneration diff MUST be reviewed before merge — never auto-merged.**
   *Rationale*: the bootstrap step "trusts whatever is currently in your
   repositories"; the file itself is not evidence, the reviewed diff is.
   *Verify*: `<verify-signatures>` is `true` and the file is present; a
   named human reviewer or a required PR review on any diff touching
   `verification-metadata.xml` (branch-protection rule, not a Gradle
   setting).
5. **`verification-metadata.xml` MUST NOT rely on `md5` or `sha1` entries
   as sufficient verification.** *Rationale*: Gradle's own docs state only
   SHA-256/SHA-512 are secure. *Verify*:
   `grep -c '<sha256>\|<sha512>' gradle/verification-metadata.xml` should be
   nonzero for every `<component>`; `grep -c '<md5>\|<sha1>' ...` entries
   alone (no accompanying sha256/512) is a finding.
6. **A build that enables PGP signature verification MUST maintain an
   explicit `<trusted-keys>` allowlist by full 40-character fingerprint, not
   rely on "any valid signature passes."** *Rationale*: signature
   verification proves signing, never legitimacy of the signer. *Verify*:
   grep `verification-metadata.xml` for `<trusted-key id="` entries with
   40-hex-character `id` attributes; a bare `<trust-all>`-shaped
   configuration (if present) is a finding.
7. **Repository declarations for any internally-owned group MUST use
   `exclusiveContent { filter { includeGroup(...) } }`, not a bare
   `content { includeGroup(...) }`, when the same coordinate could otherwise
   resolve from a public repository.** *Rationale*: non-exclusive filtering
   restricts what one repo serves but does not stop dependency confusion
   from another repo in the list; the Jackson prefix-swap shows a
   near-identical public coordinate is a live attack, not theoretical.
   *Verify*: `grep -n "exclusiveContent" settings.gradle.kts
   build.gradle.kts`; presence of `includeGroup` without a wrapping
   `exclusiveContent` for any internal namespace is a finding.
8. **`settings.gradle.kts` SHOULD set
   `dependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS) }`.**
   *Rationale*: it is the cheaper, coarser-grained companion to content
   filtering — closing the "a subproject silently adds its own repository"
   loophole with one line. *Verify*: `grep -n
   "FAIL_ON_PROJECT_REPOS" settings.gradle.kts`.
9. **Every repository that commits `gradle-wrapper.jar` MUST run
   `gradle/actions/wrapper-validation` (or `setup-gradle@v4`+, which runs it
   automatically) in CI.** *Rationale*: free, zero-config, and the one
   control here with no adoption cost or false-positive risk. *Verify*:
   grep the CI workflow for `gradle/actions/wrapper-validation` or a
   `gradle/actions/setup-gradle` major version ≥ 4.
10. **An agent proposing a dependency-version bump MUST run a live
    resolution against the real repository before emitting the version
    string, and MUST refuse to state a version it did not observe resolve.**
    *Command*: `./gradlew <module>:dependencies --write-locks
    --refresh-dependencies` (or, without touching the lockfile,
    `./gradlew <module>:dependencies` with the candidate version already
    substituted, checking the task output for a "FAILED to resolve" line)
    against a throwaway branch/worktree — never propose a version string
    sourced only from training data or a changelog page not cross-checked
    against the actual repository response. *Rationale*: Sonatype measured
    ~28% (up to "one in four") of unvalidated LLM version recommendations as
    references to versions that do not exist. *Verify*: the PR/commit that
    bumps a version links a CI run (or a locally captured resolution log)
    showing that exact coordinate:version resolved successfully.

## Exemplar evidence

- **Locking: 0/32 real, 1/32 apparent.** `dependencyLocking`/`*.lockfile`:
  zero real hits across all 32 repos including gradle/gradle itself. The one
  `gradle.lockfile` path in the corpus,
  `gradle__gradle@ea17004a31:platforms/documentation/docs/src/snippets/reference/dependency-management/dependency-management/dependencyLocking-lockingSingleFilePerProject/common/gradle.lockfile`,
  is a documentation snippet demonstrating the feature to Gradle's own
  readers, not a lock on gradle/gradle's build
  ([exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md)).
  Candidate 1 has **zero exemplar support anywhere in the corpus** — ground
  any authored example synthetically, never cite a repo as demonstrating it.
- **Verification: 1/32.** `gradle__gradle@ea17004a31:gradle/verification-metadata.xml`
  is 1030 lines, `verify-metadata=false` / `verify-signatures=true`, 258
  `<trusted-key>` entries, verifying PGP signatures rather than raw checksums
  ([exemplar-build-shape.md:374](../jvm-audit/exemplar-build-shape.md)). This
  is exemplar support for Candidates 4 and 6 from exactly one repo — cite it,
  but do not claim it as "how the ecosystem does it," only "how the build
  tool's own maintainers do it."
- **Content filtering: 4/25 even for the weaker signal.**
  `repositoriesMode(FAIL_ON_PROJECT_REPOS)` appears in only nowinandroid,
  detekt, dagger, and ktlint of 25 Gradle-primary repos
  ([exemplar-build-shape.md:224](../jvm-audit/exemplar-build-shape.md)).
  `exclusiveContent` itself was not separately censused by the audits — treat
  Candidate 7 as unmeasured, and Candidate 8 as backed by exactly these four
  repos, 4/25.
- **`enforcedPlatform(` counter-example (adjacent finding, useful context):**
  `spring-projects__spring-boot@93b23c40c2` is the corpus's only user of
  `enforcedPlatform(` (13 hits) and is itself a library — the case Gradle's
  docs warn against, since it forces version wins onto every downstream
  consumer's own graph ([exemplar-build-shape.md:376](../jvm-audit/exemplar-build-shape.md)).
  Not this subarea's rule, but relevant: a project that gets locking right
  and platform-alignment wrong still ships a library that overrides its
  consumers.

## AI-agent angle

- **Hallucinated version strings, the headline failure.** An LLM trained on
  a snapshot of package history will confidently emit a plausible-looking
  version (`jackson-databind:2.19.3` when the real latest is `2.18.x`) that
  never existed. Mechanical check: Candidate 10's live resolution — the
  version either resolves or it does not; there is no partial credit.
- **Treating the bootstrap command as a completed security step.** An agent
  told "add dependency verification" that runs
  `--write-verification-metadata sha256,pgp` and stops has produced a file,
  not a control — Gradle's own docs call this "a critical security
  limitation." Mechanical check: does the PR that adds/updates
  `verification-metadata.xml` also carry a second reviewer's approval on
  that specific diff (branch-protection CODEOWNERS entry on the file), not
  just a green CI run.
- **Confusing locking with verification, or claiming one covers the other.**
  Both are commonly requested together as "supply chain security" but solve
  different problems (own-history integrity vs third-party-byte integrity).
  Mechanical check: a PR description or rule claiming "dependency locking
  prevents supply chain attacks" is a category error — locking prevents
  *drift*, not a *malicious* new version that also gets locked in on first
  resolution.
- **Groovy-era or pre-catalog idioms for repository declaration.** An LLM
  trained on older material may propose per-module `repositories { maven {
  url "..." } }` blocks instead of centralizing in
  `settings.gradle.kts` `dependencyResolutionManagement`, which is also what
  makes `FAIL_ON_PROJECT_REPOS`/content filtering enforceable at all.
  Mechanical check: `grep -rn "^\s*repositories\s*{" **/build.gradle.kts`
  outside the root/settings file is a smell once centralization is adopted.
- **Assuming namespace verification (Central Portal) or PGP signing implies
  "safe to add."** An agent evaluating a new dependency by "is it on Maven
  Central under a verified namespace" alone reproduces exactly the gap the
  Jackson attack exploited. Mechanical check: cross-reference the proposed
  group id against the project's actual published domain/homepage
  (`com.fasterxml.jackson.core` vs a lookalike `org.` or `net.` prefix)
  before accepting a "looks right" coordinate.
- **Recommending `enforcedPlatform()` for a library because it "forces the
  right version."** Trained-on-blog-posts intuition treats "force" as
  stronger and therefore safer; Gradle's docs and the spring-boot
  counter-example (above) say the opposite for anything that is not a leaf
  application. Mechanical check: `grep -n "enforcedPlatform("
  **/build.gradle.kts` in a project whose own `build.gradle.kts` also
  applies `maven-publish`/`java-library` — a hit is a candidate to downgrade
  to `platform(`.

## Contested / evolving

- **Whether locking should be a MUST for every JVM project, or only for
  applications/SDKs with a release boundary.** Gradle documents it as
  available everywhere but the exemplar corpus shows literally 0/32 adoption
  even in flagship libraries — this rule set is choosing to make it a MUST
  for the OCX SDK and Gradle plugin specifically (both have a hard release
  boundary and reproducibility requirement) while leaving it a SHOULD
  elsewhere, as of 2026-09-12. This is a genuine gap between documented
  capability and observed practice, not a settled community consensus.
- **Verification-metadata adoption is trending up industry-wide (multiple
  2025-2026 supply-chain incidents cited as the driver) but the exemplar
  corpus has not caught up** — 1/32 as measured. Expect this ratio to shift
  over the next 1-2 years as more OSS projects respond to incidents like the
  Jackson typosquat; re-measure before asserting a different ratio.
- **SLSA L2/L3 for JVM builds specifically is still emerging tooling**, with
  no single canonical "SLSA-for-Gradle" plugin as of this writing; treat any
  claim of "SLSA L3 compliant Gradle build" as unverified until the actual
  signed-provenance mechanism is named.
- **The Sonatype hallucination-rate figures span a wide range (7%-25%+)
  depending on model generation** and are dropping fast as frontier models
  improve and as grounded/tool-using agents (which is what this fleet is)
  replace ungrounded chat-only recommendations — cite the range, not a
  single frozen percentage, past 2026.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [docs.gradle.org/current/userguide/dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html) | Official Gradle userguide, dependency locking | Gradle 9.x current docs, 2026 | Primary source for every command, file shape, and lock-mode semantic in Finding 1 |
| [docs.gradle.org/current/userguide/dependency_verification.html](https://docs.gradle.org/current/userguide/dependency_verification.html) | Official Gradle userguide, dependency verification | Gradle 9.x current docs, 2026 | Primary source for bootstrap command, exact failure text, hash/signature guarantees in Finding 2 |
| [docs.gradle.org/current/userguide/filtering_repository_content.html](https://docs.gradle.org/current/userguide/filtering_repository_content.html) | Official Gradle userguide, repository content filtering | Gradle 9.x current docs, 2026 | Primary source for `exclusiveContent`/`includeGroup` syntax in Finding 3 |
| [github.com/gradle/actions/blob/main/wrapper-validation/README.md](https://github.com/gradle/actions/blob/main/wrapper-validation/README.md) | Current successor action's own README | 2026 (v3+ superseding `wrapper-validation-action`) | Confirms current action name/version and its auto-run status under `setup-gradle@v4` |
| [github.com/gradle/wrapper-validation-action](https://github.com/gradle/wrapper-validation-action) (README) | Legacy action, now a delegating shim | Deprecated as of v3, still functional | Confirms the migration path an agent must recognize when it finds the old action name in an existing workflow |
| [central.sonatype.org/faq/verify-ownership/](https://central.sonatype.org/faq/verify-ownership/) | Official Central Portal FAQ | 2026, post-OSSRH-sunset Central Portal era | Primary source for what namespace verification proves and does not prove (Finding 5) |
| [aikido.dev/blog/maven-central-jackson-typosquatting-malware](https://www.aikido.dev/blog/maven-central-jackson-typosquatting-malware) | Security vendor incident writeup, primary disclosure | Late 2025/2026 | The concrete, dated exploit that makes content filtering non-hypothetical (Finding 6) |
| [sonatype.com/resources/research/making-ai-work-safely](https://www.sonatype.com/resources/research/making-ai-work-safely) | Sonatype's own research report landing page | 2026 | Primary source for the ~37,000-pair, per-model hallucination-rate figures behind the "28%" claim (Finding 7) |
| [sonatype.com/press-releases/sonatype-research-on-ai-coding-safety](https://www.sonatype.com/press-releases/sonatype-research-on-ai-coding-safety) | Sonatype press release accompanying the report | 2026-03 | Corroborates the grounded-vs-ungrounded improvement numbers and the "one in sixteen" best-case figure |
| [sonatype.com/press-releases/sonatype-research-reveals-open-malware-grows-75-percent](https://www.sonatype.com/press-releases/sonatype-research-reveals-open-malware-grows-75-percent) | Sonatype 2026 State of the Software Supply Chain, malware census press release | 2026-01 | Ecosystem-wide malware-package-count context for Finding 7 |
| [slsa.dev/spec/v1.1/levels](https://slsa.dev/spec/v1.1/levels) | SLSA specification, official levels page | v1.1, current spec | Primary normative source for Build L1/L2/L3 definitions in Finding 8 |
| [github.com/ossf/scorecard/blob/main/docs/checks.md](https://github.com/ossf/scorecard/blob/main/docs/checks.md) | OSSF Scorecard's own check-definitions doc | Current `main`, 2026 | Primary source naming the automated checks (`Pinned-Dependencies`, `Signed-Releases`, `SBOM`, `Dependency-Update-Tool`) referenced in Finding 8 |
| [.agents/research/jvm-audit/exemplar-build-shape.md](../jvm-audit/exemplar-build-shape.md) | This program's own exemplar-corpus measurement | 2026-09-05 (SHAs recorded per repo) | The 0/32 locking, 1/32 verification, 4/25 content-filtering counts this file cites throughout |
| [.agents/research/jvm-audit/exemplar-publishing-ci-bazel.md](../jvm-audit/exemplar-publishing-ci-bazel.md) | This program's own exemplar-corpus measurement, publishing/CI axis | 2026-09-05 (SHAs recorded per repo) | Confirms the single `gradle.lockfile` hit is a documentation snippet, with exact repo@sha:path |
