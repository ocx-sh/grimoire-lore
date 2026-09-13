---
title: Maven Dependencies, Mediation and Enforcer
summary: The MVN-DEP family: which version a POM actually resolves, why dependencyManagement decides before mediation, binding enforcer so that it runs at all, and keeping a published POM concrete
---

# Maven Dependencies, Mediation and Enforcer

Owns what a Maven build resolves and whether the POM that declared it can be
trusted: scopes, `dependencyManagement` precedence, mediation by depth, the
enforcer rules that catch drift, and the concreteness of a POM you publish. It
does not own the lifecycle a plugin binds to, compiler and toolchain settings,
or the files under `.mvn` (family `MVN-BUILD`, in this rule's
lifecycle-and-plugins file), signing and Central Portal staging (family
`MVN-PUB`, in publishing), or an Ivy or Ant dependency graph (family `MVN-ANT`,
in ant-legacy). Gradle answers the same questions differently and its answers
are family `GRADLE-DEP` in the `gradle-build` rule, which never loads on a
`pom.xml`.

Contents: [Why a Version Won](#why-a-version-won) ·
[Enforcer Runs Nothing Until It Is Bound](#enforcer-runs-nothing-until-it-is-bound) ·
[What the POM Text Says](#what-the-pom-text-says) ·
[What the Published POM Says](#what-the-published-pom-says) ·
[The Control Maven Does Not Have](#the-control-maven-does-not-have) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Why a Version Won

Two commands answer every "why did Maven pick that version" question, and they
answer it in this order. Maven 3.9.x, verified 2026-09-12.

```bash
mvn help:effective-pom         # MVN-DEP-01: what dependencyManagement decided before mediation ran
mvn dependency:tree -Dverbose  # MVN-DEP-02: which declaration won on depth, with the omitted-for-conflict lines
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-DEP-01 | Before explaining any Maven version pick by mediation, confirm that no `dependencyManagement` entry matches the coordinate. Check the module's own POM first, then each parent up the chain. | Dependency management is consulted *before* mediation for transitive dependencies, so a managed version never competes on depth at all. Conflating the two misdiagnoses the conflict and then edits a POM that has no effect on it. The match key is groupId, artifactId, type and classifier together, so a classifier or type mismatch silently fails to apply and looks like mediation. | `mvn help:effective-pom`, then read the effective `dependencyManagement` for that coordinate. A match means mediation was never consulted and the tree depths are irrelevant. No match means mediation decided it. Neither outcome is a pass on its own: the finding is a mediation explanation offered without this command having been run. | MUST |
| MVN-DEP-02 | Force a version with a direct declaration in the module that needs it, or with `dependencyManagement`. Never by editing the version a deeper transitive declares. Maven mediates by nearest definition by tree depth, with the first declaration breaking ties, never by highest version. | Depth 0 always beats depth 1 or more, so a direct declaration is the mechanical fix and a deeper edit changes nothing. Maven's own documented example has `D:1.0` at depth 2 beating `D:2.0` at depth 3, the reverse of what Gradle and npm intuition predicts. | `mvn dependency:tree -Dverbose`. The `omitted for conflict with` lines name the winner and the loser. A resolved version at a *shallower* depth than the one expected means the tree is right and the explanation was wrong. Empty output means the command did not run against the module in question, never that there is no conflict. | MUST |

## Enforcer Runs Nothing Until It Is Bound

`maven-enforcer-plugin` 3.6.3 (released 2026-05-15, verified 2026-09-12) ships
37 built-in rules and **zero** of them active. Once an execution exists, the
`enforce` goal binds to `validate` by default, so the whole section costs one
cheap phase:

```bash
mvn validate                                         # every bound execution, before compile
mvn enforcer:enforce -Drules=requireUpperBoundDeps   # try one rule without editing the POM
grep -rnE -e 'version>(LATEST|RELEASE)' -e 'version>[][(]' -e 'SNAPSHOT' --include='pom.xml' .  # MVN-DEP-04 proxy
```

**Pinned default:** `banDynamicVersions`,
`banDuplicatePomDependencyVersions` and `requireUpperBoundDeps` on every
reactor, plus `dependencyConvergence` only where two or more paths genuinely
reach the same library. This encodes an agreement rather than a derivation. An
adopter overrides the set once, in their own parent POM, never per module.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-DEP-03 | Bind `maven-enforcer-plugin` with an explicit execution declaring the `enforce` goal. Never treat the plugin's presence, or a rules block with no execution, as enforcement. **pinned** | Nothing runs until the goal is bound, so a POM can carry a full rule list, review clean, and enforce none of it. A `pluginManagement`-only version pin is inert for the same reason. | `grep -rn -A6 -e 'maven-enforcer-plugin' --include='pom.xml' .`, then confirm each hit's plugin element contains an executions block whose goal is `enforce`. Empty output, or output with no executions block, is the finding rather than the pass. | MUST |
| MVN-DEP-04 | Bind `banDynamicVersions` with its default all-false allow flags on any POM that is released. | A released artifact carrying a range, `LATEST`, `RELEASE` or a `-SNAPSHOT` is neither reproducible nor safely re-resolvable months later. Range notation has a sharp edge that reads backwards: `2.0-rc1` sorts below `2.0`, so the range `[1.0,2.0)` includes the release candidate. | `mvn enforcer:enforce -Drules=banDynamicVersions`. A successful build is the pass and a failure names the offending coordinate. The gate block's third command is the fast local proxy, and empty output is the pass there. | MUST |
| MVN-DEP-05 | Bind `banDuplicatePomDependencyVersions`, which has no configuration, on every POM. | A dependency declared twice in one dependencies block with the same groupId, artifactId, type and classifier is always a copy-paste or a merge artifact. The rule has no configuration surface to get wrong and 0 of the 32 corpus exemplars enable it anyway. | `mvn enforcer:enforce -Drules=banDuplicatePomDependencyVersions`. A successful build is the pass and a failure names the duplicated coordinate. | MUST |
| MVN-DEP-06 | Bind `requireUpperBoundDeps` on every reactor as the universal floor. Add `dependencyConvergence` only where two or more paths genuinely reach the same library, such as a logging facade, a test library, or a protobuf or gRPC runtime. | Mediation has no floor check of its own, so a shallow stale direct pin beats a deeper edge that needs something newer. `requireUpperBoundDeps` catches exactly that and nothing else, which means far fewer false positives in a large reactor than full convergence, and it has a real adoption base (grpc-java's example POMs) where convergence has a single one (assertj). | `mvn enforcer:enforce -Drules=requireUpperBoundDeps`. A successful build is the pass. A failure names one resolved version and one required floor, whereas a `dependencyConvergence` failure names two *paths*: match the fix to the message shape, not to the more familiar rule name. | SHOULD |
| MVN-DEP-07 | Bind `requirePluginVersions`, whose `banLatest`, `banRelease`, `banSnapshots` and `banTimestamps` sub-flags all default to true, rather than relying on manual `pluginManagement` discipline. | Pinning every plugin version by hand is the right practice and two large exemplars do it, but manual discipline degrades under future edits with no build-time backstop, and 0 of 32 bind the rule that would hold it. | `mvn enforcer:enforce -Drules=requirePluginVersions`. A successful build is the pass and a failure names the unversioned plugin. | SHOULD |

```xml
<!-- wrong: a complete rule list that reviews clean and runs nothing -->
<plugin>
  <artifactId>maven-enforcer-plugin</artifactId>
  <configuration><rules><banDynamicVersions/></rules></configuration>
</plugin>
```

```xml
<!-- right: the goal is bound, so mvn validate fails on a violation -->
<plugin>
  <artifactId>maven-enforcer-plugin</artifactId>
  <executions>
    <execution>
      <id>enforce-dependency-hygiene</id>
      <goals><goal>enforce</goal></goals>
      <configuration>
        <rules><banDynamicVersions/><banDuplicatePomDependencyVersions/><requireUpperBoundDeps/></rules>
      </configuration>
    </execution>
  </executions>
</plugin>
```

## What the POM Text Says

Two defects that no command reports, because both are legal POMs. Maven 3.9.x,
verified 2026-09-12.

```bash
grep -rn -B4 -e 'systemPath' --include='pom.xml' .                      # MVN-DEP-08
grep -rn -e 'combine.children' -e 'combine.self' --include='pom.xml' .  # MVN-DEP-09
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-DEP-08 | Never declare a `systemPath` without the matching `system` scope, and prefer declaring neither. `system` scope resolves from a local filesystem path. | The POM reference calls the mismatch a build error waiting to happen, and `system` scope is the one scope that makes a build depend on the layout of the machine that runs it. Nothing downloads the artifact, so the build works for its author and for nobody else. | The `systemPath` grep above. Empty output is the pass. Any hit is a review item, and a hit whose dependency element carries no `system` scope is the finding. | MUST |
| MVN-DEP-09 | Before assuming a child POM's plugin configuration list adds to or replaces the parent's, check that element for `combine.children` or `combine.self` in the child and in every ancestor. | The unannotated default is neither append nor override: elements merge positionally by identity, so a child can silently drop half of a parent's excludes list. `combine.children="append"` concatenates, `combine.self="override"` discards the parent, and where both are set `override` wins. A reviewer carrying Gradle collection-property intuition misses this every time. | The `combine.` grep above. Empty output is not a pass here, it is the answer: no annotation means the positional merge applies, so read the merged result in `mvn help:effective-pom` before claiming the child added anything. | CONSIDER |

## What the Published POM Says

The published POM is the only Maven surface a library inherits when it is built
by another tool and consumed by Maven, so it is checked against the artifact the
repository serves, not against the working tree.

```bash
GROUP_PATH=com/example; ART=example-sdk; VER=1.4.0      # MVN-DEP-10: bind the coordinate first
curl -sSf -o published.pom "https://repo1.maven.org/maven2/$GROUP_PATH/$ART/$VER/$ART-$VER.pom"
grep -nE -e 'version.(LATEST|RELEASE)' -e 'version.[][(]' -e 'SNAPSHOT' published.pom

# MVN-DEP-11: is there a plain 4.0.0 on Central yet?
curl -sS 'https://search.maven.org/solrsearch/select?q=g:org.apache.maven+AND+a:maven-core&core=gav&rows=5&wt=json'
```

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| MVN-DEP-10 | Ensure every version in a POM you publish is a concrete resolved string, with no `+`, no range, no `LATEST` or `RELEASE`, and no unresolved property or catalog placeholder. | Maven mediation and enforcer both operate purely on the flattened POM text, so an unresolved dynamic version that leaks into a publication fails `banDynamicVersions` on the consumer's side, in the consumer's build, long after your release passed. This is the whole Maven-specific obligation a library built by another tool and consumed by Maven inherits. | The fetch-and-grep block above, run against the POM the repository actually serves after the release is visible. Empty output is the pass. Reading the local POM instead does not verify this, because the published file is generated. | MUST *(publishers)* |
| MVN-DEP-11 | Do not adopt Maven 4's `bom` packaging or consumer-POM flattening (`maven.consumer.pom.flatten=true`) as a shipped mechanism. Treat both as migration preview. | Central lists `3.9.16` as the newest stable `org.apache.maven:maven-core` and tops the 4.0 line out at `4.0.0-rc-6`, with no plain `4.0.0` at all (queried 2026-09-12). Recommending a release-candidate-only feature strands every Maven 3.x consumer, and 0 of 32 corpus exemplars declare `bom` packaging. | The Central query above. A result set with no unsuffixed `"v":"4.0.0"` means Maven 4 is still RC and this row stands. Its presence is the trigger to revise this row, not a finding against a build. | MUST |

## The Control Maven Does Not Have

Maven has no lockfile and no equivalent of Gradle's `verification-metadata.xml`.
Do not invent one, do not port the Gradle mechanism into a POM, and do not write
a rule that claims either exists. State the gap instead.

- A `.sha1` or `.sha512` served beside an artifact is a transport-integrity
  check, not a supply-chain control. Gradle's dependency verification treats
  checksums and signatures as security layers (`GRADLE-DEP-16`, in the
  `gradle-build` rule) and Maven Resolver's own documentation rejects that
  framing. The `MVN-BUILD` family states the prohibition as a rule, in this
  rule's lifecycle-and-plugins file. Never quote the two ecosystems as one
  claim.
- The two real levers are PGP signing and verification through
  `maven-gpg-plugin`, whose producing half is family `MVN-PUB` in publishing,
  and a checksum-validated Maven wrapper, which is `MVN-BUILD-14`.
- What bounds drift here is MVN-DEP-04 plus MVN-DEP-10: no dynamic version
  enters, no dynamic version leaves. That bounds drift, it does not record what
  resolved, and no Maven rule in this family claims otherwise.

## What Agents Get Wrong Here

1. **Reading Maven mediation as highest-version-wins.** A model trained on
   Gradle and npm explains a Maven conflict backwards, then bumps a transitive
   that has no effect on the resolution at all. The shallower version is right
   and the explanation is wrong (MVN-DEP-02).
2. **Confusing `dependencyManagement` with mediation.** "Maven picked X because
   it is nearest" when a managed entry decided it before mediation ran. Look for
   the entry first, in the effective POM, not in the file you are editing
   (MVN-DEP-01).
3. **Adding the enforcer plugin with a rules block and no executions.** It
   compiles, it reviews clean, it runs nothing, and the diff looks like the
   problem was solved (MVN-DEP-03).
4. **Emitting a version string from training data.** The headline failure of
   dependency work in any ecosystem: a plausible version that never existed,
   stated confidently. Resolve the exact coordinate first, with
   `mvn dependency:get -Dartifact=groupId:artifactId:version` against the real
   repository, or do not write the string. Binary, with no partial credit.
5. **Proposing `dependencyConvergence` when the failure shape is an upper-bound
   violation.** The heavier rule generates far more noise in a large reactor.
   Read the message: convergence names two paths, upper-bound names one resolved
   version and one floor (MVN-DEP-06).
6. **Porting a Gradle control into a Maven repository.** Writing a lockfile
   rule, a `verification-metadata.xml` analogue, or "checksums prevent
   supply-chain attacks" into a POM-shaped review. None of those mechanisms
   exists here, and the checksum claim is wrong in both ecosystems.
7. **Assuming Maven 4 features are shippable**, because "Maven 4" reads as
   released in older training snapshots. Query Central before recommending one
   (MVN-DEP-11).
8. **Treating a namespace-verified groupId as a safe coordinate.** Central's
   verification proves domain or SCM control at registration time and says
   nothing about artifact contents, which is exactly the gap a lookalike group
   prefix exploits. Cross-reference a proposed groupId against the project's own
   published domain before accepting it.
9. **Adding a `system`-scoped dependency to make a local jar resolve.** It works
   on the machine that wrote it and nowhere else (MVN-DEP-08).
