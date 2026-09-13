# maven-build

Standards for what a Maven reactor claims about itself: the gate, eighteen
merge-blocking non-negotiables, and four depth files routed to by task. Ant
lives here too, as the legacy file it is.

```sh
grim add ghcr.io/ocx-sh/lore/maven-build
```

Loads on `**/pom.xml`, `**/.mvn/**`, both wrapper scripts, and the Ant and Ivy
files. The index is 163 lines and always present; a depth file is read only
when the work calls for it.

## It starts with two things that review clean and run nothing

`maven-enforcer-plugin` ships 37 built-in rules and zero of them active. A
`<rules>` block with no `<execution>` declaring the `enforce` goal enforces
nothing while reading as a configured gate, and that is the single most common
shape this set finds.

The second is quieter. A green `mvn verify` distinguishes "annotation
processors ran" from "processors were silently skipped" nowhere in its exit
code, its console output or the POM. Both failures look exactly like a pass, so
the gate carries two extra commands whose empty output is the finding rather
than the pass: one that lists generated sources, and one that reads the
Surefire provider line out of a debug run.

Until the enforcer is bound and the gate reaches `verify`, most of this set is
unenforced, and the index says so in its first paragraph.

## What is in it

The index carries the gate, eighteen non-negotiables, and three cross-cutting
rules it owns outright. 51 rules in total, 39 of them merge-blocking, across
four depth files: dependencies, mediation and the enforcer; the lifecycle, its
plugins, the toolchain and the wrapper; publishing to Central through the
Portal; and the Ant legacy.

Ant is a depth file rather than a fifth rule because the exemplar corpus
carried Ant only ever beside a Maven or Gradle build, never alone. Its rows are
conditional entry, not a standard: an adopter who never opens a `build.xml`
owes none of them, and the reader who loads the file just opened one. Nothing
in it recommends Ant.

Every row here is written complete on its own, even where Gradle answers the
same question, because a Maven-only adopter never loads the Gradle or the
language rules and a cross-reference they cannot follow is worse than a
restatement.

## Pinned decisions

`verify` is the last Maven goal of every CI gate, never `install`, `test`,
`package` or a hyphenated intermediate phase. The enforcer is bound by an
`<execution>` declaring the `enforce` goal, not merely declared. Publishing
goes through `central-publishing-maven-plugin`, pinned at 0.7.0 or later before
any SNAPSHOT channel is relied on, because that is the release the capability
landed in rather than a version that merely improved it.

Each is a default an adopter overrides once, in their own parent POM, never per
module. The Block list is kept short with one deliberate exception: every
publishing row is MUST, because each names a state Central rejects at upload or
one that makes a bad release unrecoverable.

## Where Maven and Gradle genuinely disagree

Maven mediates by nearest definition by tree depth, first declaration breaking
ties. Gradle takes the highest version across the whole graph. A reviewer
carrying Gradle intuition into a POM reads every conflict backwards and bumps a
deeper transitive, which has no effect and passes review, so the set states the
mechanism rather than assuming it transfers.

A `dependencyManagement` entry decides before mediation runs at all, matching
on group, artifact, type and classifier, so a mismatched classifier silently
fails to apply while looking correct.

And Maven checksum configuration is not a supply-chain control. This set says
so outright, names GPG signing as the mechanism when the subject is trust, and
states plainly that Maven has no analogue of Gradle's verification metadata
rather than inventing one.

## What it does not cover

Gradle's answers to the same questions, which are `gradle-build`'s. The Java or
Kotlin sources the reactor compiles. It also does not cover Bazel: a repository
that builds with Bazel and keeps a `pom.xml` as a consumability probe or a
publishing handoff gets the Bazel half from `bazel-quality`. Only the handoff
is governed here, because Bazel does not publish to Central itself.

## Siblings

`gradle-build` on build scripts, catalogs, the wrapper and lockfiles, globs
this set deliberately does not cover, so the two never load together.
`java-quality` and `kotlin-quality` on the sources. Bundled as
`jvm-essentials`.
