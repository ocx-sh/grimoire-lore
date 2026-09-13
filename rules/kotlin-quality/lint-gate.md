---
title: The Kotlin Lint Gate
summary: The KT-LINT family, which owns what fails a Kotlin build: detekt's committed config and what it actually activates, ktlint's .editorconfig surface, the compiler's extra-warning switches, and whether the gate fails at all
---

# The Kotlin Lint Gate

Owns what fails a Kotlin build before a test runs: which analyzers are wired,
what their configuration actually activates, which compiler switches gate the
compile, and whether a finding stops the build. It does not own the code shapes
those checks catch. Coroutine correctness is `KT-CORO`, which also owns
`KT-CORO-01`, the one detekt activation row this family defers to rather than
restates. The published API and ABI gate is `KT-API`, `jvmTarget` and the
toolchain are `KT-COMP`, the test and coverage gate is `KT-TEST`. Error Prone,
NullAway, `-Xlint` and Checkstyle are `JAVA-LINT` in the `java-quality` set,
which never loads on a `.kt` file. Wiring a convention plugin, a version catalog
or a CI matrix is `GRADLE-CORE`. Never reaching green by weakening a check is
`KT-CORE-01`, in the index.

Contents: [The Gate of Record](#the-gate-of-record) ·
[Group 1: What detekt Catches](#group-1-what-detekt-catches) ·
[Group 2: What ktlintCheck Catches](#group-2-what-ktlintcheck-catches) ·
[Group 3: What compileKotlin Catches](#group-3-what-compilekotlin-catches) ·
[Group 4: What check Catches](#group-4-what-check-catches) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## The Gate of Record

**Pinned.** detekt for logic, ktlint for formatting. Two tools, one job each,
and neither substitutes for the other. A pinned default is one an adopter
overrides once, in their own convention plugin, with the reason written there.
It is not a per-module decision and not a per-call-site one. The four coroutine
rules that this pin turns on are `KT-CORO-01`, owned by the `KT-CORO` family and
cited here rather than repeated.

Measured across 32 flagship JVM repositories, re-read 2026-09-12: detekt is
wired in 4/32, ktlint in 6/32, and only **3/32** set any `ktlint_*` key at all.
So wiring a tool is SHOULD for an adopter carrying existing findings and MUST
for any module you author. The configuration rows below are MUST wherever the
tool is wired, because a wired tool whose config nobody wrote runs a rule set
nobody chose.

Both defaults are quiet, and that is this family's whole subject. detekt's
shipped config activates 129 of its 231 rules, and every ktlint property you do
not set takes ktlint's value instead of yours. Neither tool reports what it is
not running, so an unconfigured gate and a considered one produce the same green
output.

## Group 1: What detekt Catches

Gate: `./gradlew detekt`. Floors verified 2026-09-12: detekt's shipped
`default-detekt-config.yml` defines 231 rules across 10 rule sets with 129
active, and detekt 2.0 has been in alpha since 2025-09-04, reaching
`2.0.0-alpha.6` on 2026-08-04 against Kotlin 2.4.10 and Gradle 9.6.1.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-LINT-01 | Point detekt at a committed config file with `config.setFrom(...)`, and give every rule set you depend on an explicit `active: true` in it. `buildUponDefaultConfig = true` is a merge base, not an activation. | detekt's default config runs 129 of 231 rules: `comments` ships 0 of 10 active, `style` 38 of 78, `potential-bugs` 18 of 32. The `formatting`, `libraries` and `ruleauthors` rule sets are absent from that file entirely and do nothing until a `detektPlugins(...)` dependency adds them. So "detekt is applied" answers no question about which rules ran, and the build file does not show the answer either way. | `grep -rn -e 'config.setFrom' -e 'buildUponDefaultConfig' --include='*.gradle.kts' --include='*.gradle' .` A `buildUponDefaultConfig` hit with no `config.setFrom` hit is the finding, and empty output beside an applied detekt plugin is the same finding: the project runs detekt's defaults. Then read the file the first hit names and confirm each rule set you rely on carries `active: true`. An absent key inherits detekt's own default, which for 102 of the 231 rules is off. | **MUST** |
| KT-LINT-02 | Do not enable detekt's `formatting` rule set in a project that already runs ktlint, whether standalone or as a Spotless step. Choose one formatting engine. | detekt 2.0 renamed `:detekt-formatting` to `:detekt-rules-ktlint-wrapper`, package `dev.detekt.rules.ktlintwrapper`, which states what the old name obscured: the rule set wraps ktlint rather than implementing a second opinion. Two wrappers around one engine, pinned at two versions, disagree on autocorrection and report one class of finding twice. The split the tools themselves now describe is detekt for logic and ktlint for formatting. | `grep -rn -e 'detekt-formatting' -e 'detekt-rules-ktlint-wrapper' --include='*.gradle.kts' --include='*.gradle' --include='*.toml' .` then `grep -rn 'ktlint' --include='*.gradle.kts' --include='*.gradle' --include='*.toml' .` Hits from both commands in one project is the finding. Empty output from the first is the pass. | SHOULD |
| KT-LINT-03 | Read the project's resolved detekt coordinate before writing a package name, a module coordinate or a config key. Write booleans in the config as YAML literals, never as quoted strings. | The artifact group moved from `io.gitlab.arturbosch.detekt` to `dev.detekt`, so a package emitted from memory targets 1.x and does not resolve on 2.x. detekt 2.0 also rejects `active: "true"` where 1.x accepted it, moves the complexity and statistics reports into separate `dev.detekt:detekt-report-*` plugins, and renames the formatting module. A config that looks correct against 1.x stops parsing on the bump. | `grep -rn 'io.gitlab.arturbosch' --include='*.kt' --include='*.kts' --include='*.gradle' --include='*.toml' .` Any hit in a project whose detekt dependency resolves to `dev.detekt` is the finding, and empty output is the pass. Then bind the config path and check the boolean form: `CFG=config/detekt/detekt.yml; grep -n -e 'active: "' -e "active: '" "$CFG"` Any hit is the finding under 2.x, and empty output is the pass. | SHOULD |

```kotlin
// one convention plugin, applied to every Kotlin module
detekt {
    buildUponDefaultConfig = true  // KT-LINT-01: a merge base, not an activation
    config.setFrom(files("$rootDir/config/detekt/detekt.yml"))
    ignoreFailures = false         // KT-LINT-08: state it, do not inherit it
}
dependencies {
    // KT-LINT-02: only in a project with no other ktlint gate
    // detektPlugins("dev.detekt:detekt-rules-ktlint-wrapper:<pinned>")
}
```

## Group 2: What ktlintCheck Catches

Gate: `./gradlew ktlintCheck`, the standalone `ktlint` CLI, or `./gradlew
spotlessCheck` where the `ktlint()` step sits inside Spotless. Floors verified
2026-09-12: ktlint documents 55 `standard` rules and at least 8 more
`experimental` ones, configured through 62 distinct `ktlint_*` and
`ij_kotlin_*` properties.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-LINT-04 | **Pinned.** Set `ktlint_code_style` explicitly in a committed `.editorconfig` before wiring any ktlint gate. The default for this catalog is `ktlint_official`, and an adopter who wants IntelliJ's shape overrides it once in that one file. | `.editorconfig` is ktlint's entire configuration surface. There is no Kotlin or YAML config file, so every property left unset takes ktlint's own default rather than a project decision, and nothing in the build output says which. `ktlint_official` and `intellij_idea` are different rule sets, not strictness levels, so the unset case is a silent choice between two answers. Measured 2026-09-12: 3/32 of the corpus sets any `ktlint_*` key, so an unconfigured gate is the norm rather than the exception. | `grep -rn 'ktlint_code_style' --include='.editorconfig' .` Empty output in a project that runs a ktlint gate is the finding, including the case where no `.editorconfig` exists at all. One hit per code-style scope is the pass. | **MUST** |
| KT-LINT-05 | Record every rule you turn off as its own `ktlint_standard_*` or `ktlint_experimental_*` key in that same committed `.editorconfig`, with the reason on the line above. Never relax `ktlint_code_style` to silence a single finding. | A per-rule key is one reviewable line, and the corpus's one heavily-tuned repository disables ten standard rules exactly that way. Relaxing the code style instead moves dozens of rules at once to quiet one, and leaves no record of which finding prompted it. This is the ktlint statement of the same discipline `JAVA-LINT-03` states for an Error Prone opt-out. | `grep -rn -e 'ktlint_standard_' -e 'ktlint_experimental' --include='.editorconfig' .` then read the line above each hit. A disabled rule with no reason is the finding. Empty output means the project takes its code style unmodified, which is the pass. | SHOULD |

```ini
# .editorconfig, the only file ktlint reads
[*.{kt,kts}]
ktlint_code_style = ktlint_official                # KT-LINT-04: unset means ktlint's default, not yours
# generated protocol stubs are not hand-edited
ktlint_standard_no-wildcard-imports = disabled     # KT-LINT-05: one key, one reason
```

## Group 3: What compileKotlin Catches

Gate: `./gradlew compileKotlin`. Floors verified 2026-09-12: `-Wextra`, spelled
`extraWarnings` in the Gradle DSL, arrived in Kotlin 2.1 and is still
Experimental, as is `-Xsuppress-warning=NAME` from the same release.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-LINT-06 | Where a build opts in to `extraWarnings`, declare it in exactly one convention plugin, on the same `compilerOptions` block that sets `jvmTarget`, and carry its Kotlin version. Whether to opt in at all is `KT-COMP-12`'s, which forbids stating it as a requirement, because it is Experimental as of Kotlin 2.1 and still Experimental at 2026-09-12. | The bundle surfaces `CAN_BE_VAL`, `UNREACHABLE_CODE`, `USELESS_CALL_ON_NOT_NULL`, `ASSIGNED_VALUE_IS_NEVER_READ`, `REDUNDANT_NULLABLE` and `PLATFORM_CLASS_MAPPED_TO_KOTLIN`. Those are dead-code and wrong-type-across-the-Java-boundary findings that plain compilation never prints and that no shipped detekt rule replaces. Declared per module it is a per-module opinion, and one convention plugin is the only place the decision is reviewable. | `grep -rn -e 'extraWarnings' -e 'Wextra' --include='*.gradle.kts' --include='*.gradle' .` More than one declaring file is the finding. Empty output means the bundle is off, which is never a finding (`KT-COMP-12`). | SHOULD |
| KT-LINT-07 | Decide `allWarningsAsErrors` in that same convention plugin, and never behind a Gradle property that defaults to off. Before promoting, know that `-Xsuppress-warning=NAME` silences a warning globally and cannot silence an error. | Once a warning is promoted the per-name escape hatch is gone, and the remaining exits are fixing the code or un-promoting the whole set, so the promotion is a commitment rather than a setting. An unknown warning name passed to that flag is itself a compile error, so the hatch cannot be used speculatively either. Measured 2026-09-12: 7/32 of the corpus promotes warnings, and one of those gates the promotion behind an undefaulted Gradle property, so a bare `./gradlew build` there promotes nothing. That is the same shape as a coverage floor wrapped in a disabling conditional. | `grep -rn 'allWarningsAsErrors' --include='*.gradle.kts' --include='*.gradle' .` then read each hit for an enclosing conditional or a `providers.gradleProperty(...)` lookup. A promotion that only applies when a property is passed is the finding, and must never be described as enforced. Empty output means warnings stay warnings, which is the pass for an adopter and the finding for a module you author. | SHOULD |

```kotlin
kotlin {
    compilerOptions {
        extraWarnings.set(true)        // KT-LINT-06: Kotlin 2.1+, Experimental, one declaring file
        allWarningsAsErrors.set(true)  // KT-LINT-07: after this, -Xsuppress-warning cannot reach them
    }
}
```

## Group 4: What check Catches

Gate: `./gradlew check`.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| KT-LINT-08 | A Kotlin gate fails the build. Setting `ignoreFailures = true` on detekt or on the ktlint plugin is allowed only where the same file names the CI job that fails instead, which is the carve-out `JAVA-LINT-11` makes for a detached formatter. State the value rather than inheriting it. | Both plugins write their reports whether or not they fail the build, so an ignored gate and an enforced one produce the same files and the same green console line. The corpus's one hard-failing Kotlin gate sets `ignoreFailures = false` explicitly rather than relying on a default nobody looked up, and formatter tasks bind into `check` by plugin default in 5 of the 6 ktlint users and 10 of the 11 Spotless users, so an unenforced gate is almost always an explicit opt-out rather than an omission. | `grep -rn 'ignoreFailures' --include='*.gradle.kts' --include='*.gradle' .` A `true` with no adjacent comment naming the CI job that fails is the finding. Empty output means the plugin defaults apply, which is a weaker finding: state the value. | SHOULD |

## What Agents Get Wrong Here

1. **Reporting "detekt is configured" as "these checks run."** The highest-value
   error in this family, because the build file that proves detekt is applied
   says nothing about the 102 rules that are off, and `buildUponDefaultConfig =
   true` reads like the opposite of what it does. `KT-LINT-01` is the check, and
   `KT-CORO-01` is the same trap on the four coroutine rules specifically.
2. **Emitting detekt packages and coordinates from memory.** Training data is
   dense with `io.gitlab.arturbosch.detekt`, which no longer resolves after the
   move to `dev.detekt`. `KT-LINT-03` is the check, and the answer is always to
   read the project's own dependency declaration first.
3. **Wiring detekt's `formatting` rule set next to ktlint** because both
   appeared in the same search result and more linting reads as better. It is
   one engine wrapped twice at two versions, and the two disagree on
   autocorrection. `KT-LINT-02` is the check.
4. **Adding a ktlint gate and never writing an `.editorconfig`.** The gate then
   enforces whatever ktlint's defaults are that week, the project never chose
   it, and a ktlint bump moves the gate with no diff to review. `KT-LINT-04` is
   the check.
5. **Silencing one finding by relaxing `ktlint_code_style`** or by dropping a
   rule set, rather than by one `ktlint_standard_*` line with a reason. The
   smallest tell is a code-style change in a commit whose subject is about a
   single file.
6. **Promoting warnings to errors and then reaching for `-Xsuppress-warning`**
   when one bites. The flag cannot silence an error, so the reflex fix does not
   compile, and the next reflex is to un-promote the whole set.
7. **Gating a promotion or a gate behind a Gradle property that defaults to
   off**, then describing the project as enforcing it. Reading the flag's
   declaration is not enough, the enclosing conditional decides.
8. **Reaching for Java lint tooling on Kotlin sources.** Error Prone runs inside
   `javac` and never sees a `.kt` file, and Checkstyle parses Java. A Java lint
   block added to a Kotlin-only module gates nothing at all while looking like a
   gate in every review.
9. **Treating `ignoreFailures = true` as temporary.** Nothing later removes it,
   the reports keep being written, and the tool stays wired, so every subsequent
   reader concludes the gate is live. `KT-LINT-08` is the check.
