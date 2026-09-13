---
title: Failures and Resources
summary: The JAVA-ERR family, covering what happens to a Throwable once it exists, what closes what you opened, and why library code never ends the process
---

# Failures and Resources

`JAVA-ERR` owns the fate of a `Throwable` once it exists and of a handle once it
is acquired: which exceptions may be caught, what a rethrow carries, what gets
closed, and whether library code may end the process. It does not own which
analyzer runs at what severity in which build file, which is `JAVA-LINT`'s
(`lint-gate.md` in this rule set), and it does not own the shapes that make
outside data dangerous in the first place, which are `JAVA-SEC`'s
(`security-and-untrusted-input.md`: the filtered `readObject`, XML factory
hardening, path containment, and the array form of `ProcessBuilder`). Pool
sizing, the virtual-thread-per-task regime and `CompletableFuture` exception
loss belong to `JAVA-CONC` (`concurrency.md`). Kotlin's half of this family is
`KT-ERR`, in the `kotlin-quality` rule set, and it is not a translation: three
of its five rows have no detekt equivalent at any configuration, and one of them
is stronger than the Java gate.

Contents: [What the Gate Does Not Catch](#what-the-gate-does-not-catch) ·
[Rules That Need a Promotion First](#rules-that-need-a-promotion-first) ·
[On by Default in Error Prone](#on-by-default-in-error-prone) ·
[Caught by a javac Flag or by SpotBugs](#caught-by-a-javac-flag-or-by-spotbugs) ·
[No Gate Exists](#no-gate-exists) ·
[What Agents Get Wrong Here](#what-agents-get-wrong-here)

## What the Gate Does Not Catch

- **The single most characteristic agent-written Java failure is silent in every
  default configuration measured.** `CatchingUnchecked`, `UnusedException` and
  `InterruptedExceptionSwallowed` are all in Error Prone 2.36.0's
  `DISABLED_CHECKS` (read from `BuiltInCheckerSuppliers.java`, verified
  2026-09-12). The docs site's severity field does not tell you what runs. The
  promotion itself is `JAVA-LINT-02`'s row, stated there once and not restated
  here: this family states the code shape, `JAVA-LINT` states the flag.
- **Three SonarJava keys below are cited from the catalogue, not verified.**
  `S2095`, `S1181` and `S2142` were not independently checked as of 2026-09-12.
  Before treating SonarQube as this family's gate, confirm each key is
  Community-tier and rendered as an Issue rather than a Security Hotspot. A
  Security Hotspot is invisible to the usual "no new Issues" quality gate, which
  is exactly how `JAVA-ERR-07` loses its Sonar coverage.
- **Error Prone measured 11/32 in the reference corpus and SpotBugs as a real
  gate 2/32 (2026-09-12), so 21/32 run neither.** Assume the rules below are
  enforced by reading unless the build file proves otherwise, and never reach
  green by weakening a check that does run (`JAVA-CORE-01`).

## Rules That Need a Promotion First

Error Prone catches all three of these, and ships with all three off. One check
covers the section: every promoted name must appear in the build's compiler
options.

```bash
grep -rn -e 'InterruptedExceptionSwallowed' -e 'UnusedException' \
  -e 'CatchingUnchecked' --include='*.gradle.kts' --include='*.gradle' \
  --include='pom.xml' .
```

Fewer than three names is the finding, and empty output is the finding, not the
pass. Until that grep is clean, every row here is enforced by reading.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-ERR-01 | A caught `InterruptedException`, including one caught implicitly by a wider `catch (Exception)` or `catch (Throwable)`, must either call `Thread.currentThread().interrupt()` or propagate. Never log it like any other exception. | Swallowing it clears cooperative cancellation for every caller up the stack. Two distinct mistakes hide here: calling `Thread.interrupted()`, which *clears* the bit, instead of `currentThread().interrupt()`, and never noticing the interrupt was caught at all. A blocking call inside a Gradle `ValueSource` or `BuildService` that swallows the interrupt breaks build cancellation. | `InterruptedInCatchBlock` (Error Prone 2.36.0 `ENABLED_WARNINGS`, verified 2026-09-12) catches only the first mistake. The second needs `-Xep:InterruptedExceptionSwallowed:ERROR`. Reading check: `grep -rn --include='*.java' -e 'catch (InterruptedException' -e 'catch (Exception' -e 'catch (Throwable' src/`, then for each hit whose `try` block calls `await(`, `wait(`, `join(`, `sleep(`, `waitFor(` or `.get(`, require `interrupt()` or a rethrow in the body. Empty output is the pass. Kotlin side: `KT-ERR-02`, where no detekt rule exists at any version. | MUST |
| JAVA-ERR-04 | Never construct a new exception from a caught one without passing it as the cause. `new SomeException("...: " + e.getMessage())` is always wrong. | It *looks* like the failure survived, because the message string does, while the stack trace, the exception type and every suppressed exception are discarded. A typed exception mapping a child process's exit code carries the underlying `IOException` or `InterruptedException` as its cause, never a reformatted string. | `-Xep:UnusedException:ERROR` catches the general shape. The specific one: `grep -rnE --include='*.java' 'new \w*Exception\([^,)]*\.getMessage\(\)\)' src/`. Any hit is the finding, and empty output is the pass. For a deliberate ignore, name the variable `unused` or `_`, which is the convention the check itself recognises. Kotlin side: `KT-ERR-04`, where detekt's `SwallowedException` covers it on by default. | MUST |
| JAVA-ERR-02 | Do not catch `Throwable` or `Error`, except at one documented top-level boundary such as a framework's uncaught-exception hook. In test code this is not a style point: `fail()` and every `assert*` throw `AssertionError`, so `try { ...; fail(); } catch (Throwable t) { }` makes the test structurally unable to fail. | Production: masks `OutOfMemoryError` and `StackOverflowError`. Test: masks the assertion itself, which is the failure mode an agent writing a negative test reaches for by default. | `TryFailThrowable` (Error Prone `ENABLED_ERRORS`, on by default) covers the test shape only. Reading check for the production shape: `grep -rnE --include='*.java' -e 'catch \(\s*Throwable' -e 'catch \(\s*Error' src/`. Any hit outside one documented boundary is the finding, and empty output is the pass. SonarJava `S1181` covers it where SonarQube runs, subject to the key caveat above. Kotlin side: `KT-ERR-01`, the same mistake wearing `runCatching` instead of a keyword and invisible to every lint. | MUST |

```java
// wrong: the interrupt bit is dropped and every caller keeps waiting
try { process.waitFor(1, MINUTES); }
catch (Exception e) { throw new RuntimeException(e); }
```

```java
// right: restore the bit before the stack unwinds
try { process.waitFor(1, MINUTES); }
catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new RuntimeException(e); }
```

## On by Default in Error Prone

`StreamResourceLeak`, `MustBeClosedChecker` and `CatchAndPrintStackTrace` all
fire under a plain Error Prone run (2.36.0, verified 2026-09-12), so the gate
here is the compile itself and the only way to lose it is to turn it off:

```bash
grep -rn -e 'StreamResourceLeak:OFF' -e 'MustBeClosedChecker:OFF' \
  -e 'CatchAndPrintStackTrace:OFF' -e 'disableAllWarnings' \
  --include='*.gradle.kts' --include='*.gradle' --include='pom.xml' .
```

Any hit is the finding, and empty output is the pass. A `@SuppressWarnings` for
one of these three names carries a reason on the annotation line or the line
above it, or it is the finding (`JAVA-LINT-03`).

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-ERR-03 | Acquire every `Closeable` and `AutoCloseable` inside try-with-resources, including the `Stream` returned by `Files.walk`, `list`, `lines`, `find` and `newDirectoryStream`, and including a wrapping stream such as `ObjectInputStream` whose inner stream is closed separately. | `Stream<String>`'s type signature gives no hint that it holds an open file descriptor. The JDK's own `Files` javadoc says `lines` "encapsulates a `Reader`" and the other four "encapsulate one or more `DirectoryStream`s". Closing only the wrapped stream leaves the wrapper's own buffers and state unreleased. | `StreamResourceLeak` and `MustBeClosedChecker`, both on by default, plus SonarJava `S2095` where SonarQube runs (key unverified, see above). Do not name PMD `CloseResource` as a third option: SonarSource records `S2095` as having deprecated it, and PMD is enforced 0/32. Reading check: `grep -rn --include='*.java' -e 'Files.walk(' -e 'Files.lines(' -e 'Files.list(' -e 'Files.find(' -e 'Files.newDirectoryStream(' src/`. A hit is not itself the finding, a hit whose line is not inside a `try (` header is. Empty output is the pass. Kotlin side: `KT-ERR-03`, where the type-level gap is worse. | MUST |
| JAVA-ERR-07 | Library code, meaning anything that is not a CLI `main`, never calls `System.exit()` and never calls `printStackTrace()` in place of the configured logger. Translate a child process's exit code into a typed exception instead of re-raising it as your own. | A library must not own process lifecycle, and a `printStackTrace()` call writes past log aggregation and past every log level. Sharper for a build plugin than for the generic case: `System.exit()` from plugin code kills the Gradle daemon mid-build. | `CatchAndPrintStackTrace` (on by default) covers the second half and reports as an ordinary compiler diagnostic. SpotBugs `DM_EXIT` covers the first half where SpotBugs is in the gate. **Do not rely on SonarJava `S4507`**: it is a Security Hotspot, invisible to a "no new Issues" quality gate. Reading check: `grep -rn --include='*.java' -e '.printStackTrace()' -e 'System.exit(' src/main/`. Any hit is the finding, and empty output is the pass. Kotlin side: `KT-ERR-05`, one detekt rule over four call shapes, shipped `active: false`. | MUST for a library, an SDK or a build plugin. N/A for a CLI entry point |

```java
// wrong: the file descriptor outlives the statement, and the type says nothing
List<String> out = Files.lines(p).map(String::trim).toList();
```

```java
// right: the stream is a resource, so it gets a resource block
try (Stream<String> lines = Files.lines(p)) { return lines.map(String::trim).toList(); }
```

## Caught by a javac Flag or by SpotBugs

Error Prone has no equivalent for either row at any promotion level. The first
is a compiler flag: `-Xlint:removal -Werror` fails the build outright, and
`removal` is in `JAVA-LINT-07`'s enumerated key list for exactly this reason.
The second needs SpotBugs actually wired into the gate (`JAVA-LINT-10`), and its
standalone check is a two-stage grep:

```bash
grep -rl --include='*.java' 'implements Serializable' src/ | xargs -r grep -L 'serialVersionUID'
```

Every file named is a finding. Empty output is the pass.

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-ERR-06 | Do not override `finalize()`. Use try-with-resources for scoped cleanup and `java.lang.ref.Cleaner` for GC-triggered cleanup of a native handle. | Terminally deprecated since JDK 18 ([JEP 421](https://openjdk.org/jeps/421), verified 2026-09-12) for unpredictable latency and resurrection risk. `Cleaner` (JDK 9) gives the same GC trigger without either. | `-Xlint:removal -Werror` fails the build. Reading check: `grep -rn --include='*.java' 'void finalize(' src/`. Any hit is the finding, and empty output is the pass. | MUST |
| JAVA-ERR-08 | Every `Serializable` class declares an explicit `private static final long serialVersionUID`. | An implicit UID is computed from the class's structure and changes silently on an innocuous edit or a compiler upgrade, breaking deserialization of already-persisted instances. | SpotBugs `SE_NO_SERIALVERSIONID` (`BAD_PRACTICE`, detector on by default) or SonarJava `S2057`, where either is a gating step rather than a reporting one. Otherwise the two-stage grep above. | SHOULD |

## No Gate Exists

Reading only. Nothing mechanical catches "this blocking call has no timeout".

| ID | Rule | Rationale | Verification | Severity |
|---|---|---|---|---|
| JAVA-ERR-05 | Shut down every `ExecutorService` on every exit path. If you use JDK 19's `close()` through try-with-resources, know that it blocks **indefinitely**: there is no timeout parameter, unlike `shutdown()` plus `awaitTermination(t, unit)` plus `shutdownNow()`. | Porting bounded shutdown code to `try (var pool = ...)` silently removes the bound `awaitTermination(30, SECONDS)` used to provide, turning a slow task into a hung build. The JDK 19 javadoc is explicit that `close()` waits until all tasks have completed execution. | `grep -rn --include='*.java' -e 'Executors.new' -e 'ExecutorService' src/` locates the pools. Empty output means there are none, which is a pass. For each hit, confirm a `shutdown()` or a resource block on every path, and for `close()`-based code confirm the call site tolerates an unbounded wait. Pool sizing and the virtual-thread-per-task regime are `JAVA-CONC`'s, not this rule's. | MUST |

**Sneaky-throw gets no rule in either direction, deliberately.** Prefer wrapping
a checked exception in a standard unchecked one (`UncheckedIOException`,
`IllegalStateException(cause)`). A local `sneakyThrow` helper built on the
`<E extends Throwable> void f(Throwable t) throws E` erasure idiom opens a review
conversation, never a lint failure: Brian Goetz calls advising it
"irresponsible", Heinz Kabutz documents the narrow legitimate case of
implementing a functional interface or overriding a method that cannot declare
the checked exception, and as of 2026-09-12 neither position has displaced the
other. Kotlin has no checked exceptions, so this contest has no `KT-ERR`
counterpart.

## What Agents Get Wrong Here

1. **`catch (Exception e) { log.error("failed", e); }` and move on.** Compiles,
   looks responsible, and is silent under every default configuration measured.
   The highest-frequency failure in this family by a wide margin.
2. **`new ServiceException("read failed: " + e.getMessage())`.** Reads as if the
   failure survived. Volunteered unprompted when asked to "improve the error
   message", and it destroys the stack trace in the same edit.
3. **`Files.lines(p).map(...).collect(...)` as a one-liner.** Trained on tutorial
   snippets whose process exits immediately afterwards, so the leak never showed.
   `StreamResourceLeak` is on by default, so the only way to reach production
   with this is to have disabled it.
4. **`e.printStackTrace()` in an error callback.** Not invented by the model:
   Kafka's own published `KafkaProducer` javadoc teaches it in the async
   `send(record, Callback)` example, which is the one place every copy-paste and
   every training corpus reads it.
5. **`catch (InterruptedException e) { /* ignore */ }`, or logging it like
   anything else.** An agent asked to "add error handling around this blocking
   call" treats it as just another checked exception. Nothing catches it by
   default, and in Kotlin nothing catches it at any configuration.
6. **`try { ...; fail(); } catch (Throwable t) { }` as a negative test.** The
   assertion throws `AssertionError`, the catch eats it, and the test can never
   fail. Reaching for `catch (Throwable)` is the reflex when a test needs to
   "check that it throws".
7. **`try (var pool = Executors.newFixedThreadPool(n))` assumed strictly
   better.** An agent that knows `ExecutorService` became `AutoCloseable` in JDK
   19 does not know `close()` has no timeout, so the bound disappears in what
   looks like a modernisation.
8. **Citing deprecated SonarJava `S1148`, or citing `S4507` without knowing it is
   a Security Hotspot.** Do not route this family through Sonar at all: use
   `CatchAndPrintStackTrace` or the grep.
9. **"SpotBugs is declared in the POM" read as "SpotBugs runs in CI."** A
   `<reporting>` block only `mvn site` invokes is not a gate, and neither is a
   task carrying `ignoreFailures = true`. `JAVA-ERR-08`'s only tool depends on
   this being checked rather than assumed.
