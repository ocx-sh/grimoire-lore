---
title: Canonical Java — books, specs, JEPs, and official style/API guidance
corpus: Java's canonical curriculum (Effective Java 3e, JCiP, JLS/JVMS, JEP index JDK17-27, Google Java Style Guide, Oracle Secure Coding Guidelines, JDK javadoc/deprecation policy, Java Module System, dev.java, inside.java)
agent: canonical-java scout (jvm-topic-map wave)
model: sonnet
date_researched: 2026-09-05
sources_count: 26
scope: >
  Covers language- and platform-level guidance for Java as written and specified in
  2026 — the books-and-specs curriculum, not this repo's exemplar corpus (a sibling
  scout audits real repos) and not Kotlin, Gradle, Maven, Ant, or Bazel (sibling
  scouts and the sibling Bazel program own those). Concurrency, generics, records/
  sealed/pattern-matching, API design, secure coding, deprecation policy, module
  system, and javadoc conventions are in scope; JVM internals below the class-file
  format and GC tuning are out of scope except where a JEP changes an authoring
  concern (AOT, compact headers).
---

## Table of contents

1. [Summary](#summary)
2. [Survey](#survey)
3. [Candidate topics](#candidate-topics)
4. [Recent shifts seen in this corpus](#recent-shifts-seen-in-this-corpus)
5. [Contested](#contested)
6. [Sources](#sources)

## Summary

- Structured concurrency is **still not finalized** as of JDK 27 (September 2026) —
  it shipped its **seventh preview** (JEP 533) and the API keeps changing shape
  between previews (a third type parameter added, `awaitAll()` removed,
  `onTimeout()` renamed to `timeout()`); any rule built on it must say "preview,
  API unstable" rather than "the modern way to fan out."
- Virtual threads (JEP 444, finalized JDK 21) explicitly state "a new virtual
  thread should be created for every application task" and that they "should
  never be pooled" — this directly contradicts Effective Java Item 80 ("prefer
  executors, tasks, and streams to threads") as written for platform threads.
- Virtual threads still pin the carrier thread inside `synchronized` blocks and
  native calls; JEP 491 (JDK 24, "Synchronize Virtual Threads without Pinning")
  narrowed but did not eliminate this — `synchronized` in a hot virtual-thread
  path is a real, current gotcha, and `ReentrantLock` is JEP 444's stated fix.
- Scoped Values (JEP 506, finalized JDK 25) are the JDK's own replacement for
  `ThreadLocal` in virtual-thread code: bound once, automatically cleared at
  scope exit, and inherited by structured-concurrency subtasks — Effective Java
  (2018) and JCiP (2006) predate this and still teach `ThreadLocal` patterns
  that are now the thing being replaced.
- The Security Manager is fully gone: deprecated JEP 411 (JDK 17), disallowed
  dynamic agent loading JEP 451 (JDK 21), and **permanently disabled** by JEP
  486 (JDK 24). Oracle's own Secure Coding Guidelines' entire "9 Access
  Control" section (`AccessController.doPrivileged`, permission checks) is now
  guidance for a mechanism the runtime no longer has.
- Finalizers are deprecated for removal (JEP 421, JDK 18); `sun.misc.Unsafe`'s
  memory-access methods are deprecated for removal (JEP 471, JDK 23) and now
  **warn on every use** (JEP 498, JDK 24). Effective Java Item 8 ("avoid
  finalizers and cleaners") and any code still calling `Unsafe` for memory
  tricks are both now flagged by the JDK itself, not just by style guides.
- Sealed classes (JEP 409) + records + pattern matching for switch (JEP 441,
  both finalized JDK 21) + record patterns (JEP 440, JDK 21) together let the
  compiler prove exhaustiveness over a closed hierarchy — this is a genuinely
  new capability Effective Java 3e (2018) could not have discussed, and Brian
  Goetz's "Data-Oriented Programming in Java" write-ups treat it as **the**
  modern alternative to Item 23's "prefer class hierarchies to tagged classes."
- Data-Oriented Programming's four stated principles (v1.1, 2024): "model data
  immutably and transparently," "model the data, the whole data, and nothing
  but the data," "make illegal states unrepresentable," "separate operations
  from data" — the fourth principle *replaced* the original 2022 version's
  "validate at the boundary," a within-corpus revision worth flagging.
- `case null` in switch (JEP 441) is a deliberate opt-in: without it, `switch`
  on a pattern still throws `NullPointerException` on a null subject exactly
  as before — "preserves backward compatibility."
- Module Import Declarations (JEP 511, finalized JDK 25) let `import module
  java.base;` replace a wall of package imports; single-type imports always
  shadow module imports, so this is safe to introduce incrementally without
  ambiguity, per the JEP's own shadowing-hierarchy rule.
- Flexible Constructor Bodies (JEP 513, finalized JDK 25) allow statements
  *before* `super()`/`this()` for the first time in Java's history, but code
  in that "early construction context" **must not** reference `this` or
  `super` members — only assignment to the subclass's own not-yet-initialized
  fields is permitted.
- The Foreign Function & Memory API (finalized JDK 22, JEP 454) marks
  `Linker.downcallHandle()` and friends as **restricted methods** — callers
  need `--enable-native-access` and are on the hook for both "spatial safety"
  (bounds) and "temporal safety" (use-after-free via a closed `Arena`); the
  JDK's own javadoc states the normal Java Memory Model guarantees "do not
  apply" to native segments.
- JEP 400 (UTF-8 by Default, JDK 18) changed `Charset.defaultCharset()`'s
  fallback everywhere except a few APIs that still key off `file.encoding` —
  code written before JDK 18 that relied on the platform default charset is a
  latent bug class the corpus explicitly calls out.
- Stream Gatherers (JEP 485, finalized JDK 24) give the Stream API a fourth
  extension point (`Gatherer`: initializer/integrator/combiner/finisher)
  specifically because "the fixed set of intermediate operations means some
  complex tasks cannot easily be expressed" — windowing and stateful filters
  no longer require a hand-rolled `Collector` misused as an intermediate step.
- JEP 467 (Markdown Documentation Comments, JDK 23) lets Javadoc comments be
  written in Markdown instead of only HTML/Javadoc tags — this supersedes any
  style guidance that treats HTML-in-comments as the only option.
- The Google Java Style Guide is a live, numbered document (through §7 in the
  current fetch) that states hard, checkable rules: 100-column limit (§4.4),
  2-space block indent (§4.2), no wildcard imports and no module imports as
  wildcards (§3.3.1, §3.3.1.1), `@Override` "always used" (§6.1), caught
  exceptions "not ignored" (§6.2).
- JEP 277's Enhanced Deprecation established `@Deprecated(forRemoval=…,
  since=…)`; its own guidance is that `forRemoval=true` should apply "only
  when there is a clear and definite plan for removing that API in the next
  release" and that the annotation and the `@deprecated` Javadoc tag "should
  both be present or both be absent."
- Primitive Types in Patterns (JEP 455→now a fifth preview, JEP 532, JDK 27)
  is *still not finalized* after five previews — a second concurrent example,
  alongside structured concurrency, of a headline JEP that has not stabilized
  through the entire 17–27 window this scout was asked to cover.
- Project Leyden's AOT work shipped incrementally and is already load-bearing:
  AOT Class Loading & Linking (JEP 483, JDK 24), AOT Command-Line Ergonomics
  and AOT Method Profiling (JEP 514/515, JDK 25), AOT Object Caching (JEP 516,
  JDK 26) — an AOT cache is a build artifact with its own versioning and
  reproducibility concerns that did not exist before JDK 24.
- JSpecify reached 1.0 in 2024 with a stated "never make backwards-incompatible
  changes" guarantee on `@Nullable`/`@NonNull`/`@NullMarked`/`@NullUnmarked` —
  this is the annotation set an SDK's nullness contract should target, not a
  vendor-specific one, per the corpus's own stated tool consensus.

## Survey

### 1. Effective Java, 3rd Edition (Joshua Bloch, 2018) — full item list

Fetched a faithful public transcription of the book's chapter and item
structure: [gist.github.com/jkmcl — All Items from Effective Java, 3rd
Edition](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9)
(chosen because the O'Reilly/Oracle contents page returns a paywalled preview;
this transcription reproduces the book's own chapter titles and Item numbers
1–90 verbatim, cross-checked against the well-known chapter list). 90 items in
11 chapters: Creating and Destroying Objects (1–9), Methods Common to All
Objects (10–14), Classes and Interfaces (15–25), Generics (26–33), Enums and
Annotations (34–41), Lambdas and Streams (42–48), Methods (49–56), General
Programming (57–68), Exceptions (69–77), Concurrency (78–84), Serialization
(85–90). Every item is a candidate topic; the book targets Java 9 (published
2018) and predates records, sealed classes, pattern matching, virtual threads,
and structured concurrency entirely — several items (8, 23, 78, 80, 81) have
JDK-level successors described below.

### 2. Java Concurrency in Practice (Goetz et al., 2006) — chapter list

[jcip.net/contents.html](https://jcip.net/contents.html), the book's own
site. Four parts, sixteen chapters: Fundamentals (Thread Safety, Sharing
Objects, Composing Objects, Building Blocks), Structuring Concurrent
Applications (Task Execution, Cancellation and Shutdown, Applying Thread
Pools, GUI Applications), Liveness/Performance/Testing (Avoiding Liveness
Hazards, Performance and Scalability, Testing Concurrent Programs), Advanced
Topics (Explicit Locks, Building Custom Synchronizers, Atomic Variables and
Nonblocking Synchronization, The Java Memory Model), plus Appendix A
(Annotations for Concurrency). Written for Java 5's `java.util.concurrent`;
every thread-pool and `ThreadLocal` recommendation needs a 2026 gloss for
virtual threads, scoped values, and structured concurrency (all below).

### 3. JEP Index, filtered to JDK 17–27

[openjdk.org/jeps/0](https://openjdk.org/jeps/0), fetched and parsed
programmatically (its "Delivered Feature and Infrastructure JEPs" and
"In-flight JEPs" tables carry an explicit `Release: N` per row). Full
extraction by release, 17 through 27 (see raw list in this scout's working
notes; headline items only here — record numbers because the frame names them
by number):

- **17** (14 JEPs): 409 Sealed Classes, 411 Deprecate Security Manager for
  Removal, 406 Pattern Matching for switch (Preview), 412 FFM (Incubator).
- **18** (9): 400 UTF-8 by Default, 421 Deprecate Finalization for Removal,
  413 Code Snippets in Javadoc.
- **19** (7): 425 Virtual Threads (Preview), 428 Structured Concurrency
  (Incubator), 405 Record Patterns (Preview), 424 FFM (Preview).
- **20** (7): 429 Scoped Values (Incubator), 436 Virtual Threads (2nd
  Preview), 437 Structured Concurrency (2nd Incubator).
- **21 LTS** (15): 444 Virtual Threads (final), 441 Pattern Matching for
  switch (final), 440 Record Patterns (final), 446 Scoped Values (Preview),
  453 Structured Concurrency (Preview), 431 Sequenced Collections, 445
  Unnamed Classes and Instance Main Methods (Preview), 430 String Templates
  (Preview, later withdrawn — not in JDK 25+).
- **22** (12): 454 FFM (final), 456 Unnamed Variables & Patterns (final), 461
  Stream Gatherers (Preview), 457 Class-File API (Preview), 447 Statements
  before super(...) (Preview — precursor to JEP 513).
- **23** (12): 471 Deprecate Unsafe Memory-Access Methods for Removal, 476
  Module Import Declarations (Preview), 467 Markdown Documentation Comments,
  455 Primitive Types in Patterns/instanceof/switch (Preview), 466 Class-File
  API (2nd Preview).
- **24** (24, the largest single release in this window): 483 AOT Class
  Loading & Linking, 486 Permanently Disable the Security Manager, 484
  Class-File API (final), 485 Stream Gatherers (final), 493 Linking Run-Time
  Images without JMODs, 491 Synchronize Virtual Threads without Pinning, 498
  Warn upon Use of Unsafe Memory-Access Methods, 472 Prepare to Restrict the
  Use of JNI, 450 Compact Object Headers (Experimental).
- **25 LTS** (18): 506 Scoped Values (final), 511 Module Import Declarations
  (final), 513 Flexible Constructor Bodies (final), 512 Compact Source Files
  and Instance Main Methods (final), 505 Structured Concurrency (5th
  Preview), 507 Primitive Types in Patterns (3rd Preview), 514/515 AOT
  Command-Line Ergonomics / Method Profiling, 519 Compact Object Headers
  (final), 502 Stable Values (Preview).
- **26** (10): 525 Structured Concurrency (6th Preview), 530 Primitive Types
  in Patterns (4th Preview), 516 AOT Object Caching with Any GC, 526 Lazy
  Constants (2nd Preview, successor name for Stable Values), 500 Prepare to
  Make Final Mean Final, 504 Remove the Applet API, 517 HTTP/3 for the HTTP
  Client API.
- **27** (9, GA'd this week per the frame's era): 533 Structured Concurrency
  (7th Preview), 532 Primitive Types in Patterns (5th Preview), 534 Compact
  Object Headers by Default, 531 Lazy Constants (3rd Preview), 523 Make G1
  the Default GC in All Environments.

This directly confirms the frame's era hypothesis (JDK 25 LTS, 26 and 27
non-LTS, 27 GA September 2026) and surfaces the two JEPs — Structured
Concurrency and Primitive Types in Patterns — that are still previewing after
five-to-seven iterations, which the frame's hypothesis did not flag as
unstable.

### 4. Individual JEP deep-reads

Fetched directly, one page each (URLs are the section headers below):

- [JEP 444 — Virtual Threads](https://openjdk.org/jeps/444): "a new virtual
  thread should be created for every application task" and "should never be
  pooled"; pinning happens inside `synchronized` blocks/methods and native
  calls; `ReentrantLock` is the stated fix for I/O-adjacent hot paths.
- [JEP 533 — Structured Concurrency (7th Preview)](https://openjdk.org/jeps/533):
  `StructuredTaskScope`/`Joiner` gained a third type parameter `R_X` for the
  exception type in JDK 27; `awaitAll()` was removed; `onTimeout()` became
  `timeout()`, throwing `CancelledByTimeoutException`. Seven previews in nine
  releases (19→27) with breaking signature changes nearly every time.
- [JEP 506 — Scoped Values](https://openjdk.org/jeps/506): "written once, and
  is available only for a bounded period"; no `set` method exists; automatic
  restore on nested `where(...).run(...)` exit; `StructuredTaskScope` subtasks
  inherit bindings "with minimal overhead."
- [JEP 485 — Stream Gatherers](https://openjdk.org/jeps/485): four-function
  `Gatherer` shape (initializer/integrator/combiner/finisher), built-ins
  `windowFixed(n)`/`windowSliding(n)`, parallel-safe via the combiner.
- [JEP 511 — Module Import Declarations](https://openjdk.org/jeps/511):
  `import module java.base;`; three-tier shadowing (single-type > on-demand >
  module import) resolves ambiguity automatically.
- [JEP 513 — Flexible Constructor Bodies](https://openjdk.org/jeps/513):
  grammar now allows `BlockStatements` before the explicit constructor
  invocation; that "early construction context" forbids `this`/`super`
  member access, permits only same-class field assignment, forbids `return`
  with a value.
- [JEP 409 — Sealed Classes](https://openjdk.org/jeps/409): `permits` clause
  requires same module (or same package in the unnamed module); every
  permitted subclass must be `final`, `sealed`, or `non-sealed`.
- [JEP 441 — Pattern Matching for switch](https://openjdk.org/jeps/441):
  compiler proves exhaustiveness via a sealed hierarchy's `permits` clause or
  synthesizes a throwing default for enums; `case null` is opt-in, otherwise
  NPE as before; dominance order is constants, then guarded patterns, then
  unguarded patterns.
- [JEP 277 — Enhanced Deprecation](https://openjdk.org/jeps/277):
  `forRemoval`/`since` elements; `forRemoval=true` "only when there is a
  clear and definite plan"; annotation and Javadoc `@deprecated` tag "should
  both be present or both be absent."
- [Project Leyden](https://openjdk.org/projects/leyden/): "primary goal…is to
  improve the startup time, time to peak performance, and footprint"; ships
  incrementally as JEP 483/514/515/516, moving work from run time to a
  build-time "training run" whose output ("condensed" artifacts / AOT cache)
  is a new build artifact class.

### 5. Java Language Specification & JVM Specification, SE 25

[JLS SE 25](https://docs.oracle.com/javase/specs/jls/se25/html/index.html):
19 chapters (Introduction, Grammars, Lexical Structure, Types/Values/
Variables, Conversions and Contexts, Names, Packages and Modules, Classes,
Interfaces, Arrays, Exceptions, Execution, **Binary Compatibility**, Blocks/
Statements/Patterns, Expressions, Definite Assignment, **Threads and
Locks**, Type Inference, Syntax) plus Appendix A. [JVMS SE
25](https://docs.oracle.com/javase/specs/jvms/se25/html/index.html): 7
chapters (Introduction, The Structure of the JVM, Compiling for the JVM, The
`class` File Format, Loading/Linking/Initializing, The Instruction Set,
Opcode Mnemonics) plus Appendix A. Chapter 13 (Binary Compatibility) and
Chapter 17 (Threads and Locks, the normative Java Memory Model) are the two
chapters an SDK-authoring rule set most directly needs; Chapter 4 (class file
format) is what the Class-File API (JEP 484) now lets you manipulate without
bytecode libraries.

### 6. Google Java Style Guide

[google.github.io/styleguide/javaguide.html](https://google.github.io/styleguide/javaguide.html),
fetched in full; numbered §1–§7 as of this fetch (§7 Javadoc is the last
section reached). Hard, quotable rules: §3.3.1 "No wildcard imports" (and
§3.3.1.1 "No module imports" as a wildcard-equivalent, reflecting JEP 511's
arrival), §4.2 "Block indentation: +2 spaces", §4.4 "Column limit: 100", §4.8.4.3
"Exhaustiveness and presence of the default label" for switch, §5 naming
rules by identifier kind including §5.2.9 "Unnamed variables" (reflecting JEP
456), §6.1 "`@Override`: always used", §6.2 "Caught exceptions: not ignored",
§6.4 "Finalizers: not used" (reflecting JEP 421's deprecation), §7 Javadoc
formatting and "where Javadoc is used."

### 7. Oracle Secure Coding Guidelines for Java SE

Fetched via `curl` with a browser user-agent after WebFetch was blocked with
HTTP 403: [oracle.com/java/technologies/javase/seccodeguide.html](https://www.oracle.com/java/technologies/javase/seccodeguide.html).
Ten numbered sections, 0 through 9 (Fundamentals; Denial of Service;
Confidential Information; Injection and Inclusion; Accessibility and
Extensibility; Input Validation; Mutability; Object Construction;
Serialization and Deserialization; Access Control), each with lettered
guideline codes (e.g. `FUNDAMENTALS-0` "Prefer to have obviously no flaws
rather than no obvious flaws," `MUTABLE-1` "Prefer immutability for value
types," `OBJECT-3` "Defend against partially initialized instances of
non-final classes," `SERIAL-6` "Filter untrusted serial data"). Section 9
(Access Control, guidelines `ACCESS-1` through `ACCESS-20`) is built entirely
on `AccessController`/`doPrivileged`/`SecurityManager` — a mechanism JEP 486
removed in JDK 24; every other section still applies. Cross-referenced with
[SEI CERT Oracle Coding Standard for Java](https://cmu-sei.github.io/secure-coding-standards/sei-cert-oracle-coding-standard-for-java/),
which organizes the same territory into 20 rule-category prefixes (IDS, DCL,
EXP, NUM, STR, OBJ, MET, ERR, VNA, LCK, THI, TPS, TSM, FIO, SER, SEC, ENV,
JNI, MSC, DRD) — VNA (Visibility and Atomicity), LCK (Locking), THI (Thread
APIs) and TPS (Thread Pools) are the categories most in need of a
virtual-thread-era gloss.

### 8. `java.lang.foreign` package javadoc (FFM API)

[docs.oracle.com …
java.lang.foreign](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/foreign/package-summary.html):
`Arena` controls native-memory lifetime, `MemorySegment` is the bounds-checked
handle, `Linker`/`SymbolLookup`/`FunctionDescriptor` bind foreign functions.
States "usual memory model guarantees (see 17.4) do not apply when accessing
native memory segments" and marks `downcallHandle()` **[RESTRICTED]** —
callers need `--enable-native-access` at the JVM level (JEP 472's
enforcement point). Two safety properties are named explicitly: spatial
safety (bounds) and temporal safety (no use-after-close on an `Arena`).

### 9. `StructuredTaskScope` javadoc

[docs.oracle.com …
StructuredTaskScope](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html):
"may only be invoked by the owner thread" for `fork`/`join`/`close`; `join()`
"may only be invoked once"; `fork()` "may not be called after join()"; a
subtask that ignores interruption "will delay [scope] closure indefinitely"
— structured concurrency's safety net depends on cooperative cancellation,
not automatic preemption.

### 10. Java Module System — quick start and Nicolai Parlog's book

[openjdk.org/projects/jigsaw/quick-start](https://openjdk.org/projects/jigsaw/quick-start):
canonical `javac --module-path`/`java --module`/`jlink --add-modules`
invocations and the `module-info.java` directive set (`exports`, `requires`,
`uses`, `provides…with`). *The Java Module System* (Parlog, Manning) — TOC
gathered via publisher/retailer listings, not a full fetch of paywalled
content — is organized in three parts: Hello Modules (mechanics), Adapting
Real-World Projects (migration, split packages, automatic modules), Advanced
Features (services, `jlink`, module versions "what's possible and what's
not"). The book targets Java 11; Module Import Declarations (JEP 511, JDK 25)
postdate it entirely and change the day-to-day "wall of imports" complaint
the book spends a full migration chapter on.

### 11. dev.java — Learn Java tracks and Java Platform Evolution

[dev.java/learn/](https://dev.java/learn/): seven tracks — Running Your
First Java Application; Staying Aware of New Features (explicitly including
"Using the Preview Features Available in the JDK" as its own page); Getting
to Know the Language; Mastering the API (Collections, Streams, NIO.2, Date
Time, regex, reflection/method handles, security, **virtual threads**, FFM);
Organizing Your Application (modules, jlink); Getting to Know the JVM (CDS,
JFR, GC); Rich Client Applications (JavaFX). [dev.java/evolution/](https://dev.java/evolution/):
states the 6-month cadence began in 2017 (March/September releases,
replacing a 2–3 year feature-driven cadence) and frames the preview-feature
process (JEP 12) as the mechanism that let records, pattern matching, and
virtual threads "iterate in public across multiple releases" before landing.

### 12. Data-Oriented Programming (Brian Goetz / inside.java)

[inside.java/2024/05/23/dop-v1-1-introduction](https://inside.java/2024/05/23/dop-v1-1-introduction/),
version 1.1 of the write-up. Four principles, quoted: "Model data immutably
and transparently," "Model the data, the whole data, and nothing but the
data," "Make illegal states unrepresentable," "Separate operations from
data" — the fourth replaces the original 2022 article's "Validate at the
boundary," itself a within-corpus revision. Records for product types, sealed
interfaces for sum types, and pattern matching (JEP 440/441) for consuming
them are named as the concrete Java mechanism; this directly updates Effective
Java Item 23 ("prefer class hierarchies to tagged classes," 2018, predates
sealed types) and complicates Item 15/17 (minimize accessibility/mutability)
by deliberately exposing all state through record accessors.

### 13. JSpecify 1.0

[jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/):
`@Nullable`/`@NonNull`/`@NullMarked`/`@NullUnmarked` reached 1.0 in 2024 with
an explicit "we will never make backwards-incompatible changes to them"
guarantee; adoption is gated on "how ready your nullness analyzer is" and
whether Kotlin interop matters — directly relevant to an SDK's public-API
nullness contract, since JSpecify (not a vendor-specific `@Nullable`) is the
annotation set the ecosystem (Error Prone/NullAway, Guava, Spring, Kotlin)
is converging on.

### 14. Java Tutorials — Concurrency trail

[docs.oracle.com/javase/tutorial/essential/concurrency](https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html):
31 pages from "Processes and Threads" through "Questions and Exercises,"
covering intrinsic locks, memory consistency errors, immutable-object
strategy, executors/thread pools/fork-join, and concurrent collections —
this is the pre-virtual-thread, pre-structured-concurrency baseline that
2026 guidance must explicitly extend rather than replace (thread pools and
`ExecutorService` remain correct for platform-thread-bound / CPU-bound work;
virtual threads target I/O-bound task-per-request work).

## Candidate topics

| Topic (question) | Why it matters | Source | Covered? | Surface | Priority |
|---|---|---|---|---|---|
| Does every value class override `equals`/`hashCode`/`toString` together, or does a record replace it entirely? | Effective Java Items 10–14 vs. records; a mismatched override is a silent correctness/collection bug | [gist: Effective Java items](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P0 — mechanical, verifiable (records eliminate the whole class of bug) |
| Is a closed set of alternatives modeled as a tagged class/enum-with-switch, or as `sealed` + records + exhaustive pattern-matching switch? | JEP 409/440/441 + DOP articles directly supersede Item 23's guidance | [JEP 409](https://openjdk.org/jeps/409), [DOP v1.1](https://inside.java/2024/05/23/dop-v1-1-introduction/) | no | java, sdk | P0 — the single biggest 2018→2026 language shift in the corpus |
| Does resource cleanup use try-with-resources, or a finalizer/cleaner? | Item 8/9; JEP 421 deprecated finalization for removal (JDK 18) | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9), [Google style §6.4](https://google.github.io/styleguide/javaguide.html) | no | java, sdk | P0 — `javac -Xlint` and JEP 421 both flag this; cheap to detect |
| Is a fan-out over I/O written against `StructuredTaskScope`, and if so does the rule warn it is a 7th-preview API that changed shape in the last three releases? | JEP 533; API churn (type param added, methods renamed/removed) | [JEP 533](https://openjdk.org/jeps/533) | no | java, sdk | P0 — shipping production code against an unstable preview API is a real risk this program must not paper over |
| Are virtual threads pooled, or created one-per-task as JEP 444 requires? | "should never be pooled"; contradicts Item 80's platform-thread advice | [JEP 444](https://openjdk.org/jeps/444) | no | java, sdk | P0 — a common anti-pattern when developers port thread-pool habits forward |
| Does a virtual-thread hot path hold a `synchronized` block/native call across a blocking operation (pinning), and is `ReentrantLock` used instead? | JEP 444 pinning caveat, narrowed but not fixed by JEP 491 (JDK 24) | [JEP 444](https://openjdk.org/jeps/444) | no | java | P0 — silent throughput cliff, detectable via `-Djdk.tracePinnedThreads` |
| Is cross-task context passed via `ThreadLocal`, or via `ScopedValue` for virtual-thread/structured-concurrency code? | JEP 506 explicitly fixes ThreadLocal's "unconstrained mutability" and "unbounded lifetime" | [JEP 506](https://openjdk.org/jeps/506) | no | java, sdk | P0 — new-code default the corpus states plainly |
| Does the codebase assume a platform default charset anywhere, or is every `Charset`-sensitive call explicit? | JEP 400 changed the default to UTF-8 (JDK 18); pre-18 code relying on the old platform default is now silently different | [JEP index](https://openjdk.org/jeps/0) | no | java, sdk | P0 — "boring but bites," reproducibility-class bug |
| Does a public API's `@Deprecated` element also carry `forRemoval` and `since`, and is a Javadoc `@deprecated` tag present whenever the annotation is? | JEP 277's explicit rule: "should both be present or both be absent" | [JEP 277](https://openjdk.org/jeps/277) | no | java, sdk | P0 — directly checkable, load-bearing for SDK evolution |
| Does an SDK's public API use JSpecify's `@Nullable`/`@NonNull`/`@NullMarked`, or a vendor-specific nullness annotation? | JSpecify 1.0's stability guarantee and stated tool consensus (Error Prone/NullAway/Kotlin/Guava/Spring) | [JSpecify 1.0 release](https://jspecify.dev/blog/release-1.0.0/) | no | java, sdk | P0 — the OCX SDK's public nullness contract is a day-one design decision |
| Does a data-carrying type expose mutable collections or arrays through its accessors? | Oracle Secure Coding `MUTABLE-2`/`MUTABLE-3`/`MUTABLE-12`; Effective Java Item 50 | [seccodeguide.html](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | no | java, sdk | P0 — classic defensive-copy bug, still current |
| Is a class designed to be extended (documented, non-final, no calls to overridable methods from constructors), or is it sealed/final by default? | Item 19; `OBJECT-4`; JEP 409 sealed classes as the modern alternative | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9), [seccodeguide](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | no | java, sdk | P0 — SDK extensibility-seam decision with binary-compatibility consequences |
| Does deserialization of untrusted data use an `ObjectInputFilter`, or is `Serializable` implemented without one? | `SERIAL-6` "Filter untrusted serial data"; Item 85 "prefer alternatives to Java serialization" | [seccodeguide](https://www.oracle.com/java/technologies/javase/seccodeguide.html), [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P1 — high-severity but narrower blast radius than the P0s above |
| Does constructor validation happen before or after `super()`, and if before, does it avoid touching `this`/`super` members? | JEP 513 Flexible Constructor Bodies' "early construction context" restrictions | [JEP 513](https://openjdk.org/jeps/513) | no | java | P1 — new capability (JDK 25), easy to misuse the prologue |
| Does a build target `--release N` consistently, or mix `-source`/`-target` with a newer bootclasspath, risking a binary that references APIs unavailable at the stated baseline? | JLS Ch.13 Binary Compatibility; SDK cross-version consumption | [JLS SE25 ch.13](https://docs.oracle.com/javase/specs/jls/se25/html/index.html) | no | java, gradle, maven, sdk | P0 — silent `NoSuchMethodError` at a consumer's runtime |
| Does a public method's Javadoc document every checked exception, `@param`, and `@return`, and does it use Markdown (JEP 467) or HTML consistently? | Item 56 "write doc comments for all exposed API elements"; JEP 467 (JDK 23) added a second valid comment syntax | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9), [JEP index](https://openjdk.org/jeps/0) | no | java, sdk | P1 — docs-quality overlap is real but the Javadoc-tag mechanics are Java-specific, not covered by the sibling `docs-quality` set |
| Are wildcard imports used, and does a module-import declaration (`import module X;`) risk shadowing ambiguity? | Google style §3.3.1/§3.3.1.1; JEP 511's shadowing-hierarchy rule | [Google style guide](https://google.github.io/styleguide/javaguide.html), [JEP 511](https://openjdk.org/jeps/511) | no | java | P2 — mechanical, lint-detectable |
| Is `@Override` used on every overriding/implementing method, and are caught exceptions ever silently swallowed? | Google style §6.1/§6.2 | [Google style guide](https://google.github.io/styleguide/javaguide.html) | no | java | P1 — cheap static check, high false-negative cost when skipped |
| Does a switch over a sealed hierarchy or enum have an unreachable/redundant `default`, and is `case null` handled deliberately where the subject can be null? | JEP 441 exhaustiveness + null-handling rules | [JEP 441](https://openjdk.org/jeps/441) | no | java | P0 — compiler-enforced exhaustiveness is a genuinely new safety net worth a rule of its own |
| Does code call a `sun.misc.Unsafe` memory-access method, or a `--add-opens`/JNI escape hatch that JEP 471/498/472 are actively deprecating and warning on? | JEP 471 (deprecate for removal, JDK23), JEP 498 (warn, JDK24), JEP 472 (restrict JNI, JDK24) | [JEP index](https://openjdk.org/jeps/0) | no | java, sdk | P1 — forward-compatibility risk for libraries with native/reflective tricks |
| Does native/foreign-memory code declare `--enable-native-access`, and does every `Arena` close before its `MemorySegment`s go out of scope? | java.lang.foreign package javadoc's spatial/temporal safety statement; JEP 472's enforcement | [java.lang.foreign](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/foreign/package-summary.html) | no | java, sdk | P1 — narrow surface (FFM users) but a use-after-free-class bug when missed |
| Does a `StructuredTaskScope` subtask ignore interruption, risking `close()` blocking indefinitely? | StructuredTaskScope javadoc's explicit cooperative-cancellation requirement | [StructuredTaskScope javadoc](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html) | no | java | P1 — cancellation/idempotency-class bug named in the frame's own "boring but bites" list |
| Is a module's public package graph minimized (`exports` only what's needed), or does everything leak through an open module? | Module quick-start `exports`/`requires`; Secure Coding `EXTEND-2` "use modules to hide internal packages" | [Module quick-start](https://openjdk.org/projects/jigsaw/quick-start), [seccodeguide](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | no | java, sdk | P0 — SDK API-surface control, directly gradable |
| Does a JAR ship a correct `Automatic-Module-Name` for non-modularized consumers, and does it avoid split packages with other JARs on the module path? | Parlog's Java Module System book, Part 2 "Adapting Real-World Projects" | book TOC (publisher listing) | no | java, sdk, gradle | P1 — classic JPMS-migration failure mode |
| Does an AOT cache / training-run artifact get regenerated deterministically, or does it silently go stale against the classes it profiled? | Project Leyden JEP 483/514/515/516 introduce a new build-artifact class | [Project Leyden](https://openjdk.org/projects/leyden/) | no | java, sdk, gradle | P2 — emerging (JDK 24–26), narrow adoption so far but a new reproducibility surface |
| Does a hot stream pipeline reach for a hand-rolled `Collector` misused mid-pipeline, where a `Gatherer` (windowing, stateful filter) now fits the intermediate-operation shape directly? | JEP 485 Stream Gatherers, finalized JDK 24 | [JEP 485](https://openjdk.org/jeps/485) | no | java | P2 — quality/idiom topic, not a correctness gate |
| Does a subclass's field-validation-before-`super()` pattern predate JEP 513 and use an ugly static-helper workaround that flexible constructor bodies now make unnecessary? | JEP 513, JDK 25 | [JEP 513](https://openjdk.org/jeps/513) | no | java | P2 — idiom modernization, low failure severity |
| Does any code path still assume `SecurityManager`/`AccessController` is present (permission checks, `doPrivileged`)? | JEP 411→451→486 fully removed it by JDK 24 | [JEP index](https://openjdk.org/jeps/0) | no | java, sdk | P1 — dead-code / broken-assumption detector, cheap once known |
| Is `Optional` used as a field type or method parameter (both discouraged), and is it never used as a container for non-nullable success values? | Effective Java Item 55 "return optionals judiciously" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P1 — common API-design misuse, static-analysis detectable |
| Does a public method return `null` for "no result," or an empty `Collection`/`Optional`? | Item 54 "return empty collections or arrays, not nulls" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P0 — classic NPE source, trivially lintable |
| Does an equals/hashCode/compareTo implementation stay consistent under a future field addition, or silently break the general contract? | Items 10, 14; JLS binary-compatibility concerns for `Comparable` | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P1 |
| Does an SDK's public method-signature change (adding an overload, widening a parameter type) risk breaking binary compatibility for existing compiled callers? | JLS Ch.13 Binary Compatibility | [JLS SE25](https://docs.oracle.com/javase/specs/jls/se25/html/index.html) | no | java, sdk | P0 — the exact concern the frame names for japicmp/revapi gates |
| Does concurrent mutable state get documented for thread-safety (`@GuardedBy`, `@Immutable`, `@ThreadSafe`), per JCiP's own annotation appendix? | JCiP Appendix A "Annotations for Concurrency"; Item 82 "document thread safety" | [jcip.net contents](https://jcip.net/contents.html), [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P1 |
| Is a CPU-bound parallel workload run on a `ForkJoinPool`/parallel stream, while an I/O-bound one uses virtual threads — or are the two conflated? | JCiP ch.5/8 (thread pools) vs. JEP 444 (virtual threads); dev.java Mastering-the-API track lists both | [jcip.net](https://jcip.net/contents.html), [JEP 444](https://openjdk.org/jeps/444) | no | java, sdk | P1 — a genuine 2026 decision point the corpus does not fully resolve (see Contested) |
| Does code rely on the iteration order of a `HashMap`/`HashSet`, breaking determinism across JVM versions or runs? | "boring but bites" — ordering determinism named in the brief; not a named JEP but a corpus-adjacent concern from Effective Java's collections guidance | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java | P1 — reproducibility-class bug |
| Does a public record accessor expose a mutable field verbatim, defeating records' apparent immutability? | DOP's "model data immutably and transparently" vs. a record wrapping a mutable array/collection field | [DOP v1.1](https://inside.java/2024/05/23/dop-v1-1-introduction/) | no | java, sdk | P0 — the most common "I used a record but it isn't actually immutable" bug |
| Is a varargs method combined with generics safely (`@SafeVarargs` where warranted), avoiding heap pollution? | Item 32 "combine generics and varargs judiciously" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P2 |
| Does a public API method use overloading in a way that is ambiguous or surprising at call sites, rather than differently-named methods? | Item 52 "use overloading judiciously" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P2 |
| Does exception handling distinguish recoverable conditions (checked) from programming errors (unchecked), and are exceptions never used for ordinary control flow? | Items 69, 70 | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java | P1 |
| Does a caught exception's original cause get preserved (chained), or silently dropped/replaced? | Item 75 "include failure-capture information"; SEI CERT `ERR` category | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9), [SEI CERT](https://cmu-sei.github.io/secure-coding-standards/sei-cert-oracle-coding-standard-for-java/) | no | java | P1 |
| Does a library shade/relocate a dependency that leaks through its public API types, breaking callers who also depend on the unshaded original? | Secure Coding `EXTEND-1`/`EXTEND-4` accessibility limits; frame's fat-jar/shading topic | [seccodeguide](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | partial — this is really a Gradle/build-system topic; the java-canon corpus only supplies the API-surface angle | gradle, sdk | P1 (routes to `gradle-build`, not this file) |
| Does a public class's Javadoc use the "code snippets" mechanism (JEP 413, JDK 18) for compiled/verified example code, or copy-pasted (and driftable) examples? | JEP 413 | [JEP index](https://openjdk.org/jeps/0) | no | java, sdk | P2 — overlaps the sibling `docs-quality` tested-example harness; Java-specific mechanism is not covered there |
| Is `Comparable`/`Comparator` used consistently with `equals` (so sorted collections and equality agree), avoiding Item 14's "consistent with equals" trap? | Item 14 | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java | P2 |
| Does a class needlessly declare a checked exception on a method that never truly fails recoverably? | Item 71 "avoid unnecessary use of checked exceptions" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java, sdk | P2 |
| Does string concatenation happen in a loop (`+=`) rather than via `StringBuilder`, and is this actually still a JIT-relevant concern in 2026? | Item 63 "beware the performance of string concatenation" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java | P3 — largely mitigated by modern `invokedynamic`-based string concat, low priority to re-litigate |
| Does code depend on thread-scheduler behavior (priorities, `Thread.yield()`) for correctness? | Item 84 "don't depend on the thread scheduler" | [gist](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | no | java | P3 |
| Does a public API's package-info or module-info document its own compatibility policy (semver, `@since`, deprecation timeline)? | JEP 277 deprecation timeline guidance + SDK-authoring frame concern | [JEP 277](https://openjdk.org/jeps/277) | no | java, sdk | P1 |

## Recent shifts seen in this corpus

- **Structured concurrency: 7 previews, 19→27, still not final.** Every
  scoping/joining API name in blog posts before 2026 may already be stale;
  JDK 27 (JEP 533) removed `awaitAll()` and renamed `onTimeout()` to
  `timeout()`. Any rule referencing this API must date-stamp itself to a
  specific preview.
- **Security Manager: deprecated (JEP 411, JDK17) → dynamic-agent-loading
  disallowed (JEP 451, JDK21) → permanently disabled (JEP 486, JDK24).**
  Oracle's Secure Coding Guidelines §9 (Access Control) and SEI CERT's `SEC`
  category describe a subsystem that no longer exists at runtime as of JDK
  24 — that guidance is now migration-history reading, not a live control.
- **Finalization: deprecated for removal (JEP 421, JDK18).** Effective Java
  Item 8 ("avoid finalizers and cleaners") is now half-obsolete: cleaners
  remain, finalizers are on their way out entirely.
- **`sun.misc.Unsafe` memory-access: deprecated for removal (JEP 471, JDK23)
  → warns on every use (JEP 498, JDK24).** Any library still calling into
  `Unsafe` for memory tricks needs a migration plan (VarHandle, FFM) that
  didn't exist as cleanly before JDK 22's FFM finalization (JEP 454).
- **`ThreadLocal` for context propagation: superseded by `ScopedValue` (JEP
  506, finalized JDK25)** for virtual-thread and structured-concurrency code
  specifically — JCiP (2006) and Effective Java (2018) both predate this and
  teach the pattern being replaced.
- **UTF-8 became the real default (JEP 400, JDK18),** not just the
  recommended one — pre-18 charset-default assumptions are now provably
  wrong on JDK 18+.
- **jlink no longer needs `jmods` on disk (JEP 493, JDK24)** — distribution
  tooling built around shipping/vendoring a full JDK's `jmods` directory can
  drop that step.
- **Javadoc gained a second syntax: Markdown (JEP 467, JDK23).** Any style
  guidance written before 2024 that treats HTML/Javadoc-tag comments as the
  only format is now only half the story.
- **Module Import Declarations (JEP 511, JDK25)** change the "wall of
  imports" complaint that motivated a chapter of Parlog's 2019 book — the
  problem the book spent a migration chapter on now has a language-level
  answer three years after publication.
- **Data-Oriented Programming's own guidance revised itself**: the 2022
  four-principle formulation's "Validate at the boundary" was replaced by
  "Separate operations from data" in the 2024 v1.1 write-up — a rule set
  citing DOP should cite v1.1, not the original.
- **JSpecify reached 1.0 in 2024**, giving the ecosystem (not just Google's
  internal tools) a stable, vendor-neutral nullness-annotation target for
  the first time.

## Contested

- **Do virtual threads make traditional thread pools obsolete?** JEP 444 is
  unambiguous for I/O-bound, task-per-request work ("never be pooled"). JCiP
  and Effective Java Item 80's executor/pool guidance still stands for
  CPU-bound work parallelized via `ForkJoinPool`/parallel streams — the
  corpus does not fully reconcile the two regimes into one rule, and 2026
  practitioner writing (per the frame's own hypothesis-testing charge) is
  actively debating where the line falls for mixed workloads.
- **Is structured concurrency worth adopting in production while still
  preview after 7 iterations, or is it churn to avoid until it finalizes?**
  The API's own upstream changelog (type-parameter additions, method
  renames/removals every 1–2 releases) argues for waiting; the framing that
  "structured concurrency matters more than virtual threads for
  correctness" (seen in secondary commentary during this survey, not an
  OpenJDK-official claim) argues for early adoption behind a preview flag.
  This scout takes no side — flag both positions in the rule.
- **Do records' transparent accessors conflict with encapsulation as
  classically taught (Item 15, "minimize accessibility")?** Goetz's DOP
  write-ups treat this as an intentional trade-off (data isn't an object,
  don't hide it); traditional OOP guidance treats exposing all state as a
  code smell. The corpus itself frames this as a deliberate paradigm choice,
  not an oversight — a rule set should state the trade-off rather than pick
  a universal winner.
- **Is `Optional` acceptable as a field type when a record's accessor
  naturally returns one?** Item 55's "judiciously" and its usual "not as a
  field" corollary predate records; whether records change the calculus
  isn't addressed by either source directly.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [openjdk.org/jeps/0](https://openjdk.org/jeps/0) | JEP Index (official, all JEPs with release/status) | Live, fetched 2026-09-05 | Primary; only authoritative per-release JEP list, gives release+status columns programmatically |
| [openjdk.org/jeps/444](https://openjdk.org/jeps/444) | JEP 444, Virtual Threads (final) | JDK 21, Sept 2023 | Primary; states the "never pool" and pinning rules verbatim |
| [openjdk.org/jeps/533](https://openjdk.org/jeps/533) | JEP 533, Structured Concurrency (7th Preview) | JDK 27, Sept 2026 | Primary; current (unstable) API shape as of this survey's date |
| [openjdk.org/jeps/506](https://openjdk.org/jeps/506) | JEP 506, Scoped Values (final) | JDK 25, Sept 2025 | Primary; the ThreadLocal-replacement rule for virtual-thread code |
| [openjdk.org/jeps/485](https://openjdk.org/jeps/485) | JEP 485, Stream Gatherers (final) | JDK 24, March 2025 | Primary; new Stream extension point |
| [openjdk.org/jeps/511](https://openjdk.org/jeps/511) | JEP 511, Module Import Declarations (final) | JDK 25, Sept 2025 | Primary; import-shadowing rule |
| [openjdk.org/jeps/513](https://openjdk.org/jeps/513) | JEP 513, Flexible Constructor Bodies (final) | JDK 25, Sept 2025 | Primary; early-construction-context restrictions |
| [openjdk.org/jeps/409](https://openjdk.org/jeps/409) | JEP 409, Sealed Classes (final) | JDK 17, Sept 2021 | Primary; `permits` clause rule, exhaustiveness enabler |
| [openjdk.org/jeps/441](https://openjdk.org/jeps/441) | JEP 441, Pattern Matching for switch (final) | JDK 21, Sept 2023 | Primary; exhaustiveness, `case null`, dominance rules |
| [openjdk.org/jeps/277](https://openjdk.org/jeps/277) | JEP 277, Enhanced Deprecation | JDK 9, 2017 | Primary; `forRemoval`/`since` deprecation-policy rules still current |
| [openjdk.org/projects/leyden](https://openjdk.org/projects/leyden/) | Project Leyden overview | Live, ongoing since JDK24 | Primary; AOT cache as a new build artifact class |
| [docs.oracle.com JLS SE25](https://docs.oracle.com/javase/specs/jls/se25/html/index.html) | Java Language Specification, SE 25 | JDK 25, 2025 | Primary spec; Binary Compatibility (ch.13) and Threads/Locks (ch.17, JMM) chapters |
| [docs.oracle.com JVMS SE25](https://docs.oracle.com/javase/specs/jvms/se25/html/index.html) | JVM Specification, SE 25 | JDK 25, 2025 | Primary spec; class-file format is what the Class-File API (JEP 484) now manipulates |
| [google.github.io/styleguide/javaguide.html](https://google.github.io/styleguide/javaguide.html) | Google Java Style Guide | Live, actively maintained | Primary; numbered, checkable formatting/naming/Javadoc rules, already reflects JEP 511/456 |
| [oracle.com secure coding guidelines](https://www.oracle.com/java/technologies/javase/seccodeguide.html) | Oracle Secure Coding Guidelines for Java SE | ~Java SE 6/7 era, still hosted live | Primary; only official Oracle secure-coding guideline numbering, though §9 is now stale post-JEP486 |
| [cmu-sei.github.io SEI CERT Oracle Java standard](https://cmu-sei.github.io/secure-coding-standards/sei-cert-oracle-coding-standard-for-java/) | SEI CERT Oracle Coding Standard for Java | Live (CMU SEI), rules updated for modern JDKs | Primary-adjacent; 20 rule-category taxonomy complements Oracle's own guideline numbers |
| [docs.oracle.com java.lang.foreign](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/foreign/package-summary.html) | FFM API package javadoc | JDK 25 | Primary; restricted-method and spatial/temporal safety statements |
| [docs.oracle.com StructuredTaskScope](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html) | StructuredTaskScope class javadoc | JDK 25 (preview) | Primary; ownership/cancellation contract |
| [openjdk.org/projects/jigsaw/quick-start](https://openjdk.org/projects/jigsaw/quick-start) | Module System Quick Start | JDK 9-era, still the canonical quick-start | Primary; module-info directive syntax and jlink invocation |
| [dev.java/learn](https://dev.java/learn/) | Dev.java "Learn Java" track index | Live, JDK-team-maintained | Primary (OpenJDK-adjacent official education site); track structure shows what the JDK team itself considers the curriculum |
| [dev.java/evolution](https://dev.java/evolution/) | Dev.java "Java Platform Evolution" | Live | Primary; states the 6-month/LTS cadence and preview-feature process in the JDK team's own words |
| [inside.java/2024/05/23/dop-v1-1-introduction](https://inside.java/2024/05/23/dop-v1-1-introduction/) | Data-Oriented Programming in Java, v1.1 | May 2024 | Primary (Java language architect's own site); the four DOP principles, quoted |
| [jspecify.dev/blog/release-1.0.0](https://jspecify.dev/blog/release-1.0.0/) | JSpecify 1.0.0 release announcement | Sept 2024 | Primary; nullness-annotation stability guarantee |
| [jcip.net/contents.html](https://jcip.net/contents.html) | Java Concurrency in Practice, official contents page | 2006 (book), page live | Secondary but publisher-authoritative TOC; baseline concurrency curriculum that virtual threads/structured concurrency extend |
| [docs.oracle.com Java Tutorials — Concurrency](https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html) | Java Tutorials, Concurrency trail | Oracle-maintained, JDK 5+ content | Primary; the 31-page baseline trail every 2026 concurrency rule must extend, not contradict |
| [gist.github.com/jkmcl Effective Java items](https://gist.github.com/jkmcl/532eb1e453eedb390fc7973a2680e2f9) | Full Item 1-90 transcription, Effective Java 3rd ed. | Book: 2018; transcription live | Secondary transcription (book itself paywalled/physical) but item numbers and titles are independently well-known and cross-checked |
