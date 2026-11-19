---
name: kotlin-quality-reference
description: Depth files behind the kotlin-quality rule, loaded on demand. Use when the kotlin-quality rule routes you to a depth file, or when a task cites a rule ID the index only summarises.
license: Apache-2.0
metadata:
  summary: Depth files behind the kotlin-quality rule
  keywords: kotlin,jvm,quality,standards,coroutines,detekt,ktlint,reference
  claude.user-invocable: "false"
---

# kotlin-quality-reference

Depth for the `kotlin-quality` rule, installed with it. The rule index says which file fits the task. Read that one file; do not read the set.

| File | Holds |
|---|---|
| [api-and-abi.md](api-and-abi.md) | Public signatures, explicit API mode, ABI dump gate, deprecation cycle (KT-API) |
| [compiler-and-toolchain.md](compiler-and-toolchain.md) | jvmToolchain and jvmTarget, -X flags, KSP versus kapt, Kotlin and Gradle version envelope (KT-COMP) |
| [coroutines.md](coroutines.md) | Launching, cancellation, dispatchers, shared state, runTest limits (KT-CORO) |
| [errors-and-resources.md](errors-and-resources.md) | Catching and wrapping failures, closing handles, leaving the process (KT-ERR) |
| [java-interop.md](java-interop.md) | Exposing Kotlin to Java, @Jvm* annotations, nullability severity flags (KT-INTEROP) |
| [lint-gate.md](lint-gate.md) | detekt, ktlint, .editorconfig, compiler warnings as errors (KT-LINT) |
| [testing.md](testing.md) | Kover coverage floors, test-framework choice, runTest versus runBlocking (KT-TEST) |
