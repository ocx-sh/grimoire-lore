---
title: Kotlin Across the Java Boundary
summary: The KT-INTEROP family. Platform types and the nullability severity flags, the five interop annotations and the JVM signature javap actually shows a Java caller, suspend functions and value classes on a Java-facing surface, and the --patch-module wiring mixed JPMS sources need
---

# Kotlin Across the Java Boundary

Owns what a Kotlin declaration looks like to a Java caller, and what a Java
declaration means once Kotlin reads it. That is the nullability of a value
crossing in either direction, the five interop annotations and the JVM
signature they produce, and the build wiring a mixed-source JPMS module needs.
It does not own explicit API mode, ABI dumps, `data class` exposure, or the
`@JvmOverloads` versus `@IntroducedAt` binary-compatibility question, which are
`KT-API`'s and live in `api-and-abi.md`. It does not own `jvmTarget`,
`jvmDefault` or the toolchain, which are `KT-COMP`'s in
`compiler-and-toolchain.md`, nor coroutine correctness inside Kotlin
(`KT-CORO`, `coroutines.md`), nor `runCatching` and `use` (`KT-ERR`,
`errors-and-resources.md`). Which nullness flavour the Java side declares, and
where `@NullMarked` is written, is `JAVA-NULL`'s in the `java-quality` set.
This file starts where that marking stops.

Contents: [Scope](#scope) ·
[Nullability at the Boundary](#nullability-at-the-boundary) ·
[The Java View of the Kotlin File](#the-java-view-of-the-kotlin-file) ·
[Mixed Java and Kotlin in One Module](#mixed-java-and-kotlin-in-one-module) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **Every version fact below was read from kotlinlang.org at Kotlin 2.4.0,
  2.4.10 being the current patch, fetched 2026-09-05 and unchanged at the
  corpus verification date 2026-09-12.** K1 was removed in 2.4.0, so nothing
  here has a K1 spelling.
- **`kotlinc` reports none of this as an error at default settings.** A
  platform type is assignable to both a nullable and a non-null Kotlin type by
  design, a missing `@Throws` is invisible until a Java file tries to catch,
  and a mangled `value class` signature is a successful compile. detekt and
  ktlint ship no rule for any row in this file. The mechanical checks here are
  two compiler flags and `javap`, and where neither reaches, the row says so.
- **The annotation flavour on the Java side decides the severity, not the
  Kotlin code.** JSpecify reaches Kotlin as errors and JSR-305 as warnings, out
  of the same Kotlin source. A rule that says "annotate the Java side" without
  saying which flavour has bought nothing, which is why `KT-INTEROP-02` is
  about the flag and not about the annotation.
- **`@JvmOverloads` is not a binary-compatibility mechanism.** It generates
  Java-visible overloads and leaves Kotlin callers bound to the changed
  descriptor. `KT-API-07` owns that, in `api-and-abi.md`, and this file cites
  it rather than restating it.

## Nullability at the Boundary

Two commands. The first names every severity flag the build sets:
`grep -rn --include='*.gradle.kts' --include='*.gradle' --include='*.kt' -e 'Xjsr305' -e 'Xjspecify-annotations' -e 'Xnullability-annotations' .`
The second names the flavours the module can resolve:
`grep -rn --include='*.versions.toml' --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' -e 'jspecify' -e 'jsr305' -e 'checker-qual' -e 'org.jetbrains:annotations' .`
Which output is the finding depends on the row.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-INTEROP-01 | A public declaration whose value comes from a Java call declares its Kotlin type explicitly, and declares it from the Java side's annotation rather than from what the first call site accepted. A Java call with no nullness annotation on it yields a nullable Kotlin type, not a non-null one. | An inferred platform type propagates the "either" state into the published signature, so every consumer inherits a contract the compiler will not check at any call site. kotlinlang's coding conventions name this the boundary rule, and it is the one seam where a null crosses without a single diagnostic anywhere. The NPE then surfaces in an unrelated frame with no annotation to blame. Explicit API strict mode (`KT-API-01`, in `api-and-abi.md`) makes writing *a* type mandatory. It does not make the written type correct, which is the whole of this row. | `grep -rln --include='*.kt' -e 'import java.' -e 'import javax.' src/main/kotlin` lists the files holding a JDK-facing seam. Empty output means no JDK seam in Kotlin source, which is a pass for that half only. A module compiling against any Java dependency has the same seam whatever the imports say. Then read every `public` declaration in those files whose value comes from a Java call, and confirm the declared type's nullability was taken from the Java declaration. A non-null Kotlin type over an unannotated Java call is the finding. | MUST |
| KT-INTEROP-02 | Never lower a nullability severity flag to `warn` or `ignore`. JSpecify is `strict` by default from Kotlin 2.1.0 (verified 2026-09-12), so leave it unset. JSR-305 behaves as `warn` by default, so a module resolving a JSR-305 coordinate sets `-Xjsr305=strict` explicitly. | The two flavours differ only in default severity, and neither announces which one is in force. A module on JSR-305's default has full annotation coverage and a build that has never failed on a nullability mismatch, which reads identically to a module with no seam at all. Lowering the flag is the documented way to clear a fresh batch of errors, and it converts a compile-time catch into a production NPE with no trace in the diff. | The flag grep above. Any hit whose value is `warn` or `ignore` is the finding. Empty output is the pass for a JSpecify module and is **the finding** for a module the coordinate grep shows resolving a JSR-305 coordinate, whose unset default is `warn`. | MUST |
| KT-INTEROP-03 | A Java dependency annotated with a flavour that is neither JSpecify nor JSR-305 gets its package named in `-Xnullability-annotations`, at `strict`. JetBrains, Android, FindBugs, Eclipse, Lombok, RxJava3 and Vert.x are all in that set, and any flavour outside it — Checker Framework included — needs the same treatment. | Kotlin recognises those flavours only when the package is named, for example `-Xnullability-annotations=@org.checkerframework.checker.nullness.qual:strict`. Until it is, every member of that dependency arrives as a platform type no matter how completely the dependency is annotated, and the module looks null-safe from both sides while being checked on neither. | The flag grep above for `Xnullability-annotations`, and the coordinate grep for the flavours the module resolves. A flavour present in the second listing and absent from the first is the finding. Empty output on both, in a module resolving neither flavour, is the pass. | SHOULD |

```kotlin
// wrong: the declared type was chosen by what compiled, not by what Java promises
public fun cacheDir(): File = System.getProperty("user.home").let(::File)

// right: the JDK declares getProperty as returning null for an unset key
public fun cacheDir(): File? = System.getProperty("user.home")?.let(::File)
```

## The Java View of the Kotlin File

One gate covers this whole section. Compile, then read the signatures Java
actually sees, rather than the Kotlin source.

```bash
./gradlew :module:compileKotlin
find build/classes/kotlin/main -name '*.class' -printf '%P\n' \
  | sed -e 's#/#.#g' -e 's#\.class$##' \
  | xargs -r javap -p -cp build/classes/kotlin/main
```

Each annotation below solves one distinct problem. An agent that knows only one
of them writes the wrong one.

| Problem at the Java call site | Annotation | What javap shows once it is applied |
|---|---|---|
| Member must be callable without `.Companion` or `.INSTANCE` | `@JvmStatic` | `public static` on the member |
| Property must be readable as a field, not through a getter | `@JvmField` | a `public` field with the property's own visibility |
| Two overloads erase to one JVM descriptor, or a getter needs its own name | `@JvmName`, `@get:JvmName`, `@set:JvmName` | the chosen name in place of the generated one |
| Defaulted parameters must appear as separate Java overloads | `@JvmOverloads` | one overload per trailing default parameter |
| A checked exception must be catchable in Java | `@Throws` | a `throws` clause on the member |

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-INTEROP-04 | Annotate with `@Throws` every function a Java caller is expected to catch a checked exception from, and every function overriding a Java signature that declares one. The annotation lists the exception classes, it does not merely mark the function. | Kotlin has no checked exceptions and emits no `throws` clause, so `catch (IOException e)` in the Java caller fails to compile with "exception is never thrown in the corresponding try block". Inside one build that is a loud error the author fixes at once. On a published surface it is the consumer's compile error, discovered after release, on a library the consumer cannot edit. | The javap gate. A member whose Kotlin body throws or propagates a checked exception and whose javap line carries no `throws` clause is the finding. `grep -rn --include='*.kt' -e '@Throws' src/main/kotlin` audits the coverage that exists. Empty output from that grep, on a module with Java callers and any `IOException` path, is the finding. | MUST |
| KT-INTEROP-05 | A `companion object` or named `object` member that Java is meant to call statically carries `@JvmStatic`. Reach for the annotation the table names for the problem in hand, never for `@JvmStatic` as the general one. | Without it, Java reaches a companion member as `Config.Companion.load()` and a named-object member as `Config.INSTANCE.load()`. Both compile, both read as accidents of the binding, and both become the published spelling that a later `@JvmStatic` cannot take away. `@JvmStatic` on a companion generates the static on the *enclosing* class, while on a named object it generates it on the object class itself, so the two cases do not produce the same Java shape. | The javap gate over the enclosing class. A member Java calls statically that javap renders without `static` is the finding. | SHOULD |
| KT-INTEROP-06 | Do not put a `value` class, or any type whose signature contains one, in a public member a Java caller uses. That includes `kotlin.Result`, which is a value class. | The JVM name is mangled with a hash suffix, for example `userId-Ku1f8Aw`, and the parameter or return type is the underlying type rather than the wrapper. A hyphen is not a legal Java identifier character, so the member is not callable from Java at all, and nothing in the Kotlin source says so. The type is also silently boxed wherever it appears in a generic position or as a nullable type, so the erasure a Java caller sees is not the one the Kotlin signature implies. | The javap gate piped into `grep -nE '\w-\w'`. Any hit on a member Java is meant to call is the finding. Empty output is the pass. | MUST |
| KT-INTEROP-07 | **pinned.** A published Kotlin module ships a blocking or `CompletableFuture`-returning wrapper beside every `suspend` member of its public surface. This is the default under the program's Java-first surface decision. An adopter whose consumers are Kotlin-only overrides it once, module-wide, in a written statement in the module's own documentation, never per member. | A `suspend fun` compiles to a method taking a trailing `Continuation` parameter and returning `Object`, with `COROUTINE_SUSPENDED` as a possible return value. A Java caller can reach it only by implementing `Continuation` by hand, which no consumer will do and no consumer should be asked to. The defect is a design one and it is discovered by the consumer, after publication, when the wrapper is a new public API rather than a day-one one. | `grep -rn --include='*.kt' -e 'suspend fun' src/main/kotlin` lists the candidates. Explicit API strict mode spells these `public suspend fun`, so match the shorter form. For each hit on the published surface, the javap gate must show a sibling member with no `Continuation` parameter. A `suspend` member with no such sibling is the finding. Empty grep output is the pass. | MUST |
| KT-INTEROP-08 | Returning `kotlin.Result` from a public function that crosses a module boundary is a design review, not a routine merge. Prefer a sealed result type this module owns, or an exception. | JetBrains discourages the practice publicly while it is used widely inside Kotlin's own libraries, so the position is genuinely split and this row stays a suggestion. What is not split: `Result` is a value class, so `KT-INTEROP-06` binds it on any Java-facing surface, and a `Result` boxed into a generic position loses the allocation saving that motivated it. `-Xallow-result-return-type` is historical only. The restriction it lifted was removed in Kotlin 1.5 and the flag itself is gone, so any text presenting it as a live gate is wrong. | `grep -rn --include='*.kt' -e ': Result' -e ': kotlin.Result' src/main/kotlin`. Each hit on a public declaration needs a stated reason in the diff. Empty output is the pass. | CONSIDER |

```kotlin
// wrong: Java sees Config.INSTANCE.load(), and a value-class parameter it cannot name
@JvmInline public value class Region(public val code: String)
public object Config { public fun load(region: Region): Settings = TODO() }

// right: static from Java, and the boundary parameter is a type Java can write
public object Config { @JvmStatic public fun load(regionCode: String): Settings = TODO() }
```

## Mixed Java and Kotlin in One Module

One grep over the build files:
`grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'patch-module' -e 'CommandLineArgumentProvider' .`
Whether empty output is the pass depends on whether the module has a module
descriptor at all, which `find . -name module-info.java` answers.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-INTEROP-09 | A module with both a `module-info.java` and Kotlin sources gives `compileJava` a `--patch-module` argument through a `CommandLineArgumentProvider`. Passing the path as a plain string in `options.compilerArgs` is not the same thing. | Kotlin and Java compile to separate output directories, so `javac` reads the descriptor without seeing the Kotlin classes and rejects every Kotlin type the descriptor exports or the Java sources reference. The failure names a missing package rather than a missing compile step, so the reflex fix is to edit the `exports` list, which removes the Kotlin half of the module from the descriptor and leaves a build that succeeds while publishing a smaller surface than intended. The provider form is required because a plain string is captured at configuration time, which loses the task dependency and breaks under the configuration cache. | The grep above. Empty output, on a module where `find . -name module-info.java` returns a hit and `find . -name '*.kt' -path '*src/main*'` also returns a hit, is the finding. Empty output on a module with no descriptor is the pass. | MUST |

```kotlin
// build.gradle.kts, in the module that has both module-info.java and Kotlin sources
val moduleName = "com.example.api"
tasks.named<JavaCompile>("compileJava") {
    options.compilerArgumentProviders.add(CommandLineArgumentProvider {
        // sourceSets["main"].output carries the Kotlin classes dir as well as the Java one
        listOf("--patch-module", moduleName + "=" + sourceSets["main"].output.asPath)
    })
}
```

## What Agents Get Wrong Here

1. **Writing `!!` to make a platform-typed expression compile.** The highest
   frequency failure in this family, because it is the shortest edit that turns
   the error green and because the assertion is locally true at the one call
   site being written. It moves the NPE from the boundary to a later frame and
   leaves the published signature claiming non-null.
2. **Declaring the Kotlin type non-null because the Java call "never returns
   null".** The reasoning is about the current implementation, the signature is
   a promise about every future one, and nothing rechecks it. This is the same
   defect as the `!!` above with no visible marker at all.
3. **Offering `@JvmStatic` as the Java interop annotation.** Asked to make a
   Kotlin type Java-friendly, an agent annotates everything with `@JvmStatic`
   and stops, leaving the field exposure, the erasure clash and the checked
   exception untouched. Training data is dominated by `@JvmStatic` examples
   because they are the shortest.
4. **Shipping a `suspend fun` as the public API of a library with Java
   consumers.** It is the idiomatic Kotlin signature and it compiles, and the
   agent never writes the Java call that would prove it unreachable.
5. **Omitting `@Throws` and never learning.** The Kotlin side compiles clean,
   the consequence lands in a file the agent is not editing, and on a published
   library it lands in a repository the agent has no access to.
6. **Lowering `-Xjsr305` or `-Xjspecify-annotations` to clear a fresh batch of
   nullability errors.** It is the documented flag, the change is one word in a
   build file, and the resulting build is indistinguishable from one that had no
   findings.
7. **Reaching for a `value class` to make an ID type safe on a Java-facing
   surface.** Correct and recommended Kotlin advice that silently makes the
   member uncallable from Java, with no diagnostic on either side.
8. **Returning `Result` from a public function and then trying to enable it
   with `-Xallow-result-return-type`.** The flag is from Kotlin 1.4 era
   material that still dominates the training signal. It no longer exists, so
   the build fails on an unknown argument and the real question, whether the
   type belongs in the signature, never gets asked.
9. **Adding `module-info.java` to a mixed module and stopping there.** The
   build then fails naming a package, and the offered fix is to edit the
   `exports` list rather than to patch the module.
10. **Naming `@JvmOverloads` as the fix for a binary-compatibility break from a
    new defaulted parameter.** It is the most-cited interop annotation for
    default parameters and it addresses only Java callers. `KT-API-07`, in
    `api-and-abi.md`, owns the correct answer.
