---
name: java-quality-reference
description: Depth files behind the java-quality rule, loaded on demand. Use when the java-quality rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the java-quality rule
  keywords: java,jvm,quality,standards,nullness,error-prone,concurrency,reference
  claude.user-invocable: "false"
---

# java-quality-reference

Depth for the `java-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-and-evolution.md](api-and-evolution.md) | Published signatures, return types, module exposure, binary-compatibility gate (JAVA-API) |
| [concurrency.md](concurrency.md) | Threads and virtual threads, locks, fan-out bounds, child processes (JAVA-CONC) |
| [data-and-patterns.md](data-and-patterns.md) | Records, sealed hierarchies, exhaustive switches, equals/hashCode, Optional (JAVA-DATA) |
| [errors-and-resources.md](errors-and-resources.md) | Throw, catch and log discipline, closing handles, InterruptedException, ending a process (JAVA-ERR) |
| [lint-gate.md](lint-gate.md) | Error Prone, NullAway, -Xlint, Checkstyle, SpotBugs, Spotless, suppressions (JAVA-LINT) |
| [nullness.md](nullness.md) | JSpecify annotations, @NullMarked, nulls reaching Kotlin (JAVA-NULL) |
| [platform-and-versions.md](platform-and-versions.md) | JDK floor and --release, module-info, charset and locale, removed JDK APIs (JAVA-PLAT) |
| [security-and-untrusted-input.md](security-and-untrusted-input.md) | Deserialization, XML hardening, path and command construction, randomness (JAVA-SEC) |
| [testing.md](testing.md) | JUnit floor, junit-platform.properties, parallel suites, coverage meaning (JAVA-TEST) |
