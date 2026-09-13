---
title: Kotlin Compiler Flags, JVM Targets and Codegen
summary: "The KT-COMP family: retired and superseded `-X` flags, the `jvmTarget` default that `jvmToolchain` does not move, the KGP and Gradle version envelope, KSP versus kapt, and Dokka's generation of DSL"
---

# Kotlin Compiler Flags, JVM Targets and Codegen

`KT-COMP` owns what a Kotlin build script tells the compiler: which `-X` flags
still exist, which bytecode target comes out, which annotation-processor plugin
runs, and which Kotlin, KGP, KSP and Dokka versions the build may pin. Almost
every row here is an edit to a `*.gradle.kts` or a `gradle.properties`, not to a
`.kt` source file. It does not own the JDK floor number itself, module
descriptors or charset at the call site, which belong to `JAVA-PLAT`
(`java-quality/platform-and-versions.md`), nor the Java side of toolchain and
compiler wiring, which belongs to `GRADLE-TOOL`
(`gradle-build/toolchains-and-compilation.md`), nor the binary-compatibility gate
that the `jvmDefault` flip below can trip, which belongs to `KT-API`
(`kotlin-quality/api-and-abi.md`), nor detekt and ktlint wiring, which belongs to
`KT-LINT` (`kotlin-quality/lint-gate.md`), nor Kover's coverage binding, which
belongs to `KT-TEST` (`kotlin-quality/testing.md`).

Contents: [Flags That No Longer Mean What They Say](#flags-that-no-longer-mean-what-they-say) ·
[The JVM-Target Block and the Version Pins](#the-jvm-target-block-and-the-version-pins) ·
[Which Annotation-Processor Plugin Is Applied](#which-annotation-processor-plugin-is-applied) ·
[Docs, Warnings and the Daemon](#docs-warnings-and-the-daemon) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Flags That No Longer Mean What They Say

Kotlin retires an `-X` flag when the feature stabilises rather than renaming it,
so a retired flag is a silent no-op. One grep locates all three rows, and every
hit is read against the Kotlin version the build pins.

```bash
grep -rn --include='*.gradle.kts' --include='gradle.properties' \
  -e '-Xwhen-guards' -e '-Xnon-local-break-continue' \
  -e '-Xmulti-dollar-interpolation' -e '-Xcontext-parameters' \
  -e '-Xcontext-receivers' -e 'Xjvm-default' -e 'jvmDefault' .
grep -rn -e 'kotlin' gradle/libs.versions.toml
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-COMP-01 | Never emit `-Xwhen-guards`, `-Xnon-local-break-continue` or `-Xmulti-dollar-interpolation` (all three Stable and flag-retired in Kotlin 2.2.0, 2025-06-23), or `-Xcontext-parameters` (Stable in 2.4.0, 2026-07-14). `-Xcontext-receivers` is a defect on any Kotlin 2.2.0 or newer build, because that design was withdrawn rather than renamed. Verified 2026-09-12. | The flags are accepted and do nothing, and none of them appears in the current [compiler reference](https://kotlinlang.org/docs/compiler-reference.html). An agent that adds one "to be safe" ships dead configuration that a later reader treats as load-bearing. | The first grep above, read against the Kotlin version the second prints. Empty output is the pass. Any of the five names on a build at or above its stabilisation version is the finding. | MUST |
| KT-COMP-02 | Never write `-Xjvm-default` as a string in `freeCompilerArgs`. Use the typed `compilerOptions.jvmDefault` property with a `JvmDefaultMode` value (`ENABLE`, `NO_COMPATIBILITY` or `DISABLE`). Verified 2026-09-12. | `-Xjvm-default` is deprecated in favour of the stable option and the Gradle DSL property, and the string form invites the old-to-new value mismatch, where `all-compatibility` became `ENABLE` and `all` became `NO_COMPATIBILITY`. Translating the flag name instead of the intent inverts the behaviour. | `grep -rn --include='*.gradle.kts' -e 'Xjvm-default' .`. Empty output is the pass. Every hit on a Kotlin 2.2.0 or newer build is the finding. | MUST |
| KT-COMP-03 | A library or SDK that publishes Kotlin interfaces states `compilerOptions.jvmDefault` explicitly, and does not rely on the compiler default. Verified 2026-09-12. | The default flipped from `DISABLE` to `ENABLE` in Kotlin 2.2.0 ([whatsnew22](https://kotlinlang.org/docs/whatsnew22.html)), so an unconfigured interface silently begins emitting real JVM `default` methods and compatibility bridges on a routine Kotlin bump. That is a behaviour change for binary consumers, and `KT-API`'s ABI gate is what reports it after the fact. | `grep -rn --include='*.gradle.kts' -e 'jvmDefault' .` in a module that publishes interfaces. Empty output **is the finding**. Confirm intent with `javap -p` on a public interface either side of a Kotlin-version bump, where a newly present `default` method means the flip was missed. | MUST (library, SDK) |

```kotlin
// wrong: the 2023-era string, and `all` does not mean what its name suggests
tasks.withType<KotlinCompile>().configureEach {
    compilerOptions.freeCompilerArgs.add("-Xjvm-default=all")
}
```

```kotlin
// right: typed, and the value states the intent
kotlin.compilerOptions.jvmDefault = JvmDefaultMode.NO_COMPATIBILITY
```

## The JVM-Target Block and the Version Pins

Two gates. The first reads the compile configuration, the second reads the
pinned versions the build resolves against.

```bash
grep -rn -A3 --include='*.gradle.kts' -e 'jvmToolchain' -e 'jvmTarget' \
  -e 'jvmTargetValidationMode' .
grep -rn --include='*.gradle.kts' --include='gradle.properties' \
  -e 'language-version' -e 'KotlinVersion.KOTLIN_1' .
grep -rn -e 'kotlin' -e 'agp' gradle/libs.versions.toml
grep -rn -e 'distributionUrl' gradle/wrapper/gradle-wrapper.properties
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-COMP-04 | Set `compilerOptions.jvmTarget` explicitly wherever `jvmToolchain(N)` is set, and in a mixed Java and Kotlin module make it equal the Java side's `options.release`. **Pinned default**, override once in your own build config and record why: that number is **17**, owned by `JAVA-PLAT-02` and verified 2026-09-12. | `jvmToolchain` back-fills `jvmTarget` only when the build has not set it, and `jvmTarget` itself still defaults to `"1.8"` ([gradle-compiler-options](https://kotlinlang.org/docs/gradle-compiler-options.html)). So `jvmToolchain(21)` alone compiles on JDK 21 and ships Java 8 bytecode, which is the default state of a Kotlin build rather than an accident. This row is the Kotlin statement of `JAVA-PLAT-01`'s decision, written where the Kotlin edit happens. | The first grep above. Every `jvmToolchain` hit must show a sibling `jvmTarget` inside the same block, and a module with a Kotlin compile task and no `jvmTarget` anywhere **is the finding**, not a pass. Then read that value against the module's `options.release`, because a Kotlin-only module never triggers the build-time validator. | MUST |
| KT-COMP-05 | Do not weaken `jvmTargetValidationMode`. Its default is `ERROR` on current KGP with Gradle 8.0 or newer (verified 2026-09-12), and any `WARNING` or `IGNORE` value carries a comment naming what it unblocks. | A `compileJava` and `compileKotlin` target disagreement fails the build outright, and a reviewer expecting an advisory warning is describing pre-Gradle-8.0 behaviour. The corpus's only hit on this property is a downgrade, which is what the property is reached for. | `grep -rn --include='*.gradle.kts' -e 'jvmTargetValidationMode' .`. Empty output **is the pass**, because the safe default applies. Every hit is read for its justification, and an uncommented downgrade is the finding. | MUST |
| KT-COMP-06 | Read the KGP and Gradle compatibility table before bumping either one, and treat a Gradle bump that crosses a KGP ceiling as a required KGP bump in the same change. | The envelope is a hard minimum and maximum, not a rule of thumb, and the **ceiling** is the load-bearing number that a "bump Gradle" change walks off. "Kotlin 2.4 needs Gradle 9 or newer" is wrong in both directions, since the floor across Kotlin 2.4.x is still Gradle 7.6.3 ([gradle-configure-project](https://kotlinlang.org/docs/gradle-configure-project.html)). | The third and fourth greps above, read against the table below. Empty output from either **is the finding**, because it means the version or the wrapper is not pinned in the file the check expects. A KGP version absent from the table is read from the linked page instead of guessed. | MUST |
| KT-COMP-07 | Never emit K1-era advice, and name which of the two facts a claim depends on: `-language-version 1.8` and `1.9` were dropped in Kotlin **2.3.0**, and the K1 compiler itself was removed in **2.4.0**. Verified 2026-09-12. | The two are routinely collapsed into one, and they license different instructions. A "fall back to K1" instruction on 2.4.0 or newer is unexecutable rather than merely stale, and a language-version pin below 2.0 fails the build on 2.3.0 or newer. | The second grep above. Empty output is the pass. Any language-version value below `2.0` on a Kotlin 2.3.0 or newer build is the finding, as is any prose or comment offering a K1 fallback. | MUST |

| KGP version | Highest Gradle it supports |
|---|---|
| 2.4.0 through 2.4.10 | 9.5.0 |
| 2.4.20 | 9.7.0 |

Minimum across Kotlin 2.4.x is Gradle 7.6.3. An Android build carries an AGP
range on the same page, and Android is otherwise outside this rule set's scope.
Verified 2026-09-12.

```kotlin
// wrong: compiles on JDK 21, emits Java 8 bytecode, and nothing warns
kotlin { jvmToolchain(21) }
```

```kotlin
// right: two numbers, and the second one is the one consumers see
kotlin {
    jvmToolchain(25)
    compilerOptions.jvmTarget = JvmTarget.JVM_17   // equals the Java side's options.release
}
```

## Which Annotation-Processor Plugin Is Applied

One gate locates every processor declaration. kapt and KSP coexist per module by
design during a migration, so presence alone settles nothing and each hit is
read.

```bash
grep -rn --include='*.gradle.kts' -e 'kotlin("kapt")' \
  -e 'org.jetbrains.kotlin.kapt' -e 'kapt(' -e 'ksp(' .
grep -rn --include='gradle.properties' -e 'ksp.useKSP2' .
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-COMP-08 | A new Kotlin module that needs an annotation processor uses KSP. `kapt` is acceptable only where the specific processor has no KSP implementation, and a comment on the `kapt(...)` dependency line names that processor and its upstream status. | KSP2 has been the default since KSP 2.0.0, and kapt stubs Kotlin down to Java before re-running processors over the stubs, which costs a whole extra compilation and loses Kotlin-only type information. In the corpus kapt survives only as a deliberate legacy-path regression fixture, never as production build logic. The one recorded upstream gap is `auto-value` and Auto Factory ([ksp-overview](https://kotlinlang.org/docs/ksp-overview.html)), verified 2026-09-12. | The first grep above. Empty output is the pass. Every kapt plugin or dependency hit without an adjacent naming comment is the finding, and the named processor is checked against KSP's supported-libraries page before the comment is accepted. | MUST |
| KT-COMP-09 | Do not split one processor's inputs across `kapt(...)` and `ksp(...)` in the same module. Migrate a processor's whole dependency in one change. | A KSP processor cannot resolve types that a co-resident kapt processor generates in the same compilation unit, which is why the official guide's worked example moves the entire dependency at once ([ksp-kapt-migration](https://kotlinlang.org/docs/ksp-kapt-migration.html)). The symptom is an unresolved reference to generated code, which reads as a caching bug. | For any module the first grep shows declaring both, list the `kapt(...)` and `ksp(...)` coordinates. The same `group:artifact` under both configurations is the finding. No module declaring both is the pass. | MUST |
| KT-COMP-10 | Do not set `ksp.useKSP2=false` on KSP 2.3.0 or newer. Cite the **KSP** version, which is readable from the applied plugin, never the Kotlin version. | KSP1 is a K1 compiler plugin and its support ends at KSP 2.3.0, which is K2-only, so the flag stops being a fallback and becomes a hard failure. Verified 2026-09-12. | The second grep above, read against the pinned KSP plugin version. Empty output is the pass. A `false` value on KSP 2.3.0 or newer is the finding, and an explicit `true` is a recorded migration carve-out rather than a defect. | MUST |

## Docs, Warnings and the Daemon

Three unrelated reads of the build configuration, grouped because none of them
has a compiler-side gate.

```bash
grep -rn --include='*.gradle.kts' -e 'tasks.dokkaHtml' -e 'DokkaTask' \
  -e 'dokkaHtmlMultiModule' -e 'extraWarnings' -e '-Wextra' .
grep -rn --include='gradle.properties' -e 'kotlin.daemon' -e 'org.gradle.jvmargs' .
grep -rn -e 'dokka' gradle/libs.versions.toml
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-COMP-11 | A published Kotlin library pins `org.jetbrains.dokka` at **2.2.0** or newer and configures it through the DGP v2 top-level `dokka {}` extension, never the v1 per-task `tasks.dokkaHtml {}` or `dokkaHtmlMultiModule` shape. Verified 2026-09-12. | DGP v2 has been the default since Dokka 2.1.0 and K2 analysis is stable from 2.2.0, which is where the corpus converges. The v1 to v2 move restructures multi-module aggregation, output directories and the visibility DSL, and drops the GFM and Jekyll formats, so it is a migration rather than a version bump ([dokka-migration](https://kotlinlang.org/docs/dokka-migration.html)). | The first grep above. Empty output is the pass. Any v1 task name on a Dokka 2.1.0 or newer build is stale configuration and is the finding. An empty third grep means Dokka is not applied at all, which is not a finding. | SHOULD |
| KT-COMP-12 | Do not add `extraWarnings` or `-Wextra` to a build as a hardening step, and never state either as a requirement. Both are opt-in. | The option has been experimental since Kotlin 2.1.0 and was still not promoted through 2.4.0 (verified 2026-09-12), with one adopter in 32 corpus repositories. A requirement here binds a build to unstable compiler surface for a warning set that can change between patch releases. | The first grep above. Presence is evidence of a deliberate opt-in and is read for a comment saying so. Absence is **never** a finding, and a review comment demanding it is the invented pattern. | CONSIDER |
| KT-COMP-13 | When tuning Kotlin daemon memory, put the value where the target daemon actually reads it. The **buildSrc** daemon reads `-Dkotlin.daemon.jvm.options` nested inside `org.gradle.jvmargs`, because it starts before the plain `kotlin.daemon.jvmargs` property is read. | Four precedence levels each override the last, and the buildSrc exception is the one that silently does nothing: a heap bump that never reaches the daemon it was written for reads as a fix and changes no behaviour ([gradle-compilation-and-caches](https://kotlinlang.org/docs/gradle-compilation-and-caches.html)). | The second grep above. On a project with a `buildSrc/` directory, a `kotlin.daemon.jvmargs` line alone **is the finding**, because it does not configure the buildSrc daemon. Empty output is a pass only where no daemon tuning was intended. | SHOULD |

**Dokka is not covered by the `docs-quality` sibling set.** It generates its own
site and matches no row in that set's generator table, so its version and DSL
shape are `KT-COMP-11`'s and the documentation-content rules that set carries do
not reach Dokka output.

## What Agents Get Wrong Here

1. **Sets `jvmToolchain(21)` and believes the bytecode target moved.** It did
   not. `jvmTarget` defaults to `"1.8"` and the toolchain back-fills only an
   unset value, so the build compiles on a modern JDK and ships Java 8 bytecode
   with no warning anywhere.
2. **Writes kapt scaffolding for a new Dagger, Hilt, Moshi or Room module**,
   because years of training data show kapt. The processor almost always has a
   KSP implementation now, and the migration is a dependency-configuration
   rename rather than a code change.
3. **Emits `-Xjvm-default=all` or `-Xjvm-default=all-compatibility`**, the
   2023-era shape, and then translates the flag *name* rather than the intent
   when told it is deprecated. `all` maps to `NO_COMPATIBILITY`, not to
   `ENABLE`, and the implicit default is now `ENABLE` anyway.
4. **Passes `-Xwhen-guards` or `-Xcontext-parameters` "to be safe"**, or reaches
   for `-Xcontext-receivers` when asked for context parameters. Those are two
   sequential, differently named features and the first was withdrawn.
5. **Configures Dokka with `tasks.dokkaHtml {}` or `dokkaHtmlMultiModule`**,
   still the dominant shape in tutorials as of 2026-09-12, on a build that pins
   Dokka 2.x.
6. **Offers a K1 fallback**, or pins `-language-version 1.9`, without knowing
   that language-version values died at 2.3.0 and the K1 compiler at 2.4.0. The
   advice is unexecutable, not merely dated.
7. **Bumps Gradle in isolation** and walks off the pinned KGP's ceiling, because
   the compatibility envelope reads as a minimum-only table.
8. **Assumes Kover behaves like JaCoCo**, report-only and independent of
   `check`. Kover's default is the opposite. `KT-TEST`
   (`kotlin-quality/testing.md`) owns that row, and no coverage claim here is
   evidence for it.
9. **Adds `extraWarnings = true` when asked to harden a Kotlin build.** It is
   experimental compiler surface with one adopter in the corpus, and the row
   that actually catches Kotlin logic defects is detekt's, owned by `KT-LINT`
   (`kotlin-quality/lint-gate.md`).
