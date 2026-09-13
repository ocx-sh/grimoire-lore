---
title: "Java runtime safety: untrusted input and failure handling"
topic: java-runtime-safety
model: opus
id_family: [JAVA-SEC, JAVA-ERR, KT-ERR]
consolidates:
  - jvm-java-runtime-safety/untrusted-input-and-deserialization.md
  - jvm-java-runtime-safety/errors-resources-and-lifecycle.md
  - jvm-java-runtime-safety/find-sec-bugs-viability.md
  - jvm-java-runtime-safety/kotlin-errors-resources-and-throws.md
date: 2026-09-12
revised: 2026-09-12
---

# Java runtime safety: untrusted input and failure handling

Consolidates the two `java-runtime-safety` dives of wave 3 and the two follow-up
dives of wave 4 into the ruleset a later author works from. Families owned here:
**JAVA-SEC** ([map](jvm-topic-map.md) rows M-P-01..09, depth file
`rules/java-quality/security-and-untrusted-input.md`), **JAVA-ERR**
(M-O-01..07, depth file `rules/java-quality/errors-and-resources.md`), and — as
of the wave-4 revision — **KT-ERR** (depth file
`rules/kotlin-quality/errors-and-resources.md`, the 28th depth file; see
Verdict 12).

Explicitly *not* taken here: the tool-wiring rows (which linter runs, at what
severity, in which build file) belong to `JAVA-LINT` and already landed in
[jvm-quality-gates.md](jvm-quality-gates.md) — this file cites `JAVA-LINT-01/02/03/07/10`
and amends two of them rather than restating them. Virtual-thread executors and
`CompletableFuture` exception loss (M-N-06/07) stay with `JAVA-CONC`.
Coroutine-scoped `CancellationException` swallowing around a **suspend** call is
`M-U-04`/`KT-CORO`'s `SuspendFunSwallowedCancellation` row — `KT-ERR-01` below
covers only the non-suspend residue. `@Throws` placement is `M-V-04`
(`KT-INTEROP`) and `kotlin.Result` as a public return type is `M-V-07`
(`KT-API`); both are cited, never restated.

## Verdict

1. **For Jackson, the check is the resolved version, not the configuration.**
   CVE-2026-54512 and CVE-2026-54513 (both fixed 2026-06-04) bypass a
   *correctly configured allow-list* `PolymorphicTypeValidator` by hiding the
   denied class in a generic parameter or an array component the validator never
   inspects ([GHSA-j3rv-43j4-c7qm](https://github.com/advisories/GHSA-j3rv-43j4-c7qm)).
   A reviewer who confirms "a PTV is present" and stops has confirmed nothing.
   Resolve `jackson-databind` against `≥2.18.8` / `≥2.21.4` / `≥3.1.4`, every
   release, mechanically. Binds: library, application, SDK.
2. **Oracle's Secure Coding Guidelines section 9 (Access Control, `9-1`..`9-20`)
   may be cited only through its own historical-scope note, never as guidance.**
   [JEP 486](https://openjdk.org/jeps/486) permanently disabled the Security
   Manager in JDK 24; Oracle's own page already opens every one of those twenty
   guidelines with "*the security manager has been permanently disabled since
   Java 24*". Any generated text proposing `doPrivileged`, an `AccessController`
   call, a `SecurityManager` subclass or a `.policy` file for a JDK-24+ target is
   dead on arrival. Sections 0/1/2/3/5/8 of the same document carry no caveat and
   are current — `SERIAL-6` is the deserialization citation, `INJECT-4` the
   command-line one, `INJECT-5` the XML one. Binds: every consumer.
3. **The OCX SDK's subprocess boundary is two boundaries, not one.** The JSON the
   `ocx` CLI prints on stdout is *inside* the deserialization boundary — the CLI
   is a thin client over a live OCX service, so resource names and error payloads
   reach it from that service, and a pipe is not a trust boundary for data it did
   not originate. The SDK's own `ProcessBuilder` call is *outside* it, because
   there the SDK is the producer: `JAVA-SEC-06` binds it as the caller
   constructing the command. Two different call sites in one library, two
   different rules. Re-derive, do not copy, for any consumer whose subprocess has
   no live upstream. Binds: SDK, Gradle plugin.
4. **`find-sec-bugs` and core SpotBugs answer different questions, and the landed
   `JAVA-LINT-10` conflated them.** Core SpotBugs has *zero* detectors for XXE,
   command injection, path traversal or JNDI — every JAVA-SEC shape below except
   `Random` misuse is invisible to it. But SpotBugs' `CORRECTNESS`+`MT_CORRECTNESS`
   (175 patterns) independently earns a slot for `UL_UNRELEASED_LOCK` and the
   annotation-free `NP_*` dataflow family, which Error Prone has no analog for at
   any promotion level. `JAVA-LINT-10` is amended in Conflict 1 below.
5. **The single most characteristic agent-written Java failure is silent in every
   default configuration measured**, and the fix is a build-file change, not a
   code rule: `CatchingUnchecked`, `UnusedException` and `InterruptedExceptionSwallowed`
   are all in Error Prone 2.36.0's `DISABLED_CHECKS` (150 members). That
   promotion is `JAVA-LINT-02`'s job, not this family's — JAVA-ERR states the
   code shape, JAVA-LINT states the flag. Do not write the flag twice.
6. **A library never owns process lifecycle.** `System.exit()` from SDK or
   Gradle-plugin code is a MUST-not, sharper for the plugin than the generic
   case: it kills the Gradle daemon. The SDK's sysexit-to-exception table
   ([cfg](jvm-audit/config-inventory.md) Axis 3, 16-member `ExitCode`) is the
   *correct* discharge of the same concern — translate the child's exit code into
   a typed exception, never re-raise it as your own. Binds: library, SDK, Gradle plugin.
   Not binding: CLI `main`. On the Kotlin side the surface is wider and the
   single gate is off by default: `KT-ERR-05` covers `System.exit`,
   `Runtime.exit`, `Runtime.halt` and `exitProcess` in one detekt rule that
   ships `active: false`.
7. **Three rows go into the always-loaded `rules/java-quality.md` index from
   JAVA-ERR and exactly one from JAVA-SEC**, not five and one. See Conflict 4.
   `rules/kotlin-quality.md`'s index takes **two** KT-ERR rows — `KT-ERR-01` and
   `KT-ERR-03` — plus the `JAVA-SEC-01` line the map already reserved. See
   Conflict 11.
8. **Sneaky-throw gets no rule in either direction.** Goetz calls advising it
   "irresponsible"; Kabutz documents a narrow legitimate case. Recorded as
   CONSIDER with both positions, per the dive's decision (c).
9. **Every JAVA-SEC shape currently has grep as its only gate in this corpus.**
   `find-sec-bugs` is **0/32**, and all three exemplars that gate on SpotBugs run
   it without the plugin ([gates](jvm-audit/exemplar-quality-gates.md) §1,
   `JAVA-LINT-10`). A rule that assumes "SpotBugs is wired, so this family is
   covered" is wrong about every measured adopter. The wave-4 dive settles the
   reading of that zero: **unmeasured, not unmaintained** — no exemplar has
   bothered to add the plugin, which is consistent with the corpus generally
   under-investing in this family, and is not evidence the tool is dead.
10. **`find-sec-bugs` is maintained but fragile, so `JAVA-SEC-08` stays SHOULD
    and the six rules that name it keep their MUST severity with an explicit grep
    fallback.** Commits landed on `master` through 2026-03-25 and the repo is
    unarchived, but the last *release* is 1.14.0 (2025-06-17), 15 months stale,
    declaring SpotBugs 4.8.6 against a current 4.10.4. The plugin's SpotBugs
    dependency is `provided`-scope, so the **consumer's** build picks the core
    version at runtime — which is how 1.14.0 came to throw `NoSuchMethodError` on
    `edu.umd.cs.findbugs.io.IO.close(InputStream)` under SpotBugs 4.9.5/4.9.6
    ([find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766)).
    SpotBugs, not find-sec-bugs, fixed it — restoring the method as deprecated in
    4.9.7 ([spotbugs#3756](https://github.com/spotbugs/spotbugs/pull/3756)). The
    version-pin clause is `JAVA-SEC-10`.
11. **Documented gap, not an answer: no published false-positive rate exists for
    any `XXE_*` or `PATH_TRAVERSAL_*` rule, and no static-analysis tool sees
    hardening applied in a helper method.** Searched the find-sec-bugs tracker
    and found no benchmark and no maintainer-quoted number; the tool's own bug
    list calls `PATH_TRAVERSAL_IN`/`OUT` findings "potential". Separately,
    `XXE_SCHEMA_FACTORY` false-fires when creation and hardening sit in different
    methods — maintainer-acknowledged as an intentional limitation, because
    find-sec-bugs does no interprocedural dataflow
    ([find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738))
    — and SonarJava's `S2755` has the same blind spot. Consequence, folded into
    `JAVA-SEC-03`'s verification: require the hardening block **in the same
    method** as the factory construction, and never read the absence of a tool
    finding as evidence of safety. Two further dated hazards ride on this gap:
    SpotBugs' restored method is deprecated with a stated ~1-year clock ending
    around **October 2026**, and the `master` fix that would survive its removal
    has not shipped in any release.
12. **Kotlin earns the 28th depth file.** `kotlin-quality/errors-and-resources.md`,
    family `KT-ERR`, five rows. The map left "27 or 28 depth files" to this dive;
    the answer is 28. The five rows share nothing with `KT-CORO`'s
    structured-concurrency scope or `KT-INTEROP`'s boundary-annotation scope:
    they are all about what happens to a `Throwable` once it exists, or to a
    handle once it is acquired. `@Throws` (`M-V-04`) and `Result`-as-return-type
    (`M-V-07`) stay where they are and get no KT-ERR row.
13. **Kotlin's default gate is stronger than Java's in one place and structurally
    blind in two others — an agent that assumes detekt mirrors Error Prone has it
    backwards.** Exception *chaining* (`SomeException(e.message)` instead of
    `SomeException(e)`) is named verbatim in detekt's `SwallowedException` KDoc
    and that rule ships `active: true`, where Java's `UnusedException` sits in
    `DISABLED_CHECKS` and `JAVA-ERR-04` must spend a MUST on the promotion. But
    `runCatching` is `inline`, so its internal `catch (e: Throwable)` never
    appears as a `KtCatchClause` and **no** catch-clause-keyed detekt rule can
    ever see it (`KT-ERR-01`); and `SwallowedException`'s default
    `ignoredExceptionTypes` whitelists `InterruptedException`, so hardening that
    rule gives false confidence on exactly the hazard `JAVA-ERR-01` exists for
    (`KT-ERR-02`). ktlint carries none of this surface at all — zero rule classes
    reference exceptions, resources or exit.

## The ruleset

### JAVA-SEC — untrusted input

Depth file: `rules/java-quality/security-and-untrusted-input.md`. Routing line:
*"Parsing, deserialising, extracting, executing, or resolving a path from data
you did not write."*

#### Group 1 — caught inside `javac` by Error Prone

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-SEC-01** | Never call `ObjectInputStream.readObject()`/`readUnshared()` on bytes that crossed a trust boundary without an `ObjectInputFilter` allow-list attached; prefer not using Java serialization across that boundary at all. | The stream's content decides which classes are constructed, and `readObject`/`readResolve`/`readExternal` side effects run before any application check — the `ysoserial` gadget-chain shape. There is no safe deny-list ([CERT SER12-J](https://cmu-sei.github.io/secure-coding-standards/sei-cert-oracle-coding-standard-for-java/rules/serialization-ser/ser12-j/); Oracle `SERIAL-6`). | Error Prone `BanSerializableRead` at `ERROR`. Without it: `grep -rn 'new ObjectInputStream(' --include=*.java` — every hit needs an adjacent `setObjectInputFilter(...)`, or a comment establishing the stream is written and read by this same process. | **MUST** | `ObjectInputFilter` JDK 9; context-specific filters JDK 17; Error Prone 2.36.0 |
| **JAVA-SEC-04** | Never pass an attacker-influenced string as the name argument to `Context.lookup()` or any of the ~40 related `javax.naming`/JDO/JMX/SQL-rowset lookup APIs. | An `rmi://`/`ldap://`/`corba://` name can return a `javax.naming.Reference` whose `classFactoryLocation` the JNDI client fetches and instantiates — remote class loading, independent of any serialization bug ([CERT VU#930724](https://www.kb.cert.org/vuls/id/930724), Log4Shell's root cause). | Error Prone `BanJNDI` at `ERROR` (bans the surface outright). Without it: `grep -rn '\.lookup(\|new InitialContext(' --include=*.java` — flag any argument that is not a compile-time constant or a closed, non-attacker-reachable config value. | **MUST** | Error Prone 2.36.0 |

#### Group 2 — no detector in core SpotBugs; `find-sec-bugs` or grep only

Every rule in this group survives at MUST **on its grep fallback alone**
(Verdict 10). `find-sec-bugs` is the automated check where it is wired; its
absence changes the verification column, never the severity.

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-SEC-03** | Harden every XML parser factory independently — `DocumentBuilderFactory`, `SAXParserFactory`, `XMLInputFactory`, `TransformerFactory`, `SchemaFactory`, `javax.xml.validation.Validator`, JAXB's unmarshal source, and any XPath source document — **in the same method that constructs it**. Hardening one is not evidence for another, and hardening in a helper method is not evidence for any of them. | Each factory carries its own default feature set and none inherits another's. Oracle `INJECT-5` names three distinct inclusion vectors — DTD, XInclude, and the XSLT `document()`/`import`/`include` family — so closing only the DTD path leaves two live ([OWASP XXE Prevention](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html)). The same-method clause is not style: **no** available tool does interprocedural dataflow here — find-sec-bugs' maintainer states it outright ([#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738)) and SonarJava `S2755` shares the blind spot — so a factory configured through a helper is unverifiable by machine, and h3xstream's own argument is that a *public* helper is not actually safe even with such analysis (a subclass can override it). | For every `*Factory.newInstance()` / `new SAXBuilder()` / `new SAXReader()` call site, a `setFeature`/`setAttribute`/`setProperty` block naming **that** factory's `disallow-doctype-decl` or `ACCESS_EXTERNAL_*` key, **inside the same method body**. `grep -rn -A5 'Factory\.newInstance()\|new SAXBuilder(\|new SAXReader(' --include=*.java --include=*.kt`; count factory-type occurrences against hardening-block occurrences — any type appearing more often is the gap. Automated, where wired: `find-sec-bugs`' eight `XXE_*` rules — **absent from core SpotBugs entirely**, and covering only 4 of the 8 factories in Semgrep's `p/java` (no rule for `SchemaFactory`, `Validator`, `XMLReader` or XPath). **Absence of a tool finding is not evidence of safety on this rule.** | **MUST** | find-sec-bugs 1.14.0 (optional); the grep is the floor |
| **JAVA-SEC-05** | Resolve a caller-supplied path segment against its base directory and verify containment *before* opening any stream — `base.resolve(segment).normalize().startsWith(base)`, or `toRealPath()` where symlinks matter. This is one rule at two call sites: archive-entry names and ordinary filenames. | `ZipEntry.getName()` is a raw attacker-controlled string and the JDK ships no safe extraction API for zip, jar, war, tar, cpio, apk or 7z — every extractor re-derives the check ([Snyk zip-slip](https://github.com/snyk/zip-slip-vulnerability)). For the general case, CERT `FIO16-J`: a textual `contains("..")` test is defeated by symlinks and path-equivalence, so canonicalize *then* validate, never the reverse. | Every extraction loop (`ZipInputStream`, `ZipFile`, `JarInputStream`, `TarArchiveInputStream`) has the resolve-and-`startsWith` check before its `Files.copy`/`FileOutputStream`; a fix written for one archive type does not cover a sibling loop for another. Same check on every `Path.of(base, untrusted)`/`new File(base, untrusted)`. Automated, where wired: `find-sec-bugs` `PATH_TRAVERSAL_IN`/`PATH_TRAVERSAL_OUT` — carry the tool's own caveat into review: these findings are **"potential"** by the tool's own documentation, so a hit needs the "is this segment genuinely attacker-controlled" question answered before it is treated as real, and a clean run is not a clearance. Do not blanket-suppress the family as noise. | **MUST** | find-sec-bugs 1.14.0 (optional); the grep is the floor |
| **JAVA-SEC-06** | Build every subprocess command with the array/varargs `ProcessBuilder` form. Never concatenate into a single command element, never `Runtime.exec(String)`, never `"sh", "-c", cmd + arg`. | Oracle `INJECT-4`: `Runtime.exec(String)`'s tokenizer is platform-specific and poorly specified, and any concatenation reopens shell reinterpretation of `;`/`\|`/`` ` ``/`$()`. The guidance is not "escape better" — it is to keep untrusted data off the command line, passing it base64-encoded, via a temp file, or over stdin. | `grep -rn 'Runtime.getRuntime().exec(\|ProcessBuilder(' --include=*.java --include=*.kt` — a single-`String` argument built with `+`/`String.format`/interpolation, or a `"sh", "-c"` pair, is the finding, regardless of tool availability. Automated, where wired: `find-sec-bugs` `COMMAND_INJECTION`; Semgrep `p/java`'s `tainted-system-command` covers the same shape. | **MUST** | — |
| **JAVA-SEC-08** | Add `find-sec-bugs` whenever SpotBugs gates a module that parses, deserialises, extracts or executes untrusted input — and scope it to those modules. A SpotBugs gate without it is not coverage of this family. Treat the tool as **maintained but fragile**: pin it per `JAVA-SEC-10`, and never let its absence downgrade any rule in Group 2. | Core SpotBugs' `SECURITY` category is one of ten and deliberately thin; the 144 vulnerability types and 800+ API signatures for this family live only in the plugin ([find-sec-bugs bug list](https://find-sec-bugs.github.io/bugs.htm)). The plugin is alive — commits through 2026-03-25, unarchived — but slow: 15 months since the 1.14.0 release, maintainers explicitly declining to track current SpotBugs in their own build ([#767](https://github.com/find-sec-bugs/find-sec-bugs/pull/767)). | `grep -rn 'findsecbugs' **/*.gradle* **/pom.xml **/*.toml` in any module that also declares a `spotbugs { }` block or a `spotbugs-maven-plugin` with a **bound** execution. **Empty output plus a SpotBugs gate is the finding.** Where it is present, the pinned version must be `1.14.0` or newer — an LLM will emit a 1.8.0-era coordinate from training data. Measured 2026-09-12: 0/32. | SHOULD · CONSIDER for the OCX SDK and plugin (neither has an XXE, archive or JNDI surface today) | find-sec-bugs 1.14.0; `com.github.spotbugs` Gradle plugin **6.4.3+** (SpotBugs 4.9.7+), never 6.4.1/6.4.2 |
| **JAVA-SEC-10** | Where `find-sec-bugs` is on the classpath, pin the SpotBugs core it runs against and prove the task actually ran. Never resolve the `com.github.spotbugs` Gradle plugin to exactly `6.4.1` or `6.4.2` (SpotBugs 4.9.5/4.9.6) — set `spotbugs { toolVersion = "4.9.7" }` or higher explicitly, or use plugin `6.4.3+` (current: 6.5.6 → SpotBugs 4.10.2). Never leave `ignoreFailures = true` (Gradle) / `failOnError = false` (Maven, which find-sec-bugs' own sample POMs default off) on the gating task. | `findsecbugs-plugin` declares SpotBugs at `<scope>provided</scope>`, so the consumer's build — not the plugin — picks the core version at runtime; a version-catalog bump can reintroduce the break with no build-file diff to review. The 4.9.5/4.9.6 combination is a hard `NoSuchMethodError` **build break**, not a missed finding, and the deprecation that currently un-breaks it expires ~October 2026 with no `1.15.0` released. A green quality badge over a silently-skipped task is the other half of the same failure. | `grep -n 'com.github.spotbugs' **/*.gradle*` for the plugin version and `grep -rn 'toolVersion\|ignoreFailures\|failOnError'` for the pin and the swallow; cross-reference against the compatibility table in [find-sec-bugs-viability](jvm-java-runtime-safety/find-sec-bugs-viability.md) §4. In CI, the `spotbugsMain`/`spotbugsTest` (Gradle) or `spotbugs:check` (Maven) step must be a failing step, not a reporting one. | **MUST** where `find-sec-bugs` is wired · N/A otherwise | `com.github.spotbugs` 6.4.3+ / SpotBugs 4.9.7+; find-sec-bugs 1.14.0 |

#### Group 3 — caught by a dependency-version check, not a code check

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-SEC-02** | Wherever any polymorphic typing exists — `@JsonTypeInfo` on a non-final base, or any form of default typing — `jackson-databind` must **resolve** to `≥2.18.8`, `≥2.21.4` or `≥3.1.4`, *and* configure an explicit allow-list `PolymorphicTypeValidator`. Never `enableDefaultTyping()`, never `LaissezFaireSubTypeValidator`. | CVE-2026-54512 smuggles the class as a generic parameter (`ArrayList<Evil>`; `_resolveAndValidateGeneric()` checks only the substring before `<`); CVE-2026-54513 smuggles it as an array component (`Evil[]` via `allowIfSubTypeIsArray()`, which never checks the component type). Two distinct mechanisms, one advisory — patching a hand-rolled validator for one does not close the other. Teams that had already migrated onto a PTV per Jackson's own 2020 guidance were still exposed. | `grep -rn 'enableDefaultTyping\|activateDefaultTyping\|@JsonTypeInfo' --include=*.java --include=*.kt`, then read the **resolved** version from the dependency report or lockfile — not the catalog entry — against the three floors. A version one patch below any floor is the finding regardless of what the code configures. Re-run on every release: the mitigation drifts silently on a transitive bump. | **MUST** | jackson-databind 2.18.8 / 2.21.4 / 3.1.4 (GHSA-j3rv-43j4-c7qm, 2026-06-04) |

#### Group 4 — a reading heuristic and a grep; no gate exists

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-SEC-07** | Never use `java.util.Random`, `Math.random()`, `ThreadLocalRandom` or `SplittableRandom` for a token, key, nonce, session id, reset code or any value whose predictability costs something. `SecureRandom` or `UUID.randomUUID()` only. | All four are LCG-or-splittable PRNGs with no cryptographic hardness; a handful of observed outputs reconstructs internal state ([OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)). The distinction an agent misses is *unique* versus *unpredictable* — `Random` satisfies the first and never the second. | **The grep is the primary check, not a fallback** — this family needs no dataflow engine. `grep -rn 'new Random(\|Math.random(\|ThreadLocalRandom\|SplittableRandom' --include=*.java` and read each hit's surrounding variable names for `token`/`key`/`nonce`/`session`/`secret`/`password`/`reset`. Tool support is thin and partly unverified: SpotBugs core's `DMI_RANDOM_USED_ONLY_ONCE` catches a **narrower** bug (per-call instantiation), not this one; `find-sec-bugs` `PREDICTABLE_RANDOM` catches the security context where wired; Semgrep's 60-rule `p/java` has **no equivalent rule at all**; SonarJava `S2245` is named in the catalogue but its coverage was **not independently verified** as of 2026-09-12 — confirm the key before citing it as the gate. | **MUST** | `UUID.randomUUID()` is `SecureRandom`-backed since JDK 7 |
| **JAVA-SEC-09** | Never emit guidance, rule text or code that relies on the Security Manager for a JDK-24+ target — no `doPrivileged`, no `AccessController`, no `SecurityManager` subclass, no `.policy` file. Cite Oracle's section 9 only alongside its own historical-scope note. | JEP 486 made this non-functional, not merely legacy: `System.setSecurityManager()` throws `UnsupportedOperationException` and enabling it at startup aborts the JVM. Oracle's page carries the disclaimer on all twenty guidelines. | `grep -rn 'SecurityManager\|doPrivileged\|AccessController' --include=*.java --include=*.md` — any hit not explicitly scoped "pre-JDK-24 only" is the finding. Reject on sight rather than reviewing for correctness. | **MUST** | JDK 24 (JEP 486) |

### JAVA-ERR — failures and resources

Depth file: `rules/java-quality/errors-and-resources.md`. Routing line:
*"Throwing, catching, wrapping or logging a failure; opening anything that must
be closed."*

#### Group 1 — caught by Error Prone, but only after `JAVA-LINT-02`'s promotion

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-ERR-01** | A caught `InterruptedException` — including one caught implicitly by a wider `catch (Exception)`/`catch (Throwable)` — must either re-interrupt (`Thread.currentThread().interrupt()`) or propagate. Never log it like any other exception. | Swallowing it clears cooperative cancellation for every caller up the stack. Two different mistakes hide here: calling `Thread.interrupted()` (which *clears* the bit) instead of `currentThread().interrupt()`, and never noticing the interrupt was caught at all. | `InterruptedInCatchBlock` is `ENABLED_WARNINGS` and catches only the first. The second needs `-Xep:InterruptedExceptionSwallowed:ERROR` (`DISABLED_CHECKS`, line 1297) — SonarJava `S2142` is the only default-on alternative. Grep: a `catch (Exception\|Throwable` whose `try` block contains `await(`/`wait(`/`join(`/`sleep(`/`waitFor(`/`.get(` and whose body has no `interrupt()`. Kotlin side: `KT-ERR-02`, where **no tool equivalent exists at all**. | **MUST** | Error Prone 2.36.0 |
| **JAVA-ERR-04** | Never construct a new exception from a caught one without passing it as the cause. `new SomeException("...: " + e.getMessage())` is always wrong. | It *looks* like the failure survived — the message string does — while the stack trace, the exception type and every suppressed exception are discarded. Effective Java Item 77 and Error Prone's `UnusedException` converge on the same fix and the same `unused`/`_` naming convention for a deliberate ignore. | `-Xep:UnusedException:ERROR` (`DISABLED_CHECKS`, line 1378) catches the general shape. Grep the specific one: `grep -rnE 'new \w*Exception\([^,)]*\.getMessage\(\)\)' --include=*.java`. Kotlin side: `KT-ERR-04`, where detekt's `SwallowedException` already covers it **on by default** — the one place Kotlin's gate is stronger than Java's. | **MUST** | Error Prone 2.36.0 |
| **JAVA-ERR-02** | Do not catch `Throwable` or `Error`, except at one documented top-level boundary such as a framework's uncaught-exception hook. In test code this is not a style point: `fail()` and every `assert*` throw `AssertionError`, so `try { …; fail(); } catch (Throwable t) { }` makes the test structurally unable to fail. | Production: masks `OutOfMemoryError`/`StackOverflowError`. Test: masks the assertion itself, which is the failure mode an agent writing a negative test reaches for by default. | `TryFailThrowable` (Error Prone `ENABLED_ERRORS`, line 900 — on by default) for the test shape; SonarJava `S1181` (CWE-396, CERT `ERR08-J`) for the production shape. Grep: `catch\s*\(\s*(Throwable\|Error)\b`. Kotlin side: `KT-ERR-01` — the same mistake wearing `runCatching` instead of a keyword, and invisible to every lint. | **MUST** | Error Prone 2.36.0 |

#### Group 2 — caught by Error Prone with no promotion needed

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-ERR-03** | Acquire every `Closeable`/`AutoCloseable` inside try-with-resources — including the `Stream` returned by `Files.walk`, `list`, `lines`, `find` and `newDirectoryStream`, and including a wrapping stream such as `ObjectInputStream` whose inner stream is closed separately. | `Stream<String>`'s type signature gives no hint it holds an open file descriptor; the JDK's own `Files` javadoc says `lines` "encapsulates a `Reader`" and the other four "encapsulate one or more `DirectoryStream`s". Closing only the wrapped stream leaves the wrapper's own buffers and state unreleased. | `StreamResourceLeak` (`ENABLED_WARNINGS`, line 1175) and `MustBeClosedChecker` (`ENABLED_ERRORS`, line 844) — both on by default; SonarJava `S2095` where SonarQube runs, and it is the only one of the three that needs neither an annotation nor a fixed API list. **Do not name PMD `CloseResource` as a third option** — SonarSource's own rule page records S2095 as having deprecated it in Sonar 5.3, and PMD is enforced 0/32. Grep: `Files\.(walk\|list\|lines\|find\|newDirectoryStream)\(` without an enclosing `try (`. Kotlin side: `KT-ERR-03`, where the type-level gap is worse (`Sequence`/`Flow` are not `AutoCloseable`) and no lint exists. | **MUST** | Error Prone 2.36.0; SonarJava S2095 |
| **JAVA-ERR-07** | Library code — anything that is not a CLI `main` — never calls `System.exit()` and never calls `printStackTrace()` in place of the configured logger. A Gradle plugin calling `System.exit()` kills the daemon. | A library must not own process lifecycle; a `printStackTrace()` call writes past log aggregation and past every log level. | `CatchAndPrintStackTrace` (Error Prone `ENABLED_WARNINGS`, line 958) for the second half — it reports as an ordinary compiler diagnostic. **Do not rely on SonarJava `S4507`**: it is `type: VULNERABILITY`, rendered as a Security Hotspot, and invisible to the common "no new Issues" quality gate — a codebase where the deprecated `S1148` found 28 hits shows zero `S4507` findings. SpotBugs `DM_EXIT` for the first half. Grep `\.printStackTrace\(\)` and `System\.exit\(` outside `main`. Kotlin side: `KT-ERR-05` — one detekt rule covers four call shapes including `Runtime.halt()`, which `DM_EXIT` does not name, but it ships off. | **MUST** for library, SDK, Gradle plugin · N/A for a CLI entry point | Error Prone 2.36.0 |

#### Group 3 — caught by `javac` flags or SpotBugs; not by Error Prone at any promotion

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-ERR-06** | Do not override `finalize()`. Use try-with-resources for scoped cleanup and `java.lang.ref.Cleaner` for GC-triggered cleanup of a native handle. | Terminally deprecated since JDK 18 ([JEP 421](https://openjdk.org/jeps/421)) for unpredictable latency and resurrection risk; `Cleaner` gives the same GC trigger without either. | `-Xlint:removal -Werror` fails the build outright. **This requires adding `removal` to `JAVA-LINT-07`'s enumerated `-Xlint` key list, which currently omits it** — see Conflict 5. Grep: `protected void finalize\(`. | **MUST** | JDK 18 (JEP 421); `Cleaner` JDK 9 |
| **JAVA-ERR-08** | Every `Serializable` class declares an explicit `private static final long serialVersionUID`. | An implicit UID is computed from the class's structure and changes silently on an innocuous edit or a compiler upgrade, breaking deserialization of already-persisted instances. | SpotBugs `SE_NO_SERIALVERSIONID` (`BAD_PRACTICE`, detector on by default) or SonarJava `S2057`. **Error Prone has no equivalent in any of its three lists** — this is a SpotBugs/SonarJava-only concern. | SHOULD | — |

#### Group 4 — reading heuristics; no mechanical gate exists

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **JAVA-ERR-05** | Shut down every `ExecutorService` on every exit path. If you use JDK 19+'s `close()` via try-with-resources, know that it blocks **indefinitely** — there is no timeout parameter, unlike `shutdown()` + `awaitTermination(t, unit)` + `shutdownNow()`. | Porting bounded shutdown code to `try (var pool = …)` silently removes the bound that `awaitTermination(30, SECONDS)` used to provide, turning a slow task into a hung build. The JDK's own javadoc is explicit: `close()` "waits until all tasks have completed execution". | Grep `Executors\.new` / `ExecutorService` and confirm a `shutdown()` or a `try (` pairing on every path; for `close()`-based code, confirm the call site can tolerate an unbounded wait. No lint catches "this blocking call has no timeout". Pool sizing, virtual-thread-per-task semantics and `ForkJoinPool` regime are **`JAVA-CONC`'s M-N-05/06**, not this rule. | **MUST** | JDK 19 (`ExecutorService extends AutoCloseable`) |
| **JAVA-ERR-09** | Prefer wrapping a checked exception in a standard unchecked one (`UncheckedIOException`, `IllegalStateException(cause)`) over a sneaky-throw helper. Reserve sneaky-throw for implementing a functional interface or overriding a method that cannot declare the checked exception. | Genuinely contested: Goetz calls advising it "irresponsible … places the convenience of the code writer over … transparency and maintainability"; Kabutz documents the mechanics and names the narrow override case as legitimate while answering "no" in general. Neither position displaced the other as of 2026-09-12. Kotlin has no checked exceptions, so this contest has **no KT-ERR analogue** — `@Throws` placement (`M-V-04`) takes its place. | Reading heuristic only. A local `sneakyThrow`/`throwUnchecked` helper using the `<E extends Throwable> void f(Throwable t) throws E` erasure idiom opens a review conversation, never a lint failure. | CONSIDER | — |

### KT-ERR — Kotlin failures and resources

Depth file: `rules/kotlin-quality/errors-and-resources.md` — **the 28th depth
file** (Verdict 12). Routing line: *"Catching, wrapping or swallowing a failure;
opening anything that must be closed; leaving the process."*

Every row names the JAVA-ERR rule it mirrors and states where Kotlin's gate
differs. None restates `M-U-04` (`SuspendFunSwallowedCancellation`, the
suspend-scoped half of cancellation swallowing), `M-V-04` (`@Throws`) or
`M-V-07` (`Result` as a public return type) — all three are cited only.

| ID | Rule | Rationale | Verification | Severity | Floor |
|---|---|---|---|---|---|
| **KT-ERR-01** | Never wrap code that must be allowed to propagate a JVM `Error` (`OutOfMemoryError`, `StackOverflowError`) or a test assertion (`AssertionError` from `assert`/`check`/any `assert*`) in `runCatching { }`. It catches `Throwable`, not `Exception`. | `runCatching`'s two overloads both catch `Throwable` ([kotlinlang](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/run-catching.html), since Kotlin 1.3) — this is `JAVA-ERR-02`'s forbidden pattern shipped as a stdlib function nobody has to type out. Because it is `inline`, its `try`/`catch` is spliced into the caller's bytecode and **never appears as a `KtCatchClause`**, so `SwallowedException`, `TooGenericExceptionCaught` and `EmptyCatchBlock` are all structurally unable to fire on it. `SuspendFunSwallowedCancellation` — the one rule that looks inside the lambda — only fires when a **suspend** call is inside it, so a non-suspend `runCatching` has zero detekt coverage under any configuration. | Reading heuristic; no automatable Kotlin gate exists at detekt `45672efb8b`. `grep -rn 'runCatching\s*{' --include=*.kt` in `src/test/**`/`src/androidTest/**` (a swallowed assertion is a false-green test) and in any bulk/recursive/allocation-heavy code path. Cite `M-U-04` for the suspend-scoped sibling; do not restate it. | **MUST** | Kotlin 1.3 (`runCatching`) |
| **KT-ERR-02** | A caught `InterruptedException` — directly, via `Exception`, or inside a `runCatching` block — must re-interrupt (`Thread.currentThread().interrupt()`) or rethrow. State in the shipped rule text that **no detekt rule ID exists for this**. | detekt's `SwallowedException` whitelists `InterruptedException` in its default `ignoredExceptionTypes` (`default-detekt-config.yml:224-231`) as a "part of Java" non-exceptional signal. That reasoning holds for `NumberFormatException`/`ParseException` and is wrong here: the `JAVA-ERR-01` hazard — broken cooperative cancellation for every caller up the stack — is a JVM fact, unchanged by source language. **Promoting or hardening the rule does not close this**: the exemption is in the rule's semantics, not its activation state, and there is no `InterruptedException`-specific rule anywhere in the `detekt-rules-*` tree. | Reading heuristic only. `grep -rnE 'catch\s*\(.*:\s*(InterruptedException\|Exception)\b' --include=*.kt` and check each body for `Thread.currentThread().interrupt()` or a rethrow; same check inside `runCatching` blocks that call anything blocking. | **MUST** | detekt (no rule at any version) |
| **KT-ERR-03** | Call `.use { }` on every `AutoCloseable`/`Closeable`. For a `Sequence` or `Flow` built over one, keep and close the underlying handle explicitly — neither type is `AutoCloseable`, so `.use` never reaches them. Wrap a **suspending** `close()` called from `finally`/`onCompletion { }` in `withContext(NonCancellable) { }`. | `JAVA-ERR-03`'s rationale one level worse: `fun readLines(p: Path): Sequence<String> = Files.lines(p).asSequence()` silently detaches the sequence from the stream's lifetime, and `Sequence` has no `use` extension for the caller to reach for even if they remember. `Flow` has the same gap plus a timing hazard Java's try-with-resources never has — after cancellation, a suspending cleanup call throws `CancellationException` immediately instead of running, which the coroutines team's own worked example fixes with `withContext(NonCancellable)`. A *synchronous* `close()` in `finally`/`use {}` needs no such wrapping. | Reading heuristic; no detekt rule for either shape. Grep functions returning `Sequence<`/`Flow<` whose body opens a `Stream`, `ResultSet`, `Channel` or file handle with no `.use`/explicit-close path in the same function; grep `suspend fun close(`/`suspend fun shutdown(` declarations and check every `finally`/`onCompletion` call site for a `withContext(NonCancellable)` wrapper. | **MUST** | `kotlin.use` (stdlib); `NonCancellable` (kotlinx.coroutines) |
| **KT-ERR-04** | Never write `SomeException(e.message)` where `SomeException(e)` is meant. Keep detekt's `SwallowedException` and `ThrowingNewInstanceOfSameException` active — `buildUponDefaultConfig: true` with no override to `active: false`. This row is "do not turn it off", not "turn it on". | `JAVA-ERR-04`'s exact mistake, and the one place Kotlin's default gate is **stronger** than Java's: detekt's `SwallowedException` names `throw MyException(e.message)` as its first noncompliant example and ships `active: true`, where Error Prone's `UnusedException` sits in `DISABLED_CHECKS` and `JAVA-ERR-04` must spend a MUST on the promotion. `ThrowingNewInstanceOfSameException` (also default-on) covers re-wrapping in the same type. | Confirm the project's `detekt.yml` does not set `exceptions > SwallowedException > active: false` or `ThrowingNewInstanceOfSameException > active: false`. Backstop grep where detekt is not wired to fail CI: `grep -rnE '\w+Exception\(\s*\w+\.message\s*\)' --include=*.kt`. | **MUST** | detekt (default config, `active: true`) |
| **KT-ERR-05** | Library code never calls `System.exit()`, `Runtime.exit()`, `Runtime.halt()` or `exitProcess()`. Promote detekt's `ExitOutsideMain` to `active: true`. | `JAVA-ERR-07`'s rationale, with a wider surface and one clean gate: a single detekt rule covers all four call shapes, including `Runtime.halt()`, which SpotBugs `DM_EXIT` does not name. It ships `active: false` (`default-detekt-config.yml:404-405`) — the same "correct rule, off by default" shape this family documents throughout. For a Gradle plugin written in Kotlin the consequence is `JAVA-ERR-07`'s: the daemon dies mid-build. | `ExitOutsideMain: active: true` in `detekt.yml`; `grep -rnE 'exitProcess\(\|System\.exit\(\|Runtime\.getRuntime\(\)\.(exit\|halt)\(' --include=*.kt` outside files containing `fun main(`. | **MUST** | detekt `ExitOutsideMain` (ships `active: false`) |

**Not KT-ERR rows — cite instead.** `@Throws` on a Kotlin function a Java caller
must catch → `M-V-04` (`kotlin-quality/java-interop.md`, `KT-INTEROP`).
`kotlin.Result<T>` as a public return type → `M-V-07` (`KT-API`); the
`-Xallow-result-return-type` restriction was lifted in **Kotlin 1.5** and the
flag later removed, so any guidance framing it as a live gate is historical-only
([Kotlin/KEEP#244](https://github.com/Kotlin/KEEP/pull/244)).
Coroutine-scoped `CancellationException` swallowing around a suspend call →
`M-U-04` / `SuspendFunSwallowedCancellation` (`KT-CORO`).

## Applied to the exemplars and the two future consumers

### Already satisfied

| Rule | Evidence |
|---|---|
| JAVA-ERR-03 | `gradle__gradle@ea17004a31:build-logic/documentation/src/main/groovy/gradlebuild/docs/FindBrokenExternalLinks.java:184` — `try (Stream<Path> stream = Files.walk(root.toPath()))`; same repo `…/GradleJavadocsPlugin.java:198` — `try (Stream<String> lines = Files.lines(file.toPath()))`. Both `Files.*` stream call sites in gradle/gradle's build-logic use the correct shape. |
| JAVA-ERR-04 | `gradle__gradle@ea17004a31:build-logic/documentation/src/main/groovy/gradlebuild/docs/dsl/docbook/JavadocConverter.java:52,70,86` — three broad catches, all three `throw new GradleException(msg, e)` with the cause chained. The broad catch is the shape `CatchingUnchecked` would question; the chaining is `UnusedException`-clean. |
| JAVA-SEC-06 | 5/5 measured `ProcessBuilder` call sites in the corpus use the array/varargs form, never a shell string: `apollographql__apollo-kotlin@c145295b72:scripts/bump-kotlin-nightlies.main.kts:79` and `scripts/run-firebase-benchmarks.main.kts:69`; `detekt__detekt@45672efb8b:scripts/compare_releases.main.kts:86,95`; `gradle__gradle@ea17004a31:build-logic/cleanup/src/main/java/gradlebuild/cleanup/services/KillLeakingJavaProcesses.java:262` (`new ProcessBuilder().command(args)`). The correct shape is the unanimous corpus norm. |
| JAVA-ERR-07 (honest discharge) | `apache__kafka@940c100fab:gradle/spotbugs-exclude.xml` — `<Bug pattern="DM_EXIT"/>` carrying the comment "Disable warnings about System.exit, until we decide to stop using it". An application tracking the violation as named debt rather than pretending it does not apply. |
| KT-ERR-03 (the contract done right) | `square__okhttp@dfcfab3824:okhttp/src/commonJvmAndroid/kotlin/okhttp3/ResponseBody.kt:16-50` — a `Closeable` over a socket/file handle whose KDoc enumerates every way a caller must close it (`.use`, explicit `.close()`, Java try-with-resources). The flagship case `KT-ERR-03` generalizes from. |

### Violated

| Rule | Evidence |
|---|---|
| **JAVA-ERR-01** | `gradle__gradle@ea17004a31:build-logic/cleanup/src/main/java/gradlebuild/cleanup/services/KillLeakingJavaProcesses.java:267-271` — `process.waitFor(1, MINUTES)` and `latch.await(1, MINUTES)` both throw `InterruptedException`; it is caught by `catch (Exception e)` at :270 and rethrown as `new RuntimeException(e)` with no `Thread.currentThread().interrupt()`. The interrupt bit is dropped. gradle/gradle **does** run Error Prone on its build-logic (`gradle/dependency-management/build.versions.toml:33-34` declares `error_prone_core` and `gradle-errorprone-plugin` 5.1.0), and this survives that gate because `InterruptedExceptionSwallowed` sits in `DISABLED_CHECKS`. The single sharpest argument for `JAVA-LINT-02`'s promotion list. |
| **JAVA-SEC-01** + **JAVA-ERR-03** | `gradle__gradle@ea17004a31:build-logic/documentation/src/main/groovy/gradlebuild/docs/model/SimpleClassMetaDataRepository.java:46-48` — `new ObjectInputStream(new BufferedInputStream(inputStream))` then `readObject()`, no `ObjectInputFilter` in the file (SEC-01). The same line also leaks: only the inner `FileInputStream` is closed in the `finally`; the `ObjectInputStream` wrapper is never closed and nothing is in try-with-resources (ERR-03). Risk is low — the file is a locally generated cache this module's own `store()` wrote — but the code shape is unguarded either way, and it is the corpus's only measured `ObjectInputStream`. |
| **JAVA-ERR-07** (and `JAVA-LINT-03`) | `…KillLeakingJavaProcesses.java:275` carries `@SuppressWarnings("CatchAndPrintStackTrace")` over a real `e.printStackTrace()` at :287, with **no reason on the annotation line or the line above** — the exact shape `JAVA-LINT-03` names as the finding. Kafka's `DM_EXIT` suppression (above) is the same move done correctly. |
| **JAVA-ERR-07, in published API documentation** | `apache__kafka@940c100fab:clients/src/main/java/org/apache/kafka/clients/producer/KafkaProducer.java:1074` — the Javadoc example for the async `send(record, Callback)` path teaches `e.printStackTrace()` inside `onCompletion`. Measured 2026-09-12: this is the **only** `printStackTrace` occurrence across kafka's 6,177 `.java` files, and it is in the one place every downstream copy-paste and every model's training corpus reads it. This is the provenance of agent failure mode 4 below, cited rather than asserted. |
| **JAVA-SEC-08** | `find-sec-bugs` is **0/32** ([gates](jvm-audit/exemplar-quality-gates.md) §1, re-measured in `JAVA-LINT-10`), and all three SpotBugs adopters — `apache__kafka`, `assertj__assertj`, `diffplug__spotless` — run it without the plugin. Every JAVA-SEC shape except `Random` misuse is invisible to every gate in the corpus. Re-confirmed by the wave-4 viability dive, which also finds **no exemplar** running Semgrep or a blocking Java-security SonarJava gate: the corpus has no security lint at all for this family. |
| **Gate honesty — the verification column of JAVA-SEC-08, JAVA-SEC-10 and JAVA-ERR-08** | `assertj__assertj@485502bad2:assertj-parent/pom.xml:196-203` declares SpotBugs at `<effort>Max</effort>` — **inside `<reporting>`**, which only `mvn site` invokes. Its `main.yml`, `release.yml`, `pitest-run.yml`, `pitest-comment-pr.yml` and `binary-compatibility.yml` run `verify`, `sonar:sonar`, `package`, `javadoc:javadoc`, `deploy` and the pitest goals — never `site`, never `spotbugs:check`. A gate that has never run — and the exact shape `JAVA-SEC-10`'s "the step must be a failing step" clause generalizes. |
| **KT-ERR-05** (tool default, not a repo) | `detekt__detekt@45672efb8b:detekt-core/src/main/resources/default-detekt-config.yml:404-405` — `ExitOutsideMain: active: false`, read from the shipped config rather than the docs site. Same file, lines 224-231: `SwallowedException`'s `ignoredExceptionTypes` whitelisting `InterruptedException` — the `KT-ERR-02` gap, measured. |
| **KT-ERR family, negative control** | `pinterest__ktlint@4c933394a3:ktlint-ruleset-standard/src/main/kotlin/io/github/ktlint/core/ruleset/standard/rules/` — full rule-class listing, zero classes referencing `Exception`, `Throwable`, `Closeable` or `Exit`. ktlint has no overlap with this family to reconcile. |

### New commitments for the OCX SDK and the OCX Gradle plugin

| Rule | OCX SDK (mirroring `ocx-sdk-python`) | OCX Gradle plugin (mirroring `rules_ocx` + `setup-ocx`) |
|---|---|---|
| JAVA-SEC-02 | **Conditional on an owner decision.** `ocx-sdk-python` commits to zero runtime dependencies (`README.md:39-40`, `dependencies = []`). A JVM SDK that keeps that commitment has no Jackson at all — a hand-rolled reader over `java.net.http` — and SEC-02 is structurally satisfied rather than enforced. A JVM SDK that takes Jackson inherits SEC-02 as a per-release resolved-version check. See Open questions. | Not binding today: the plugin parses `ocx --format json` output, and `AGENTS.md:58-62` already forbids reimplementing OCI logic — closed DTOs, no polymorphism. |
| JAVA-SEC-06 | **MUST, new.** The `_process.py` analogue (`src/ocx_sdk/_process.py:101-105,383-421`) becomes a `ProcessBuilder` behind an injectable factory seam; every argument is an array element. | **MUST, new.** `ExecOperations`/`ProcessBuilder` with an explicitly built environment — which `OCX_ENV_CLASSES` (`AGENTS.md:211-249`: 10 site / 4 translucent / 2 explicit-never-ambient / 5 pinned) already forces and the configuration cache independently requires. |
| JAVA-ERR-01 / KT-ERR-02 | **MUST, new, and the highest-risk row.** Every blocking call in the kill ladder (`_process.py:762-799`) — `waitFor`, `destroy`-then-wait, stream-pump joins — throws `InterruptedException`. gradle/gradle got this wrong at exactly this shape (above). If the SDK is Kotlin, the applicable row is `KT-ERR-02` and **there is no tool that catches it at all**. | **MUST, new.** A `ValueSource` or `BuildService` doing `ocx pull` runs on a Gradle worker thread; swallowing the interrupt breaks build cancellation. |
| JAVA-ERR-04 / KT-ERR-04 | **MUST, new.** The 16-member `ExitCode` → exception-hierarchy mapping (`_errors.py:28-46`) must chain: each typed exception carries the underlying `IOException`/`InterruptedException` as its cause, never a re-formatted message string. A Kotlin SDK gets this default-on from detekt (`KT-ERR-04`); a Java SDK must promote `UnusedException`. | **MUST, new.** `AGENTS.md:66-72` — every reachable sysexit maps to a failure *naming the fix*; the typed `GradleException` carries the cause so the daemon log shows both the fix and the origin. Sysexit 75 is retried before any exception is thrown. |
| JAVA-ERR-07 / KT-ERR-05 | **MUST, new.** The SDK translates the child's exit code into an exception; it never calls `System.exit()` itself and never `printStackTrace()`s. This *is* the discharge of "exit code IS the error category, never parsed from stderr text". | **MUST, new, and sharper.** `System.exit()` from plugin code terminates the Gradle daemon mid-build. A Kotlin plugin must promote `ExitOutsideMain` to `active: true` — it ships off. |
| JAVA-ERR-03 / KT-ERR-03 | **MUST, new.** Process streams, the JSON reader, and any downloaded-file handle all go in try-with-resources; the `ObjectInputStream`-wrapper leak above is the shape to avoid. A Kotlin SDK that hands back a `Sequence<String>` over process stdout has the `KT-ERR-03` bug by construction. | **MUST, new.** Same, for every `ValueSource` process read. |
| KT-ERR-01 | **CONSIDER → MUST if Kotlin.** An SDK that wraps its process ladder in `runCatching` swallows `OutOfMemoryError` on a large `inspect --closure` payload, and swallows every test assertion in its own suite. No lint sees it. | Same, for a Kotlin plugin. |
| JAVA-SEC-05 | Not binding today (no archive extraction in the described boundary). | **CONSIDER, conditional.** `@ocx_tool` fetches a sha256-pinned binary (`AGENTS.md:13-18`); if provisioning ever unpacks an archive, SEC-05 binds that loop. |
| JAVA-SEC-08 / JAVA-SEC-10 | CONSIDER — no XXE, archive or JNDI surface today; `JAVA-LINT-01`'s Error Prone + NullAway wiring (already **MUST** for both consumers) covers SEC-01 and SEC-04. `JAVA-SEC-10` is N/A while find-sec-bugs is not wired. | Same. |

## AI-agent failure modes

Ranked by how often it bites, merged across all four dives.

1. **`catch (Exception e) { log.error("failed", e); }` and move on.** Compiles, looks responsible, and is silent under every default configuration measured. *Check:* `JAVA-LINT-02`'s nine-name grep — confirm `CatchingUnchecked` and `UnusedException` appear under `error(...)` / `-Xep:`.
2. **`new ServiceException("read failed: " + e.getMessage())`.** Reads as if the failure survived. *Check:* `grep -rnE 'new \w*Exception\([^,)]*\.getMessage\(\)\)'` — and the ported Kotlin regex `\w+Exception\(\s*\w+\.message\s*\)`.
3. **`Files.lines(p).map(…).collect(…)` as a one-liner.** Trained on tutorial snippets whose process exits immediately after. *Check:* `StreamResourceLeak` is already on by default — the only failure mode is disabling it.
4. **`e.printStackTrace()` in an error callback.** Not invented by the model: `KafkaProducer.java:1074`'s own published Javadoc teaches it. *Check:* `CatchAndPrintStackTrace` (default-on), or `grep -rn '\.printStackTrace()'`.
5. **`catch (InterruptedException e) { /* ignore */ }`, or logging it like anything else.** An agent asked to "add error handling around this blocking call" treats it as just another checked exception. *Check:* promote `InterruptedExceptionSwallowed`; nothing else catches it by default except SonarJava `S2142`. In Kotlin, nothing catches it **at any configuration** (`KT-ERR-02`).
6. **"A `PolymorphicTypeValidator` is configured, so this is fixed."** A model that knows Jackson's 2020 hardening and has a cutoff before mid-2026 will approve the code and stop. *Check:* never accept the configuration as the finding — resolve the version against 2.18.8 / 2.21.4 / 3.1.4, mechanically, every time, regardless of what the reviewing model remembers.
7. **`mapper.enableDefaultTyping()` to make a heterogeneous collection round-trip.** *Check:* grep `enableDefaultTyping|activateDefaultTyping` — any argument that is not a `BasicPolymorphicTypeValidator.builder()…build()` is the hole, and `LaissezFaireSubTypeValidator.instance` is the same hole with a nicer name.
8. **XXE hardening applied to one factory, assumed to transfer** — or moved into a shared `newSafeFactory()` helper and assumed verified. *Check:* count `*Factory.newInstance()` occurrences per factory type against hardening blocks naming that type **in the same method**; no tool sees across the method boundary.
9. **`Runtime.getRuntime().exec("cmd " + arg)`.** Effectively obsolete since Java 5's `ProcessBuilder`, and still the first idiom from pre-2015 tutorial content. *Check:* any single-`String` `exec(` argument built by concatenation is the finding — the fix is the array overload, not better escaping.
10. **`SecurityManager` / `doPrivileged` / `.policy` proposed for a JDK-24+ target.** Not legacy — non-functional. *Check:* grep those four tokens and reject on sight.
11. **`new Random()` for "a random id".** The model conflates *unique* with *unpredictable*. *Check:* ask which property is required before accepting either; `SecureRandom`/`UUID.randomUUID()` if unpredictable.
12. **`try (var pool = Executors.newFixedThreadPool(n))` assumed strictly better.** An agent that knows `ExecutorService` became `AutoCloseable` in JDK 19 does not know `close()` has no timeout. *Check:* reading heuristic; nothing mechanical exists.
13. **"SpotBugs is declared in the POM" read as "SpotBugs runs in CI."** assertj's actual state. *Check:* confirm the plugin is under `<build><plugins>` with a bound execution, or that a CI job invokes `mvn site` / `spotbugs:check` — and that `ignoreFailures`/`failOnError` is not swallowing the result.
14. **Citing deprecated `S1148`, or citing `S4507` without knowing it is a Security Hotspot.** *Check:* do not route this through Sonar at all — use `CatchAndPrintStackTrace` or a grep.
15. **Emitting a stale `findsecbugs-plugin` coordinate (`1.8.0`-era) from training data**, or pinning `com.github.spotbugs` to the 6.4.1/6.4.2 window, which hard-crashes find-sec-bugs 1.14.0 with `NoSuchMethodError`. The break is from September 2025 and postdates most pretraining cutoffs, so the model cannot know. *Check:* `JAVA-SEC-10`'s two greps against the compatibility table.
16. **Reading "find-sec-bugs is 0/32" as "find-sec-bugs is abandoned"** and skipping it where MUST-tier XXE/command-injection coverage is genuinely needed. *Check:* before calling a tool dead, require a fetched release date plus commit/issue recency — the correct reading here is *unmeasured, not unmaintained*.
17. **`runCatching { }` used as "the Kotlin try/catch"**, including in test code and around allocation-heavy work. A model trained on tutorials that only ever show it swallowing a `NumberFormatException` has no signal that it also eats `AssertionError` and `OutOfMemoryError`, and no lint will tell it. *Check:* `grep -rn 'runCatching' src/test/` — any hit is a possible false-green test.
18. **`fun lines(p: Path) = Files.lines(p).asSequence()`** — a model that knows `use {}` closes Java `Stream`s writes this without realizing the returned `Sequence` carries no closing contract at all. *Check:* grep signatures returning `Sequence<`/`Flow<` whose body opens a handle.
19. **`finally { resource.close() }` copied from Java muscle memory into a `suspend fun` where `close()` is itself suspending** — the pattern silently never runs under cancellation. *Check:* grep `suspend fun close(` declarations, then every `finally`/`onCompletion` call site for `withContext(NonCancellable)`.
20. **Assuming detekt's defaults mirror Error Prone's (mostly off, promote explicitly).** The opposite holds for this family: `SwallowedException`, `TooGenericExceptionCaught` and `InstanceOfCheckForException` ship on; `SuspendFunSwallowedCancellation` and `ExitOutsideMain` ship off. A model asked to "harden the detekt config" that promotes only the coroutine rules has it exactly backwards. *Check:* diff `detekt.yml` against those five names.
21. **Over-applying `@Throws` to every Kotlin function** from Java checked-exception habit. Harmless but a tell that the model does not know why the annotation exists. *Check:* `M-V-04`'s scoping — it is needed only when a Java *caller* must catch.

## Open questions

**Owner decisions**

1. **Does the OCX SDK for the JVM keep `ocx-sdk-python`'s zero-runtime-dependency
   commitment?** This is a one-way door for JAVA-SEC-02's rule text: zero-dep
   means no Jackson, no polymorphic deserialization surface, and SEC-02 becomes
   "structurally satisfied" instead of a per-release version gate. It also decides
   whether the SDK hand-rolls a JSON reader over `java.net.http`.
2. **Java or Kotlin for the SDK?** No longer a coverage question — `KT-ERR`
   exists and `kotlin-quality/errors-and-resources.md` ships (Verdict 12) — but
   still a *which-gate* question, and the two languages are not equivalent here.
   A Java SDK gets `InterruptedExceptionSwallowed` and `UnusedException` as
   promotable compiler errors; a Kotlin SDK gets chaining for free (`KT-ERR-04`)
   and gets **nothing at all** for the interrupt hazard (`KT-ERR-02`) or for
   `runCatching`-swallowed `Error`s (`KT-ERR-01`). Given the SDK's process-kill
   ladder, that asymmetry is load-bearing.
3. **Does `JAVA-LINT-07`'s enumerated `-Xlint` key list gain `removal`?**
   JAVA-ERR-06's verification depends on it and the landed list omits it.

**Subareas deserving another round**

1. **SonarJava's exact rule keys for this family.** The viability dive verified
   `S2755` (XXE) as a live Community-tier rule and explicitly did **not** verify
   SonarJava's equivalents for command injection, path traversal or predictable
   random — yet `JAVA-SEC-07` names `S2245` and `JAVA-ERR-02`/`JAVA-ERR-03` name
   `S1181`/`S2095` on the strength of the catalogue alone. *Question: for each of
   `S2245`, `S2076`, the path-traversal key, `S1181`, `S2095` and `S2142` —
   fetched from `rules.sonarsource.com` or the `sonar-java` rule metadata, not
   from search — is the rule (a) Community-tier or commercial-only, (b) an Issue
   or a Security Hotspot (the `S4507` trap), and (c) what does it actually match?
   Small, mechanical, and it decides whether five verification columns are honest.*
2. **The trust boundary for a subprocess with no live upstream.** Verdict 3
   resolves the boundary for an `ocx` CLI that is a thin client over a live
   service. The dive's own decision (c) says to re-derive rather than copy it for
   a sandboxed, offline, fixed-schema binary. *Question: does the OCX Gradle
   plugin's `ocx --format json inspect --closure` read — which may run entirely
   against a local `OCX_HOME` cache — sit on the same side of the line as the
   SDK's?*

**Dated re-checks, not research rounds.** Two items carry a clock rather than a
question and belong in the shipped rule's "re-verify by" note, not in another
wave: whether `find-sec-bugs 1.15.0` ships before SpotBugs removes the restored
`IO.close(InputStream)` around **October 2026** (`JAVA-SEC-10` breaks again if
not), and whether `jackson-databind`'s three floors move (`JAVA-SEC-02` is a
per-release check by construction).

## Conflicts resolved

1. **`errors-resources-and-lifecycle` §13 versus the landed `JAVA-LINT-10`, on
   whether bare SpotBugs earns a slot.** `JAVA-LINT-10` says SpotBugs earns a
   place "only when `find-sec-bugs` is wired alongside it". The errors dive
   measured the opposite for a different reason: SpotBugs' `CORRECTNESS` +
   `MT_CORRECTNESS` (129 + 46 = 175 patterns) has roughly a dozen genuine
   name-level overlaps with Error Prone's 187 `ENABLED_ERRORS`, leaving a large
   residual with no Error Prone analog at any promotion level —
   `UL_UNRELEASED_LOCK` (Error Prone's `LockNotBeforeTry` checks a *different*
   moment), the interprocedural `NP_*` family (~15 patterns, works on bytecode
   with no `@Nullable` annotations, unlike NullAway), the `SE_*` serialization
   internals, `SQL_BAD_*`, and the `RANGE_*` numeric dataflow.
   **Resolved: both are right about different families, and `JAVA-LINT-10` is
   amended.** `find-sec-bugs` is required for JAVA-SEC's shapes — core SpotBugs
   has no XXE, command-injection, path-traversal or JNDI detector at all. Core
   SpotBugs independently earns a slot for JAVA-ERR's lock and null-dataflow
   families. `JAVA-LINT-10` should read "*only when `find-sec-bugs` is wired
   alongside it, **or** the module needs the lock/wait/notify and
   annotation-free null-dataflow families*". Evidence that the two are not
   redundant even co-located: `diffplug__spotless@dc2a4cb9a3:gradle/error-prone.gradle:3-23`
   runs Error Prone with `disableAllWarnings = true` and five checks re-enabled,
   while `lib/build.gradle:136-139` runs SpotBugs at `Confidence.LOW` — SpotBugs
   is that build's heavy pass, not a second opinion.
2. **`errors-resources-and-lifecycle` §13 versus
   [gates](jvm-audit/exemplar-quality-gates.md)'s headline counts.** The audit
   reports Error Prone 13/32 and SpotBugs-as-a-gate 3/32. The dive read the build
   files and found both overcounted: `apache__kafka`'s single `errorprone` hit
   (`build.gradle:2522`) and `apache__maven`'s two (`pom.xml:370,550`) are all
   *exclusions* of the transitive `error_prone_annotations` artifact, with no
   `net.ltgt.errorprone` plugin applied anywhere; and `assertj__assertj`'s
   SpotBugs block is `<reporting>`-only with no CI job invoking it.
   **Resolved in the dive's favour — read-the-file beats grep-the-repo.**
   Corrected: Error Prone **11/32**, SpotBugs as a real gate **2/32** (kafka,
   spotless) plus one performative declaration. Every downstream claim of the
   form "N/32 adopters already do this" inherits the correction.
3. **`untrusted-input-and-deserialization` §10 versus
   `errors-resources-and-lifecycle` §13 on `find-sec-bugs`.** The SEC dive says
   bare SpotBugs "contributes nothing" to this family; the ERR dive says "skip
   `find-sec-bugs`, SpotBugs earns its slot on `CORRECTNESS` alone". **Apparent
   conflict only, and it dissolves once split by family** — see 1. Stated here
   because the two sentences read as contradictory when quoted out of their
   family scope, and the later author will quote them.
4. **`errors-resources-and-lifecycle` decision (a) — five JAVA-ERR rows in the
   always-loaded index — versus the index budget.** The catalog's observed index
   size is 114-229 lines ([cfg](jvm-audit/config-inventory.md) Axis 1.1) and
   `rules/java-quality.md` carries nine families. Five lines from JAVA-ERR plus
   one from JAVA-SEC is ~6 lines for two of nine families.
   **Resolved: three from JAVA-ERR, one from JAVA-SEC.** Index rows are
   JAVA-ERR-01 (re-interrupt), JAVA-ERR-03 (try-with-resources) and JAVA-ERR-04
   (chain the cause) — the three that are true in *every* edit touching a catch
   block or a resource — plus JAVA-SEC-01's one line, which
   [map](jvm-topic-map.md) "Conflicts resolved" #2 already reserved as one of the
   ~6 MUST rows duplicated bounded into `kotlin-quality`'s index. JAVA-ERR-02
   (catch `Throwable`) and JAVA-ERR-05 (`ExecutorService`) drop to the depth file:
   both are reviewer-facing rather than every-edit.
5. **`JAVA-ERR-06`'s verification versus the landed `JAVA-LINT-07`.**
   JAVA-LINT-07 mandates `-Werror` paired with an **enumerated** `-Xlint` key list
   and names seven keys — `this-escape`, `identity`, `restricted`,
   `missing-explicit-ctor`, `dangling-doc-comments`, `output-file-clash`,
   `lossy-conversions` — none of which is `removal`. JAVA-ERR-06's only free
   mechanical check is `-Xlint:removal`. **Resolved: `removal` is added to
   JAVA-LINT-07's enumerated list**, with `deprecation` left out deliberately
   (it fires on every use of a deprecated-but-not-removed API and would make the
   list noisy). Raised as owner decision 3 because it edits a landed rule.
6. **Map row M-N-06 assigns `ExecutorService` shutdown to `JAVA-CONC`, but the
   errors dive covered it under `JAVA-ERR`.** **Resolved by splitting the row at
   the `AutoCloseable` seam**: the JDK-19 `close()`-has-no-timeout trap is a
   resource-lifecycle fact and stays here as JAVA-ERR-05; pool sizing, the
   virtual-thread-per-task regime and `ForkJoinPool`/parallel-stream conflation
   stay with `JAVA-CONC` (M-N-05/06). Each rule's verification column names the
   other so neither file restates the other's half.
7. **`errors-resources-and-lifecycle` §5 versus map row M-O-04's three-tool
   framing.** M-O-04 names SonarJava `S2095`, PMD `CloseResource` and Error
   Prone's pair as three peers "and the rule must name which one is the build's
   gate". SonarSource's own rule page records that `S2095` **deprecated**
   `pmd:CloseResource` in Sonar 5.3, and PMD is enforced 0/32. **Resolved: two
   peers, not three.** JAVA-ERR-03 names Error Prone's pair and `S2095`; naming
   PMD as an option would send an agent to a tool nobody in the corpus runs and
   that SonarSource itself superseded.
8. **`untrusted-input-and-deserialization` §10's "`find-sec-bugs` is the
   automated check" versus the wave-4 viability dive's finding that the released
   artifact crashes under two SpotBugs versions and has no published FP rate.**
   The wave-3 text made `find-sec-bugs` load-bearing for six MUSTs in a way the
   tool cannot support: a 15-month-stale release, a `provided`-scope dependency
   that lets the consumer's SpotBugs version decide whether it runs at all, a
   confirmed `NoSuchMethodError` under 4.9.5/4.9.6, a maintainer-acknowledged
   interprocedural blind spot, and no measured false-positive rate.
   **Resolved: the tool is demoted from "the check" to "the automated check
   where wired", and every Group 2 rule now carries its grep as the floor.**
   `JAVA-SEC-08` stays SHOULD (it was never MUST, and the dive confirms that was
   right); the six dependent rules keep MUST on the grep alone; `JAVA-SEC-10` is
   added for the version pin and the `ignoreFailures` swallow. Nothing is
   demoted in severity — the *verification* column changed, not the standard.
9. **`JAVA-SEC-08`'s floor said `com.github.spotbugs` 6.4.8+; the measured
   compatibility table says 6.4.3+.** The wave-3 floor was plausible and
   unsourced; `spotbugs-gradle-plugin`'s own README maps 6.4.3 → SpotBugs 4.9.7
   (the first safe release) and 6.4.4 → 4.9.8, with no 6.4.8 in the table.
   **Resolved on the primary source: the floor is 6.4.3+, with 6.4.1 and 6.4.2
   named as the forbidden window and 6.5.6 (→ 4.10.2) as current.**
10. **`JAVA-SEC-03`'s verification said "an *adjacent* `setFeature`… block"; the
    viability dive establishes that adjacency is not the criterion — same-method
    is.** A factory hardened inside a shared helper passes an "adjacent block"
    reading and fails every tool, because neither find-sec-bugs nor SonarJava
    does interprocedural dataflow, and h3xstream argues a public helper is not
    genuinely safe even if they did. **Resolved: the rule text now requires
    hardening in the same method body as the construction, and the verification
    states that absence of a tool finding is not evidence of safety.** This is
    the overclaim correction the revision brief calls the most dangerous kind —
    the old text implied the eight `XXE_*` detectors covered the family.
11. **`kotlin-errors-resources-and-throws` proposes five KT-ERR rows and a 28th
    depth file, against the map's "Twenty-seven depth files" and its
    `kotlin-quality/` table of six.** The map itself scoped this: its wave-4
    question 2 says the KT-ERR dive "decides whether the artifact set has 27
    depth files or 28". **Resolved: 28.** `kotlin-quality/errors-and-resources.md`
    joins the six, family `KT-ERR`, rows 01-05, routing line *"Catching, wrapping
    or swallowing a failure; opening anything that must be closed; leaving the
    process."* The map's depth-file table and its "twenty-seven families" count
    are amended by this file. Index budget: `rules/kotlin-quality.md` takes
    **two** KT-ERR rows — `KT-ERR-01` (`runCatching` catches `Throwable` and no
    lint can see it) and `KT-ERR-03` (`.use` does not reach `Sequence`/`Flow`) —
    the two that are true on every edit and have no gate anywhere. `KT-ERR-02`
    is reviewer-facing, and `KT-ERR-04`/`KT-ERR-05` are detekt-config facts that
    the `KT-LINT` wiring row already carries; all three live in the depth file.
    The map's reserved `JAVA-SEC-01` line stays.
12. **`kotlin-errors-resources-and-throws` cross-references JAVA-ERR by the
    *sub-artifact's* numbering, not this consolidation's.** The dive cites
    "JAVA-ERR-05" for exception chaining, "JAVA-ERR-08" for `System.exit`,
    "JAVA-ERR-03" for the `UnusedException` promotion, "JAVA-ERR-04" for the
    `Stream`-signature rationale and "JAVA-ERR-11" for sneaky-throw — none of
    which match the IDs that shipped here. **Resolved: this consolidation's IDs
    are authoritative and the mapping is recorded once so the later author does
    not propagate the dive's numbers.** chaining → **JAVA-ERR-04**;
    `System.exit` → **JAVA-ERR-07**; `UnusedException` promotion →
    **JAVA-ERR-04**; try-with-resources / `Stream` signature → **JAVA-ERR-03**;
    `catch (Throwable)` → **JAVA-ERR-02**; sneaky-throw → **JAVA-ERR-09**. Every
    KT-ERR row above already uses the corrected numbers.
13. **`kotlin-errors-resources-and-throws` §8 versus any live reading of
    `-Xallow-result-return-type`.** The flag that once forbade `kotlin.Result`
    as a public return type outside the stdlib was lifted in **Kotlin 1.5** and
    later removed entirely ([KEEP#244](https://github.com/Kotlin/KEEP/pull/244)).
    **Resolved: it is historical-only.** Any rule text presenting it as a live
    gate is wrong; the live question is the API-design one `M-V-07` owns, and
    `KT-ERR` gets no row for it.

## Revision log

**2026-09-12 — wave 4** (folds in `find-sec-bugs-viability.md` and
`kotlin-errors-resources-and-throws.md`; all wave-3 IDs keep their numbers and
meanings).

- **Added `JAVA-SEC-10`** — pin the SpotBugs core find-sec-bugs runs against
  (never plugin 6.4.1/6.4.2), and never let `ignoreFailures`/`failOnError`
  swallow the gate. New ID; the 4.9.5/4.9.6 `NoSuchMethodError` is a build break
  no wave-3 rule covered.
- **Added family `KT-ERR`, rows `KT-ERR-01`…`KT-ERR-05`** — Kotlin's half of
  this family, previously declared uncovered. New family, new IDs; the 28th
  depth file (Conflict 11, Verdict 12).
- **Changed `JAVA-SEC-03` in place** — verification now requires hardening in the
  **same method** as the factory construction, and states that a clean tool run
  is not evidence of safety. The wave-3 text implied the eight `XXE_*` detectors
  covered the family; find-sec-bugs#738 and SonarJava's matching blind spot show
  they do not (Conflict 10). Overclaim correction.
- **Changed `JAVA-SEC-05` in place** — carries find-sec-bugs' own "potential"
  caveat: a hit needs the attacker-control question answered, and an absence is
  not a clearance.
- **Changed `JAVA-SEC-07` in place** — grep promoted from fallback to primary
  check; Semgrep confirmed to have no equivalent rule; `SonarJava S2245` marked
  unverified as of 2026-09-12 rather than cited as a gate.
- **Changed `JAVA-SEC-08` in place** — floor corrected from an unsourced
  `com.github.spotbugs` 6.4.8+ to the measured **6.4.3+** with 6.4.1/6.4.2 named
  as forbidden (Conflict 9); "maintained but fragile" framing and the
  `1.14.0`-or-newer coordinate check added. Severity unchanged (SHOULD).
- **Changed `JAVA-SEC-06`, and the Group 2 header, in place** — the grep is now
  stated as the severity floor for the whole group, so no rule's MUST depends on
  a tool being wired (Conflict 8).
- **Changed `JAVA-ERR-01/02/03/04/07/09` in place** — each verification column
  now names its KT-ERR counterpart (or, for `JAVA-ERR-09`, records that Kotlin
  has none). No Java-side standard changed.
- **Changed the header note in place** — the sentence declaring Kotlin's
  exception model "uncovered" is false as of this revision and is replaced by the
  KT-ERR scope statement plus the cite-don't-restate list.
- **Verdict 6 extended** (Kotlin's four exit shapes, one rule, shipped off);
  **Verdict 7 extended** (two KT-ERR index rows); **Verdict 9 extended**
  (0/32 means unmeasured, not unmaintained); **Verdicts 10-13 added**
  (find-sec-bugs viability; the FP-rate and interprocedural gaps as documented
  gaps; the 28th depth file; the detekt-versus-Error-Prone default asymmetry).
- **Conflicts 8-13 added.** Conflict 12 is an ID-mapping correction: the Kotlin
  dive cites JAVA-ERR by the sub-artifact's numbering, which does not match the
  shipped IDs.
- **Open questions:** removed subarea 1 (find-sec-bugs viability — answered,
  with its unanswerable residue moved to Verdict 11) and subarea 2 (KT-ERR —
  answered, Verdict 12). Former subarea 3 (subprocess trust boundary) renumbered
  to 2 and otherwise unchanged. Added subarea 1 (verify SonarJava's actual rule
  keys), which the viability dive raised and explicitly did not settle. Owner
  decision 2 reframed: Kotlin now has rules, so the question is which gate, not
  whether coverage exists. Added a "dated re-checks" note for the ~Oct-2026
  SpotBugs deprecation expiry and Jackson's floors.
- **Failure modes 15-21 added** (stale/broken find-sec-bugs pins; misreading
  0/32 as abandonment; `runCatching` as the Kotlin try/catch; `Sequence` detached
  from its `Stream`; suspending `close()` in `finally`; detekt defaults assumed
  to mirror Error Prone; over-applied `@Throws`). Modes 2, 5, 8 and 13 extended
  rather than duplicated.
- **MUST count: 15 → 21** (`JAVA-SEC-10` + five `KT-ERR` rows). No rule was
  demoted; `JAVA-SEC-08` remains the family's only SHOULD alongside
  `JAVA-ERR-08`, and `JAVA-ERR-09` remains the only CONSIDER.

## Sub-artifacts

- [untrusted-input-and-deserialization.md](jvm-java-runtime-safety/untrusted-input-and-deserialization.md)
  — the nine JAVA-SEC shapes, the 2026 Jackson PTV bypass pair, the per-factory
  XXE table, and the core-SpotBugs-versus-`find-sec-bugs` coverage matrix.
- [errors-resources-and-lifecycle.md](jvm-java-runtime-safety/errors-resources-and-lifecycle.md)
  — which Error Prone checks actually fire by default (read from
  `BuiltInCheckerSuppliers.java`, not the docs site), the three
  `InterruptedException` checks, the SpotBugs-versus-Error-Prone residual set,
  and the corpus gate-count corrections.
- [find-sec-bugs-viability.md](jvm-java-runtime-safety/find-sec-bugs-viability.md)
  — the release cadence and `provided`-scope mechanics, the SpotBugs
  4.9.5/4.9.6 `NoSuchMethodError` window with the plugin-version compatibility
  table, the interprocedural blind spot shared with SonarJava, and what Semgrep's
  `p/java` does and does not cover.
- [kotlin-errors-resources-and-throws.md](jvm-java-runtime-safety/kotlin-errors-resources-and-throws.md)
  — the five KT-ERR rows with their detekt activation states read from the
  shipped `default-detekt-config.yml`, why `runCatching` is invisible to every
  catch-clause rule, and the `@Throws`/`Result` routing decisions.

## Key sources

| URL | Why |
|---|---|
| [GHSA-j3rv-43j4-c7qm](https://github.com/advisories/GHSA-j3rv-43j4-c7qm) | CVE-2026-54512/54513, the two distinct PTV bypasses and the three fixed versions JAVA-SEC-02 rests on (2026-06-04) |
| [Jackson Polymorphic Deserialization CVE Criteria](https://github.com/FasterXML/jackson/wiki/Jackson-Polymorphic-Deserialization-CVE-Criteria) | Jackson's own policy: why 2.10 moved to allow-list PTVs and why the project stopped accepting default-typing CVEs after 2021-12-31 |
| [OWASP XML External Entity Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/XML_External_Entity_Prevention_Cheat_Sheet.html) | The exact hardening call per Java XML API — the eight-row table behind JAVA-SEC-03 |
| [OWASP Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html) | The canonical `ObjectInputStream` danger-API list and the look-ahead/`resolveClass` pattern |
| [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html) | The `SecureRandom` versus `Random`/`Math.random`/`ThreadLocalRandom`/`SplittableRandom` "must not", stated for all four |
| [Oracle Secure Coding Guidelines for Java SE](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | `SERIAL-6`, `INJECT-4`, `INJECT-5` — and the twenty section-9 guidelines now carrying Oracle's own "permanently disabled since Java 24" note |
| [JEP 486 — Permanently Disable the Security Manager](https://openjdk.org/jeps/486) | Normative basis for JAVA-SEC-09: `UnsupportedOperationException`, startup abort, JDK 24 |
| [SEI CERT Oracle Coding Standard for Java](https://cmu-sei.github.io/secure-coding-standards/sei-cert-oracle-coding-standard-for-java/) | `SER12-J`, `FIO16-J`, `IDS54-J`, `ERR00-J`, `ERR08-J` rule text (the Confluence wiki permanently redirects here) |
| [snyk/zip-slip-vulnerability](https://github.com/snyk/zip-slip-vulnerability) | The canonical vulnerable extraction idiom and the archive-format breadth behind JAVA-SEC-05 |
| [CERT VU#930724](https://www.kb.cert.org/vuls/id/930724) | The `Reference`-object remote-class-loading mechanism behind JAVA-SEC-04, independent of Log4j |
| [find-sec-bugs bug list](https://find-sec-bugs.github.io/bugs.htm) | The exact rule IDs (`XXE_*`, `COMMAND_INJECTION`, `PATH_TRAVERSAL_IN/OUT`, `PREDICTABLE_RANDOM`), the coverage gap versus core SpotBugs, and the tool's own "potential" caveat on path-traversal findings |
| [find-sec-bugs#766](https://github.com/find-sec-bugs/find-sec-bugs/issues/766) | The confirmed `NoSuchMethodError` under SpotBugs 4.9.5/4.9.6 and the maintainer's "will be removed after 1 year" clock — JAVA-SEC-10's whole basis |
| [spotbugs#3756](https://github.com/spotbugs/spotbugs/pull/3756) | SpotBugs restoring-and-deprecating `IO.close(InputStream)` because find-sec-bugs depends on it; the fix came from SpotBugs, not the plugin |
| [spotbugs-gradle-plugin README](https://raw.githubusercontent.com/spotbugs/spotbugs-gradle-plugin/master/README.md) | The official plugin-version → SpotBugs-core-version table behind JAVA-SEC-08's corrected 6.4.3+ floor and JAVA-SEC-10's forbidden window |
| [find-sec-bugs#738](https://github.com/find-sec-bugs/find-sec-bugs/issues/738) | Maintainer-acknowledged: no interprocedural dataflow, so hardening in a helper method is invisible — JAVA-SEC-03's same-method clause |
| [Semgrep registry API — `rulesets/java`](https://semgrep.dev/api/registry/rulesets/java) | The 60-rule `p/java` set: 24 rules cite find-sec-bugs as their source, 4 of 8 XXE factories covered, no predictable-random rule at all |
| [Error Prone `BuiltInCheckerSuppliers.java`](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | The authoritative `ENABLED_ERRORS` (724-917) / `ENABLED_WARNINGS` (918-1236) / `DISABLED_CHECKS` (1237-1392) split — the docs site's severity field does not tell you what runs |
| [Error Prone bug-pattern sources](https://github.com/google/error-prone/tree/gh-pages/bugpattern) | `BanSerializableRead`, `BanJNDI`, `InterruptedInCatchBlock`, `InterruptedExceptionSwallowed`, `TryFailThrowable`, `CatchingUnchecked`, `UnusedException`, `StreamResourceLeak`, `MustBeClosedChecker`, `CatchAndPrintStackTrace` |
| [JEP 421 — Deprecate Finalization for Removal](https://openjdk.org/jeps/421) | JAVA-ERR-06's normative basis and the `Cleaner`/try-with-resources replacements |
| [ExecutorService javadoc (JDK 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html) | The unambiguous wording of `close()`'s indefinite block — JAVA-ERR-05's whole point |
| [SonarSource community: S1148 finds issues, S4507 does not](https://community.sonarsource.com/t/deprecated-s1148-finds-issues-but-suggested-replacement-s4507-does-not/57331) | Confirms the Security-Hotspot visibility gap behind JAVA-ERR-07's "do not rely on S4507" |
| [kotlinlang: `runCatching`](https://kotlinlang.org/api/core/kotlin-stdlib/kotlin/run-catching.html) | Both overloads catch `Throwable`, not `Exception` — KT-ERR-01's normative basis |
| [detekt@45672efb8b `default-detekt-config.yml`](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-core/src/main/resources/default-detekt-config.yml) | Ground truth for every KT-ERR activation claim: `SwallowedException` on with `InterruptedException` whitelisted (224-231), `ExitOutsideMain` off (404-405) |
| [detekt@45672efb8b `SwallowedException.kt`](https://github.com/detekt/detekt/blob/45672efb8bb780bbfefdfa57e623003334f951ca/detekt-rules-exceptions/src/main/kotlin/dev/detekt/rules/exceptions/SwallowedException.kt) | `KtCatchClause`-only scope (why no lint sees `runCatching`) and the `e.message` vs `e` noncompliant/compliant pair behind KT-ERR-04 |
| [kotlinx.coroutines@f63a04bacb8b `coroutines-cancellation.md`](https://github.com/Kotlin/kotlinx.coroutines/blob/f63a04bacb8beeafcc9d49199b1e4bb08931b7eb/docs/topics/coroutines-cancellation.md) | The coroutines team's own worked example: a suspending cleanup call after cancellation needs `withContext(NonCancellable)` — KT-ERR-03's second half |
| [kotlinlang: java-to-kotlin-interop](https://kotlinlang.org/docs/java-to-kotlin-interop.html) | `@Throws` rationale and the Java-caller example — why it is `M-V-04`'s row and not a KT-ERR row |
| [Kotlin/KEEP#244](https://github.com/Kotlin/KEEP/pull/244) | Dates the removal of the `Result`-as-return-type restriction to Kotlin 1.5 — the historical boundary behind Conflict 13 |
