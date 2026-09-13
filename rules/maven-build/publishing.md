---
title: Publishing a Maven Build to Central
summary: The MVN-PUB family, covering the Central Portal plugin and its floor, the namespace and tag preconditions, credentials, the per-file bundle Central validates at upload, and what a green release job is allowed to mean
---

# Publishing a Maven Build to Central

Owns getting a Maven build's artifacts onto Maven Central through the Central
Portal: the publishing plugin and its version floor, the preconditions that must
hold before anything is built, the credentials, the per-file bundle Central
validates at upload, and the deployment's exit semantics. It does not own the
lifecycle phase a release binds to, the compiler or Surefire configuration, the
Maven wrapper checksums, or `project.build.outputTimestamp` reproducibility,
which are the MVN-BUILD family and live in this rule's lifecycle-and-plugins
file. Resolution, mediation and Enforcer are MVN-DEP, in the dependencies file.
An Ant `build.xml` is MVN-ANT. The Gradle statement of these same Portal gates
is the GRADLE-PUB family in the separate `gradle-build` rule, which a `pom.xml`
edit never loads, so every row here is complete on its own.

Contents: [Before the Build Runs](#before-the-build-runs) ·
[One Read of pom.xml](#one-read-of-pomxml) ·
[The Bundle Central Validates at Upload](#the-bundle-central-validates-at-upload) ·
[What a Green Release Job Means](#what-a-green-release-job-means) ·
[Maven 4 Is Not Shipping Mechanism](#maven-4-is-not-shipping-mechanism) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Before the Build Runs

**Central is immutable.** Sonatype's own wording is that once published you
cannot remove, update or modify a component. There is no re-sign, no patch and
no re-upload of a version number that has been consumed. The only recovery is a
new version. Every row in this file exists to stop a build from reaching
`PUBLISHED` wrong, which is why the two rows below run *before* anything is
compiled rather than after the artifacts exist.

Gate: read the release workflow top to bottom before reading `pom.xml`, and
check that both preconditions are steps in it rather than assumptions.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-04 | Treat Central namespace verification as a checked precondition of the release job, not a failure to retry. Prove a reverse-domain namespace with a DNS TXT record, or an `io.github.<user>` namespace with GitHub repository ownership. | There is no third path and no way to upload before verification completes. Discovering it at upload wastes the whole build, sign and checksum pass, and on an immutable registry the wasted pass is the cheap half. | Reading check, no command. The runbook names which of the two methods was used and where the Portal token lives. A first upload returning `401` or `403` referencing namespace ownership is this rule violated, not a transient error to retry. | MUST |
| MVN-PUB-05 | Fail the release job when the git tag and the POM's `<version>` disagree, in a step that runs before any build, sign or deploy step. | 0 of the 32 JVM repositories measured for this ruleset derive their version from a tag-driven plugin, so nothing else enforces the match. A tag-versus-POM mismatch discovered after upload burns the version number permanently. | The workflow compares `${GITHUB_REF_NAME#v}` against `mvn -q help:evaluate -Dexpression=project.version -DforceStdout` and exits non-zero on mismatch. No such step in the workflow is the finding. | MUST |

## One Read of pom.xml

For Maven the published POM *is* `pom.xml`, modulo a `flatten-maven-plugin`
rewrite. There is no generated-POM step to inspect, so one read of the file
clears four rows.

Gate, three commands over the module's `pom.xml`:

- `grep -n -A2 'central-publishing-maven-plugin' pom.xml`
- `grep -rn --include='pom.xml' -e 'nexus-staging' -e 'oss.sonatype.org' .`
- `grep -rnE --include='pom.xml' -e '</?(username|password)>' .`

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-03 | Replace any `nexus-staging-maven-plugin` and any `<distributionManagement>` pointing at `oss.sonatype.org` or `s01.oss.sonatype.org` with `central-publishing-maven-plugin`. **Pinned default**: `central-publishing-maven-plugin` is the Maven-native Portal path this ruleset commits to, and an adopter overrides it once, in one place, if they standardise on something else. | OSSRH reached end of life 2025-06-30 and the OSSRH Staging API is a translation shim, never a target. `nexus-staging-maven-plugin` is used by 0 of 32 measured repositories and `central-publishing-maven-plugin` by 3 (assertj, error-prone, guava), yet the dead names dominate pre-2025 training data. | `grep -rn --include='pom.xml' -e 'nexus-staging' -e 'oss.sonatype.org' .` must print nothing. Empty output is the pass, not a skipped check. Any hit outside a migration-history comment is stale. | MUST |
| MVN-PUB-01 | Pin `central-publishing-maven-plugin` to at least **0.7.0** before relying on a SNAPSHOT channel. | SNAPSHOT publishing through the Portal landed *in* 0.7.0. Below that version the capability does not exist at all, so a lower pin is not a degraded mode, it is a missing feature that fails at deploy. Current line 0.9.x, verified 2026-09-12. | `grep -n -A2 'central-publishing-maven-plugin' pom.xml`, then compare the `<version>` with a real version comparator rather than a string compare, because `0.10.0` sorts below `0.7.0` lexically. No `<version>` element at all is the finding. | MUST |
| MVN-PUB-06 | Never write a literal `<username>` or `<password>` into `pom.xml`. Put the Portal token in a `<server>` entry in `settings.xml` and name it from the plugin's `<publishingServerId>`, with CI writing that file from its own secret store. | A credential in a committed POM is a secret in version control, and unlike a build-tool cache defect it has no benign failure mode. Maven's `<server>` indirection is the mechanism the plugin already expects, so the compliant form is not extra machinery. | `grep -rnE --include='pom.xml' -e '</?username>' -e '</?password>' .` must print nothing. Empty output is the pass. A hit inside a `<server>` block in a committed `settings.xml` is the same finding. | MUST |
| MVN-PUB-07 | Write `name`, `description`, `url`, at least one `licenses` entry, at least one `developers` entry and a full `scm` block (`connection`, `developerConnection`, `url`) explicitly into every published `pom.xml`, including a parent or BOM POM. | Central rejects the deployment **wholesale** on any single missing element, and it does so at upload, after signing. `url` is the element that goes missing: it is present in 8 of 32 measured repositories against 15 to 17 for licenses, developers and scm, so a check that covers the familiar three still passes a POM Central will reject. | `python3 -c "import xml.etree.ElementTree as E;r=E.parse('pom.xml').getroot();ns=r.tag[:r.tag.find('}')+1] if '}' in r.tag else '';[print('MISSING '+e) for e in ('name','description','url','licenses','developers','scm') if r.find(ns+e) is None]"`. Any output is the finding, empty output is the pass. Run it against every module that is deployed, not only the aggregator. A `grep -q` over the file text passes on a POM whose only `<url>` sits inside `<scm>`, which is exactly the shape Central rejects, so the check must read the element's parent. | MUST |

```xml
<!-- wrong: OSSRH shut down 2025-06-30, so this deploy target does not exist -->
<distributionManagement>
  <repository>
    <id>ossrh</id>
    <url>https://s01.oss.sonatype.org/service/local/staging/deploy/maven2/</url>
  </repository>
</distributionManagement>
```

```xml
<!-- right: the Portal plugin owns the deploy target, so there is no distributionManagement at all -->
<plugin>
  <groupId>org.sonatype.central</groupId>
  <artifactId>central-publishing-maven-plugin</artifactId>
  <version>0.9.0</version>
  <extensions>true</extensions>
  <configuration>
    <publishingServerId>central</publishingServerId>
    <autoPublish>true</autoPublish>
    <waitUntil>published</waitUntil>
  </configuration>
</plugin>
```

## The Bundle Central Validates at Upload

Both rows are checked against the assembled bundle, never against `pom.xml`. A
plugin declaration proves a goal is configured, not that it ran for every
module.

Gate: `mvn -DskipTests deploy`, then
`unzip -l target/central-publishing/central-bundle.zip` and count what is
actually in it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-08 | Bind `maven-source-plugin:jar-no-fork` and `maven-javadoc-plugin:jar` to an `<execution>` in the release profile so that **every** deployed artifact gets a matching `-sources.jar` and `-javadoc.jar`, not just the primary module. A placeholder jar containing a README is Central's own documented fallback where real sources or docs cannot be produced. | Central checks per artifact and version at upload, which is late, after signing, and rejects the whole deployment. Agents treat the placeholder as forbidden and then skip the requirement entirely for BOM and parent modules rather than shipping the sanctioned stub. | From the bundle listing, every base jar has a `-sources.jar` and a `-javadoc.jar` sibling, one to one. A base jar with no sibling pair is the finding, and a clean one-to-one listing is the pass. Running the goals from the command line instead of an `<execution>` binding passes locally and fails in CI. | MUST |
| MVN-PUB-09 | Sign every deployed file with `maven-gpg-plugin`, supplying the key to CI through an environment variable with `--batch --pinentry-mode loopback` rather than an interactive agent, and confirm `.asc`, `.md5` and `.sha1` exist for each file. | `.asc`, `.md5` and `.sha1` are hard per-file Central requirements, while `.sha256` and `.sha512` are accepted but not required. A `gpg` invocation that expects a configured keyring and agent on the runner is the usual cause of a release that signs on a laptop and not in CI. | From the bundle listing, the count of `.asc` files equals the count of deployable files, and the same for `.md5` and `.sha1`. Any shortfall is the finding. Also confirm the `gpg` arguments contain no interactive prompt path, since an agent-backed signature cannot be reproduced by the release job. | MUST |

## What a Green Release Job Means

Gate: `grep -nE '</?(autoPublish|waitUntil)>' pom.xml`, then read the release
job's final step and ask which state it exits at.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-10 | Set `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>` in any release job whose exit code is meant to mean "live on Central". | The documented deployment state machine is `PENDING`, `VALIDATING`, `VALIDATED`, `PUBLISHING`, then `PUBLISHED` or `FAILED`. The default exits at `VALIDATED`, which reports success at a state that still needs a human click and can still fail asynchronously with no CI signal at all. | `grep -nE -e '</?autoPublish>' -e '</?waitUntil>' pom.xml`. Empty output means the job sits at the weakest state, which is the finding unless the job summary says in words "validated, not published". Both elements present with those two values is the pass. | MUST |

## Maven 4 Is Not Shipping Mechanism

Gate: query the registry for what Central actually serves, never the Maven
site's own version banner, which runs ahead of it.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-PUB-02 | Do not propose `maven.consumer.pom.flatten=true` or `<packaging>bom</packaging>` as shipping mechanism. Publish a BOM as the classic `pom` packaging with import scope. | Both are Maven 4 only and opt-in. Central's index gives `maven-core` 3.9.16 as the stable line and `4.0.0-rc-6` as the top of the 4.0 line as of 2026-09-12, so no plain `4.0.0` exists. Corpus usage is 0 of 32. A release-candidate feature in a runbook breaks when the candidate changes shape. | `curl -s "https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json"`. A version matching `4.0.0` with no suffix is the only signal that retires this rule. No such version, which is today's state, means the rule stands. | MUST |

Ten rows, all MUST. That is unusual density and it is correct here: every one of
them is a state Central rejects at upload or a state that makes a bad release
unrecoverable.

## What Agents Get Wrong Here

1. **Writing a release against `oss.sonatype.org` or `s01.oss.sonatype.org`, or
   reaching for `nexus-staging-maven-plugin`.** The highest-frequency failure by
   a wide margin. OSSRH dominated training data through 2024 and the 2025-06-30
   sunset postdates most pretraining, so the dead path is the fluent one
   (MVN-PUB-03).
2. **Assuming Central supports OIDC trusted publishing because PyPI does, and
   writing a tokenless release job.** Nothing in the Portal guide, the
   requirements page, the Publisher API or the registration pages described an
   OIDC path when they were read on 2026-09-12. Do not write one without a
   primary source. A Portal token in CI secrets is the only path any primary
   source describes.
3. **Calling `<autoPublish>true</autoPublish>` alone a fully automated release.**
   The option name reads as sufficient and the `VALIDATED` to `PUBLISHED` gap is
   invisible from it (MVN-PUB-10).
4. **Putting the Portal credentials straight into `pom.xml`** because that is
   where the plugin configuration already is, and the `<server>` indirection
   needs a second file (MVN-PUB-06).
5. **Presenting Maven 4's consumer-POM flattening or `bom` packaging as
   available today.** Maven 4 has been discussed as imminent since 2023 and a
   model rounds it up to shipped (MVN-PUB-02).
6. **Configuring sources and javadoc jars on the primary module only**, then
   discovering at upload that the parent and BOM POMs are rejected too. The
   reflex fix is then to run the goals by hand from the release script, which
   passes once and never again (MVN-PUB-08).
7. **Writing every POM element except `url`.** Licenses, developers and scm
   travel together in an agent's output because they travel together in the
   examples it learned from. `url` is the one Central rejects on (MVN-PUB-07).
8. **Seeing `build.gradle.kts` and `pom.xml` in one repository and wiring up a
   second, parallel Maven release pipeline.** In the measured corpus every such
   `pom.xml` is a consumability probe living under a `test`, `example` or
   tooling-support path, not a second build system. Check the path before
   assuming a dual release.
9. **Treating a `401` or `403` on first upload as a flaky registry and adding a
   retry.** It is the namespace precondition, and no number of retries verifies
   a namespace (MVN-PUB-04).
10. **Signing with an interactive `gpg` invocation that works on a developer
    machine.** The runner has no keyring and no agent, so the release signs
    locally and fails in CI, usually after the bundle has already been assembled
    (MVN-PUB-09).
