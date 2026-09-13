---
title: "Kotlin public API and the ABI gate"
topic: "A Kotlin library's public surface, and its binary-compatibility gate"
agent: "kotlin-api-and-abi"
model: sonnet
date_researched: 2026-09-12
sources_count: 14
scope: >
  Covers what a Kotlin library may put in its public surface (visibility, types, KDoc,
  Boolean args, data classes), the exact bytecode consequences of changing that surface
  (default params, return-type variance, data-class growth, annotation targets,
  @PublishedApi, deprecation, opt-in misuse), Java-interop annotations relevant to binary
  compatibility (@JvmOverloads, @JvmStatic, @JvmName, @Throws), explicitApi() mode, and the
  standalone-BCV-vs-abiValidation{} decision for a greenfield library. Does not cover
  Kotlin Multiplatform/KLib ABI validation beyond noting its existence, coroutines API
  design (KT-CORO), or general Java-interop idiom beyond the binary-compat-relevant
  annotations (KT-INTEROP).
---

## Table of contents

1. [Findings](#findings)
   1. [Explicit API mode](#1-explicit-api-mode)
   2. [The three-rule library checklist](#2-the-three-rule-library-checklist)
   3. [Binary-compatibility breaks, with exact bytecode consequences](#3-binary-compatibility-breaks-with-exact-bytecode-consequences)
   4. [Java-interop annotations and binary compatibility](#4-java-interop-annotations-and-binary-compatibility)
   5. [@PublishedApi](#5-publishedapi)
   6. [Opt-in requirements: correct and incorrect uses](#6-opt-in-requirements-correct-and-incorrect-uses)
   7. [The sanctioned deprecation cycle](#7-the-sanctioned-deprecation-cycle)
   8. [Boolean arguments and data classes in public API](#8-boolean-arguments-and-data-classes-in-public-api)
   9. [The ABI-gate decision: standalone BCV vs abiValidation{}](#9-the-abi-gate-decision-standalone-bcv-vs-abivalidation)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- A published Kotlin module MUST enable `explicitApi()` (strict mode) — CI failure is a compiler **error**, not a warning, on any public declaration missing a visibility modifier or an inferred type ([kotlinlang whatsnew14](https://kotlinlang.org/docs/whatsnew14.html)).
- Adding a parameter with a default value to a public function breaks binary compatibility even though source compatibility is preserved — old-compiled callers hit `NoSuchMethodError` ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- Both **widening and narrowing** a public function's return type break binary compatibility — narrowing looks safe to a human reading Kotlin source and is not, because the JVM call site is bound to the erased return-type descriptor ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- A public `data class` gaining a property changes both the generated constructor and `copy()` descriptor — MUST NOT expose a `data class` in a public API surface ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html), [readability](https://kotlinlang.org/docs/api-guidelines-readability.html)).
- `@JvmOverloads` only helps **Java** callers; it does nothing for Kotlin callers, who are recompiled against the new default-parameter signature and still break at the same `NoSuchMethodError` if they were compiled against the old jar ([java-to-kotlin-interop](https://kotlinlang.org/docs/java-to-kotlin-interop.html)).
- `@IntroducedAt` under `@OptIn(ExperimentalVersionOverloading::class)` is the only mechanism that generates true version-gated overloads for **both** Java and Kotlin callers — and it is still Experimental, so no non-experimental full fix exists today ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- `@PublishedApi internal` declarations are bound by the same binary-compatibility rules as `public` ones the moment an `inline` function exposes them to call sites — treat every `@PublishedApi` member as public for review purposes ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- Adding an `AnnotationTarget` to a `@Target` set can silently redirect Java-reflection lookups from a field to the property, because Kotlin's target-resolution order prefers `PROPERTY` over `FIELD` when both are declared — a change with zero Kotlin-side symptom that breaks Java reflection callers ([backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- `@RequiresOptIn` is the wrong tool to deprecate an already-shipped stable declaration; the sanctioned path is `@Deprecated(message, replaceWith, level)` walking WARNING → ERROR → HIDDEN → removal ([opt-in-requirements](https://kotlinlang.org/docs/opt-in-requirements.html), [backward-compat](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html)).
- Opt-in does not propagate automatically: a public signature that *uses* an `@RequiresOptIn`-marked type must itself carry that marker, or callers silently depend on unstable API without ever opting in ([opt-in-requirements](https://kotlinlang.org/docs/opt-in-requirements.html)).
- `@SubclassOptInRequired` is the separate marker for "stable to call, unstable to extend" — it does not inherit to nested/inner classes ([opt-in-requirements](https://kotlinlang.org/docs/opt-in-requirements.html)).
- The library-author checklist from Kotlin's own coding conventions is three MUST rows: always specify visibility, always specify return/property types, KDoc every public member except non-documenting overrides ([coding-conventions#coding-conventions-for-libraries](https://kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries)).
- A public API MUST NOT take a bare `Boolean` argument — split into two named functions or an `enum class` instead ([readability](https://kotlinlang.org/docs/api-guidelines-readability.html)).
- **Decide today: for a greenfield library, use the standalone `binary-compatibility-validator` plugin, not `abiValidation{}`.** The standalone plugin is feature-frozen (maintenance mode) but is the only one that is not gated by an experimental opt-in and is what 5/32 corpus repos already run; `abiValidation{}` requires `@OptIn(ExperimentalAbiValidation::class)` and shipped only from Kotlin 2.2.0 (2025-06-23) ([BCV README](https://github.com/Kotlin/binary-compatibility-validator/blob/master/README.md), [gradle-bcv](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html)).
- Standalone-plugin task names: `apiDump` (write the golden `.api` files) and `apiCheck` (compare against them, auto-wired into `check`) — versus `abiValidation{}`'s `updateKotlinAbi` / `checkKotlinAbi` ([BCV README](https://github.com/Kotlin/binary-compatibility-validator/blob/master/README.md), [gradle-bcv](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html)).
- An adopter already on the standalone plugin should NOT migrate yet: `abiValidation{}` is still `@OptIn`-gated Experimental as of Kotlin 2.2/2.3, the standalone plugin still receives Kotlin-version-compat fixes, and the migration cost when the KGP feature stabilizes is a mechanical one (drop the `org.jetbrains.kotlinx.binary-compatibility-validator` plugin id, add `abiValidation{}`, rename `.api` dumps' generating tasks in CI) rather than a rewrite of the `.api` files themselves, which share the same dump format lineage.
- `explicitApi = null` (ktor's per-module opt-out) is the named counter-pattern that proves "recommended by kotlinlang" and "enabled" are two different measured facts — a rule that only cites kotlinlang's guidance without checking the actual Gradle property overstates adoption.
- `kotlinx.coroutines` enables the same MUST via the compiler-flag form `-Xexplicit-api=strict`, not the Gradle DSL `explicitApi()` call — both are valid detection targets and a reviewer must grep for both.

## Findings

### 1. Explicit API mode

Explicit API mode is a Kotlin compiler feature "for library authors" that requires (a) a visibility modifier on every declaration exposed to the public API and (b) an explicit type for every public property and function, instead of relying on type inference ([whatsnew14](https://kotlinlang.org/docs/whatsnew14.html)). Exempt: primary constructors, `data class` properties, property getters/setters, and `override` members.

Gradle Kotlin DSL:

```kotlin
kotlin {
    explicitApi() // strict: errors
    // or, spelled out:
    explicitApi = ExplicitApiMode.Strict
}
```

Warning-only variant (`explicitApiWarning()` / `ExplicitApiMode.Warning`) exists but produces warnings, not build failures — not sufficient for a CI gate. Command-line/compiler-flag equivalent: `-Xexplicit-api={strict|warning}` ([whatsnew14](https://kotlinlang.org/docs/whatsnew14.html)).

**CI failure it produces**: in `strict` mode, a public declaration missing a visibility modifier or an inferred (unwritten) return/property type is a **compiler error** — the `compileKotlin` task fails, not a separate lint task. This is stronger than most lint gates in the corpus (Checkstyle, detekt) which fail a *separate* task; explicit API mode fails compilation itself.

Two valid detection idioms, both seen in the corpus and both a reviewer must check for:
- Gradle DSL: `grep -rn 'explicitApi\s*(' **/*.gradle.kts` (`Kotlin__kotlinx.coroutines` does **not** use this form)
- Compiler flag: `grep -rn '\-Xexplicit-api=strict'` — `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/configure-compilation-conventions.gradle.kts:19` uses exactly this form.

Counter-evidence a rule must name: `ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11` sets `explicitApi = null` per module (opt-in, not repo-wide) — ktor is not off explicit API mode as a matter of policy disagreement, it scopes it per module rather than enabling it globally. A reviewer checking "does this repo run explicit API mode" must read the per-module wiring, not just the top-level convention file.

### 2. The three-rule library checklist

Kotlin's own coding conventions page states, verbatim, under "Coding conventions for libraries" ([coding-conventions#coding-conventions-for-libraries](https://kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries)):

> - Always explicitly specify member visibility (to avoid accidentally exposing declarations as public API).
> - Always explicitly specify function return types and property types (to avoid accidentally changing the return type when the implementation changes).
> - Provide KDoc comments for all public members, except for overrides that do not require any new documentation (to support generating documentation for the library).

| Rule | Severity | Verification |
|---|---|---|
| Always specify visibility | MUST | Subsumed by `explicitApi()` strict mode — a missing modifier is a compile error, not a separate check |
| Always specify return/property types | MUST | Same — `explicitApi()` strict mode rejects inferred public types |
| KDoc every public member (except non-documenting overrides) | SHOULD, verified by tooling not the compiler | Dokka's own "undocumented declarations" report, or `./gradlew dokkaHtml` plus a CI step that fails on any `Undocumented` warning; no compiler-level gate exists for this rule, unlike the first two |

The first two rules are **subsumed entirely** by `explicitApi()` strict mode — a rule author does not need a separate grep for either, because enabling explicit API mode makes both compile errors. Only the KDoc rule needs its own verification path, and it is a documentation-generator report, not a compiler diagnostic — a materially weaker gate.

### 3. Binary-compatibility breaks, with exact bytecode consequences

All from [api-guidelines-backward-compatibility.html](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html), the densest page in the corpus per the brief.

**Adding a default-valued parameter** — breaks both binary and source compatibility for pre-compiled callers:

```kotlin
// Before
fun fib() = 0
// After
fun fib(input: Int = 0) = 0
```

```
Exception in thread "main" java.lang.NoSuchMethodError: 'int LibKt.fib()'
	at LibKt.main(fib.kt:2)
```

The bytecode method descriptor changed (`()I` no longer exists once `fib(int)` becomes the sole compiled overload); a caller's `.class` file still references the old descriptor.

**Widening or narrowing a return type** — both break binary compatibility (narrowing preserves *source* compatibility, which is exactly why it looks safe and is not):

```kotlin
// Before
public fun demo(): Number = 3
// After — narrowed, looks harmless in a diff
fun demo(): Int = 3
```

```
Exception in thread "main" java.lang.NoSuchMethodError: 'java.lang.Number Library.demo()'
	at ClientKt.main(call.kt:2)
```

The JVM call site is bound to the exact return-type descriptor (`()Ljava/lang/Number;`); a caller's bytecode invokes a method signature that no longer exists once the descriptor changes to `()I`, regardless of the fact that `Int` is assignable where `Number` was expected in source.

**A public `data class` gaining a property** — changes the generated constructor descriptor and the `copy()` descriptor:

```kotlin
// Before
data class User(val name: String, val email: String)
// generated: copy(String, String): User

// After
data class User(val name: String, val email: String, val active: Boolean = true)
// generated: copy(String, String, boolean): User
```

Both the primary constructor and `copy()` change signature; changing constructor parameter *order* additionally breaks the generated `componentN()` destructuring functions. This is why the map's conflict-resolution and this brief both land on: **never expose a `data class` in a public API**.

**A `@Target` annotation gaining a value can silently redirect reflection**:

```kotlin
// Before — targets FIELD only
@Target(AnnotationTarget.FIELD)
annotation class Example
class User { @Example val name: String = "" }

// After — PROPERTY added
@Target(AnnotationTarget.PROPERTY, AnnotationTarget.FIELD)
annotation class Example
```

Kotlin resolves an ambiguous target by preferring `PROPERTY` over `FIELD` when a member can carry either — so `@Example` moves from the backing field to the synthetic property annotations holder. A Java-reflection caller doing `field.getAnnotation(Example.class)` silently stops finding it; there is no compile error and no `NoSuchMethodError`, only a runtime `null` where an annotation used to be.

### 4. Java-interop annotations and binary compatibility

From [java-to-kotlin-interop.html](https://kotlinlang.org/docs/java-to-kotlin-interop.html).

**`@JvmOverloads`** generates one Java-visible overload per default parameter, dropping that parameter and everything to its right:

```kotlin
class Circle @JvmOverloads constructor(centerX: Int, centerY: Int, radius: Double = 1.0)
```

```java
Circle(int centerX, int centerY, double radius)
Circle(int centerX, int centerY)
```

**Binary-compatibility limitation the brief calls out explicitly: `@JvmOverloads` is Java-callers-only.** Kotlin callers always see (and are compiled against) the *original* single signature with default parameters baked into the call site as constant-folded arguments — adding an overload via `@JvmOverloads` does not create a second Kotlin-visible entry point, and a Kotlin caller previously compiled against `fib()` still breaks with the same `NoSuchMethodError` as the unmarked case in §3 if the underlying function's own descriptor changed. `@JvmOverloads` cannot be combined with `@IntroducedAt`; when both appear, `@IntroducedAt` wins, with a compiler warning.

**`@IntroducedAt`** under `@OptIn(ExperimentalVersionOverloading::class)` is the only mechanism that generates true version-gated overloads visible to **both** Java and Kotlin callers, by keeping each historical signature as a real callable entry point:

```kotlin
@OptIn(ExperimentalVersionOverloading::class)
fun Button(
    label: String = "",
    color: Color = DefaultColor,
    @IntroducedAt("1.1") borderColor: Color = DefaultBorderColor,
    @IntroducedAt("1.2") borderStyle: Style = DefaultBorderStyle,
    @IntroducedAt("1.2") borderWidth: Int = 1,
    onClick: () -> Unit,
) { /* ... */ }
```

generates the v1.0, v1.1 and v1.2 signatures as distinct callable overloads. **This is still Experimental** — there is no stable, non-experimental mechanism that preserves Kotlin-caller binary compatibility when adding a default parameter; the honest rule is to state the gap (manual overloads written by hand, forever, is the only stable-today alternative) rather than name a solved mechanism.

**`@JvmStatic`** exposes companion/object members as real `static` methods callable without a `.Companion`/`.INSTANCE` receiver; unannotated companion members remain instance methods on the synthetic `Companion` object, which is itself a binary-compatibility-relevant shape (adding `@JvmStatic` to an existing member changes its call shape for Java callers, even though nothing changes for Kotlin callers).

**`@Throws`** declares checked exceptions in the generated bytecode's `throws` clause so Java callers can `catch` them; removing a `@Throws(SomeException::class)` from a public function is a binary-compatible-but-source-breaking change for Java callers whose `catch` block now triggers an unreachable-code error on recompilation.

### 5. @PublishedApi

`@PublishedApi internal fun`/`val` declarations are called from inside `public inline` functions and get **inlined directly into every call site's compiled bytecode**:

```kotlin
@PublishedApi internal fun internalHelper() = /* ... */

public inline fun publicInlined() {
    internalHelper() // body is copied into caller bytecode
}
```

Because the body (and therefore the exact signature/behavior) of `internalHelper()` is baked into every compiled caller, changing it after publication is exactly as binary-compatibility-sensitive as changing a `public` declaration — a "harmless internal refactor" of a `@PublishedApi` member breaks every already-compiled consumer of the inline function that called it. **Rule: review every `@PublishedApi` declaration under the same binary-compatibility checklist as `public` ones**, and the `.api` dump tooling in §9 must include `@PublishedApi` members (BCV's own definition of "effectively public" explicitly includes `internal` members annotated `@PublishedApi` — see the BCV README class/member definitions quoted in §9).

### 6. Opt-in requirements: correct and incorrect uses

From [opt-in-requirements.html](https://kotlinlang.org/docs/opt-in-requirements.html).

Declaring a marker:

```kotlin
@RequiresOptIn
@Retention(AnnotationRetention.BINARY)
@Target(AnnotationTarget.CLASS, AnnotationTarget.FUNCTION)
annotation class MyDateTime
```

**Opt-in does not propagate automatically.** If a public signature uses an experimental type, the signature itself must carry the marker or it silently un-marks the experimental status for its own callers:

```kotlin
// Correct — propagates
@MyDateTime
fun getDate(dateProvider: DateProvider = DateProvider()): Date

// Wrong — DateProvider is experimental, getDate() is not marked,
// so callers of getDate() depend on experimental API without opting in
fun getDate(dateProvider: DateProvider = DateProvider()): Date
```

`@OptIn(MyDateTime::class)` on a declaration consumes the requirement for *that* declaration only and does not re-propagate it to that declaration's own callers — contrast with leaving the `@MyDateTime` marker itself on the declaration, which does propagate.

**`@SubclassOptInRequired`** is the separate case for "stable to call, unstable to extend":

```kotlin
@RequiresOptIn(message = "Interfaces in this library are experimental")
annotation class UnstableApi
@SubclassOptInRequired(UnstableApi::class)
interface CoreLibraryApi
```

It does **not** inherit into nested/inner classes — a nested class of a `@SubclassOptInRequired`-marked open class does not itself require opt-in.

**`@RequiresOptIn` is the wrong tool to deprecate an already-shipped, stable declaration** (M-T-10). The sanctioned move when a pre-stable API *graduates* to stable, or when a stable API is instead being retired, is different in each direction:
- Graduating an experimental API to stable: remove the `@RequiresOptIn`-marked annotation usage from the declaration, keep the annotation class itself for compatibility, and mark the marker annotation `@Deprecated` so client code migrates off it:

```kotlin
@Deprecated("This opt-in requirement is not used anymore. Remove its usages from your code.")
@RequiresOptIn
annotation class ExperimentalDateTime
```

- Retiring an already-shipped stable declaration: use `@Deprecated(message, replaceWith, level)` (§7), never re-wrap it in a fresh `@RequiresOptIn` marker to scare callers off — `@RequiresOptIn` communicates "this is not yet stable," which is a false statement about a declaration that already shipped as stable and is now merely being phased out.

### 7. The sanctioned deprecation cycle

From [api-guidelines-backward-compatibility.html](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html): removing a declaration outright immediately breaks source compatibility. The sanctioned four-step cycle:

```kotlin
@Deprecated(
    message = "Use newFunction() instead",
    replaceWith = ReplaceWith("newFunction()"),
    level = DeprecationLevel.WARNING,
)
fun oldFunction() = /* ... */
```

1. `DeprecationLevel.WARNING` — compiles with a warning; `replaceWith` lets an IDE auto-migrate callers.
2. `DeprecationLevel.ERROR` — a subsequent release; still binary-present, but a caller cannot compile new source against it.
3. `DeprecationLevel.HIDDEN` — the declaration is invisible to new source but the compiled member still exists in the jar, so already-compiled callers keep working.
4. **Only then**, in a following major version, actually remove the declaration.

Each step is normally its own minor/major release, giving already-compiled consumers a full binary-compatible window before HIDDEN and a full recompile window before removal.

### 8. Boolean arguments and data classes in public API

From [api-guidelines-readability.html](https://kotlinlang.org/docs/api-guidelines-readability.html): **do not use `Boolean` parameters** because the call-site intent is unclear —

```kotlin
// Bad — reads as noise at the call site
fun doWork(optimizeForSpeed: Boolean)
doWork(true) // true meaning what, exactly?
```

Two sanctioned replacements: split into differently named functions (`map` / `mapNotNull` rather than `map(includeNullResults: Boolean = true, ...)`), or an `enum class` when there are more than two meaningfully-named states:

```kotlin
enum class Mode { Fast, Optimized, Standard }
fun doWork(mode: Mode)
```

**Data classes**: never expose one in a public API (§3) — the constructor/`copy()`/`componentN()` triple all move in lockstep with every property addition, and none of that surface is optional to change once one property is added. Where a value type is genuinely needed publicly, prefer a `value class` wrapper for single-field identity types (readability guideline: `value class UserId(val value: Long)` over a bare `Long` return, both for API clarity and to avoid ordering mistakes) and a hand-written `class` with explicit `equals`/`hashCode`/`toString` (never `data`) for anything with more than one field that must remain publicly constructible.

**Answering the SDK question directly**: the OCX SDK's public API may take a `Boolean` **only** where no meaningfully-named alternative exists and the parameter reads unambiguously at every call site (e.g. a fluent builder's own already-named setter, `.followRedirects(true)`); it must not appear as a positional/default argument in a constructor or top-level function signature. The SDK's public API must not expose a `data class`; where it needs a public value-holding type it exposes a plain `class` (explicit `equals`/`hashCode`, no `copy()`) or, for a single-field wrapper, a `value class`.

### 9. The ABI-gate decision: standalone BCV vs abiValidation{}

**Decision: for a greenfield library starting today, adopt the standalone `binary-compatibility-validator` plugin, not the in-KGP `abiValidation{}` block.**

Facts on the table:

| | Standalone `binary-compatibility-validator` | KGP `abiValidation{}` |
|---|---|---|
| Plugin id / access | `id("org.jetbrains.kotlinx.binary-compatibility-validator") version "0.18.2"` | Built into the `kotlin { }` Gradle DSL block, no separate plugin id |
| Opt-in required | None | `@OptIn(org.jetbrains.kotlin.gradle.dsl.abi.ExperimentalAbiValidation::class)` on every use site |
| Task names | `apiDump` (write golden files), `apiCheck` (compare, auto-wired into `check`) | `updateKotlinAbi`, `checkKotlinAbi` (auto-wired into `check`) |
| Dump location | `api/*.api` (configurable via `apiDumpDirectory`) | Same `.api` dump lineage, KGP-managed |
| Status as of 2026-09-12 | Maintenance mode: "fixes for critical bugs and support for current versions of Kotlin continue to be delivered," no new features | Experimental since Kotlin 2.2.0 (2025-06-23); fixes continued in 2.3.0 |
| Requirements | Gradle ≥ 6.1.1, Kotlin ≥ 1.6.20 | Kotlin ≥ 2.2.0 (2.1.20 for the multiplatform extension) |
| Corpus adoption | **5/32**: apollo-kotlin (28 `.api` files), sqldelight (9), dagger (6), Exposed (21), okhttp (13) | **0/32** |

**Why the standalone plugin, not the experimental one, for new work today:**

1. The standalone plugin explicitly says it is in maintenance mode and *points at* `abiValidation{}` as the future — but "future" is not "usable without an opt-in annotation today." `@OptIn(ExperimentalAbiValidation::class)` on a build script is a live signal to every contributor and every dependency-update bot that the build can break on any Kotlin point release; a library gating its own release process on an Experimental Gradle DSL feature accepts that risk for zero present benefit.
2. Every corpus repo that has an ABI gate at all runs the standalone one; there is no live counter-example to learn a working `abiValidation{}` setup from, and the corpus's own strictest Kotlin libraries (okhttp, Exposed) are on the standalone plugin.
3. "Maintenance mode" for this tool means bug fixes and Kotlin-version compatibility, not abandonment — it is safe to adopt today and does not need re-adoption before the KGP feature stabilizes.

**Migration cost if the direction of travel completes** (KGP's `abiValidation{}` reaches Stable and the standalone plugin is formally retired): mechanical, not a rewrite. Drop the `org.jetbrains.kotlinx.binary-compatibility-validator` plugin application; add `abiValidation { }` (or bare `abiValidation()`) to the `kotlin { }` block, dropping the `@OptIn` once the feature stabilizes; rename any CI script step or Gradle task alias that hard-codes `apiDump`/`apiCheck` to `updateKotlinAbi`/`checkKotlinAbi`; the `.api` dump files themselves share the same format lineage and do not need regeneration from scratch, though a first "golden" `updateKotlinAbi` run should be manually diffed against the last `apiCheck`-passing dump to confirm no drift crept in during migration.

**What a rule authored today should tell an adopter already running the standalone plugin: stay on it.** Do not migrate pre-emptively to an Experimental feature to chase a maintenance-mode label — the standalone plugin will keep receiving Kotlin-compatibility fixes, and migrating now means re-adopting twice (once to the pre-stable `abiValidation{}` shape, again when its DSL settles before GA, since an `@OptIn`-gated API carries no compatibility guarantee). Revisit only when `ExperimentalAbiValidation` is removed from the annotation's own name (i.e., the feature reaches Stable) or JetBrains publishes an end-of-life date for the standalone plugin, whichever comes first.

**Class/member definition backing the `.api` dump format** (BCV's own README, [github.com/Kotlin/binary-compatibility-validator](https://github.com/Kotlin/binary-compatibility-validator/blob/master/README.md)): a class or member is "effectively public" if it has `ACC_PUBLIC`/`ACC_PROTECTED` JVM access **and** a Kotlin visibility of no-declaration/public/protected/`internal`-with-`@PublishedApi` — i.e. the dump format already encodes the §5 rule that `@PublishedApi` members are binary-compat-sensitive. Binary-incompatible class-level changes the tool flags: renaming the class, changing its superclass or implemented-interface set, or lessening `ACC_PUBLIC`/`ACC_FINAL`/`ACC_ABSTRACT`/`ACC_INTERFACE`/`ACC_ANNOTATION`. Member-level: renaming, changing the erased descriptor (return/parameter types, or field↔method), or lessening visibility/finality/abstractness/staticness.

## Normative guidance candidates

1. **Enable `explicitApi()` (strict) on every published Kotlin module.** Rationale: subsumes both "always specify visibility" and "always specify return/property types" from Kotlin's own library guidelines as compiler errors rather than review-time catches. Verify: `grep -rn 'explicitApi\s*(\|ExplicitApiMode\.Strict\|-Xexplicit-api=strict' **/*.gradle.kts **/*.gradle` per published module — absence on a module with `maven-publish`/`publishing{}` applied is a finding.
2. **Never expose a `data class` in a published public API.** Rationale: adding any property changes the constructor and `copy()` descriptors simultaneously — a "harmless" field addition is a hard binary break. Verify: `grep -rn '^\(public \)\?data class' src/**/*.kt` scoped to non-`internal`/non-`private` files, or a BCV `.api` dump diff that shows a `copy(` descriptor change on an unreleased-as-breaking version bump.
3. **Never take a bare `Boolean` parameter in a public constructor or top-level function.** Rationale: named intent is lost at every call site; kotlinlang states this as a library-readability rule, not a style preference. Verify: detekt's `BooleanPropertyNaming`/a custom detekt rule scanning public function parameter types for `Boolean`, or manual review keyed on any public signature with a `Boolean` parameter that is not a fluent single-setter.
4. **Every `@PublishedApi internal` declaration is reviewed under the same binary-compatibility checklist as a `public` one.** Rationale: its body is inlined into every caller of the `public inline` function that references it. Verify: `grep -rn '@PublishedApi' src/**/*.kt`, then confirm each hit's diff history is checked against the BCV `.api` dump the same way a `public` change would be (BCV's own "effectively public" definition already includes `@PublishedApi internal`, so `apiCheck` catches most of this automatically).
5. **Adopt the standalone `org.jetbrains.kotlinx.binary-compatibility-validator` plugin (not `abiValidation{}`) for a greenfield library, with `apiCheck` wired into `check` and `.api` files committed.** Rationale: no `@OptIn`-gated Experimental risk, matches the corpus's only 5 working exemplars, receives ongoing Kotlin-compat fixes despite "maintenance mode." Verify: `grep -rn 'org.jetbrains.kotlinx.binary-compatibility-validator' **/*.gradle.kts`, then confirm `api/*.api` files exist and are non-empty and `apiCheck` appears in the `check` task's dependency graph (`./gradlew :module:check --dry-run` output, or the plugin's own auto-wiring, which requires no explicit `dependsOn`).
6. **Never rely on `@JvmOverloads` alone to preserve binary compatibility when adding a default-valued parameter to an already-published function.** Rationale: it only generates Java-visible overloads; Kotlin callers compiled against the old jar still hit `NoSuchMethodError`. Verify: any `.api` dump diff that shows a changed (not merely widened-by-overload) descriptor for an existing public function signature is a break regardless of `@JvmOverloads` presence — `apiCheck` catches this because BCV dumps the underlying descriptor, not the annotation.
7. **Propagate `@RequiresOptIn` markers through every public signature that uses the marked type; never use `@OptIn` to silently absorb the requirement in a public wrapper.** Rationale: opt-in is not transitive by default — an un-propagated marker means callers unknowingly depend on unstable API. Verify: for every public declaration whose signature references an `@RequiresOptIn`-annotated type, confirm the declaration itself either carries that same marker or is intentionally the deliberate "safe wrapper" case with a comment explaining the `@OptIn` absorption — a named reading heuristic, not mechanically greppable beyond finding the candidate set (`grep -rn '@OptIn(' src/**/*.kt` cross-referenced against each `@OptIn`'d annotation's `@RequiresOptIn` declaration).
8. **Never re-purpose `@RequiresOptIn` to deprecate an already-shipped stable declaration; use `@Deprecated(message, replaceWith, level)` walking WARNING → ERROR → HIDDEN → removal instead.** Rationale: `@RequiresOptIn` communicates "not yet stable," which is false for something already shipped; the deprecation cycle is the only path that keeps binary compatibility across each intermediate release. Verify: any new `@RequiresOptIn`-annotated declaration whose git history shows it existed unmarked in a prior released version is a misuse; check the annotation's introduction commit against the CHANGELOG/tag history.
9. **KDoc every public member except non-documenting overrides**, verified by a documentation-generator report rather than the compiler. Rationale: the third of Kotlin's three library rules, distinct from the first two because it has no compiler-level enforcement. Verify: `./gradlew dokkaHtml` (or `dokkaGeneratePublicationHtml` on Dokka 2.x) with a CI step that fails the build on any `Undocumented`-class warning in Dokka's own output log, or `-Xlint` equivalent is not applicable here — this is a Dokka-only gate.
10. **Do not add an `AnnotationTarget` to an existing `@Target` set on a public annotation class without checking for Java-reflection callers.** Rationale: Kotlin's target-resolution order can silently move the annotation from a field to the generated property, which has no Kotlin-visible symptom but breaks `Field.getAnnotation()` callers at runtime. Verify: a named reading heuristic — any diff touching `@Target(...)` on a class whose KDoc or usages mention Java-reflection consumption needs manual review; no mechanical check exists for this one (BCV's `.api` dump format does not track annotation target sets).

## Exemplar evidence

| Candidate | Satisfies | Violates / contested |
|---|---|---|
| explicitApi() MUST (#1) | `Kotlin__kotlinx.coroutines@f63a04bacb:buildSrc/src/main/kotlin/configure-compilation-conventions.gradle.kts:19` (`-Xexplicit-api=strict`); dagger (7 modules), shadow, okhttp's `mockwebserver` module ([gates](../jvm-audit/exemplar-quality-gates.md)) | `ktorio__ktor@f92fad0435:build-logic/src/main/kotlin/ktorbuild.project.internal.gradle.kts:11` sets `explicitApi = null` per module — opt-in, not repo default; 27/32 Kotlin-shaped repos measured with no explicit API mode at all |
| Never expose `data class` publicly (#2) | No corpus repo was found violating this in the checked-out slice (data classes are pervasive but the audits did not specifically confirm public-API placement per repo — flagged as unmeasured, not confirmed-clean) | Unmeasured — the audits did not run a `public data class` grep; a wave-2/3 gap, not a contradiction |
| No bare Boolean public param (#3) | Not directly measured by any audit | Not directly measured by any audit — reading-heuristic only |
| `@PublishedApi` reviewed as public (#4) | Implicit in every BCV-adopting repo, since BCV's own "effectively public" definition already includes it | Unmeasured directly |
| Standalone BCV over abiValidation (#5) | `apollographql__apollo-kotlin@c145295b72` (28 `.api` files), `cashapp__sqldelight@4580923af3` (9), `google__dagger@4fbc045d2b` (6), `JetBrains__Exposed@4be9aee04c` (21), `square__okhttp@dfcfab3824` (13) — all standalone `apiDump`/`apiCheck` ([gates §5](../jvm-audit/exemplar-quality-gates.md)) | **0/32** run `abiValidation{}` — no counter-exemplar exists in the corpus |
| `@JvmOverloads` is not a full binary-compat fix (#6) | Not corpus-measured (a documentation claim, not a build-file-visible fact) | — |
| Opt-in propagation (#7) | Not corpus-measured | — |
| `@RequiresOptIn` misuse (#8) | Not corpus-measured | — |
| KDoc coverage (#9) | Not corpus-measured — no Dokka-report-parsing audit exists | `pinterest__ktlint@4c933394a3` and `detekt__detekt@45672efb8b` both carry `.api` dump files (17 and 8 respectively) with **no locatable BCV plugin application** in the checked-out sparse-checkout slice — the wiring lives in a `build-logic` file the sparse checkout did not materialize (flagged, not claimed, per [gates §1 note](../jvm-audit/exemplar-quality-gates.md)); this brief resolves it no further than the audit already did — treat both repos as BCV-adopting-by-artifact-evidence, plugin-application-unconfirmed |
| `@Target` addition / reflection redirect (#10) | Not corpus-measured | — |

## AI-agent angle

- **Reaching for `@JvmOverloads` and believing it "fixes" binary compatibility for a default-parameter addition.** It only helps Java callers; a model trained on Java-interop tutorials will confidently apply it and miss that Kotlin callers still break. Check: any `.api` dump diff after such a change still shows a changed descriptor on the base function — `apiCheck` catches it even when the LLM's reasoning didn't.
- **Writing `data class` for anything that returns structured data from a public function**, because `data class` is the idiomatic Kotlin default an LLM was trained on for "just group some fields." Check: `grep -rn '^\(public \)\?data class'` on any file under a published module's `src/main` (not `src/test`) — a hit is a finding regardless of how small the class looks today.
- **Assuming K1's pre-2.0 `-language-version 1.9` fallback advice still applies** — Kotlin 2.4.0 rejects it outright (per the map's frame corrections), and any training-data-era snippet suggesting a K1 fallback for compatibility is dead advice as of 2026. Check: `grep -rn 'language-version.*1\.9\|languageVersion.*1\.9'`.
- **Citing `-Xjvm-default=all` as the modern default** without knowing Kotlin 2.2.0 flipped the *stable* flag's default to `ENABLE` and deprecated `-Xjvm-default` — an LLM trained pre-2025 will suggest the old experimental flag name. Check: `grep -rn '\-Xjvm-default'` — any hit on a Kotlin ≥ 2.2 build is stale.
- **Suggesting `abiValidation{}` as "the modern way" because it is newer**, without surfacing the `@OptIn(ExperimentalAbiValidation::class)` requirement or that it ships 0/32 in the measured corpus. Check: any generated build script with `abiValidation` and no accompanying `@OptIn` import is both wrong (won't compile) and, even fixed, an unreviewed Experimental-API adoption — flag for human confirmation.
- **Using `@RequiresOptIn` to mark a declaration the model itself decided is "risky to change," as a substitute for `@Deprecated`.** This inverts the semantics (says "not yet stable" about something already shipped) and, per §6, is explicitly named as the wrong tool in kotlinlang's own guidance. Check: any newly-added `@RequiresOptIn`-annotated declaration that already exists, unmarked, in a previously tagged release is a misuse, not a new experimental feature.
- **Generating `explicitApiWarning()` when asked for "strict" explicit API mode** — the two Gradle DSL calls are easy to conflate and only `explicitApi()` / `ExplicitApiMode.Strict` fails the build. Check: `grep -rn 'explicitApiWarning\(\)\|ExplicitApiMode\.Warning'` on a module that is supposed to be gated — either hit means the gate is not actually enforcing anything.

## Contested / evolving

- **Standalone BCV vs `abiValidation{}`**: genuinely mid-migration as of 2026-09-12. The standalone plugin's own README explicitly redirects to the KGP feature, and JetBrains is actively developing it (fixes tracked into Kotlin 2.3.0, per [KT-71172](https://youtrack.jetbrains.com/issue/KT-71172/Stabilize-ABI-Validation-in-Kotlin-Gradle-Plugin)), but it remains `@OptIn`-gated Experimental with zero corpus adoption. Trending toward `abiValidation{}` eventually superseding the standalone plugin; not there yet. Revisit when `ExperimentalAbiValidation` is removed or the standalone plugin's README changes its recommendation.
- **`explicitApi()` recommended-vs-enabled gap**: kotlinlang's guidance is unconditional ("we recommend"); measured adoption is 5/32 against 15 Kotlin-library-shaped repos in the corpus. This is not a documentation disagreement — it is a real adoption lag the map explicitly separates from the normative recommendation (map conflict 17). Trending: SHOULD for an existing library with a migration cost; MUST for anything greenfield, since there is no migration cost to weigh.
- **`@IntroducedAt`/`ExperimentalVersionOverloading` remaining Experimental**: there is currently no stable, non-experimental mechanism that fully preserves Kotlin-caller binary compatibility when adding a default parameter to a published function. A rule authored today must state this gap rather than imply `@JvmOverloads` or any other named annotation solves it completely.
- **KDoc-for-every-public-member has no compiler-level gate**, unlike the visibility/type rules that `explicitApi()` subsumes — this asymmetry (two of three library rules are compile errors, one is a doc-tool warning) is a real, currently-unresolved gap in Kotlin's own tooling story, not something this brief can resolve by picking a stricter tool that doesn't exist.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [kotlinlang.org/docs/api-guidelines-backward-compatibility.html](https://kotlinlang.org/docs/api-guidelines-backward-compatibility.html) | Official Kotlin docs, library API guidelines | Current as of 2026-09-12 fetch | Primary source for every bytecode-consequence claim in §3, §5, §7; the densest page in the corpus per the brief |
| [kotlinlang.org/docs/api-guidelines-simplicity.html](https://kotlinlang.org/docs/api-guidelines-simplicity.html) | Official Kotlin docs, library API guidelines | Current as of 2026-09-12 fetch | Core-operation and type-reuse guidance underlying the "keep the surface small" framing |
| [kotlinlang.org/docs/api-guidelines-readability.html](https://kotlinlang.org/docs/api-guidelines-readability.html) | Official Kotlin docs, library API guidelines | Current as of 2026-09-12 fetch | Primary source for the Boolean-argument rule and numeric-type/value-class guidance in §8 |
| [kotlinlang.org/docs/api-guidelines-predictability.html](https://kotlinlang.org/docs/api-guidelines-predictability.html) | Official Kotlin docs, library API guidelines | Current as of 2026-09-12 fetch | Sealed-type exhaustiveness, defensive-copy, and `require`/`check` guidance — background for the SDK's public surface beyond this brief's core scope |
| [kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries](https://kotlinlang.org/docs/coding-conventions.html#coding-conventions-for-libraries) | Official Kotlin docs, coding conventions | Current as of 2026-09-12 fetch | Verbatim source of the three-rule library checklist in §2 |
| [kotlinlang.org/docs/opt-in-requirements.html](https://kotlinlang.org/docs/opt-in-requirements.html) | Official Kotlin docs | Current as of 2026-09-12 fetch | Primary source for `@RequiresOptIn`, propagation semantics, `@SubclassOptInRequired`, and the explicit "do not use to deprecate" guidance in §6 |
| [kotlinlang.org/docs/java-to-kotlin-interop.html](https://kotlinlang.org/docs/java-to-kotlin-interop.html) | Official Kotlin docs | Current as of 2026-09-12 fetch | Primary source for `@JvmOverloads`, `@JvmStatic`, `@JvmName`, `@JvmField`, `@Throws` generation rules in §4 |
| [kotlinlang.org/docs/gradle-binary-compatibility-validation.html](https://kotlinlang.org/docs/gradle-binary-compatibility-validation.html) | Official Kotlin docs, KGP feature reference | Kotlin ≥ 2.2.0 (2025-06-23) feature, doc current as of 2026-09-12 fetch | Primary source for `abiValidation{}` DSL, `ExperimentalAbiValidation`, `updateKotlinAbi`/`checkKotlinAbi` task names |
| [github.com/Kotlin/binary-compatibility-validator README](https://github.com/Kotlin/binary-compatibility-validator/blob/master/README.md) | The standalone plugin's own repository README | Fetched 2026-09-12; plugin version referenced `0.18.2` | Primary source for the maintenance-mode notice, `apiDump`/`apiCheck` task semantics, the "effectively public" class/member definition, and the binary-incompatible-change taxonomy in §9 |
| [kotlinlang.org/docs/whatsnew14.html](https://kotlinlang.org/docs/whatsnew14.html) | Official Kotlin docs, 1.4.0 release notes (still the canonical explicit-API-mode reference) | Feature shipped 1.4.0; doc current as of 2026-09-12 fetch | Primary source for the exact Gradle DSL / compiler-flag spellings and violation behavior of explicit API mode in §1 |
| [YouTrack KT-71172](https://youtrack.jetbrains.com/issue/KT-71172/Stabilize-ABI-Validation-in-Kotlin-Gradle-Plugin) | JetBrains issue tracker, official | Open as of 2026-09-12 | Confirms `abiValidation{}` is still pre-stabilization and under active development, supporting the "not yet" recommendation in §9 |
| `jvm-audit/exemplar-quality-gates.md` §1, §5 | This program's own corpus audit (32-repo measurement) | Measured 2026-09-05 | Source of every corpus-adoption count (`explicitApi()` 5/32, standalone BCV 5/32, `abiValidation{}` 0/32) and the ktlint/detekt "flagged, not claimed" `.api`-file-without-plugin note |
| `jvm-audit/exemplar-build-shape.md` | This program's own corpus audit | Measured 2026-09-05 | Corroborates the explicit-API-mode 5/25-of-Kotlin-repos count from a second measurement pass |
| `jvm-topic-map.md` conflict 17 | This program's own wave-1 map, adjudicated | 2026-09-05 | The MUST-for-greenfield / SHOULD-for-adopter resolution this brief inherits and applies |

## Frame corrections carried forward

None of this brief's findings contradict the frame or the topic map; the ABI-gate decision, the explicit-API-mode severity split, and the Boolean/data-class rules are all consistent with map conflicts 2 and 17 and are stated here at the depth those conflicts deferred to this dive.
