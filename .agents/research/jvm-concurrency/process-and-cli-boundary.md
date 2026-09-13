---
title: "Wrapping a CLI: the SDK's actual concurrency surface"
topic: process-and-cli-boundary
agent: process-and-cli-boundary
model: sonnet
date_researched: 2026-09-12
sources_count: 15
scope: >
  The JVM-side process boundary for an SDK that wraps a CLI one command at a
  time: the injectable launch seam, concurrent stdout/stderr draining, the
  kill ladder and its POSIX/Windows guarantees, explicit child-environment
  construction against OCX_ENV_CLASSES, the sysexit-75 retry rule, and the
  exit-code enum's provenance. Does not re-open the Gradle-plugin half of
  this boundary (settled: jvm-gradle-plugin-dev.md GRADLE-PLUG-07/08/09) or
  general virtual-thread/structured-concurrency guidance (owned by the
  sibling dive `java-virtual-threads-and-structured-concurrency`, family
  JAVA-CONC) beyond the one JDK-floor trade-off this boundary's async-path
  decision turns on.
---

## Contents

1. [Findings](#findings)
   1. [The seam: an interface Java has no other way to fake](#1-the-seam-an-interface-java-has-no-other-way-to-fake)
   2. [Concurrent stdout/stderr draining without deadlock](#2-concurrent-stdoutstderr-draining-without-deadlock)
   3. [The kill ladder: POSIX vs Windows guarantees](#3-the-kill-ladder-posix-vs-windows-guarantees)
   4. [The async path: onExit's CompletableFuture, not virtual threads](#4-the-async-path-onexits-completablefuture-not-virtual-threads)
   5. [The child environment: explicit construction against OCX_ENV_CLASSES](#5-the-child-environment-explicit-construction-against-ocx_env_classes)
   6. [Sysexit 75: the retry rule and where it lives](#6-sysexit-75-the-retry-rule-and-where-it-lives)
   7. [The exit-code enum: hand-maintained, diffed, never generated](#7-the-exit-code-enum-hand-maintained-diffed-never-generated)
2. [Normative guidance candidates](#normative-guidance-candidates)
3. [Exemplar evidence](#exemplar-evidence)
4. [AI-agent angle](#ai-agent-angle)
5. [Contested / evolving](#contested--evolving)
6. [Sources](#sources)

## Summary

- **The seam is a constructor-injected `ProcessLauncher` interface, not `ProcessBuilder` itself** — Java has no mockable process API, so the SDK must define its own ([§1](#1-the-seam-an-interface-java-has-no-other-way-to-fake)).
- **A fake `Process` for tests is a subclassing exercise, not a mocking-library trick**: `java.lang.Process` is `abstract`, so a hand-written test double overriding its abstract methods is the direct JVM analogue of `PopenFactory`'s injected `Popen` ([§1](#1-the-seam-an-interface-java-has-no-other-way-to-fake)).
- **Reading stdout and stderr concurrently needs two drain threads (or one, plus `redirectErrorStream(true)`) — never one thread reading both streams in sequence**, because the OS pipe buffer for the unread stream fills and the child blocks writing to it, exactly the deadlock `ocx-sdk-python`'s pump-thread pattern exists to avoid ([§2](#2-concurrent-stdoutstderr-draining-without-deadlock)).
- **The two-stream deadlock is not a documentation footnote for JDK 25 — it is stated as a plain warning on `Process.getInputStream()`/`getErrorStream()`**: "failure to promptly write the input stream or read the output stream of the process may cause the process to block, or even deadlock" ([§2](#2-concurrent-stdoutstderr-draining-without-deadlock)).
- **The kill ladder is `destroy()` → `waitFor(timeout)` → `destroyForcibly()` → `waitFor()` → report, and `destroy()`'s graceful half is a POSIX-only guarantee** — on Windows both calls reduce to `TerminateProcess`, so there is no graceful phase to wait out there ([§3](#3-the-kill-ladder-posix-vs-windows-guarantees)).
- **`Process.destroy()`/`destroyForcibly()` only ever reach the immediate child** — the JVM has no `killpg`/process-group primitive, so a CLI that forks its own children needs the ladder to walk `Process.descendants()` and destroy each handle, or the grandchildren survive the kill ([§3](#3-the-kill-ladder-posix-vs-windows-guarantees)).
- **The async path is `Process.onExit()`'s `CompletableFuture<Process>`, not virtual threads** — available unmodified since JDK 9, costs nothing on the floor, and matches a "one command at a time" SDK's actual concurrency shape, which is bounded, not a fan-out ([§4](#4-the-async-path-onexits-completablefuture-not-virtual-threads)).
- **Choosing virtual threads for this boundary anyway costs a floor jump from the map's default 17 to 21** — virtual threads finalized in JEP 444 (JDK 21); there is no back-port, and the SDK would forgo three LTS-adjacent minors of adopters for a concurrency regime it does not need ([§4](#4-the-async-path-onexits-completablefuture-not-virtual-threads)).
- **`StructuredTaskScope` must not appear in this boundary at all** — still preview through JDK 27 (7th iteration, JEP 533), and a published library cannot force `--enable-preview` on every consumer; plain `Thread`/`ExecutorService` for the drain pair is the whole requirement, no preview API buys anything here ([§4](#4-the-async-path-onexits-completablefuture-not-virtual-threads)).
- **`ProcessBuilder.environment()` starts as a live copy of the JVM's own environment, so "explicit" means `.clear()` first, then write every key back from a classified table** — there is no constructor that starts empty ([§5](#5-the-child-environment-explicit-construction-against-ocx_env_classes)).
- **The four `OCX_ENV_CLASSES` map onto one build routine, not four**: site (10) and translucent (4) are read from the JVM's own `System.getenv()` and copied through unless an explicit override is set; explicit (2) are written only from resolved policy, never read from the ambient environment; pinned (5) are literal constants on every invocation ([§5](#5-the-child-environment-explicit-construction-against-ocx_env_classes)).
- **Sysexit 75 is retried before it is ever wrapped as `TempFailError`** — the retry loop sits below the exception-construction boundary, so a caller that only catches exceptions can never accidentally skip the retry by mishandling one ([§6](#6-sysexit-75-the-retry-rule-and-where-it-lives)).
- **Retryability is a fixed property of the exception class, not a value threaded through call sites** — `retryable` (or its JVM equivalent, e.g. an `isRetryable()` on the exit-code enum or the exception type) reports what the CLI said about the failure, independent of whatever retry policy a caller configured, so it cannot be forgotten one call site at a time ([§6](#6-sysexit-75-the-retry-rule-and-where-it-lives)).
- **The 16-member exit-code enum is hand-maintained and diffed against two prior-art files, never generated** — `ocx-sdk-python/_errors.py` and `rules_ocx/AGENTS.md` already agree byte-for-byte on all 16 values, and the JVM enum's job is to stay a silent third copy of a decision made elsewhere, verified by a unit test that lists all 16 members and fails on any drift ([§7](#7-the-exit-code-enum-hand-maintained-diffed-never-generated)).
- **Stdout is never redacted, ever, on either the sync or async path** — it is the JSON payload a parser consumes, and a substitution inside it corrupts the document; only stderr and logged argv are redaction surfaces (carried over from `_process.py`'s module docstring, binding for the JVM SDK unchanged) ([§2](#2-concurrent-stdoutstderr-draining-without-deadlock)).
- **`waitFor(Duration)` (JDK 24+) is the one API addition since the brief's JDK-25 floor question that changes nothing about the design** — it is sugar over `waitFor(long, TimeUnit)`; either is fine, pick one and be consistent ([§3](#3-the-kill-ladder-posix-vs-windows-guarantees)).
- **`java.net.http` ships zero JSON support** — `BodyHandlers` return `String`/`InputStream`/`Path`, never a parsed object — so JAVA-API-15's "hand-rolled JSON reader" is not a shortcut avoided elsewhere in the JDK; it is the only option, and the same reader parses both the CLI's captured stdout and any HTTP body the SDK's other modules fetch ([§5](#5-the-child-environment-explicit-construction-against-ocx_env_classes)).

## Findings

### 1. The seam: an interface Java has no other way to fake

`ocx-sdk-python`'s `_process.py` defines two seam types as plain callables — `PopenFactory = Callable[..., subprocess.Popen[Any]]` and `ExecFactory = Callable[..., Awaitable[asyncio.subprocess.Process]]` — injected as an optional keyword (`popen_factory`, `exec_factory`) on `spawn`/`spawn_async`, defaulting to the real `subprocess.Popen`/`asyncio.create_subprocess_exec` ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:101-105,383-391,425-433](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)). Python can do this because `Popen` is itself an ordinary duck-typed object a test double can stand in for.

Java has no equivalent: `ProcessBuilder.start()` is a concrete method on a concrete class that always talks to the OS, and there is no interface a mock could implement in its place — the map's own row states this as the reason the seam is a **design requirement**, not an optional nicety (M-Y-02, [jvm-topic-map.md:853](../jvm-topic-map.md)).

The translation is two pieces, mirroring the Python shape exactly:

```java
// The seam. One method, narrow enough that a fake is a five-line class.
public interface ProcessLauncher {
    Process launch(List<String> argv, Map<String, String> env, Path cwd) throws IOException;

    static ProcessLauncher real() {
        return (argv, env, cwd) -> {
            ProcessBuilder pb = new ProcessBuilder(argv).directory(cwd.toFile());
            pb.environment().clear();
            pb.environment().putAll(env);
            return pb.start();
        };
    }
}
```

```java
// The client takes the seam in its constructor — never calls `new ProcessBuilder(...)` itself.
public final class OcxProcess {
    private final ProcessLauncher launcher;

    public OcxProcess(ProcessLauncher launcher) { this.launcher = launcher; }
    // production code: new OcxProcess(ProcessLauncher.real())
    // test code:       new OcxProcess((argv, env, cwd) -> fakeProcess)
}
```

`java.lang.Process` itself is `abstract`, not `final`, with every method (`getInputStream`, `waitFor`, `destroy`, `onExit`, …) overridable — so a test's fake `Process` is a subclass that returns canned streams and a canned exit code, the direct JVM analogue of a Python test handing `spawn()` a fake `Popen`-shaped object ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)). No mocking framework's "cannot mock a final class" caveat applies, because nothing here is final by construction.

**Design MUST**: every SDK entry point that spawns the CLI takes a `ProcessLauncher` (or equivalently narrow functional interface) as a constructor or method parameter, with the real `ProcessBuilder`-backed implementation as the only default — matching `ocx-sdk-python`'s `popen_factory: PopenFactory | None = None` optional-with-real-default shape.

### 2. Concurrent stdout/stderr draining without deadlock

The JDK's own javadoc states the deadlock plainly, not as inferred folklore: *"Because some native platforms only provide limited buffer size for standard input and output streams, failure to promptly write the input stream or read the output stream of the process may cause the process to block, or even deadlock."* ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)). A caller that reads all of stdout to completion and only then starts reading stderr deadlocks the instant the child writes enough to stderr to fill its pipe buffer while blocked writing more to stdout that nobody is draining yet (or vice versa) — this is exactly the failure mode `ocx-sdk-python` engineers around with a pump thread, evidenced by its `_PUMP_JOIN = 5.0` constant ("Seconds to wait for a pump thread before abandoning it") and `_READ_CHUNK = 65536` ("Bytes per async pipe read — one page-ish, the size a pipe buffer holds") ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:79-84](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)).

Three JVM-legal ways to avoid it, in order of what this boundary should actually use:

1. **Two dedicated drain threads**, one per stream, each fully draining its stream into a buffer, joined (with a timeout) before or alongside `waitFor()`. This is the direct translation of the pump-thread pattern and the one to use when stdout and stderr must be captured separately (the CLI's two-tier JSON contract needs stdout intact and stderr for diagnostics/redaction — [rules_ocx/AGENTS.md:103-159](/home/mherwig/dev/rules_ocx/AGENTS.md)).
2. **`redirectErrorStream(true)`**, merging stderr into the stdout pipe so only one stream — and one drain thread — exists. Wrong for this SDK: it would mix ocx's diagnostic stderr into the same stream as the `--format json` payload a parser must consume untouched.
3. **`Process.inputReader()`/`errorReader()`** (JDK 17+) as a nicer-typed wrapper over the same raw streams — convenience only, does not change the threading requirement.

```java
// Correct: two threads drain concurrently, doc'd deadlock avoided.
ExecutorService drains = Executors.newFixedThreadPool(2);
Future<byte[]> out = drains.submit(() -> process.getInputStream().readAllBytes());
Future<byte[]> err = drains.submit(() -> process.getErrorStream().readAllBytes());
int code = process.waitFor();
byte[] stdout = out.get();   // already drained — no deadlock window
byte[] stderr = err.get();
```

```java
// Wrong: reads stdout to completion before touching stderr — deadlocks the
// instant the child fills the stderr pipe while it is still writing stdout.
byte[] stdout = process.getInputStream().readAllBytes();
int code = process.waitFor();
byte[] stderr = process.getErrorStream().readAllBytes();
```

Stdout redaction stays out of scope for this drain, by design, carried over unchanged from the Python contract: *"Captured stdout is deliberately never redacted (§12): it is the raw JSON payload a parser consumes, and a substitution inside it would corrupt the document"* ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:19-24](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)). Stderr and any logged argv are the redaction surfaces; the JVM SDK's drain-thread output for stdout must reach the exception/result type unmodified.

Whether these two threads are platform threads or virtual threads is immaterial at this SDK's scale (one command at a time, two short-lived drain tasks per invocation) — see [§4](#4-the-async-path-onexits-completablefuture-not-virtual-threads) for why virtual threads are not adopted as a floor-raising default anyway. Plain `Executors.newFixedThreadPool(2)` (or two bare daemon `Thread`s) is sufficient and adds no JDK-floor cost.

### 3. The kill ladder: POSIX vs Windows guarantees

`ocx-sdk-python`'s ladder is `_terminate_group` (SIGTERM to the process group) → `wait(timeout=grace)` → `_kill_group` (SIGKILL to the process group) → `wait()`, with `KILL_GRACE = 5.0` seconds between the two signals, run unconditionally from the `finally` of every invocation via `_reap`/`_kill_ladder` ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:762-799](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)). The JVM ladder is the same shape with the same four rungs, translated method-for-method:

```java
static int killLadder(Process p, Duration grace) throws InterruptedException {
    p.destroy();                                   // rung 1: SIGTERM (POSIX) / TerminateProcess (Windows)
    if (p.waitFor(grace.toMillis(), TimeUnit.MILLISECONDS)) {
        return p.exitValue();                      // exited within the grace window
    }
    p.destroyForcibly();                            // rung 3: SIGKILL (POSIX) / TerminateProcess again (Windows)
    return p.waitFor();                              // rung 4: block until it is actually gone
}
```

What each rung guarantees differs by platform, and the difference is real, not cosmetic:

- **`destroy()`**: *"Whether the process represented by this Process object is normally terminated or not is implementation dependent."* ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)). On POSIX, the JDK's native implementation sends `SIGTERM`, giving the child a chance to run its own shutdown/cleanup. On Windows, `destroy()` calls `TerminateProcess` — the same forcible call `destroyForcibly()` makes — so there is no graceful phase there at all; the grace-window wait after rung 1 is a no-op on Windows because the process either already died immediately or is unaffected by waiting. `Process.supportsNormalTermination()` is the mechanical way to detect which regime a given `Process` is in at runtime.
- **`destroyForcibly()`**: *"Kills the process forcibly. The process represented by this Process object is forcibly terminated. Forcible process destruction is defined as the immediate termination of a process, whereas normal termination allows the process to shut down cleanly."* On both platforms this is `SIGKILL`/`TerminateProcess` — unconditional, no cleanup, no way for the child to intercept it. The API note explicitly warns the caller to still wait: *"The process may not terminate immediately... This method may be chained to waitFor() if needed"* — which is exactly rung 4 above ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)).
- **Neither call reaches descendants.** Unlike POSIX `killpg`, which the Python SDK relies on by putting the child in its own process group (`start_new_session`) and signalling the whole group ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:770-799](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)), `ProcessBuilder` has no public API to create a new session/process group at all — there is no `start_new_session` equivalent. `destroy()`/`destroyForcibly()` signal only the immediate `Process` object's PID. If the wrapped CLI itself forks helper processes, the ladder above kills the CLI and orphans its children. `Process.descendants()` (JDK 9+) exists precisely to close this gap: it returns a `Stream<ProcessHandle>` of every process descended from this one, walked recursively, and each `ProcessHandle` exposes its own `destroy()`/`destroyForcibly()` ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)). A JVM kill ladder for a CLI that may itself spawn children must walk `process.descendants()` and destroy each handle in the same two-rung (terminate, then wait, then force) shape, or state explicitly that the wrapped CLI is known never to fork.

`waitFor(Duration duration)` (JDK 24+) is a drop-in alternative to `waitFor(long, TimeUnit)` with identical semantics (`false` if the duration elapses without exit) — a stylistic choice, not a design fork; pick one spelling and use it everywhere in the ladder ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)).

### 4. The async path: onExit's CompletableFuture, not virtual threads

The brief's decision point (b) is genuinely open at the JDK-mechanism level but closed once the SDK's own shape is taken seriously: it wraps **one CLI command at a time**. That is not a request-per-connection server generating thousands of concurrent blocking waits — the shape virtual threads exist for (JEP 444's stated purpose: cheap, disposable, one-per-task threads for high-throughput blocking-style I/O, explicitly *"should never be pooled"* because platform-thread scarcity is the exact problem they remove — [JEP 444: Virtual Threads](https://openjdk.org/jeps/444)). This SDK's concurrency surface is a handful of concurrent process spawns at most, each already needing two drain threads regardless of the async mechanism chosen ([§2](#2-concurrent-stdoutstderr-draining-without-deadlock)).

`Process.onExit()` returns a `CompletableFuture<Process>` that completes when the child terminates, *"regardless of the exit status of the process"*, and has been available unmodified since **JDK 9** — no floor cost at all against the map's default-17 answer to Q2:

```java
Process p = new ProcessBuilder(argv).start();
CompletableFuture<Integer> exitCode = p.onExit().thenApply(Process::exitValue);
```

*"Cancelling the CompletableFuture does not affect the Process"* and the completion callback runs, by default, on `ForkJoinPool.commonPool()` (the shared default executor for every `CompletableFuture` async stage that does not name its own `Executor`) — worth stating explicitly because a callback that blocks (e.g. draining a stream synchronously inside `.thenApply`) starves the JVM-wide common pool for unrelated code, the same class of mistake the map's `M-N-05` row already flags for `parallelStream()` ([jvm-topic-map.md:696](../jvm-topic-map.md)). The fix is the same one that fix uses: pass an explicit bounded `Executor` to `.thenApplyAsync(fn, executor)` rather than trusting the shared default with any blocking work ([Process javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html)).

**What virtual threads would cost if chosen anyway.** Virtual threads were preview in JDK 19/20 and finalized in **JDK 21** by JEP 444 — there is no earlier stable release and no back-port ([JEP 444: Virtual Threads](https://openjdk.org/jeps/444)). Choosing them for this boundary's async path means the SDK's JDK floor cannot be lower than 21, a jump of four major versions past the map's stated default-17 answer to Q2. That is a real cost paid for a concurrency regime ("blocking-style code, cheap threads, high fan-out") this SDK does not exercise: nothing here is I/O-bound at the scale virtual threads target, and the two drain threads per invocation are already cheap enough on ordinary platform threads that the pooling concern JEP 444 exists to solve never arises. Recommend: **CompletableFuture via `onExit()` for the async path (SHOULD, and the working default)**; virtual threads remain a **CONSIDER**, contingent only on the owner independently raising the JDK floor to 21+ for reasons unrelated to this boundary — never adopt them here first and let that decide the floor.

**`StructuredTaskScope` MUST NOT appear in this boundary.** It is still preview through the corpus's own tracking: 6th preview in JDK 26 (JEP 525), 7th in JDK 27 (JEP 533, GA 2026-09-15), with breaking shape changes nearly every release ([jvm-topic-map.md:694,2578](../jvm-topic-map.md)). A published library cannot ship code that requires `--enable-preview` — that flag propagates to every consumer's own compilation and runtime, an unacceptable ask for a dependency. The two-drain-thread pattern in [§2](#2-concurrent-stdoutstderr-draining-without-deadlock) needs nothing `StructuredTaskScope` would add here; a plain `ExecutorService` (or two raw `Thread`s) covers it fully and stably today.

### 5. The child environment: explicit construction against OCX_ENV_CLASSES

`ProcessBuilder.environment()` does not start empty. The JDK 25 javadoc is explicit: it returns *"a copy of the current process environment"* — a live, mutable `Map<String,String>` seeded from `System.getenv()` at the moment `environment()` is first called on that builder, independent per instance ([ProcessBuilder javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ProcessBuilder.html)). "Explicit" therefore means one extra step the JDK does not do for you: `.clear()` before writing anything, exactly mirroring `_process.py`'s own contract that `env: Mapping[str, str]` arriving at `spawn`/`spawn_async` is *"the finished child environment; it is snapshotted here"* and forwarded with `env=dict(env)` rather than merged onto the ambient environment ([ocx-sdk-python@HEAD:src/ocx_sdk/_process.py:399-401,439-441](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_process.py)).

```java
ProcessBuilder pb = new ProcessBuilder(argv);
pb.environment().clear();          // required: environment() is pre-seeded from System.getenv()
pb.environment().putAll(childEnv); // childEnv already carries every OCX_ENV_CLASSES row
```

```java
// Wrong: relies on the JVM's own ambient environment for everything the
// caller did not explicitly set — silently leaks whatever process launched
// the SDK's own JVM (a CI runner's secrets, a shell's OCX_* overrides).
ProcessBuilder pb = new ProcessBuilder(argv);
pb.environment().put("OCX_NO_VERIFY", "0");
```

The four `OCX_ENV_CLASSES` from `rules_ocx/AGENTS.md:211-249` collapse to one routine that walks a single classified table (the file's own framing: *"a new ocx variable is one row plus its class, not four structures that can disagree"*):

| Class | Count | Build rule | JVM translation |
|---|---|---|---|
| site | 10 | Forwarded verbatim from the ambient environment | `childEnv.put(name, System.getenv(name))` when present; omit when absent — never invent a default |
| translucent | 4 | Ambient unless an explicit override (attr/config) is set | Same as site, but a resolved config value takes precedence over `System.getenv(name)` when both exist |
| explicit | 2 | **Never** read from the environment; always written from resolved policy | `childEnv.put(name, resolvedPolicy.value(name))` — `System.getenv(name)` is never consulted for these two keys, on purpose |
| pinned | 5 | A fixed literal on every invocation | `childEnv.put(name, LITERAL)` — a compile-time constant, not read from anywhere |

`OCX_HOME` is resolved by the SDK itself and is neither forwarded nor a class member; it is computed and then written like any other explicit value ([rules_ocx/AGENTS.md:211-249](/home/mherwig/dev/rules_ocx/AGENTS.md)). The load-bearing structural fact this file states outright is the direct analogue of Gradle's configuration-cache discipline already settled for the plugin side: *"Extension impls get no `module_ctx.os`/getenv — repository rules only"* maps one-to-one onto "the SDK's own process-spawning code reads `System.getenv()` in exactly one classified place, never scattered across call sites" ([rules_ocx/AGENTS.md:65](/home/mherwig/dev/rules_ocx/AGENTS.md); cf. [jvm-gradle-plugin-dev.md GRADLE-PLUG-07/08/09](../jvm-gradle-plugin-dev.md) for the Gradle-side mirror of the same discipline via `ValueSource`).

The zero-runtime-dependency commitment (JAVA-API-15, [jvm-language-api.md](../jvm-language-api.md)) is what forces the hand-rolled JSON reader this same env table eventually feeds: `java.net.http`'s `HttpClient` ships `BodyHandlers` that return `String`/`InputStream`/`Path` and nothing JSON-shaped — there is no JDK-native JSON parser anywhere, for HTTP bodies or for captured subprocess stdout alike ([HttpClient javadoc, JDK 25](https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpClient.html)). One hand-rolled reader serves both the CLI's `--format json` stdout and any HTTP body the SDK's other modules fetch; this is not a gap specific to the process boundary, and building a second reader for either surface would be pure duplication.

### 6. Sysexit 75: the retry rule and where it lives

`rules_ocx/AGENTS.md` states the rule and its scope in one sentence: *"Every sysexit reachable... maps to a fail() naming the user-fixable action... 75 is retried before it ever reaches a fail()"* ([rules_ocx/AGENTS.md:66-72](/home/mherwig/dev/rules_ocx/AGENTS.md)). `ocx-sdk-python` implements the same ordering: `_process.py`'s `run_command`/`run_command_async` call `run_with_retry`/`run_with_retry_async` (from `_retry.py`) around the attempt loop, and only the *final* failed attempt is turned into an `OcxProcessError`/`TempFailError` and raised — a caller catching exceptions never sees an intermediate 75 that was about to be retried, by construction, because the exception object does not exist yet at that point.

The "cannot be forgotten" property comes from where retryability is stated, not from documentation discipline: it is a fixed method on the exception type itself, deliberately decoupled from whatever retry policy a caller configured.

```python
@property
def retryable(self) -> bool:
    """Whether ocx called this failure transient (exit 75).

    Fixed semantics, independent of any RetryPolicy: this reports what
    ocx said about the failure, not whether a caller chose to retry it.
    """
    return self.exit_code == ExitCode.TEMP_FAIL
```

([ocx-sdk-python@HEAD:src/ocx_sdk/_errors.py:154-165](/home/mherwig/dev/ocx-sdk-python/src/ocx_sdk/_errors.py))

The JVM translation keeps the same two properties: (1) the retry loop runs **inside** the spawn/run call, below the point where any exception is constructed, so "did we retry 75" is never a decision left to a caller; (2) retryability is queryable on the resulting exception/enum itself, independent of any retry-policy object, so a second, third, or Nth call site that catches the exception and wants to know "was this a should-have-retried failure" gets the right answer without re-deriving it from the raw exit code:

```java
public sealed class OcxProcessException extends OcxException permits UsageException, TempFailException, /* … */ {
    public abstract boolean isRetryable(); // fixed per subtype, never a constructor parameter
}

public final class TempFailException extends OcxProcessException {
    @Override public boolean isRetryable() { return true; } // exit 75, and only exit 75
}
```

```java
// Retry loop lives inside the spawn call, below exception construction —
// a caller that only catches OcxProcessException can never skip it.
Completed result = runWithRetry(() -> attempt(argv, env), policy, ExitCode.TEMP_FAIL);
```

Placing `isRetryable()` on the exception hierarchy rather than on a `RetryPolicy` config object is the mechanism that survives refactors: any new call site that constructs the exception via the shared exit-code→exception map ([§7](#7-the-exit-code-enum-hand-maintained-diffed-never-generated)) inherits correct retryability for free, the same way a Python caller who imports `TempFailError` gets `retryable == True` without re-checking the exit code.

### 7. The exit-code enum: hand-maintained, diffed, never generated

The two prior-art files already agree byte-for-byte on all 16 values — `ocx-sdk-python/_errors.py:28-46`'s `ExitCode(IntEnum)` (0, 1, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85) and `rules_ocx/AGENTS.md:161-178`'s 14-sysexit table (a subset — repository rules do not reach every SDK-level code) — and `jvm-language-api.md` already settles decision (d) at the language-API layer: **JAVA-API-14 is a MUST that this enum be hand-maintained and diffed against those two files, never generated from either**, because "a pinned project decision" is not a schema a code generator can discover on its own ([jvm-language-api.md JAVA-API-14](../jvm-language-api.md); [config-inventory.md Axis 3/4](../jvm-audit/config-inventory.md)).

This dive's job is only to say what keeps it byte-identical in practice, since "diff it" is a verification step someone has to actually run: a unit test that enumerates every member of the JVM `ExitCode` enum and asserts the resulting set of ordinals equals a literal `{0,1,64,65,69,74,75,77,78,79,80,81,82,83,84,85}`, with a comment citing both source files' line ranges next to the literal — so a future edit to either enum member list forces a conscious look at the other two files, rather than a generator silently reconciling a drift nobody noticed:

```java
@Test
void exitCodesMatchPriorArt() {
    // Pinned against ocx-sdk-python/src/ocx_sdk/_errors.py:28-46 and
    // rules_ocx/AGENTS.md:161-178 — any change here must be a conscious,
    // three-way diff, never a one-sided edit.
    Set<Integer> expected = Set.of(0, 1, 64, 65, 69, 74, 75, 77, 78, 79, 80, 81, 82, 83, 84, 85);
    Set<Integer> actual = Arrays.stream(ExitCode.values()).map(ExitCode::value).collect(toSet());
    assertEquals(expected, actual);
}
```

A generator (reading one file to produce the enum) is explicitly rejected here: it would make one of the two prior-art files load-bearing and the other decorative, the opposite of the "byte-for-byte agreement across two independent sources" property the audit found and wants preserved ([config-inventory.md Axis 3](../jvm-audit/config-inventory.md)).

## Normative guidance candidates

1. **Every CLI spawn point in the SDK takes a `ProcessLauncher` (or equivalently narrow functional interface) via constructor injection; production code never calls `new ProcessBuilder(...).start()` directly.** Rationale: Java has no mockable process API — this interface *is* the test seam, mirroring `PopenFactory`/`ExecFactory`. Verify: `grep -rn 'new ProcessBuilder' src/main/java | grep -v 'ProcessLauncher.java'` is empty; every hit outside the one real implementation is a violation.
2. **Never read `process.getInputStream()` to completion before starting to read `process.getErrorStream()` (or vice versa) unless `redirectErrorStream(true)` merged them first.** Rationale: the JDK's own javadoc names this a deadlock risk on a full pipe buffer. Verify: a reading heuristic — any method that calls `.readAllBytes()`/`.readAllLines()` on one process stream and then blocks on `waitFor()` or the other stream without first submitting both reads to separate threads/futures is a finding.
3. **The kill ladder is `destroy()` → `waitFor(grace)` → `destroyForcibly()` → `waitFor()`, unconditionally, from a `finally` (or try-with-resources close) on every spawn path.** Rationale: matches the Python SDK's `_kill_ladder`/`_reap` shape; a process left alive after an exception is a leak. Verify: every method that calls `ProcessLauncher.launch(...)`/`ProcessBuilder.start()` has a `finally` block (or equivalent) that reaches a shared `killLadder(Process, Duration)` helper — grep for `.start()` calls with no matching `finally`/try-with-resources in the same method.
4. **If the wrapped CLI can itself fork children, the kill ladder walks `process.descendants()` and destroys each handle** — `destroy()`/`destroyForcibly()` on the parent `Process` never reaches them. Rationale: the JVM has no `killpg`/process-group primitive, unlike POSIX `Popen(start_new_session=True)` plus `os.killpg`. Verify: `grep -n 'descendants()' src/main/java` present in the same file as the kill-ladder helper, or a written, reviewed statement that the specific CLI never forks.
5. **The async path is `Process.onExit()`'s `CompletableFuture<Process>`, with a caller-supplied bounded `Executor` for any stage that does blocking work — never the default `ForkJoinPool.commonPool()` for a blocking callback, and never virtual threads by default.** Rationale: `onExit()` costs nothing on the JDK floor (available since JDK 9); virtual threads solve a fan-out problem this "one command at a time" SDK does not have, and adopting them forces the floor to 21. Verify: `grep -n '\.onExit()\.then.*Async' src/main/java` paired with a check that an explicit `Executor` argument is present; `grep -rn 'Thread.ofVirtual\|newVirtualThreadPerTaskExecutor' src/main/java` should be empty unless the owner has separately raised the floor to 21+ for other reasons.
6. **`StructuredTaskScope`, or any type from `java.util.concurrent` marked `@PreviewFeature`, must never appear in the SDK's shipped source.** Rationale: still preview through JDK 27 (7th iteration); a published library cannot force `--enable-preview` on consumers. Verify: `grep -rn 'StructuredTaskScope\|--enable-preview' src/main/java build.gradle.kts pom.xml` is empty.
7. **`ProcessBuilder.environment()` is always `.clear()`-ed before being populated; the SDK never merges an explicit value onto the ambient copy `environment()` starts with.** Rationale: `environment()` is documented to start as a live copy of `System.getenv()`, not empty — skipping the clear silently leaks the JVM's own ambient environment into every child. Verify: `grep -n 'ProcessBuilder' -A5 src/main/java/**/*.java` — every construction site calling `.environment()` must be immediately followed by `.clear()` before any `.put`/`.putAll`.
8. **`System.getenv()` is read in exactly one place — the classified `OCX_ENV_CLASSES` table builder — never scattered across call sites that decide ad hoc whether to forward a variable.** Rationale: mirrors the structural discipline `rules_ocx/AGENTS.md` states for its own repository rules ("no `module_ctx.os`/getenv... repository rules only") and the Gradle-side `ValueSource` isolation (GRADLE-PLUG-07/08/09) — one seam that can be audited beats N seams that can silently disagree. Verify: `grep -rn 'System.getenv' src/main/java` — every hit must be inside the one designated env-builder class/method; a hit anywhere else is a finding.
9. **The two `explicit`-class variables (`OCX_NO_VERIFY`, `OCX_ALLOW_YANKED`) are never read from `System.getenv()` under any code path, including a fallback/default branch.** Rationale: `rules_ocx/AGENTS.md` states this as "never" with no exception — an ambient value for either would silently reopen a policy the SDK's own config resolution deliberately closed. Verify: `grep -n 'getenv(\"OCX_NO_VERIFY\"\|getenv(\"OCX_ALLOW_YANKED\"' src/main/java` is empty everywhere except a comment stating why it is deliberately absent.
10. **Sysexit 75 is retried inside the spawn/run call, strictly before any exception object for that attempt is constructed; the resulting exception type (or the exit-code enum) exposes retryability as a fixed, no-argument property, never a constructor parameter threaded from a `RetryPolicy`.** Rationale: keeps "was this transient" answerable at every catch site without re-deriving it from the raw exit code, and keeps the retry itself un-skippable by a caller that only handles exceptions. Verify: a written test that raises `TempFailException`/its equivalent from a fake launcher and asserts the retry count matches the configured policy before any exception reaches the caller; a second test asserting `isRetryable()` returns `true` for that type and `false` for every other subtype, with no policy object in scope.
11. **The exit-code enum's 16 members are hand-maintained, and a single unit test lists every ordinal and fails if it drifts from `{0,1,64,65,69,74,75,77,78,79,80,81,82,83,84,85}` — the enum is never generated from `_errors.py`, `AGENTS.md`, or any other single source.** Rationale: JAVA-API-14; two independent prior-art files already agree byte-for-byte, and a generator would make one of them decorative. Verify: the literal test in [§7](#7-the-exit-code-enum-hand-maintained-diffed-never-generated); `grep -rn 'generate.*ExitCode\|ExitCode.*generate' build.gradle.kts scripts/` is empty (no build step regenerates the enum).
12. **Captured stdout is never redacted and never appended to an exception's user-facing message/`toString()`; only stderr (redacted) and the redacted argv are.** Rationale: stdout is the JSON payload a downstream parser consumes verbatim — a redaction substitution corrupts the document, carried over unchanged from `_process.py`'s module contract. Verify: `grep -n 'stdout' src/main/java/**/*Exception.java` — any occurrence inside a `toString()`/`getMessage()` override (as opposed to a plain getter) is a finding.

## Exemplar evidence

The 32-repo corpus has **no exemplar for this row at all** — `M-Y-02` in the topic map marks the CLI-subprocess-boundary question `partial` coverage sourced only from `ocx-sdk-python`'s own measured contract, never from a corpus library ([jvm-topic-map.md:853](../jvm-topic-map.md)). None of the 32 exemplars is a JVM SDK that wraps an external CLI one command at a time the way `ocx-sdk-python` does for `ocx`; the closest structural analogues in the corpus (Gradle plugins shelling to tools, Bazel rules invoking toolchains) live on the build-tool side of this boundary, not the library side, and are already covered by `GRADLE-PLUG-07/08/09` ([jvm-gradle-plugin-dev.md](../jvm-gradle-plugin-dev.md)) — explicitly flagged there as "corpus-unconfirmed... the plugin will be the fleet's own first measurable instance."

This means every rule above is evidenced against the two prior-art files (`ocx-sdk-python`, `rules_ocx/AGENTS.md`) and primary JDK/Gradle documentation, not against a JVM library already doing this. That gap is the honest state of the art here, not an oversight: **the OCX SDK for the JVM will be the first exemplar of this pattern in the fleet's own corpus**, and this file's normative candidates are what that first instance should be measured against once it exists.

## AI-agent angle

- **Assuming `ProcessBuilder`/`Process` can be mocked with a mocking framework the way a Java interface can.** `ProcessBuilder.start()` talks to the OS directly and there is no interface layer beneath it to intercept — an LLM trained heavily on Mockito-everything Java codebases will reach for `Mockito.mock(ProcessBuilder.class)` and get a mock that returns `null` from `start()` or throws, not a fake child process. Check: `grep -rn 'mock(ProcessBuilder\|mock(Process\.class' src/test` — any hit is the tell; the fix is the constructor-injected `ProcessLauncher` seam in [§1](#1-the-seam-an-interface-java-has-no-other-way-to-fake).
- **Reading stdout fully, then stderr fully, then calling `waitFor()`** — the single most common process-handling bug in AI-generated Java, because it "looks obviously correct" line by line and only deadlocks under load the demo/test never reaches. Check: any method touching both `getInputStream()` and `getErrorStream()` without two concurrent readers (grep pattern in candidate 2).
- **Reaching for virtual threads reflexively "because it's 2026 and virtual threads are the modern way to do concurrency in Java,"** without checking whether the workload is the fan-out shape they exist for. An LLM's training data over-indexes on virtual-thread enthusiasm posts and under-indexes on the JEP's own explicit scoping ("should never be pooled" is about *task count*, not "always use these"). Check: is there ever more than a handful of concurrent CLI invocations in this SDK's actual use? If not, `Thread.ofVirtual()`/`newVirtualThreadPerTaskExecutor()` in this boundary is a floor-raising decision with no matching payoff — flag it for the JDK-floor cost in candidate 5.
- **Treating `StructuredTaskScope` as already-stable because JDK 21+ "has virtual threads and structured concurrency now."** They shipped together in public attention but not in stabilization status — virtual threads are final since JDK 21, `StructuredTaskScope` is still preview at JDK 27. An LLM conflating the two ships `--enable-preview`-dependent code into a library. Check: candidate 6's grep.
- **Forgetting that `ProcessBuilder.environment()` starts pre-populated.** Code that does `pb.environment().put("OCX_NO_VERIFY", value)` without a preceding `.clear()` looks like it is building an explicit environment and instead is *adding one key* onto the full ambient environment — every other variable, including any `OCX_*` the calling shell happens to have set, still leaks through. This is the single most likely silent-correctness bug in this whole boundary because the code compiles, runs, and passes any test that does not specifically assert the child's environment is minimal. Check: candidate 7's grep — every `ProcessBuilder(...)`/`.environment()` call site paired with a `.clear()` immediately after.
- **Parsing the exit code by pattern-matching stderr text ("if stderr contains 'not found' then...")** instead of trusting the exit code, because a model trained on shell-scripting habits reaches for text matching by reflex. `rules_ocx`'s and `ocx-sdk-python`'s explicit, repeated invariant is the opposite: the exit code *is* the classification, stderr is diagnostic only. Check: `grep -rn 'stderr.*contains\|stderr.*matches\|stderr.*startsWith' src/main/java` — any hit deciding control flow (not just building a message) is a violation of JAVA-API-14's own premise.

## Contested / evolving

- **Virtual threads vs. `CompletableFuture`/`onExit()` for a bounded, non-fan-out async path** is not a settled industry consensus as of 2026-09-12 — the map's own `M-N-05` row calls the CPU-bound-vs-I/O-bound regime split "a genuine 2026 decision point the corpus does not fully resolve" ([jvm-topic-map.md:696](../jvm-topic-map.md)). This dive's answer (onExit, not virtual threads, for *this specific bounded shape*) is scoped narrowly to the process-boundary use case and should not be read as a blanket verdict against virtual threads for the SDK's other concurrency surfaces (if any) — that is the sibling `java-virtual-threads-and-structured-concurrency` dive's call to make.
- **`StructuredTaskScope`'s API shape is actively changing release to release** (6th preview JEP 525 in JDK 26, 7th JEP 533 in JDK 27, GA scheduled 2026-09-15 per the map) — trending toward finalization but not there yet as of this writing; revisit this boundary's "never" rule for `StructuredTaskScope` (candidate 6) once it finalizes, since a finalized version might legitimately replace the plain-`ExecutorService` drain-thread pattern in [§2](#2-concurrent-stdoutstderr-draining-without-deadlock) with less code, at that point.
- **Whether a JVM SDK should offer *any* async API surface at all**, given the wrapped CLI is inherently a blocking OS-process operation regardless of which JVM concurrency primitive wraps it, is not addressed by either prior-art file directly — `ocx-sdk-python` offers both because Python's ecosystem expects both sync and async APIs from any I/O-touching library; whether JVM consumers of an OCX SDK expect the same dual surface, or whether a single blocking API plus `CompletableFuture.supplyAsync(...)` at the call site is sufficient, is an open API-design question this dive does not resolve and the language-API dive should weigh in on if it has not already.

## Sources

| URL | What it is | Date/era | Why worth reading |
|---|---|---|---|
| [Process — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/Process.html) | Primary JDK javadoc | JDK 25, LTS (Sept 2025) | `destroy()`/`destroyForcibly()` platform-dependent guarantees, the stdout/stderr deadlock warning verbatim, `onExit()`'s `CompletableFuture` semantics, `descendants()`, `waitFor(Duration)` (JDK 24+) |
| [ProcessBuilder — Java SE 25 API](https://docs.oracle.com/en/java/javase/25/docs/api/java.base/java/lang/ProcessBuilder.html) | Primary JDK javadoc | JDK 25, LTS | `environment()`'s pre-seeded-copy behavior, `Redirect` types, `startPipeline`, the case-sensitivity and null-key/value contract |
| [HttpClient — Java SE 25 API (java.net.http)](https://docs.oracle.com/en/java/javase/25/docs/api/java.net.http/java/net/http/HttpClient.html) | Primary JDK javadoc | JDK 25, LTS | Confirms zero JSON support in `BodyHandlers` — grounds the "hand-rolled reader, unavoidable" half of JAVA-API-15 as it applies to this boundary's stdout parsing too |
| [JEP 444: Virtual Threads](https://openjdk.org/jeps/444) | Primary JDK Enhancement Proposal | Finalized JDK 21 (Sept 2023) | The "should never be pooled" design intent and the fan-out use case virtual threads target — the basis for concluding this SDK's shape does not need them |
| [Gradle User Manual — Configuration Cache requirements](https://docs.gradle.org/current/userguide/configuration_cache_requirements.html) | Primary Gradle docs | Gradle 9.x current | `ValueSource`/`BuildService`/`ExecOperations` direction rule already settled for the plugin side (GRADLE-PLUG-07/08/09) — the structural mirror this dive's env-classification discipline (candidate 8) is checked against |
| `ocx-sdk-python/src/ocx_sdk/_process.py` (repo, local checkout, HEAD) | The measured sync/async subprocess module this dive translates | 2026, contract v0.1 C-010 | `PopenFactory`/`ExecFactory` seams, the pump-thread constants, the kill ladder (`_kill_ladder`/`_kill_ladder_async`/`_reap`), stdout-never-redacted invariant |
| `ocx-sdk-python/src/ocx_sdk/_errors.py` (repo, local checkout, HEAD) | The measured exit-code/exception hierarchy this dive translates | 2026, contract C-001 | The 16-member `ExitCode(IntEnum)`, `OcxProcessError.retryable`'s fixed-property design, `_EXIT_CODE_ERRORS` dict as the exit→exception map |
| `ocx-sdk-python/src/ocx_sdk/_retry.py` (repo, local checkout, HEAD) | The measured retry driver | 2026, contract C-004 | Confirms the retry loop's classification is by exit code (`_process`) vs. transport condition (`_dist`), never by stderr text — the retry-before-exception ordering candidate 10 relies on |
| `rules_ocx/AGENTS.md` (repo, local checkout) | The measured Bazel-side CLI-contract prior art | 2026, verified against ocx 0.6.0 | The 14-sysexit table, the "75 retried before fail()" invariant, `OCX_ENV_CLASSES`'s four-class table with exact membership and counts |
| [jvm-topic-map.md](../jvm-topic-map.md) (this program, consolidated wave 1–3) | Internal consolidation, not primary, cited for cross-family context only | 2026-09-12 | `M-N-*`/`M-Y-02` rows framing the concurrency-family scope this dive sits inside, and the sibling dive's ownership boundary for virtual-thread/structured-concurrency guidance not re-derived here |
| [jvm-gradle-plugin-dev.md](../jvm-gradle-plugin-dev.md) (this program, wave 2 consolidation) | Internal consolidation | 2026-09-12 | GRADLE-PLUG-07/08/09's settled `ValueSource`→`BuildService`→`ExecOperations` spine — cited, not re-derived, per this dive's brief |
| [jvm-language-api.md](../jvm-language-api.md) (this program, wave 2 consolidation) | Internal consolidation | 2026-09-12 | JAVA-API-14 (hand-maintained exit-code enum) and JAVA-API-15 (zero-runtime-dependency commitment) — decision (d) is confirmed, not re-opened, against these |
| [config-inventory.md](../jvm-audit/config-inventory.md) (this program, jvm-audit) | Internal audit, numbers-first | 2026-09-05 | Axis 3/4's side-by-side table of `ocx-sdk-python` and `rules_ocx` commitments, including the exact byte-for-byte agreement claim on the 16-sysexit table |
| [Managing Processes Asynchronously (onExit)](https://docs.oracle.com/en/java/javase/22/core/managing-processes-asynchronously-onexit-method.html) | Oracle Java Platform Guide, worked example | JDK 22-era guide, mechanism unchanged through 25 | Worked `onExit().thenApply(...)` example matching this dive's recommended async-path shape |
| [Differences in Process#destroy() between Windows and Unix — core-libs-dev](https://mail.openjdk.org/pipermail/core-libs-dev/2010-November/005159.html) | OpenJDK mailing-list discussion among JDK maintainers | 2010, describes long-standing behavior unchanged through JDK 25 | Confirms, from the implementers themselves, that `destroy()` is SIGTERM on Unix and forcible `TerminateProcess` on Windows — the platform asymmetry candidate 3's kill ladder must account for |
