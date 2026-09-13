---
title: Maven annotation processing under modern JDKs, and Maven's toolchain seat
topic: MVN-BUILD — javac's implicit-annotation-processing shutoff and the maven-toolchains-plugin/toolchains.xml mechanism
agent: maven-annotation-processing-and-toolchains-worker
model: sonnet
date_researched: 2026-09-12
sources_count: 19
scope: |
  Covers (1) exactly which JDK release stopped enabling annotation processing
  implicitly, the javac warning/default-policy text across JDK 21/22/23/25/26,
  and maven-compiler-plugin's `proc`/`maven.compiler.proc` response to it; (2)
  Maven's toolchain mechanism — `maven-toolchains-plugin` + `~/.m2/toolchains.xml`,
  Surefire's `jdkToolchain`, and the JDK-auto-download gap Apache's own plugin
  leaves. Does not cover `annotationProcessorPaths` adoption/enforcement itself
  (MVN-BUILD-02, owned by jvm-maven-and-ant.md) or Gradle's toolchain block
  (JAVA-PLAT-01) beyond the one equivalence check the brief asked to hand back.
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   - [D1. The javac policy history: warning in 21, deferred in 22, live in 23](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)
   - [D2. What `-proc:none/only/full` mean today, verbatim](#d2-what--procnoneonlyfull-mean-today-verbatim)
   - [D3. maven-compiler-plugin's `proc` / `maven.compiler.proc`](#d3-maven-compiler-plugins-proc--mavencompilerproc)
   - [D4. The corpus: one repo touches this, and it touches it twice](#d4-the-corpus-one-repo-touches-this-and-it-touches-it-twice)
   - [D5. The distinguishability problem: a green build proves nothing](#d5-the-distinguishability-problem-a-green-build-proves-nothing)
   - [D6. Gradle-side equivalence check — handed back, not ruled on](#d6-gradle-side-equivalence-check--handed-back-not-ruled-on)
   - [D7. Maven has no `java { toolchain {} }` — two plugins split the job](#d7-maven-has-no-java--toolchain---two-plugins-split-the-job)
   - [D8. `maven-toolchains-plugin` selects; it never downloads](#d8-maven-toolchains-plugin-selects-it-never-downloads)
   - [D9. Surefire runs tests on a JDK the compiler never touched](#d9-surefire-runs-tests-on-a-jdk-the-compiler-never-touched)
   - [D10. guava's full pattern, read end to end](#d10-guavas-full-pattern-read-end-to-end)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **JDK 23 is the exact release** where `javac` stops enabling annotation processing implicitly; JDK 21/22 only warn ([D1](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)).
- The change was **deferred once**: targeted at JDK 22 (JDK-8306819), pulled back to a warning-only state for that release (JDK-8321321), then reinstated for JDK 23 (JDK-8321319) — three different bug IDs for what reads as one line in a release note ([D1](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)).
- The motive is **security, not cleanliness**: the origin request (JDK-8306819) is framed as an unintentional-code-execution risk — a processor pulled in transitively by a dependency runs at compile time with no opt-in ([D1](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)).
- The **exact warning text** (JDK 21 b29 / JDK 22 b04, still emitted by any tool that still triggers it): *"Annotation processing is enabled because one or more processors were found on the class path. A future release of javac may disable annotation processing unless at least one processor is specified by name (`-processor`), or a search path is specified (`--processor-path`, `--processor-module-path`), or annotation processing is enabled explicitly (`-proc:only`, `-proc:full`)."* ([D1](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)).
- **JDK 25/26's own tool spec carries identical wording**, verified verbatim against both pages: *"If this option is not used, annotation processing and compilation are done if at least one other option is used to explicitly configure annotation processing"* — the double negative is the whole policy ([D2](#d2-what--procnoneonlyfull-mean-today-verbatim)).
- **`-proc:full` was backported** to 17u (17.0.11), 11u (11.0.23) and 8u (8u411) specifically so older-JDK builds could opt in to the same explicit-only future ([D1](#d1-the-javac-policy-history-warning-in-21-deferred-in-22-live-in-23)).
- **maven-compiler-plugin's `proc` parameter predates the JDK change by over a decade** (`since 2.2`) but its `full` *value* was added in **3.13.0** specifically to fix [MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548) — "JDK 21 throws annotations processing warning that can not be turned off" — because pre-3.13.0 the parameter only accepted `none`/`only`, with no way to spell the new explicit-default value ([D3](#d3-maven-compiler-plugins-proc--mavencompilerproc)).
- **MVN-BUILD-02 needs a second conjunct**: `<maven.compiler.proc>full</maven.compiler.proc>` (compiler-plugin ≥ 3.13.0), or the exact same silent-none failure the JDK warning describes reproduces itself inside a POM that already does everything else right ([Normative guidance §1](#normative-guidance-candidates)).
- **The corpus confirms this is a live, not theoretical, gap**: `apache__maven@ea4a417bd2:pom.xml:135` is the *only* POM across 32 exemplars that sets `<maven.compiler.proc>`, and it sets it reactor-wide to `full`; one of its own submodules, `api/maven-api-di/pom.xml:34`, explicitly overrides back to `none` because that module defines annotations but never consumes them ([D4](#d4-the-corpus-one-repo-touches-this-and-it-touches-it-twice)).
- **A processor that silently stopped running is corpus-invisible by construction**: the build stays green, `annotationProcessorPaths` (or its absence) never changes, and the only artifact-level signal is a missing generated-sources directory or a missing implementation class at runtime — neither of which any exemplar's CI asserts ([D5](#d5-the-distinguishability-problem-a-green-build-proves-nothing)).
- **The verification for this MUST cannot be a POM grep alone** — it must additionally assert that `target/generated-sources/annotations/` is non-empty (or contains the specific generated file) whenever a processor is declared, because a config-only check cannot tell "processor never ran" from "processor ran and generated nothing this build" ([Normative guidance §2](#normative-guidance-candidates)).
- **Gradle does not need a matching GRADLE-TOOL row**: `gradle/gradle`'s own `JavaCompilerArgumentsBuilder.java` unconditionally emits either `-proc:none` (empty `annotationProcessorPath`) or `-processorpath <path>` (non-empty) on every `JavaCompile` invocation — both are "explicit configuration" under the JDK-23 policy, so Gradle has been immune to this change since the `annotationProcessor` configuration was split from the compile classpath (Gradle 5.0) ([D6](#d6-gradle-side-equivalence-check--handed-back-not-ruled-on)).
- **Maven has no equivalent of `java { toolchain { languageVersion.set(...) } }` as a single mechanism** — it is two cooperating plugins plus an XML file: `maven-toolchains-plugin` (select) reads `~/.m2/toolchains.xml` and stores the match for toolchain-aware plugins to consume; there is no built-in auto-provisioning step ([D7](#d7-maven-has-no-java--toolchain---two-plugins-split-the-job)).
- **Apache's own `maven-toolchains-plugin` never downloads a JDK** — it only selects among JDKs already listed in `toolchains.xml` and fails the build if none matches; the download gap is filled by a *third-party* plugin, `org.mvnsearch:toolchains-maven-plugin`, which uses the **Foojay Disco API** (the same JDK-discovery service Gradle's `foojay-resolver-convention` uses) to fetch and register JDKs under `~/.m2/jdks` ([D8](#d8-maven-toolchains-plugin-selects-it-never-downloads)).
- **Surefire can and routinely does run tests on a JDK different from the one that compiled the code**, via its own `jdkToolchain` parameter, which overrides the reactor-selected default toolchain for that one plugin execution — confirmed live, not hypothetical, in `google__guava@5fb424c43a:pom.xml:363-365` ([D9](#d9-surefire-runs-tests-on-a-jdk-the-compiler-never-touched)).
- **This earns two MVN-BUILD rows, not one**: the toolchain-*selection* mechanism (maven-toolchains-plugin + toolchains.xml, no download) and the toolchain-*acquisition* gap (no built-in downloader; `org.mvnsearch:toolchains-maven-plugin` or CI's `actions/setup-java` fills it) are different failure surfaces with different fixes ([Normative guidance §5–7](#normative-guidance-candidates)).
- **`-Dtoolchain.skip` belongs to the third-party plugin, not Apache's**: `org.mvnsearch:toolchains-maven-plugin` exposes `-Dtoolchain.skip` to bypass its own download step (useful when CI has already installed the exact JDK via `actions/setup-java`); Apache's `maven-toolchains-plugin` `ToolchainMojo` has no `skip` parameter at all — a rule that assumes the flag works "on the toolchains plugin" without naming which one is wrong roughly half the time ([D7](#d7-maven-has-no-java--toolchain---two-plugins-split-the-job), [AI-agent angle](#ai-agent-angle)).
- **Central, not the doc site, is the version of record**: `maven-compiler-plugin` tops out at `3.16.0` GA (the `4.0.0-*` line is only at `beta-5`, an even earlier stage than `maven-core`'s `4.0.0-rc-6`); `maven-toolchains-plugin` at `3.3.0`; `org.mvnsearch:toolchains-maven-plugin` at `4.5.0` (queried 2026-09-12) ([Sources](#sources)).
- **`maven-surefire-plugin` 3.6.0 is now GA** (queried 2026-09-12, `lastUpdated 20260903221843`), one release past frame correction 38's `3.6.0-M1` snapshot — the version-currency method (query the registry, not the banner) is the durable finding, not any specific pinned number.

## Findings

### D1. The javac policy history: warning in 21, deferred in 22, live in 23

The origin ticket, [JDK-8306819 "Consider disabling the compiler's default active annotation processing"](https://bugs.openjdk.org/browse/JDK-8306819), targeted **JDK 22** and states the motive explicitly: annotation processing has been enabled by default since JSR 269 (Java 6), and because it is on by default, "it may expose the user to a risk of unintentional [code execution]" — the scenario named is a compromised dependency shipping a malicious processor that a build silently runs at compile time. This is a supply-chain-hardening change, not a build-hygiene one.

The rollout happened in three steps, each its own bug:

| Step | Bug | What changed | Release |
|---|---|---|---|
| 1 | [JDK-8306819](https://bugs.openjdk.org/browse/JDK-8306819) | Original proposal to disable-by-default | targeted JDK 22 |
| 2 | — (warning added) | `javac` starts **warning** (not disabling) when implicit processing fires | **JDK 21 build 29 / JDK 22 build 4** |
| 3 | [JDK-8321321](https://bugs.openjdk.org/browse/JDK-8321321) "Defer policy of disabling annotation processing by default" | Build-tool ecosystem wasn't ready; **reverts JDK 22 to warning-only**, defers the actual disablement | JDK 22 (deferred) |
| 4 | [JDK-8321319](https://bugs.openjdk.org/browse/JDK-8321319) "Reinstate disabling the compiler's default active annotation processing" | **Implicit annotation processing is actually disabled** when a classpath is set but no explicit annotation-processing option is given | **JDK 23** (live) |

The two [Inside.java Quality Outreach](https://inside.java/2023/07/29/quality-heads-up/) posts (2023-07-29 for the warning, [2024-06-18](https://inside.java/2024/06/18/quality-heads-up/) for the JDK-23 reinstatement) are the human-readable versions of steps 2 and 4; the bug IDs are the mechanism of record. **A rule that cites only "JDK 21" for this behavior is wrong** — JDK 21 and 22 warn; JDK 23+ is where a build that does nothing about it silently stops processing annotations.

`-proc:full` — the flag that restores pre-23 implicit behavior explicitly — was backported to three older update trains specifically so a project pinning an old JDK series could still opt in ahead of time: **17.0.11, 11.0.23, 8u411**.

### D2. What `-proc:none/only/full` mean today, verbatim

Fetched directly (not from search snippets) against both the current LTS and the current latest-GA tool specs, with identical wording:

- [JDK 25 javac tool spec](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#option-proc) (LTS, released 2025-09-16)
- [JDK 26 javac tool spec](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html#option-proc) (current GA as of 2026-09-12; JDK 27 is not yet GA — fixed for 2026-09-15, per [jvm-frame.md](../jvm-frame.md) correction 2)

Both pages read, verbatim:

> `-proc:`[`none`, `only`, `full`]
>
> Controls whether annotation processing and compilation are done.
> - `-proc:none` means that compilation takes place without annotation processing
> - `-proc:only` means that only annotation processing is done, without any subsequent compilation.
> - `-proc:full` means annotation processing and compilation are done.
>
> If this option is not used, annotation processing and compilation are done if at least one other option is used to explicitly configure annotation processing.

That last sentence *is* the JDK-23 policy, stated as a tautology rather than as a changelog note — the spec text was rewritten to describe the new default rather than call out that it changed. The companion "[Annotation Processing](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#annotation-processing)" section spells out the "other option" set explicitly: `-processor`, `--processor-path`, `--processor-module-path`, or `-proc:full`/`-proc:only`. Any one of those four counts as "explicit configuration"; their absence plus no explicit `-proc:full` means `-proc:none` is what actually runs, regardless of what is on the classpath.

Contrast with the **JDK 21** tool spec fetched the same way: its "How Annotation Processing Works" section instead reads *"Unless annotation processing is disabled with the `-proc:none` option, the compiler searches for any annotation processors that are available… If no path is specified, then the user class path is used"* — the pre-23 default-on wording, unmodified. The spec text itself is the dated artifact; a version-unaware reading of "the javac docs" without checking which release's docs will silently reproduce whichever policy that release happened to describe.

### D3. maven-compiler-plugin's `proc` / `maven.compiler.proc`

Fetched from [`compile-mojo.html`](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) (current doc, 2026-09-12):

| Field | Value |
|---|---|
| Parameter | `proc` |
| User property | `maven.compiler.proc` |
| Type | `String` |
| Allowed values | `none`, `only`, `full` |
| **Since** | **2.2** |
| Plugin's own note | *"Starting with JDK 21, this option must be set explicitly."* |

The `since: 2.2` is easy to misread as "this problem was already solved a decade ago" — the parameter itself is old, but **the `full` value was not always legal**. [MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548), titled *"JDK 21 throws annotations processing warning that can not be turned off,"* reports that on plugin 3.11, `<proc>` accepted only `none`/`only` — there was no way to spell the explicit-default value the JDK warning was asking for, only a way to turn processing off entirely (which breaks any build that actually uses processors). The fix shipped in **3.13.0**: `full` became a legal, documented value. A POM pinning `maven-compiler-plugin` below 3.13.0 cannot silence the warning by setting `<proc>full</proc>` — the workaround for that floor is a raw `-proc:full` compiler arg via `<compilerArgs>` until the plugin is upgraded.

`annotationProcessorPaths` (the mechanism MVN-BUILD-02 already governs) is a different parameter with its own floor: **since 3.5**, exclusions on individual paths **since 3.11.0**. It answers *which* processors run; `proc`/`maven.compiler.proc` answers *whether any* run at all. A POM can get the first completely right and still ship a build where zero processors execute, because nothing sets the second.

### D4. The corpus: one repo touches this, and it touches it twice

Across all 32 exemplars, exactly one POM sets `maven.compiler.proc` anywhere, and it is the repository that builds the tool itself:

- `apache__maven@ea4a417bd2:pom.xml:135` — `<maven.compiler.proc>full</maven.compiler.proc>`, set as a reactor-wide property alongside `<maven.compiler.release>${javaVersion}</maven.compiler.release>` (`javaVersion` = 17, `pom.xml:131-134`). This is the exact line the brief named, now explained: it is `apache/maven`'s own defensive fix for the JDK-23 policy, applied at the parent so every submodule inherits it.
- `apache__maven@ea4a417bd2:api/maven-api-di/pom.xml:34` — a submodule explicitly **overrides back to `<maven.compiler.proc>none</maven.compiler.proc>`**. This module (`maven-api-di`, "Maven 4 API :: Dependency Injection") defines DI annotations for other code to consume; it never runs a processor itself, so leaving `full` inherited would cost a classpath scan for nothing. This is the clean "declare the exception explicitly" shape a rule should point to.

Zero other POMs in the corpus (Maven-primary or Maven-consumability modules alike) set the property in either direction — matching [config-inventory.md](../jvm-audit/config-inventory.md)'s "uncovered corpus-wide" finding for `annotationProcessorPaths` itself. No exemplar was measured actually depending on an annotation-processor artifact (Lombok, MapStruct, Dagger, AutoValue, Immutables) from a Maven-primary module, so the corpus cannot show a *live* silent-breakage case — only the one repo that pre-empted it.

### D5. The distinguishability problem: a green build proves nothing

This is the sharpest part of the brief and the reason the rule cannot stop at "add the property."

A Maven build with a declared annotation processor and **no** `maven.compiler.proc` setting, run on JDK ≤ 22, compiles fine and generates sources. The exact same POM, run on JDK 23+ with no other change, also **compiles fine** — `-proc:none` is a legal, silent, zero-diagnostic default. `mvn verify` exits 0 in both cases. The generated-sources step simply does not happen in the second case; any code depending on it fails at a different, later point (a missing generated class at compile time if the generated code is itself compiled in the same module — which would actually surface as a compile error — but a missing generated *resource*, a missing `META-INF/services` entry, or a runtime-reflection-based processor whose output is never referenced from source at all produces **no compiler error whatsoever**, only a runtime `ClassNotFoundException` or a quietly-absent feature).

The failure mode named in the brief — "the build is green and the generated sources are absent" — is real and is not detectable from the POM or from Maven's own exit code. It is only detectable by checking the **artifact of the annotation-processing step**, not the build's overall pass/fail. This is why a POM-text grep is necessary but not sufficient as the verification for the eventual rule (see [Normative guidance §2](#normative-guidance-candidates)).

### D6. Gradle-side equivalence check — handed back, not ruled on

The brief asks whether the Gradle Java plugin passes `-proc:` explicitly, which would mean `GRADLE-TOOL` needs a matching row. Read directly from `gradle/gradle`'s own source at the pinned SHA:

```java
// gradle__gradle@ea17004a31:platforms/jvm/java-compiler-worker/src/main/java/org/gradle/api/internal/tasks/compile/JavaCompilerArgumentsBuilder.java:209-216
List<File> annotationProcessorPath = spec.getAnnotationProcessorPath();
if (annotationProcessorPath == null || annotationProcessorPath.isEmpty()) {
    args.add("-proc:none");
} else {
    args.add("-processorpath");
    args.add(Joiner.on(File.pathSeparator).join(annotationProcessorPath));
}
```

This runs unconditionally inside `addMainOptions()`, which every `JavaCompile` task invocation calls (`includeMainOptions` defaults to `true`, and the arguments-builder's own `build()` calls it directly). The same file also **hard-rejects** an attempt to pass `-processorpath`/`--processor-path` through `CompileOptions.compilerArgs` (`JavaCompilerArgumentsBuilder.java:110-112`), forcing every processor path through the typed `annotationProcessorPath` property instead — there is exactly one code path that can emit these flags, and it always fires.

**Conclusion to hand back, not adopt unilaterally**: Gradle has been unaffected by the JDK-23 policy change since it separated the `annotationProcessor` dependency configuration from the compile classpath (Gradle 5.0, well before JDK 23 shipped) — every `JavaCompile` invocation already passes one of the two flags that the JDK's new default recognizes as "explicit configuration." **`GRADLE-TOOL` almost certainly needs no matching row** for the implicit-disablement change itself; if it needs anything, it is a much narrower note that a raw `-proc:full`/`-proc:none` in `compilerArgs` is rejected outright (a different, Gradle-specific failure mode: the agent mistake is trying to hand-write the flag Gradle already manages, not failing to trigger it). This is the map's call, not this dive's.

### D7. Maven has no `java { toolchain {} }` — two plugins split the job

Gradle's toolchain block is one declarative surface that (a) states the required JDK version/vendor, (b) resolves an installed JDK or downloads one via a resolver plugin, and (c) makes every toolchain-aware task (compile, test, javadoc) use it. Maven has no single equivalent. The mechanism, per the [Guide to Using Toolchains](https://maven.apache.org/guides/mini/guide-using-toolchains.html) (fetched 2026-09-12) and the plugin's own docs, is three separate pieces that must all be present:

1. **`~/.m2/toolchains.xml`** (or a path passed via `--global-toolchains`, Maven 3.3.1+) — a flat XML inventory of JDKs already installed on the machine, each entry a `<toolchain><type>jdk</type><provides>{version, vendor}</provides><configuration><jdkHome>…</jdkHome></configuration></toolchain>` block. Nothing generates this file automatically; it is either hand-maintained, generated by CI setup steps, or (see D8) written by a third-party plugin.
2. **`org.apache.maven.plugins:maven-toolchains-plugin`**, bound to the `toolchain` goal (default phase `validate`) with a `<toolchains>` requirement block matching the entries above by version/vendor. Its job is entirely **selection**: it reads `toolchains.xml`, finds the best match, and stores it in the `MavenSession` for other plugins to read. Current version: **3.3.0** (Central, queried 2026-09-12).
3. **Toolchain-aware plugins**, which check the session for a stored toolchain and use it instead of the JVM Maven itself is running under. Per the guide's own table: `maven-compiler-plugin` (since 2.1), `maven-surefire-plugin` (since 2.5), `maven-javadoc-plugin` (since 2.5), `maven-jarsigner-plugin` (since 1.3).

If any one of the three is missing — no `toolchains.xml` entry, the plugin not bound, or the consuming plugin too old to be toolchain-aware — the whole mechanism silently no-ops and Maven falls back to compiling/testing under whatever JVM launched it. There is no single switch to flip; "does this Maven build have a toolchain" is a three-part reading exercise, unlike Gradle's single `toolchain {}` block.

### D8. `maven-toolchains-plugin` selects; it never downloads

Read directly from the official plugin's source, [`ToolchainMojo.java`](https://raw.githubusercontent.com/apache/maven-toolchains-plugin/master/src/main/java/org/apache/maven/plugins/toolchain/ToolchainMojo.java): its only `@Parameter`-annotated fields are `toolchainManagerPrivate` (an internal component), `session`, and `toolchains` (the match requirements). **There is no `skip` parameter, and there is no download/provisioning code path at all.** If `toolchains.xml` has no matching entry, the `toolchain` goal fails the build outright — it never fetches a JDK to fill the gap. This is a structural difference from Gradle's toolchain resolver plugins (foojay etc.), which download by design.

The gap is filled, in the corpus, by a **different, third-party plugin with a confusingly similar name**: `org.mvnsearch:toolchains-maven-plugin` (upstream: [linux-china/toolchains-maven-plugin](https://github.com/linux-china/toolchains-maven-plugin) on GitHub). Per its own README (fetched 2026-09-12):

- It downloads JDKs on demand via the **Foojay Disco API** — the same JDK-discovery service backing Gradle's `org.gradle.toolchains.foojay-resolver-convention` plugin — installing them under `~/.m2/jdks` and registering the result into `toolchains.xml` dynamically.
- It supports a `testJdk` sub-element distinct from the main `jdk` element, so one execution can provision two JDKs at once (one to compile with, one to test with).
- It exposes `-Dtoolchain.skip` as its own skip flag — this property belongs to **this** plugin, not to Apache's `maven-toolchains-plugin`, which has no skip mechanism of any kind.
- Current version: **4.5.0** (Central, queried 2026-09-12) — matches the version `google/guava` pins exactly.

Naming collision risk for an agent: `maven-toolchains-plugin` (Apache, `org.apache.maven.plugins`, select-only) and `toolchains-maven-plugin` (linux-china/mvnsearch, `org.mvnsearch`, select-and-download) are two different artifacts with transposed, easily-confused names. A generated POM that writes one groupId with the other artifactId's expectations (e.g. "Apache's plugin downloads JDKs") will not resolve and will not do what the comment claims.

### D9. Surefire runs tests on a JDK the compiler never touched

Surefire's own [toolchains example page](https://maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html) documents the mechanism directly: by default, if the reactor has a selected toolchain (from `maven-toolchains-plugin`'s `toolchain` goal), Surefire launches its test JVM using that same toolchain. But Surefire also exposes its own `jdkToolchain` configuration element:

```xml
<plugin>
  <artifactId>maven-surefire-plugin</artifactId>
  <configuration>
    <jdkToolchain>
      <version>8</version>
      <vendor>zulu</vendor>
    </jdkToolchain>
  </configuration>
</plugin>
```

This **overrides**, for Surefire's own execution only, whichever toolchain the reactor otherwise selected — matched against the same `toolchains.xml` entries maven-toolchains-plugin reads. The doc states the exact use case: *"it may be desirable to compile and test using different jvms… `jdkToolchain` can be used to supply an alternate toolchain specification"* rather than hardcoding a `<jvm>` path. This directly answers the brief's question: **yes, Surefire can run tests on a different JDK than the one used to compile**, and it is a first-class, documented parameter, not a hack.

### D10. guava's full pattern, read end to end

`google__guava@5fb424c43a` is not a hypothetical — it is the corpus's one live example of the compile-JDK/test-JDK split, and it uses three plugins together:

1. **`google__guava@5fb424c43a:guava/pom.xml:56-62`** — the `guava` submodule unconditionally binds both `org.mvnsearch:toolchains-maven-plugin` and `maven-toolchains-plugin` with no local `<configuration>`, inheriting the parent's `pluginManagement` defaults.
2. **`google__guava@5fb424c43a:pom.xml:388-403`** (parent `pluginManagement`) — that inherited config pins the **compile/select** toolchain to **JDK 26 unconditionally**, regardless of what the test matrix is doing: `<toolchains><jdk><version>26</version></jdk></toolchains>`.
3. **`google__guava@5fb424c43a:pom.xml:541-577`** (parent `pluginManagement`) — the *download* half: `org.mvnsearch:toolchains-maven-plugin`'s `download-26-and-surefire-version` execution fetches both JDK 26 (`<jdk>`) **and** `${surefire.toolchain.version}` (`<testJdk>`) via Foojay in one shot.
4. **`google__guava@5fb424c43a:pom.xml:359-365`** (parent `pluginManagement`) — Surefire's own `jdkToolchain` is bound separately to `${surefire.toolchain.version}`, a property that **defaults to `${java.specification.version}`** (`pom.xml:55`) but is overridden per CI job.
5. **`google__guava@5fb424c43a:.github/workflows/ci.yml:22-24,39-56`** — the CI matrix varies `java: [8, 11, 17, 25]`, installs both that version **and** JDK 26 via one `actions/setup-java` call (`java-version: |` with two lines), then runs `./mvnw -B -Dtoolchain.skip install …` (compile step, skip the auto-download since setup-java already installed everything) and `./mvnw -B … verify -Dsurefire.toolchain.version=${{ matrix.java }}` (test step, select the matrix JDK for Surefire specifically).

Net effect: **`javac`/`javadoc` always run on JDK 26** (the pinned select-toolchain default), while **Surefire runs the same compiled test classes under JDK 8, 11, 17 or 25** depending on the CI job — a single build genuinely spans two JDK major versions, compile and test, on purpose, to prove the library still runs correctly on its stated floor while being built with a modern toolchain. `-Dtoolchain.skip` here is a CI-only optimization (the download plugin's own work is already done by `actions/setup-java`), not evidence the mechanism is optional in general — a local `./mvnw verify` with no flags still needs the `org.mvnsearch` plugin (or a hand-maintained `toolchains.xml`) to succeed at all.

## Normative guidance candidates

1. **Every `annotationProcessorPaths` declaration (MVN-BUILD-02) must be paired with `<maven.compiler.proc>full</maven.compiler.proc>` on `maven-compiler-plugin` ≥ 3.13.0, or an equivalent `-proc:full` compiler arg on an older plugin version.** Rationale: JDK 23+ defaults to `-proc:none` whenever no explicit annotation-processing option is present; a correctly-populated `annotationProcessorPaths` block does not itself count as that option, so the processors it names can still silently never run. Verify: `grep -L 'maven.compiler.proc' $(grep -l 'annotationProcessorPaths' $(find . -name pom.xml))` — any hit is a POM that names processors but never turns processing on for JDK 23+; separately confirm the plugin version with `grep -A2 'maven-compiler-plugin' pom.xml` (needs ≥ 3.13.0 for the `full` value to be legal at all).
2. **The verification for rule 1 must include an artifact check, not only a POM-text check.** Rationale: a build that never ran its processors exits 0 and produces no diagnostic — "config says processors are declared" and "processors actually ran this build" are different facts, and only the second is the one that matters. Verify: after `mvn compile`, assert `target/generated-sources/annotations/` is non-empty (or contains a specific expected generated file/class named by the processor) whenever `annotationProcessorPaths` is non-empty; an empty directory alongside a populated `annotationProcessorPaths` is the finding, and a POM-only reviewer will never see it.
3. **Never cite "JDK 21" as the release where implicit annotation processing stops.** Rationale: JDK 21/22 only warn (`javac` still runs processors found on the classpath); JDK 23 is the release where the default actually flips to `-proc:none`. Verify: reading heuristic — any generated text pairing "JDK 21" with "disabled"/"stopped running" annotation processing is the finding; the correct release name is 23.
4. **State every `-proc`/`maven.compiler.proc` claim with the plugin-version floor for the value used.** Rationale: `none`/`only` have existed since maven-compiler-plugin 2.2; `full` only became legal in 3.13.0 ([MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548)) — a generated `<proc>full</proc>` on an older pinned plugin version fails to parse/apply as intended. Verify: cross-reference the pinned `<version>` on `maven-compiler-plugin` against 3.13.0 before emitting `<proc>full</proc>`.
5. **A Maven build that needs a specific JDK must bind `maven-toolchains-plugin`'s `toolchain` goal with a matching `~/.m2/toolchains.xml` entry (or generate one via a download plugin) — never assume the ambient `JAVA_HOME` is sufficient.** Rationale: Maven has no single toolchain block; the three-part mechanism (file + selecting plugin + toolchain-aware consuming plugin) is opt-in at every layer and silently no-ops if any layer is missing. Verify: `grep -A5 'maven-toolchains-plugin' pom.xml` for a bound `toolchain` goal, cross-checked against `~/.m2/toolchains.xml`'s presence (or CI logs showing it was generated) — a compiler-plugin `<release>` pin with no toolchain binding at all means the build trusts whatever JDK happens to be running `mvn`.
6. **Never claim Apache's `maven-toolchains-plugin` downloads or auto-provisions a JDK.** Rationale: its own source (`ToolchainMojo.java`) has no download code path and no `skip` parameter; a missing `toolchains.xml` entry is a hard build failure, not a fetch. Verify: reading heuristic on generated docs/rules — any sentence claiming "maven-toolchains-plugin downloads/installs a JDK" is the finding; the correct name for that behavior is a different plugin (`org.mvnsearch:toolchains-maven-plugin`) or CI's own `actions/setup-java`.
7. **When recommending JDK auto-provisioning for Maven, name `org.mvnsearch:toolchains-maven-plugin` (Foojay-backed) explicitly, and never transpose its groupId/artifactId with Apache's `maven-toolchains-plugin`.** Rationale: the two names differ only in word order (`toolchains-maven-plugin` vs `maven-toolchains-plugin`) and a swapped groupId/artifactId pair fails dependency resolution outright. Verify: `grep -B2 -A1 '<artifactId>.*toolchains.*plugin' pom.xml` and confirm `org.mvnsearch` pairs with `toolchains-maven-plugin` (download-capable) and `org.apache.maven.plugins` pairs with `maven-toolchains-plugin` (select-only) — any other pairing is a resolution failure waiting to happen.
8. **A generated Surefire configuration that needs to test on a JDK other than the compile toolchain must set `<jdkToolchain>` inside `maven-surefire-plugin`'s own `<configuration>`, not attempt to change the reactor-wide toolchain for the whole build.** Rationale: `jdkToolchain` is Surefire's documented, scoped override precisely so compile and test can target different JDKs in one reactor; rewriting the shared toolchain selection to "fix" a test-JDK need would also move the compile JDK, which is very likely not the intent. Verify: `grep -A3 'jdkToolchain' pom.xml` inside the `maven-surefire-plugin` block specifically, and confirm it differs from the version bound to the shared `maven-toolchains-plugin` execution when the two are meant to diverge.
9. **`-Dtoolchain.skip` must never be assumed to work against Apache's `maven-toolchains-plugin`.** Rationale: the flag is a property of `org.mvnsearch:toolchains-maven-plugin` only; the official plugin's Mojo defines no skip parameter of any name. Verify: before writing `-Dtoolchain.skip` into a CI script or doc, confirm the POM actually binds `org.mvnsearch:toolchains-maven-plugin` — its absence means the flag is a silent no-op, not a skip.
10. **State every `javac`/`maven-compiler-plugin` claim about annotation-processing defaults with the JDK release it applies to, not "modern JDKs" unqualified.** Rationale: the spec text itself changed between JDK 21 and JDK 23 (`docs.oracle.com/en/java/javase/21/...` vs `.../25/...` and `.../26/...` read differently on this exact point) — "modern JDK" spans both policies depending on which release is meant. Verify: reading heuristic — any generated rule about annotation-processing defaults must name a JDK release number (23, not "modern" or "recent").

## Exemplar evidence

| Candidate | Satisfies | Violates / gap |
|---|---|---|
| §1 (proc=full paired with annotationProcessorPaths) | `apache__maven@ea4a417bd2:pom.xml:135` sets `<maven.compiler.proc>full</maven.compiler.proc>` reactor-wide — the only exemplar to do so. | **0/32** exemplars pair it with a populated `annotationProcessorPaths` — no Maven-primary POM in the corpus was measured declaring both, so the rule imposes a practice the corpus does not yet exercise together (same finding as MVN-BUILD-02 itself in [config-inventory.md](../jvm-audit/config-inventory.md)). |
| §2 (artifact-level verification) | N/A — no exemplar's CI was found asserting `target/generated-sources/annotations/` contents; this is a genuinely new commitment, not a codified convention. | — |
| §3/§10 (name the exact JDK release) | `apache__maven@ea4a417bd2:pom.xml:135` implicitly targets the correct release by using `full` at all — the fix only makes sense against JDK 23+. | — |
| §4 (plugin-version floor for `full`) | N/A directly, but `google__guava@5fb424c43a` pins `maven-compiler-plugin.version` to `3.15.0` (`pom.xml:88`), comfortably above the 3.13.0 floor, even though guava does not itself set `<proc>`. | — |
| §5–7 (toolchain selection vs download, correct plugin names) | `google__guava@5fb424c43a:guava/pom.xml:56-62` binds both plugins correctly, by their correct groupIds, inheriting parent config at `pom.xml:388-403` (select, JDK 26) and `pom.xml:541-577` (download, JDK 26 + `${surefire.toolchain.version}`). | `apache__maven@ea4a417bd2` itself has **no** toolchain binding of any kind — the tool that documents toolchains does not use them on itself, so it is not a counter-example to cite for this row (out of scope, not a violation). |
| §8 (Surefire `jdkToolchain` scoped override) | `google__guava@5fb424c43a:pom.xml:363-365` — `<jdkToolchain><version>${surefire.toolchain.version}</version></jdkToolchain>`, distinct from the shared toolchain's pinned `26` at `pom.xml:400`. | — |
| §9 (`-Dtoolchain.skip` requires the right plugin) | `google__guava@5fb424c43a:.github/workflows/ci.yml:53` uses `-Dtoolchain.skip` correctly, because `guava/pom.xml:57-58` does bind `org.mvnsearch:toolchains-maven-plugin`. | — |

## AI-agent angle

1. **Cites "JDK 21" as the release that disables implicit annotation processing.** JDK 21 only introduced the warning; training data captures the earlier, louder announcement (2023 blog posts, the initial warning rollout) more often than the quieter JDK-23 reinstatement eighteen months later. → grep generated text for "JDK 21" co-occurring with "disable"/"stop" and "annotation processing"; the correct release is 23.
2. **Writes `<proc>full</proc>` against an unpinned or old `maven-compiler-plugin` version and assumes it works.** The parameter is old (2.2) but the value is not (3.13.0); a model that has seen the parameter in old tutorials has no reason to know the value it needs was added later. → confirm the plugin version against 3.13.0 before accepting `<proc>full</proc>` as correct.
3. **Assumes `maven-toolchains-plugin` downloads a JDK because Gradle's toolchain block does, by analogy.** The two ecosystems' "toolchain" words point at mechanically different things — Gradle's includes a resolver/downloader by convention; Maven's official plugin is selection-only. → any generated instruction telling a user "the toolchains plugin will download JDK N for you" without naming `org.mvnsearch` (or an equivalent) is the finding.
4. **Transposes `maven-toolchains-plugin` and `toolchains-maven-plugin`.** The names differ only in word order, and a model confident about "Maven plugin naming conventions" (usually `<function>-maven-plugin`) will default to assuming the transposed, more-conventional-sounding name is the real one, or hallucinate that both names refer to the same artifact. → verify the groupId: `org.apache.maven.plugins` = select-only, `org.mvnsearch` = download-capable; a POM using one groupId with the other's documented behavior in a comment is wrong.
5. **Treats a passing `mvn verify` as proof annotation processors ran.** This is the distinguishability trap named in the brief: nothing about Maven's exit code or console output distinguishes "processors ran and generated the expected output" from "processors were silently skipped." → the only mechanical check is the generated-sources directory/file check in Normative candidate §2 — a model asked "did this build run its processors" cannot answer correctly from the build log alone and must be told to check that directory.
6. **Writes `-Dtoolchain.skip` as if it is a general Maven/toolchain-plugin flag.** It reads as a plausible, conventionally-named system property (parallel to `-DskipTests`), and a model pattern-matching Maven CLI flags has no signal that this specific one is scoped to one third-party plugin. → confirm `org.mvnsearch:toolchains-maven-plugin` is actually bound in the POM before treating the flag as meaningful.
7. **Recommends hardcoding a `<jvm>` path in Surefire to run tests on a different JDK, instead of `jdkToolchain`.** `<jvm>` (an absolute path to a `java` executable) is older, more commonly seen in tutorials, and portable-looking until it is checked out on a different machine; `jdkToolchain` is the portable, toolchains.xml-backed equivalent Surefire's own docs recommend instead. → grep for `<jvm>` inside a `maven-surefire-plugin` block in a repo that also has a `toolchains.xml`/`maven-toolchains-plugin` binding — the hardcoded path is redundant with, and less portable than, the toolchain the repo already set up.

## Contested / evolving

- **Whether MVN-BUILD-02 (`annotationProcessorPaths` as a MUST) should exist at all is still an open owner decision (Q-MVN-3 in [jvm-topic-map.md](../jvm-topic-map.md)), independent of this dive's findings.** This dive answers "if the rule exists, what else must accompany it" — it does not resolve whether 0/32 corpus adoption means the rule is ahead of the ecosystem or matches it. As of 2026-09-12 that question is unresolved and belongs to the map, not to this file.
- **The JDK's own annotation-processing security rationale (JDK-8306819) has not yet produced a comparably strict Gradle-side change.** Gradle's separation of `annotationProcessor` from the compile classpath (5.0) predates and happens to satisfy the JDK's later requirement, but Gradle made that change for dependency-hygiene reasons, not the supply-chain-execution concern the JDK ticket names. Whether Gradle needs its own explicit "processors must be named, not merely present on a classpath" hardening (distinct from the JDK-level question) is a live, separate question this dive did not investigate — flagged, not answered.
- **`org.mvnsearch:toolchains-maven-plugin`'s long-term maintenance status is not established here.** It is a single-maintainer (linux-china) third-party plugin filling a gap Apache's own tooling leaves open; Central's last-updated timestamp for its metadata (`20230409152649`, i.e. April 2023) is markedly older than the other plugins queried in this dive (all showing 2026 timestamps), even though its latest version (4.5.0) is what guava currently pins. Whether the Maven ecosystem converges on this plugin, on `setup-java`-only provisioning, or on a future first-party Apache download mechanism is unresolved as of 2026-09-12.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [bugs.openjdk.org/browse/JDK-8306819](https://bugs.openjdk.org/browse/JDK-8306819) | OpenJDK bug, origin proposal | filed pre-2023, targeted JDK 22 | The security rationale (unintentional code execution) for the entire policy change, in the proposer's own words |
| [bugs.openjdk.org/browse/JDK-8321321](https://bugs.openjdk.org/browse/JDK-8321321) | OpenJDK bug/CSR | targeted JDK 22 | The deferral step — proves the change was pulled back once before shipping |
| [bugs.openjdk.org/browse/JDK-8321319](https://bugs.openjdk.org/browse/JDK-8321319) | OpenJDK bug/CSR | targeted and shipped JDK 23 | The actual reinstatement — the exact release where `-proc:none` becomes the live default |
| [inside.java/2023/07/29/quality-heads-up](https://inside.java/2023/07/29/quality-heads-up/) | Inside.java Quality Outreach post | 2023-07-29, covers JDK 21 b29/JDK 22 b04 | Verbatim warning text, human-readable explanation of the warning-only stage |
| [inside.java/2024/06/18/quality-heads-up](https://inside.java/2024/06/18/quality-heads-up/) | Inside.java Quality Outreach post | 2024-06-18, covers JDK 23 | Confirms JDK 23 as the live-disablement release and the `-proc:full` backport list (17u/11u/8u) |
| [docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html](https://docs.oracle.com/en/java/javase/25/docs/specs/man/javac.html#option-proc) | javac tool specification, JDK 25 (current LTS) | fetched 2026-09-12 | Primary, current-release wording of `-proc` and the "Annotation Processing" section, quoted verbatim in D2 |
| [docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html](https://docs.oracle.com/en/java/javase/26/docs/specs/man/javac.html#option-proc) | javac tool specification, JDK 26 (current GA) | fetched 2026-09-12 | Confirms identical wording one release past the LTS, ruling out an LTS-only reading |
| [docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html](https://docs.oracle.com/en/java/javase/21/docs/specs/man/javac.html) | javac tool specification, JDK 21 | fetched 2026-09-12 (documents the JDK-21-era policy) | The pre-23 default-on wording, needed to show the spec text itself changed, not just a changelog entry |
| [maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html](https://maven.apache.org/plugins/maven-compiler-plugin/compile-mojo.html) | maven-compiler-plugin `compile` goal reference | fetched 2026-09-12 | `proc`/`maven.compiler.proc` parameter table: since-2.2, default, user property, and its own "must be set explicitly" note |
| [issues.apache.org/jira/browse/MCOMPILER-548](https://issues.apache.org/jira/browse/MCOMPILER-548) | Apache Jira issue | filed against 3.11, fixed 3.13.0 | The exact bug that added the `full` value to `<proc>` — closes the "since 2.2" trap |
| [maven.apache.org/guides/mini/guide-using-toolchains.html](https://maven.apache.org/guides/mini/guide-using-toolchains.html) | Official Maven toolchains guide | fetched 2026-09-12 | `toolchains.xml` format, the toolchain-aware-plugin table, and the plugin's role as selector, not provisioner |
| [raw.githubusercontent.com/apache/maven-toolchains-plugin/master/.../ToolchainMojo.java](https://raw.githubusercontent.com/apache/maven-toolchains-plugin/master/src/main/java/org/apache/maven/plugins/toolchain/ToolchainMojo.java) | Apache maven-toolchains-plugin source | current `master`, fetched 2026-09-12 | Primary proof of no `skip` parameter and no download code path |
| [github.com/linux-china/toolchains-maven-plugin (README)](https://raw.githubusercontent.com/linux-china/toolchains-maven-plugin/master/README.md) | `org.mvnsearch:toolchains-maven-plugin` source repo README | fetched 2026-09-12 | Foojay-backed download mechanism, `testJdk` element, and the real owner of `-Dtoolchain.skip` |
| [maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html](https://maven.apache.org/surefire/maven-surefire-plugin/examples/toolchains.html) | Surefire toolchains example page | fetched 2026-09-12 | `jdkToolchain` parameter and the explicit "compile and test using different jvms" use case |
| `google__guava@5fb424c43a:pom.xml` (lines 50-105, 340-480, 505-580) | Exemplar corpus, Maven-primary | measured at pinned SHA, 2026-09-12 | The one live corpus example of split compile/test toolchains, both plugins bound correctly |
| `google__guava@5fb424c43a:guava/pom.xml` (lines 55-62) | Exemplar corpus submodule | measured at pinned SHA, 2026-09-12 | Where the parent's `pluginManagement` toolchain config is actually activated |
| `google__guava@5fb424c43a:.github/workflows/ci.yml` (lines 22-56) | Exemplar corpus CI config | measured at pinned SHA, 2026-09-12 | `-Dtoolchain.skip` and `-Dsurefire.toolchain.version` in their real invocation context |
| `apache__maven@ea4a417bd2:pom.xml` (line 135) and `api/maven-api-di/pom.xml` (line 34) | Exemplar corpus, Maven-primary | measured at pinned SHA, 2026-09-12 | The only two `maven.compiler.proc` settings in the entire 32-repo corpus |
| `gradle__gradle@ea17004a31:platforms/jvm/java-compiler-worker/.../JavaCompilerArgumentsBuilder.java` (lines 108-112, 209-216) | Exemplar corpus, Gradle's own source | measured at pinned SHA, 2026-09-12 | Primary proof for the handed-back Gradle equivalence check: `-proc:none`/`-processorpath` is emitted unconditionally |
| Maven Central `maven-metadata.xml` for `maven-compiler-plugin`, `maven-toolchains-plugin`, `org.mvnsearch:toolchains-maven-plugin`, `maven-surefire-plugin` | Registry index, not vendor doc pages | queried 2026-09-12 | Per [jvm-frame.md](../jvm-frame.md) correction 38: the version of record is Central's index, never a plugin doc site's banner |
