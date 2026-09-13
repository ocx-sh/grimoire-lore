---
title: Ant Files and What a Migration Must Preserve
summary: The MVN-ANT family — what a build.xml encodes, the write-once and depends traps, the Gradle bridge that costs the whole configuration cache, and verifying a port against the Ant artifact
---

# Ant Files and What a Migration Must Preserve

Owns what an Ant file encodes and what a port out of it must reproduce. It does
not own the Maven lifecycle, the compiler plugin or the toolchain wiring, which
are `MVN-BUILD` in the `lifecycle-and-plugins` file, nor dependency declaration
(`MVN-DEP`, in `dependencies`), nor publishing and its POM (`MVN-PUB`, in
`publishing`). Nothing here recommends Ant. Every row fires only because an Ant
file is already in the diff, which is why a family with zero adoption in a
greenfield build still blocks merges: the reader who loads it just opened one.

Contents: [Where This Fires](#where-this-fires) ·
[The Ant File Itself](#the-ant-file-itself) ·
[What Only a Run Shows](#what-only-a-run-shows) ·
[The Bridge Into Gradle](#the-bridge-into-gradle) ·
[The Ported Artifact](#the-ported-artifact) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Where This Fires

- **Conditional entry, not a standard.** These rows are scoped to the file kind.
  An adopter who never opens a `build.xml` never owes any of them, and none of
  them is a reason to keep Ant. `MVN-ANT-02` is the exception that earns a MUST
  at zero adoption, because its blast radius lands on the *Gradle* build rather
  than on Ant.
- **Ivy is a named gap, not a covered surface.** `ivy.xml` and `ivysettings.xml`
  reach this family through the rule's glob, and no row below governs Ivy
  resolution: the research behind these rules measured `build.xml`. An Ivy file
  in the diff means the build resolves dependencies outside any POM. Port it
  under `MVN-ANT-05` and state the gap in the diff rather than assuming Ivy
  coordinates map one-to-one onto Maven ones.
- **`maven-antrun-plugin` is the second named gap.** An Ant `<target>` block
  embedded in a POM is the one Ant surface that appears in live Maven builds,
  and it is unmeasured as of 2026-09-12. Find it with
  `grep -rn --include='pom.xml' -e 'maven-antrun-plugin' .` before concluding a
  repository has no Ant in it. Empty output is the pass. A hit means Ant
  semantics apply to code no row below greps for.

## The Ant File Itself

Three greps over the Ant file, run before any other edit to it:

```bash
grep -rn -A4 --include='build.xml' -e '<javac' .      # MVN-ANT-01
grep -rn -A8 --include='build.xml' -e '<signjar' .    # MVN-ANT-06
grep -rh --include='build.xml' -e '<property name=' . \
  | sed 's/.*name="\([^"]*\)".*/\1/' | sort | uniq -d # MVN-ANT-03
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-ANT-01 | Set `includeantruntime="false"` explicitly on every live `<javac>`, before any other change to the file. | The default is governed by `build.sysclasspath` and is effectively yes, putting Ant's own runtime jars on the compile classpath. Ant's manual: *"It is usually best to set this to false so the script's behavior is not sensitive to the environment in which it is run"*. Same-system and zero-risk, and it removes one axis of "it built on my machine" before migration work starts. Ant 1.8+, verified 2026-09-12. | Gate line 1. Every printed `<javac>` must carry the attribute, and one that does not is the finding. Discount hits inside a `<!-- ... -->` block: apache/ant's own build file has a dead occurrence inside a FIXME comment. Empty output means the file compiles nothing. | MUST |
| MVN-ANT-03 | Never "change" an Ant property by re-declaring it. Properties are write-once, so a second `<property name="x" ...>` for a name already set is ignored in silence. | This is the opposite of a variable-assignment mental model and the standard source of "my override did not take effect". The working overrides are setting the value *earlier*, including `-Dx=...` on the command line, which is set first of all, or `<var>` from antcontrib. Ant any version, verified 2026-09-12. | Gate line 3 prints every property name declared more than once. Each printed name is a silent no-op at its second and later declaration, so any output is the finding and empty output is the pass. | MUST |
| MVN-ANT-06 | Pin `digestalg` and `sigalg` on `<signjar>` and set `preservelastmodified="true"`. Never take the JDK's default algorithm. | The JDK-default signing algorithm moves between releases, so an unpinned `<signjar>` produces a different signature on a different JDK, which defeats any byte-comparison of the port. `preservelastmodified` "give[s] the signed files the same last modified time as the original jar files", the one Ant signing attribute that bears on reproducibility. Ant 1.7+, verified 2026-09-12. | Gate line 2. A printed `<signjar>` block missing `digestalg`, `sigalg` or `preservelastmodified` is the finding. Empty output means nothing in this build is signed, which is a fact to carry into `MVN-ANT-05` rather than a pass on signing. | CONSIDER |

```xml
<!-- wrong: the second declaration is discarded without a warning, build.dir stays "build" -->
<property name="build.dir" value="build"/>
<property name="build.dir" value="target"/>
```

```xml
<!-- right: declare once, and override from outside, where "set first wins" works for you -->
<property name="build.dir" value="build"/>  <!-- ant -Dbuild.dir=target dist -->
```

## What Only a Run Shows

`ant -p` lists the targets, and `-v` is the only surface that prints a skip
decision:

```bash
ant -p                           # every target and its description
TARGET=dist; ant -v "$TARGET"    # prints each target's if/unless skip decision
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-ANT-04 | Do not read a `depends` chain as proof a target ran. `depends` orders execution, it does not force it. | Ant's manual: *"Ant's `depends` attribute only specifies the order in which targets should be executed — it does not affect whether the target that specifies the dependency(s) gets executed if the dependent target(s) did not (need to) run."* A migration that assumes "B depends on A, therefore A produced its output" ports a build that only ever worked by accident. Ant any version, verified 2026-09-12. | Run the gate above and read the skip lines, not the dependency graph. A target named in `depends` whose `if`/`unless` condition skipped it, while the port treats its output as present, is the finding. No skip lines means the whole chain ran on this input, which is one input and not a proof about the others. | SHOULD |

## The Bridge Into Gradle

One grep over the Gradle side, then one repeated build to confirm the cost:

```bash
grep -rn --include='*.gradle' --include='*.gradle.kts' -e 'importBuild' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-ANT-02 | Never introduce `ant.importBuild()`. Where an incremental bridge is unavoidable, run the Ant build as an external process (an `Exec` task invoking `ant -f build.xml <target>`), or call `ant.<task>(...)` inside a real Gradle task action. | Gradle's own guide: *"the configuration cache is automatically disabled when importing an Ant build."* The cost is whole-build and permanent rather than scoped to the imported targets, so every other task in that invocation loses cache reuse. Measured at 0 real usages across the 32 repositories surveyed on 2026-09-12, where every hit was Gradle's own documentation teaching migration away from Ant. Gradle 7+ for the configuration cache, verified 2026-09-12. | Gate above: any hit outside a comment or a documentation tree is the finding, and empty output is the pass. Confirm the mechanism rather than trusting the grep: run the same invocation twice and require the second to print the literal line `Reusing configuration cache.` Its absence after an `importBuild` is the rule, not a flake. | MUST |

```kotlin
// wrong: one line, and the whole build's configuration cache is gone
ant.importBuild("build.xml")
```

```kotlin
// right: the Ant build is a subprocess with declared inputs and outputs
tasks.register<Exec>("antDist") {
    inputs.file("build.xml")
    outputs.dir(layout.buildDirectory.dir("ant-dist"))
    commandLine("ant", "-f", "build.xml", "dist")
}
```

## The Ported Artifact

A source diff cannot see this. Compare the two jars:

```bash
ANT_JAR=dist/lib/app.jar; PORTED_JAR=build/libs/app.jar
diff <(unzip -l "$ANT_JAR") <(unzip -l "$PORTED_JAR")
diff <(unzip -p "$ANT_JAR" META-INF/MANIFEST.MF) <(unzip -p "$PORTED_JAR" META-INF/MANIFEST.MF)
jarsigner -verify -verbose "$PORTED_JAR"
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-ANT-05 | Port leaf targets first, and verify each ported output against the Ant build's own artifact (same entry list, same manifest attributes, same signed digest) before deleting the Ant target. | The six things a port silently loses are targets, filesets and patternsets, custom `<taskdef>`s, fork settings, inline `<manifest>` content and `<signjar>` configuration. Only the first three are visible in a source diff, which is why artifact comparison and not code review is the check. A custom taskdef needs an equivalent *written*, never a mechanical translation. | The three gate commands above. Both `diff`s empty is the pass, and any entry or manifest attribute present on one side only is the finding. `jarsigner -verify` must report the same signer as the Ant-built jar. Keep the Ant target in the tree until all three agree. | SHOULD |

## What Agents Get Wrong Here

1. **Recommends `ant.importBuild()` as "the standard Ant to Gradle bridge".**
   Gradle's own tutorial-era material presents it as a headline feature, and the
   configuration-cache cost is a later consequence the mirrored blog posts do
   not carry. Highest blast radius in the family, and the cheapest to avoid.
2. **"Overrides" an Ant property by adding a second `<property>`.** Pure
   variable-assignment intuition. Ant ignores the second write, the build stays
   green, and the agent reports a change that did not happen.
3. **Reads the `depends` graph as an execution trace.** The graph is the only
   thing visible in the file, and the skip decision is only visible in `-v`
   output from an actual run.
4. **Translates a custom `<taskdef>` mechanically**, matching Ant task names to
   Gradle or Maven equivalents that do not share semantics. A taskdef is code,
   and it needs an equivalent written and tested.
5. **Declares the port done on a green build plus a clean source diff.** Fork
   settings, inline `<manifest>` content and `<signjar>` configuration leave no
   trace in either, so both can be clean while the artifact changed.
6. **Leaves `includeantruntime` unset because the build works on this machine.**
   That is exactly the condition the attribute exists to remove, and the machine
   that disagrees is usually CI.
7. **Takes the JDK default signing algorithm**, which makes the signature a
   function of whichever JDK ran and defeats every comparison in
   `MVN-ANT-05`.
8. **Assumes Ant only lives in a `build.xml`,** so an Ant `<target>` inside a
   `maven-antrun-plugin` execution gets none of this reading at all.
