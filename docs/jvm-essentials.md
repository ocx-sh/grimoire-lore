# jvm-essentials

The OCX JVM set in one install: four rules for the files you edit, and two
skills for the procedures you run occasionally.

```sh
grim add ghcr.io/ocx-sh/lore/jvm-essentials
```

| Member | Kind | Covers |
|---|---|---|
| `java-quality` | rule | Sixteen non-negotiables and 72 MUST rows across nine depth files: the Error Prone and NullAway gate, errors and resources, untrusted input, concurrency and the process boundary, API evolution and the ABI gate, nullness, records and pattern matching, JDK floors, testing and coverage |
| `kotlin-quality` | rule | Seventeen non-negotiables and 42 MUST rows across seven depth files: the detekt and ktlint gate, coroutines and cancellation, errors and resources, the single ABI gate, the Java interop boundary, compiler flags and toolchain, Kover and virtual time |
| `gradle-build` | rule | Eighteen non-negotiables and 93 MUST rows across eight depth files: build structure and convention plugins, dependencies and their trust, configuration-cache correctness, toolchains and the wrapper, plugin authoring, distribution, Central publishing, and CI |
| `maven-build` | rule | Eighteen non-negotiables and 39 MUST rows across four depth files: mediation and the enforcer, the lifecycle and its plugins, Central publishing through the Portal, and the Ant legacy |
| `jvm-release` | skill | An eight-step gate-ordered Maven Central release for Gradle and Maven, built around Central's immutability, with the dead OSSRH paths named |
| `jvm-dependency-triage` | skill | Three entry points for a dependency problem, keyed to the tool that reports the reason rather than the one that reports the list |

## Why four rules and not one

The globs genuinely differ, which is the only thing that justifies a second
rule file. A `.java` edit is not a `pom.xml` edit, and loading the whole Gradle
plugin-authoring depth while you adjust a dependency scope is pure cost.

So the split follows what the file under edit is, not what language family it
belongs to. The two source rules carry the language standards. The two build
rules carry what a build claims about itself in files no compiler ever checks.
A `pom.xml` edit pays for nothing Kotlin, and a `.kt` source edit pays for
nothing Maven. The two build rules never load together at all, because their
globs are disjoint.

There is one deliberate overlap. A Kotlin-DSL build script is Kotlin source, so
editing one loads both `kotlin-quality` and `gradle-build`, and the Kotlin
index names which of its rows actually bind there.

Ant is a depth file inside `maven-build` rather than a fifth rule, because the
measured exemplar corpus carried Ant only ever beside a Maven or Gradle build,
never alone.

## Why two skills and not two more rules

Both skills are procedures, not standards. One runs per release, the other per
dependency incident. Neither has any reason to load on every edit, and either
one loaded per edit would be dead weight in the context budget.

They carry no rules of their own. Each restates the merge-blocking rows it
enforces as findings with the rule IDs, so a review that runs the procedure
without the rule sets loaded still reports them correctly, and each says
explicitly that the rule text and its verification are settled in the rule set,
never in the skill.

## The premise

Almost every gate in this ecosystem can be declared and never bound, and the
unbound version exits zero. Eight of nine Error Prone checks ship disabled.
detekt's own default config activates 129 of its 231 rules. The Maven enforcer
ships 37 built-in rules and zero active. A Gradle version catalog constrains
requests and pins nothing. A coverage verification task, a japicmp task, an ABI
check and an extra test suite are each created without being attached.

Of 32 flagship JVM repositories measured, 21 wire neither Error Prone nor
SpotBugs. So every rule set here opens by making its own gate provable, and
only then states what the gate should catch. Half the verifications are
inverted, and each one says which way empty output reads.

## What is not in it

Bazel. A repository that builds with Bazel and keeps a Gradle or Maven build as
a publishing handoff gets that from the `bazel-quality` set, which already owns
`BUILD.bazel`. The Java-and-Kotlin-under-Bazel depth file belongs to that set
and is not a member here, so no two rules glob the same build file.

The bundle names its members without a tag. It says these six belong together.
Your `grimoire.lock` is what freezes them.
