---
title: "Swift concurrency (SW-CONC): consolidated ruleset"
topic: "Swift 6.4-era concurrency: isolation, Sendable and the escape hatches; tasks, cancellation, continuations and GCD in async code"
model: sonnet
id_family: SW-CONC
consolidates:
  - swift-concurrency/isolation-and-sendable.md
  - swift-concurrency/tasks-and-cancellation.md
  - swift-concurrency/backpressure-and-cleanup.md
date: 2026-10-10
revised: 2026-10-10
---

# Swift concurrency (SW-CONC): consolidated ruleset

Toolchains: Swift 6.4.0 (released 2026-09-14) and 6.3.x, Linux x86_64 only; the revision's fixtures also pin swift-async-algorithms 1.1.7 and swift-subprocess 1.0.1. Apple, Windows and Android behaviour is "unverified: read only" (owner Q7). Citation tags: `[iso §n]`, `[tasks §n]` and `[bp §n]` are findings in the three sub-artifacts; `I-Vn`, `T-Vnn` and `B-Vnn` are their Verification-run rows (the three tables reuse numbers, so the prefix is mandatory); `B-Cn` are the grep checks of the backpressure round (its `checks.sh`); `R1..R8` are re-runs by the first consolidation, `R9..R12` by the 2026-10-10 revision and `R13..R14` by the revision's verification pass (table at the end of the ruleset); `[conc]`, `[gates]` and `[cfg]` are the audits under `swift-audit/`. Exemplar cites are repo@sha12:path:line. The Revision log near the end lists every change made after the first consolidation.

## Verdict

1. **Hatches are allowed, never free.** `@unchecked Sendable` needs a failed removal test, a guard visible in the type body, and a comment naming the guard (SW-CONC-01); `nonisolated(unsafe)` needs a reason, and a named lock when it is a `var` (SW-CONC-09). Never a ban: a ban would indict swift-nio. The reason checks gate *changed* files, not the tree: 380 of 554 corpus `@unchecked` lines carry no comment (R8).
2. **The fix ladder decides before any hatch** (SW-CONC-28): delete the sharing, value type or `let`, `@MainActor`, `sending`, `Mutex<State>` in a `final class: Sendable`, a commented `actor`, per-import `@preconcurrency`, hatch last. `Mutex` is the default shared-state tool (SW-CONC-02, -29); a `Mutex`-only class is plain `Sendable`.
3. **Isolation settings follow the code kind.** Library, SDK, CLI, daemon and server never set `defaultIsolation(MainActor.self)`; apps and app-internal UI packages may (SW-CONC-11). Libraries prove they survive a consumer's defaults with a `CompileTests/` package (SW-CONC-06).
4. **`NonisolatedNonsendingByDefault` (NNBD): enable by name in new targets, migrate existing ones, never paste.** The flip changes behaviour with no diagnostic (exit 132 versus 0, re-run R6). The template's `ApproachableConcurrency` bundle is stripped: in Swift 6 mode it adds only NNBD and `InferIsolatedConformances` (SW-CONC-07, -12).
5. **Every unstructured `Task` has an owner**: MUST for library, SDK, CLI and server code, SHOULD for app code (SW-CONC-13). The 6.4 compiler group `NoUseUnstructuredThrowingTask` is a second net on 6.4 legs only; SwiftLint's `unhandled_throwing_task` is optional (SW-CONC-03).
6. **Never block the cooperative pool or the main actor** (SW-CONC-15). Off-pool blocking uses a dedicated `Thread`, a private `DispatchQueue(label:)` or `NIOThreadPool` behind one cancellable continuation. Neither `@concurrent` nor `DispatchQueue.global()` is off-pool on Linux (R7); this overturns a line in the tasks dive.
7. **Cancellation is cooperative and rarely observed.** Continuations are checked, once-guarded and cancel-aware (SW-CONC-22); no `try?` on a cancellation point in a loop (SW-CONC-17); `AsyncChannel.send` swallows cancellation silently, so every send loop checks it (SW-CONC-35); timeouts return a `TimeoutError` from a structured race until `withDeadline` ships (Swift 6.5, absent in 6.4) (SW-CONC-24).
8. **Gates are shell greps and compiler flags.** SwiftLint `custom_rules` fail open on the static Linux binary (R5) and run only in the SourceKit-enabled image (R11), so a mirror needs a live-rule canary; `LIBDISPATCH_COOPERATIVE_POOL_STRICT` is a no-op on Linux (T-V12); ThreadSanitizer is advisory (SW-CONC-21, -27).
9. **23 source conflicts are resolved below.** Four change a topic-map decision: custom_rules cannot be the grep vehicle on the static Linux binary (the SourceKit image runs them; narrowed in the revision, conflict 7); `.treatWarning` in a manifest is not the default promotion form; `StrictMemorySafety` is not an `@unchecked` audit; the bundle is replaced by explicit names. Conflicts 17 to 23 came with the revision and amend SW-CONC-18, -19, -20, -21 (conflict 7), -23 and -34 in place.
10. **Streams are bounded by data kind** (SW-CONC-18, -30, -35). Pull sources use `AsyncStream(unfolding:)` (lossless, 12,248 KiB), lossy push uses `.bufferingNewest(n >= 1)` (12,184 KiB), lossless push uses `AsyncChannel` only where swift-async-algorithms is already a dependency (server, CLI-internal and app code, never the SDK); the default `.unbounded` peaked at 138,956 KiB for the same 2,000 × 64 KiB flood. `bufferingNewest(0)` delivers nothing.
11. **An accept loop caps its in-flight children** (SW-CONC-31). Default: a `group.next()` window on a plain `withTaskGroup(of: Void.self)` (256 in flight, 26,540 KiB, against 10,000 in flight and 201,060 KiB for a bare discarding group). A discarding group alone is not a cap and has no `next()`; a plain Void group is legal only when drained (SW-CONC-19).
12. **Cleanup that awaits is shielded, bounded and signal-safe** (SW-CONC-32, -33, -34). `defer { await withTaskCancellationShield { … } }` on 6.4; `await Task { … }.value` on both exits below 6.4, because a plain `await` on the cancel path aborts as soon as the cleanup reaches a cancellation point (R9, exit 1; the stand-in flush was a `Task.sleep`, and a third-party `close()` cannot be assumed to avoid one); a shield bounds nothing, so the cleanup races a deadline inside it and the CLI keeps the second-press escape; signal sources are installed from a nonisolated function, never inline in `main.swift` and never in a `@MainActor` function or type (R13).
13. **Documented gaps (researched, not answered; none is a rule).** (a) 6.4 has no first-party bounded lossless stream: SE-0406 was "Returned for revision" on 2023-09-13 and `AsyncStream.swift` is unchanged at `swift-6.4.0-RELEASE`. The package channels are the only answer, and the SDK's dependency budget (owner Q4) excludes them (6,244,408 B against 83,160 B), so a lossless push source in the SDK has no backpressure primitive: it becomes a pull source, a lossy bounded one, or an annotated `.unbounded`. (b) The multi-producer channel is not source-stable: its `~Copyable` `Source` cannot be captured by a child task in Swift 6 mode, `.unbounded()` is documented but absent in 1.1.7, and `AsyncStreaming` sits behind the `UnstableAsyncStreaming` trait. (c) Whether hummingbird, grpc-swift-2, vapor and the NIO servers bound inbound connections at the listener is unmeasured, so SW-CONC-31 binds the loop you write. (d) "Every shield has a deadline" (SW-CONC-33) has no mechanical check, only a hang-stub test and a reading step. (e) Darwin and Windows runs of the shield, the signal source and the channels do not exist (unverified: read only). (f) "Exit 132" is not a stable gate for a trap on a libdispatch worker thread: with the image's default Swift backtracer a handler that traps while the main thread is still running printed `Program crashed: Illegal instruction`, then the process ran on and exited 0 in 9 of 9 runs (a parked main exited 132 in 3 of 3; `SWIFT_BACKTRACE=enable=no` gave 132 in 6 of 6) (R14). SW-CONC-34 gates with `SWIFT_BACKTRACE=enable=no` plus the handler's side effect, and SW-CONC-26's callback path (the same shape; I-V13 was not re-run) takes the same precaution. SW-CONC-07's 132 re-ran stable under the default backtracer (R14); SW-CONC-22's 132 was not re-run.

## The ruleset

### Conflicts resolved

| # | Conflict | Decision | Reason |
|---|---|---|---|
| 1 | Rule IDs: iso numbers `SW-CONC-01..18`, tasks numbers `SW-CONC-T01..T16` | One numbering, `SW-CONC-01..29`; crosswalk at the end. The revision appends `-30..-35` and never renumbers | The families collide in the catalog (0 existing `SW-` IDs, [cfg]) |
| 2 | `MainActor.run`: tasks T04 bans it in async code; topic-map conflict 24 says "a tell, not a ban"; iso 12 lists it as a site to justify | A tell to justify (SW-CONC-16, SHOULD), split from the MUST blocking-primitive grep (SW-CONC-15) | 23 corpus uses against 614 `@MainActor`: the exemplars cannot ground a ban; it is an agent habit ([conc] Axis 4) |
| 3 | tasks T03 offers "a `nonisolated` async function" as the way off the actor; iso 09 enables NNBD for new code | With NNBD on, only `@concurrent` leaves the caller's actor: `f()` printed `Optional(Swift.MainActor)` with NNBD and `nil` without (I-V9). `@concurrent` still runs on the cooperative pool (R7: 31 blocked calls pass, 32 hang) | Two measurements, one source tree |
| 4 | tasks §7 says "GCD spawns threads until the system limit", so `DispatchQueue.global()` hides pool starvation harmlessly; `apple/containerization@3e7bc39e66b3:Sources/Containerization/CHStdioPortSlot.swift:120-127` says the global queue "spawns OS threads on demand" | On Linux it does not: 48 blocked calls pass, 56 and 64 hang (R7, 6.4; 64 on 6.3). A private `DispatchQueue(label:)` and a `Thread` scaled to 256. Use those or `NIOThreadPool`; `DispatchQueue.global()` for blocking calls is a Darwin-only practice (unverified: read only) | R7, measured on a 32-core host; the containerization comment is the Darwin evidence |
| 5 | tasks T02: `.treatWarning("NoUseUnstructuredThrowingTask", as: .error)` in the manifest; topic-map conflict 9: CLI flag first, manifest only behind a switch | CLI flag `-Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask` on 6.4 legs. Manifest form only for non-published targets or behind a dev switch | `swift-testing@c7d68ca20cd7:Package.swift:436-440`: the package manager suppresses warnings for dependencies; the group is unknown on 6.3 (T-V01) |
| 6 | tasks T02 enables SwiftLint `unhandled_throwing_task` as a mandatory pair; topic-map conflict 1 says SwiftLint is optional and never the gate | Compiler group (6.4) plus the SW-CONC-13 grep (any toolchain) are the gates; the SwiftLint rule is CONSIDER | The grep catches every statement-position `Task {`, throwing or not; SwiftLint adds only the `Task { try … }.cancel()` form (T-V03) |
| 7 | Topic-map conflict 1 names SwiftLint `custom_rules` as the optional delivery vehicle for the ban set | **Amended in the revision.** Not on the static 0.65.1 binary, which skips `custom_rules` and exits 0 on planted violations (R5). The SourceKit-enabled image (`ghcr.io/realm/swiftlint:0.65.1`) runs them (R11). Gate with shell greps in CI; a `custom_rules` mirror counts only if CI fails on any `Skipping enabled rule` line (SW-CONC-21, SW-GATE-11) | Static: `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.`, exit 0, 0 violations. SourceKit image on the same plant: exit 2, 5 violations; on the twin exit 0, no skip line (R11, B-V16). The first consolidation's "not on Linux" over-generalised from the static binary. macOS behaviour: unverified, read only |
| 8 | Brief and map: "the `Mutex<State>` twin is green under TSan" | False on Linux. A correct `Mutex` class gave 1 `Swift access race`, exit 1, on 6.3 and 6.4; Docker's default seccomp also blocks TSan (I-V7a/V7b). TSan is advisory (SW-CONC-27) | Measured; matches Swift forum thread 84801 |
| 9 | tasks brief: `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` makes the semaphore plant deadlock | A no-op on Linux: identical results with and without; the string is absent from the 6.4 `libdispatch.so` (T-V12). Test pool starvation by blocking `ncores` tasks | Measured; Apple behaviour unverified, read only |
| 10 | Map M-B-04 check `NSLock\|os_unfair_lock` outside the NIO stack | Replaced by the removal test plus the guard check (SW-CONC-01) | An `NSLock` + `private var` class legitimately needs the hatch: removal build exit 1 on 6.3 and 6.4 (I-V3, R2) |
| 11 | Map M-B-02 / conflict 10: StrictMemorySafety "flags each use" of the hatches | It flags uses of `nonisolated(unsafe)` bindings only, not `@unchecked Sendable` and not the declarations (I-V19) | Measured: 4 warnings, 0 after `unsafe` |
| 12 | Counting: iso reports 84% of `nonisolated(unsafe)` lines and 70% of `@unchecked` lines failing the reason check over 866 and 2,495 lines; topic-map conflict 21 requires the audit universe (no tests, fixtures, generated code) | Use the audit universe: R8 finds 380 of 554 `@unchecked` lines (69%) and 98 of 200 `nonisolated(unsafe)` lines (49%) uncommented; the 84% included generated code | Counting discipline; the `@unchecked` ratio survives, the other does not |
| 13 | iso §16 says exemplars gate `-require-explicit-sendable` behind a dev-only switch and cites `swift-log@4038b6a4f74a:Package.swift:70-71` | swift-log applies it unconditionally on every regular, executable and test target (line 71). Only `swift-testing@c7d68ca20cd7:Package.swift:436-440` and `async-http-client@017115279d09:Package.swift:22-27` gate it | Read directly 2026-10-10; `unsafeFlags` does not block consumers at tools ≥ 6.2 ([pkg] Headline 14) |
| 14 | The toolchain's 6.4 template writes `ApproachableConcurrency`; iso says strip it | Strip; spell the names (SW-CONC-12) | In Swift 6 mode three of its five members are already on (`Features.def` @ swift-6.4.0-RELEASE:308,311,316); 0 of 8 exemplar manifests use the bundle name; the template also puts it on test targets |
| 15 | SW-CONC-13 as a MUST flags 586 bare tasks in two apps and, in the strict OCI exemplars, `apple/container@f70ecbb926d9` has 8 | MUST for library, SDK, CLI, server; SHOULD for app code; the sanctioned callback bridge is `_ = Task { … } // fire-and-forget: <why>` | Bare tasks per repo: nio 5, vapor 3, hummingbird 1, containerization 2, container 8 ([conc] Axis 3) against element-x-ios 416 and IceCubesApp 170 |
| 16 | Actors: iso's table says "not an actor with only `Sendable` members"; the map says "an actor holds service state with async operations"; Massicotte softened on stateless actors in 2026-05 | The "because" comment is the gate; justified when callers must `await` anyway or non-Sendable state is mutated across suspension points; synchronous bodies over `Sendable` state are a `Mutex` (SW-CONC-29) | Reading rule; S4 checks only that a reason exists |
| 17 | SW-CONC-18 (SHOULD) and the backpressure round's SW-CONC-30 (MUST) both say "no unannotated `.unbounded`"; 18's grep printed 8 lines on the bad plant (4 of them signatures, 1 a construction that had a policy) and 6 false positives on the compliant twin | One rule per fact. 18 keeps the construction-site obligation and becomes MUST, with three replacement greps (S7); 30 keeps the choice by data kind and the zero-count ban | The old grep did not stay green on the twin (the SW-CONC-30 Run line of the backpressure round, B-V15 notes). Two severities for the same implicit default let an agent cite the weaker rule |
| 18 | SW-CONC-19's grep calls every plain `withTaskGroup(of: Void` a violation; SW-CONC-31's default cap is exactly a plain `withTaskGroup(of: Void.self)` drained by `group.next()` | A plain Void group is legal when drained by `next()`; an undrained one is the violation. S8 replaces the grep | R10: S8 lists the undrained plant and nothing for the window and discarding twins; the window held 256 in flight at 26,540 KiB (B-V06) |
| 19 | SW-CONC-19 named `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117` as satisfying; [bp §5] finds a discarding group with no in-flight bound there, and in the NIO echo servers | Hummingbird satisfies the retention half of SW-CONC-19 only; the cap (SW-CONC-31) is violated by it and satisfied by `apple/containerization`. The exemplar rows are corrected | 10,000 instant accepts held 10,000 live handlers (B-V06). Whether the listener bounds accepts is unmeasured (gap c) |
| 20 | SW-CONC-20 (from tasks T09, §11): below 6.4 "an explicit close on both exits"; the backpressure matrix: `await Task { await cleanup() }.value` | `Task { … }.value` on both exits. A plain `await close()` on the cancel path aborts whenever the cleanup reaches a cancellation point (the fixture's flush is a `Task.sleep`; a `close()` that never reaches one would finish, and a caller cannot tell), so the old text overclaimed a cleanup guarantee; SW-CONC-20 loses its cleanup half and SW-CONC-32 owns it | R9: `catch { await cleanup(r); throw error }` printed `cleanup ABORTED by cancellation`, exit 1, on 6.3 and 6.4; the `Task { … }.value` twin exit 0 on both. The tasks plant (`s-compat`) never cancelled the task, so it proved only that the form builds |
| 21 | SW-CONC-30 (bp) sends lossless push sources to the channel of SW-CONC-35; SW-CONC-35 bans that channel from the SDK and any library under the dependency budget | Inside the budget a lossless push source becomes a pull source (`unfolding:`), a lossy bounded one, or an annotated `.unbounded` naming its external bound. Recorded as gap (a), not hidden | Dependency cost 6,244,408 B against 83,160 B plus swift-collections 1.7.2 (B-V17); owner Q4 |
| 22 | SW-CONC-23 (from tasks §3, T-V39) says only `Task.sleep`, `clock.sleep`, `checkCancellation`, `isCancelled` and `for await` observe cancellation; [bp §4] finds `AsyncChannel.send` and the multi-producer `send` do too | Rule text amended: library awaits may observe cancellation. `AsyncChannel.send` returns without sending and without throwing; the multi-producer `send` throws `CancellationError` | B-V05: 2,000 loop iterations returned, 69 delivered (6.3: 58); multi-producer 36 sent, 37 received, `producer threw: CancellationError()` |
| 23 | [bp §8] and its grep B-C7 scope the signal-source trap to a handler closure written in `main.swift` top-level code, and its behavioural gate is "assert the exit code is not 132"; SW-CONC-26 says any closure inferred `@MainActor` and run off main traps | SW-CONC-34 widened: the trap is the `@MainActor` inference, so a handler closure in a `@MainActor` function or in a method of a `@MainActor` type traps too. B-C7 stays (it is exact for `main.swift`), S9 adds the `@MainActor` candidate list, and the behavioural gate runs with `SWIFT_BACKTRACE=enable=no` and checks that the handler's side effect happened | R13: `@MainActor` function and `@MainActor` type method both hit `_dispatch_assert_queue_fail` on 6.4 and 6.3, exit 132 with `enable=no`; the nonisolated installer exit 0 with the handler run once. R14: with the default backtracer the same plant exited 0 (9 of 9, `hits=0`: the handler body never ran) when main kept running, so "exit is not 132" stayed green on a violation |

### Check scripts

Every script prints the violation; empty output is a pass. They were watched red on the planted violation and green on the twin (R1, R2, R3; S7 and S8 in R12 and R10; S9 in R13). Replace `Sources` with the target's source directories (test directories are excluded by the operand).

```bash
# S1 reason-comment check (rules 01, 09). PAT is a fixed string. On a diff, feed the changed files.
S1='FNR == 1 { lead = 0 } /^[ \t]*\/\// { lead = 1; next } /^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next } index($0, pat) { if (!lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0 } { lead = 0 }'
find Sources -name '*.swift' -print0 | xargs -0 -r awk -v pat='@unchecked Sendable' "$S1"
find Sources -name '*.swift' -print0 | xargs -0 -r awk -v pat='nonisolated(unsafe)' "$S1"
git diff --name-only --diff-filter=AM main -- '*.swift' | xargs -r awk -v pat='@unchecked Sendable' "$S1"
```

```bash
# S2 @preconcurrency import check (rule 10). Shim list extended by this consolidation with EmscriptenLibc (R3b).
find Sources -name '*.swift' -print0 | xargs -0 -r awk '
BEGIN { split("Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch EmscriptenLibc", OK, " ") }
/^[ \t]*\/\// { lead = 1; next }
index($0, "@preconcurrency import ") > 0 {
  mod = $0; sub(/.*@preconcurrency import /, "", mod); sub(/[ \t\/].*/, "", mod)
  shim = 0; for (k in OK) if (OK[k] == mod) shim = 1
  if (!shim && !lead && $0 !~ /\/\//) print FILENAME ":" FNR ": " $0
}
{ lead = 0 }'
```

```bash
# S3 guard suspects (rule 01b): @unchecked Sendable declarations with a stored var and no lock/mutex/atomic/queue/pthread/eventloop/isolat/confin token. A suspect list for new code, not a gate.
find Sources -name '*.swift' -print0 | xargs -0 -r awk '
function flush() { if (inb && hasvar && !guarded) print file ":" line ": " decl; inb = 0 }
BEGIN { split("lock mutex atomic queue pthread eventloop isolat confin", T, " ") }
{
  if (inb) {
    body = tolower($0)
    for (k in T) if (index(body, T[k]) > 0) guarded = 1
    if ($0 ~ /^[ \t]*[a-z() ]*var [A-Za-z_][A-Za-z_0-9]*[^{]*$/) hasvar = 1
    depth += gsub(/\{/, "{") - gsub(/\}/, "}")
    if (depth <= 0) flush()
    next
  }
  if (index($0, "@unchecked Sendable") > 0 && index($0, "{") > 0 && $0 !~ /\{[ \t]*\}/ && ($0 ~ /class / || $0 ~ /struct /)) {
    inb = 1; file = FILENAME; line = FNR; decl = $0; hasvar = 0; guarded = 0
    depth = gsub(/\{/, "{") - gsub(/\}/, "}")
    body = tolower($0); for (k in T) if (index(body, T[k]) > 0 && $0 !~ /Sendable/) guarded = 0
  }
}
FNR == 1 && inb { inb = 0 }'
```

```bash
# S4 actor reason (rule 29): actor / @globalActor declarations whose leading comment lacks the word "because".
find Sources -name '*.swift' -print0 | xargs -0 -r awk '
/^[ \t]*\/\// { if (index($0, "because") > 0) why = 1; lead = 1; next }
/^[ \t]*@[A-Za-z_]+(\(.*\))?[ \t]*$/ { next }
$0 ~ /^[ \t]*[a-z ]*actor [A-Z]/ && $0 !~ /actor isolation/ { if (!why) print FILENAME ":" FNR ": " $0 }
{ lead = 0; why = 0 }'
```

```bash
# S5 removal test (rules 01a, 02, 05). Run inside the toolchain: run.sh bash hatch-removal.sh PKGDIR
# build exit 0  => the hatch was NOT needed (violation: delete it in the real tree)
# build exit !=0 => the compiler needs it (keep it; it still needs S1 + S3)
set -u
src=$1; work="$src/../.removal-work-$(basename "$src")"
rm -rf "$work"; cp -R "$src" "$work"; rm -rf "$work/.build"
find "$work/Sources" -name '*.swift' -print0 | xargs -0 -r sed -i 's/@unchecked Sendable/Sendable/'
cd "$work" && swift build --scratch-path "$SWIFT_SCRATCH/removal" >/dev/null 2>&1
echo "removal-build-exit=$?"
```

```bash
# S6 defaultIsolation exported through a library product (rule 11). Input: output of `swift package dump-package`. Requires jq.
swift package dump-package > pkg.json
jq -r '[.products[] | select(.type | has("library")) | .targets[]] as $exp | .targets[] | select(.name as $n | $exp | index($n)) | select(any(.settings[]?; .kind | has("defaultIsolation"))) | .name' pkg.json
```

```bash
# S7 stream construction and annotation checks (rule 18; B-C1, B-C3a, B-C3b, B-C3c). PCRE: \x3C and \x3E are the angle brackets and \x2D the hyphen, so the patterns carry no literal < or >.
grep -rnP -e '\.unbounded(?!.*//\s*unbounded:)' --include='*.swift' Sources
grep -rnP -e 'makeStream\((of:\s*[^),]*\.self)?\)' --include='*.swift' Sources
grep -rnP -e '(?<!\x2D\x3E\s)Async(Throwing)?Stream(\x3C[^\x3E]*\x3E)?\(\s*[A-Za-z0-9_]+\.self(?![^)]*bufferingPolicy)[^)]*\)\s*\{' --include='*.swift' Sources
grep -rnP -e '(?<!\x2D\x3E\s)(?<!:\s)Async(Throwing)?Stream\x3C[^\x3E]*\x3E\s*\{' --include='*.swift' Sources
# known miss: constructions whose arguments span lines. The (?<!:\s) look-behind skips `var x: AsyncStream<T> { … }` property types (the compliant twin carries one and prints nothing).
```

```bash
# S8 undrained plain Void group (rule 19). Output = files that build a plain Void group and never call .next(). The pipeline exits 123 when a file is listed (GNU grep 3.12 in swift:6.4); judge by output.
grep -rl -e 'withTaskGroup(of: Void' -e 'withThrowingTaskGroup(of: Void' --include='*.swift' Sources | xargs -r grep -L -e '\.next()'
# known miss: a .next() elsewhere in the same file hides an undrained group; read each file that builds a plain Void group.
```

```bash
# S9 signal source next to @MainActor (rule 34, added by the verification pass). Output = candidate files; the pipeline exits 123 when the twin prints nothing, so judge by output.
grep -rl -e 'makeSignalSource' --include='*.swift' Sources | xargs -r grep -l -e '@MainActor'
# known misses: isolation inherited from a protocol or superclass in another file; defaultIsolation(MainActor.self) (apps only, SW-CONC-11). A hit is a candidate, not a proof: read whether the handler closure sits in the isolated scope.
```

### SW-CONC: the rules, grouped by the check that catches them

Fields: rule; Why (the failure it prevents); Verify (exact command or heuristic); Run (what was watched red and green); Binds (code kinds); Floor. Severity is in the heading. "Run: RED/GREEN" means a planted violation failed the check and the compliant twin passed. Rules 30 to 35 were appended in the 2026-10-10 revision and sit in the group of the check that decides them, so the numbers are not in order inside a group.

#### Group 1: the compiler or a build exit code decides

**SW-CONC-01 (MUST). Add `@unchecked Sendable` only when deleting it breaks the build, a guard is visible in the type body, and a comment directly above or trailing names the guard and what keeps every access inside it.**
- Why: swiftc and SwiftLint 0.65.1 are silent on an unguarded body: `swift build -Xswiftc -warnings-as-errors` exited 0 on 6.3 and 6.4 for a `var`-holding class that lost 128,131 of 400,000 increments (I-V0).
- Verify: (a) removal test S5: exit 0 means delete the hatch, non-zero means keep it and apply (b) and (c). (b) S3 over changed files, then read each hit: "silences a compiler error", "needed for Swift 6", "temporary" are not reasons. (c) S1 with `@unchecked Sendable` on the files a diff touches. Exempt from (c): generated files; the lock primitive itself when its doc comment says so.
- Run: RED/GREEN. I-V1 (S1: 1 line on the plant, 0 on the twin), I-V1d (diff gate flags only the added class), I-V2 (S3 prints `RacyCounter`), I-V3 (removal: `redundant` exit 0, `legit` exit 1, 6.4 and 6.3); R1 and R2 re-ran S1 and S5. (b)'s reading step is a heuristic.
- Binds: all production code; test helpers SHOULD follow. Floor: any Swift 6 toolchain.

**SW-CONC-02 (MUST). Declare a `final class` whose only stored state is `let` `Mutex<…>` values as plain `Sendable`, never `@unchecked`.**
- Why: checked `Sendable` on 6.3 and 6.4 for any `Value`; the compiler then rejects the first stray mutable property (`error: stored property 'extra' of 'Sendable'-conforming class 'Leaky' is mutable`). SwiftPM reviewers reject the redundant hatch ([swift-package-manager#10425](https://github.com/swiftlang/swift-package-manager/pull/10425), merged 2026-09-03).
- Verify: S5 on every `@unchecked` class (exit 0 is the violation); candidates `grep -rn -e 'Mutex<' --include='*.swift' Sources`.
- Run: RED/GREEN. I-V3, I-V3b (`-DB2` exit 1, default exit 0, 6.4 and 6.3); R2.
- Binds: library, SDK, CLI, server. Floor: Swift 6.0 (`Synchronization`; Apple floor macOS 15 / iOS 18, unverified: read only).

**SW-CONC-03 (SHOULD). On 6.4 CI legs promote `NoUseUnstructuredThrowingTask` to an error with the command-line flag.**
- Why: `Task.init` is `@discardableResult`, so a throwing body's error vanishes. The group fires on statement-position `Task`, `Task.detached` and `Task.immediate`; it does not fire on `Task { try … }.cancel()`, which SwiftLint's `unhandled_throwing_task` (opt-in, error severity) does catch. Neither fires on `_ = Task { try … }` or a non-throwing task, so SW-CONC-13 is the floor-independent gate.
- Verify: `swift build -Xswiftc -Werror -Xswiftc NoUseUnstructuredThrowingTask` exits non-zero on a violation. Optional: `.swiftlint.yml` with `only_rules: [unhandled_throwing_task]`, `swiftlint lint --config .swiftlint.yml Sources` exits 2. Manifest form `.treatWarning("NoUseUnstructuredThrowingTask", as: .error)` (tools 6.2) only for non-published targets (conflict 5).
- Run: RED/GREEN. T-V01 (manifest form exit 1, twin exit 0; 6.3 prints `unknown warning group` and exits 0), T-V02 (CLI form, detached and immediate exit 1), T-V03 (SwiftLint exit 2 / twin 0). A typed-throws `Task { () throws(E) in … }` crashes swift-frontend in IRGen on 6.3 and 6.4 (T-V42): avoid it.
- Binds: library, SDK, CLI, server. Floor: Swift 6.4 for the group; no effect on 6.3.

**SW-CONC-04 (SHOULD). Every public type of a library or SDK states `Sendable`, an unavailable `Sendable`, or on 6.4 `~Sendable`; use `weak let` (6.3+) instead of `@unchecked` for weak back-references to a `Sendable` referent.**
- Why: removes two historic reasons for the hatch; an unannotated public type silently becomes someone else's data race. `final class Child: Sendable { weak let parent: Parent? }` builds on 6.3 and 6.4; `~Sendable` on 6.3 is `error: '~Sendable' requires -enable-experimental-feature TildeSendable`. `weak let` does not help when the referent is `AnyObject` (not `Sendable`).
- Verify: add `.unsafeFlags(["-Xfrontend", "-require-explicit-sendable"])` (swift-log does, unconditionally: `swift-log@4038b6a4f74a:Package.swift:71`), then `swift build > build.log 2>&1; grep -n -e 'ExplicitSendable' build.log` (output = public types lacking a statement). The build exit stays 0 even with `.treatWarning("ExplicitSendable", as: .error)` and `-warnings-as-errors` (4 attempts, I-V18), so this is a log-reading audit, never a gate. The "unavailable `Sendable`" form is documented as accepted ([explicit-sendable-annotations.md](https://raw.githubusercontent.com/swiftlang/swift/main/userdocs/diagnostics/explicit-sendable-annotations.md)) but was not run.
- Run: output RED/GREEN (2 `[#ExplicitSendable]` warnings, then 0, both toolchains); not red by exit code.
- Binds: library, SDK. Floor: `weak let` 6.3, `~Sendable` 6.4; at the 6.2 library floor use the unavailable-conformance form.

**SW-CONC-05 (SHOULD). Replace a transfer box (`struct Box<T>: @unchecked Sendable`) with a `sending` parameter or result when the value is handed off once.**
- Why: the box compiles a use-after-send silently; `sending` rejects it (`error: sending 'n' risks causing data races [#RegionIsolation::SendingRisksDataRace]` on 6.4, `[#SendingRisksDataRace]` on 6.3).
- Verify: candidates `grep -rn -e 'Unsafe.*Box' -e 'TransferBox' --include='*.swift' Sources`; rewrite the signature with `sending` and run S5. Promote just the group with `-Xswiftc -Werror -Xswiftc SendingRisksDataRace` (the leaf name works on 6.4).
- Run: RED/GREEN. I-V14 (use-after-send exit 1, default exit 0, box version silent).
- Binds: library, SDK, CLI, server. Floor: Swift 6.0.

**SW-CONC-06 (SHOULD). A published library with public async or protocol API ships a `CompileTests/` package that builds the API under a consumer's defaults, and CI builds it on the floor and the current toolchain.**
- Why: the library compiles alone and breaks consumers. Plant f: a generic API needing a nonisolated `Sendable` conformance fails with `error: main actor-isolated conformance of 'MyHandler' to 'Handler' cannot be used in @concurrent context [#IsolatedConformances]` (6.4) and `… cannot satisfy conformance requirement for a 'Sendable' type parameter` (6.3 and 6.4).
- Verify: `swift build` in `CompileTests/` exits 0. Settings: `.defaultIsolation(MainActor.self)`, `.enableUpcomingFeature("NonisolatedNonsendingByDefault")`, `.enableUpcomingFeature("InferIsolatedConformances")`, `swiftLanguageModes: [.v6]`, tools 6.2, a path dependency on the library (precedent `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25`). Fix shape: `public nonisolated(nonsending) func run<T: Handler>(_ h: T) async`, and `sending @escaping () async -> Void` instead of `Handler & Sendable`.
- Run: RED/GREEN. I-V10 (BAD exit 1, FIXED exit 0, 6.4 and 6.3).
- Binds: library, SDK. Floor: tools 6.2.

**SW-CONC-07 (MUST). Never paste `NonisolatedNonsendingByDefault` into existing code: run `swift package migrate --to-feature NonisolatedNonsendingByDefault`, review each `@concurrent` it adds, build on the floor and the current toolchain, and keep one runtime isolation assert; an async wrapper forwarding to an isolation-capable API takes `isolation: isolated (any Actor)? = #isolation` and passes it on.**
- Why: SE-0461 says the same code "means something different" with the feature; no diagnostic fires. A nonisolated async helper that asserts caller isolation exited 132 (`Illegal instruction`) without the feature and 0 with it, on 6.3 and 6.4; a wrapper `AsyncIteratorProtocol` doing `return await self.iterator.next()` fails with `sending 'self.iterator' risks causing data races` (reproduces `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:79-81`; 2 of 6 audited packages broke).
- Verify: a test calling the helper from `@MainActor` with `MainActor.preconditionIsolated()`, run with and without the feature; `swift build` with the feature on both toolchains; twin `public mutating func next(isolation actor: isolated (any Actor)? = #isolation) async -> Int? { await iterator.next(isolation: actor) }`. `swift package migrate` takes no `--scratch-path`.
- Run: RED/GREEN. I-V9 (132 / 0) and R6 re-run on 6.4; I-V9b (exit 1, twin exit 0, both toolchains); I-V9c (exit 0, two fix-its, manifest edited).
- Binds: all non-app targets, plus apps that adopt it. Floor: Swift 6.2.

**SW-CONC-08 (MUST). Hold a `Mutex` or lock only to read or write the guarded value: no `await`, no call to a user-supplied closure or delegate, no re-entry of the same lock, no continuation resume, no logging.**
- Why: `Mutex` is non-recursive; direct and callback re-entry hang (`timeout 20` exit 124, both). SE-0433 calls re-entry platform-dependent. The lock-held-resume class is in SwiftPM#10405 and #10403 (cited by the failure scout, not re-fetched).
- Verify: the compiler already rejects `await` in `withLock` (`cannot pass function of type '(inout sending Int) async -> sending ()' to parameter expecting synchronous function type`) and `NSLock.lock()` in async code (`instance method 'lock' is unavailable from asynchronous contexts`), exit 1. Callbacks, re-entry, resume and logging are a reading heuristic only: "the `withLock` body calls no closure parameter, no method that takes the same lock, no `resume`, no logger".
- Run: RED for the hang and both compile errors (I-V16); the reading part is not automated.
- Binds: all code. Floor: Swift 6.0.

#### Group 2: a grep or awk decides (output is the violation, empty passes)

**SW-CONC-09 (MUST). Add `nonisolated(unsafe)` on a `let` of an immutable non-Sendable value only with a one-line reason; on a `var`, also name the lock and route every access through one function.**
- Why: 58% of the 191 audited sites are `let`; the `var` form is the dangerous one, and the migration guide's own example carries a reason comment ([CommonProblems.md](https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md)). Compliant `var`: `swift-testing@c7d68ca20cd7:Sources/Testing/Test+Cancellation.swift:35` pairs it with a `Mutex`.
- Verify: S1 with `nonisolated(unsafe)` on changed files; `grep -rn -e 'nonisolated(unsafe) var' -e 'nonisolated(unsafe) public var' --include='*.swift' Sources` (each hit names its lock; reading). Optional audit: `.strictMemorySafety()` (SE-0458) lists every *use* as `[#StrictMemorySafety]`; acknowledge with `unsafe`. It does not flag the declaration and does not flag `@unchecked Sendable` (conflict 11).
- Run: RED/GREEN. I-V1 and R1 (1 line / 0 lines); I-V19 (4 warnings, 0 after `unsafe`, 6.3 and 6.4).
- Binds: all production code. Floor: `nonisolated(unsafe)` 5.10, `unsafe` expressions 6.2.

**SW-CONC-10 (MUST). Write `@preconcurrency import X` only for libc and OS shims (`Glibc Musl WASILibc Android Bionic Darwin CRT WinSDK Dispatch EmscriptenLibc`), otherwise with a comment naming the module, the missing annotation and a removal trigger.**
- Why: the attribute is a per-import mute switch: a real `[#SendingRisksDataRace]` error became no diagnostic at all, and an unneeded `@preconcurrency import Foundation` drew no warning either (I-V11). 98 of 101 non-shim imports in the corpus have no comment (R8; the audit's own count of genuine gaps is 63, under a looser shim list).
- Verify: S2 on changed files. Declaration-level `@preconcurrency` (a protocol or function you evolve) is a library-evolution tool and stays allowed.
- Run: RED/GREEN. I-V11 and R3 (2 lines on the plant, 0 on the twin); R3b (extended list: only `Legacy` flagged, commented `MatrixRustSDK` import passes).
- Binds: all code. Floor: Swift 6.0 mode.

**SW-CONC-11 (MUST). Libraries, SDKs, CLIs, daemons and servers never set `.defaultIsolation(MainActor.self)`; only app targets, app-internal UI packages that no other package consumes, and compile-test executables may, with explicit `.swiftLanguageMode(.v6)`.**
- Why: a library that sets it breaks every nonisolated consumer (6 errors on 6.4, 5 on 6.3: `[#ActorIsolatedCall]`, `[#IsolatedConformances]`); an executable's entry point is already `@MainActor`, so a CLI gains nothing and its helper types stop working from nonisolated library targets. 0 published libraries in the 40 repos set it; IceCubesApp sets it in 9 of 13 app-internal packages.
- Verify: `grep -rn -e 'defaultIsolation' --include='Package*.swift' .` (every hit must be an app or compile-test manifest); S6 names exported targets that set it.
- Run: RED/GREEN. I-V5 (grep exit 0 / 1), I-V5b (`EXPORT=1` prints `UILib`, `EXPORT=0` empty), I-V6 (consumer build exit 1, executables exit 0).
- Binds: library, SDK, CLI, daemon, server (never); app (may). Floor: tools 6.2 (SE-0466).

**SW-CONC-12 (SHOULD). In new library, SDK, CLI and server targets and their test targets, enable `NonisolatedNonsendingByDefault` by name; do not ship the template's `ApproachableConcurrency` bundle; add `InferIsolatedConformances` only for modules with global-actor-isolated public types or MainActor-default consumers; mark non-suspending CPU-bound public async functions `@concurrent` with a reason.**
- Why: NNBD removes the trap where `nonisolated async` hops off the caller's actor; the bundle name hides what it does (conflict 14) and the 6.4 template writes it on test targets. `@concurrent` leaves the caller's actor but stays on the cooperative pool, so it is not the answer for blocking calls (SW-CONC-23).
- Verify: `grep -rn -e 'ApproachableConcurrency' --include='Package*.swift' .` (output is the violation; exit 0 red); presence: `grep -rn -e 'NonisolatedNonsendingByDefault' --include='Package*.swift' .`. Exempt: a manifest that must mirror Xcode's `SWIFT_APPROACHABLE_CONCURRENCY` (unverified: read only).
- Run: RED/GREEN. I-V4 (6.4 template: 2 lines, exit 0; 6.3 template: empty, exit 1), I-V20 (Swift 6 mode is implied by tools 6.4: a racy global errors `[#MutableGlobalVariable]`; the 6.4 template has no `swiftLanguageModes`, so greps for `.v6` miss it).
- Binds: library, SDK, CLI, server. Floor: Swift 6.2; 7 of 40 repos enable NNBD, always by name.

**SW-CONC-13 (MUST for library, SDK, CLI and server; SHOULD for app code). Every unstructured `Task {}` is stored and cancelled on its owner's shutdown path, returned or awaited by its creator, or is a callback-to-async bridge written `_ = Task { … } // fire-and-forget: <why safe>` whose body handles all errors; a statement-position `Task {` is a violation.**
- Why: unstructured tasks survive their creator's cancellation (measured: `Task{}` and `Task.detached` both saw `cancelled=false` after the parent was cancelled); 709 of 882 corpus `Task {}` are bare statements and only 88 of 159 stored handles are cancelled by name ([conc] Axis 3).
- Verify: `grep -rn -e '^[[:space:]]*Task[[:space:]]*{' -e '^[[:space:]]*Task[[:space:]]*(.*)[[:space:]]*{' -e '^[[:space:]]*Task[^.[:alnum:]_ (].*{' -e '^[[:space:]]*Task\.detached' --include='*.swift' Sources`; then `grep -rn -e '_ = Task' --include='*.swift' Sources` (each hit needs the `fire-and-forget:` marker); for stored handles, read that a `.cancel()` is reachable from stop or close. Known miss: multi-line `Task(\n priority:`.
- Run: RED/GREEN. T-V26 and R4 (7 lines exit 0 on the plant, empty exit 1 on the twin).
- Binds: see heading. Floor: Swift 5.5.

**SW-CONC-14 (SHOULD). `Task.detached` carries an adjacent comment naming which of isolation, priority or task-locals must be dropped; "to leave the main actor" is not a reason, write a `@concurrent` function.**
- Why: detached drops task-locals (`requestID=none` measured), priority and isolation, and still ignores parent cancellation. With NNBD on, a plain `nonisolated async` function does not leave the actor (conflict 3). 34 corpus uses in 9 repos, mostly for priority (`swiftlang/sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitD/SourceKitDCore.swift:82`).
- Verify: `grep -rn -e 'Task\.detached' -e 'detached[[:space:]]*[{(]' --include='*.swift' Sources` (every hit needs the comment).
- Run: RED/GREEN. T-V27 and R4 (2 hits / 0).
- Binds: all code. Floor: `@concurrent` Swift 6.2.

**SW-CONC-15 (MUST). Do not block a cooperative-pool thread or the main actor in async code: no `DispatchSemaphore`, `DispatchGroup.wait`, `Thread.sleep`, libc `sleep` or `usleep`; wait with `await`, delay with `Task.sleep(for:)`; a deliberate sync-over-async bridge is `@available(*, noasync)` and commented.**
- Why: swiftc 6.3 and 6.4 reject only `Thread.sleep`, `NSLock.lock/unlock` and `NSCondition` in async contexts; semaphores, group waits, libc sleeps, `DispatchQueue.sync` and `Process.waitUntilExit()` compile cleanly. Consumers created by `Task {}` in `main.swift` inherit the main actor and deadlock deterministically (exit 124); N consumers blocking before one producer: 31 pass, 32 hang on a 32-core host. Strict exemplars satisfy it: 0 blocking waits inside `async` bodies in 40 repos; the one bridge is `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:28-40`.
- Verify: `grep -rn -e 'DispatchSemaphore(' -e 'Thread\.sleep(' -e 'usleep(' -e '[^a-zA-Z_.]sleep(' -e '\.wait()' --include='*.swift' Sources`; read each hit (`.wait()` also matches `DispatchGroup` and `Process`; synchronous code is fine).
- Run: RED/GREEN. R4 (4 lines on the plant, empty on the twin); T-V10, T-V11 (deadlocks), T-V23 (compiler coverage).
- Binds: all code. Floor: any.

**SW-CONC-16 (SHOULD). Treat `MainActor.run`, `DispatchQueue.main.async` and `DispatchQueue.global` in new async code as tells to justify, not a ban: isolate the function or type with `@MainActor` or take an `isolated` parameter instead.**
- Why: GCD behind a private queue stays acceptable for long blocking calls (conflict 4), but `MainActor.run` is an agent habit the corpus does not share (23 uses against 614 `@MainActor`; 76 `DispatchQueue.main.async`, mostly in apps), and `DispatchQueue.global()` is width-limited on Linux.
- Verify: `grep -rn -e 'MainActor\.run[[:space:]]*[{(]' -e 'DispatchQueue\.main\.async' -e 'DispatchQueue\.global' --include='*.swift' Sources` (output = sites to justify; a justification is a reason an annotation or isolated parameter cannot satisfy).
- Run: RED/GREEN. R4 (3 lines / empty), a split of T-V25.
- Binds: all code. Floor: any.

**SW-CONC-17 (MUST). Never write `try? await` on a cancellation point (`Task.sleep`, `clock.sleep`, other throwing awaits) inside a loop; test `!Task.isCancelled` or let the error propagate.**
- Why: `while true { try? await Task.sleep(for: .milliseconds(50)); tick() }` ran 18,426 ticks in the 500 ms after cancel (6.3: 17,686) and never ended; `while !Task.isCancelled { try await Task.sleep(…) }` ran 1.
- Verify: `grep -rn -e 'try? await Task.sleep' -e 'try? await clock.sleep' --include='*.swift' Sources`, then read each hit inside a loop (outside a loop it is a legitimate best-effort delay). Behavioural twin: cancel at 500 ms and assert at most 1 further tick.
- Run: RED/GREEN. T-V20 (exit 1 vs 0), T-V33; R4 (3 hits on the plant, 2 of them not in a loop: the grep is a candidate list).
- Binds: all code. Floor: any.

**SW-CONC-18 (MUST for SDK, CLI, server and OCI tooling; SHOULD for app code; was SHOULD, amended in the revision). Pass `bufferingPolicy:` to every `AsyncStream`, `AsyncThrowingStream` and `makeStream`; `.unbounded` only with a same-line `// unbounded: <what bounds the producer>`; the producer stops on `.terminated`. Which policy to pass is SW-CONC-30; lossless flows needing backpressure are SW-CONC-35.**
- Why: the default is `.unbounded` on every initializer and 6.4 did not change it (SE-0314; `AsyncStream.swift@swift-6.4.0-RELEASE:301,476`): 100,000 × 4 KiB yields against a 10 ms consumer peaked at 416,220 KiB, against 11,404 KiB with `.bufferingNewest(8)` (6.3: 416,336 / 10,888) [T-V15]; 2,000 × 64 KiB against a 3 ms consumer: 138,956 KiB against 12,184 [B-V01]. 75 of 78 corpus streams take the default and none is bounded. An `AsyncStream` has one consumer: concurrent iteration is a programmer error (SE-0314).
- Verify: S7 (output = violations). It replaces the first consolidation's grep, which printed 8 lines on the plant (4 of them signatures) and 6 false positives on the compliant twin, so it failed to stay green. Known miss: constructions whose arguments span lines. That the producer stops on `.terminated` is a reading heuristic.
- Run: RED/GREEN. B-C1, B-C3a, B-C3b, B-C3c re-ran (R12): lines with exit 0 on the plant, empty with exit 1 on the twin. Memory: T-V15, B-V01 and B-V02 (`LIMIT_KIB=32768`: unbounded exit 1, bounded exit 0, both toolchains).
- Binds: long-lived or data-volume producers (SDK, CLI streaming progress, server, OCI tooling). Floor: Swift 5.5 (`makeStream` 5.9).

**SW-CONC-19 (SHOULD, text amended in the revision). Server per-connection and per-request loops retain no finished children: use `withDiscardingTaskGroup`, or a plain group drained by `group.next()` (the window of SW-CONC-31); an undrained plain `of: Void.self` group is the violation. The in-flight cap is SW-CONC-31.**
- Why: a plain group holding 200,000 finished children peaked at 1,089,664 KiB against 17,836 KiB for a discarding group and 17,512 KiB for a 64-wide `next()` window; a discarding group alone does not bound live children (200,000 sleepers: 641,392 KiB; 10,000 instant accepts: 10,000 live handlers, 201,060 KiB [B-V06]). SE-0381.
- Verify: S8 (output = files; replaces `grep -rn -e 'withTaskGroup(of: Void' …`, which also flagged the compliant window). Reading: the `.next()` is on the group that `addTask` fills. Satisfying for retention: `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117`, which has no in-flight bound (SW-CONC-31). Window precedent: `apple/containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:123-141`.
- Run: RED/GREEN. R10 (S8 lists `Undrained.swift` on the plant, rc 123; empty on the twin that carries a window, a discarding group and an `of: Int.self` group, rc 0); memory T-V21, T-V31, B-V06.
- Binds: server. Floor: Swift 5.9 (discarding groups); the window needs 5.5.

**SW-CONC-20 (SHOULD, text amended in the revision). A resource that owns a connection, file, thread or pool exposes an idempotent awaited `close()` or `shutdown()` (and where practical a scoped `withX { }`); `deinit` and `defer` never start async work with `Task { }`. Cleanup that must survive cancellation is SW-CONC-32.**
- Why: `deinit { Task { await self.close() } }` does not compile (`capture of 'self' in a closure that outlives deinit`); the field-capturing form compiled but the close was lost when the process ended; `defer { Task { … } }` completed after the owner finished. The first consolidation also said "below 6.4 an explicit close on both exits"; with a plain `await` that form aborts under cancellation (R9, conflict 20), so that half moved to SW-CONC-32 with its corrected shape.
- Verify: `grep -rlPz -e 'deinit\s*\{[^}]*\bTask\b' --include='*.swift' Sources` and `grep -rlPz -e 'defer\s*\{[^}]*\bTask\b' --include='*.swift' Sources` (output = files; the `[^}]*` stops at the first brace).
- Run: RED/GREEN. T-V16, T-V17, T-V18, T-V29, T-V35. Satisfying: `async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:196-217,302-310`.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 5.5.

**SW-CONC-21 (MUST, text amended in the revision). Gate the concurrency bans with shell greps and compiler flags in CI. A SwiftLint `custom_rules` mirror counts only when it runs in the SourceKit-enabled image and CI fails on any `Skipping enabled rule` line; never rely on `LIBDISPATCH_COOPERATIVE_POOL_STRICT` on Linux.**
- Why: both fail open on the toolchain image. The static 0.65.1 binary prints `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` and exits 0 on planted violations (`SWIFTLINT_DISABLE_SOURCEKIT` is compiled into it: `realm/SwiftLint@ec4691d9e813:Source/SwiftLintCore/Extensions/Request+SwiftLint.swift:8-13`); the variable string is absent from the 6.4 `libdispatch.so`. The same `.swiftlint.yml` in the official SourceKit image exits 2 with 5 violations on the plant and 0 on the twin (R11), so "custom_rules do not work on Linux" is false; "a skipped rule looks like a pass" is true.
- Verify: R5 and R11 (the same files through both binaries); the canary `swiftlint lint --quiet --config .swiftlint.yml Sources 2>&1 | grep -c 'Skipping enabled rule'` must print 0 (static binary: 1; SourceKit image: 0). `strings` on `/usr/lib/swift/linux/libdispatch.so` inside the image lists `LIBDISPATCH_LOG` and `LIBDISPATCH_STRICT` only (T-V12, recorded, not re-run). The red/green replacements are the greps in SW-CONC-13..17, -18, -30, -32, -34.
- Run: the variable did NOT go red, by design (T-V12). `custom_rules`: static binary did NOT go red (T-V37, R5); SourceKit image RED/GREEN (R11, B-V16).
- Binds: any Linux CI. Hand-off: SW-GATE wires CI (SW-GATE-11 already treats any skip line as a failed gate); macOS custom_rules behaviour is unverified, read only.

**SW-CONC-30 (MUST; added in the revision). Choose a stream's shape by its data kind: pull sources (file chunks, paged registry reads) use `AsyncStream(unfolding:)` or an `AsyncSequence` type; lossy push sources (latest state, progress ticks) pass `.bufferingNewest(n)` or `.bufferingOldest(n)` with a named constant `n >= 1`; lossless push sources use the channel of SW-CONC-35 where that dependency is allowed and otherwise become pull sources (gap a); payload bytes never use a lossy policy.**
- Why: `unfolding:` is lossless at 12,248 KiB against 138,956 KiB unbounded for 2,000 × 64 KiB [B-V01]; `.bufferingNewest(8)` held 12,184 KiB but delivered 8 of 2,000, because a synchronous burst keeps only `n`; `.bufferingNewest(0)` and `.bufferingOldest(0)` are legal and delivered 0 of 2,000 (the stdlib says "no elements are buffered", `AsyncStream.swift@swift-6.4.0-RELEASE:171-172,179-180`). The `unfolding:` closure is `@Sendable`, so cursor state lives in a `Mutex` or an actor.
- Verify: (1) `grep -rnF -e 'bufferingNewest(0)' -e 'bufferingOldest(0)' -e 'bufferingNewest(-' -e 'bufferingOldest(-' --include='*.swift' Sources` (B-C2, output = violation); (2) S7 for the construction and the annotation; (3) behaviour: a flood test with the producer ten times the consumer's pace, asserting peak `VmHWM` growth under a limit and the delivered count for lossless streams; (4) reading: a bounded policy on a stream that carries payload bytes is the defect. SwiftLint form, SourceKit image only (SW-CONC-21): `custom_rules` `unbounded_stream_without_reason` and `zero_buffer`.
- Run: RED/GREEN. B-C2 (R12: 1 line on the plant, empty on the twin); B-V01 and B-V02 (`LIMIT_KIB=32768`: `unbounded` exit 1 with `FAIL: peak RSS grew 129252 KiB`, `newest8`, `oldest8`, `unfolding` exit 0, 6.4 and 6.3); SourceKit SwiftLint (B-V16, R11: exit 2 on the plant, 0 on the twin). Item (4) is reading only.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 5.5 (`unfolding:`), 5.9 (`makeStream`). Default policy: `.bufferingNewest(n)`.

**SW-CONC-32 (MUST; added in the revision, amends SW-CONC-20). Cleanup that awaits and must survive cancellation is `defer { await withTaskCancellationShield { await x.close() } }` on 6.4; below 6.4 it is `#if compiler(>=6.4)` around that form, with `do { try await body } catch { await Task { await x.close() }.value; throw error }` and the same `await Task { … }.value` after the normal exit in the `#else`. Cleanup with no `await` stays a plain `defer`. Never `defer { Task { … } }`, never an unshielded `defer { await … }`, never a plain `await x.close()` on the cancel path, and a cleanup that spawns a subprocess is always shielded.**
- Why: SE-0493 keeps cancellation visible inside `defer`, so `defer { await cleanup() }` aborted at 0.30 s (`cleanup ABORTED by cancellation`, file left, exit 1); `defer { Task { … } }` left the file (exit 1); the shield completed in 5 of 5 runs at 0.401 to 0.405 s (exit 0); a plain `await cleanup(r)` in `catch` aborted on 6.3 and 6.4 (R9, exit 1) while `await Task { await cleanup(r) }.value` completed (exit 0), because an unstructured task is not cancelled with its parent. The fixture's cleanup awaits a `Task.sleep`, a cancellation point; a cleanup that never reaches one would finish unshielded, and a caller cannot know that about a third-party `close()`, so the rule stays unconditional for cleanup that must survive. Child tasks of a shielded cleanup are not cancelled (`shield-group` exit 0, `async-group` exit 1). A swift-subprocess `run()` in a cancelled cleanup was SIGKILLed (`.signaled(9)` at 0.20 s, exit 1) and finished shielded (`.exited(0)` at 1.21 s, exit 0). Vapor (tools 6.4) ships three awaited defers: two unshielded and one working around the missing shield with `await Task { … }.value` and a comment about the crash it fixes; the 40 clones hold zero shields.
- Verify: `grep -rlPz -e 'defer\s*\{(?![^}]*withTaskCancellationShield)[^}]*\bawait\b' --include='*.swift' Sources` (B-C4, output = files; it also lists `defer { Task { await … } }`, which SW-CONC-20's grep names separately; known misses: nested braces end the scan at the first `}`, and a hit on cleanup that may be abandoned on cancel, such as a progress line, is read, not auto-fixed). `swift build` on 6.3 fails with `'async' call cannot occur in a defer body` and `cannot find 'withTaskCancellationShield' in scope` when an unguarded 6.4 form ships (the `#if` split is the fix). The pre-6.4 `catch` branch has no grep: its gate is a behavioural test that cancels the work task and asserts the temp file is gone (exit 0 required, the `FX/cleanup` shape) plus reading. SwiftLint form, SourceKit image only: `awaited_defer_without_shield`.
- Run: RED/GREEN. B-C4 (R12: the single-line and the multi-line unshielded `defer` on the plant, empty on the twin with both shield forms); the matrix B-V07 and B-V08 (red `naive`, `defer-task`, `defer-async`, `async-group`; green `defer-sync`, `task-value`, `compat`, `defer-shield`, `shield-group`); R9 (plain await red, `Task { … }.value` green, both toolchains); B-V09 (6.3 build exit 1, 6.4 exit 0, `#if` twin exit 0 on both); B-V12 (an external `kill -INT` and `-TERM` matched the self-signal); B-V13 (subprocess); T-V41 (split built on both toolchains).
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 6.4 for the shield and for `await` in `defer` (SE-0504 has no back-deployment; Apple OS floors are unverified: read only); the `#if` split below it.

**SW-CONC-34 (MUST; added in the revision, widened by the verification pass, refines SW-CLI-11 and SW-CONC-26). Install a `DispatchSource` signal source from a nonisolated function in a file other than `main.swift`; never write the handler closure in `main.swift` top-level code or inside a `@MainActor` function or a method of a `@MainActor` type. An explicit `@Sendable` closure is the other safe form.**
- Why: a handler closure written inline in `main.swift` is inferred `@MainActor` and libdispatch runs it on its own queue: `_dispatch_assert_queue_fail`, `Illegal instruction`, exit 132, on 6.4 and 6.3. The `@Sendable` closure and the nonisolated installer both exited 0 [B-V11]. The cause is the `@MainActor` inference, not the file: a plain closure inside a `@MainActor` function and inside a method of a `@MainActor` type trapped the same way on both toolchains, while an explicit `@Sendable` closure inside the `@MainActor` function ran (exit 0, handler hit once) (R13). SW-CLI-11 prescribes the source and gives no placement.
- Verify: (1) `grep -rl -e 'makeSignalSource' --include='main.swift' Sources` (B-C7, output = violating files; it also lists the `@Sendable` form that exits 0, which is the conservative reading: move the call into a function in another file); (2) S9, the `@MainActor` candidate list (output = files; read whether the handler closure sits in the isolated scope); (3) behaviour: run the built binary with `SWIFT_BACKTRACE=enable=no`, send the signal once (`kill -INT`), assert the exit code is not 132 and that the handler's side effect happened. Without `enable=no` the exit code alone is not a gate: the same plant exited 0 with the crash report on stderr when the main thread kept running (gap f, R14). SwiftLint form, SourceKit image only: `signal_source_in_main_swift`; it covers `main.swift` only.
- Run: RED/GREEN. B-C7 (R12: `main.swift` on the plant, empty with exit 1 on the twin); S9 (R13: `Installers.swift` on the plant, empty with rc 123 on the twin, host `grep` and `swift:6.4` image); B-V11 (`plain` 132, `sendable` 0, nonisolated installer 0, both toolchains); R13 (`@MainActor` function and type: 132 with `enable=no` on 6.4 and 6.3; `@Sendable` in the `@MainActor` function: 0; nonisolated: 0); SourceKit SwiftLint (R11). The default-backtracer exit code did NOT go red in the sleeping-main shape (R14), hence item (3).
- Binds: CLI, daemon. Floor: Swift 6.0.

**SW-CONC-35 (SHOULD; added in the revision). `AsyncChannel` is for server, CLI-internal and app code that needs lossless one-to-one backpressure between tasks and already depends on swift-async-algorithms. The SDK and any library below the dependency budget (stdlib plus swift-subprocess) do not import it and expose it in no public API. Every producer loop checks cancellation after each `send`. Reach for `MultiProducerSingleConsumerAsyncChannel` (`.watermark(low:high:)`, optionally byte-weighted) only for several producers or a byte bound, with the producer in the calling task and the consumer moved out as `elements()`.**
- Why: `AsyncChannel.send` "will resume without sending the element" when its task is cancelled: a 2,000-iteration producer loop ran all iterations and delivered 69 (6.3: 58) [B-V05]. The multi-producer `send` throws `CancellationError` instead (36 sent, 37 received). The package brings swift-async-algorithms 1.1.7 and swift-collections 1.7.2: release binary 6,244,408 B against 83,160 B for the stdlib twin [B-V17], outside owner Q4. `send` is `async`, so it cannot serve a synchronous callback or a GCD source, which stay on `AsyncStream` with a bounded policy. The multi-producer `Source` is `~Copyable`: `group.addTask { try await source.send(…) }` fails in Swift 6 mode with `[#SendingClosureRisksDataRace]`. It ships only `.watermark`; `.unbounded()` is in the Evolution document but `has no member 'unbounded'` in 1.1.7, and the channel is gated at macOS 15 / iOS 18 (unverified: read only). Memory is flat: 14,204 KiB (`AsyncChannel`) and 16,100 KiB (multi-producer) for the 2,000 × 64 KiB flood [B-V03].
- Verify: for the SDK and any library under the budget, `grep -rn -e 'swift-async-algorithms' --include='Package.swift' .` (B-C8, output = violation; add `--include='Package@swift-*.swift'` when versioned manifests exist). For the producer loop, `grep -rlPz -e 'for\b(?![^{]*isCancelled)[^{]*\{(?![^}]*isCancelled)(?![^}]*checkCancellation)[^}]*await\s+\w+\.send\(' --include='*.swift' Sources` (B-C5a) and the same with `while\b` in place of `for\b` (B-C5b); output = files whose send loop never checks. Known misses: a `try Task.checkCancellation()` inside a callee; nested braces end the scan at the first `}`. "No public API" is a reading heuristic.
- Run: RED/GREEN. B-C8, B-C5a and B-C5b (R12: dependency lines and `Streams.swift` on the plant, empty with exit 1 on the twin, including the `while count < 100, !Task.isCancelled` header form); behaviour B-V05; memory B-V03; capture error and missing members B-V14.
- Binds: server (yes), CLI and app (internal only), SDK (no). Floor: swift-async-algorithms 1.0 (`AsyncChannel`), 1.1 (multi-producer); Apple OS floors unverified: read only.

#### Group 3: a behavioural test decides (exit code, timing or memory)

**SW-CONC-22 (MUST). Use checked continuations; resume each exactly once on every path (a once-guard `Mutex<CheckedContinuation?>` with `take()`); resume outside any lock; wrap external-event waits in `withTaskCancellationHandler` and re-check `Task.isCancelled` after storing the continuation; run tests of continuation code under `timeout`; `withUnsafe*Continuation` needs a comment citing a measurement; where an async overload already exists, use it instead of a wrapper.**
- Why (SE-0300): a leaked checked continuation hangs (`timeout` exit 124; the runtime only logs `SWIFT TASK CONTINUATION MISUSE … leaked`); a double resume is `Fatal error … more than once`, SIGILL, exit 132 on x86_64 (arm64: SIGTRAP 133, reported, not measured); unsafe variants give no diagnostic (hang, or exit 134 heap corruption). `onCancel` runs before the body when the task is already cancelled, so a handler plus continuation needs the pre-check (hang without it, exit 124).
- Verify: `timeout 60 swift test` exit 124 is the leak signal; `grep -rn -e 'withUnsafeContinuation' -e 'withUnsafeThrowingContinuation' --include='*.swift' Sources` (each hit commented); reading: every `withChecked*` registering a callback has a handler or a documented never-cancelled reason. Shape: `swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:353-358`.
- Run: RED/GREEN. T-V04 to T-V07 (leak 124 / ok 0; double 132; handler 0; pre-cancel guard 0), T-V34 (grep 1 hit / 0); unsafe variants observed only (T-V08, T-V09).
- Binds: all code. Floor: Swift 5.5.

**SW-CONC-23 (SHOULD). Blocking syscalls or CPU work longer than a few milliseconds run off the pool behind one cancellable continuation on a dedicated `Thread`, a private `DispatchQueue(label:)` or `NIOThreadPool.runIfActive`, not on `DispatchQueue.global()` and not via `@concurrent`; `onCancel` wakes the call (wake pipe, kill, close of the peer) or the call carries an OS-level timeout; pure-CPU loops call `try Task.checkCancellation()` once per bounded unit.**
- Why: of the primitives measured, only `Task.sleep`, `clock.sleep`, `checkCancellation`, `isCancelled` and `for await` over an `AsyncStream` observe cancellation, plus library awaits that implement it (`AsyncChannel.send` returns without sending, the multi-producer `send` throws, SW-CONC-35; conflict 22); `read(2)`, libc `sleep`, `Thread.sleep`, `DispatchSemaphore.wait`, `Process.waitUntilExit`, a parked continuation and an unchecked CPU loop finished at 1000 ms of 1000 ms after a cancel at 200 ms (T-V39). `swift-subprocess` `run()` is the exception that does react: it returns normally with `.signaled(9)` on cancel (SW-IO owns the wrapper). Pool width is the core count: `@concurrent` blocking consumers hang at 32 on a 32-core host; `DispatchQueue.global()` hangs between 48 and 56; private queues and threads scaled to 256 (R7).
- Verify: behavioural: cancel the task at 200 ms and assert it returns within 2×; a pool-starvation test that blocks `ncores` tasks; reading: a blocking syscall in an `async` body without the wrapper, backed by SW-CONC-15's grep. Shipped form: `swift-nio@e12881f2a691:Sources/NIOPosix/NIOThreadPool.swift:454-476`.
- Run: RED/GREEN for behaviour: T-V13 (`blocking-group` timeout seen at 4000 ms, `blocking-offpool` at 1000 ms), R7 (new). The reading heuristic itself was not run.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 5.5. Thresholds are host-specific (32 cores, WSL2).

**SW-CONC-24 (SHOULD). A timeout helper returns a distinct `TimeoutError`, never `CancellationError`, from a structured race on `ContinuousClock`; document that it is only as prompt as the operation's cancellation points; never race with two unstructured tasks and a continuation; adopt `withDeadline` only after it ships (SE-0526, accepted with modifications 2026-07-30, expected Swift 6.5, absent in 6.4).**
- Why: `apple/containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift:26-41` throws `CancellationError` on timeout (callers re-derive it, `LinuxProcess.swift:185-199`), traps with `fatalError()` on an empty group, and returned at 4000 ms for a 1 s limit around a blocking `read`; the unstructured race returns on time but the orphan read finishes at 4000 ms.
- Verify: `grep -rn -e 'throw CancellationError()' --include='*.swift' Sources` (a hit must answer observed cancellation, not a timer); a behavioural test with a blocking operation asserting the caller returns within limit + slack; `swift build` rejects invented names (`withTimeout`, `Task.timeout`, `cancelAfter`, `Task.sleep(seconds:)`, `withDeadline` on 6.4). The measured helper is in [tasks §6] (`withThrowingTaskGroup(of: T?.self)`; fast op returns at 50 ms, slow cooperative op throws `TimeoutError` at 200 ms, outer cancel throws `CancellationError`). The same race inside a shield is SW-CONC-33.
- Run: RED/GREEN. T-V13, T-V14, T-V22 (`cannot find 'withDeadline' in scope`, exit 1), T-V24, T-V28, T-V40.
- Binds: SDK, CLI, server, OCI tooling. Floor: Swift 5.7 (`Clock`).

**SW-CONC-25 (SHOULD). In an actor, never read state, `await`, then act on the earlier read: mutate before suspending, re-check after, or park the in-flight `Task` in a dictionary for dedupe.**
- Why: reentrancy drove a balance of 100 to −500 under 10 concurrent withdrawals, and a cache stampede made 10 remote fetches instead of 1 (6.3 and 6.4 identical).
- Verify: a concurrent test with 10 callers asserting the invariant (exit 1 on violation); reading: an `if` or `guard` on actor state, then `await`, then a write to the same state. Compliant shape: `apple/containerization` `AsyncLock.swift:39` re-checks `while self.busy` after each resume.
- Run: RED/GREEN for the test shape (T-V19); the reading heuristic was not run.
- Binds: all code with actors. Floor: Swift 5.5.

**SW-CONC-26 (SHOULD). Never rely on `MainActor.assumeIsolated` for a callback whose queue you do not control; hand Swift-5-mode or C callers a `@Sendable` closure and hop with `Task { @MainActor in … }`; assert isolation with `MainActor.preconditionIsolated()` or `#isolation`, never `Thread.isMainThread`; a `@MainActor` type adopting a nonisolated protocol writes `: @MainActor P`, not a `nonisolated` witness over `assumeIsolated`.**
- Why: three traps measured, all exit 132 through `_dispatch_assert_queue_fail`: `assumeIsolated` off main, a closure inferred `@MainActor` invoked by Swift-5-mode code off main, a `@preconcurrency` conformance called off main; a fourth, the `DispatchSource` signal handler written inline in `main.swift` or in a `@MainActor` scope, is SW-CONC-34; `Thread.isMainThread` read false after a hop away from and back to the `MainActor` while the function was still correctly isolated. Isolated conformances (SE-0470): `@MainActor class Model: @MainActor Equatable` builds; using it where `Sendable` is required fails `[#IsolatedConformances]`. Apple runtime cases (`awakeFromNib`, ObjC callbacks) are unverified: read only.
- Verify: `grep -rn -e 'assumeIsolated' -e 'isMainThread' -e 'nonisolated static func ==' --include='*.swift' Sources` (sites to justify), then run the callback path once on the target OS. A trap on a libdispatch worker thread reports exit 132 only if the process dies from it: run with `SWIFT_BACKTRACE=enable=no` and check the callback's side effect (gap f, R14; I-V13 was not re-run).
- Run: RED/GREEN. I-V13 (132 on 6.4 and 6.3, `hop` twin 0), I-V13b, I-V15.
- Binds: CLI, server, app, anything with Swift-5 or C callers. Floor: Swift 6.0; isolated conformances 6.2.

**SW-CONC-27 (SHOULD). Run `swift test --sanitize=thread` as an advisory CI leg only (Docker needs `--security-opt seccomp=unconfined`), expect a false positive on correct `Mutex` code, and keep a deterministic count assertion for every hatch-guarded type.**
- Why: default Docker seccomp gives `FATAL: ThreadSanitizer: encountered an incompatible memory layout but was unable to disable ASLR`, exit 1; with it, the racy class reports `Swift access race` (exit 1) and the `NSLock` and actor twins are green, but a correct `Mutex` class also reports 1 race (6.3 and 6.4); `#expect(c.n == expected)` failed 5 of 5 runs on the racy class.
- Verify: the TSan run plus `swift test --filter` over the count assertion.
- Run: RED/GREEN (I-V7a, I-V7b, I-V8); the `Mutex` false positive is a measured limitation.
- Binds: test code. Floor: Linux, Swift 6.3 and 6.4.

**SW-CONC-31 (MUST for servers and daemons, SHOULD for CLIs; added in the revision, amends SW-CONC-19). An accept loop that spawns one child task per connection or request caps in-flight children at a named constant (`maxInFlight`, `maxConnections` or `maxConcurrent…`). Default: a `group.next()` window on a plain `withTaskGroup(of: Void.self)`. When the loop must stay in a discarding group, take a token from an `AsyncStream<Void>` (built with `bufferingPolicy: .bufferingNewest(maxInFlight)` and pre-filled with `maxInFlight` tokens) before pulling the next accept and `yield()` it on handler exit. Use a counter that refuses (HTTP 503 or close) only where refusing is the defined overload response. A discarding group alone is not a cap.**
- Why: 10,000 instant accepts held 10,000 live handlers and 201,060 KiB (0.25 s). The window, the tokens and the shedding counter held 256 in flight at 26,540, 27,760 and 16,732 KiB (3 runs of the first two: 26,496 / 31,452 / 28,016 against 31,732 / 27,688 / 33,940 KiB, indistinguishable); the two waiting designs took 8.0 s, `shed` 0.20 s with 9,744 refused; 6.3 repeated the peak counts [B-V06]. `group.next()` does not exist on a discarding group (`value of type 'DiscardingTaskGroup' has no member 'next'`, B-V14). The window drains each child, so it also satisfies SW-CONC-19. `apple/containerization` already writes it (fill N, then add one per completion). Window against shed is a product choice (latency against availability): name it, and do not combine both on one listener.
- Verify: `grep -rl -e 'DiscardingTaskGroup' --include='*.swift' Sources | xargs -r grep -L -e 'maxInFlight' -e 'maxConnections' -e 'maxConcurrent' -e 'group.next()'` (B-C6, output = files with a discarding group and no cap vocabulary; judge by output, `xargs` exits 123 when a file is listed; known miss, by construction: a cap word anywhere in the file, even in a comment or on an unrelated group, silences it). Behaviour: a flood test with ten times the cap's connections asserting peak in-flight at most the cap (`LIMIT_INFLIGHT`, the `FX/accept` shape). Reading heuristic: the constant is named in the config surface with a documented default, and every accept path (TLS handshake, HTTP/2 stream children) passes through it.
- Run: RED/GREEN. B-C6 (R12: `Server.swift` on the plant, rc 123; empty on the twin that carries the window file and a token file, rc 0); B-V06 (`unbounded` exit 1 with `FAIL: peak_in_flight 10000 > LIMIT_INFLIGHT=256`; `window`, `tokens`, `shed` exit 0; 6.4 and 6.3). The "every accept path" clause is reading only.
- Binds: server, daemon, OCI registry and proxy code. Floor: Swift 5.9 (discarding groups); the window needs 5.5.

**SW-CONC-33 (MUST; added in the revision). A shielded cleanup is bounded: it races a deadline inside the shield (a task group of the cleanup and a `Task.sleep`, `cancelAll()` on the winner) and ends in a defined outcome. A CLI keeps the second-press escape of SW-CLI-11 (the second signal restores `SIG_DFL` and re-raises); a server built on swift-service-lifecycle sets `ServiceGroupConfiguration.maximumGracefulShutdownDuration` and `maximumCancellationDuration` (both default to nil, no bound), and any other server bounds both stages itself.**
- Why: a shielded sleep of one hour kept the process alive past `timeout 5` (exit 124) until a second signal ended it (exit 130; 143 for two SIGTERMs); the deadline race inside the shield ended at 0.61 s with the fixture's exit 3 [B-V10]. It works because children created in a shield are not cancelled by the outer task but `cancelAll()` still cancels them (SE-0504). The shield hides cancellation; it times nothing out, and `withDeadline` (SE-0526) is absent in 6.4. clig.dev: "if you hit Ctrl-C during clean-up operations that might take a long time, skip them". The exit code of a missed deadline is SW-CLI's to map. `maximumCancellationDuration` is documented to escalate to a `fatalError` when it elapses (`swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroupConfiguration.swift`, doc comment of the property, read, not run), so for a server the defined outcome of the last stage is a crash that flags a non-cooperative API, and the graceful stage is the one to size.
- Verify: behaviour: a cleanup stub that never returns must make the process exit within deadline plus slack with the documented code, and a second signal must exit 128+n (`FX/run-signals.sh`). Reading: `grep -rn -e 'withTaskCancellationShield' --include='*.swift' Sources` lists every shield, and each body that awaits I/O has a deadline in scope (gap d: no mechanical check).
- Run: RED/GREEN for the behaviour. B-V10 (`shield-hang` exit 124 without a second press, 130 with it; `shield-deadline` exit 3); the grep and the "every shield has a deadline" judgement are reading only. Precedents: `swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroupConfiguration.swift:155,183`; `swift-package-manager@5546f44a3b52:Sources/Basics/Cancellator.swift:56,69-75,154-157,179` (SIGINT source, 30 s deadline, handlers at 80% of it, `SIG_DFL` re-raise).
- Binds: CLI, daemon, server. Floor: Swift 6.4 for the shield; the deadline race needs only Swift 5.7 (`Clock`).

#### Group 4: a reading heuristic decides

**SW-CONC-28 (MUST, reading heuristic). Resolve a Sendable or isolation diagnostic in ladder order and name the highest rung that applies before adding a hatch: (1) delete the sharing; (2) value type or `let` (`weak let` for weak back-references, 6.3); (3) `@MainActor`; (4) `sending`; (5) `Mutex<State>` in a `final class: Sendable`; (6) a commented `actor`; (7) per-import `@preconcurrency`; (8) `@unchecked Sendable` or `nonisolated(unsafe)`; (9) `MainActor.assumeIsolated` for callbacks documented to arrive on main. Never: `Task.detached` to dodge a diagnostic, `MainActor.run` as a fix, a semaphore bridge, `Thread.isMainThread` as a test.**
- Why: agents jump to rung 8 and the compiler cannot tell the rungs apart; the migration guide says "attempting to make it `Sendable` should not be your first approach". Massicotte's order puts `@MainActor` before locks for singletons.
- Verify: "for every hatch the diff adds (S1 and S3 output on the diff), name the highest rung that applies and show why it does not"; a hatch added while a lower rung applies is the defect. It can only be a reading heuristic because choosing the rung needs knowledge of how the type is used; the mechanical parts are SW-CONC-01, -02, -05, -09.
- Run: the mechanical parts RED/GREEN (I-V1d, I-V3, I-V14); the judgement is reading only.
- Binds: all code. Floor: Swift 6.0.

**SW-CONC-29 (SHOULD). Choose shared-state tools by condition: `Mutex<State>` for synchronous short sections; `actor` only with a "this is an actor because" comment naming a condition (non-Sendable state mutated atomically across suspension points, or callers must `await` anyway); `@MainActor` for UI and singletons; a custom `@globalActor` only with the same comment; `NIOLockedValueBox` only inside the NIO stack; `OSAllocatedUnfairLock` only when the Apple floor is below macOS 15 / iOS 18 (unverified: read only).**
- Why: an actor whose bodies are synchronous over `Sendable` state costs an `await` on every call; the corpus has 3 global actors in 40 repos; the NIO stack predates `Mutex` and keeps `NIOLockedValueBox` (54 uses in swift-nio against 1 `Mutex<>`), while vapor and grpc-swift-2 use `Mutex`.
- Verify: S4 on changed files (a whole-tree run would fail most of the 151 audited actors), then read the sentence: "helps with concurrency errors" is not a reason.
- Run: RED/GREEN for S4. I-V12 and R3 (prints `Counter` and `ImageActor`, empty on the twin); the sentence quality is reading only.
- Binds: all code. Floor: Swift 6.0 for `Mutex`.

### Crosswalk and dropped rules

| Sub-artifact rule | Consolidated | Map row |
|---|---|---|
| iso 01 | 28 | M-B-03 |
| iso 02 | 01 (S1 to S5) | M-B-01 |
| iso 03 | 09 | M-B-02 |
| iso 04 | 02 | M-B-05 |
| iso 05 | 29 | M-B-04 |
| iso 06 | 08 | M-B-06 |
| iso 07 | 11 | M-B-07 |
| iso 08 | 06 | M-B-08 |
| iso 09, 17 | 07 and 12 | M-B-09, M-B-10 |
| iso 10 | 12 | M-L-03 |
| iso 11 | 10 | M-B-22 |
| iso 12, 14 | 26 | M-B-23, M-B-25 |
| iso 13 | 05 | M-B-24 |
| iso 15 | 04 | M-B-28 |
| iso 16 | 27 | M-B-01 supplement |
| tasks T01 | 13 | M-B-11 |
| tasks T02 | 03 | M-B-11 |
| tasks T03 | 14 | M-B-12 |
| tasks T04 | 15 and 16 | M-B-20 |
| tasks T05 | 23 | M-B-14, -29 |
| tasks T06 | 22 | M-B-16, -21 |
| tasks T07 | 24 | M-B-17 |
| tasks T08 | 17 | M-B-14 |
| tasks T09, T10 | 20; T09's cleanup half moved to 32 in the revision | M-B-15, -26 |
| tasks T11 | 18 (its policy choice moved to 30 in the revision) | M-B-18 |
| tasks T12 | 19 (its in-flight cap moved to 31 in the revision) | M-B-27 |
| tasks T13 | 25 | M-B-19 |
| tasks T16 | 21 (amended in the revision) | M-B-20 |
| bp 30 | 30; its construction greps (C1, C3a to C3c) live in 18 as S7 | M-B-18 |
| bp 31 | 31; amends 19 | M-B-27 |
| bp 32 | 32; amends 20 | M-B-15 |
| bp 33 | 33 | M-B-15 |
| bp 34 | 34 | M-B-23 |
| bp 35 | 35 | M-B-18 |
| bp 36 | not adopted as a rule (below) | none |

Dropped as rules, kept as failure-mode rows: bp 36 (use only the shield and backpressure names that exist: the only verification is `swift build`, which already rejects each invented form; the real and invented spellings are failure-mode row 22, the T15 precedent below), iso 18 (`fputs(…, stderr)` is `error: reference to var 'stderr' is not concurrency-safe` in Swift 6 mode; the compiler tells the agent, the stream contract belongs to SW-CLI), tasks T14 (no new completion-handler APIs: common knowledge; the bridging clause lives in SW-CONC-22), tasks T15 (`Task.sleep(for:)`, invented names: the compiler rejects them). M-B-13 (`Task.immediate`, P3) is not researched and has no rule.

### Consolidator re-runs (2026-10-10, `swift:6.4` and `swift:6.3` through `run.sh`)

Fixtures in `/home/mherwig/.cache/research-lang/swift-tools/fixtures/concurrency-consolidation/`; plants copied from the two dives, not edited.

| ID | Command | Result |
|---|---|---|
| R1 | S1 with `-v pat='@unchecked Sendable'` and `-v pat='nonisolated(unsafe)'` over `isolation-and-sendable/a-unchecked/Sources` and `a-twin/Sources` | plant: 1 line each (`Counter.swift:6`, `Globals.swift:5`); twin: 0 lines |
| R2 | `run.sh bash checks/hatch-removal.sh j-remove-hatch/redundant` and `…/legit` (6.4) | `removal-build-exit=0` and `removal-build-exit=1` |
| R3 | S2 over `h-preconcurrency/Sources` and `twin-Sources`; S4 over `p-actor-reason/red` and `green` | S2: `B_Preconcurrency.swift:1`, `C_Unneeded.swift:1` / empty; S4: `Counter`, `ImageActor` / empty |
| R3b | S2 with `EmscriptenLibc` added, over `pc-plant/red` (`EmscriptenLibc`, `Glibc`, `Legacy`) and `pc-plant/green` (shims plus a commented `MatrixRustSDK`) | red: only `Legacy`; green: empty |
| R4 | `task.sh`, `gcd.sh`, `checks.sh <name>` over `tasks-and-cancellation/g-grep/bad/Sources` and `good/Sources`; plus the split rule-15 and rule-16 greps | task 7 lines exit 0 / empty exit 1; gcd 7 lines / empty; split: rule 15 four lines (5, 8, 15, 16), rule 16 three lines (12, 13, 14), twins empty; `cancelerr` 1, `deinit` 1, `stream` 4, `group` 1, `callback` 1, `trysleep` 3 (two not in a loop), `unsafecont` 1, `detached` 2; twins 0 |
| R5 | `run.sh swiftlint lint --quiet --config .swiftlint.yml bad/Sources` (only `custom_rules`, regexes for the Task and GCD bans) | exit 0; `warning: Skipping enabled rule 'custom_rules' because it requires SourceKit and SourceKit access is prohibited.` |
| R6 | `d-nonsending`: `NNBD=0` / `NNBD=1` `swift build` then `probe-cli assert` (6.4) | both builds exit 0; run exit 132 (`Illegal instruction`) / exit 0 (`fAssert() passed`) |
| R7 | new `concurrent-pool` probe: N blocking `sem.wait()` consumers, then a producer that is another Swift task; `timeout 20 probe <mode> <N>`; modes `concurrent` (a `@concurrent` function), `global` (`DispatchQueue.global().async` behind a continuation), `private` (`DispatchQueue(label:)`), `thread` (`Thread`) | 6.4: `concurrent` 8 and 31 exit 0, 32 and 64 exit 124; `global` 16, 31, 32, 33, 40, 48 exit 0, 56 and 64 exit 124; `private` 64 and 256 exit 0; `thread` 64 and 256 exit 0. 6.3: `concurrent` 31 exit 0, 32 exit 124; `global` 64 exit 124; `private` 64 and `thread` 64 exit 0. 32-core WSL2 host |
| R8 | `python3 -I recount.py` over the 40 exemplar clones, excluding test, example, fixture, benchmark and vendored directories, `*Tests.swift`, `*.pb.swift`, `*.grpc.swift`, manifests and files whose first 25 lines say generated (9,455 files; the audit has 9,537) | `@unchecked Sendable`: 554 lines, 380 without a comment (69%; swift-build 184 of 237; without swift-build 196 of 317); `nonisolated(unsafe)`: 200 lines, 98 without (49%); non-shim `@preconcurrency import`: 101 lines, 98 without |

Revision re-runs (2026-10-10, same toolchain images; R9 to R12 in `/home/mherwig/.cache/research-lang/swift-tools/fixtures/concurrency-revision/`, plants copied from the backpressure round and extended by one mode or one twin each; R13 and R14 in `…/fixtures/concurrency-revision2/`, written by the verification pass). The verification pass also re-ran R9, R10, R11 and the backpressure round's `checks.sh` and `run-handler.sh` unchanged, and all reproduced.

| ID | Command | Result |
|---|---|---|
| R9 | `cleanup-plain`: the backpressure round's `cleanup` fixture plus a mode `catch-plain` (`do { try await body(r) } catch { await cleanup(r); throw error }`, then `await cleanup(r)`); `swift build` then `run.sh env TMPFILE=… cleanup catch-plain` and `cleanup task-value`; SIGINT self-sent at 0.3 s; `SWIFT_VERSION=6.3` and 6.4 | `catch-plain`: `cleanup ABORTED by cancellation (CancellationError()); file left behind`, exit 1, on 6.3 and 6.4. `task-value` (`await Task { await cleanup(r) }.value`): `cleanup completed` at 0.40 s, exit 0, on 6.3 and 6.4. Settles conflict 20 |
| R10 | `groups`: S8 over `bad` (a plain `withTaskGroup(of: Void.self)` and a `withThrowingTaskGroup(of: Void.self)` that are never drained) and `good` (a `group.next()` window, a discarding group, a plain `of: Int.self` group reduced) through `run.sh bash -c` (GNU grep 3.12) | bad: `Sources/App/Undrained.swift`, rc 123; good: empty, rc 0. The old SW-CONC-19 grep would have flagged the window too |
| R11 | `run.sh swiftlint lint --no-cache --quiet --config .swiftlint.yml Sources` (static) and `swiftlint-sk.sh lint …` (SourceKit image), same `custom_rules` yml and the backpressure round's `checks/bad` and `checks/good`; count `Skipping enabled rule` lines and `: error:` lines | static: rc 0, 1 skip line, 0 violations on both bad and good. SourceKit: bad rc 2, 0 skip lines, 5 violations; good rc 0, 0, 0. Settles conflict 7 |
| R12 | the backpressure round's `checks.sh` re-run unchanged (patterns B-C1 to B-C8) over its `checks/bad` and `checks/good`, once on the host `grep` and once inside the swift:6.4 image through `run.sh bash checks.sh` (GNU grep 3.12) | C1, C2, C3a, C3b, C3c, C4, C5a, C5b, C7, C8: output with exit 0 on bad, empty with exit 1 on good. C6: `Server.swift` with rc 123 on bad, empty with rc 0 on good. All recorded results reproduced |
| R13 | `sigmain` (Swift 6 mode executable; a `DispatchSource` signal source on SIGUSR1, self-sent after 100 ms, main sleeps 4 s after it): modes `nonisolated` (free function, plain closure), `mainactor-func` (`@MainActor func`, plain closure), `mainactor-type` (method of a `@MainActor final class`), `mainactor-sendable` (`@MainActor func`, `{ @Sendable in … }`); `timeout 60 run.sh env SWIFT_BACKTRACE=enable=no <bin> <mode>` on 6.4 and 6.3. S9 (`bash s9.sh` inside `swift:6.4`, and host `grep`) over `sigmain-plant` (three installers in `Installers.swift`) and `sigmain-twin` (nonisolated only, builds, exit 0, `hits=1`); S9 over the 10 corpus files that contain `makeSignalSource` | 6.4 and 6.3: `nonisolated` exit 0 (`hits=1`); `mainactor-func` exit 132; `mainactor-type` exit 132; `mainactor-sendable` exit 0 (`hits=1`). Stack: `_dispatch_assert_queue_fail` from `swift_task_isCurrentExecutorWithFlags` from `closure #1 in installMainActorFunc()`. S9: plant `Sources/sigmain/Installers.swift` rc 0, twin empty rc 123; no corpus file combines `makeSignalSource` and `@MainActor`. Settles conflict 23 |
| R14 | the `sigmain` binary of R13 without `SWIFT_BACKTRACE=enable=no` (the image default), with main sleeping, and with `PARK=1` (main in `dispatchMain()`); the R6 `probe-cli assert` (NNBD off) with and without `enable=no` | `mainactor-func`, default backtracer, main sleeping: exit 0 in 9 of 9 runs with `Program crashed: Illegal instruction` on stderr and `survived … hits=0` printed. `enable=no`: 132 in 6 of 6 (function and type, 6.4). `PARK=1`, default backtracer: 132 in 3 of 3, no `survived` line. R6 `assert`: 132 under both settings. Source of gap (f) |

## Applied to the exemplars and the future consumers

### Strict exemplars that already satisfy rules

| Rules | Exemplar |
|---|---|
| 01, 09 (guard plus reason) | `swift-nio@e12881f2a691:Sources/NIOPosix/ThreadWindows.swift:28-37`; `swift-distributed-tracing@a5270bd1280a:Sources/Instrumentation/Locks.swift:190-193`; `tuist@2f6ac74754bf:cli/Sources/TuistHTTP/TuistURLSessionDelegate.swift:28-31`; `swift-argument-parser@efd239f0055b:Sources/ArgumentParser/Parsing/Parsed.swift:28-32`; `swift-testing@c7d68ca20cd7:Sources/Testing/Test+Cancellation.swift:35` |
| 02, 29 (`Mutex`, locked box without a hatch on the user type) | `containerization` (38 `Mutex<>` uses, 1 `@unchecked Sendable` in 35,525 LOC, [conc] Axis 1); `async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPHandler.swift:543-548` |
| 04 | `swift-log@4038b6a4f74a:Package.swift:71` (unconditional `-require-explicit-sendable`) |
| 06 | `swift-protobuf@6c84c3dedac0:CompileTests/NonisolatedDeclarations/Package.swift:25` |
| 11 | 0 of 38 library and tool roots set `defaultIsolation`; app-internal use `IceCubesApp@2ad6e6891258:Packages/Timeline/Package.swift:41-42` |
| 12 | `swift-log@4038b6a4f74a:Package.swift:66-68` (NNBD by name with the docs link); also swift-async-algorithms, vapor, swift-aws-lambda-runtime, swift-dependencies, sourcekit-lsp, element-x-ios |
| 13 | `kean/Nuke@d5548dd61395:Sources/Nuke/Pipeline/TaskQueue.swift:174`; `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:130-131` (the sanctioned shutdown bridge); `IceCubesApp@2ad6e6891258:Packages/Env/Sources/Env/StreamWatcher.swift:173` |
| 15 | no blocking wait inside an `async` body in 40 repos; the `noasync` bridge `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/ConcurrencyHelpers.swift:28-40` |
| 19 (retention half), 20, 22, 23 | `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117` (discarding group; no in-flight cap, see the violations table); `async-http-client@017115279d09:Sources/AsyncHTTPClient/HTTPClient.swift:196-217`; `swift-async-algorithms@cbde9aed744b:Sources/AsyncStreaming/DuplexChannel/DuplexAsyncChannel.swift:353-358`; `swift-nio@e12881f2a691:Sources/NIOPosix/NIOThreadPool.swift:454-476` |
| 30 | `Alamofire@bda9ed57d729:Source/Features/Concurrency.swift:38,51,64,77,90` (the policy is a parameter on each public stream, default `.unbounded`, so the caller can bound it) |
| 31 | `apple/containerization@3e7bc39e66b3:Sources/Containerization/Image/ImageStore/ImageStore+Import.swift:123-141` and `ImageStore.swift:342-353` (fill N children, then add one per completion; `maxConcurrentDownloads` and `maxConcurrentUploads` default to 3) |
| 32 | `swift-nio@e12881f2a691:Sources/NIOPosix/StructuredConcurrencyHelpers.swift:47,58` (the pre-shield `Task { }.value`, comment "We need to have an uncancelled task here"); `vapor@bf77fc69b142:Sources/Vapor/Utilities/FileIO.swift:182-185` (the same workaround inside a 6.4 `defer`, with a comment on the crash it avoids) |
| 33 | `swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroupConfiguration.swift:155,183` (both durations); `swift-package-manager@5546f44a3b52:Sources/Basics/Cancellator.swift:56,69-75,154-157,179` (SIGINT source, 30 s deadline, handlers at 80%, `SIG_DFL` after) |
| 34 | `apple/containerization@3e7bc39e66b3:Sources/ContainerizationOS/AsyncSignalHandler.swift:30,100-101` (a class method installs the source); `swift-package-manager@5546f44a3b52:Sources/Basics/Cancellator.swift:69-70` |
| 35 | `swift-service-lifecycle@c55297914e26:Sources/ServiceLifecycle/ServiceGroup.swift:34,147,188` (an internal `AsyncChannel`, not in public API; the dependency is `from: "1.1.3"`) |

### Exemplars that violate rules

| Rule | Violation |
|---|---|
| 01(c) | 380 of 554 `@unchecked Sendable` lines have no comment (R8). Unguarded `var`s: `IceCubesApp@2ad6e6891258:Packages/Models/Sources/Models/Alias/HTMLString.swift:9`; copy-on-write box `Nuke@d5548dd61395:Sources/Nuke/ImageContainer.swift:147`. The swift-build `Spec` hierarchy (237 sites, `swift-build@2187330e13e7:Sources/SWBCore/SpecImplementations/ProductTypes.swift:16`) cannot be checked `Sendable` (non-final); it needs a root comment, not a rewrite |
| 02 | `swift-service-lifecycle@c55297914e26:Sources/ConcurrencyHelpers/LockedValueBox.swift:54` (a lock wrapper `Mutex` would replace); `swift-openapi-generator@c4f943e14015:Sources/_OpenAPIGeneratorCore/YamlFileDiagnosticsCollector.swift:23` (`NSLock` plus array, commented, but `Mutex<[Diagnostic]>` compiles) |
| 05 | `swift-aws-lambda-runtime@8abd464310c7:Sources/AWSLambdaRuntime/HTTPServer/Lambda+LocalServer.swift:117` (a hatch box whose initialiser already takes `sending`) |
| 09 | 98 of 200 `nonisolated(unsafe)` lines uncommented: swift-testing 23 of 36, sourcekit-lsp 17 of 40, swift-async-algorithms 15 of 24 (R8) |
| 10 | 98 of 101 non-shim `@preconcurrency import` lines uncommented: JavaScriptKit 32, sourcekit-lsp 14, tuist 12, element-x-ios 10 (R8) |
| 13 | strict OCI code: `apple/container@f70ecbb926d9:Sources/ContainerCommands/Machine/MachineLogs.swift:51` (a CLI signal loop with no marker); `apple/container@f70ecbb926d9:Sources/Services/ContainerAPIService/Client/FileDownloader.swift:33,44` (callback bridges without the marker). Elsewhere: `element-x-ios@14e33866ced2:ElementX/Sources/Screens/JoinRoomScreen/JoinRoomScreenViewModel.swift:413`; a bare throwing task `tuist@2f6ac74754bf:app/Sources/TuistPreviews/PreviewRunButton.swift:39`; no visible cancel `sourcekit-lsp@c6ce93d5f8aa:Sources/SourceKitLSP/Workspace.swift:253` |
| 18, 30 | 75 of 78 streams default, 0 bounded: `apple/container@f70ecbb926d9:Sources/ContainerXPC/XPCServer.swift:112`; `apple/container@f70ecbb926d9:Sources/ContainerBuild/URL+Extensions.swift:90-125` (`zeroCopyReader`: `.unbounded`, 1 MiB chunks yielded from a `DispatchIO` read with no consumer pacing, so a build-context file of any size lands in memory); `swift-package-manager@5546f44a3b52:Sources/Basics/Concurrency/SerialEventQueue.swift:32` (`.unbounded`, no stated bound); `rules_swift@50450ed24dde:tools/test_observer/SwiftTestingRunner.swift:115,311`; `swift-container-plugin` `Plugins/ContainerImageBuilder/Pipe+lines.swift:19` (a subprocess pipe stream with the default policy). 0 uses of `bufferingNewest` or `bufferingOldest` outside swift-async-algorithms and tests; B-C3a, B-C3b and B-C3c print 57 + 1 + 19 lines outside tests, examples and benchmarks |
| 19 (cap half), 31 | `hummingbird@1bd3b407fb47:Sources/HummingbirdCore/Server/Server.swift:117-125`, `swift-nio@e12881f2a691:Sources/NIOTCPEchoServer/Server.swift:60-76` and `Sources/NIOWebSocketServer/Server.swift:123-124` (discarding groups, no in-flight bound; hummingbird relies on the listener, so `ulimit -n` and memory are the real cap: unverified). `swift-aws-lambda-runtime@8abd464310c7:Sources/MockServer/MockHTTPServer.swift:103-115` takes one connection by design. B-C6 lists 18 files outside tests, among them grpc-swift-2 `GRPCServer.swift` and vapor `Application.swift`: candidates, each needs the reading step because a listener-level limit may exist (gap c) |
| 32 | `vapor@bf77fc69b142:Sources/Vapor/HTTP/Server/HTTPServerHandler.swift:41` (`defer { try? await bodyStream.drain(max: drainLimit) }`, unshielded) and `Sources/Development/routes.swift:131` (`defer { try? await handle.close() }`, unshielded; whether NIOFS `close()` observes cancellation is unread); `tuist@2f6ac74754bf:cli/Sources/TuistLoader/ProjectDescriptionHelpers/ProjectDescriptionHelpersBuilder.swift:208-211` and `app/Sources/TuistPreviews/PreviewsView/PreviewsViewModel.swift:82-90,108-116` (`defer { Task { … } }`). Zero uses of `withTaskCancellationShield` in all 40 clones. Vapor (tools 6.4) is the first exemplar with awaited defers, which corrects the tasks dive's "none uses SE-0493" |
| 34, 35 | none: B-C7 lists no `main.swift` under `Sources` and S9 lists no file (10 files contain `makeSignalSource`, none at the top level of an executable `main.swift`, none next to `@MainActor`), so the trap has no corpus instance and is an agent habit; there is no Swift SDK in the corpus to violate the dependency budget, and `AsyncChannel` otherwise appears only as `NIOAsyncChannel`, a different type with its own `HighLowWatermark(low: 2, high: 10)` default |
| 22 | `apple/containerization@3e7bc39e66b3:Sources/ContainerizationExtras/AsyncLock.swift:40` (waiters use `withCheckedContinuation` with no cancellation handler: a cancelled waiter stays queued) |
| 23 | `apple/containerization@3e7bc39e66b3:Sources/Containerization/CHStdioPortSlot.swift:127` runs a blocking accept loop on `DispatchQueue.global`, with a comment that the global queue "spawns OS threads on demand": true on Darwin (unverified: read only), false on Linux (R7) |
| 24 | `apple/containerization@3e7bc39e66b3:Sources/ContainerizationExtras/Timeout.swift:26-41` |
| 07 | the break the feature causes: `swift-service-lifecycle@c55297914e26:Sources/UnixSignals/UnixSignalsSequence.swift:79-81` (reproduced as I-V9b) |

### New commitments for a Swift SDK, Swift CLIs and OCI tooling

- **Swift SDK wrapping the ocx CLI** (floor tools 6.2, async-only public API):
  - Rules 11 (no `defaultIsolation`), 12 (NNBD by name), 04 (every public result type states `Sendable`) and 06 (a `CompileTests/` package) bind it from the first commit.
  - One spawn module owns subprocess work. Its cancellation and timeout follow rules 22 to 24 and the SW-IO subprocess rules: `run()` returns normally with `.signaled(9)` on cancel, so the wrapper checks `Task.isCancelled` and throws `CancellationError` itself, and a timeout is a typed error from the SW-CONC-24 race, never `CancellationError`.
  - The SDK owns no long-lived resources unless it adds a client handle; if it does, rule 20 applies (awaited `close()`).
  - Where `ocx-sdk-python` keeps sync and async twins, the Swift SDK has no `completion:` surface.
  - Streams and cleanup (rules 18, 30, 32, 33, 35): no `swift-async-algorithms` (owner Q4: 6,244,408 B against 83,160 B), so a lossless push source is a pull source or carries an annotated bound; any cleanup that shells out to `ocx` is shielded and bounded, because a cancelled swift-subprocess `run()` returns `.signaled(9)` after 0.20 s and `.exited(0)` shielded (SW-IO-27 owns the wrapper).
- **Swift CLIs in the ocx/grimoire mould** (current release, `AsyncParsableCommand`):
  - Never `defaultIsolation` (rule 11): the entry point is already `@MainActor`.
  - Every `Task` is owned or marked (rule 13). `MachineLogs.swift:51` above is the shape to avoid: a signal loop in a `Task` with no marker.
  - No blocking primitives in `run()` (rule 15). Retry and poll loops never `try?` a sleep (rule 17).
  - Shutdown paths await `close()` before the process exits (rule 20): `exit()` abandons pending tasks.
  - Ctrl-C (rules 32 to 34 with SW-CLI-11): the two-stage handler installs its `DispatchSource` from a nonisolated function in a file other than `main.swift` (never from `@MainActor` code), cleanup is `defer { await withTaskCancellationShield { … } }` with a deadline race inside, and the second press restores `SIG_DFL` and re-raises.
  - Exit-code mapping after cancellation belongs to SW-CLI.
- **OCI tooling in the apple/containerization mould** (registry clients, blob streaming): bounded streams for progress (rules 18, 30: `.bufferingNewest(n)`) and pull streams for blob payload bytes (`AsyncStream(unfolding:)`; `apple/container`'s unbounded `zeroCopyReader` is the shape to avoid), a `group.next()` window with a named `maxConcurrent…` for concurrent blob transfers (rule 31, the `ImageStore` shape), a cancellable lock or semaphore replacing `AsyncLock` (rule 22), the typed-timeout race (rule 24), and off-pool blocking on a private queue or thread, not `DispatchQueue.global()` (rule 23).

## AI-agent failure modes

Ranked by how often it bites: measured corpus prevalence times how likely a coding agent emits it without being told.

| # | Failure | Why it survives the build | Mechanical check | Rule |
|---|---|---|---|---|
| 1 | Statement-position `Task { … }` as fire-and-forget, including `Task { try await f() }` | non-throwing: no diagnostic anywhere; throwing: `@discardableResult` (6.4 group only) | SW-CONC-13 grep; `-Werror NoUseUnstructuredThrowingTask` on 6.4 | 13, 03 |
| 2 | `@unchecked Sendable` or `nonisolated(unsafe)` to silence an error, on an unguarded or `Mutex`-only class | swiftc and SwiftLint are silent; 128,131 of 400,000 updates lost | S5 removal test, S1 on the diff, S3 | 01, 02, 09, 28 |
| 3 | `DispatchSemaphore`, `Thread.sleep`, `usleep` or a `.wait()` in async code | only `Thread.sleep` and locks are rejected; main-actor deadlock exit 124 | SW-CONC-15 grep | 15 |
| 4 | `await MainActor.run { }`, `DispatchQueue.main.async`, `Task.detached` "to leave the main actor" | compile; the corpus does not do the first | SW-CONC-16 and -14 greps | 16, 14 |
| 5 | `@preconcurrency import` to silence a Sendable error | hides the race with no warning | S2 | 10 |
| 6 | `try? await Task.sleep` in a poll or retry loop | compiles; hot spin on cancel | SW-CONC-17 grep, cancel-then-count test | 17 |
| 7 | A timeout helper that throws `CancellationError`, races with `Task.sleep` and expects the work to stop, or calls an invented API (`withTimeout`, `withDeadline`, `Task.timeout`, `Task.sleep(seconds:)`) | compiles (helper) or fails fast (invented names) | `swift build`; the SW-CONC-24 grep and blocking-operation test | 24 |
| 8 | A continuation around a callback with no cancellation handler, resumed on two branches, or `withUnsafe*Continuation` "for speed" | hang or SIGILL only at runtime | `timeout` on tests; unsafe grep | 22 |
| 9 | Unbounded `AsyncStream` for an event firehose; `bufferingNewest(0)`; a lossy policy on payload bytes | compiles; 416 MB versus 11 MB; 0 of 2,000 delivered; 1,992 of 2,000 dropped | S7 (SW-CONC-18); the SW-CONC-30 zero-count grep and flood test | 18, 30 |
| 10 | Settings: `defaultIsolation` in a library or CLI; flipping NNBD blindly; copying the template's `ApproachableConcurrency`; hallucinating `.defaultIsolation(.MainActor)` | compiles; behaviour flips silently (132 versus 0) | SW-CONC-11 grep and S6; runtime assert on two toolchains; SW-CONC-12 grep | 07, 11, 12 |
| 11 | An `actor` for a client with only `Sendable` members; check-await-act inside an actor | compiles; reentrancy −500 | S4; concurrent invariant test | 29, 25 |
| 12 | `deinit { Task { … } }`, `defer { Task { … } }`, an awaited `defer` without a shield, or a plain `await close()` in a `catch` | the `self` form is rejected, the rest lose work or abort under cancellation | SW-CONC-20 greps; the SW-CONC-32 grep (B-C4) and cancel-then-assert test | 20, 32 |
| 13 | `MainActor.assumeIsolated` in a delegate or callback; `Thread.isMainThread` as the isolation test | traps at runtime (132) | SW-CONC-26 grep, callback run | 26 |
| 14 | An undrained `withTaskGroup(of: Void.self)` per connection, or a discarding group with no in-flight cap | compiles; leaks 1 GB per 200,000 children, or holds 10,000 live handlers | S8 (SW-CONC-19), B-C6 and the flood test (SW-CONC-31) | 19, 31 |
| 15 | Treating TSan green as proof for `Mutex` code, or red as proof of a race; running TSan in Docker unmodified | false positive; Docker blocks it | SW-CONC-27 | 27 |
| 16 | `fputs(…, stderr)` in Swift 6 mode, completion-handler parameters on new API, `Task.sleep(nanoseconds:)` | the first is a compile error; the others compile | `swift build`; `grep -rn -e 'completion:' -e 'completionHandler:' --include='*.swift' Sources`; `grep -rn -e 'sleep(nanoseconds' --include='*.swift' Sources` (SW-CLI owns stderr) | 22 |
| 17 | Treating `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` as a Linux CI gate, or SwiftLint `custom_rules` on the static binary | both pass silently | R5, R11; the greps above; any `Skipping enabled rule` line fails the gate | 21 |
| 18 | A shield around an unbounded wait, or a shielded cleanup with no deadline and no second-press escape | compiles; the process ignored the first signal for 5 s (exit 124) | SW-CONC-33 hang-stub test and reading; the shield grep lists the sites | 33 |
| 19 | A `DispatchSource` signal handler written inline in `main.swift` top-level code, or inside a `@MainActor` function or type | compiles; traps off the main actor (exit 132, or exit 0 with a crash report when another thread keeps the process alive) | B-C7 and S9 greps; `kill -INT` once under `SWIFT_BACKTRACE=enable=no` and assert the exit code is not 132 and the handler's side effect happened | 34 |
| 20 | Adding swift-async-algorithms to the SDK for `AsyncChannel`; an `AsyncChannel` producer loop with no cancellation check; treating `send` returning as delivery | builds; breaks the dependency budget; the loop runs to the end as a no-op after cancel | B-C8; B-C5a and B-C5b | 35 |
| 21 | A subprocess spawned by cleanup with no shield, or `Task.detached { await cleanup() }` to escape cancellation | compiles; `run()` returns `.signaled(9)` on the cancelled owner; the detached task is unawaited and may outlive the process | SW-CONC-32 reading plus cancel-then-assert test; SW-CONC-14 grep | 32 |
| 22 | Invented shield and backpressure names: `Task.hasActiveTaskCancellationShield` (the acceptance post's wording), `withCancellationIgnored`, `AsyncChannel(bufferingPolicy:)`, `BackpressureStrategy.unbounded()`, `await group.next()` on a discarding group. Real on 6.4: `withTaskCancellationShield`, `Task.hasActiveCancellationShield`, `UnsafeCurrentTask.hasActiveCancellationShield`, `AsyncChannel()`, `makeChannel(of:throwing:backpressureStrategy:)` with `.watermark(low:high:)`, `group.next()` on a plain group | compile errors, some misleading (`generic parameter 'Success' could not be inferred`) | `swift build` (B-V14: five invented forms exit 1, the real ones exit 0); dropped as rule 36 because the compiler is the check | none (bp 36) |
| 23 | Capturing the multi-producer `Source` in `group.addTask`, as its doc comment shows | Swift 6 mode rejects it (`[#SendingClosureRisksDataRace]`); the upstream tests build only in Swift 5 mode | `swift build` | 35 |

Rows 18 to 23 were added in the revision, ordered by the backpressure round's measured cost and not merged into the first 17.

## Open questions

**Owner decisions (the default the program applies in brackets)**
1. Apple deployment floor for `Mutex` (macOS 15 / iOS 18, unverified: read only). [Default: `Mutex` everywhere; an app with a lower floor uses `OSAllocatedUnfairLock`, labelled read-only.]
2. Ownership rule for app code (SW-CONC-13). [Default: SHOULD with the `fire-and-forget:` marker; MUST for library, SDK, CLI, server.]
3. Make NNBD a MUST for new targets? [Default: SHOULD; the MUST is "never paste into existing code" (SW-CONC-07).]
4. Allow manifest `.treatWarning` for published libraries? [Default: no; CLI flag on 6.4 legs (conflict 5).]
5. Ship the optional SwiftLint `unhandled_throwing_task` opt-in in the shipped `.swiftlint.yml`? [Default: no; CONSIDER, because the grep and the compiler group cover it.]
6. Floor policy for 6.4-only constructs (`defer` with a shield, `~Sendable`). [Default: `#if compiler(>=6.4)` splits only for libraries below 6.4, with `await Task { … }.value` on both exits in the `#else` (SW-CONC-32, measured on 6.3 and 6.4); CLIs and servers at the current release use the shield directly.]
7. Should templates ship the `CompileTests/` package (SW-CONC-06)? [Default: document the recipe; do not ship a template.]
8. May the SDK depend on swift-async-algorithms for `AsyncChannel`? [Default: no, per map Q4 (stdlib plus swift-subprocess only); the measured cost is 6,244,408 B against 83,160 B plus swift-collections 1.7.2, and the SDK's lossless push sources become pull sources (SW-CONC-30, -35).]
9. Wait or refuse when an accept loop saturates? [Default: wait, the `group.next()` window (SW-CONC-31); shed (503 or close) only where refusing is the defined overload response, and the choice is named in the code. A product decision, not a Swift one.]

**Subareas that deserve another research round**
1. **Darwin libdispatch and the Apple runtime** (needs a macOS runner): does `DispatchQueue.global()` spawn threads on demand on Darwin as the containerization comment claims, does `LIBDISPATCH_COOPERATIVE_POOL_STRICT=1` catch a semaphore wait there, and do `assumeIsolated` and ObjC-callback traps behave as the three Linux plants? Added in the revision: does the shield (SE-0504, no back-deployment) run at the OS floors an app targets, do an inline `main.swift` handler and a handler in a `@MainActor` function trap on macOS as on Linux (SW-CONC-34), and are the multi-producer channel's macOS 15 gate and `AsyncStreaming`'s macOS 27 gate real?
2. **Race detection for `Mutex`-guarded code on Linux.** Is there a TSan annotation, suppression or nightly fix for the `Mutex` false positive (forum 84801), and what tool validates `Mutex` code otherwise?
3. **Listener-level connection limits in server frameworks.** Do hummingbird, grpc-swift-2, vapor and the NIO servers bound accepts below the loop (NIO backlog, `maxMessagesPerRead`, a connection-count option, `ulimit -n`)? B-C6 lists 18 files outside tests that need the reading step; until it is done SW-CONC-31 binds only the loop you write (gap c).
4. **Which library awaits observe cancellation, and how.** `AsyncChannel.send` swallows it and the multi-producer `send` throws (conflict 22); survey the other awaits an SDK or server calls (`NIOAsyncChannel` writers, `ServiceGroup`, swift-subprocess `run()`, file and socket reads) so the SW-CONC-23 observer list stops being "of those measured".
5. **Swift 6.5 re-check** when `withDeadline` (SE-0526) and the next `Task` APIs land; re-measure the 6.4 compiler/SwiftLint disagreement on throwing tasks at each toolchain bump, the `shield-deadline` recipe of SW-CONC-33 against `withDeadline`, and whether the multi-producer channel or the `AsyncStreaming` module leaves its trait and loses `~Copyable` capture friction.
6. **Testing concurrent code** (SW-TEST owns it): does enabling NNBD on a test target, as the 6.4 template does, change helper behaviour, and how do Swift Testing `confirmation`s and clocks replace `Task.sleep` in tests?

## Revision log

2026-10-10, folding in `swift-concurrency/backpressure-and-cleanup.md` (commissioned by open-question items 3 and 4 of the first consolidation). Rule IDs 01 to 29 keep their numbers.

- **Added SW-CONC-30, -31, -32, -33, -34, -35** from the new sub-artifact (30 streams by data kind, 31 accept-loop cap, 32 shielded cleanup, 33 bounded shield, 34 signal-source placement, 35 `AsyncChannel`); why: the round answered the backpressure and accept-loop questions with measurements and watched every check red then green (R12).
- **Did not adopt bp SW-CONC-36** (names that exist): its only check is `swift build`; kept as failure-mode row 22, the tasks T15 precedent. The number 36 is not reused.
- **SW-CONC-18: SHOULD to MUST** (SDK, CLI, server, OCI tooling), text rewritten around the `// unbounded:` annotation, the grep replaced by S7; why: the old grep stayed red on the twin's false positives (conflict 17), and SW-CONC-30 and -18 stated the same default at two severities. The policy-by-data-kind half now lives in 30.
- **SW-CONC-19: text changed** to "no finished child is retained" (a plain Void group is legal when drained by `next()`), the grep replaced by S8, the hummingbird exemplar reclassified to the retention half only; why: the old grep flagged the window that SW-CONC-31 recommends, and hummingbird has no in-flight bound (conflicts 18, 19).
- **SW-CONC-20: cleanup half removed to SW-CONC-32**; the claim "below 6.4 an explicit close on both exits" is withdrawn because a plain `await` on the cancel path aborts (R9, exit 1 on 6.3 and 6.4); why: it overclaimed a guarantee the tasks plant never tested, since `s-compat` did not cancel the task (conflict 20). T-V41 and the `#if` split moved with it.
- **SW-CONC-21 and conflict 7 narrowed**: `custom_rules` fail open on the static binary only; the SourceKit image runs them (R11); a mirror needs a canary that fails the build on any `Skipping enabled rule` line (matches SW-GATE-11); why: the first consolidation's "not on Linux" over-generalised from one binary. Verdict items 8 and 9 follow.
- **SW-CONC-23 Why qualified** ("of the primitives measured", plus `AsyncChannel.send` and the multi-producer `send`); **SW-CONC-26 Why** gains the fourth trap pointing at SW-CONC-34; **SW-CONC-24 Verify** points at SW-CONC-33; why: B-V05 and B-V11 are new instances of existing claims (conflict 22).
- **Conflicts 17 to 22 added (23 by the verification pass below); Verdict items 7 to 9 edited, 10 to 13 added**; why: the follow-up settled the stream, accept-loop and cleanup questions, and its non-answers (stdlib has no bounded lossless stream, listener limits unmeasured, no mechanical check for "every shield has a deadline", MPSC not source-stable, no Darwin or Windows runs) are recorded as Verdict item 13 instead of Open questions.
- **Open questions**: removed subarea items 3 (backpressure) and 4 (accept-loop bounds) as answered; added subarea items 3 (listener-level limits) and 4 (silent versus throwing cancellation across library awaits); extended items 1 and 5; owner default 6 gains the measured `#else` form; owner items 8 (SDK dependency on swift-async-algorithms) and 9 (wait versus shed) added.
- **Tables**: S7 and S8 added to the check scripts; R9 to R12 added; exemplar rows for 30 to 35 and corrections for 18, 19, 31, 32; failure-mode rows 9, 12, 14, 17 edited and 18 to 23 added; SDK, CLI and OCI commitments extended; crosswalk extended; frontmatter `consolidates` and `revised` updated.
- **Verification pass (same day)**: re-ran R9, R10, R11, the backpressure round's `checks.sh` and `run-handler.sh` unchanged; every recorded result reproduced (R9 `catch-plain` exit 1 / `task-value` exit 0; S8 and the SourceKit canary; C1 to C8; `plain` 132, `sendable` 0, nonisolated 0). Everything below is what that pass changed.
- **SW-CONC-34 widened, conflict 23 added, S9 and R13 added**; why: the bp rule and its grep scope the trap to `main.swift`, but the cause is the `@MainActor` inference, and a handler in a `@MainActor` function or type traps identically (R13, 6.4 and 6.3). The `@Sendable` closure stays safe there. The rule's `Binds` and floor are unchanged.
- **SW-CONC-34 behavioural gate replaced; SW-CONC-26 Verify gains the same precaution; Verdict item 13 gains gap (f); R14 added**; why: "assert the exit code is not 132" stayed green on the planted violation when the main thread kept running (exit 0 in 9 of 9 runs, the crash report on stderr, the handler never ran), so the gate now runs with `SWIFT_BACKTRACE=enable=no` and checks the handler's side effect. A parked main and SW-CONC-07's probe still gave 132 under the default backtracer.
- **SW-CONC-32 and Verdict item 12 qualified, conflict 20 reason qualified**: a plain `await` on the cancel path aborts when the cleanup reaches a cancellation point; the fixture's cleanup awaited `Task.sleep`. The rule stays unconditional because a caller cannot tell for a third-party `close()`. Known misses of the B-C4 grep (nested braces; abandonable cleanup is read) added; why: the first text read as if every plain `await` aborts.
- **SW-CONC-33 qualified**: the two `maximumGracefulShutdownDuration` and `maximumCancellationDuration` knobs exist only on swift-service-lifecycle (default nil), and the cancellation stage is documented to end in a `fatalError`; other servers bound both stages themselves; why: the rule told every server to set a property that only one library has, and "a defined outcome" hid that the last stage crashes.
- **SW-CONC-31 known miss added; units corrected**: the backpressure round labels `VmHWM` readings in KiB/1000 as "MiB" for the accept-loop table (26,496 KiB is 25.9 MiB); the Verdict and SW-CONC-31 now quote KiB.
- **Verdict items 9 to 12 edited**: 23 conflicts; item 10 no longer says `AsyncChannel` is "server code only" (SW-CONC-35 allows server, CLI-internal and app code with the dependency; the SDK never); crosswalk rows for tasks T09, T11 and T12 record the halves that moved to 32, 30 and 31; failure-mode row 19, the CLI commitments, exemplar row 34 and open question 1 follow SW-CONC-34.
- **Cross-set notes, not edits here**: SW-CLI-11 hands cleanup under cancellation to SW-CONC and now has SW-CONC-32 to 34; SW-IO-27 says the shield "may change cleanup inside bodies", which SW-CONC-32 shows it does for a whole `run()`; SW-GATE-11 already fails a build on a skip line, which SW-CONC-21 now matches.

## Sub-artifacts

- [swift-concurrency/isolation-and-sendable.md](swift-concurrency/isolation-and-sendable.md): default isolation and NNBD per target kind, the template's `ApproachableConcurrency`, the `@unchecked Sendable` and `nonisolated(unsafe)` acceptance test, the fix ladder, Mutex versus actor versus global actor, TSan on Linux, runtime isolation traps, `sending`, isolated conformances, diagnostic group names, and a 25-site re-sample.
- [swift-concurrency/tasks-and-cancellation.md](swift-concurrency/tasks-and-cancellation.md): unstructured-task ownership and the two swallowed-error tools, what observes cancellation, continuations, GCD and blocking calls in async code, timeouts while `withDeadline` is absent, off-pool blocking, `AsyncStream` buffering, task groups, actor reentrancy, cleanup after cancellation, and `close()`/`shutdown()` contracts.
- [swift-concurrency/backpressure-and-cleanup.md](swift-concurrency/backpressure-and-cleanup.md): `AsyncStream` buffering policies and `AsyncStream(unfolding:)`, `AsyncChannel` and the multi-producer channel (swift-async-algorithms 1.1.7), in-flight caps in accept loops, async `defer` with `withTaskCancellationShield` and its bound, subprocess cleanup under a shield, signal-source isolation, the 6.2/6.3 floor, names that do not exist, and the grep checks B-C1 to B-C8 (17 verification rows).

## Key sources

1. [SE-0461 nonisolated(nonsending) and @concurrent](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0461-async-function-isolation.md) (Swift 6.2)
2. [SE-0466 control default actor isolation](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0466-control-default-actor-isolation.md) (Swift 6.2)
3. [Approachable concurrency vision](https://github.com/swiftlang/swift-evolution/blob/main/visions/approachable-concurrency.md)
4. [SE-0433 Mutex](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0433-mutex.md) (Swift 6.0)
5. [SE-0430 sending](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0430-transferring-parameters-and-results.md) (Swift 6.0)
6. [SE-0470 isolated conformances](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0470-isolated-conformances.md) (Swift 6.2)
7. [Swift migration guide, Common Problems](https://github.com/swiftlang/swift-migration-guide/blob/main/Guide.docc/CommonProblems.md)
8. [SE-0304 structured concurrency](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0304-structured-concurrency.md) (Swift 5.5)
9. [SE-0300 continuations](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0300-continuation.md) (Swift 5.5)
10. [SE-0314 AsyncStream](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0314-async-stream.md) and [SE-0381 discarding task groups](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0381-task-group-discard-results.md)
11. [SE-0493 async defer](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md) and [SE-0504 cancellation shields](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0504-task-cancellation-shields.md) (Swift 6.4)
12. [SE-0520 throwing Task warning](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0520-discardableresult-task-initializers.md) and [diagnostic group doc](https://github.com/swiftlang/swift/blob/main/userdocs/diagnostics/no-use-throwing-unstructured-task.md) (Swift 6.4)
13. [SE-0526 withDeadline acceptance](https://forums.swift.org/t/accepted-with-modifications-se-0526-withdeadline/88645) (expected 6.5)
14. [Swift compiler diagnostic groups](https://docs.swift.org/compiler/documentation/diagnostics/)
15. [Massicotte: problematic concurrency patterns](https://www.massicotte.org/problematic-patterns), [when to use an actor](https://massicotte.org/actors/), [what settings to enable](https://massicotte.org/blog/what-settings/)
16. [SE-0406 backpressure for AsyncStream](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0406-async-stream-backpressure.md) (Returned for revision, [return post 2023-09-13](https://forums.swift.org/t/returned-for-revision-se-0406-backpressure-support-for-asyncstream/67248)) and [AsyncStream.swift at swift-6.4.0-RELEASE](https://github.com/swiftlang/swift/blob/swift-6.4.0-RELEASE/stdlib/public/Concurrency/AsyncStream.swift) (the three policies, the `.unbounded` defaults)
17. [swift-async-algorithms 1.1.7 AsyncChannel guide](https://github.com/apple/swift-async-algorithms/blob/1.1.7/Sources/AsyncAlgorithms/AsyncAlgorithms.docc/Guides/Channel.md) and [multi-producer channel pitch](https://forums.swift.org/t/pitch-multiproducersingleconsumerasyncchannel/78932) (2025-03-29)
18. [SE-0493 async defer](https://github.com/swiftlang/swift-evolution/blob/main/proposals/0493-defer-async.md) acceptance ([post](https://forums.swift.org/t/accepted-se-0493-support-async-calls-in-defer-bodies/83023)) and [SE-0504 acceptance](https://forums.swift.org/t/accepted-se-0504-task-cancellation-shields/84667): cancellation stays visible in `defer`; the shield is the opt-in; the post's `hasActiveTaskCancellationShield` spelling is not the shipped API
19. [clig.dev](https://clig.dev/): during Ctrl-C cleanup that may run long, skip it; a second press forces
