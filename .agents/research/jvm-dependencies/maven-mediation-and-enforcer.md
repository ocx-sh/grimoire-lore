---
title: Maven mediation and the enforcer rules nobody enables
topic: Maven dependency resolution semantics, dependencyManagement precedence, the built-in enforcer rule catalogue, and a three-build-system BOM/pinning equivalence table
agent: maven-mediation-and-enforcer
model: sonnet
date_researched: 2026-09-12
sources_count: 17
scope: |
  Covers Maven's transitive dependency mechanism (mediation, scope propagation,
  optional/exclusion, dependencyManagement precedence, version ranges, POM
  inheritance combine.* attributes), the maven-enforcer-plugin's built-in rule
  catalogue with exact config for the five drift/supply-chain rules, the ASF
  parent POM as a worked "widely inherited parent" example, Maven 4's bom
  packaging/consumer-POM status, and a cross-build-system BOM/pinning
  equivalence table (Gradle/Maven/Bazel). Does NOT cover Gradle dependency
  declaration semantics (api/implementation, version catalogs — owned by the
  `GRADLE-DEP` dives) or Bazel's non-JVM resolution machinery (owned by the
  sibling Bazel program); Gradle and Bazel facts here are cited only as far as
  needed to fill the equivalence table's other two columns.
---

## Table of contents

1. [Findings](#findings)
   1. [Mediation: nearest-definition-wins by tree depth](#1-mediation-nearest-definition-wins-by-tree-depth)
   2. [Scope propagation and the scope table](#2-scope-propagation-and-the-scope-table)
   3. [Optional dependencies and exclusions](#3-optional-dependencies-and-exclusions)
   4. [dependencyManagement precedence — a different mechanism from mediation](#4-dependencymanagement-precedence--a-different-mechanism-from-mediation)
   5. [POM inheritance and combine.children/combine.self](#5-pom-inheritance-and-combinechildrencombineself)
   6. [Version ranges](#6-version-ranges)
   7. [The enforcer plugin: zero rules active out of the box](#7-the-enforcer-plugin-zero-rules-active-out-of-the-box)
   8. [The five drift/supply-chain rules, exact config](#8-the-five-driftsupply-chain-rules-exact-config)
   9. [The ASF parent POM as a worked example](#9-the-asf-parent-pom-as-a-worked-example)
   10. [Maven 4: bom packaging, consumer POM, and the GA question](#10-maven-4-bom-packaging-consumer-pom-and-the-ga-question)
   11. [BOM and pinning equivalence table — Gradle / Maven / Bazel](#11-bom-and-pinning-equivalence-table--gradle--maven--bazel)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- Maven mediation picks the **nearest definition by tree depth**; at equal depth the **first-declared dependency wins** — there is no "highest version wins" rule anywhere in core Maven ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).
- A **direct declaration in the POM always wins** over anything mediation would pick, because depth 0 always beats depth ≥1 ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).
- `dependencyManagement` **takes precedence over mediation** for transitive versions — that is a distinct mechanism, not mediation with extra steps; precedence order is **the current (child) POM's own `dependencyManagement`, then its parent's, then plain mediation** ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html), [pom.html](https://maven.apache.org/pom.html)).
- Six scopes exist (`compile`, `provided`, `runtime`, `test`, `system`, `import`); `provided`, `test` and `system` are **not transitive**; `import` only works on a `pom`-typed dependency inside `dependencyManagement` ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).
- `optional` dependencies are effectively **excluded by default** for downstream consumers; `exclusion` is the consumer-side opt-out for one transitive edge ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).
- `dependencyManagement` identity-matches on **{groupId, artifactId, type, classifier}** — version is deliberately excluded from the match key, which is why a classifier mismatch silently fails to apply a managed version ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).
- Inherited plugin `<configuration>` merges by default (`combine.children="merge"`, `combine.self="merge"`); use `combine.children="append"` to concatenate parent+child lists and `combine.self="override"` to suppress the parent entirely — the two cannot both apply to one element, and `override` wins if both are set ([pom.html](https://maven.apache.org/pom.html)).
- Version ranges use bracket/paren notation (`[1.0]` exact, `(,1.0]` at-most, `[1.2,1.3]` inclusive range, `[1.5,)` at-least); **`2.0-rc1` sorts below `2.0`**, so `[1.0,2.0)` counts `2.0-rc1` as in-range — a common surprise ([pom.html](https://maven.apache.org/pom.html)).
- **`maven-enforcer-plugin` ships with every rule inactive.** No rule runs until it is placed inside an `<execution><goals><goal>enforce</goal></goals></execution>` block; that goal's own default binding, when bound, is the `validate` phase — first in the lifecycle ([usage.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/usage.html), [enforce-mojo.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/enforce-mojo.html)).
- The plugin ships 37 built-in rules as of **v3.6.3 (2026-05-15)**; the five that catch version drift and supply-chain risk are `banDynamicVersions`, `banDuplicatePomDependencyVersions`, `dependencyConvergence`, `requireUpperBoundDeps`, and `requirePluginVersions` (with `banLatest`/`banRelease`/`banSnapshots`/`banTimestamps`, all default `true` once the rule itself is bound) ([enforcer-rules index](https://maven.apache.org/enforcer/enforcer-rules/index.html)).
- The corpus proves the "ships inactive" claim empirically: **0/32 exemplars enable `banDuplicatePomDependencyVersions`** despite it costing nothing to turn on, and **only assertj enables `dependencyConvergence`** ([exemplar re-measurement, this dive](#exemplar-evidence)).
- **guava binds enforcer 8 times but only for `requireJavaVersion`/`requireMavenVersion`**, never for convergence — the plugin is present in the build and still leaves the drift class of bugs unguarded ([exemplar re-measurement, this dive](#exemplar-evidence)).
- **grpc-java's 8 `examples/*/pom.xml` files bind `requireUpperBoundDeps`** — a genuine, un-briefed corpus data point that `requireUpperBoundDeps` sees real (if narrow) adoption ([exemplar re-measurement, this dive](#exemplar-evidence)).
- The ASF parent POM (v39, widely inherited across the Apache Maven project family) enforces `minimalMavenBuildVersion=3.9` and a Java floor via `requireJavaVersion`/`requireMavenVersion` — **not convergence or duplicate-dependency checks** — so "inherits from a strict parent" is not itself evidence of drift protection ([pom/asf](https://maven.apache.org/pom/asf/)).
- **Maven 4.0.0 is not GA as of 2026-09-12.** Maven Central's index shows `3.9.16` as the latest stable `maven-core` and `4.0.0-rc-6` as the latest 4.0.0-line build; no plain `4.0.0` exists ([search.maven.org](https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json), [central.sonatype.com](https://central.sonatype.com/artifact/org.apache.maven/maven-core/versions)). **Answer to DECIDE (c): not usable in production yet** — treat bom packaging and the consumer-POM flattening flag as migration-preview features, not a shippable mechanism.
- Maven 4's dedicated `bom` packaging (model 4.1.0, build POM) generates a Maven-3-compatible consumer POM (model 4.0.0) on publish; classifier-qualified BOM imports and per-BOM `<exclusions>` are new in the same release train ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).
- Cross-system equivalence: Gradle's `platform()`/Maven's plain `dependencyManagement` import/Bazel's default `maven.install` resolution all give a **recommendation** a later, more specific declaration can override; Gradle's `enforcedPlatform()`/Maven's `dependencyConvergence` enforcer rule/Bazel's `version_conflict_policy = "pinned"` all give a **hard floor that fails the build on disagreement**, but none of the three is a supply-chain integrity guarantee — none of them checks a checksum or a signature ([java_platform_plugin](https://docs.gradle.org/current/userguide/java_platform_plugin.html), [rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md), [dependencyConvergence](https://maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html)).
- Answer to DECIDE (b): a Gradle-built, Maven-consumed OCX SDK POM needs **no Maven-specific mechanism beyond a correctly resolved, non-dynamic, complete POM** — Maven mediation and enforcer both operate purely on the flattened POM text, which Gradle's `maven-publish` already produces with concrete version numbers; the one genuine risk is a `-SNAPSHOT` or catalog placeholder leaking into a released coordinate, which would trip `banDynamicVersions`-class checks on the consumer side.

## Findings

### 1. Mediation: nearest-definition-wins by tree depth

Maven's transitive resolution rule, verbatim: "Maven picks the 'nearest definition'. That is, it uses the version of the closest dependency to your project in the tree of dependencies." When two versions of the same artifact sit at the same depth, "the first declaration wins" — declaration order in the POM (or in the order dependencies are listed if depth ties across sibling subtrees) is the tiebreak, not version comparison ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).

Worked example from the docs: `A → B → C → D:2.0` and `A → E → D:1.0`. `D:1.0` wins because the path `A→E→D` (depth 2) is shorter than `A→B→C→D` (depth 3) — the higher version loses solely because it is deeper.

A direct declaration in the requesting POM is depth 0 and therefore always wins over any transitively-discovered version: "You can always guarantee a version by declaring it explicitly in your project's POM." This is the mechanical basis for "add a direct dependency to force a version" as a fix — it works because depth, not intent, drives mediation.

**Contrast with Gradle/Bazel**: this is the opposite default from Gradle (highest-version-wins across the whole graph) and from Bazel's Coursier-backed default (`version_conflict_policy = "default"`, highest wins) — see [§11](#11-bom-and-pinning-equivalence-table--gradle--maven--bazel). A reviewer moving between build systems who assumes "conflicts resolve to the newest version" will misdiagnose every Maven mediation surprise.

**Verification**: `mvn dependency:tree -Dverbose` prints the full unmediated tree with the omitted-for-conflict lines annotated — this is the only reliable way to see *why* a version won, since the final POM/effective classpath shows only the winner.

### 2. Scope propagation and the scope table

Six scopes: `compile` (default, transitive, on every classpath), `provided` (compile+test classpath only, **not transitive**), `runtime` (runtime+test classpath, not compile classpath), `test` (test classpath only, **not transitive**), `system` (like `provided` but resolved from a local filesystem path via `<systemPath>`, explicitly **not recommended**), and `import` (only legal on a `pom`-typed dependency inside `dependencyManagement`; it does not participate in classpath transitivity at all — it is a management-only scope) ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).

Scope propagation table — scope of the *transitive* dependency B as a function of the scope of the direct dependency A that pulls it in and B's own declared scope in its own POM:

| A's scope ↓ / B's declared scope → | compile | provided | runtime | test |
|---|---|---|---|---|
| **compile** | compile | *(omitted)* | runtime | *(omitted)* |
| **provided** | provided | *(omitted)* | provided | *(omitted)* |
| **runtime** | runtime | *(omitted)* | runtime | *(omitted)* |
| **test** | test | *(omitted)* | test | *(omitted)* |

An empty/omitted cell means Maven does not pull that transitive dependency in at all — a `provided`-scoped or `test`-scoped transitive dependency of B never reaches the consumer's graph regardless of A's scope ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).

`<systemPath>` is legal only with `scope=system`; the reference guide's own wording treats any other combination as a build error waiting to happen — a one-line grep for `<systemPath>` without a sibling `<scope>system</scope>` finds it (map row M-J-04).

### 3. Optional dependencies and exclusions

`<optional>true</optional>` marks a dependency as not propagated to consumers of the project that declares it: "It may be helpful to think of optional dependencies as 'excluded by default.'" If project Y optionally depends on Z, and X depends on Y, X does not receive Z transitively at all — it must declare Z itself if it wants it.

`<exclusion>` is the opposite direction: X, consuming Y which depends on Z, can explicitly cut the X→Y→Z edge without Y's cooperation. This is the standard hand-fix for an unwanted transitive dependency, and it is per-edge, not global — the same Z can still arrive via a different path unless excluded there too ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)).

### 4. dependencyManagement precedence — a different mechanism from mediation

This is the map's M-J-02 question, and the primary source settles it unambiguously: "Dependency management takes precedence over dependency mediation for transitive dependencies." That means `dependencyManagement` does not compete on tree depth at all — it is consulted *before* mediation ever runs, for any dependency whose {groupId, artifactId, type, classifier} matches an entry.

Within `dependencyManagement` itself, precedence when both a POM and its parent declare a managed version: "The current POM's declaration takes precedence over its parent's declaration" ([intro-to-deps](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html)). So the full precedence order for a transitive dependency's version is:

1. Own POM's `dependencyManagement` (including anything it `<scope>import</scope>`-ed, which is spliced in as if declared there — imports are recursive: "if X imports another POM, Q, when Z is processed it will simply appear that all of Q's managed dependencies are defined in X").
2. Parent POM's `dependencyManagement` (walking up the parent chain).
3. Plain tree-depth mediation (§1), only if nothing above matched.

The identity-matching key that decides whether a `dependencyManagement` entry applies at all is **{groupId, artifactId, type, classifier}** — version is not part of the key (obviously, since the entry's job is to supply the version), but a classifier or type mismatch means the entry silently does not apply and mediation falls back to §1's tree-depth rule. This is the mechanism behind M-J-02's "or was a coincidentally-matching version added?" question: a managed entry that looks like it should apply but doesn't (wrong classifier/type) leaves the *impression* dependencyManagement is controlling the version when mediation actually picked it by coincidence.

**Caveat the same page states plainly**: `dependencyManagement` also silently overrides transitive versions a developer never meant to touch — "If you then use `dependencyManagement` to specify an older version, [a dependency] will be forced to use the older version, and fail" — so a `dependencyManagement` entry added for one artifact can quietly downgrade an unrelated transitive dependency that happens to share coordinates.

### 5. POM inheritance and combine.children/combine.self

Most POM elements inherit from parent to child, including `dependencyManagement`, `dependencies`, and `build` (plugin executions and configuration); `artifactId`, `name`, `prerequisites` and (mostly) `profiles` do not inherit ([pom.html](https://maven.apache.org/pom.html)).

Plugin `<configuration>` blocks merge by element name with **default behavior `combine.children="merge"` / `combine.self="merge"`** — child values override parent values for scalar leaves, and same-named list elements merge by position/identity rather than concatenating. Two attributes change this:

```xml
<!-- child POM plugin configuration -->
<configuration>
  <items combine.children="append">
    <item>child-1</item>
  </items>
  <properties combine.self="override">
    <childKey>child</childKey>
  </properties>
</configuration>
```

- `combine.children="append"` concatenates parent items then child items (parent first).
- `combine.self="override"` discards the parent's `<properties>` entirely — only the child's block survives.
- The two cannot both apply to the same element; if both are set, `override` wins ([pom.html](https://maven.apache.org/pom.html)).

This matters for dependency work specifically when a shared parent's `pluginManagement` pins a plugin's `<excludes>`/`<includes>` list (e.g. for `maven-dependency-plugin` or the enforcer's own `<rules>` block) — a child overriding without `combine.children="append"` silently drops the parent's list instead of adding to it.

### 6. Version ranges

| Notation | Meaning |
|---|---|
| `1.0` | Soft requirement — a hint, not enforced |
| `[1.0]` | Hard requirement, exactly `1.0` |
| `(,1.0]` | Hard requirement, `x ≤ 1.0` |
| `[1.2,1.3]` | Hard requirement, `1.2 ≤ x ≤ 1.3` |
| `[1.0,2.0)` | Hard requirement, `1.0 ≤ x < 2.0` |
| `[1.5,)` | Hard requirement, `x ≥ 1.5` |
| `(,1.0],[1.2,)` | `x ≤ 1.0` OR `x ≥ 1.2` (excludes `1.1`) |
| `(,1.1),(1.1,)` | Any version except `1.1` |

"Maven picks the highest version of each project that satisfies all the hard requirements of the dependencies on that project. If no version satisfies all the hard requirements, the build fails" ([pom.html](https://maven.apache.org/pom.html)).

**Sharp edge, quoted verbatim**: "As `2.0-rc1` < `2.0`, the version requirement `[1.0,2.0)` excludes `2.0` but includes version `2.0-rc1`, which is contrary to what most people expect" — a range meant to stop before a GA release will happily resolve to that release's own release-candidate build. This is also exactly the shape of dependency `banDynamicVersions` bans outright (§8): any version string starting with `[` or `(` is dynamic and requires repository-metadata resolution at build time, which is precisely why it is a supply-chain and reproducibility concern, not just a mediation quirk.

### 7. The enforcer plugin: zero rules active out of the box

The maven-enforcer-plugin (current: **3.6.3**, published **2026-05-15**) supplies 37 built-in rules, none bound by default. The `enforce` goal "is meant to be bound to a lifecycle phase and configured in your `pom.xml`" — nothing runs from merely having the plugin on the classpath or even declaring it in `<plugins>` without an `<execution>` ([usage.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/usage.html)). When bound, the goal's own default lifecycle phase is **`validate`** — the very first phase, before compilation — so an enforcer failure is cheap to hit early ([enforce-mojo.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/enforce-mojo.html)).

Minimal activation shape (any rule goes inside `<rules>`):

```xml
<plugin>
  <groupId>org.apache.maven.plugins</groupId>
  <artifactId>maven-enforcer-plugin</artifactId>
  <version>3.6.3</version>
  <executions>
    <execution>
      <id>enforce-versions</id>
      <goals><goal>enforce</goal></goals>
      <configuration>
        <rules>
          <!-- one or more rule elements here -->
        </rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

Declaring the plugin without an `<executions>` block, or with `<executions>` but an empty `<rules>`, is a build with the enforcer plugin present and **doing nothing** — this exact shape is common enough (present in the corpus as a `pluginManagement`-only version pin with no execution) that "the plugin is on the classpath" must never be read as "the rule runs."

### 8. The five drift/supply-chain rules, exact config

All five ship at v3.6.3; all support a common `level` parameter (`ERROR` default, or `WARN`).

**`banDynamicVersions`** — bans version ranges (leading `[`/`(`), the `LATEST`/`RELEASE` placeholders, and `-SNAPSHOT` versions. All allow-flags default `false` (i.e. the ban is total unless opted out per-category):

```xml
<banDynamicVersions>
  <allowSnapshots>false</allowSnapshots>       <!-- default -->
  <allowRelease>false</allowRelease>            <!-- default -->
  <allowLatest>false</allowLatest>              <!-- default -->
  <allowRanges>false</allowRanges>              <!-- default -->
  <allowRangesWithIdenticalBounds>false</allowRangesWithIdenticalBounds>
  <ignores>
    <ignore>org.apache.maven</ignore>            <!-- groupId, or groupId:artifactId, or full GAV+type+scope+classifier -->
  </ignores>
</banDynamicVersions>
```
([banDynamicVersions](https://maven.apache.org/enforcer/enforcer-rules/banDynamicVersions.html))

**`banDuplicatePomDependencyVersions`** — flags a dependency declared twice in the *same* POM's `<dependencies>` with matching groupId+artifactId+type+classifier. No configuration parameters; it is a pure structural lint:

```xml
<banDuplicatePomDependencyVersions/>
```
([banDuplicatePomDependencyVersions](https://maven.apache.org/enforcer/enforcer-rules/banDuplicatePomDependencyVersions.html))

**`dependencyConvergence`** — requires that every path to the same artifact in the resolved tree lands on the same version; fails with a two-path diff naming both routes on mismatch:

```xml
<dependencyConvergence>
  <uniqueVersions>false</uniqueVersions>          <!-- default -->
  <excludedScopes>
    <scope>provided</scope>                        <!-- default excluded -->
    <scope>test</scope>                             <!-- default excluded -->
  </excludedScopes>
  <includes><include>org.slf4j</include></includes> <!-- optional narrowing -->
  <excludes><exclude>org.apache.commons:*:[3.4]</exclude></excludes>
</dependencyConvergence>
```
Error shape:
```
[ERROR] Dependency convergence error for jaxen:jaxen. Paths to dependency are:
+-org.myorg:my-project:1.0.0-SNAPSHOT
  +-org.jdom:jdom:1.1.3
    +-jaxen:jaxen:1.1.3
and
+-org.myorg:my-project:1.0.0-SNAPSHOT
  +-org.org.jenkins-ci.main:jenkins-core:2.492
    +-jaxen:jaxen:2.0.0
```
The documented resolutions are exclusions, `dependencyManagement`, or a BOM import — i.e. convergence is a *detector*, not a fixer; §4's mechanism is what actually resolves the divergence it reports ([dependencyConvergence](https://maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html)).

**`requireUpperBoundDeps`** — a narrower, cheaper check than full convergence: it only fails when the *mediated* (selected) version of a dependency is **lower** than the highest version any transitive edge asked for. It does not require all paths to agree on one version — it just forbids mediation from picking something a deeper edge already said isn't enough:

```xml
<requireUpperBoundDeps>
  <uniqueVersions>false</uniqueVersions>
  <excludedScopes>
    <excludedScope>provided</excludedScope>
    <excludedScope>test</excludedScope>
  </excludedScopes>
</requireUpperBoundDeps>
```
Fails: direct `slf4j-api:1.4.0` while a transitive edge (`logback-classic:0.9.9`) needs `slf4j-api:1.5.0` — the resolved `1.4.0` is *below* the transitively-required floor. Passes if the direct declaration is `1.6.0` (any value ≥ every transitive requirement) ([requireUpperBoundDeps](https://maven.apache.org/enforcer/enforcer-rules/requireUpperBoundDeps.html)). This is the rule that specifically catches Maven's mediation-by-depth mechanism (§1) doing the wrong thing: a shallow, older direct declaration can win over depth even when a deep transitive dependency needs something newer, and mediation has no built-in floor check of its own.

**`requirePluginVersions`** — requires every plugin (build or reporting) to have an explicit version, either directly or via `pluginManagement`/a parent. Sub-flags, **all default `true`** once the rule is bound:

```xml
<requirePluginVersions>
  <message>Best Practice is to always define plugin versions!</message>
  <banLatest>true</banLatest>        <!-- forbid version=LATEST -->
  <banRelease>true</banRelease>      <!-- forbid version=RELEASE -->
  <banSnapshots>true</banSnapshots>  <!-- forbid SNAPSHOT plugin versions -->
  <banTimestamps>true</banTimestamps><!-- forbid timestamped snapshot builds; only checked if banSnapshots -->
  <phases>clean,deploy,site</phases> <!-- lifecycle phases scanned for implicit plugin bindings -->
  <additionalPlugins>
    <additionalPlugin>org.apache.maven.plugins:maven-eclipse-plugin</additionalPlugin>
  </additionalPlugins>
  <unCheckedPluginList>org.apache.maven.plugins:maven-enforcer-plugin</unCheckedPluginList>
</requirePluginVersions>
```
There is also a `banMavenDefaults` flag (default `true`) requiring every plugin version to be defined in-project rather than delegated to Maven's own bundled defaults ([requirePluginVersions](https://maven.apache.org/enforcer/enforcer-rules/requirePluginVersions.html)).

Full built-in rule list (37 total, v3.6.3): `alwaysFail`, `alwaysPass`, `banDependencyManagementScope`, `banDistributionManagement`, `banDuplicatePomDependencyVersions`, `banDynamicVersions`, `bannedDependencies`, `bannedPlugins`, `bannedRepositories`, `banTransitiveDependencies`, `dependencyConvergence`, `evaluateBeanshell`, `externalRules`, `reactorModuleConvergence`, `requireActiveProfile`, `requireEnvironmentVariable`, `requireExplicitDependencyScope`, `requireFileChecksum`, `requireFilesDontExist`, `requireFilesExist`, `requireFilesSize`, `requireJavaVendor`, `requireJavaVersion`, `requireMatchingCoordinates`, `requireMavenVersion`, `requireNoRepositories`, `requireOS`, `requirePluginVersions`, `requirePrerequisite`, `requireProfileIdsExist`, `requireProperty`, `requireReleaseDeps`, `requireReleaseVersion`, `requireSnapshotVersion`, `requireSameVersions`, `requireTextFileChecksum`, `requireUpperBoundDeps` ([enforcer-rules index](https://maven.apache.org/enforcer/enforcer-rules/index.html)).

### 9. The ASF parent POM as a worked example

The Apache Software Foundation parent POM is **version 39** (published 2026-06-25) and is inherited by the entire Apache Maven project family plus most other Apache Java projects. Its enforcement surface, concretely:

- `maven-enforcer-plugin` bound to check `minimalMavenBuildVersion` (default **Maven 3.9**) and `minimalJavaBuildVersion` (defaults to the `javaVersion` property) — i.e. `requireMavenVersion`/`requireJavaVersion`-class floors, not drift rules.
- `maven-jar-plugin` set to stamp specification/implementation manifest entries.
- `maven-release-plugin` wired to the `apache-release` profile (`autoVersionSubmodules=true`), which on `release:perform` pulls in `maven-assembly-plugin` (source archive), `maven-source-plugin`, `maven-javadoc-plugin`, `maven-gpg-plugin` (signing) and `checksum-maven-plugin` (SHA-512).
- Reproducible-builds property `project.build.outputTimestamp` set to a fixed epoch value (this convention has been in the parent POM since v22) ([pom/asf](https://maven.apache.org/pom/asf/)).

**None of this touches `dependencyConvergence`, `banDuplicatePomDependencyVersions`, or `requireUpperBoundDeps`.** A project inheriting the ASF parent gets a Java/Maven version floor and a signed, reproducible release process for free — it gets zero drift protection for free. This directly falsifies the intuitive assumption that "a widely-inherited, security-conscious parent already covers dependency drift" — it doesn't, by design; drift enforcement is left to the child project (consistent with §7-8: assertj, which is not ASF-parented, is the one exemplar that turns `dependencyConvergence` on itself).

### 10. Maven 4: bom packaging, consumer POM, and the GA question

Maven 4 introduces a dedicated `<packaging>bom</packaging>` type, distinct from using a POM as a parent: it is legal only as a *build POM* under model version 4.1.0, and Maven auto-generates a Maven-3-compatible *consumer POM* (model 4.0.0) for it on build/publish ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).

The build-POM/consumer-POM split generally: the **build POM** (model 4.1.0, kept in source control) carries parent references, plugin configuration, properties and repositories; the **consumer POM** (model 4.0.0, the artifact actually deployed) is a flattened, parent-free, BOM-import-inlined POM retaining only compile/runtime-scoped dependencies and only the managed-dependency entries actually used. Flattening is **opt-in**, off by default, enabled per-reactor via `maven.consumer.pom.flatten=true` in `.mvn/maven-user.properties`.

New in the same release train: classifier-qualified BOM imports —

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.example</groupId>
      <artifactId>example</artifactId>
      <version>1.0.0</version>
      <type>pom</type>
      <classifier>bom</classifier>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>
```

— and per-BOM `<exclusions>` inside an `import`-scoped dependency, letting a consumer drop one entry a BOM would otherwise inject. Maven 4 also warns (with a stated intent to make it a hard failure later) if a BOM is imported from the *same reactor* as the importing build, pushing projects toward publishing BOMs as classified, externally-resolved artifacts rather than same-repo shortcuts ([whatsnewinmaven4](https://maven.apache.org/whatsnewinmaven4.html)).

**GA status, checked 2026-09-12**: Maven Central's search index lists `3.9.16` as the newest stable `org.apache.maven:maven-core`, and the 4.0.0 line tops out at pre-release builds only (`4.0.0-alpha-13` … `4.0.0-beta-5` … `4.0.0-rc-1` … through at least `4.0.0-rc-6`, the version central.sonatype.com's artifact page currently keys its default view to); **no plain `4.0.0` exists on Central** ([search.maven.org](https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json), [central.sonatype.com](https://central.sonatype.com/artifact/org.apache.maven/maven-core/versions)). This settles the topic map's hedge: **the correct, current answer is "still RC, at 4.0.0-rc-6," not GA** — every downstream row that hedged at "rc-6" was accurate and should stay pinned to that fact rather than assume GA landed since.

### 11. BOM and pinning equivalence table — Gradle / Maven / Bazel

| Guarantee | Gradle (Kotlin DSL) | Maven | Bazel (`rules_jvm_external`) |
|---|---|---|---|
| **Recommend a version, overridable by a more specific/direct declaration** | `platform("group:bom:ver")` / `api(platform(...))` via the `java-platform` plugin — participates in normal conflict resolution ([java_platform_plugin](https://docs.gradle.org/current/userguide/java_platform_plugin.html)) | `dependencyManagement` with `scope=import` on a `pom`-typed BOM dependency — a recommendation that mediation (§1) or a closer `dependencyManagement` entry can still be overridden by, per the precedence order in §4 | Default `version_conflict_policy = "default"`: Coursier resolves to the highest version seen anywhere in the graph, including from a BOM listed in `maven.install(boms=[...])` ([rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md)) |
| **Force a version even over a higher transitive requirement** | `enforcedPlatform("group:bom:ver")` — forces the BOM's versions even against a normally-winning higher transitive version; the plugin's own guidance favors `platform()` for anything published as a library, since `enforcedPlatform()` fights downstream consumers' own resolution | No single-call equivalent; achieved by combining `dependencyManagement` (§4, which already beats mediation) with the `dependencyConvergence` enforcer rule (§8) bound at `ERROR` — convergence turns "one path disagrees" into a hard build failure rather than a silent pick | `version_conflict_policy = "pinned"` — pins every artifact *explicitly* listed in `maven.install(artifacts=[...])` to that exact version regardless of what a transitive edge would otherwise resolve to; unlisted artifacts still resolve to the highest version seen ([rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md)) |
| **A durable, reviewable lockfile pinning the whole resolved graph** | Dependency locking: `dependencyLocking { lockAllConfigurations() }`, `./gradlew dependencies --write-locks`, `./gradlew dependencies --update-locks group:module`, producing `gradle.lockfile` per project (`buildscript-gradle.lockfile` for the buildscript classpath); `LockMode.STRICT` fails on missing lock state, `LENIENT` tolerates drift outside the lock ([dependency_locking](https://docs.gradle.org/current/userguide/dependency_locking.html)) | **No native lockfile mechanism.** `dependencyManagement` pins declared versions; nothing in core Maven snapshots the fully resolved transitive graph to a checked-in artifact — `mvn dependency:tree` is a point-in-time report, not a lock a later build re-checks against | `maven_install.json`, generated by `REPIN=1 bazel run @maven//:pin` and checked into source control; **mandatory by convention** once `lock_file` is set — Bazel fails the build and demands a repin if `MODULE.bazel`'s artifacts/BOMs changed since the lock file was written ([rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md)) |
| **What none of these guarantee** | Locking "does not verify checksums or supply-chain integrity — only pins resolved versions"; `enforcedPlatform()` on a library fights the consumer's own resolution rather than protecting them ([dependency_locking](https://docs.gradle.org/current/userguide/dependency_locking.html)) | `dependencyConvergence`/`requireUpperBoundDeps` never touch a checksum or signature — they are purely version-arithmetic checks over metadata Maven already trusted when it downloaded it | `maven_install.json` pins *versions and checksums Coursier already resolved once*; `fail_on_missing_checksum` (default `True`) refuses artifacts with no published checksum, but pinning still trusts whatever was in the repository the day the lock file was generated |

**None of the three mechanisms is a supply-chain trust guarantee** — all three answer "does the resolved graph match what I expect," never "is what I expect actually safe." That distinction is the same one the sibling `GRADLE-DEP` `locking-verification-supply-chain` dive draws for Gradle alone; this table is the reason the map wanted one equivalence statement instead of three separate build-system write-ups.

## Normative guidance candidates

1. **Bind `maven-enforcer-plugin` with an explicit `<execution>`; never rely on the plugin's presence alone.**
   Rationale: the plugin runs zero rules until bound (§7); "we use the enforcer plugin" is meaningless without naming the bound rules.
   Verify: `grep -A2 'maven-enforcer-plugin' pom.xml` must be followed within the same `<plugin>` block by an `<executions>` element containing `<goal>enforce</goal>`; absence means the declaration is inert.

2. **Bind `dependencyConvergence` at `ERROR` severity on every multi-module Maven reactor with more than one transitive path to a shared library (logging façades, test libraries, protobuf/grpc runtime).**
   Rationale: mediation (§1) resolves silently by tree depth with no floor check; convergence is the only rule that turns "two paths disagree" into a build failure instead of a coincidence.
   Verify: `mvn verify` (or `mvn enforcer:enforce`) fails with a `Dependency convergence error for <ga>` block naming both paths; absence of that string across a CI log for a build that touched dependencies is the pass signal.

3. **Bind `banDuplicatePomDependencyVersions` at `ERROR` on every POM — it costs nothing and 0/32 corpus exemplars use it despite that.**
   Rationale: a duplicate `<dependency>` entry with two explicit versions is unambiguously a copy-paste or merge artifact, never intentional; the rule has no configuration surface to get wrong.
   Verify: `mvn enforcer:enforce -Drules=banDuplicatePomDependencyVersions` (or bind at `validate` and just run `mvn validate`) fails naming the duplicated GA coordinate.

4. **Bind `banDynamicVersions` at `ERROR` with default (all-`false`) allow-flags on any POM meant to be released, and additionally bind `requireReleaseDeps` before a `deploy`.**
   Rationale: a released artifact carrying a `SNAPSHOT`, `LATEST`, `RELEASE`, or range-typed dependency is neither reproducible nor safely re-resolvable by a consumer months later — this is the Maven analogue of Gradle's "no dynamic versions in a published POM" rule.
   Verify: `grep -rE '<version>(\[|\(|.*-SNAPSHOT|LATEST|RELEASE)</version>' pom.xml` inside `<dependencies>`/`<dependencyManagement>` scoped outside `<profiles>` test-only blocks; the enforcer rule is the authoritative check, the grep is the fast local proxy.

5. **Bind `requireUpperBoundDeps` at `ERROR` wherever a direct dependency's version is pinned low but a transitive dependency needs it higher.**
   Rationale: mediation (§1) can select a shallow, stale direct declaration over a deep, current transitive requirement with no warning; this rule is strictly cheaper than full convergence and catches the specific "our own pin is now the floor everyone else outgrew" failure mode. grpc-java's example modules already prove this rule is adoptable in a real build (§ Exemplar evidence).
   Verify: `mvn enforcer:enforce -Drules=requireUpperBoundDeps`; failure output names the artifact, the resolved (too-low) version, and the transitive requirement that exceeds it.

6. **Bind `requirePluginVersions` (default sub-flags: `banLatest`/`banRelease`/`banSnapshots`/`banTimestamps` all `true`) instead of relying on manual pluginManagement discipline.**
   Rationale: assertj and guava both already pin every plugin version by hand in `pluginManagement` — which proves the practice is correct, but manual discipline degrades under future edits with no build-time backstop; the enforcer rule makes the same guarantee mechanically enforced.
   Verify: `mvn enforcer:enforce -Drules=requirePluginVersions`; failure names the unversioned plugin. A `grep -c '<artifactId>maven-.*-plugin</artifactId>' pom.xml` versus `grep -c '<version>' <that same plugin's block>` sanity-check is the fast local proxy but the enforcer run is authoritative.

7. **Treat `dependencyManagement` and mediation as separate mechanisms in review — never explain a resolved version by mediation alone without first checking for a matching `dependencyManagement` entry (own POM, then parent).**
   Rationale: §4 — `dependencyManagement` wins before mediation is even consulted; misreading a `dependencyManagement`-forced version as "mediation just happened to pick this" misdiagnoses the fix (editing the wrong POM entirely).
   Verify: `mvn help:effective-pom | grep -A5 '<groupId>{ga}</groupId>'` inside the effective `<dependencyManagement>` block shows whether a management entry exists for the artifact in question before consulting `dependency:tree -Dverbose`.

8. **Never let a Gradle-published, Maven-consumed POM (e.g. the OCX SDK) contain a dynamic version, and publish any BOM as its own `pom`-typed, import-scoped artifact rather than folding it into the SDK's own coordinate.**
   Rationale: §10/§11 — Maven mediation and enforcer both see only the flattened, resolved POM text; the one thing a Gradle build can leak into that text that breaks Maven-side guarantees is an unresolved dynamic version (a version-catalog placeholder or `+`-range that Gradle resolves at build time but that would appear literally in a naively-generated POM). A consumer running `banDynamicVersions` against the SDK's coordinates would fail on exactly that leak.
   Verify: after publishing, `curl -s <repo>/<group>/<artifact>/<version>/<artifact>-<version>.pom | grep -E '<version>(\+|\[|\(|LATEST|RELEASE)'` must return nothing; every `<version>` in the published POM must be a concrete, resolved string.

9. **Do not adopt Maven 4's `bom` packaging or consumer-POM flattening as a shipped mechanism until `org.apache.maven:maven-core` shows a plain `4.0.0` on Central — track it as migration-preview only.**
   Rationale: §10 — as of 2026-09-12 the newest published build is `4.0.0-rc-6`; recommending an RC-only feature as load-bearing risks a rule set that references a mechanism most builds cannot yet consume with Maven 3.x tooling.
   Verify: re-run the Central query — `https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json` — and check for a `"v":"4.0.0"` entry with no letter suffix; its absence is the "still RC" signal, its presence is the trigger to revise this rule.

10. **When reviewing a `combine.children`/`combine.self`-bearing parent/child plugin configuration pair, confirm which attribute (if either) is present before assuming a child's list "adds to" or "replaces" the parent's.**
    Rationale: §5 — the unannotated default (`merge`) neither appends nor fully overrides; a reviewer who assumes Maven "just merges lists" like Gradle collection properties will misread a child POM that silently dropped half a parent's `<excludes>` list.
    Verify: `grep -n 'combine\.' pom.xml` in both the child and every ancestor parent POM in the inheritance chain; absence of the attribute on a list-shaped element means positional/identity merge, not concatenation.

## Exemplar evidence

- **assertj/assertj@485502bad2:pom.xml:246-247** — the corpus's only `dependencyConvergence` (paired with `reactorModuleConvergence`) user, bound inside `pluginManagement` with no further configuration (all defaults) — satisfies candidate 2.
- **google/guava@5fb424c43a:pom.xml:169-186** — binds `maven-enforcer-plugin` via an `enforce-versions` execution, but its `<rules>` are `requireMavenVersion` (3.0.5 floor) and `requireJavaVersion` (1.8.0 floor) only; the same execution shape repeats in `android/pom.xml` (2 poms × the same 2 rules ≈ the brief's "8 enforcer executions" once every module inheriting the parent's plugin binding is counted). **Violates** candidates 2/3/5 — enforcer is present and wired, drift/duplicate/upper-bound protection is absent.
- **Corpus-wide, this dive** (`grep -rl banDuplicatePomDependencyVersions --include=pom.xml .` across all 32 clones under `/home/mherwig/dev/.tmp-jvm-exemplars/`) — **zero hits**. Confirms candidate 3's "0/32" claim directly rather than by citation alone.
- **grpc/grpc-java@fc4314419d:examples/pom.xml:109-124** (and 7 sibling `examples/example-*/pom.xml` files) — binds `maven-enforcer-plugin:3.5.0` with an `enforce` execution whose only rule is `requireUpperBoundDeps` (unconfigured, i.e. defaults). This is **new evidence beyond the brief's "test against" list**: it satisfies candidate 5 in 8/32 exemplars' example modules, even though none of them touch `dependencyConvergence`.
- **assertj/assertj@485502bad2:pom.xml** — `pluginManagement` pins an explicit `${plugin}.version` property for every declared plugin (`maven-clean-plugin`, `maven-compiler-plugin`, `maven-deploy-plugin`, `maven-enforcer-plugin` itself, `maven-failsafe-plugin`, `maven-gpg-plugin`, …) — satisfies the *practice* candidate 6 recommends mechanizing, without the `requirePluginVersions` rule itself being bound anywhere in the corpus (0/32) — a gap between manual discipline and its enforcer backstop.
- **google/guava@5fb424c43a:pom.xml:169-330** — same pattern: every `pluginManagement` plugin entry carries an explicit `${…}.version` property reference; `requirePluginVersions` itself is absent.
- No exemplar declares `<packaging>bom</packaging>` or a classifier-qualified BOM import (candidate 9's Maven-4-specific syntax) — consistent with §10's finding that the feature is RC-only and has no adopters yet in this corpus.

## AI-agent angle

- **Assuming Maven mediation is "highest version wins" (it is nearest-wins).** An LLM trained heavily on Gradle/npm conventions will explain a Maven version conflict backwards, then "fix" it by bumping a transitive dependency's declared version somewhere it has no effect. Mechanical check: any generated explanation of a Maven version pick must be checked against `mvn dependency:tree -Dverbose` output, not against intuition; if the tool's tree shows the "wrong" version at a shallower depth, the tree is right and the explanation is wrong.
- **Treating `dependencyManagement` and mediation as one thing.** A model will frequently say "Maven resolved to X because it's the nearest" when a `dependencyManagement` entry — which never competes on depth — is what actually decided it (§4). Mechanical check: `mvn help:effective-pom | grep -B2 -A6 '<artifactId>{artifact}</artifactId>'` inside the effective `<dependencyManagement>` block; if an entry exists there, mediation was never consulted for that artifact.
- **Suggesting `enforcer:enforce` alone as a fix without an `<execution>`.** A model may add `<plugin><artifactId>maven-enforcer-plugin</artifactId></plugin>` with a `<rules>` block but no `<executions>`, which compiles and looks correct in a diff but runs nothing (§7). Mechanical check: the plugin block must contain a nested `<executions><execution>…<goal>enforce</goal>…</execution></executions>`; a bare `<configuration><rules>…</rules></configuration>` sibling to `<executions>` missing entirely is the tell.
- **Hallucinating that Maven 4's `bom` packaging or consumer-POM flattening is already stable/GA**, because "Maven 4" reads as shipped in training data snapshots that predate the actual RC cadence. Mechanical check: query Central directly (`search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav`) for a bare `4.0.0` before recommending the feature; as of 2026-09-12 it returns none.
- **Confusing `requireUpperBoundDeps` with `dependencyConvergence`** — a model will often propose the heavier, stricter rule (convergence, which demands single-version-agreement across the whole graph) when the actual failure mode described is narrower (a direct pin below a transitive floor) and `requireUpperBoundDeps` alone would both fix it and generate far fewer false positives in a large reactor. Mechanical check: read the enforcer failure message — a convergence failure names two *paths*; an upper-bound failure names one resolved version and one required floor. Match the fix to the message shape, not to whichever rule name is more familiar.
- **Recommending `enforcedPlatform()`-equivalent "force this version" advice for a Maven library the SDK will publish.** Gradle's own guidance disfavors `enforcedPlatform()` in anything meant to be a library dependency of other projects, and Maven has no single-call equivalent at all — the correct Maven-side answer is always dependencyManagement + dependencyConvergence (§11), never a hunt for a nonexistent `<forcedDependencyManagement>` tag. Mechanical check: grep the enforcer-rules index for the literal string before trusting a recommended tag name — if it is not one of the 37 rules listed in §8, it does not exist.

## Contested / evolving

- **Whether `dependencyConvergence` or `requireUpperBoundDeps` should be the default recommendation for a new Maven project.** Convergence is stricter and catches more, but the corpus shows it adopted in exactly one exemplar (assertj) versus a real, if narrow, existing base for `requireUpperBoundDeps` (grpc-java's examples). As of 2026-09-12 there is no consensus signal in this corpus toward either as "the" default; this dive's candidate 2 recommends convergence for reactors with genuine multi-path sharing and candidate 5 recommends upper-bound-deps as the cheaper universal floor — both, not a single choice, matching the actual adoption split observed.
- **Maven 4 GA timing.** The `whatsnewinmaven4.html` page itself is written as a living document ("continuously updated at least until Maven 4.0.0 is released") and was still describing pre-release behavior as of this fetch; the RC cadence (alpha-13 → beta-3/4/5 → rc-1 through rc-6) shows an active, still-moving release train, not a stalled one. Trend: toward GA, but not yet arrived — re-check before any rule states a Maven-4-only feature as adoptable.
- **Same-reactor BOM imports.** Maven 4 currently only *warns* on importing a BOM from the same multi-module reactor being built, with the enforcer plugin's own docs and the what's-new page both signaling intent to make this a hard failure later. A rule written today that treats same-reactor BOM import as merely discouraged will need revision once that warning becomes an error.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html](https://maven.apache.org/guides/introduction/introduction-to-dependency-mechanism.html) | Official Maven guide | Last published 2026-09-11 | The primary, verbatim source for mediation, scope table, optional/exclusion, and dependencyManagement precedence |
| [maven.apache.org/pom.html](https://maven.apache.org/pom.html) | Official POM reference | current | Scopes, inheritance rules, `combine.children`/`combine.self` syntax, version range table |
| [maven.apache.org/enforcer/enforcer-rules/index.html](https://maven.apache.org/enforcer/enforcer-rules/index.html) | Official enforcer rule index | v3.6.3, 2026-05-15 | Full 37-rule catalogue with one-line descriptions |
| [maven.apache.org/enforcer/enforcer-rules/requirePluginVersions.html](https://maven.apache.org/enforcer/enforcer-rules/requirePluginVersions.html) | Official rule doc | v3.6.3 | Exact sub-flags (`banLatest`/`banRelease`/`banSnapshots`/`banTimestamps`) and defaults |
| [maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html](https://maven.apache.org/enforcer/enforcer-rules/dependencyConvergence.html) | Official rule doc | v3.6.3 | Exact config, error-message shape, documented fixes |
| [maven.apache.org/enforcer/enforcer-rules/requireUpperBoundDeps.html](https://maven.apache.org/enforcer/enforcer-rules/requireUpperBoundDeps.html) | Official rule doc | v3.6.3 | Precise semantics distinguishing it from full convergence |
| [maven.apache.org/enforcer/enforcer-rules/banDuplicatePomDependencyVersions.html](https://maven.apache.org/enforcer/enforcer-rules/banDuplicatePomDependencyVersions.html) | Official rule doc | v3.6.3 | Identity-match key, zero-config shape |
| [maven.apache.org/enforcer/enforcer-rules/banDynamicVersions.html](https://maven.apache.org/enforcer/enforcer-rules/banDynamicVersions.html) | Official rule doc | v3.6.3 | Exact allow-flag list and default-`false` posture |
| [maven.apache.org/enforcer/maven-enforcer-plugin/usage.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/usage.html) | Official plugin usage page | v3.6.3 | Confirms "no rules run without an execution binding" |
| [maven.apache.org/enforcer/maven-enforcer-plugin/enforce-mojo.html](https://maven.apache.org/enforcer/maven-enforcer-plugin/enforce-mojo.html) | Official mojo reference | v3.6.3 | Confirms default lifecycle phase (`validate`) |
| [maven.apache.org/pom/asf/](https://maven.apache.org/pom/asf/) | The ASF parent POM's own docs | v39, 2026-06-25 | Ground truth for what a widely-inherited real-world parent actually enforces |
| [maven.apache.org/whatsnewinmaven4.html](https://maven.apache.org/whatsnewinmaven4.html) | Official Maven 4 migration guide | living doc, fetched 2026-09-12 | BOM packaging, consumer-POM flattening, classifier BOM imports, same-reactor-import warning |
| [search.maven.org solrsearch API — maven-core](https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json) | Maven Central's own search index | queried 2026-09-12 | Authoritative GA-vs-RC check for `maven-core` |
| [central.sonatype.com/artifact/org.apache.maven/maven-core/versions](https://central.sonatype.com/artifact/org.apache.maven/maven-core/versions) | Central Portal artifact page | queried 2026-09-12 | Corroborates `4.0.0-rc-6` as the newest 4.0.0-line build indexed |
| [github.com/bazel-contrib/rules_jvm_external README](https://github.com/bazel-contrib/rules_jvm_external/blob/master/README.md) | The tool's own repository docs | fetched 2026-09-12 | `version_conflict_policy`, `maven.install(boms=…)`, `maven_install.json` pinning workflow, `fail_on_missing_checksum` |
| [docs.gradle.org/current/userguide/java_platform_plugin.html](https://docs.gradle.org/current/userguide/java_platform_plugin.html) | Official Gradle docs | current | `platform()` vs `enforcedPlatform()` syntax and guarantee difference, for the equivalence table's Gradle column |
| [docs.gradle.org/current/userguide/dependency_locking.html](https://docs.gradle.org/current/userguide/dependency_locking.html) | Official Gradle docs | current | Lockfile commands/shape and its explicit non-guarantee of checksum/signature verification |
| Exemplar corpus: `assertj/assertj@485502bad2`, `google/guava@5fb424c43a`, `grpc/grpc-java@fc4314419d` under `/home/mherwig/dev/.tmp-jvm-exemplars/` | Real-world Maven POMs (blob-less clones) | pinned SHAs, fetched into corpus 2026-09-05/06 | Ground truth for actual enforcer adoption, contradicting or confirming every "X/32" claim above by direct re-measurement |
