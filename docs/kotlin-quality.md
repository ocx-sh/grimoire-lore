# kotlin-quality

Standards for writing and reviewing Kotlin: the gate, seventeen merge-blocking
non-negotiables, and seven depth files routed to by task.

```sh
grim add ghcr.io/ocx-sh/lore/kotlin-quality
```

Loads on `**/*.kt` and `**/*.kts`. The index is 156 lines and always present; a
depth file is read only when the work calls for it.

## It starts by assuming your analyzers do not activate

detekt's shipped default configuration activates 129 of its 231 rules, so a
build that sets `buildUponDefaultConfig = true` runs 102 of them not at all.
The four coroutine rules this set leans on are among the off ones. ktlint reads
only `.editorconfig`, so every property left unset takes ktlint's default
rather than a project decision, and of 32 flagship JVM repositories measured,
3 set any `ktlint_*` key.

Neither tool reports what it is not running. An unconfigured gate and a
considered one print the same green line, which is why the first instruction
here is to prove the gate activates before any rule below is claimed to hold.

## It also loads while you edit a build script

A Kotlin-DSL build script is Kotlin source, so this set loads on
`*.gradle.kts` as well. That is deliberate rather than accidental, and the
index says which five non-negotiable rows actually bind in a build file. Every
other row is scoped in its own text to the source shape it governs, so none of
them fires on a settings file.

The consequence worth knowing before you install: editing a build script loads
both this index and `gradle-build`'s. Editing a `.kt` source file loads only
this one.

## What is in it

The index carries the gate, seventeen non-negotiables, and three cross-cutting
rules it owns outright. 66 rules in total, 42 of them merge-blocking, spread
over seven depth files: the lint gate, coroutines and cancellation, errors and
resources, published API and ABI, the Java interop boundary, compiler flags and
toolchain, and tests with Kover and virtual time.

`KT-ERR` is not a translation of the Java family. Three of its five rows have
no detekt equivalent at any configuration, and one of them is stronger than the
Java gate. That pattern holds across the set: a row exists where Kotlin's
default behaviour differs, not where a Java rule could be restated in Kotlin
syntax.

Three checks here are created without being attached, and each writes its
reports and exits zero. An `.api` dump whose check task never reaches `check`,
a coverage floor switched off by a property gate, and a detekt or ktlint task
carrying `ignoreFailures = true`. The gate's fourth command exists only to
prove those three are in the task graph.

## Pinned decisions

detekt for logic and ktlint for formatting, with the four coroutine rules
explicitly set active. Exactly one ABI gate, defaulting to the standalone
binary-compatibility validator, because running neither is the finding and
running both is a conflict rather than extra safety. The official ktlint code
style, stated explicitly rather than inherited. A Java-callable wrapper beside
every published `suspend` member. `kotlin.test` on the JUnit Platform. A
bytecode floor of 17 behind an explicit `jvmTarget`, because a toolchain
declaration does not move the bytecode target.

Each is a default an adopter overrides once, in their own convention plugin or
`.editorconfig`, never per module and never per call site.

## How it relates to java-quality

Same JVM, two languages, two globs. Six facts bind both because the decision
belongs to the platform rather than to either language: the charset rule, the
locale checks, JSpecify on the published surface, the two-numbers toolchain
decision, the module descriptor, and filtered deserialization.

Those six ship as a one-line non-negotiable in both indexes, citing the Java
IDs, with the depth written in exactly one file. A Kotlin-only adopter never
loads the Java set, so the line has to be there; a reader who loads both never
meets two definitions of the same rule. Nothing else is duplicated. A `.java`
edit never loads the Kotlin depth, and a `.kt` edit never loads the Java one.

## What it does not cover

No architecture, no folder layout, and no restatement of the language, which is
already in the model. Threads, locks and the child-process boundary are the
Java set's, not this one's. `Flow`'s catch-operator placement and `StateFlow`'s
conflation contract are a named gap rather than a silent omission.

## Siblings

`java-quality` on `**/*.java`. `gradle-build` and `maven-build` for what a
build claims about itself in files no compiler checks. Bundled with both skills
as `jvm-essentials`.
