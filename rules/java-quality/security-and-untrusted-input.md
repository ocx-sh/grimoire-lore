---
title: Untrusted Input and the Security Gate
summary: The JAVA-SEC family: deserialization filters, per-factory XML hardening, path containment, subprocess construction, unpredictable randomness, the Jackson version floor, and wiring find-sec-bugs
---

# Untrusted Input and the Security Gate

`JAVA-SEC` owns what happens at the moment data this process did not produce is
turned into something executable: a deserialized object graph, a parsed XML
document, a resolved filesystem path, a command line, a JNDI name, and the
source a security-relevant value is drawn from. It also owns the one tool
decision that gates half of that surface. It does **not** own what you throw,
catch, wrap or close at those same call sites, which is `JAVA-ERR`
(`errors-and-resources.md` in this rule's support directory), nor which linter
runs at what severity in which build file, which is `JAVA-LINT`
(`lint-gate.md`). Charset and locale defaults at a boundary are `JAVA-PLAT`
(`platform-and-versions.md`), the published surface and its JSpecify annotations
are `JAVA-API` (`api-and-evolution.md`). `CompletableFuture` exception loss is
`JAVA-CONC` (`concurrency.md`), and the environment a subprocess inherits is
`JAVA-CONC-12` there — this file owns only the argv (`JAVA-SEC-06`). Kotlin's
half of the failure surface is `KT-ERR`, in the `kotlin-quality` rule set.

Contents: [Caught Inside javac, or Not at All](#caught-inside-javac-or-not-at-all) ·
[No Core SpotBugs Detector Exists](#no-core-spotbugs-detector-exists) ·
[The Dated Numbers](#the-dated-numbers) ·
[A Resolved Version, Not a Configuration](#a-resolved-version-not-a-configuration) ·
[A Grep and a Reading, No Gate](#a-grep-and-a-reading-no-gate) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## Caught Inside `javac`, or Not at All

Both rows below are mechanically enforceable, and only by Error Prone. One
invocation covers the pair:

```bash
grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' -e 'BanSerializableRead' -e 'BanJNDI' .
```

Both names must appear, set to `ERROR`. **Empty output is the finding** for any
module that reads bytes or resolves names it did not produce. `JAVA-LINT` owns
the plugin wiring itself, so do not restate it here. Where the gate is absent,
the per-row grep is the check and the severity does not move.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-SEC-01 | Never call `ObjectInputStream.readObject()` or `readUnshared()` on bytes that crossed a trust boundary without an `ObjectInputFilter` allow-list attached to that stream. Prefer not carrying Java serialization across the boundary at all. | The stream's content decides which classes are constructed, and `readObject`, `readResolve` and `readExternal` side effects all run before any application check can look at the result. That is the gadget-chain shape, and no deny-list closes it (CERT `SER12-J`, Oracle `SERIAL-6`). | `grep -rn --include='*.java' 'new ObjectInputStream(' .` Every hit needs a `setObjectInputFilter(...)` on that stream in the same method, or a comment establishing that the same process wrote the bytes. Empty output is the pass. Floors: `ObjectInputFilter` JDK 9, context-specific filters JDK 17, Error Prone 2.36.0 (verified 2026-09-12). | MUST |
| JAVA-SEC-04 | Never pass a string influenced from outside as the name argument to `Context.lookup()` or to any of the roughly forty related `javax.naming`, JDO, JMX or SQL-rowset lookup APIs. | An `rmi://`, `ldap://` or `corba://` name returns a `javax.naming.Reference` whose `classFactoryLocation` the JNDI client fetches and instantiates. That is remote class loading with no serialization bug involved (CERT VU#930724, and Log4Shell's actual root cause). | `grep -rn --include='*.java' -e '.lookup(' -e 'new InitialContext(' .` Every argument must be a compile-time constant or a closed config value that no outside data reaches. Empty output is the pass. Error Prone `BanJNDI` bans the surface outright where wired (2.36.0, verified 2026-09-12). | MUST |

## No Core SpotBugs Detector Exists

Core SpotBugs has **zero** detectors for XXE, command injection, path traversal
or JNDI. A SpotBugs gate is therefore not coverage of this section. `find-sec-bugs`
is the automated check where it is wired and nothing else is. **Every rule here
holds at its stated severity on its grep alone**: a missing tool changes the
verification column, never the standard.

```bash
grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' --include='*.versions.toml' -e 'findsecbugs' -e 'spotbugs' .
```

A `spotbugs` hit with no `findsecbugs` hit is `JAVA-SEC-08`'s finding. Both
absent means no automated gate exists for this section at all, which is the
measured norm: `find-sec-bugs` appeared in 0 of 32 exemplar repositories on
2026-09-12. Read that zero as *unmeasured*, not as abandoned.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-SEC-03 | Harden every XML parser factory independently, **in the same method that constructs it**: `DocumentBuilderFactory`, `SAXParserFactory`, `XMLInputFactory`, `TransformerFactory`, `SchemaFactory`, `javax.xml.validation.Validator`, JAXB's unmarshal source, and any XPath source document. Hardening one factory is not evidence for another, and hardening inside a helper is not evidence for any of them. | Each factory carries its own default feature set and inherits nothing. Oracle `INJECT-5` names three distinct inclusion vectors (DTD, XInclude, and the XSLT `document()`/`import`/`include` family), so closing the DTD path alone leaves two live. The same-method clause is not style: no available tool does interprocedural dataflow here, so a factory configured through a helper is unverifiable by machine, and a *public* helper is not actually safe even with such analysis because a subclass can override it. | For each construction, a `setFeature`, `setAttribute` or `setProperty` call naming **that** factory's `disallow-doctype-decl` or `ACCESS_EXTERNAL_` key must sit in the same method body. `grep -rn -A5 --include='*.java' -e 'Factory.newInstance()' -e 'new SAXBuilder(' -e 'new SAXReader(' .` then count constructions per factory type against hardening blocks naming that type. Any type constructed more often than it is hardened is the gap. Empty output is the pass. **Absence of a tool finding is not evidence of safety on this rule**: find-sec-bugs' eight `XXE_` detectors and SonarJava `S2755` share the blind spot, and Semgrep's `p/java` covers only 4 of the 8 factories (verified 2026-09-12). | MUST |
| JAVA-SEC-05 | Resolve a caller-supplied path segment against its base directory and verify containment *before* opening any stream: `base.resolve(segment).normalize().startsWith(base)`, or `toRealPath()` where symlinks matter. One rule, two call sites: archive-entry names and ordinary filenames. | `ZipEntry.getName()` is a raw attacker-controlled string and the JDK ships no safe extraction API for zip, jar, war, tar, cpio, apk or 7z, so every extractor re-derives the check (the zip-slip family). For the general case, CERT `FIO16-J`: a textual `contains("..")` test is defeated by symlinks and path-equivalence, so canonicalize and *then* validate, never the reverse. | `grep -rn --include='*.java' -e 'ZipInputStream' -e 'ZipFile' -e 'JarInputStream' -e 'TarArchiveInputStream' -e 'getName()' .` Every extraction loop must carry the resolve-and-`startsWith` check before its `Files.copy` or `FileOutputStream`, and a fix written for one archive type does not cover a sibling loop for another. Apply the same read to every `Path.of(base, untrusted)` and `new File(base, untrusted)`. Empty output is the pass. Where find-sec-bugs runs, `PATH_TRAVERSAL_IN` and `PATH_TRAVERSAL_OUT` hits are labelled **potential** by the tool itself, so answer the "is this segment genuinely attacker-controlled" question before treating one as real. A clean run is not a clearance, and the family must not be blanket-suppressed as noise. | MUST |
| JAVA-SEC-06 | Build every subprocess command with the array or varargs `ProcessBuilder` form. Never concatenate into a single command element, never `Runtime.exec(String)`, never a `"sh", "-c", cmd + arg` triple. | Oracle `INJECT-4`: `Runtime.exec(String)`'s tokenizer is platform-specific and poorly specified, and any concatenation reopens shell reinterpretation of the metacharacter set. The guidance is not "escape better", it is to keep untrusted data off the command line entirely by passing it base64-encoded, through a temp file, or over stdin. | `grep -rn --include='*.java' -e 'Runtime.getRuntime().exec(' -e 'new ProcessBuilder(' .` A single-`String` argument built with `+`, `String.format` or interpolation, or a `"sh", "-c"` pair, is the finding regardless of tool availability. Empty output is the pass. Where wired: find-sec-bugs `COMMAND_INJECTION`, and Semgrep `p/java`'s `tainted-system-command` covers the same shape. | MUST |
| JAVA-SEC-08 | Add `find-sec-bugs` wherever SpotBugs gates a module that parses, deserialises, extracts or executes data from outside, and scope the plugin to those modules. A SpotBugs gate without it is not coverage of this family. Treat the tool as **maintained but fragile**: pin it per `JAVA-SEC-10`, and never let its absence downgrade any rule in this section. | Core SpotBugs' `SECURITY` category is one of ten and deliberately thin. The 144 vulnerability types and 800-plus API signatures for this family live only in the plugin. The plugin is alive (commits through 2026-03-25, repository unarchived) but slow, with maintainers explicitly declining to track current SpotBugs in their own build. Whether SpotBugs earns a gate slot at all is `JAVA-LINT-10`'s decision, in `lint-gate.md`; this row owns only what wiring it without `find-sec-bugs` fails to cover. | In any module declaring a `spotbugs { }` block or a `spotbugs-maven-plugin` with a bound execution, run the section gate above. **Empty output beside a SpotBugs gate is the finding, not the pass.** Where present, the pinned coordinate must be `1.14.0` or newer, because a model will emit a `1.8.0`-era coordinate from training data. Measured across the exemplar corpus 2026-09-12: 0 of 32. | SHOULD · **pinned** |
| JAVA-SEC-10 | Where `find-sec-bugs` is on the classpath, pin the SpotBugs core it runs against and prove the task actually ran. Never resolve the `com.github.spotbugs` Gradle plugin to exactly `6.4.1` or `6.4.2`. Set `spotbugs { toolVersion = "4.9.7" }` or higher explicitly, or use plugin `6.4.3` or newer. Never leave `ignoreFailures = true` (Gradle) or `failOnError = false` (Maven) on the gating task. | `findsecbugs-plugin` declares SpotBugs at `provided` scope, so the **consumer's** build, not the plugin, picks the core version at runtime, and a version-catalog bump can reintroduce the break with no build-file diff to review. The 4.9.5/4.9.6 combination is a hard `NoSuchMethodError` build break, not a missed finding. A green badge over a silently-skipped task is the other half of the same failure. | `grep -rn --include='*.gradle.kts' --include='*.gradle' --include='*.versions.toml' 'com.github.spotbugs' .` for the plugin version, then `grep -rn --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' -e 'toolVersion' -e 'ignoreFailures' -e 'failOnError' .` for the pin and the swallow. A resolved version inside the forbidden window is the finding, an absent `toolVersion` beside an unpinned plugin is the finding, and `ignoreFailures = true` on the gating task is the finding. Then confirm `spotbugsMain`/`spotbugsTest` (Gradle) or `spotbugs:check` (Maven) is a **failing** CI step, not a reporting one: a Maven `<reporting>`-only declaration runs on `mvn site` and nothing else, which is how assertj's SpotBugs block has never executed. | MUST where `find-sec-bugs` is wired |

```java
// wrong: hardened in a shared helper. Reads fine, and no tool can see across the method boundary.
DocumentBuilderFactory f = SafeXml.newHardenedDbf();
```

```java
// right: construction and hardening in one method body, naming this factory's own key.
DocumentBuilderFactory f = DocumentBuilderFactory.newInstance();
f.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
f.setXIncludeAware(false);
```

## The Dated Numbers

Defaults an adopter overrides once, not contracts. Every number was verified
**2026-09-12**.

| Artifact | Number | Re-check when |
|---|---|---|
| `jackson-databind` | `2.18.8`, `2.21.4` or `3.1.4` and above (GHSA-j3rv-43j4-c7qm, fixed 2026-06-04) | every release, because a transitive bump moves it silently |
| `findsecbugs-plugin` | `1.14.0`, released 2025-06-17, 15 months stale at this date | a `1.15.0` ships |
| `com.github.spotbugs` Gradle plugin | `6.4.3` or newer, which maps to SpotBugs `4.9.7`. Current is `6.5.6`, mapping to SpotBugs `4.10.2` | on any plugin bump, against the plugin's own compatibility table |
| Forbidden window | plugin `6.4.1` and `6.4.2` (SpotBugs `4.9.5` and `4.9.6`), a hard `NoSuchMethodError` build break | never, this one is not a judgment call |
| SpotBugs' restored `IO.close(InputStream)` | deprecated with a stated one-year clock ending around **October 2026** | October 2026. The fix exists on find-sec-bugs' `master` and no release carries it |

## A Resolved Version, Not a Configuration

The check here is a dependency report, not a source grep:

```bash
./gradlew -q dependencyInsight --configuration runtimeClasspath --dependency jackson-databind
```

or `mvn -q dependency:tree -Dincludes=com.fasterxml.jackson.core:jackson-databind`.
Read the **resolved** version it prints, never the catalog or BOM entry. A
version one patch below any floor is the finding no matter what the code
configures.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-SEC-02 | Wherever any polymorphic typing exists, meaning `@JsonTypeInfo` on a non-final base or any form of default typing, `jackson-databind` must **resolve** to `2.18.8`, `2.21.4` or `3.1.4` or above, *and* configure an explicit allow-list `PolymorphicTypeValidator`. Never `enableDefaultTyping()`, never `LaissezFaireSubTypeValidator`. | CVE-2026-54512 smuggles the denied class as a generic parameter (`_resolveAndValidateGeneric()` inspects only the substring before the angle bracket) and CVE-2026-54513 smuggles it as an array component (`allowIfSubTypeIsArray()` never checks the component type). Two mechanisms, one advisory, and patching a hand-rolled validator for one does not close the other. Teams already migrated onto a PTV per Jackson's own 2020 guidance were still exposed. | `grep -rn --include='*.java' --include='*.kt' -e 'enableDefaultTyping' -e 'activateDefaultTyping' -e '@JsonTypeInfo' .` Empty output means there is no polymorphic surface and the rule is structurally satisfied. Any hit sends you to the resolved-version command above, and to reading the validator: an argument that is not a `BasicPolymorphicTypeValidator.builder()` chain is the hole, and `LaissezFaireSubTypeValidator.instance` is the same hole with a nicer name. Re-run on every release (floors dated 2026-06-04, verified 2026-09-12). | MUST |

## A Grep and a Reading, No Gate

No dataflow engine is needed for either row and none is reliably available. The
grep is the primary check, and a person reads the hits.

```bash
grep -rn --include='*.java' -e 'new Random(' -e 'Math.random(' -e 'ThreadLocalRandom' -e 'SplittableRandom' -e 'SecurityManager' -e 'doPrivileged' -e 'AccessController' .
```

Empty output is the pass for both rows. Every hit is read, not counted.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-SEC-07 | Never use `java.util.Random`, `Math.random()`, `ThreadLocalRandom` or `SplittableRandom` for a token, key, nonce, session id, reset code, or any value whose predictability costs something. `SecureRandom` or `UUID.randomUUID()` only. | All four are LCG-or-splittable PRNGs with no cryptographic hardness, and a handful of observed outputs reconstructs internal state. The distinction an agent misses is *unique* versus *unpredictable*: `Random` satisfies the first and never the second. | Read each hit's surrounding identifiers for `token`, `key`, `nonce`, `session`, `secret`, `password` or `reset`. Empty output is the pass. Tool support is thin and partly unverified: SpotBugs core's `DMI_RANDOM_USED_ONLY_ONCE` catches a narrower bug (per-call instantiation), find-sec-bugs `PREDICTABLE_RANDOM` catches this one where wired, Semgrep's 60-rule `p/java` has no equivalent rule at all, and SonarJava `S2245` was **not** independently verified as of 2026-09-12, so confirm the key before citing it as the gate. `UUID.randomUUID()` has been `SecureRandom`-backed since JDK 7. | MUST |
| JAVA-SEC-09 | Never emit guidance, rule text or code that relies on the Security Manager for a JDK 24 or newer target: no `doPrivileged`, no `AccessController`, no `SecurityManager` subclass, no `.policy` file. Cite Oracle's Secure Coding Guidelines section 9 only alongside its own historical-scope note. | JEP 486 made this non-functional, not merely legacy: `System.setSecurityManager()` throws `UnsupportedOperationException` and enabling it at startup aborts the JVM. Oracle's own page opens all twenty section-9 guidelines with the "permanently disabled since Java 24" disclaimer. Sections 0, 1, 2, 3, 5 and 8 of the same document carry no caveat and stay current. | Extend the section grep to prose with `grep -rn --include='*.md' -e 'SecurityManager' -e 'doPrivileged' -e 'AccessController' .` Any hit not explicitly scoped "pre-JDK-24 only" is the finding. Empty output is the pass. Reject on sight rather than reviewing for correctness. Floor: JDK 24, JEP 486 (verified 2026-09-12). | MUST |

## What Agents Get Wrong Here

1. **"A `PolymorphicTypeValidator` is configured, so this is fixed."** A model
   that knows Jackson's 2020 hardening and has a cutoff before mid-2026 approves
   the code and stops. Never accept the configuration as the answer. Resolve the
   version, mechanically, every time, regardless of what the reviewing model
   remembers.
2. **`mapper.enableDefaultTyping()` to make a heterogeneous collection
   round-trip.** The reflexive fix for a deserialization failure, and the
   original hole. `LaissezFaireSubTypeValidator.instance` is the same move with a
   nicer name.
3. **XXE hardening applied to one factory and assumed to transfer**, or moved
   into a shared `newSafeFactory()` helper and assumed verified. No tool sees
   across the method boundary, so the tidier version is the less verifiable one.
4. **`Runtime.getRuntime().exec("cmd " + arg)`.** Effectively obsolete since
   Java 5's `ProcessBuilder`, and still the first idiom from pre-2015 tutorial
   content. The fix is the array overload, not better escaping.
5. **`SecurityManager`, `doPrivileged` or a `.policy` file proposed for a
   JDK-24-or-newer target.** Not legacy, non-functional. The generated text reads
   authoritative because it was correct for fifteen years.
6. **`new Random()` for "a random id".** The model conflates *unique* with
   *unpredictable*. Ask which property is required before accepting either.
7. **Emitting a stale `findsecbugs-plugin` coordinate from training data**, or
   pinning `com.github.spotbugs` into the `6.4.1`/`6.4.2` window, which
   hard-crashes find-sec-bugs `1.14.0`. The break is from September 2025 and
   postdates most pretraining cutoffs, so the model cannot know it.
8. **"SpotBugs is declared in the POM" read as "SpotBugs runs in CI."** Confirm
   the plugin sits under `<build><plugins>` with a bound execution, or that a CI
   job invokes `spotbugs:check`, and that `ignoreFailures` or `failOnError` is
   not swallowing the result.
9. **Reading "find-sec-bugs is 0 of 32" as "find-sec-bugs is abandoned"** and
   skipping it where MUST-tier XXE or command-injection coverage is genuinely
   needed. Before calling a tool dead, require a fetched release date plus commit
   and issue recency. The correct reading here is *unmeasured, not unmaintained*.
10. **Treating a clean `find-sec-bugs` or SonarJava run as a clearance.** Both
    label path-traversal findings "potential" and neither does interprocedural
    dataflow, so absence of a finding carries no information about
    `JAVA-SEC-03` or `JAVA-SEC-05`.
