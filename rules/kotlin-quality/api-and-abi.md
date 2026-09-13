---
title: Published API and ABI
summary: "The KT-API family: explicit API mode, the single ABI gate and its committed dump, descriptor-breaking edits, @PublishedApi, opt-in propagation and the deprecation cycle"
---

# Published API and ABI

Owns what a Kotlin module promises to callers it cannot recompile: the visibility
and type declarations the compiler is made to demand, the committed ABI dump that
makes a descriptor change visible in a diff, and the edits that reach a consumer
as `NoSuchMethodError`. It does not own Kotlin/Java interop idiom (`@JvmStatic`,
`@JvmName`, `@Throws` placement, `suspend` across the Java boundary, value-class
mangling), which is `KT-INTEROP` in `java-interop.md`. The compiler version,
`jvmTarget` and the bytecode floor are `KT-COMP` in `compiler-and-toolchain.md`.
Coroutine contracts are `KT-CORO` in `coroutines.md`. Exception and resource
behaviour is `KT-ERR` in `errors-and-resources.md`. The detekt and ktlint wiring
is `KT-LINT` in `lint-gate.md`. A Gradle plugin's own extension API is
`GRADLE-PLUG` in the `gradle-build` set.

Contents: [Scope](#scope) · [The Compile Gate](#the-compile-gate) ·
[The ABI Gate](#the-abi-gate) ·
[Caught Only by Reading the Diff](#caught-only-by-reading-the-diff) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Scope

- **A green `./gradlew build` is not evidence for anything below.** Three of these
  rules can fail a build: KT-API-01 through the compiler, KT-API-03 and KT-API-04
  through the ABI task. Each has to be turned on first. The rest are greps and
  diff reading, because the Kotlin toolchain ships no check for them at all.
- **Both gates are opt-in and mostly off.** Across 32 surveyed OSS JVM
  repositories, measured 2026-09-12, 6 run explicit API mode in any spelling and
  7 run an ABI gate (5 standalone BCV, 2 the in-KGP `abiValidation()`). A module
  that publishes and runs neither has no machine-readable statement of its public
  surface, so every break is found by a consumer.
- **Nullness on a published surface is `JAVA-API-09` and `JAVA-API-10`**, owned by
  `java-quality`'s `api-and-evolution.md` and not restated here. Cited because the
  Kotlin caller is what breaks first: Kotlin 2.1.0+ reports JSpecify violations in
  a Java dependency as compile **errors** by default (verified 2026-09-12), so a
  Java module that mixes `javax.annotation`, `org.checkerframework` and
  `org.jspecify` flavours fails its Kotlin consumers, not itself.
- **Two rows were considered and dropped**, each surviving as one clause here. A
  bare `Boolean` parameter in a public constructor or top-level function reads as
  nothing at the call site (`doWork(true)`) and an `enum class` or two
  differently-named functions is better, but the carve-out for a fluent
  single-setter (`.followRedirects(true)`) makes it unmechanisable. Adding an
  `AnnotationTarget` to a published `@Target` set can silently move the annotation
  off the backing field, because Kotlin prefers `PROPERTY` over `FIELD`, so
  `Field.getAnnotation()` starts returning `null` with no `.api` diff.
  KT-API-10 is retired to the first clause, KT-API-11 is retired to the second, and neither number is reused.

## The Compile Gate

Explicit API mode is a **compiler error**, not a lint task, so the gate is
`./gradlew :module:compileKotlin`. KT-API-02's gate is separate:
`./gradlew dokkaGeneratePublicationHtml` with `failOnWarning = true`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-API-01 | Enable explicit API **strict** mode on every published module. `explicitApiWarning()`, `ExplicitApiMode.Warning` and `-Xexplicit-api=warning` do not count, because they produce warnings rather than a failed build. Kotlin 1.4+, verified 2026-09-12. | Strict mode turns two of kotlinlang's three library rules (always specify visibility, always specify return and property types) into compile errors instead of review-time catches. A warning-mode build ships an unannotated `public` surface and reports it in scrollback nobody reads. | `grep -rn --include='*.gradle.kts' --include='*.gradle' -e 'explicitApi()' -e 'ExplicitApiMode.Strict' -e '-Xexplicit-api=strict' .` **and** `grep -rn --include='*.kt' -e 'explicitApi()' -e 'ExplicitApiMode.Strict' .`. The second command is not optional, because a convention plugin puts the call in a `.kt` class, which is how two separate corpus greps each missed a live adopter. Empty output from both, on a module that applies `maven-publish`, is the finding. Then `grep -rn -e 'explicitApiWarning' -e 'ExplicitApiMode.Warning' .`, where any hit on a published module is the finding. | MUST (greenfield published module) / SHOULD (existing published surface) |
| KT-API-02 | KDoc every public member except an override that adds nothing, and gate it: `dokka { dokkaPublications.configureEach { failOnWarning = true } }`. Dokka 2.x, K2-stable from 2.2.0, verified 2026-09-12. | The third of kotlinlang's three library rules and the only one the compiler never enforces, at any strictness. Without `failOnWarning` the missing-KDoc warning is a log line in a task that already succeeded. | `grep -rn --include='*.gradle.kts' --include='*.kt' -e 'failOnWarning' .`. Empty output on a module that publishes documentation is the finding. Then run the publication task: it must exit non-zero on a public member with no KDoc. | SHOULD |

```kotlin
// build-logic convention plugin: the strict spelling, applied to every module
kotlin {
    explicitApi()                       // NOT explicitApiWarning(): warnings do not fail a build
}
```

## The ABI Gate

One task, run from `check`: `./gradlew :module:apiCheck` (standalone BCV) or
`./gradlew :module:checkKotlinAbi` (in-KGP `abiValidation()`). Every rule below is
verified against the committed `.api` dump that task diffs. KT-API-06 and
KT-API-07 need a read on top, and the cell says which.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-API-03 | **pinned.** Run exactly **one** ABI gate, with its `.api` dump committed and its check task wired into `check`. The default is standalone `org.jetbrains.kotlinx.binary-compatibility-validator` (`apiDump`/`apiCheck`). The in-KGP `abiValidation()` (`updateKotlinAbi`/`checkKotlinAbi`) is equally correct where the build already carries `@OptIn(ExperimentalAbiValidation::class)`. Standalone BCV 0.18.x needs Gradle 6.1.1+ and Kotlin 1.6.20+. `abiValidation()` needs Kotlin 2.2.0+ and is still Experimental. Verified 2026-09-12. | Running **neither** is the real failure: the dump file is the only artefact that makes a descriptor change visible in a code review. Standalone is in maintenance mode but needs no Experimental opt-in. `abiValidation()` is where JetBrains is steering, and ktlint and detekt both run it in production. Running both means two dumps that can disagree. This is a **default an adopter overrides once**, in their own convention plugin, never per module. | `grep -rn --include='*.gradle.kts' --include='*.kt' -e 'binary-compatibility-validator' -e 'abiValidation' .` must name exactly one family. Zero hits is the finding, and hits from both families is the finding. Then `find . -name '*.api'`, where empty output is the finding. Then `./gradlew :module:check --dry-run`, which must list `apiCheck` or `checkKotlinAbi`. A `check` listing neither means the dump is committed but never compared. | MUST (published module) |
| KT-API-04 | Never add a parameter to a published function, since **a default value does not help**, and never widen *or* narrow a published return type. Add an overload, or a new function with a new name. | All three change the JVM descriptor, and a compiled call site is bound to the exact old one, so it gets `NoSuchMethodError`. Narrowing the return type is the counter-intuitive half: it preserves source compatibility, which is precisely why it survives review. | `apiCheck` / `checkKotlinAbi` against the last released dump. Any **changed** line on an existing entry is a break, as opposed to an added line, which is not. `git diff -- '*.api'` on the change under review shows the same thing without a build. No diff on existing entries is the pass. | MUST |
| KT-API-05 | Never expose a `data class` in a published public API. Where a public value type is needed, use a plain `class` with explicit `equals`/`hashCode`, or a `value class` for a single-field wrapper. | Adding one property changes the primary constructor **and** `copy()` at once, and reordering additionally changes every `componentN()`. None of that generated surface is optional to keep stable, and none of it is visible in the source diff that adds the property. | `grep -rnE --include='*.kt' '^[[:space:]]*(public )?data class' .` scoped to published modules. Any hit is a finding regardless of how small the class looks, and empty output is the pass. A hit in a module that is not published is not a finding. | MUST |
| KT-API-06 | Review every `@PublishedApi internal` declaration under the same binary-compatibility checklist as a `public` one, its body included. | Its body is inlined into every compiled caller of the `public inline` function that references it, so a "harmless internal refactor" breaks consumers that were never recompiled. BCV's own "effectively public" definition already includes it, so the signature half is gated and the body half is not. | `grep -rn --include='*.kt' -e '@PublishedApi' .`. Empty output means the module has none, which is the pass. For each hit, `apiCheck` covers the signature, and the body change is a reading heuristic on the diff with no mechanical substitute. | MUST |
| KT-API-07 | Do not rely on `@JvmOverloads` to preserve binary compatibility when adding a default-valued parameter, because it generates Java-visible overloads only. Hand-written overloads are the only stable fix. `@IntroducedAt` under `@OptIn(ExperimentalVersionOverloading::class)` is the only mechanism that covers Kotlin callers too, and it is Experimental as of Kotlin 2.2, verified 2026-09-12. | Kotlin callers resolve to the full-arity descriptor, which the new parameter changes, and the generated Java overloads never enter that path. A rule naming `@JvmOverloads` as the fix is wrong, and one naming `@IntroducedAt` without the Experimental caveat is premature. | `apiCheck` / `checkKotlinAbi` still reports the changed descriptor on the base function despite the annotation, because the dump records descriptors and not annotations. That report is the finding, and its absence is the pass. Then `grep -rn --include='*.kt' -e '@JvmOverloads' .` and read each hit whose function gained a parameter in this change. | SHOULD |

```kotlin
// wrong: every added property rewrites the constructor descriptor and copy()
public data class Result(val code: Int, val stdout: String)

// right: a plain class, explicit members, nothing generated behind your back
public class Result(public val code: Int, public val stdout: String) {
    override fun equals(other: Any?): Boolean = other is Result &&
        code == other.code && stdout == other.stdout
    override fun hashCode(): Int = 31 * code + stdout.hashCode()
}
```

## Caught Only by Reading the Diff

No compiler and no ABI dump reports either of these. Both are read on the change
under review, with the greps below as the entry points.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-API-08 | Propagate an `@RequiresOptIn` marker through every public signature that mentions the marked type. Do not absorb it with `@OptIn` on a public declaration. `@SubclassOptInRequired` is the separate extend-only case and does not inherit into nested classes. | Opt-in is not transitive. An absorbed marker means callers depend on unstable API having never opted in, and the first they learn of it is a source break in a minor release. | `grep -rn --include='*.kt' -e '@OptIn(' .`. Empty output is the pass. Each hit on a `public` declaration is a finding unless a comment on the same declaration states it is the deliberate stable-wrapper case. Cross-check each marker against its `@RequiresOptIn` declaration. | MUST |
| KT-API-09 | Retire a shipped declaration with `@Deprecated(message, replaceWith, level)` walking WARNING → ERROR → HIDDEN → removal, one release per step. Never re-mark a shipped declaration `@RequiresOptIn`. | `@RequiresOptIn` says "not yet stable", which is a false statement about something already shipped as stable, and kotlinlang names this exact misuse. Only the deprecation cycle keeps binary compatibility across each intermediate release, and HIDDEN keeps the descriptor for compiled callers while removing it from the source surface. | `grep -rn --include='*.kt' -e '@RequiresOptIn' .` lists every marker. Empty output means the module has none, which is a pass. For each, `git log -S'@RequiresOptIn' -- src` against the release tags: a marker added to a declaration that exists unmarked at the previous tag is the finding. A removal with no WARNING and ERROR step in the tag history is the same finding one release later. | MUST |

## What Agents Get Wrong Here

1. **`data class` for anything that returns structured data.** The idiomatic
   Kotlin default, and the single most likely unprompted edit to a published
   surface. KT-API-05's grep is the whole check.
2. **`explicitApiWarning()` generated when "strict" was asked for.** Both names
   exist, both compile, one fails the build. Same shape as
   `ExplicitApiMode.Warning`.
3. **A defaulted parameter added to a published function and called
   backwards-compatible.** It is source-compatible and binary-breaking, and the
   source diff looks purely additive.
4. **`@JvmOverloads` believed to fix that.** Java-interop tutorials dominate the
   training signal, and the annotation does nothing for Kotlin callers.
5. **A familiar linter named as the compatibility gate.** Checkstyle, detekt,
   ktlint and SpotBugs diff nothing between releases. Grep the CI workflow for
   the plugin id or the task name, never for a job called "quality".
6. **`abiValidation` emitted without the `@OptIn` import.** The build does not
   compile, and once fixed it is an unreviewed Experimental adoption that
   KT-API-03 expects to be a decision.
7. **Committing the `.api` dump regeneration as part of the change that broke
   it.** `apiDump`/`updateKotlinAbi` makes the gate green by rewriting the
   baseline, which is the one edit that turns the check into a formality.
   Regenerating a dump is its own commit with its own justification.
8. **`@RequiresOptIn` used as a soft `@Deprecated`.** It inverts the semantics
   and skips every step of the cycle that preserves the descriptor.
9. **Absorbing an opt-in marker with `@OptIn` on a public declaration**, because
   that is how the compiler's own error message reads at the call site.
10. **Narrowing a published return type as a cleanup.** Source-compatible, reads
    as a tightening, and is a descriptor change like any other.
