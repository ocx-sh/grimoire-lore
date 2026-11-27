---
title: kotlinx.coroutines delta, 2026-09-12 to 2026-11-27
pair: kotlin-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 7
---

# kotlinx.coroutines delta, 2026-09-12 to 2026-11-27

## Verdict

No kotlinx.coroutines or kotlinx-coroutines-test release exists in the window. The current stable version as of 2026-11-27 is **1.11.0**, published 2026-05-08. The 1.11 floor should not move, and no row in the pair needs a change.

Evidence that nothing was released:
- The GitHub releases list (`gh api repos/Kotlin/kotlinx.coroutines/releases`) has 1.11.0 (2026-05-08) as newest, then 1.11.0-rc02 (2026-04-27) and 1.11.0-rc01 (2026-04-15). Source: https://github.com/Kotlin/kotlinx.coroutines/releases
- Tags list: newest is 1.11.0.
- Maven metadata: `<latest>` and `<release>` are both 1.11.0, `lastUpdated` 2026-05-08. Source: https://repo1.maven.org/maven2/org/jetbrains/kotlinx/kotlinx-coroutines-core/maven-metadata.xml
- CHANGES.md on master tops out at 1.11.0 and states "No changes, only the version number increased" relative to the 1.11.0 release candidates. Source: https://raw.githubusercontent.com/Kotlin/kotlinx.coroutines/master/CHANGES.md

Master commits in the window are documentation, links and policy only: 2026-09-16 "Poison AGENTS.md" (#4758), 2026-10-12 Retrofit links (#4772), 2026-10-16 typo in a CoroutineStart.LAZY example (#4779), 2026-11-06 LLM policy (#4790), 2026-11-16 and 2026-11-17 runBlocking in the context sample code (#3674), 2026-11-18 channel docs typo (#4805). Zero commits touched `kotlinx-coroutines-test`, `kotlinx-coroutines-core/common/src/flow`, `kotlinx-coroutines-core/jvm/src` or `Builders.common.kt` in the window. Source: GitHub commits API on Kotlin/kotlinx.coroutines.

## Per-claim decision

| Claim | Decision | Evidence |
|---|---|---|
| 1.11.x is the floor for every dispatcher row | unchanged | Latest stable is still 1.11.0. |
| `Dispatchers.IO` ceiling `max(64, cores)`, tunable only by `kotlinx.coroutines.io.parallelism` | unchanged | Dispatchers.IO KDoc: "defaults to the limit of 64 threads or the number of cores (whichever is larger)"; property name `kotlinx.coroutines.io.parallelism`. https://kotlinlang.org/api/kotlinx.coroutines/kotlinx-coroutines-core/kotlinx.coroutines/-dispatchers/-i-o.html |
| `limitedParallelism(n)` is an elastic view, no thread allocation, views do not sum | unchanged | KDoc "Elasticity for limited parallelism": views are not restricted by IO parallelism and share threads; the page notes peak of 64 + 100 + 60 threads. Same URL. |
| kotlinx-coroutines-test 1.11.0 is the floor | unchanged | No test-module release or commit in the window. |
| `runTest` auto-skips `delay`, waits for non-`backgroundScope` children, rethrows child exceptions, 60 s default timeout | unchanged | Test README (master): 60 seconds, `backgroundScope` cancelled at test end, delay finishes immediately, child exceptions rethrown at end. https://raw.githubusercontent.com/Kotlin/kotlinx.coroutines/master/kotlinx-coroutines-test/README.md |
| KT-CORO-02 `GlobalScope` `@DelicateCoroutinesApi` opt-in and context-carrying exception | unchanged | No release; no `GlobalScope` change in CHANGES.md top section. |
| KT-CORO-03 "No lint covers this" for `runBlocking` in `suspend fun` | unchanged as far as upstream sources show | 1.11.0 notes mention lint functions only for passing a `Job` to coroutine builders, and a `callsInPlace(EXACTLY_ONCE)` contract on `runBlocking`; neither flags `runBlocking` in a suspend function. IDE or Kotlin-compiler diagnostics were not checked: could not determine for those. |
| KT-CORO-04/05 handler-root-only, `async` capture, `CancellationException` transparency | unchanged | exception-handling.html (page footer "20 July 2026", before the window): handler applies only to root coroutines, `async` stores the exception in the `Deferred`, handlers ignore `CancellationException`, `Job.cancel()` does not cancel the parent, original exception is unwrapped. https://kotlinlang.org/docs/exception-handling.html |
| KT-CORO-08 / KT-ERR-03 `withContext(NonCancellable)` in `finally` and `onCompletion` | unchanged for `finally` | exception-handling.html still shows `withContext(NonCancellable)` inside `finally`. `onCompletion` was not covered by any fetched page: could not determine, but no Flow source changed in the window. |
| KT-CORO-13 `StandardTestDispatcher` vs `UnconfinedTestDispatcher` | unchanged | Test README: Standard queues until the scheduler advances (`runCurrent()`); Unconfined starts children eagerly to the first suspension. |
| Named gap: `catch` placement, `StateFlow` conflation | unchanged (gap stays open) | No flow-source commit in the window. 1.11.0 (pre-window) added `StateFlow.collectLatest` returning `Nothing`, `StateFlow.onSubscription` returning `StateFlow`, `SharedFlow.asFlow`; none alters the conflation contract. No row authored. |

## Dates worth recording

- 1.11.0 was released 2026-05-08, before the baseline of 2026-09-12. Its notable items already in the baseline: Kotlin 2.2.20, deprecation levels raised for `kotlinx-coroutines-test` APIs, `CoroutineDispatcher` as a context key deprecated in favour of `ContinuationInterceptor`, `Job`-to-builder lint, uncaught coroutine exceptions reported to the JS runtime on JS and Wasm/JS.
- The two `runBlocking{}` context-sample doc edits (2026-11-16, 2026-11-17) were not read in full; they are sample-code changes to docs, not an API or default change.

## Normative guidance candidates

None. No rule to change or add. Re-dating the pair's coroutine rows to 2026-11-27 is safe: "checked against 1.11.0 as latest stable, 2026-11-27".

## Limits of this check

- The GitHub release page via WebFetch returned HTTP 504; the `gh` API and Maven metadata were used instead.
- The kotlinlang page coroutines-cancellation.html and shared-mutable-state-and-concurrency.html were not fetched successfully or at all (cancellation-and-timeouts.html returned empty). Claims relying on them are "unchanged" only because no release or library commit touched them in the window, not because the pages were read.
- Kotlin compiler and IDE diagnostics were out of scope of the fetched sources.
