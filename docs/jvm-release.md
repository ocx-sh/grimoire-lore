# jvm-release

An ordered runbook for putting a Java or Kotlin artifact on Maven Central
through the Central Portal, covering Gradle and Maven side by side. It is a
list of gates rather than a list of steps, for one reason.

```sh
grim add ghcr.io/ocx-sh/lore/jvm-release
```

Run it when you are cutting a release, writing or reviewing a release workflow,
or deciding whether a green release job means the artifact is live. It stops
when the deployment reports `PUBLISHED`, or has failed when it reports
`FAILED`. Nothing else is a terminal state.

## Central is immutable, and that is the whole design

Once a deployment reaches `PUBLISHED`, the component cannot be removed,
updated, modified, re-uploaded under the same coordinates, or re-signed. The
only remedy is a new version number.

Two consequences shape every step. There is no fix-the-release path, so the
skill does not let one be designed: an agent that meets the constraint only
after the ordered steps invents a rollback, a re-publish or a delete-and-retry
that cannot exist. And every gate runs before the artifact leaves the machine,
because a defect found after upload costs a version number while a defect found
before upload costs a commit.

## The order is the product

Eight steps. The first three exist purely to fail before anything is signed or
uploaded: prove the namespace is verified, compare the git tag against the
version the build file declares, and run the binary-compatibility gate against
the last coordinate actually published.

Then the parts that Central rejects on: assemble the required per-file set for
every published artifact rather than only the main one, sign every publication
rather than one named publication, make the release job's exit code mean live
rather than merely validated, and prove the artifact is consumable from outside
Gradle. The last step is reading the terminal state and stopping.

Signing sits after the file-set assembly deliberately. Central checks the set
at upload, which is after signing, and rejects the whole deployment on a single
missing element. The element that actually goes missing is the POM's `url`, so
a check covering licenses, developers and scm while skipping `url` passes
builds Central still refuses.

## Gradle and Maven differ only in the plugin

The Portal's requirements are identical for both: the same file set, the same
POM elements, the same deployment state machine. So each step states the
requirement once and then gives both spellings, and the skill closes with a
side-by-side table for the eight places the two builds diverge.

The POM is read from the generated file, never from the build script. Gradle
Module Metadata publishes alongside the POM and never instead of it, and Maven
tooling never fetches it, so deciding a POM is complete by reading the module
file is how a release ships without its dependencies.

## Pinned defaults

Four decisions here encode an agreement rather than a derivation, and each is a
default an adopter overrides once in their own build.

The Gradle publishing plugin is nmcp or the vanniktech plugin, which is
deliberately against the corpus majority that hand-rolls `maven-publish` plus a
polling step. The Maven plugin is `central-publishing-maven-plugin` at 0.7.0 or
above, which has no alternative that reaches the Portal natively. The Java
binary-compatibility gate is japicmp, bound upstream of every publish task. The
Kotlin ABI gate is exactly one gate, defaulting to the standalone validator.

## What it refuses to do

It will not write a release against `oss.sonatype.org`, reach for a
nexus-staging plugin, or treat the OSSRH staging shim as a target. Those are
named as dead paths with a check that greps for them, because they dominated
training data and the sunset postdates most of it.

It will not retry a 401 or 403 on a first upload, because that response is
namespace verification skipped and no number of retries completes a DNS record.
It will not add `mavenLocal()` to a committed repositories block to clear a
resolution failure. It will not write a tokenless release job, because nothing
in the Portal's own documentation describes an OIDC path. And it will not treat
Bazel as a publisher: Bazel hands off to Gradle or Maven, and a repository
carrying both names which build is canonical for the release, in writing.

Gradle Plugin Portal publishing is a different target with a different gate set
and is out of scope.

## Siblings

Sixteen merge-blocking rows from `gradle-build`, `maven-build`, `java-quality`
and `kotlin-quality` are restated here as findings with their IDs, so a review
that runs this procedure without the rule sets loaded still reports them
correctly. The rule text, rationale and full verification stay in the rule
sets, and a disputed row is settled there. `jvm-dependency-triage` is the other
half of the pair. Bundled as `jvm-essentials`.
