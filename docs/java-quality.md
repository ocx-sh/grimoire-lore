# java-quality

Standards for writing and reviewing Java: the gate, sixteen merge-blocking
non-negotiables, and nine depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/java-quality
```

Loads on `**/*.java` and `**/junit-platform.properties`. The index is 150 lines and always present; a depth file
is read only when the work calls for it.

## It starts by assuming your lint gate is a style gate

Eight of the nine Error Prone checks this set leans on ship disabled. They fire
only under an explicit promotion to `ERROR`, and nothing in a build reports
that they are off. Of 32 flagship JVM repositories measured, 21 wire neither
Error Prone nor SpotBugs at all. A build carrying a Checkstyle or SpotBugs
block and no Error Prone wiring is a style gate wearing a lint gate's name.

So the first instruction is not a rule about code. It is: confirm the gate can
go red, then trust the rest. Until that wiring lands, most of this set is
enforced by reading, and it says so rather than pretending otherwise. An inert
check is indistinguishable from a clean one.

## Four things get created without ever being attached

Java's build tools let you declare a gate and never bind it, and every one of
those shapes exits zero with a report nobody reads. A `jvm-test-suite` suite
other than `test`. A `jacocoTestCoverageVerification` block. The japicmp task.
Any Maven plugin declared with no bound `<execution>`.

That is why the gate here is three commands rather than one, and why one of
them is a `--dry-run` whose only job is to prove a task is in the graph.
Wiring is most of the work, because the unwired version of each of these reads
exactly like the wired one.

## What is in it

The index carries the gate, sixteen non-negotiables, and three cross-cutting
rules it owns outright. 103 rules in total, 72 of them merge-blocking, spread
over nine depth files: the lint gate, errors and resources, security and
untrusted input, concurrency and the process boundary, public API and its
evolution, nullness flavours, records and pattern matching, JDK floors and
platform determinism, and testing.

Every rule carries an ID, a rationale, a runnable verification and a severity.
Nothing routes through a topic index. You read the file for the work you are
about to do, and those files do not point at each other.

Half the verifications are inverted, so each one states which way empty output
reads. An absent `options.release`, an absent `violationRules`, an absent
`module-info.java` on a library and an absent find-sec-bugs beside a SpotBugs
gate are each the finding, not the pass.

## Pinned decisions

Some rules encode an agreed decision rather than a derivable fact, and they are
marked pinned so a later reader does not re-litigate them. The JDK floor is 17
with a toolchain of 25 and a three-leg CI matrix. Coverage is 90 percent line
and branch, ungated, enforced on Linux only, with the number in the build
config and never in a CI flag. Error Prone plus NullAway inside `javac` is the
gate of record, JSpecify is the nullness flavour, japicmp is the ABI gate, the
process exit status maps onto one enum of sixteen members, and a published SDK
holds a zero-runtime-dependency commitment.

Each is a default an adopter overrides once, in their own convention plugin or
build configuration, never per module and never per call site. Overriding one
is a decision, recorded with its reason. Ignoring one is a violation.

## What it does not cover

No architecture, no folder layout, no framework opinion, and no restatement of
the language specification, which is already in the model. It names traps, not
maps: the shape of a particular codebase is discoverable by reading it.

It also does not cover the files a compiler never checks. Build scripts,
manifests, catalogs and lockfiles are the build siblings', on globs this set
deliberately does not touch, so a `.java` edit never pays for them.

## Siblings

`kotlin-quality` answers the same questions for Kotlin and adds the ones Java
does not have. It loads on `**/*.kt` and `**/*.kts`, so a `.java` edit never
loads the Kotlin depth. Six facts are genuinely shared between the two, because
the same JVM decision binds both languages: the charset rule, the locale
checks, JSpecify on the published surface, the two-numbers toolchain decision,
the module descriptor, and filtered deserialization. Each ships as a one-line
non-negotiable in both indexes with the depth in exactly one file, so a
Kotlin-only adopter is not silently missing a Java fact and neither index
carries a second definition of it.

`gradle-build` and `maven-build` cover what a build claims about itself.
Bundled with both skills as `jvm-essentials`.
