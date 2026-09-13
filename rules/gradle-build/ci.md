---
title: Gradle in CI
summary: The GRADLE-CI family, which owns the pipeline around a Gradle invocation, the setup and wrapper-validation step, who owns the cache switches, build-scan publishing, the JDK matrix, action pinning and workflow permissions, and dependency-update automation
---

# Gradle in CI

Owns what a pipeline does around `./gradlew`: which action sets Gradle up,
where the cache switches live, how a build scan reaches a server without
leaking the run, what the JDK matrix looks like, what a workflow may do with
its token, and which bot opens version bumps. It does not own the
configuration cache's own contract, which is `GRADLE-CACHE`, nor anything
inside a settings file, which is `GRADLE-STRUCT`. Remote build-cache **push**
gating is `GRADLE-STRUCT-12` and is stated there, not here, because the
predicate lives in the settings file rather than in the workflow. The
plugin's TestKit cross-version matrix is `GRADLE-PLUG`, and the release job's
interaction with Central is `GRADLE-PUB`.

Most rows below govern files under `.github/workflows/`, a path no glob in
this rule set matches. The index routes here by task, so read this file
whenever you write or edit a workflow that runs Gradle, and land the workflow
edit in the same change as the build-file edit it depends on. The two
build-scan rows are the exception: they govern the settings file, which this
rule set does glob, because that is where the scan is configured.

Contents: [What Was Measured](#what-was-measured) ·
[The Workflow's Gradle Steps](#the-workflows-gradle-steps) ·
[Build Scans](#build-scans) · [The JDK Matrix](#the-jdk-matrix) ·
[The Workflow's Own Privileges](#the-workflows-own-privileges) ·
[Dependency-Update Automation](#dependency-update-automation) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## What Was Measured

A static census of 32 flagship JVM repositories, read **2026-09-05** and
carried into this file **2026-09-12**. No build was run, so every count is
"at least one signal of", never "configured correctly". 30 of the 32 ship at
least one GitHub Actions workflow. Two run their CI off-repo and are invisible
to every number below.

| Signal | Corpus | What it licenses |
|---|---|---|
| `gradle/actions/setup-gradle` | 15/32 | The majority route, and the only one that validates the wrapper without a second step |
| Standalone wrapper validation | 1/32 | The other 16 repos validate through the setup action or not at all |
| `--configuration-cache` in a workflow | 3/32 against the property in 10/32 | CI inherits the switch, it does not assert it |
| `--build-cache` in a workflow | 7/32 against the property in 17/32 | Same split, same reading order |
| SHA-pinned `uses:` | 523 references in 19/32, against 235 tag-pinned in 14/32 | Repos mix both styles inside one workflow set, so pinning is a per-line property |
| A `permissions:` block anywhere | 30/32 | Presence of any key on any job. Not evidence of least privilege at the workflow root |
| JDK distributions | temurin 13/32, zulu 10/32, graalvm 4/32, oracle **0/32** | Naming a distribution is universal, and nobody names `oracle` |
| Develocity or build-scan plugin | 12/32, with `--scan` in a workflow 8/32 | One corpus repo carries an exemplar-grade gating template |
| `gradle/actions/dependency-submission` | 2/32 | The graph GitHub's Gradle alerts are computed from |
| Dependabot 13/32, Renovate 13/32 | Both: **0/32**. Neither: 6/32 | A clean either-or, so detect before you configure |
| OWASP dependency-check or Snyk | **0/32**, CycloneDX SBOM 2/32 | Gradle has no built-in answer ([#8400](https://github.com/gradle/gradle/issues/8400), open) |

## The Workflow's Gradle Steps

List the workflows in scope first:
`grep -rln --include='*.yml' --include='*.yaml' -e 'gradlew' .github/workflows/`
Empty output means no workflow runs Gradle and this section does not apply.
Read every file it prints against the four rows below.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CI-01 | Every job that runs Gradle sets it up with `gradle/actions/setup-gradle` before the first invocation, and invokes `./gradlew`, never a `gradle` from `PATH`. A job that runs the wrapper without that action adds `gradle/actions/wrapper-validation` instead. Never both, and never neither. | `gradle-wrapper.jar` is an executable binary committed to the repository, so a substituted jar runs attacker code on a runner that holds the job's token. The setup action validates the wrapper's checksum by default, which is why standalone validation is 1/32 rather than 16/32: the repos without either are not validating at all. A `gradle` on `PATH` is whatever version the runner image ships, not the version the wrapper pins, so it answers a different build than the one developers run. | `grep -rn --include='*.yml' --include='*.yaml' -e 'gradle/actions/setup-gradle' -e 'gradle/actions/wrapper-validation' .github/workflows/`. A workflow the gate command listed and this one does not print is the finding, so **empty output here is the finding, not the pass**. Then `grep -rn --include='*.yml' --include='*.yaml' -e 'run: gradle ' -e '- gradle ' .github/workflows/`. Any hit invokes a `gradle` from `PATH` instead of the wrapper and is the finding, and empty output there is the pass. | MUST |
| GRADLE-CI-02 | Never hand-roll Gradle caching with `actions/cache` over `~/.gradle`. Let the setup action own the Gradle user home. | The blog-era block keys on `hashFiles('**/*.gradle*')`, which sees neither the version catalog nor `gradle-wrapper.properties`, so the entry survives a dependency bump and a Gradle upgrade. Its `path` also sweeps in the lock and journal files under `~/.gradle/caches`, which makes the entry grow every run until it is evicted. The setup action keys on the wrapper, the catalog and the build files together and prunes what it stores. | `grep -rn --include='*.yml' --include='*.yaml' -e 'actions/cache' .github/workflows/`. Any hit whose `path:` names `.gradle` is the finding. Empty output is the pass. | SHOULD |
| GRADLE-CI-03 | Leave the setup action's cache write behaviour at its default, and never set `cache-read-only: false` in a job triggered by `pull_request`. | The action writes the Gradle user home cache only from the default branch. Overriding that makes every pull-request branch write a several-hundred-megabyte entry into one repository-wide quota and evict the default branch's entry, which is the entry every job actually restores from. Not measured here: the census counted adoption of the action (15/32), never its inputs, so re-read the action's caching document before changing a default. | `grep -rn --include='*.yml' --include='*.yaml' -e 'cache-read-only' .github/workflows/`. A hit set to `false` in a workflow whose `on:` includes `pull_request` is the finding. Empty output is the pass. | SHOULD |
| GRADLE-CI-04 | Turn the configuration cache and the build cache on with `org.gradle.configuration-cache` and `org.gradle.caching` in the **root** `gradle.properties`, never with a CI-only `--configuration-cache` or `--build-cache` flag. A flag in a workflow is an override of the property for one job and carries a comment naming what it overrides and why. | The flag and the property are two switches for one feature, and the corpus puts the switch in the property (10/32 and 17/32) rather than the workflow (3/32 and 7/32). Splitting it means a developer's local build and CI disagree about what was cached, and nothing reports the disagreement. `GRADLE-CACHE-06` owns the property's own contract, including why the problems mode stays at `fail`. | `grep -rn --include='*.yml' --include='*.yaml' -e '--configuration-cache' -e '--build-cache' .github/workflows/`, then `grep -n -e 'org.gradle.configuration-cache' -e 'org.gradle.caching' gradle.properties`. A flag hit with the matching property absent from the root file is the finding. A flag hit that reverses a property set the other way is correct only with an adjacent comment. Empty flag output with the properties present is the pass, and empty output from both commands is the finding for a build that claims either cache. | MUST |

```yaml
# wrong: the 2019 shape. Unvalidated wrapper, a key blind to the catalog and the wrapper pin
- uses: actions/cache@v4
  with: { path: ~/.gradle/caches, key: gradle-${{ hashFiles('**/*.gradle*') }} }
- run: gradle build --build-cache
```

```yaml
# right: one action owns setup, wrapper validation and the cache; the switch lives in gradle.properties
- uses: gradle/actions/setup-gradle@COMMIT_SHA   # the 40-hex SHA of the release, tag in the comment
- run: ./gradlew build
```

## Build Scans

One read of every settings file, because the scan configuration lives there
and not in the workflow:
`grep -rn --include='settings.gradle' --include='settings.gradle.kts' --include='*.settings.gradle.kts' -e 'develocity' -e 'buildScan' .`
Empty output means no scan plugin is applied and neither row below applies.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CI-05 | Gate scan publishing on authentication, with `publishing.onlyIf { it.authenticated }`, and obfuscate the identifying fields the scan collects. Never publish a scan from a workflow triggered by `pull_request` on a public repository without that predicate. | An unauthenticated scan publishes to a public, world-readable URL carrying the run's environment: hostnames, usernames, absolute paths, every task input path and the full environment of a fork's run. The credential the platform withholds from an untrusted run is the only predicate that separates our CI from anyone's pull request, which is the same reasoning `GRADLE-STRUCT-12` applies to build-cache push. The corpus's one exemplar-grade template is kafka's settings file, which pairs the authenticated gate with IP obfuscation. | Where the gate command printed a scan plugin, `grep -rn --include='settings.gradle' --include='settings.gradle.kts' --include='*.settings.gradle.kts' -e 'onlyIf' -e 'obfuscation' .` must print a predicate naming `authenticated` in the same block. **Empty output beside an applied scan plugin is the finding, not the pass.** | MUST |
| GRADLE-CI-06 | Set `uploadInBackground = false` whenever the build runs in CI. | A background upload races the runner's teardown, so the scan for the run that failed is the one most likely never to arrive, and the link in the log points at nothing. Kafka's settings file writes the condition directly, keeping the background upload for developers and disabling it on the CI runner. | `grep -rn --include='settings.gradle' --include='settings.gradle.kts' --include='*.settings.gradle.kts' -e 'uploadInBackground' .`. Absent beside an applied scan plugin is the finding. A hit that resolves to `false` under the CI condition is the pass. | SHOULD |

```kotlin
// wrong: the pre-Develocity spelling, and every fork PR's environment goes to a public URL
buildScan { termsOfUseAgree = "yes"; publishAlways() }
```

```kotlin
// right: publication follows the credential, and the identifying fields are obfuscated
develocity {
    buildScan {
        publishing.onlyIf { it.authenticated }
        uploadInBackground = !providers.environmentVariable("CI").isPresent
        obfuscation { ipAddresses { addresses -> addresses.map { "0.0.0.0" } } }
    }
}
```

## The JDK Matrix

`grep -rn --include='*.yml' --include='*.yaml' -e 'setup-java' -e 'java-version' .github/workflows/`
Empty output in a repository whose workflows run Gradle is the finding: the
setup action provisions Gradle, never a JDK.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CI-07 | **Pinned default**, override it once in your own workflow and record why: run three legs, the floor, one intermediate release and the current LTS, each naming its `distribution:` explicitly, with `temurin` as the default distribution. `JAVA-PLAT-02` in the `java-quality` set owns the version numbers this inherits, so change them there and not here. | A single-leg build proves the code compiles on one JDK and claims support for a range. The leg list is a decision, not a derivation, which is why it is pinned in one place and cited everywhere else. On the distribution the corpus is unanimous in one direction only: `oracle` is 0/32, so a workflow that names it has picked a license-gated runtime nobody in the corpus depends on. | Every `setup-java` step the gate command printed carries an explicit `distribution:`, and `java-version` is fed from a matrix axis with more than one value. A `java-version` literal, or a matrix axis of length one, is the finding. Empty output is covered by the gate command above. | SHOULD |
| GRADLE-CI-08 | Run the coverage report, the coverage floor and the formatting or lint gate on exactly one named matrix leg. Every other leg compiles and tests only. | Coverage artifacts from parallel legs overwrite each other at the upload step, so the number the gate reads is whichever leg finished last. A lint gate on every leg multiplies one finding by the leg count, and `javac` warnings differ per JDK, so a `-Werror` build fails on the newest leg for a deprecation the floor leg cannot see. | `grep -rn --include='*.yml' --include='*.yaml' -e 'jacocoTestReport' -e 'koverXmlReport' -e 'spotlessCheck' -e 'codecov' .github/workflows/`. Every hit must sit in a step guarded by a single matrix value, or in a job outside the matrix. An unguarded hit inside a matrix job is the finding. Empty output is the pass. | SHOULD |

## The Workflow's Own Privileges

Two file-level reads, and both are inverted: the absence is the finding.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CI-09 | Pin every `uses:` to a full 40-character commit SHA with the human-readable version in a trailing comment, including first-party `actions/*` and `gradle/actions/*` steps. A `./`-prefixed local action is the one exemption. | A tag is mutable and the setup steps run before the build with the job's token and any release secret already in scope, so a moved tag is a silent code substitution at the most privileged point in the pipeline. Pinning is a per-line property, never a repository-level one: one corpus repo carries 9 SHA-pinned references beside 49 tag-pinned ones in the same workflow set, so a spot check of one file proves nothing. | `grep -rn --include='*.yml' --include='*.yaml' -e 'uses:' .github/workflows/ \| grep -vE -e '@[0-9a-f]{40}' -e 'uses:[[:space:]]*\./'`. Every line printed is the finding, and empty output is the pass. | MUST |
| GRADLE-CI-10 | Declare `permissions:` at the **workflow root** of every workflow, starting from `contents: read`, and raise it per job where a job genuinely needs more. | Without a root block the workflow inherits the repository or organisation default, which on an older repository is read-write across every scope, and nothing in the file says so. The corpus's 30/32 counts any `permissions:` key on any job, so it measures awareness rather than least privilege, and a workflow can hold one scoped job beside three that inherit everything. | `grep -rL --include='*.yml' --include='*.yaml' -e '^permissions:' .github/workflows/`. The `-L` flag prints the files **without** a root-level block, so every file printed is the finding and empty output is the pass. | MUST |

## Dependency-Update Automation

`ls -1 .github/dependabot.yml .github/renovate.json .github/renovate.json5 renovate.json 2>/dev/null`
tells you which bot the repository already runs before you configure one.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| GRADLE-CI-11 | A repository that relies on GitHub's vulnerability alerts for its Gradle dependencies runs `gradle/actions/dependency-submission` in its own job on the default branch, not on `pull_request`. | Alerts are computed from the submitted dependency graph, and a `dependabot.yml` produces version-bump pull requests, which is a different mechanism. Having the second says nothing about the first, so a build whose transitive graph is resolved by Gradle (platforms, catalogs, constraints) is invisible to alerts until something submits it. Submission needs write access to the graph, which a fork's pull request never has. | `grep -rln --include='*.yml' --include='*.yaml' -e 'dependency-submission' .github/workflows/`. Empty output beside a `.github/dependabot.yml` that names the `gradle` ecosystem is the finding. Confirm the companion with `grep -n -e 'gradle' .github/dependabot.yml`. | SHOULD |
| GRADLE-CI-12 | Detect which update bot the repository already runs and extend that one. Never add the second. | Both bots open a pull request for the same coordinate, and the two then revert each other's edits to the catalog or the lockfile on every cycle. Across the corpus the split is exactly 13/32 and 13/32 with **zero** repositories running both, so "add Dependabot" to a Renovate repository is a change no measured project has chosen to make. | The `ls` command above: two or more paths printed is the finding. Exactly one, or none, is the pass. | SHOULD |

## What Agents Get Wrong Here

1. **Writing `actions/setup-java` plus a hand-rolled `actions/cache` block and
   calling it a Gradle pipeline.** The 2019 shape saturates training data. It
   leaves the wrapper unvalidated, keys the cache on a glob that misses the
   version catalog and the wrapper pin, and ships an entry that grows every run.
2. **Appending `--build-cache --configuration-cache` to the CI command to make
   CI faster**, rather than setting the property. Measured 3/32 and 7/32 in
   workflows against 10/32 and 17/32 in `gradle.properties`.
3. **Reading the CI command line to decide whether a cache is on.** The flag's
   absence proves nothing, and its presence proves nothing about local builds.
   Read the root `gradle.properties` first, every time.
4. **Turning on build scans with `publishAlways()` and a terms-of-use
   agreement**, which publishes every fork pull request's environment to a
   public URL. The predicate that matters is authentication, not agreement.
5. **Tag-pinning `uses:` because the action's README shows a tag**, and then
   concluding from one clean file that the repository pins by SHA. One corpus
   repo mixes 9 pinned against 49 unpinned in a single workflow set.
6. **Treating any `permissions:` key anywhere in a workflow as least
   privilege.** 30/32 have one somewhere, and the block that decides the
   default is the one at the workflow root.
7. **Adding a standalone wrapper-validation step beside `setup-gradle`** as
   belt and braces, or dropping both when the setup action goes in. The action
   already validates, so the first is a duplicate step and the second is the
   real gap.
8. **Running the coverage upload and the format check on all three matrix
   legs**, then debugging why the coverage number changes between reruns.
9. **Adding `.github/dependabot.yml` to a repository already running
   Renovate.** The config is the thing an agent can see and edit, so it gets
   added without looking for the other one.
10. **Volunteering an OWASP dependency-check or Snyk gate as standard
    practice.** 0/32 run one and Gradle ships no built-in answer, so this is a
    deliberate new commitment with an owner and a budget, never a default.
11. **Assuming `dependabot.yml` gives Gradle vulnerability alerts.** The alert
    graph comes from `dependency-submission`, which 2/32 run.
12. **Adding `--no-daemon` from a Gradle 4-era CI guide.** 5/32 carry it. The
    setup action stops the daemon when the job ends so it can save the cache,
    and the flag costs the in-process warmth the rest of the job would reuse.
