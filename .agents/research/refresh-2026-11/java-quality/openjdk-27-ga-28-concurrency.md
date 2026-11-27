---
title: OpenJDK 27 GA and JDK 28 concurrency delta
pair: java-quality
date_researched: 2026-11-27
window_start: 2026-09-12
model: sonnet
sources_fetched: 12
---

# OpenJDK 27 GA and JDK 28 concurrency delta

Facts verified 2026-11-27. Baseline: jvm-concurrency.md, revised 2026-09-12. This is a delta, not a re-creation. Everything not listed here is unchanged.

Method note: WebFetch received HTTP 403 from openjdk.org, so every page below was fetched with curl and stripped to text. All sources are primary: openjdk.org JEP and project pages, the Oracle-hosted JDK 27 javadoc, jdk.java.net, the openjdk/jdk GitHub tree, and the HikariCP issue page.

## Headline

JEP 533 reached GA in JDK 27 with its API intact, and JDK 28 carries a final structured-concurrency JEP, so the "preview through 27, finalisation targeted at 28" row is now stale in one direction: finalisation is no longer a target but an integrated change. JDK 28 is not yet released (GA scheduled 2027-03-09), so JDK 28 still has a preview-until-GA caveat for published code.

## Answers to the four decisions

### 1. Did JEP 533 ship unchanged at GA? Yes, member by member

Sources: https://openjdk.org/jeps/533 (header: Status Closed / Delivered, Release 27, Updated 2026/08/19) and the JDK 27 javadoc (https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/util/concurrent/StructuredTaskScope.html, `.Joiner.html`, `.Subtask.html`). The javadoc still marks every type as a preview API.

- Third type parameter: shipped. `StructuredTaskScope<T, R, R_X extends Throwable>` and `Joiner<T, R, R_X extends Throwable>`.
- New `open(UnaryOperator<Configuration>)` and `open(Joiner, UnaryOperator<Configuration>)`: shipped, alongside `open()` and `open(Joiner)`.
- `allSuccessfulOrThrow()`, `anySuccessfulOrThrow()`, `awaitAllSuccessfulOrThrow()` with `Function<Throwable, R_X>` overloads: shipped.
- `Joiner.awaitAll()` removed: confirmed absent from the Joiner method summary (present: `allSuccessfulOrThrow`, `anySuccessfulOrThrow`, `awaitAllSuccessfulOrThrow`, `allUntil(Predicate)`, `onFork`, `onComplete`, `result`, `timeout`).
- `onTimeout()` replaced by `timeout()`: shipped, `R timeout()` is the abstract method; `CancelledByTimeoutException` is the cause when it throws.
- `Subtask` (`state()`, `get()`, `exception()`) and `StructuredTaskScope` (`fork` x2, `join`, `isCancelled`, `close`): unchanged.

### 2. Does JDK 28 carry a structured-concurrency JEP? Yes: JEP 543, final

Source: https://openjdk.org/jeps/543 (Structured Concurrency; header Scope SE, Status Integrated, Release 28, Updated 2026/10/17) and https://openjdk.org/projects/jdk/28/ (last updated 2026/11/24, lists 543 as targeted). The JEP text says: "We here propose to finalize Structured Concurrency in JDK 28, without further change." It is not another preview. The title carries no "(Eighth Preview)".

Caveat on the existing re-check heuristic: the JEP header field "Scope: SE" does not signal finality. JEP 505 and JEP 525, both previews, also show Scope SE (it names the specification scope). The correct signal is the title losing its "Preview" ordinal plus the javadoc losing the `PREVIEW` marker. JDK 28 schedule: Rampdown One 2026/12/03, RC 2027/02/04 to 2027/02/16, GA 2027/03/09. JDK 28 EA builds exist; the final API ships only at GA.

### 3. Pinning and the JFR event

- JEP 491 text (https://openjdk.org/jeps/491) still lists two remaining pinning cases: a native frame on the stack, and blocking inside a class initializer. No JDK 26, 27 or 28 JEP addresses either; the JDK 28 JEP list (401, 535, 539 to 548) has no virtual-thread or pinning entry, and the JDK 27 JEP list (523, 527, 531 to 534, 536 to 538) has none either. This is absence in the JEP lists. A JBS-level fix for a specific case could not be searched and is "could not determine".
- JFR default threshold: unchanged at 20 ms. `jdk.VirtualThreadPinned` is `enabled=true`, `stackTrace=true`, `threshold=20 ms` in both `default.jfc` and `profile.jfc` on the current openjdk/jdk master (https://raw.githubusercontent.com/openjdk/jdk/master/src/jdk.jfr/share/conf/jfr/default.jfc, `profile.jfc`). Master is the JDK 28 line. The tag-27 file itself was not fetched.

### 4. HikariCP #1463

Source: https://github.com/brettwooldridge/HikariCP/issues/1463 fetched 2026-11-27. State: Open. Title "Make HikariCP loom friendly", opened 2019-10-07. Last comment 2025-04-12 (maintainer asking for a stack trace after a JDK 24 hang report). No linked PR, no labels. A commenter states JDK 24 can still pin in static initializers. No activity in the window; still open.

## Claim-by-claim outcomes

Claims quote concurrency.md.

1. Dates and Floors: "`StructuredTaskScope` is still preview through JDK 27 (JEP 505 / 525 / 533, finalisation targeted at 28)." Outcome: changed. New text: "`StructuredTaskScope` is preview through JDK 27 (JEP 505 / 525 / 533) and final in JDK 28 via JEP 543, integrated, GA scheduled 2027-03-09." Source https://openjdk.org/jeps/543, change date 2026-10-17 (JEP updated), project page 2026-11-24.
2. Same row, "JDK 27 reached GA 2026-09-15, after these rows were written against the RC." Outcome: unchanged as a fact, confirmed at https://openjdk.org/projects/jdk/27/ ("General Availability on 15 September 2026"). The "against the RC" qualifier can go: the JEP 533 API at GA matches the RC description.
3. "re-check JAVA-CONC-05 when the JEP header flips to `Scope: SE`". Outcome: changed. The header is already `Scope: SE` on the preview JEPs 505 and 525, so the trigger is wrong. Replacement: "re-check JAVA-CONC-05 when JDK 28 reaches GA (scheduled 2027-03-09) and the javadoc drops the preview marker." Source: https://openjdk.org/jeps/525 header, https://openjdk.org/projects/jdk/28/.
4. JAVA-CONC-06: "at 27 a third `R_X` type parameter arrived, `awaitAll()` was removed and `onTimeout()` became `timeout()`". Outcome: unchanged, verified against GA javadoc. Add: JEP 543 finalises 27's shape "without further change", so the same names hold on a final JDK 28. What Agents Get Wrong item 4 (three compile-breakers): unchanged. The grep for `onTimeout(` in JDK-27-targeted code stays correct. Not yet checked is a JDK 28 EA javadoc for any change after 2026-10-17.
5. JAVA-CONC-05: "A jar built with `--enable-preview` on JDK 26 does not run on JDK 27". Outcome: unchanged. JEP 12 still states a JVM "will not load a class file that depends on the preview features of any Java SE release" when preview is not enabled (https://openjdk.org/jeps/12), and 27 shipped a changed shape (third type parameter, removed `awaitAll`). A JDK 28 final API means a JDK 28 class built without `--enable-preview` is loadable. Optional addition: "a JDK 27 jar built with `--enable-preview` will not run on JDK 28", by the same JEP 12 rule (exact-release match); this is an inference, not a quoted source statement.
6. What Agents Get Wrong item 7, "final since 21 versus preview at 27": could not locate the exact quote in context; the grep output lines were not fully inspected. Outcome: if it refers to `StructuredTaskScope` preview at 27, unchanged as of 27; it becomes stale for 28 at GA.
7. JAVA-CONC-07: "JDK 25 (JEP 506) finalised `ScopedValue`, and `orElse` no longer accepts `null`." Outcome: unchanged. JDK 27 javadoc for `ScopedValue` says "Unless otherwise specified, passing a null argument to a method in this class will cause a NullPointerException to be thrown" and shows `orElse(T other)` without a null exception to that rule (https://docs.oracle.com/en/java/javase/27/docs/api/java.base/java/lang/ScopedValue.html).
8. JAVA-CONC-04: "on by default at a 20 ms threshold". Outcome: unchanged (see decision 3).
9. JAVA-CONC-03: "JDK 24 still pins in a `static` initializer: HikariCP #1463 is a live report". Outcome: unchanged. JEP 491 still lists class-initializer blocking as pinning, and the issue is open. Weak point: the issue's last activity is 2025-04-12 and the thread is mostly a general "make Hikari loom friendly" request, so "live report of exactly that case" is generous; one commenter makes the static-initializer remark. Suggested hedge below.
10. JAVA-CONC-11: "`waitFor(Duration)` is JDK 24 sugar". Outcome: unchanged, JDK 27 javadoc for `Process.waitFor(Duration)` shows `Since: 24`.
11. Rule index non-negotiable 13 (depends on the JAVA-CONC-05 and 06 wording): unchanged now; it must be revisited at JDK 28 GA, not before.

## Normative candidates

1. Rewrite the "Dates and Floors" `StructuredTaskScope` row to record JEP 543 as the finalising JEP, with GA 2027-03-09 as the point at which the preview rule JAVA-CONC-05 stops applying to a JDK 28 floor. Rationale: the current text says finalisation is only "targeted", which is now wrong. Verification: grep the pair for "targeted at 28" and "finalisation targeted"; open https://openjdk.org/jeps/543 and confirm status Integrated or Closed / Delivered.
2. Replace the re-check trigger "JEP header flips to `Scope: SE`" with "JDK 28 javadoc no longer marks `StructuredTaskScope` as a preview API". Rationale: Scope SE is already present on JEP 505 and 525, so the trigger as written would fire immediately or never. Verification: `curl -s https://openjdk.org/jeps/525 | grep -o 'Scope.\{0,8\}'`.
3. Keep JAVA-CONC-05 and 06 as-is until JDK 28 GA, then re-fetch the JDK 28 `StructuredTaskScope` javadoc and compare against JDK 27's member list above. Rationale: JEP 543 says "without further change" but the final text was last updated 2026-10-17 and JDK 28 is not released. Verification: diff the JDK 27 and 28 Joiner method summaries.
4. Hedge JAVA-CONC-03's HikariCP clause: "HikariCP #1463 is an open loom-friendliness thread, last active 2025-04-12". Rationale: more accurate than "live report of exactly that case". Verification: reread the issue page.

## Pending upstream and not determined

- JDK 28 GA (2027-03-09) and its final javadoc: pending.
- Any JBS-level fix for the native-frame or class-initializer pinning cases in 26 to 28: could not determine, no JEP-level change found.
- The tag-27 `default.jfc` was not fetched (master only); the master value is 20 ms.
- JDK 27 GA release notes proper were not retrieved: https://jdk.java.net/27/release-notes now shows the 27.0.1.1 update release notes (2026-11-17), which contain no concurrency items.
- Exact text of What Agents Get Wrong item 7 not re-read.
