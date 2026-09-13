---
paths:
  - "**/pom.xml"
  - "**/.mvn/**"
  - "**/mvnw"
  - "**/mvnw.cmd"
  - "**/build.xml"
  - "**/ivy.xml"
  - "**/ivysettings.xml"
summary: "The Maven build index: the gate, the non-negotiables, and where the depth lives for POMs, the .mvn directory, the wrapper, and Ant"
keywords: maven,pom,mvn,mvnw,enforcer,surefire,jacoco,toolchains,annotation-processing,central,sonatype,portal,gpg,reproducible-builds,ant,ivy,maven4
license: Apache-2.0
repository: https://github.com/ocx-sh/grimoire-lore
---

# Maven Build

Traps, not maps. Everything here names a mistake a build makes without it, and
what any particular reactor is shaped like is discoverable by reading its POMs.

Contents: [The Gate](#the-gate) · [Non-Negotiables](#non-negotiables) ·
[Rules This File Owns](#rules-this-file-owns) ·
[Where the Depth Is](#where-the-depth-is) · [Severity](#severity) ·
[Siblings](#siblings)

**Before trusting any rule below, confirm two things fire at all.**
`maven-enforcer-plugin` ships 37 built-in rules and zero of them active, and a
`<rules>` block with no `<execution>` declaring the `enforce` goal enforces
nothing while reviewing clean (`MVN-DEP-03`). Likewise, a green `mvn verify`
distinguishes "annotation processors ran" from "processors were silently
skipped" nowhere in its exit code, console output or POM (`MVN-BUILD-16`). Both
failures look exactly like a pass. Most of this rule set is unenforced until the
enforcer is bound and the gate reaches `verify`.

## The Gate

Run it after every change, narrowest scope first. Each stage costs more than the
last, so the common case never reaches the slow ones. Maven 3.9.x, verified
2026-09-12.

```bash
./mvnw -q validate                  # enforcer executions bind here by default
./mvnw -q test-compile              # compile plus annotation processing
./mvnw verify                       # the gate of record: never install, test or package
./mvnw artifact:check-buildplan     # modules that publish
```

`./mvnw`, never a bare `mvn`. A `mvn` off `$PATH` is whatever the runner image
happens to ship, which is the most common way two people get different answers
from the same reactor, and the committed wrapper is only trustworthy once both
`wrapperSha256Sum` and `distributionSha256Sum` are set (`MVN-BUILD-14`).

Two things `verify` does not prove, so run them beside it in any module that has
a processor or a test:

```bash
find . -path '*/target/generated-sources/annotations/*' -name '*.java'  # MVN-BUILD-16
./mvnw -X test > mvn-x.log && grep -n 'Using configured provider' mvn-x.log  # MVN-BUILD-05
```

Empty output from either is the finding, not the pass: the first means the
declared processors produced nothing, and the second means no provider line was
printed and the Surefire test count is unproven.

Chain these into one named target (a `check` target in the repository's task
runner, or a single release profile) and have CI invoke that target, never a
hand-copied step list. `install` is permitted only as a deliberate
`-DskipTests` reactor bootstrap upstream of a `verify` gate (`MVN-BUILD-03`).

A task is done when a command, its exit code, and the tree it ran against are
all named. Narration is not evidence.

## Non-Negotiables

Every line below blocks a merge. IDs resolve to the depth files in
[Where the Depth Is](#where-the-depth-is), where each rule carries its rationale
and verification.

| # | Rule | ID |
|---|---|---|
| 1 | The bytecode and API floor is `maven.compiler.release`, set in exactly one place per module, never as `<source>` and `<target>`. Unset, both default to 8 regardless of the JDK running Maven. | MVN-BUILD-01 |
| 2 | Every processor is declared in `annotationProcessorPaths` with a version, `maven.compiler.proc` is `full` on maven-compiler-plugin 3.13.0+, and the proof is the generated-sources artifact. JDK **23** is the release that stopped implicit processing, never 21 and never "modern JDKs". | MVN-BUILD-02, MVN-BUILD-16, MVN-BUILD-17 |
| 3 | **pinned.** `verify` is the last Maven goal of every CI gate. Never `install`, `test`, `package` or a hyphenated intermediate phase. | MVN-BUILD-03 |
| 4 | **pinned.** `maven-enforcer-plugin` is bound by an `<execution>` declaring the `enforce` goal. A rules block, or a `pluginManagement` version pin, enforces nothing. | MVN-DEP-03 |
| 5 | No dynamic version enters and none leaves: `banDynamicVersions` bound, and every version in a POM you publish a concrete resolved string, checked against the POM the repository serves. | MVN-DEP-04, MVN-DEP-10 |
| 6 | Maven mediates by nearest definition by depth, never by highest version, and a matching `dependencyManagement` entry decides before mediation runs at all. Force a version with a direct declaration or `dependencyManagement`, never by editing a deeper transitive. | MVN-DEP-01, MVN-DEP-02 |
| 7 | In any module binding JaCoCo's `prepare-agent`, `argLine` composes additively as `@{argLine}` followed by your own flags. A bare flag list clobbers the agent and coverage stops being produced. | MVN-BUILD-04 |
| 8 | `maven-surefire-plugin` is pinned from a version queried out of Central's metadata, never off the plugin doc-site banner, and the configured provider is confirmed from the run. | MVN-BUILD-05 |
| 9 | Every committed `maven-wrapper.properties` sets both `wrapperSha256Sum` and `distributionSha256Sum`, and every `aether.` property in `.mvn/maven.config` is read against the Maven version that wrapper pins. Unrecognised resolver names are ignored, not rejected. | MVN-BUILD-14, MVN-BUILD-11 |
| 10 | Never describe Maven checksum configuration as a supply-chain or trust control. When the subject is trust, the mechanism is `maven-gpg-plugin`. | MVN-BUILD-12 |
| 11 | Maven 4 is release-candidate only (`4.0.0-rc-6` against `3.9.16` GA, 2026-09-12), so every Maven-4 row is migration readiness and every Maven mechanic written down says "(Maven 3)", "(Maven 4)" or "(both)". | MVN-BUILD-08, MVN-DEP-11, MVN-PUB-02 |
| 12 | `maven-toolchains-plugin` selects a JDK and never downloads one. Never claim it provisions a JDK, and never write `-Dtoolchain.skip` unless `org.mvnsearch:toolchains-maven-plugin` is actually bound. | MVN-BUILD-19 |
| 13 | **pinned.** Publishing goes through `central-publishing-maven-plugin`; pin 0.7.0 or later before relying on a SNAPSHOT channel. `oss.sonatype.org`, `s01.oss.sonatype.org` and `nexus-staging-maven-plugin` are dead paths: OSSRH ended 2025-06-30. | MVN-PUB-03, MVN-PUB-01 |
| 14 | No literal `<username>` or `<password>` in a POM. The Portal token lives in a `settings.xml` `<server>` entry named by `<publishingServerId>`. | MVN-PUB-06 |
| 15 | Every deployed module carries `name`, `description`, `url`, `licenses`, `developers` and a full `scm` block, a matching `-sources.jar` and `-javadoc.jar`, an `.asc`, `.md5` and `.sha1` per file, and an explicit `project.build.outputTimestamp`. Central rejects the whole deployment on one missing element, after signing. | MVN-PUB-07, MVN-PUB-08, MVN-PUB-09, MVN-BUILD-10 |
| 16 | Namespace verification and the tag-versus-`<version>` check are steps that run before any build. A release job whose exit code means "live on Central" sets `<autoPublish>true</autoPublish>` and `<waitUntil>published</waitUntil>`. | MVN-PUB-04, MVN-PUB-05, MVN-PUB-10 |
| 17 | Never introduce `ant.importBuild()`, which disables the whole Gradle build's configuration cache permanently, and never re-declare an Ant property to change it, because the second write is discarded in silence. | MVN-ANT-02, MVN-ANT-03 |
| 18 | Never reach green by weakening the check, and never ship a verification nobody has watched go red. | MVN-CORE-01, MVN-CORE-02 |

## Rules This File Owns

Three cross-cutting rules that belong to no single depth file. Everything else
is defined in a depth file and only cited here.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-CORE-01 | Never reach green by weakening the check: no new `-DskipTests`, `-Dmaven.test.skip`, `-Denforcer.skip` or `-Dgpg.skip` on a CI invocation, no new `<skip>true</skip>` or `<skipTests>` on a plugin, no widened enforcer exclusion or Surefire `<excludes>`, no lowered JaCoCo `violationRules` floor, no new `@SuppressWarnings`, and no edit to the parent POM's `pluginManagement` as part of a functional change. | The gate's whole value is that it can go red. A change that edits both the reactor and the configuration that judges it reports nothing and looks identical to a passing change. Maven makes this cheap: every gate in the build is one property away from being a no-op, and the property reads as a local convenience. | `git diff --stat -- pom.xml .mvn` in a change that is not itself a gate change: any hit is the violation. Then, for each POM and CI file the change touches, `grep -n -e 'skipTests' -e 'maven.test.skip' -e 'enforcer.skip' -e 'gpg.skip' -e 'jacoco.skip' -e 'surefire.skip' -e 'SuppressWarnings' pom.xml` and read which lines this change added. A line added by this change is the finding. Empty output is the pass. | MUST |
| MVN-CORE-02 | A verification enters a rule table, a CI job, or a review only after it has been watched go red against a deliberately planted violation. | A check that cannot fail launders an unchecked change as a checked one, and reads exactly like a passing one forever. Maven's failure modes here are specific and all silent: an enforcer `<rules>` block with no bound `<execution>`, an `annotationProcessorPaths` list on a JDK 23 runner with no `proc=full`, a coverage gate whose `jacoco.exec` was never written because `argLine` clobbered the agent, and an enforcer `requireFilesExist` pointed at a file that build never produces. | Copy the subject, break the thing the rule forbids, run the verification. A pass on the broken copy is the violation. Planting a violation is cheap in a POM: delete the `<execution>`, blank the `release` value, or drop the `@{argLine}` prefix. | MUST |
| MVN-CORE-03 | State whether empty output means a pass or means the finding, in every verification that is not self-evidently one or the other. | Most of the checks in this rule set are inverted. An absent `maven.compiler.release`, an absent `distributionSha256Sum`, an empty `target/generated-sources/annotations`, an absent `<url>` element, a CI job with no `verify` and an unannotated `combine.` merge are each *the finding*, not the pass. | Read each verification cell: one whose empty output is ambiguous is the violation. | SHOULD |

## Where the Depth Is

Read the file for the work you are about to do, not for the topic it is filed
under. One level deep. These files do not point at each other.

| Doing… | Read |
|---|---|
| Declaring a dependency or a BOM import, changing a scope, diagnosing why Maven resolved the version it did, or adding an enforcer rule | [maven-build/dependencies.md](maven-build/dependencies.md) |
| Setting the compiler release or an annotation processor, binding a plugin to a phase, pinning Surefire or a toolchain, editing `.mvn` or the wrapper, or preparing a reactor for Maven 4 | [maven-build/lifecycle-and-plugins.md](maven-build/lifecycle-and-plugins.md) |
| Publishing to Central: the Portal plugin and its floor, namespace and tag preconditions, credentials, signing, sources and javadoc jars, and what a green release job means | [maven-build/publishing.md](maven-build/publishing.md) |
| Opening a `build.xml` or an Ivy file, bridging an Ant build into Gradle, or porting an Ant target to another build system | [maven-build/ant-legacy.md](maven-build/ant-legacy.md) |
| Editing a CI workflow that invokes Maven: the job's last goal, a `.mvn/extensions.xml` injected by a workflow step, or a non-blocking Maven-4 leg | [maven-build/lifecycle-and-plugins.md](maven-build/lifecycle-and-plugins.md), read from here, because no glob in this rule reaches a workflow file, so `MVN-BUILD-15` and `MVN-BUILD-03` load only through this line |
| Writing a `settings.xml` `<server>` entry, a committed `toolchains.xml`, or the `*.gradle.kts` line that would bridge an Ant build | [maven-build/publishing.md](maven-build/publishing.md), [maven-build/lifecycle-and-plugins.md](maven-build/lifecycle-and-plugins.md), [maven-build/ant-legacy.md](maven-build/ant-legacy.md), read from here, because no glob in this rule reaches those three files, so `MVN-PUB-06`, `MVN-BUILD-18`/`-19` and `MVN-ANT-02` load only through this line |
| Writing the Java or Kotlin sources this reactor compiles | `java-quality`, `kotlin-quality` (sibling sets, see below) |
| Editing a `*.gradle.kts`, a version catalog, or a Gradle wrapper in the same repository | `gradle-build` (sibling set, see below) |

## Severity

MUST = Block: fix before it lands. SHOULD = Warn: fix, or state why not in the
commit body. CONSIDER = Suggest: never blocks, never re-raised after a decline.

Rules marked **pinned** here or in a depth file (the `verify` gate, the bound
enforcer rule set, the Portal plugin) encode an agreed decision rather than a
derivable fact. They are defaults an adopter may override, once, in their own
parent POM, never per module. Overriding one is a decision. Ignoring one is a
violation.

Keep the Block list short enough that a blocked change is unusual. A rule set
where everything blocks teaches the reader to negotiate with all of it. The one
deliberate exception is `MVN-PUB`, which is MUST throughout: every row there is
a state Central rejects at upload, or one that makes a bad release
unrecoverable, because published coordinates are immutable.

## Siblings

- **`gradle-build`**, the same questions answered by the other build system:
  resolution and locking, the configuration cache, toolchains, plugin
  authoring, distribution and the Gradle side of Central publishing. Loads on
  `**/*.gradle.kts`, `**/*.gradle`, `**/gradle.properties`, `**/*.versions.toml`
  and the Gradle wrapper and verification files, so the two rules never load
  together. Where the two ecosystems genuinely disagree, this one says so:
  `MVN-BUILD-12` carries the contrast with `GRADLE-DEP-16` on what a checksum
  is, and `maven-build/dependencies.md` states outright that Maven has no
  analogue of `verification-metadata.xml` rather than inventing one.
- **`java-quality`** and **`kotlin-quality`**, the sources this reactor
  compiles, on `**/*.java` and `**/*.kt`. Several decisions have a statement on
  each side of the glob (`MVN-BUILD-01` and `JAVA-PLAT-01` are the same
  decision about the bytecode floor), and each is written complete, because a
  Maven-only adopter never loads the language rules.
- **`bazel-quality`**, for a repository that builds with Bazel and keeps a
  `pom.xml` only as a consumability probe or a publishing handoff. Bazel does
  not publish to Central itself: it hands off to Maven or Gradle, and this rule
  governs that half.
