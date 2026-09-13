---
title: "Failures that vanish, resources that do not close: Java error handling and resource lifecycle"
topic: jvm-java-runtime-safety
agent: errors-resources-and-lifecycle
model: sonnet
date_researched: 2026-09-12
sources_count: 19
scope: >
  Java-only (not Kotlin): swallowed/miscaught exceptions, exception chaining and
  checked-vs-unchecked selection, resource lifecycle (try-with-resources,
  Files.walk/list/lines, ExecutorService shutdown, finalize/Cleaner),
  System.exit/printStackTrace in library code, serialVersionUID, and which
  static-analysis checks (Error Prone, SpotBugs, SonarJava) actually run by
  default versus need explicit promotion. Out of scope: virtual-thread-specific
  executor shutdown and CompletableFuture exception swallowing (JAVA-CONC,
  M-N-06/M-N-07), untrusted-input deserialization (JAVA-SEC), and Kotlin's
  exception model (KT-*).
---

## Table of contents

1. [Summary](#summary)
2. [Findings](#findings)
   1. [Error Prone's real enabled/disabled split for the six named checks](#1-error-prones-real-enableddisabled-split-for-the-six-named-checks)
   2. [The two checks that actually are disabled — and why that matters more, not less](#2-the-two-checks-that-actually-are-disabled--and-why-that-matters-more-not-less)
   3. [InterruptedException: three checks, two different mistakes, one disabled](#3-interruptedexception-three-checks-two-different-mistakes-one-disabled)
   4. [catch(Throwable) and catch(Exception): TryFailThrowable, S1181, REC_CATCH_EXCEPTION](#4-catchthrowable-and-catchexception-tryfailthrowable-s1181-rec_catch_exception)
   5. [Resource leaks: three tools, two real gates, one deprecated peer](#5-resource-leaks-three-tools-two-real-gates-one-deprecated-peer)
   6. [Files.walk/list/lines: the stream-is-a-resource trap](#6-fileswalklistlines-the-stream-is-a-resource-trap)
   7. [ExecutorService: shutdown on every path, and the JDK-19 close() gotcha](#7-executorservice-shutdown-on-every-path-and-the-jdk-19-close-gotcha)
   8. [Exception chaining: the new X(e.getMessage()) shape, and where Bloch and Error Prone converge](#8-exception-chaining-the-new-xegetmessage-shape-and-where-bloch-and-error-prone-converge)
   9. [Checked vs unchecked, and the sneaky-throw contest](#9-checked-vs-unchecked-and-the-sneaky-throw-contest)
   10. [System.exit() and printStackTrace(): S4507's hotspot trap](#10-systemexit-and-printstacktrace-s4507s-hotspot-trap)
   11. [finalize() vs Cleaner: JEP 421](#11-finalize-vs-cleaner-jep-421)
   12. [serialVersionUID](#12-serialversionuid)
   13. [SpotBugs vs Error Prone: is the residual set empty? (JAVA-LINT-10 handover)](#13-spotbugs-vs-error-prone-is-the-residual-set-empty-java-lint-10-handover)
3. [Normative guidance candidates](#normative-guidance-candidates)
4. [Exemplar evidence](#exemplar-evidence)
5. [AI-agent angle](#ai-agent-angle)
6. [Contested / evolving](#contested--evolving)
7. [Sources](#sources)

## Summary

- Of the six checks the brief named, **four are already on by default** in Error Prone: `TryFailThrowable` and `MustBeClosedChecker` are `ENABLED_ERRORS`; `InterruptedInCatchBlock` and `StreamResourceLeak` are `ENABLED_WARNINGS`. Only `CatchingUnchecked` and `UnusedException` are `DISABLED_CHECKS` — [BuiltInCheckerSuppliers.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) lines 724–917 (ENABLED_ERRORS), 918–1236 (ENABLED_WARNINGS), 1237–1392 (DISABLED_CHECKS).
- The real default-off gap is narrower and sharper than "swallowed exceptions are silent everywhere": `EmptyCatch`, `CatchAndPrintStackTrace` and `CatchFail` are also `ENABLED_WARNINGS` (lines 988, 958, 959) — Error Prone already flags an empty catch block, a caught-then-printStackTrace'd exception, and a caught-then-`fail()`'d test exception out of the box. What is missing by default is the **broad-catch-then-swallow** shape specifically (`CatchingUnchecked`) and the **catch-then-rethrow-without-cause** shape (`UnusedException`) — plus the narrower `InterruptedExceptionSwallowed` (catching `InterruptedException` inside a wider `Exception`/`Throwable` catch without separate handling), which is itself `DISABLED_CHECKS` (line 1297), distinct from the enabled `InterruptedInCatchBlock`.
- Enable the two disabled checks with `-Xep:CatchingUnchecked:ERROR -Xep:UnusedException:ERROR` (or `:WARN`) on the `JavaCompile` task's `options.errorprone`; there is no other activation syntax — membership in `DISABLED_CHECKS` means the check never fires without an explicit per-name `-Xep:` flag.
- `InterruptedInCatchBlock` and `InterruptedExceptionSwallowed` are **not the same check**: the first catches the wrong-API mistake (`Thread.interrupted()` instead of `Thread.currentThread().interrupt()`) and is on by default; the second catches interrupt-swallowing-via-overly-broad-catch and is off by default. A rule naming only the first misses the second.
- `catch (Throwable)` masking test assertions is `TryFailThrowable` (Error Prone, ERROR, on by default) and SonarJava `S1181` "Throwable and Error should not be caught" (CWE-396, CERT ERR08-J. per SonarJava's own rule metadata). SpotBugs' `REC_CATCH_EXCEPTION` is a *different*, narrower shape (catching `Exception` when only `RuntimeException` can be thrown) filed under `STYLE`, not `CORRECTNESS`.
- Three tools claim resource-leak detection with different mechanisms: Error Prone's `MustBeClosedChecker` (annotation-driven, `@MustBeClosed`, ENABLED_ERRORS) and `StreamResourceLeak` (fixed JDK-API list — `Files.walk/list/lines/find/newDirectoryStream` — ENABLED_WARNINGS) require no external tool; SonarJava `S2095` is dataflow-based and needs no annotation, and **SonarJava's own rule page states S2095 deprecated `pmd:CloseResource` in Sonar 5.3** — PMD is not a third peer, it is the tool S2095 replaced. Name Error Prone's pair (when Error Prone runs) and S2095 (when SonarQube/SonarCloud runs) as the two real gates; do not name PMD `CloseResource` as a third option — it is enforced in 0/32 corpus repos and PMD itself is not run in 0/32 ([jvm-audit/exemplar-quality-gates.md line 300](../jvm-audit/exemplar-quality-gates.md)).
- **Only 2 of the 3 corpus repos the wave-1 audit called "SpotBugs as a gate" actually gate the build.** `apache/kafka` (`940c100fab:build.gradle:896,898` — `ignoreFailures = false`, `test.dependsOn('spotbugsMain')`) and `diffplug/spotless` (`dc2a4cb9a3:lib/build.gradle:136-139`, plugin default `ignoreFailures=false`, wired into `check`) are real gates. `assertj/assertj`'s SpotBugs declaration (`485502bad2:assertj-parent/pom.xml:196-203`) sits **only under Maven's `<reporting>` block**, and its `main.yml`/`release.yml`/`pitest-*.yml` CI workflows run `mvn verify`, `sonar:sonar`, `package`, `javadoc:javadoc`, `deploy` — never `mvn site` or `spotbugs:check`. It is a report nobody generates in CI: performative in exactly the sense the brief already established for `maven-pmd-plugin` in `apache/maven` and the Gradle PMD plugin in `gradle/gradle`.
- The residual set of SpotBugs `CORRECTNESS`+`MT_CORRECTNESS` patterns (175 total: 129+46, [messages.xml](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/messages.xml)/[findbugs.xml](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/findbugs.xml)) uniquely caught relative to Error Prone's 187 `ENABLED_ERRORS` is **not empty**: it includes `UL_UNRELEASED_LOCK` (no Error Prone analog at all — Error Prone's `LockNotBeforeTry` checks a different moment), the interprocedural null/uninitialized-field dataflow family (`NP_*`, ~15 patterns — works without `@Nullable` annotations, unlike NullAway), serialization internals (`SE_METHOD_MUST_BE_PRIVATE`, `SE_READ_RESOLVE_IS_STATIC`, etc.), JDBC index misuse (`SQL_BAD_PREPARED_STATEMENT_ACCESS`, `SQL_BAD_RESULTSET_ACCESS`), and numeric-range dataflow (`RANGE_ARRAY_INDEX` and siblings). `UL_UNRELEASED_LOCK` fires on kafka's own `BufferPool.allocate()` in production code (`940c100fab:gradle/spotbugs-exclude.xml`), confirming it reaches real, non-toy code.
- The sneaky-throw question is genuinely contested and stays that way: Brian Goetz calls advising it "irresponsible" ([Stack Overflow, attributed](https://stackoverflow.com/questions/19757300/java-8-lambda-streams-filter-by-method-with-exception)); Heinz Kabutz documents the mechanics in his own newsletter as narrowly useful "when overriding a method which does not throw a checked exception" while saying in general the answer is "no" ([Java Specialists Issue 33](https://www.javaspecialists.eu/archive/Issue033-Making-Exceptions-Unchecked.html)). Record both positions; do not issue a MUST either way.
- `System.exit()` in library code and `printStackTrace()` over the logger are covered by SonarJava `S4507`, but **S4507 reports as a Security Hotspot, not a standard Issue** — a quality gate keyed on "no new Issues" (the common default) shows zero `S4507` findings even on a codebase riddled with `printStackTrace()`, exactly as the deprecated `S1148` it replaced would have caught. Error Prone's `CatchAndPrintStackTrace` (ENABLED_WARNINGS) is the toolchain-native alternative that does report as a normal diagnostic.
- `finalize()` is deprecated for removal since JDK 18 ([JEP 421](https://openjdk.org/jeps/421)); the replacements are try-with-resources for scoped resources and `java.lang.ref.Cleaner` (JDK 9+) for GC-triggered cleanup, both explicit-control alternatives to finalization's unpredictable latency.
- `serialVersionUID` absence is flagged by SpotBugs `SE_NO_SERIALVERSIONID` (`BAD_PRACTICE`, on by default) and SonarJava `S2057` ("Serializable classes should have a serialVersionUID", `MAINTAINABILITY:HIGH`, `defaultSeverity: Critical`); Error Prone has no equivalent check in `ENABLED_ERRORS`/`ENABLED_WARNINGS`/`DISABLED_CHECKS`.

## Findings

### 1. Error Prone's real enabled/disabled split for the six named checks

`BuiltInCheckerSuppliers.java` defines three disjoint, contiguous blocks (confirmed by reading the file directly, not the docs site, per the brief's instruction):

| Block | Line range | Meaning |
|---|---|---|
| `ENABLED_ERRORS` | 724–917 | Runs by default; `-Werror`-style failure |
| `ENABLED_WARNINGS` | 918–1236 | Runs by default; warning severity |
| `DISABLED_CHECKS` | 1237–1392 | **Never runs** without an explicit `-Xep:Name:LEVEL` |

[Source](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java)

Placing each named check by its `.class` reference line:

| Check | Line | Block | Default status |
|---|---|---|---|
| `TryFailThrowable` | 900 | ENABLED_ERRORS | **On, ERROR** |
| `MustBeClosedChecker` | 844 | ENABLED_ERRORS | **On, ERROR** |
| `InterruptedInCatchBlock` | 1043 | ENABLED_WARNINGS | **On, WARNING** |
| `StreamResourceLeak` | 1175 | ENABLED_WARNINGS | **On, WARNING** |
| `CatchingUnchecked` | 1258 | DISABLED_CHECKS | Off |
| `UnusedException` | 1378 | DISABLED_CHECKS | Off |

This corrects the framing that "several checks exist but are off by default" as a broad statement about the six named checks — four of six already run. What *is* true, and is the sharper finding, is in §2.

### 2. The two checks that actually are disabled — and why that matters more, not less

`CatchingUnchecked` ([errorprone.info source](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/CatchingUnchecked.md)) flags `catch (Exception e)` where the try block cannot throw a checked exception — i.e., catching wider than necessary, obscuring that no checked exception is actually being handled. `UnusedException` ([source](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/UnusedException.md)) flags `catch (X e) { throw new Y(); }` — a new exception thrown without `e` as its cause, severing the stack trace at the catch site.

Both are exactly the two moves an LLM makes when asked to "handle errors": wrap risky code in a broad `catch (Exception e)`, then either swallow it or rethrow a fresh exception without the original. Enable both explicitly:

```kotlin
// build.gradle.kts, on the JavaCompile task
tasks.withType<JavaCompile>().configureEach {
    options.errorprone {
        error("CatchingUnchecked", "UnusedException")
    }
}
```

`UnusedException`'s own suppression doc doubles as the exact convention Effective Java Item 77 independently recommends (§8): if the exception is deliberately unused, name it `unused` (or `_`), never leave a bare unnamed catch.

Noise check: neither check has an opt-out escape hatch beyond the standard `@SuppressWarnings`/rename convention, and both are narrowly scoped to the catch-and-discard/catch-and-sever shape — they do not fire on `catch (Exception e) { throw new IllegalStateException(e); }` (cause preserved) or on a checked-exception-throwing try block caught broadly for a legitimate reason. Spotless's own build ([`dc2a4cb9a3:gradle/error-prone.gradle:8-23`](https://github.com/diffplug/spotless)) demonstrates the promote-then-trim pattern in general: `disableAllWarnings = true` followed by an explicit `error(...)` allowlist — the same mechanism this rule recommends, applied to a different check set.

### 3. InterruptedException: three checks, two different mistakes, one disabled

The brief names one check (`InterruptedInCatchBlock`); reading `BuiltInCheckerSuppliers.java` in full surfaces three:

| Check | What it catches | Default |
|---|---|---|
| `InterruptedInCatchBlock` (line 1043) | Calling `Thread.interrupted()` (which *clears* the interrupt bit) instead of `Thread.currentThread().interrupt()` inside a catch block | **On** (WARNING) |
| `InterruptedExceptionSwallowed` (line 1297) | Catching `InterruptedException` implicitly via a wider `catch (Exception e)`/`catch (Throwable e)` without separately restoring interrupt status | Off (DISABLED_CHECKS) |
| SonarJava `S2142` | "InterruptedException and ThreadDeath should not be ignored" (CWE-391) | Sonar way profile, standard Issue |

Correct pattern, matching Error Prone's own doc example:

```java
try {
  mightTimeOutOrBeCancelled(); // e.g. myFuture.get()
} catch (InterruptedException e) {
  Thread.currentThread().interrupt();          // restore the bit
  throw new MyCheckedException("...", e);
}
```

Wrong and *silent under default Error Prone config* (broad catch swallows the interrupt entirely — only caught if `InterruptedExceptionSwallowed` is promoted, or by SonarJava S2142):

```java
try {
  mightTimeOutOrBeCancelled();
} catch (Exception e) {
  log.warn("failed", e); // InterruptedException handled the same as everything else
}
```

[InterruptedInCatchBlock](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/InterruptedInCatchBlock.md), [InterruptedExceptionSwallowed](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/InterruptedExceptionSwallowed.md), [SonarJava S2142 metadata](https://raw.githubusercontent.com/SonarSource/sonar-java/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S2142.json).

### 4. catch(Throwable) and catch(Exception): TryFailThrowable, S1181, REC_CATCH_EXCEPTION

`TryFailThrowable` (Error Prone, ENABLED_ERRORS, line 900) targets specifically the test-code failure mode: `fail()`/`assert*()` throw `AssertionError`, a `Throwable` subtype, so a `try { ...; fail(); } catch (Throwable t) { ... }` block always reaches its catch — the test can never fail on the intended assertion. [Source](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/TryFailThrowable.md).

SonarJava `S1181` ("Throwable and Error should not be caught", CODE_SMELL, `MAINTAINABILITY:MEDIUM`, CWE-396, CERT `ERR08-J.` per its own metadata) is the general-purpose version of the same prohibition, not test-specific — masking `OutOfMemoryError`, `StackOverflowError`, or JVM-fatal errors in production code. [Metadata](https://raw.githubusercontent.com/SonarSource/sonar-java/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S1181.json).

SpotBugs `REC_CATCH_EXCEPTION` is a *third, narrower* shape: catching `Exception` when static analysis can prove only `RuntimeException` (or nothing) is thrown in the try block — i.e., "this could have been `catch (RuntimeException e)`". Filed under `category="STYLE"` (not `CORRECTNESS`), it runs by default (no `disabled` attribute on its detector, `edu.umd.cs.findbugs.detect.RuntimeExceptionCapture`). [messages.xml:7361](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/messages.xml), [findbugs.xml:562](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/findbugs.xml). This is functionally the same shape Error Prone's `CatchingUnchecked` targets — but `REC_CATCH_EXCEPTION` is on by default in SpotBugs where `CatchingUnchecked` is off by default in Error Prone.

### 5. Resource leaks: three tools, two real gates, one deprecated peer

| Tool/check | Mechanism | Default | Needs annotation? |
|---|---|---|---|
| Error Prone `MustBeClosedChecker` | Enforces `@MustBeClosed`-annotated factories are used inside try-with-resources | **On (ERROR)** | Yes, on the factory |
| Error Prone `StreamResourceLeak` | Fixed list of JDK APIs (`Files.newDirectoryStream`, `.list`, `.walk`, `.find`, `.lines`) | **On (WARNING)** | No |
| SonarJava `S2095` | Dataflow: any `Closeable`/`AutoCloseable` not created inside try-with-resources | Sonar way profile | No |
| PMD `CloseResource` | Same category as S2095 | **Deprecated by S2095 since Sonar 5.3** ([community confirmation](https://community.sonarsource.com/t/misreport-on-rule-resources-should-be-closed-java-s2095/37391)); enforced 0/32 in corpus | No |

S2095 is general-purpose and needs no annotation, which is what makes it a real peer to Error Prone's pair rather than a fourth redundant tool: MustBeClosedChecker only fires on APIs *someone annotated* `@MustBeClosed`, and StreamResourceLeak's coverage is the fixed `Files.*` list — a custom `Closeable` factory with no annotation is invisible to both, and is exactly what S2095's dataflow analysis catches. PMD's version is superseded in SonarSource's own telling and unused in the corpus; do not name it as a third peer.

### 6. Files.walk/list/lines: the stream-is-a-resource trap

`StreamResourceLeak`'s own doc quotes the JDK's `Files` javadoc directly for each API: `newDirectoryStream`, `list`, `walk`, `find` each "encapsulate one or more `DirectoryStream`s"; `lines` "encapsulates a `Reader`". All five leak a file descriptor if not closed. [Source](https://raw.githubusercontent.com/google/error-prone/gh-pages/bugpattern/StreamResourceLeak.md).

```java
// WRONG — the Reader inside Files.lines() is never closed
String input = Files.lines(path).collect(Collectors.joining(", "));

// RIGHT
String input;
try (Stream<String> stream = Files.lines(path)) {
  input = stream.collect(Collectors.joining(", "));
}
```

This is a distinctively AI-agent-shaped mistake: `Files.lines(path).filter(...).collect(...)` reads as an idiomatic one-liner and compiles cleanly; nothing about the `Stream<String>` return type signals "this holds an open file handle" the way `InputStream`/`Reader` does by name.

### 7. ExecutorService: shutdown on every path, and the JDK-19 close() gotcha

Since JDK 19, `ExecutorService extends AutoCloseable`, with a default `close()`:

> Initiates an orderly shutdown in which previously submitted tasks are executed, but no new tasks will be accepted. This method waits until all tasks have completed execution and the executor has terminated. If interrupted while waiting, this method stops all executing tasks as if by invoking `shutdownNow()`. [...] The interrupt status will be re-asserted before this method returns.

[Oracle Javadoc, ExecutorService (JDK 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html)

The gotcha: `close()` blocks **indefinitely** — there is no timeout parameter, unlike the traditional idiom of `shutdown()` + `awaitTermination(timeout, unit)` + `shutdownNow()`. Porting old shutdown code to `try (var pool = Executors.newFixedThreadPool(n))` silently removes the timeout bound that `awaitTermination(30, SECONDS)` used to provide.

```java
// Traditional, bounded
ExecutorService pool = Executors.newFixedThreadPool(4);
try {
  submitWork(pool);
} finally {
  pool.shutdown();
  if (!pool.awaitTermination(30, TimeUnit.SECONDS)) {
    pool.shutdownNow();
  }
}

// JDK 19+, unbounded wait — fine for short-lived work, a latent hang for anything else
try (var pool = Executors.newFixedThreadPool(4)) {
  submitWork(pool);
} // close() blocks until every task finishes, however long that takes
```

The virtual-thread-specific angle on this (`newVirtualThreadPerTaskExecutor()` inside try-with-resources, per-task-not-pooled) is JAVA-CONC's M-N-06, not duplicated here.

### 8. Exception chaining: the new X(e.getMessage()) shape, and where Bloch and Error Prone converge

`UnusedException`'s bad/good pair (§2) and Effective Java Item 77 ("Don't ignore exceptions") converge on the identical fix and the identical naming convention for the deliberate-ignore case:

> If you choose to ignore an exception, the catch block should contain a comment explaining why it is appropriate to do so, and the variable should be named `ignored`.
[Item 77, summarized from the chapter](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/ch10.xhtml); Error Prone's suppression doc independently says the same: "rename it `_` or `unused`".

The specific anti-pattern the brief names — `new X(e.getMessage())` — is worse than `UnusedException`'s bare `throw new Y()` example: it *looks* like the original failure is preserved (the message string survives) while the stack trace, exception type, and any suppressed exceptions are all discarded. Grep for it directly: `new \w+Exception\([^)]*\.getMessage\(\)\)` catches the shape when the constructor argument is exactly `e.getMessage()` (a broader net also needs `UnusedException` itself, which catches the equivalent bug even without a literal `.getMessage()` call).

```java
// WRONG — cause is gone, only the message string survives
} catch (IOException e) {
  throw new ServiceException("read failed: " + e.getMessage());
}

// RIGHT — cause chained, message and type both preserved
} catch (IOException e) {
  throw new ServiceException("read failed", e);
}
```

Effective Java Items 69/70/75 (chapter TOC: [O'Reilly](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/ch10.xhtml)) supply the surrounding judgment calls this rule doesn't automate: 69 (exceptions for exceptional conditions only), 70 (checked for recoverable, unchecked for programming errors), 75 (failure-capture information in the detail message) — a reviewer applies these by reading, not by grep.

### 9. Checked vs unchecked, and the sneaky-throw contest

Covered under §Contested/evolving rather than as a MUST — see below. The mechanical grep that matters regardless of position: any custom `sneakyThrow`/`throwUnchecked` helper using the `<E extends Throwable> void f(Throwable t) throws E { throw (E) t; }` type-erasure idiom is worth a code-review comment pointing at the tradeoff, not a lint failure.

### 10. System.exit() and printStackTrace(): S4507's hotspot trap

SonarJava's rule lineage here is real but the brief's framing needs one correction: `S4507`'s current title is **"Debugging features should not be enabled in production"**, and it is classified `type: VULNERABILITY` — a **Security Hotspot**, not a standard Issue. [Metadata](https://raw.githubusercontent.com/SonarSource/sonar-java/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S4507.json). A user report confirms the practical consequence directly: the deprecated `S1148` ("printStackTrace should not be called", a standard Issue) found 28 hits on a codebase where `S4507` found zero — not because the underlying detection regressed, but because Security Hotspots render in a separate SonarQube UI tab and a quality gate scoped to "new Issues" never sees them. [SonarSource Community thread](https://community.sonarsource.com/t/deprecated-s1148-finds-issues-but-suggested-replacement-s4507-does-not/57331).

The practical consequence for a rule file: **cite Error Prone's `CatchAndPrintStackTrace` (ENABLED_WARNINGS, line 958) as the toolchain-native check for this**, since it reports as an ordinary compiler diagnostic regardless of how the SonarQube gate is scoped:

```java
// WRONG — flagged by CatchAndPrintStackTrace by default
} catch (IOException e) {
  e.printStackTrace();
}

// RIGHT
} catch (IOException e) {
  logger.log(Level.WARNING, "something has gone wrong", e);
}
```

`System.exit()` in library code has no equivalent Error Prone check in `ENABLED_ERRORS`/`ENABLED_WARNINGS`; SpotBugs' `DM_EXIT` (`BAD_PRACTICE`) is the mechanical check, and kafka's own exclude file documents the honest state of a real codebase: `<Bug pattern="DM_EXIT"/>` with the comment "Disable warnings about System.exit, until we decide to stop using it" ([`940c100fab:gradle/spotbugs-exclude.xml`](https://github.com/apache/kafka)) — an application (not a library) that suppresses the check as acknowledged technical debt rather than pretending it doesn't apply.

### 11. finalize() vs Cleaner: JEP 421

> [JEP 421] terminally deprecates Java's finalization mechanism, including `Object.finalize()` [...] Finalization suffers from unpredictable latency, unconstrained behavior [...] recognized for decades. [...] Try-with-resources [...] ensures close() methods execute reliably, even when exceptions occur. [...] Cleaner [...] allows registration of cleanup actions without the resurrection risks and unpredictability of finalizers, though it remains GC-dependent for scheduling.

[openjdk.org/jeps/421](https://openjdk.org/jeps/421) — deprecated-for-removal since JDK 18 (September 2022); `-Xlint:removal` and `-Werror` together turn a `finalize()` override into a build failure.

```java
// WRONG — deprecated for removal since JDK 18
@Override
protected void finalize() {
  nativeHandle.free();
}

// RIGHT — explicit, deterministic
public class Resource implements AutoCloseable {
  private static final Cleaner CLEANER = Cleaner.create();
  private final Cleaner.Cleanable cleanable;
  Resource(long nativeHandle) {
    this.cleanable = CLEANER.register(this, () -> NativeLib.free(nativeHandle));
  }
  @Override public void close() { cleanable.clean(); }
}
```

### 12. serialVersionUID

SpotBugs `SE_NO_SERIALVERSIONID` (`BAD_PRACTICE`, on by default — detector `edu.umd.cs.findbugs.detect.FindSerializableFields` at `findbugs.xml:487` has no `disabled` attribute) and SonarJava `S2057` ("Serializable classes should have a serialVersionUID", `MAINTAINABILITY:HIGH`, `defaultSeverity: Critical`) both flag the same absence. [SpotBugs](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/messages.xml) (line 4920), [S2057 metadata](https://raw.githubusercontent.com/SonarSource/sonar-java/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java/S2057.json). Error Prone has no matching check in any of its three lists — this is a SpotBugs/SonarJava-only concern, which matters for §13's "residual set" question.

### 13. SpotBugs vs Error Prone: is the residual set empty? (JAVA-LINT-10 handover)

**No, and the corpus measurement claiming three real gates is itself one exemplar wrong.**

First, the gate-count correction. Re-reading each of the three repos' own build configuration:

- `apache/kafka` (`940c100fab:build.gradle:893-898`): `spotbugs { toolVersion = ...; excludeFilter = file(...) }`, then explicitly `ignoreFailures = false` and `test.dependsOn('spotbugsMain')` — a real gate, and kafka does **not** actually run Error Prone (its one `errorprone` string match, `build.gradle:2522`, excludes the transitive `error_prone_annotations` dependency from `caffeine`; no `net.ltgt.errorprone` plugin is applied anywhere in the build). The wave-1 audit's "13/32 use Error Prone" count includes kafka as a false positive from the same grep shape (`apache/maven`'s two `errorprone` hits, `pom.xml:370,550`, are the identical exclusion pattern).
- `diffplug/spotless` (`dc2a4cb9a3:lib/build.gradle:136-139`): `spotbugs { reportLevel = Confidence.LOW; excludeFilter = ... }`, no `ignoreFailures` override (plugin default is `false`, and `spotbugsMain`/`spotbugsTest` are wired into `check` by the SpotBugs Gradle plugin unless disabled) — a real gate, **and** spotless genuinely runs Error Prone (`gradle/error-prone.gradle:3`, `apply plugin: 'net.ltgt.errorprone'`) — but with `disableAllWarnings = true` and only five checks re-enabled (`ReturnValueIgnored`, `SelfAssignment`, `StringJoin`, `UnnecessarilyFullyQualified`, `UnnecessaryLambda`). Spotless's own Error Prone surface is deliberately minimized, which makes SpotBugs (at `Confidence.LOW`, the most sensitive setting) the actual heavy static-analysis pass in this build, not a redundant second opinion on top of a fully-enabled Error Prone.
- `assertj/assertj` (`485502bad2:assertj-parent/pom.xml:196-203`): the SpotBugs Maven plugin declaration sits **inside `<reporting>`**, which Maven only invokes via `mvn site`. Grepping every CI workflow (`main.yml`, `release.yml`, `pitest-run.yml`, `pitest-comment-pr.yml`, `binary-compatibility.yml`) turns up `verify`, `sonar:sonar`, `package`, `javadoc:javadoc`, `deploy`, `pitest-github:github`, `pitest:mutationCoverage` — never `site` or `spotbugs:check`. **assertj's SpotBugs never runs in CI.** This is the exact PMD-style performative-declaration pattern the brief already established for `apache/maven`'s `maven-pmd-plugin` (zero bound executions) and `gradle/gradle`'s unused PMD plugin — SpotBugs has its own version of that failure mode, and the wave-1 count (3/32) should be read as 2/32 real gates plus one performative declaration.

Second, the pattern diff itself. SpotBugs' `CORRECTNESS` (129 patterns) + `MT_CORRECTNESS` (46 patterns) = 175 total ([messages.xml](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/messages.xml)) against Error Prone's 187 `ENABLED_ERRORS` ([BuiltInCheckerSuppliers.java:724-917](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java)) has a small confirmed name-level/semantic overlap — `SelfAssignment`↔`SA_FIELD_SELF_ASSIGNMENT`, `SelfComparison`↔`SA_FIELD_SELF_COMPARISON`, `InfiniteRecursion`↔`IL_INFINITE_RECURSIVE_LOOP`, `DeadException`↔`RV_EXCEPTION_NOT_THROWN`, `CollectionIncompatibleType`↔`GC_UNRELATED_TYPES`, and (extending the comparison into `ENABLED_WARNINGS`) `DoubleCheckedLocking`↔`DC_DOUBLECHECK`, `WaitNotInLoop`↔`WA_NOT_IN_LOOP`/`WA_AWAIT_NOT_IN_LOOP`, `NonAtomicVolatileUpdate`↔`VO_VOLATILE_INCREMENT` — roughly a dozen genuine pairs out of 175.

The residual — everything SpotBugs catches that neither `ENABLED_ERRORS` nor `ENABLED_WARNINGS` has a named analog for — is substantial and falls into families with no Error Prone coverage at all:

- **All of `MT_CORRECTNESS` beyond the handful above**: `UL_UNRELEASED_LOCK` (no analog — `LockNotBeforeTry` checks a different moment, "was `try` the statement right after `lock()`", not "is the lock released on every exit path"), `DC_PARTIALLY_CONSTRUCTED`, `MWN_MISMATCHED_NOTIFY`/`MWN_MISMATCHED_WAIT`, `NN_NAKED_NOTIFY`, `RU_INVOKE_RUN`, `SC_START_IN_CTOR`, `SP_SPIN_ON_FIELD`, `STCAL_STATIC_CALENDAR_INSTANCE`, `TLW_TWO_LOCK_WAIT`, `UG_SYNC_SET_UNSYNC_GET`, `UW_UNCOND_WAIT`.
- **Interprocedural null/uninitialized-field dataflow (`NP_*`, ~15 patterns)**: `NP_ALWAYS_NULL`, `NP_GUARANTEED_DEREF`, `NP_NULL_ON_SOME_PATH`, `NP_NONNULL_FIELD_NOT_INITIALIZED_IN_CONSTRUCTOR`, `NP_CLOSING_NULL`, `NP_UNWRITTEN_FIELD` — these work on bytecode with **no `@Nullable` annotations required**, unlike NullAway, which needs an annotated codebase to do anything.
- **Serialization internals**: `SE_METHOD_MUST_BE_PRIVATE`, `SE_READ_RESOLVE_IS_STATIC`, `SE_READ_RESOLVE_MUST_RETURN_OBJECT`, `SE_TRANSIENT_FIELD_NOT_RESTORED`.
- **JDBC index misuse**: `SQL_BAD_PREPARED_STATEMENT_ACCESS`, `SQL_BAD_RESULTSET_ACCESS`.
- **Numeric-range dataflow**: `RANGE_ARRAY_INDEX`, `RANGE_ARRAY_LENGTH`, `RANGE_ARRAY_OFFSET`, `RANGE_STRING_INDEX`.

And `UL_UNRELEASED_LOCK` is not a theoretical example — it fires on `apache/kafka`'s own `BufferPool.allocate()`, with the suppression comment explaining the false-positive reason ("there is an 'if' statement that checks if we have the lock before releasing it") ([`940c100fab:gradle/spotbugs-exclude.xml`](https://github.com/apache/kafka)), which is itself proof the check reaches real, load-bearing concurrency code rather than only toy cases.

**Answer for JAVA-LINT-10's scoping**: SpotBugs earns its slot on `CORRECTNESS`+`MT_CORRECTNESS` alone (skip `find-sec-bugs`, already 0/32 and covered by the sibling JAVA-SEC dive) specifically for the lock/wait/notify family and the annotation-free null/uninitialized-field dataflow family — genuinely absent from Error Prone regardless of how aggressively Error Prone's `DISABLED_CHECKS` are promoted. It is not a redundant slow pass on top of Error Prone + NullAway. What the corpus does *not* support is treating "3/32 run it as a gate" as settled fact; one of those three is a report nobody generates.

## Normative guidance candidates

**Index-level (JAVA-ERR MUST list — true in every edit that touches a catch block or opens a resource):**

1. **JAVA-ERR-01 — Never let a caught `InterruptedException` (including one caught via a broader `Exception`/`Throwable`) fall through without either re-interrupting the thread (`Thread.currentThread().interrupt()`) or propagating it.** *Rationale*: swallowing it breaks cooperative cancellation for every caller up the stack. *Verify*: promote `-Xep:InterruptedExceptionSwallowed:ERROR` (off by default) alongside the already-on `InterruptedInCatchBlock`; grep `catch\s*\(\s*InterruptedException` bodies for the absence of `Thread.currentThread().interrupt()` or a `throw`.
2. **JAVA-ERR-02 — Never catch `Throwable` or `Error` except at a documented top-level boundary (e.g., a framework's uncaught-exception hook).** *Rationale*: masks `OutOfMemoryError`/`StackOverflowError`, and in test code masks the assertion failure itself. *Verify*: `TryFailThrowable` (Error Prone, on by default, ERROR) for test code; SonarJava `S1181` for production code; grep `catch\s*\(\s*(Throwable|Error)\b`.
3. **JAVA-ERR-03 — Promote `-Xep:CatchingUnchecked:ERROR -Xep:UnusedException:ERROR` on every Error-Prone-gated module.** *Rationale*: these are `DISABLED_CHECKS` by default and are the two most characteristic agent-written swallow/sever shapes. *Verify*: grep the `JavaCompile`/`errorprone {}` block for both names under `error(...)`, or `-Xep:CatchingUnchecked` / `-Xep:UnusedException` in Maven's `compilerArgs`.
4. **JAVA-ERR-04 — Any `Closeable`/`AutoCloseable`, including a `Stream` returned by `Files.walk/list/lines/find/newDirectoryStream`, is acquired inside try-with-resources.** *Rationale*: `Stream<T>`'s type signature gives no hint it holds an open file descriptor. *Verify*: `StreamResourceLeak` and `MustBeClosedChecker` (both on by default, Error Prone) where Error Prone runs; SonarJava `S2095` where SonarQube runs; grep `Files\.(walk|list|lines|find|newDirectoryStream)\(` for the absence of an enclosing `try (`.
5. **JAVA-ERR-05 — Never wrap a caught exception in a new one without passing it as the cause; `new SomeException(e.getMessage())` is always wrong.** *Rationale*: severs the stack trace at the catch site, the single most debugging-hostile mistake in this family. *Verify*: `UnusedException` (promote per JAVA-ERR-03); grep `new \w*Exception\([^,)]*\.getMessage\(\)\)`.

**Depth-file only (situational, not present in every edit):**

6. **JAVA-ERR-06 — Shut down every `ExecutorService` on every exit path; if using JDK 19+'s `close()`/try-with-resources, know it blocks indefinitely with no timeout, unlike `awaitTermination(timeout, unit)`.** *Rationale*: unbounded blocking shutdown is a silent behavior change when porting old code to try-with-resources. *Verify*: grep for `ExecutorService`/`Executors.new*` construction and confirm a `shutdown()`/`try (` pairing exists on every path; for `close()`-based code, confirm the call site can tolerate an unbounded wait or wraps it in its own timeout thread.
7. **JAVA-ERR-07 — Do not override `finalize()`; use try-with-resources for scoped cleanup or `java.lang.ref.Cleaner` for GC-triggered cleanup.** *Rationale*: deprecated for removal since JDK 18 (JEP 421). *Verify*: `-Xlint:removal -Werror`; grep `protected void finalize\(`.
8. **JAVA-ERR-08 — Library code (anything not `public static void main`) never calls `System.exit()`, and never calls `printStackTrace()` in place of the configured logger.** *Rationale*: a library must not own process lifecycle; a `printStackTrace()` call is invisible to log aggregation. *Verify*: SpotBugs `DM_EXIT` for the first half; Error Prone `CatchAndPrintStackTrace` (on by default) for the second — **do not rely on SonarJava `S4507` alone**, since it reports as a Security Hotspot and is invisible to an Issues-only quality gate; grep `\.printStackTrace\(\)` and `System\.exit\(` outside `main`/CLI entry points.
9. **JAVA-ERR-09 — Every `Serializable` class declares an explicit `private static final long serialVersionUID`.** *Rationale*: a class with no explicit UID gets an implicit one computed from its structure, which changes silently on innocuous edits (adding a field, a compiler upgrade) and breaks deserialization of already-persisted instances. *Verify*: SpotBugs `SE_NO_SERIALVERSIONID` (on by default) or SonarJava `S2057`; grep `implements Serializable` classes for the field's presence.
10. **JAVA-ERR-10 — On a project running Error Prone + NullAway, still run SpotBugs with `CORRECTNESS` and `MT_CORRECTNESS` enabled (default) for the lock/wait/notify family and the annotation-free null-dataflow family; do not treat it as redundant.** *Rationale*: `UL_UNRELEASED_LOCK` and the `NP_*` family have no Error Prone equivalent regardless of which `DISABLED_CHECKS` are promoted. *Verify*: confirm the SpotBugs task is actually bound into the build's failure path — for Gradle, `ignoreFailures = false` (or the plugin default) and `check.dependsOn`/`test.dependsOn` on `spotbugsMain`; for Maven, the plugin must be declared under `<build><plugins>` (or explicitly invoked via `mvn spotbugs:check`), **not only under `<reporting>`** — a `<reporting>`-only declaration with no CI job running `mvn site` never fails a build (see `assertj/assertj`, §13).
11. **JAVA-ERR-11 (CONSIDER, not MUST) — Prefer wrapping a checked exception in a standard unchecked one (`UncheckedIOException`, `IllegalStateException(cause)`) over a sneaky-throw helper; reserve sneaky-throw for the narrow case of implementing a functional interface or overriding a method that cannot declare the checked exception.** *Rationale*: contested — see below. *Verify*: reading heuristic only; grep for a local `sneakyThrow`/sibling helper as a signal to open a review conversation, not a lint failure.

## Exemplar evidence

| Candidate | Repo@sha:path | What it shows |
|---|---|---|
| JAVA-ERR-03/05 | `google/error-prone` build config vs `diffplug/spotless@dc2a4cb9a3:gradle/error-prone.gradle:3-23` | Spotless demonstrates the promote/trim mechanism (`disableAllWarnings = true` + `error(...)` allowlist) that JAVA-ERR-03 asks agents to apply to `CatchingUnchecked`/`UnusedException` specifically |
| JAVA-ERR-04 | `google__error-prone@c1f99ad5d3` (the tool's own repo) applies its own `MustBeClosedChecker`/`StreamResourceLeak` at ENABLED severity by definition — no violating example available in the sparse checkout (source not fetched) | Confirms the checks are load-bearing enough that the tool author gates on them |
| JAVA-ERR-08 | `apache__kafka@940c100fab:gradle/spotbugs-exclude.xml` — `<Bug pattern="DM_EXIT"/>` with comment "until we decide to stop using it" | A real, large application acknowledging `System.exit()` as tracked debt rather than suppressing it silently — the honest version of JAVA-ERR-08 |
| JAVA-ERR-10 | `apache__kafka@940c100fab:gradle/spotbugs-exclude.xml` — `UL_UNRELEASED_LOCK` suppressed on `BufferPool.allocate()` with a reasoned false-positive explanation | Proof `UL_UNRELEASED_LOCK` reaches real concurrency code, not just toy examples; also a model example of a *justified* suppression (comment explains the semantic reason, not "annoying") |
| JAVA-ERR-10 | `diffplug__spotless@dc2a4cb9a3:lib/build.gradle:136-139` (`reportLevel = LOW`) vs `assertj__assertj@485502bad2:assertj-parent/pom.xml:196-203` (`<reporting>`-only) | Contrasting real gate vs performative declaration for the same tool — the evidence behind the JAVA-LINT-10 correction |
| JAVA-ERR-04/05 (violation absent by design) | `assertj/assertj` main CI (`main.yml`) never runs `mvn site` | Confirms assertj's SpotBugs findings, whatever they are, never block a merge — a negative exemplar for "declared implies enforced" |

Source-code-level violations (an actual `catch (Exception e) {}` or a raw `new X(e.getMessage())`) are not independently re-measured here: the exemplar corpus is a sparse, build-file-only checkout per the frame (`jvm-frame.md`), and fetching arbitrary `.java` files via `git show` for a representative sample was judged lower value than the build-configuration evidence above, which is what determines whether any of these checks actually run.

## AI-agent angle

- **Wrapping risky code in `catch (Exception e) { log.error(...); }` and moving on.** This compiles, looks responsible (there's a log line), and is invisible under a default Error Prone/SpotBugs config unless `CatchingUnchecked`/`UnusedException` are promoted (JAVA-ERR-03) or SonarJava's Sonar way profile is the gate. Smallest check: promote the two checks; there is no cheaper mechanical catch for this exact shape.
- **`new ServiceException("X failed: " + e.getMessage())`.** Reads as if the failure is preserved because the message string survives; an agent trained on codebases with this idiom will reproduce it confidently. Smallest check: the `.getMessage()`-in-constructor grep from §8, plus `UnusedException`.
- **`catch (InterruptedException e) { /* ignore */ }` or logging it like any other exception.** An agent asked to "add error handling around this blocking call" routinely treats `InterruptedException` as just another checked exception to swallow, not as a cooperative-cancellation signal. Smallest check: promote `InterruptedExceptionSwallowed`; it is off by default and no built-in linter catches this by default except SonarJava's Sonar-way `S2142`.
- **`Files.lines(path).map(...).collect(...)` as a one-liner.** Trained on countless tutorial snippets that never close the stream because the tutorial's process exits immediately after. Smallest check: `StreamResourceLeak` (already on by default — no promotion needed, just don't disable it).
- **Assuming `try (var pool = Executors.newFixedThreadPool(n)) { ... }` is a strict improvement over manual shutdown.** An agent that knows `ExecutorService` became `AutoCloseable` in JDK 19 may reach for try-with-resources without knowing `close()` has no timeout — a regression from the bounded `awaitTermination` idiom it replaces. Smallest check: code-review heuristic (§7); no lint catches "this blocking call has no timeout" mechanically.
- **Overriding `finalize()` "just in case" for a class holding a native handle or file descriptor**, an idiom that appears throughout pre-2018 training material and Stack Overflow answers. Smallest check: `-Xlint:removal -Werror` fails the build immediately; cheap and unconditional.
- **Citing S1148 as the current SonarQube rule for `printStackTrace()`.** An agent trained before the S1148→S4507 migration (or reading older blog posts) will point a reviewer at a deprecated rule key, and even a current-model agent that correctly names S4507 may not know it is a Security Hotspot invisible to a default Issues-only gate. Smallest check: don't rely on Sonar for this at all — grep `\.printStackTrace\(\)` directly, or use Error Prone's `CatchAndPrintStackTrace`.
- **Assuming "SpotBugs plugin is declared in the POM" means "SpotBugs runs in CI."** A Maven `<reporting>`-only declaration (assertj's actual state) is easy for an agent to read as "this project gates on SpotBugs" from the POM alone. Smallest check: confirm the plugin is under `<build><plugins>` or that a CI job invokes `mvn site` or `spotbugs:check` explicitly.

## Contested / evolving

- **Sneaky-throw.** Brian Goetz: advising it is "irresponsible because it places the convenience of the code writer over the far more important considerations of transparency and maintainability of the program" ([Stack Overflow, attributed](https://stackoverflow.com/questions/19757300/java-8-lambda-streams-filter-by-method-with-exception)). Heinz Kabutz, in his own newsletter, documents the mechanics (an `ExceptionConverter`-style wrapper preserving the original exception's message and stack trace while adapting it to unchecked) and states his general position as "no" but identifies a legitimate narrow case: "there are some cases where you are overriding a method which does not throw a checked exception that you need to throw and in those cases it can sometimes be useful" ([Java Specialists Issue 33](https://www.javaspecialists.eu/archive/Issue033-Making-Exceptions-Unchecked.html)). Neither position has displaced the other as of 2026-09-12; this stays CONSIDER-level guidance (JAVA-ERR-11), not a MUST in either direction.
- **Checked exceptions generally.** Kabutz notes in the same newsletter that C++, C#, and Python all omit checked exceptions entirely, and expresses skepticism about the feature itself — a minority-but-persistent position within the Java community that predates and outlives the sneaky-throw debate. The corpus and this dive take no side; Effective Java Item 71 ("Avoid unnecessary use of checked exceptions") is the closest thing to consensus guidance and is itself a narrowing, not an elimination.
- **S1148 → S4507 migration.** SonarSource's own community forum shows the migration is still causing confusion in 2026: users see the "replacement" rule report zero findings and conclude (incorrectly) that detection regressed, when the real change is the UI surface (Issue vs. Security Hotspot). This dive treats the practical effect (invisible to a default gate) as settled, not the underlying design choice, which SonarSource has not reversed.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [BuiltInCheckerSuppliers.java](https://github.com/google/error-prone/blob/master/core/src/main/java/com/google/errorprone/scanner/BuiltInCheckerSuppliers.java) | Error Prone's own source, the authoritative ENABLED_ERRORS/ENABLED_WARNINGS/DISABLED_CHECKS lists | fetched 2026-09-12, master | Primary — the docs site's severity field does not tell you what runs by default; this file does |
| [errorprone.info bugpattern markdown source](https://github.com/google/error-prone/tree/gh-pages/bugpattern) (InterruptedInCatchBlock, TryFailThrowable, UnusedException, CatchingUnchecked, MustBeClosedChecker, StreamResourceLeak, CatchAndPrintStackTrace, InterruptedExceptionSwallowed, EmptyCatch, CatchFail) | Auto-generated from each check's `@BugPattern` annotation | fetched 2026-09-12 | Primary — exact problem statement, code examples and suppression convention for every named check |
| [SpotBugs messages.xml](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/messages.xml) | SpotBugs' own bug-pattern descriptions and `category=` assignments | fetched 2026-09-12, master | Primary — source of truth for CORRECTNESS vs MT_CORRECTNESS vs BAD_PRACTICE vs STYLE classification |
| [SpotBugs findbugs.xml](https://raw.githubusercontent.com/spotbugs/spotbugs/master/spotbugs/etc/findbugs.xml) | SpotBugs' detector registry (which detector reports which pattern, and whether disabled by default) | fetched 2026-09-12, master | Primary — confirms none of the six named SpotBugs checks are disabled-by-default detectors |
| [SonarJava rule metadata JSON](https://github.com/SonarSource/sonar-java/tree/master/sonar-java-plugin/src/main/resources/org/sonar/l10n/java/rules/java) (S2142, S1181, S4507, S2057) | The tool's own rule registry: title, type, severity, CWE/CERT mapping | fetched 2026-09-12, master | Primary — S4507's `type: VULNERABILITY` (Security Hotspot) is the fact that explains the S1148 migration complaints |
| [openjdk.org/jeps/421](https://openjdk.org/jeps/421) | JEP 421, Deprecate Finalization for Removal | JDK 18, 2022; still current guidance 2026-09-12 | Primary — the JDK's own stated rationale and recommended alternatives (try-with-resources, Cleaner) |
| [Oracle ExecutorService Javadoc (JDK 21)](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html) | Official JDK API documentation | JDK 19 feature (AutoCloseable), fetched against JDK 21 docs 2026-09-12 | Primary — exact, unambiguous wording of `close()`'s indefinite-blocking behavior |
| [Java Specialists Issue 33 — Making Exceptions Unchecked](https://www.javaspecialists.eu/archive/Issue033-Making-Exceptions-Unchecked.html) | Heinz Kabutz's own newsletter | original publication predates 2026; author's own site, fetched 2026-09-12 | Primary — the "pragmatic escape hatch" side of the sneaky-throw contest, in the author's own words |
| [Effective Java, 3rd Edition, Chapter 10 (Exceptions)](https://www.oreilly.com/library/view/effective-java-3rd/9780134686097/ch10.xhtml) | Publisher's own chapter table of contents/text, Joshua Bloch | 2018, still the standard reference in 2026 | Semi-primary — the canonical item list (69–77) this dive is scoped against |
| [apache/kafka `gradle/spotbugs-exclude.xml`](https://github.com/apache/kafka) (measured at `940c100fab`) | The exemplar's own SpotBugs suppression file | measured 2026-09-12 | Primary, exemplar corpus — real, dated, reasoned suppressions for `DM_EXIT`, `UL_UNRELEASED_LOCK`, `OS_OPEN_STREAM`, `RV_RETURN_VALUE_IGNORED` on production code |
| [apache/kafka `build.gradle`](https://github.com/apache/kafka) (measured at `940c100fab`) | The exemplar's own Gradle build | measured 2026-09-12 | Primary, exemplar corpus — confirms SpotBugs `ignoreFailures=false`/`test.dependsOn` gate and the Error-Prone false-positive grep hit |
| [assertj/assertj `assertj-parent/pom.xml`](https://github.com/assertj/assertj) (measured at `485502bad2`) | The exemplar's own Maven parent POM | measured 2026-09-12 | Primary, exemplar corpus — the `<reporting>`-only SpotBugs declaration at the center of the JAVA-LINT-10 correction |
| [assertj/assertj CI workflows](https://github.com/assertj/assertj) (`.github/workflows/main.yml`, `release.yml`, `pitest-run.yml`, `pitest-comment-pr.yml`, `binary-compatibility.yml`, measured at `485502bad2`) | The exemplar's own CI configuration | measured 2026-09-12 | Primary, exemplar corpus — proves no CI job ever invokes `mvn site` or `spotbugs:check` |
| [diffplug/spotless `lib/build.gradle` and `gradle/error-prone.gradle`](https://github.com/diffplug/spotless) (measured at `dc2a4cb9a3`) | The exemplar's own Gradle build | measured 2026-09-12 | Primary, exemplar corpus — the one repo genuinely running both Error Prone (minimized) and SpotBugs (maximized), showing they are not redundant even when co-located |
| [SonarSource Community: "Deprecated S1148 finds issues but suggested replacement S4507 does not"](https://community.sonarsource.com/t/deprecated-s1148-finds-issues-but-suggested-replacement-s4507-does-not/57331) | User/maintainer forum thread | thread active into 2026 | Practitioner evidence that the S1148→S4507 migration has a real-world detection-visibility gap, confirmed by a SonarSource team member's reply |
| [Stack Overflow — Java 8 lambda streams filter by method with exception](https://stackoverflow.com/questions/19757300/java-8-lambda-streams-filter-by-method-with-exception) | Q&A thread attributing the Brian Goetz "irresponsible" quote | original thread predates 2026 | The most-cited original attribution for Goetz's sneaky-throw position |
| [SEI CERT ERR00-J — Do not suppress or ignore checked exceptions](https://wiki.sei.cmu.edu/confluence/display/java/ERR00-J.+Do+not+suppress+or+ignore+checked+exceptions) | CERT Oracle Coding Standard for Java | maintained, checked 2026-09-12 | Primary secure-coding standard backing the swallowed-exception family independently of Bloch/Error Prone |
| [jvm-audit/exemplar-quality-gates.md](../jvm-audit/exemplar-quality-gates.md) | This program's own wave-1 measurement of the 32-repo corpus | 2026-09-05 | Internal — source of the "3/32 SpotBugs gate" and "0/32 PMD" counts this dive corrects/confirms |
| [jvm-topic-map.md](../jvm-topic-map.md) | This program's own wave-2 topic map (rows M-O-01…07, family JAVA-ERR) | 2026-09-12 | Internal — the commissioning brief and the seven rows this dive is scoped to answer |
