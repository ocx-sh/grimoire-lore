---
title: Is find-sec-bugs a gate, or is JAVA-SEC grep-only?
topic: find-sec-bugs viability against current SpotBugs/JDK bytecode (JAVA-SEC-08 and the six find-sec-bugs-only JAVA-SEC rules)
agent: jvm-java-runtime-safety/find-sec-bugs-viability
model: sonnet
date_researched: 2026-09-12
sources_count: 16
scope: >
  Settles whether find-sec-bugs (the SpotBugs security plugin) is alive and
  compatible with current SpotBugs (4.9–4.10) and current bytecode (Java
  21/25 `--release` targets) as of 2026-09-12, and whether JAVA-SEC-08 and
  the six rules that name find-sec-bugs as their only automated check
  (XXE_* ×8, COMMAND_INJECTION, PATH_TRAVERSAL_IN/OUT, PREDICTABLE_RANDOM)
  keep that verification or fall back to grep. Does not re-litigate core
  SpotBugs coverage (settled in jvm-java-runtime-safety.md) or re-run the
  32-exemplar adoption sweep (cites `jvm-audit/exemplar-quality-gates.md`
  and the existing `jvm-java-runtime-safety.md` table instead).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- **find-sec-bugs is alive, not abandoned** — commits landed on `master` through 2026-03-25 and the repo shows 115 open issues, no archive flag, `pushed_at` 2026-03-26 ([repo API](https://api.github.com/repos/find-sec-bugs/find-sec-bugs), fetched 2026-09-12).
- **The last actual release is 1.14.0, published 2025-06-17** ([GitHub Releases](https://github.com/find-sec-bugs/find-sec-bugs/releases/tag/version-1.14.0)) — 15 months stale versus this research date; `master` sits at `1.15.0-SNAPSHOT` with no release date committed.
- **1.14.0 declares and builds against SpotBugs 4.8.6** (`pom.xml` at the `version-1.14.0` tag, lines 202–235) — current SpotBugs is **4.10.4** (2026-08-20), so the *declared* compatibility is two majors and ~26 months behind.
- **There was a real, confirmed runtime crash, not just staleness**: find-sec-bugs 1.14.0 throws `NoSuchMethodError` on `edu.umd.cs.findbugs.io.IO.close(InputStream)` under SpotBugs 4.9.5 and 4.9.6, because that SpotBugs release removed a method find-sec-bugs still calls ([find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766)).
- **SpotBugs, not find-sec-bugs, fixed it** — SpotBugs restored the method as deprecated in **4.9.7** (2025-10-15), explicitly citing the find-sec-bugs break as the reason ([spotbugs#3756](https://github.com/spotbugs/spotbugs/pull/3756)).
- **The fix is a truce with a clock on it**: the SpotBugs maintainer states the method "will be removed from SpotBugs core after 1 year" (i.e. ~2026-10) and that find-sec-bugs "still uses" it as of that comment ([find-sec-bugs#766 comment](https://github.com/find-sec-bugs/find-sec-bugs/issues/766#issuecomment-3409472827), 2025-10-16).
- **`master` has since removed the offending call** — `TaintDataflowEngine.java` on `master` now uses try-with-resources and no longer references `IO.close` at all (re-fetched 2026-09-12) — but that fix has **not shipped in a release**, so every consumer pulling the published `1.14.0` artifact still carries the landmine.
- **Version pinning is the actual mitigation today, and it is narrow**: `com.github.spotbugs` Gradle plugin **6.4.1/6.4.2 default to the broken SpotBugs 4.9.5/4.9.6**; **6.4.3+ (→ SpotBugs 4.9.7+)** and the current **6.5.6 (→ SpotBugs 4.10.2)** work, because SpotBugs, not find-sec-bugs, restored compatibility ([spotbugs-gradle-plugin README compatibility table](https://raw.githubusercontent.com/spotbugs/spotbugs-gradle-plugin/master/README.md)).
- **find-sec-bugs is a `provided`-scope plugin, so this is a real, adopter-facing risk, not a hypothetical**: `findsecbugs-plugin/pom.xml` declares SpotBugs `<scope>provided</scope>`, meaning the *consumer's* Gradle/Maven build picks the SpotBugs core version at runtime — 1.14.0's own 4.8.6 pin never protects you from a newer, incompatible core.
- **No unsupported-class-file-major-version errors found** for Java 21 or 25 `--release` output, in either the find-sec-bugs or SpotBugs trackers (`class file version`, `major.version`, `JDK 21`, `JDK 25` searches, 2026-09-12) — SpotBugs actively tracks new JDKs (4.9.7 "work with JDK 25 (and drop support for JDK 24)") and any Java-21/25-era false positives found (`CT_CONSTRUCTOR_THROW` on sealed classes, `EI_EXPOSE_REP` on records) are **core-SpotBugs pattern gaps**, not crashes and not find-sec-bugs-specific.
- **A confirmed, maintainer-acknowledged false positive exists for the XXE family**: `XXE_SCHEMA_FACTORY` does not fire when `SchemaFactory` creation and hardening happen in separate methods — no interprocedural dataflow — acknowledged as an intentional limitation, not a bug that will be fixed by generic dataflow work ([find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738)); a partial mitigation (custom taint tags via `TaintFrameAdditionalVisitor`) landed as a **feature**, not a full fix, in the still-unreleased `master`.
- **No published false-positive rate exists for any XXE_* or PATH_TRAVERSAL_* rule** — searched find-sec-bugs' own issue tracker for "PATH_TRAVERSAL … false positive" (0 hits) and found no third-party benchmark; the tool's own bug list documents `PATH_TRAVERSAL_IN`/`PATH_TRAVERSAL_OUT` as "potential" findings where the path may not be user-controlled, i.e. a self-acknowledged FP-prone family with no number attached.
- **`find-sec-bugs` is the de facto taxonomy other tools port from, not a dead end**: Semgrep's public `java` ruleset explicitly cites `find-sec-bugs.github.io/bugs.htm#<RULE_ID>` as `source-rule-url` for ~24 of its 60 rules, including `PATH_TRAVERSAL_IN`, `HTTP_RESPONSE_SPLITTING`, `UNVALIDATED_REDIRECT` ([Semgrep registry API `rulesets/java`](https://semgrep.dev/api/registry/rulesets/java)).
- **Semgrep's `java` ruleset is a live, current, partial alternative** — last rule change `2026-08-13` (per-rule metadata, unrelated rule but same registry timestamp horizon), and it covers 4 of the 8 XXE factories (`DocumentBuilderFactory`, `XMLInputFactory`, `SAXParserFactory`, `TransformerFactory`) plus `COMMAND_INJECTION`-equivalent (`tainted-system-command`, `tainted-cmd-from-http-request`) and `PATH_TRAVERSAL_IN`-equivalent (`httpservlet-path-traversal`, `jax-rs-path-traversal`, `tainted-file-path`) rules — but **has no rule at all for `SchemaFactory`, `Validator`, `XMLReader`, `XPath` XXE, nor for `PREDICTABLE_RANDOM`**.
- **SonarJava is a live, current, partial alternative for a subset**: `SonarSource/sonar-java` (the rule engine behind SonarQube Community Edition) was pushed 2026-09-11 — one day before this research — and ships `S2755` (XXE) as a Community-tier rule with active false-negative discussion for `SchemaFactory` (same limitation shape as find-sec-bugs#738), but SonarJava's `PREDICTABLE_RANDOM`-equivalent and `COMMAND_INJECTION`/`PATH_TRAVERSAL` rules were not independently verified in this pass — do not assume parity without checking each rule key.
- **Adoption of `find-sec-bugs` in the fleet's exemplar corpus is 0/32**, and only 3/32 even run bare SpotBugs as a real (non-`<reporting>`-only) gate — `apache__kafka`, `assertj__assertj`, `diffplug__spotless` — none of them add find-sec-bugs (per `jvm-audit/exemplar-quality-gates.md` §1 and `jvm-java-runtime-safety.md` line 179).
- **Verdict: JAVA-SEC-08 stays SHOULD, not MUST, and does not need demotion to grep-only** — the tool is maintained (if slow), the crash was a *SpotBugs* regression that SpotBugs itself reverted, and no adopter today needs to touch the broken 4.9.5/4.9.6 window if they pin sanely. But the six dependent rules need a **version-pin clause** added to their verification, and their MUST/SHOULD status should carry a grep fallback so the rule survives even where a team refuses find-sec-bugs or hits the next SpotBugs API break.
- **All six rules survive at their current severity with a grep fallback** — each has an unambiguous call-site pattern (`*Factory.newInstance()` + missing hardening block; `Runtime.exec`/`ProcessBuilder` with concatenated strings; `new Random()`/`Math.random()` near security-sounding identifiers; unresolved `Path`/`File` joins in extraction loops) that a reviewer can grep for without re-deriving the CWE from scratch.

## Findings

### 1. Release cadence and declared SpotBugs compatibility

find-sec-bugs' releases, from the GitHub Releases API (`https://api.github.com/repos/find-sec-bugs/find-sec-bugs/releases`, fetched 2026-09-12):

| Tag | Published | Notable content |
|---|---|---|
| `version-1.14.0` | 2025-06-17 | Upgrade to SpotBugs 4.8.3→4.8.6 mid-cycle, JDK 11 build, Jakarta support ([release](https://github.com/find-sec-bugs/find-sec-bugs/releases/tag/version-1.14.0)) |
| `version-1.13.0` | 2024-02-26 | Java 21 support, invokedynamic taint-tracking fixes |
| `version-1.12.0` | 2022-04-11 | JDK 17 support, LDAP/JNDI sink fixes post-Log4Shell |

`master` is at `1.15.0-SNAPSHOT` (`pom.xml` line 8, fetched 2026-09-12) with commits as recent as `2026-03-25` (`90447f7e`), but **no tag or release has been cut since 1.14.0** — 15 months of unreleased fixes as of this research date.

The **released** `1.14.0` artifact pins, in its own `pom.xml` (`version-1.14.0` tag, lines 202–235):
```xml
<groupId>com.github.spotbugs</groupId>
<artifactId>spotbugs-maven-plugin</artifactId>
<version>4.8.6</version>
...
<groupId>com.github.spotbugs</groupId>
<artifactId>spotbugs</artifactId>
<version>4.8.6</version>
```
Current SpotBugs (as of 2026-09-12) is **4.10.4**, published 2026-08-20 ([SpotBugs releases](https://github.com/spotbugs/spotbugs/releases)). So the last *released* find-sec-bugs artifact declares compatibility with a SpotBugs build from **2024-06-18** — over two years old.

### 2. The compile dependency is `provided` — declared version is not the whole story

`findsecbugs-plugin/pom.xml` (`version-1.14.0` tag, lines 126–131):
```xml
<!-- FindBugs API (Detector interface and transitive deps like BCEL..) -->
<dependency>
    <groupId>com.github.spotbugs</groupId>
    <artifactId>spotbugs</artifactId>
    <scope>provided</scope>
</dependency>
```
`provided` scope means find-sec-bugs ships as a plain jar of detector classes; it never forces its own SpotBugs version onto a consumer. The **consumer's** build — via Gradle's `spotbugs { toolVersion = "..." }` or the Maven `spotbugs-maven-plugin` version — decides which SpotBugs core actually loads the plugin at runtime. This is why the compatibility question is a **binary-compatibility-against-the-Detector-API** question, not a version-pin question, and why the same find-sec-bugs 1.14.0 jar can crash under one SpotBugs core and work under another.

### 3. A confirmed runtime crash — `NoSuchMethodError` under SpotBugs 4.9.5/4.9.6

Reported against exactly this combination — Gradle 9.0.0, Java 21, **SpotBugs 4.9.6**, **FindSecBugs 1.14.0** — in [find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766) (opened 2025-09-17, closed 2026-03-25):

```
Exception in thread "main" java.lang.NoSuchMethodError: 'void edu.umd.cs.findbugs.io.IO.close(java.io.InputStream)'
        at com.h3xstream.findsecbugs.taintanalysis.TaintDataflowEngine.addCustomConfig(TaintDataflowEngine.java:170)
```
A second reporter confirmed the same crash under **SpotBugs 4.9.5** (comment, 2025-09-24). Root cause, per SpotBugs contributor `JuditKnoll`:

> "The problem was in SpotBugs, a simple util function got prematurely deleted, it got added back and deprecated in spotbugs/spotbugs#3756. In the next SpotBugs release, 4.9.7 (not released yet) it will be available once again. Until then SpotBugs 4.9.4 can be used." — [find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766#issuecomment-3388573290), 2025-10-10

SpotBugs' own PR restoring the method is explicit about the cause and the tradeoff ([spotbugs#3756](https://github.com/spotbugs/spotbugs/pull/3756), merged 2025-10-08):

> "During modernizing the `edu.umd.cs.findbugs.io.IO.close(InputStream)` method was removed in spotbugs/spotbugs#3683. It turns out it is used in FindSecBugs and causes issues... This PR reverts this part of that PR and deprecates the method."

And the maintainer's follow-up names the expiry:

> "The relevant method got deprecated, and will be removed from SpotBugs core after 1 year. So yes, FindSecBugs still uses the `edu.umd.cs.findbugs.io.IO.close(java.io.InputStream)` function at that time and there is no release which has no usage of it, this problem will arise again. Removing the usage of this function is relatively straightforward." — [find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766#issuecomment-3409472827), 2025-10-16

**Current state (re-verified 2026-09-12):** `master`'s `TaintDataflowEngine.java` (`https://raw.githubusercontent.com/find-sec-bugs/find-sec-bugs/master/findsecbugs-plugin/src/main/java/com/h3xstream/findsecbugs/taintanalysis/TaintDataflowEngine.java`) no longer references `IO.close` anywhere — the custom-config stream reads now use try-with-resources (`try (InputStream stream = ...)`, lines 142, 151). The fix landed on `master` but **has not shipped in a release** — the public `1.14.0` Maven Central artifact still carries the old, crash-prone code. The SpotBugs-side deprecation window ends roughly a year after 2025-10-08, i.e. around **October 2026** — about a month after this research date — at which point 4.9.7's restored method may be removed again, and find-sec-bugs `1.14.0` would break a second time until a `1.15.0` finally ships.

### 4. What is actually broken today (2026-09-12) vs. what is safe

Cross-referencing the SpotBugs release list against the crash window:

| SpotBugs version | Released | find-sec-bugs 1.14.0 status |
|---|---|---|
| ≤ 4.9.4 | ≤ 2025-08-10 | Safe (predates the removal) |
| 4.9.5 – 4.9.6 | 2025-09-15 – 2025-09-17 | **Crashes** (`NoSuchMethodError`) |
| 4.9.7 – 4.10.4 | 2025-10-15 – 2026-08-20 (current) | Safe (method restored, deprecated) |

The `com.github.spotbugs` Gradle plugin's own compatibility table ([README](https://raw.githubusercontent.com/spotbugs/spotbugs-gradle-plugin/master/README.md), fetched 2026-09-12) confirms which plugin versions default into the broken window:

| Gradle Plugin | SpotBugs | find-sec-bugs 1.14.0 |
|--:|--:|---|
| 6.5.6 (current) | 4.10.2 | safe |
| 6.4.4 | 4.9.8 | safe |
| 6.4.3 | 4.9.7 | safe |
| **6.4.2** | **4.9.6** | **crashes** |
| **6.4.1** | **4.9.5** | **crashes** |
| 6.2.4 | 4.9.4 | safe |

An adopter who pins `com.github.spotbugs` Gradle plugin at `6.4.1` or `6.4.2` specifically and adds find-sec-bugs 1.14.0 gets a hard build break, not a lint failure. Anyone on the **current** plugin (6.5.6 → SpotBugs 4.10.2) or the current Maven `spotbugs-maven-plugin` line is unaffected today.

### 5. No unsupported-class-file-major-version errors for Java 21/25 bytecode

Searched both trackers 2026-09-12 for `major.version`, `class file version`, `JDK 21`, `JDK 25`, `Java 21` (issue search, both `find-sec-bugs/find-sec-bugs` and `spotbugs/spotbugs`): **zero open issues reporting SpotBugs or find-sec-bugs refusing to parse a Java 21- or 25-targeted class file.** SpotBugs' own release notes state 4.9.7 updated its build "to work with JDK 25 (and drop support for JDK 24)" — a currency signal, not evidence of a parsing failure.

What *does* exist, in core SpotBugs (not find-sec-bugs), are **pattern-recognition false positives** on newer language features — not crashes:
- `CT_CONSTRUCTOR_THROW` false-fires on `abstract sealed` classes ([spotbugs#4259](https://github.com/spotbugs/spotbugs/issues/4259))
- `EI_EXPOSE_REP` false-fires when a record returns `List.copyOf(...)`/`Set.copyOf(...)` ([spotbugs#4033](https://github.com/spotbugs/spotbugs/issues/4033), [#3022](https://github.com/spotbugs/spotbugs/issues/3022))

Neither touches the six JAVA-SEC families this brief covers (XXE, command injection, path traversal, predictable random) — recorded here only to answer part (2) of the brief precisely: **no**, it does not error on 21/25 bytecode; it occasionally misfires on the new syntax those bytecode versions encode, in unrelated detectors.

find-sec-bugs' own history shows it *has* had modern-bytecode trouble before: 1.13.0 (2024-02-26) shipped "improved taint tracking for invokedynamic concatenation in JDK > 8" and 1.14.0 fixed "misinterpreting invokedynamic causes 'missing class' warning" ([PR #750](https://github.com/find-sec-bugs/find-sec-bugs/pull/750)) — `invokedynamic`-based string concatenation has been the default since JDK 9. Both are now fixed in the current release; no open regression was found for JDK 21/25-specific bytecode shapes.

### 6. Maintenance status, in the maintainers' own words

There is no single "we are alive" or "we are dead" statement — no pinned issue, no README banner, no discussion thread found under `maintainer`/`maintained`/`abandoned` search terms. The state has to be read from behavior:

- Commit activity: `2025-10-22`, `2025-12-11`, `2026-03-25` (`90447f7e` = last commit as of fetch) — a small trickle, not silence.
- Contributor mix ([contributors API](https://api.github.com/repos/find-sec-bugs/find-sec-bugs/contributors)): founder `h3xstream` (918 commits, historical) is no longer the active committer; `JuditKnoll` (16 commits, all in the 2025–2026 window), `topolik` (47) and `MaxNad` (45) are the names on recent PRs and issue triage.
- Explicit self-assessment of pace, from `JuditKnoll` on PR #767 (2026-03-25, "modify spotbugs-maven-plugin from nonexistent version to existing"):

  > "There are already newer versions of both SpotBugs and SpotBugs maven plugin, but SpotBugs 4.9.0 requires Java 11 for the build, and that may need other modifications." — [find-sec-bugs#767](https://github.com/find-sec-bugs/find-sec-bugs/pull/767)

  This is the maintainers, in March 2026, explicitly declining to track current SpotBugs in their **own** build for now — deliberate lag, not an oversight.
- 115 open issues, repo not archived, `pushed_at` 2026-03-26 ([repo metadata](https://api.github.com/repos/find-sec-bugs/find-sec-bugs)).

**Reading**: a small, part-time, community-maintained project — alive, responsive to specific breaks (the 4.9.6 crash got a same-quarter fix upstream and an eventual `master` fix), but with a slow release cadence (15+ months between tags) and an admitted reluctance to chase current SpotBugs. Treat it as "maintained but fragile", not "dead" and not "current".

### 7. False positives — XXE family, with a maintainer-acknowledged limitation

[find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738) (opened 2024-06-10, still open): `XXE_SCHEMA_FACTORY` fires when `SchemaFactory` creation happens in one method and hardening (`setProperty`/`setFeature`) happens in another — because find-sec-bugs does **not** do interprocedural dataflow. Maintainer `h3xstream`:

> "Unfortunately, we are not doing data flow analysis across functions... Interprocedural functions analysis would help in this case." — [find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738#issuecomment-2196170936), 2024-06-27

A linked fix ([find-sec-bugs#754](https://github.com/find-sec-bugs/find-sec-bugs/issues/754)) adds *custom taint tags* so a hand-authored config file can mark a helper method as "returns an XXE-safe factory" — a workaround requiring manual per-project configuration, not a general interprocedural analysis, and it has **not shipped in a release** (`master`-only as of 2026-09-12). The reporter's own framing generalizes the risk correctly:

> "There's a glut of XXE_* rules that probably check for similar patterns [i.e., all 8 are single-method dataflow and share this blind spot]." — [find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738), 2024-06-10

**No published false-positive rate exists** for any `XXE_*` or `PATH_TRAVERSAL_*` rule — no benchmark, no maintainer-quoted percentage. Report: **none found.** The tool's own bug list is explicit that `PATH_TRAVERSAL_IN`/`PATH_TRAVERSAL_OUT` findings are "potential" and often false where "the constructed file path cannot be controlled by the user" ([bugs.htm](https://find-sec-bugs.github.io/bugs.htm)) — a self-acknowledged FP-prone shape with no attached number. A repo-wide search for `PATH_TRAVERSAL` + "false positive" in the find-sec-bugs issue tracker returned **0 issues** — the absence of complaints here is weak evidence of low real-world friction, not proof of a low rate; nobody has measured it either way.

### 8. Live alternatives — what was actually fetched, not assumed

**Semgrep `java` ruleset** ([registry API](https://semgrep.dev/api/registry/rulesets/java), fetched 2026-09-12): 60 rules. Explicitly derived from find-sec-bugs — 24 of the 60 rules carry `source-rule-url: https://find-sec-bugs.github.io/bugs.htm#<ID>` in their metadata, e.g.:
```yaml
- id: httpservlet-path-traversal
  metadata:
    source-rule-url: https://find-sec-bugs.github.io/bugs.htm#PATH_TRAVERSAL_IN
    cwe: ['CWE-22: ... Path Traversal']
  mode: taint
```
Coverage against the six rules in scope:
- **XXE**: 4 of 8 factories covered — `documentbuilderfactory-disallow-doctype-decl-{missing,false}`, `documentbuilderfactory-external-{general,parameter}-entities-true`, `xmlinputfactory-possible-xxe`, `saxparserfactory-disallow-doctype-decl-missing`, `transformerfactory-dtds-not-disabled`. **No rule for `SchemaFactory`, `XMLReader`, `javax.xml.validation.Validator`, or XPath-source XXE** — 4 of the 8 `XXE_*` families are uncovered.
- **COMMAND_INJECTION**: covered — `tainted-system-command`, `tainted-cmd-from-http-request`.
- **PATH_TRAVERSAL_IN**: covered, HTTP-source taint mode — `httpservlet-path-traversal`, `jax-rs-path-traversal`, `tainted-file-path`. **PATH_TRAVERSAL_OUT** (write side) was not found as a distinct rule id.
- **PREDICTABLE_RANDOM**: **not present** — no rule id containing "random" or "predictable" in the 60-rule set (searched 2026-09-12).

**SonarJava** (`SonarSource/sonar-java`, [repo](https://github.com/SonarSource/sonar-java), `pushed_at` 2026-09-11 — fetched 2026-09-12): live, actively developed, ships `S2755` ("XML parsers should not be vulnerable to XXE attacks") as a Community-Edition-tier rule covering `DocumentBuilderFactory`, `XMLInputFactory`, `SAXParserFactory`, `SchemaFactory` and `TransformerFactory` per community discussion threads — but with an **open false-negative report for `SchemaFactory`** specifically (same single-method-dataflow shape as find-sec-bugs#738; [Sonar Community thread](https://community.sonarsource.com/t/false-negative-xxe-rule-for-schemafactory-java-s2755/64094)). `PREDICTABLE_RANDOM`, `COMMAND_INJECTION` and `PATH_TRAVERSAL` rule keys in SonarJava were **not independently verified in this pass** — before recommending SonarJava as a full substitute, fetch `S2076` (command injection) and the path-traversal rule key directly.

Neither alternative is a drop-in replacement for all six rules; both are legitimate **supplements**, and Semgrep specifically inherits find-sec-bugs' own taxonomy rather than superseding it.

## Normative guidance candidates

1. **Keep JAVA-SEC-08 at SHOULD**, wire `find-sec-bugs` (current released `1.14.0`) alongside SpotBugs in any module that parses, deserializes, extracts, or executes untrusted input. *Rationale*: the tool is maintained (slow but real commit activity into 2026-03), the one confirmed crash was a SpotBugs-side regression SpotBugs itself reverted, and no adopter on a current toolchain (SpotBugs ≥4.9.7 / spotbugs-gradle-plugin ≥6.4.3) hits it. *Verify*: `grep -rn 'findsecbugs' **/*.gradle* **/pom.xml **/*.toml` in any module with a bound `spotbugs { }`/`spotbugs-maven-plugin` execution; empty output plus a SpotBugs gate is the finding (measured 0/32 in the exemplar corpus, 2026-09-12).

2. **Add a version-pin clause to JAVA-SEC-08's verification**: never resolve `com.github.spotbugs` Gradle plugin to exactly `6.4.1` or `6.4.2` (SpotBugs 4.9.5/4.9.6) while find-sec-bugs `1.14.0` is on the classpath — pin `toolVersion` to `4.9.7`+ explicitly, or use plugin `6.4.3`+. *Rationale*: this is a documented `NoSuchMethodError` crash, not a lint miss — a build break, worse than a missed finding. *Verify*: `grep -n 'com.github.spotbugs' **/*.gradle*` for the plugin version, cross-reference against the compatibility table above; a bare `id("com.github.spotbugs") version "6.4.1"` or `"6.4.2"` alongside a `findsecbugs-plugin` dependency is the finding.

3. **XXE_XMLSTREAMREADER, XXE_XPATH, XXE_SAXPARSER, XXE_XMLREADER, XXE_DOCUMENT, XXE_DTD_TRANSFORM_FACTORY, XXE_XSLT_TRANSFORM_FACTORY, XXE_SCHEMA_FACTORY, XXE_VALIDATOR all stay MUST, with find-sec-bugs as primary check plus a named reading heuristic as fallback**: for every `*Factory.newInstance()` / `new SAXBuilder()` / `new SAXReader()` call, confirm the hardening call (`setFeature`, `setAttribute`, `setProperty` for that exact factory type) happens **in the same method**, not a helper — because neither find-sec-bugs nor SonarJava tracks hardening applied in a separate method. *Rationale*: this is the exact, maintainer-confirmed blind spot (#738) shared by both static-analysis options; a human/agent reading pass at the call site closes it where the tool cannot. *Verify*: `grep -rn -A5 'Factory\.newInstance()\|new SAXBuilder(\|new SAXReader(' --include=*.java --include=*.kt` and require the hardening block within the same method body as the constructor call — a factory returned from or configured in a helper method is the finding, whether or not find-sec-bugs also flags it.

4. **COMMAND_INJECTION stays MUST**, find-sec-bugs remains the automated check but a grep survives it alone. *Rationale*: the pattern is unambiguous and syntactic. *Verify*: `grep -rn 'Runtime.getRuntime().exec(\|ProcessBuilder(' --include=*.java --include=*.kt` — any single-`String` argument built with `+`, `String.format`, or interpolation, or a `"sh","-c"` pair, is the finding regardless of tool availability.

5. **PATH_TRAVERSAL_IN / PATH_TRAVERSAL_OUT stay MUST**, find-sec-bugs remains primary, with the tool's own caveat carried into the rule text: a hit is "potential" — verify the path segment is genuinely attacker-controlled before treating it as a true positive, and do not suppress the pattern check for archive-extraction loops the tool under-reports. *Rationale*: find-sec-bugs' own docs call these findings "potential", so blind trust in either direction (over-suppressing as "just find-sec-bugs noise", or assuming absence of a finding means safety) is the actual risk. *Verify*: `grep -rn 'new ZipInputStream(\|new ZipFile(\|new JarInputStream(\|new TarArchiveInputStream(' --include=*.java --include=*.kt`, then confirm a `base.resolve(entry).normalize().startsWith(base)` (or equivalent) check precedes every extraction write in that loop — independent of whether find-sec-bugs also fires.

6. **PREDICTABLE_RANDOM stays MUST but demote its tool dependency**: find-sec-bugs is optional supporting evidence, not the primary check — neither of the two live alternatives fetched (Semgrep `p/java`, SonarJava's verified subset) carries an equivalent rule, and find-sec-bugs itself may not be wired. *Rationale*: this family is fully grep-checkable and does not need a dataflow engine — `new Random(`, `Math.random(`, `ThreadLocalRandom`, `SplittableRandom` near a security-sounding identifier is a complete, mechanical check. *Verify*: `grep -rn 'new Random(\|Math.random(\|ThreadLocalRandom\|SplittableRandom' --include=*.java` and read each hit's surrounding variable/field names for `token`/`key`/`nonce`/`session`/`secret`/`password`/`reset`.

7. **Any module that adds `find-sec-bugs`, also pin `findsecbugs-plugin`'s effective SpotBugs core version in CI, not just locally** — a `./gradlew spotbugsMain --info` run (or equivalent) that fails loudly on `NoSuchMethodError` is cheaper than a silent skip. *Rationale*: because find-sec-bugs is `provided`-scope (finding 2), a transitive SpotBugs core bump (e.g. a version-catalog update) can reintroduce the exact 4.9.5/4.9.6-shaped break with no local build-file diff to review. *Verify*: CI log for `spotbugsMain`/`spotbugsTest` (Gradle) or `spotbugs:check` (Maven) shows a `BUILD SUCCESSFUL`/`0` exit and not a stack trace — a green "quality gate" status badge is not sufficient if the underlying task was allowed to fail silently (`ignoreFailures = true`).

8. **Before recommending SonarJava as a substitute for any of the six rules, fetch and confirm its exact rule key and coverage — do not assume parity from `S2755` alone.** *Rationale*: this pass verified only `S2755` (XXE); `PREDICTABLE_RANDOM`, `COMMAND_INJECTION` and `PATH_TRAVERSAL` equivalents in SonarJava were not confirmed and must not be cited as covered until they are. *Verify*: fetch `https://rules.sonarsource.com/java/RSPEC-<id>` or the `sonar-java` rule metadata for the specific key before writing it into a rule's verification column.

## Exemplar evidence

- `find-sec-bugs` adoption: **0/32**, all three real (non-`<reporting>`-only) SpotBugs gates — `apache__kafka`, `assertj__assertj`, `diffplug__spotless` — run bare SpotBugs without it (`jvm-java-runtime-safety.md` line 179, `jvm-audit/exemplar-quality-gates.md` §1 "SpotBugs (real gate...)" row).
- No exemplar was found using Semgrep or SonarJava as a security-lint gate in the CI sense — Sonar shows up in only 2/32 (`assertj`, `micronaut`), and neither exemplar's checked-out slice showed the Java-specific security rule set bound to a blocking `sonar:sonar` execution (`jvm-audit/exemplar-quality-gates.md` §1, "Sonar" row).
- This confirms the existing `jvm-java-runtime-safety.md` line 83 finding — "`find-sec-bugs` is 0/32, and all three exemplars that gate on SpotBugs run it without the plugin" — and extends it: the gap is not because find-sec-bugs is unmaintained (it is not) but because **no exemplar has bothered to add it**, consistent with the corpus generally under-investing in this family (`jvm-java-runtime-safety.md` §"Group 2").

## AI-agent angle

- **An LLM will happily write `spotbugsPlugins("com.h3xstream.findsecbugs:findsecbugs-plugin:1.8.0")` or another stale version from training data**, unaware that 1.14.0 (2025-06-17) is current and that 1.8.0-era coordinates predate the Jakarta/JDK-11-build line. *Check*: `grep -rn 'findsecbugs-plugin' **/*.gradle* **/pom.xml` and confirm the pinned version is `1.14.0` (or newer, if a release has since shipped) — a mechanical version-string comparison, no build required.
- **An LLM will pin `com.github.spotbugs` Gradle plugin to whatever the training corpus shows most often, which skews toward the 4.x/5.x line or the exact 6.4.1/6.4.2 window** that crashes find-sec-bugs — it has no way to know from training data alone that this specific pair is broken, because the break (Sept 2025) and its cause postdate most pretraining cutoffs. *Check*: cross-reference the pinned `com.github.spotbugs` plugin version against the compatibility table in Finding 4 before accepting a generated build file that adds both find-sec-bugs and a pinned SpotBugs plugin version.
- **An LLM asked to "harden this XML parser" will fix the one factory it sees and consider the XXE family closed**, missing that the eight `XXE_*` families are independent per-factory-type checks with no shared base-class hardening (Rule 3 above; this is the exact shape the exemplar-side `jvm-java-runtime-safety.md` JAVA-SEC-03 row already names). *Check*: grep for every distinct `*Factory.newInstance()` call in the touched file/module and confirm each has its own adjacent hardening block, not just the one the agent edited.
- **An LLM will read "find-sec-bugs has 0/32 adoption" (once this fact is published) and generalize it to "find-sec-bugs doesn't work" or "is abandoned"**, and skip recommending it even where MUST-tier XXE/command-injection coverage is genuinely needed — the correct reading is "unmeasured, not unmaintained" (Finding 6). *Check*: before asserting a tool is dead, require a fetched release date and open-issue/commit-recency check (as this document does), not an adoption-rate inference.
- **An LLM will trust a green SpotBugs/find-sec-bugs CI badge without checking `ignoreFailures`** — the sibling `jvm-java-runtime-safety.md` already documents this exact failure mode for `assertj` (SpotBugs bound only to `<reporting>`, never `verify`). The same applies here: find-sec-bugs wired but the surrounding SpotBugs task set to `ignoreFailures = true` reports green with zero enforcement. *Check*: confirm `ignoreFailures` (Gradle) / `failOnError` (Maven, note find-sec-bugs' own sample POMs default this to `false` deliberately) is not silently swallowing findings — Rule 7 above.

## Contested / evolving

- **Whether find-sec-bugs should exist as a standalone plugin at all, versus folding into SpotBugs core or ceding the space to Semgrep/SonarJava, is not settled and trending toward fragmentation, not consolidation** — as of 2026-09-12, no tool fully covers the eight `XXE_*` families (Semgrep covers 4/8, SonarJava's coverage is unverified per-rule in this pass, find-sec-bugs covers all 8 but with the interprocedural blind spot in #738). The practical answer today is "run more than one, expect gaps in each", not "pick a single winner."
- **The SpotBugs↔find-sec-bugs compatibility relationship is adversarial-by-neglect, not designed**: SpotBugs removed an internal utility method during a "modernizing" pass without checking find-sec-bugs' usage (`spotbugs#3683`), had to revert-and-deprecate under pressure (`spotbugs#3756`), and the deprecation clock (~Oct 2026) will force the same choice again unless find-sec-bugs ships `1.15.0` with the already-written fix first. This is a recurring structural risk for any SpotBugs-ecosystem plugin that has gone quiet on releases — not unique to find-sec-bugs, but concretely due to recur here within roughly a month of this research date.
- **Whether "XXE hardening in a helper method" should count as a false positive or a real finding is a genuine, open design disagreement**, not just a tool limitation — h3xstream's own comment on #738 argues a public helper method is *not actually safe* even with interprocedural analysis (a subclass could override it), while the reporter argues private-method-scoped interprocedural analysis is an acceptable middle ground. Rule 3 above sides with "treat it as a finding unless hardened in the same method" as the conservative reading, but a team confident in its class hierarchy (no subclassing, package-private helpers) may reasonably relax that.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [find-sec-bugs GitHub Releases](https://github.com/find-sec-bugs/find-sec-bugs/releases) | Primary — release history and notes | 1.14.0 = 2025-06-17 | Establishes the current released version and declared SpotBugs upgrades |
| [find-sec-bugs `pom.xml` @ version-1.14.0](https://raw.githubusercontent.com/find-sec-bugs/find-sec-bugs/version-1.14.0/pom.xml) | Primary — exact build config of the released artifact | 2025-06-17 | Confirms declared SpotBugs 4.8.6 dependency and `spotbugs-maven-plugin` version |
| [find-sec-bugs `pom.xml` @ master](https://raw.githubusercontent.com/find-sec-bugs/find-sec-bugs/master/pom.xml) | Primary — unreleased state | fetched 2026-09-12, last change 2026-03-25 | Shows `1.15.0-SNAPSHOT` and that SpotBugs is still pinned at 4.8.6 even in-flight |
| [findsecbugs-plugin `pom.xml` @ version-1.14.0](https://raw.githubusercontent.com/find-sec-bugs/find-sec-bugs/version-1.14.0/findsecbugs-plugin/pom.xml) | Primary — dependency scope | 2025-06-17 | Confirms `<scope>provided</scope>` on the SpotBugs dependency |
| [find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766) | Primary — issue tracker | opened 2025-09-17, closed 2026-03-25 | The confirmed `NoSuchMethodError` crash under SpotBugs 4.9.5/4.9.6, with maintainer root-cause and fix timeline |
| [spotbugs#3756](https://github.com/spotbugs/spotbugs/pull/3756) | Primary — SpotBugs PR | merged 2025-10-08 | SpotBugs' own account of removing-then-restoring the method find-sec-bugs depends on, with a stated 1-year deprecation clock |
| [find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738) | Primary — issue tracker | opened 2024-06-10, open | Maintainer-acknowledged `XXE_SCHEMA_FACTORY` false negative from lack of interprocedural dataflow |
| [find-sec-bugs#754](https://github.com/find-sec-bugs/find-sec-bugs/issues/754) | Primary — linked fix PR | 2025-03-13 comment, unreleased | The taint-tag workaround for #738; confirms the fix is manual-config-only and unreleased |
| [find-sec-bugs#767](https://github.com/find-sec-bugs/find-sec-bugs/pull/767) | Primary — PR discussion | 2026-03-25 | Maintainer's own admission that tracking current SpotBugs "may need other modifications" — direct maintenance-pace evidence |
| [SpotBugs GitHub Releases](https://github.com/spotbugs/spotbugs/releases) | Primary — release history | 4.10.4 = 2026-08-20 | Establishes current SpotBugs version and the 4.9.x release timeline the crash window sits inside |
| [spotbugs-gradle-plugin README](https://raw.githubusercontent.com/spotbugs/spotbugs-gradle-plugin/master/README.md) | Primary — official compatibility table | fetched 2026-09-12 | Exact Gradle-plugin-version → SpotBugs-core-version mapping, showing which plugin versions default into the broken window |
| [find-sec-bugs bugs.htm](https://find-sec-bugs.github.io/bugs.htm) | Primary — the tool's own rule catalog | live | Source of the exact `XXE_*`/`COMMAND_INJECTION`/`PATH_TRAVERSAL_*`/`PREDICTABLE_RANDOM` rule IDs and the tool's own "potential" caveat on path-traversal findings |
| [Semgrep registry API — `rulesets/java`](https://semgrep.dev/api/registry/rulesets/java) | Primary — live ruleset definition | fetched 2026-09-12 | The 60-rule `p/java` set with per-rule `source-rule-url` back-references to find-sec-bugs |
| [SonarSource/sonar-java](https://github.com/SonarSource/sonar-java) | Primary — repo metadata | `pushed_at` 2026-09-11 | Confirms SonarJava is actively developed one day before this research |
| [Sonar Community — false negative XXE for SchemaFactory](https://community.sonarsource.com/t/false-negative-xxe-rule-for-schemafactory-java-s2755/64094) | Secondary — community discussion | dated per thread | Shows SonarJava `S2755` shares find-sec-bugs' `SchemaFactory` blind spot |
| `jvm-java-runtime-safety.md` (this program's own consolidation) | Internal — sibling artifact | 2026-09 | Source of the six rules' current text, the open question this document answers, and the 0/32 adoption baseline |
| `jvm-audit/exemplar-quality-gates.md` | Internal — measured audit | 2026-09 | Corpus-wide SpotBugs/Sonar/Semgrep adoption counts across all 32 exemplars |
