# swift-diagnose

A symptom-routed diagnosis skill for a Swift program or test that is already wrong. It starts from the exit code and the first stderr line. The symptom can be a crash, a hang, a deadlock, a `swift test` that never finishes, a data race, output that differs between runs, or `unable to type-check this expression in reasonable time`. It routes each to the one measurement that names the cause.

```sh
grim add ghcr.io/ocx-sh/lore/swift-diagnose
```

Run it when you see exit code 132, 134 or 139, `Program crashed:`, `Illegal instruction`, `Fatal error`, `Swift runtime failure`, `leaked its continuation`, a ThreadSanitizer report, or a slow compile. It cites `swift-quality` rule IDs and expects that rule installed for the scripts it names.

It stops when four things hold. The cause is named as a mechanism. The command and its exit code and first line are pasted. Either the fix was watched to clear the symptom or the cause is a named gap with the toolchain version that would settle it. And nothing outside the cause was changed.

## The route table, keyed by exit code and first line

A table of 26 rows, keyed by exit code plus the first message line, never by the code alone. Exit 132 covers six causes, 134 covers two, 139 covers two and 124 covers four. Every row ends in a rule ID or a section of the skill. The first message line is line 4 of the stderr, not line 1, because the backtracer puts a blank line and a `*** Signal n: Backtracing` banner first. The skill gives a grep that reaches it.

One row inverts what a model expects. A trap on a worker thread can exit 0 with `Program crashed:` on stderr, because main returned before the crash turned fatal. Rerun the same input with `SWIFT_BACKTRACE=enable=no` and expect 132. The route took the right branch 17 of 17 on both toolchains over planted failures, and 7 of 7 on a release build.

## What is distinctive

Consent comes first. A table of six actions lists the cost to the target before any signal is sent. `kill -QUIT` with the backtracer on prints every thread and the process keeps running. With `enable=no` the same signal kills it with exit 131. Without consent the skill prints the command and its cost and stops.

A second table of eight edits is named as violations before anything is fixed. Each changes the measurement and not the defect. Examples are raising a timeout, adding a sleep, or wrapping the call in `try?`. Others are quieting TSan with `nonisolated(unsafe)`, dropping the sanitizer leg, `.disabled()` on the test, and `SWIFT_BACKTRACE=enable=no` in a Dockerfile. Two shipped scripts, `weaken-check.sh` and `silence-check.sh`, catch most of them in the fix diff.

In a release build the trap text moves. `Fatal error:` is gone, so the skill matches `Swift runtime failure` and reads frame 0. A blocked main actor prints no deadlock report, so it sends SIGQUIT to a process launched under `set -m`.

## What agents get wrong by default

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3, Linux x86_64. The skill lists five patterns:

- Routing a crash on the exit code.
- Looking for `Fatal error:` in a release binary.
- Reading exit 0 as no crash.
- Calling a race from a `Swift access race` report on `Mutex` code, or calling none because a plain run exited 0.
- Waiting for a deadlock report the runtime never prints.

## The receipt

Every run ends with a six-part receipt. It holds the symptom in the reporter's words, the build identity, the root cause and the evidence. It ends with the fix or the named gap and every rule ID relied on. A diagnosis that cites no rule either found a gap or skipped the lookup. The skill restates 11 merge-blocking findings by rule ID, so a run without the rule loaded still reports them correctly.

## What it does not cover

macOS, Xcode, Windows, the static Linux SDK and arm64 are `unverified: read only`, and the steps that touch them say so. Commands that read `/proc` are Linux only. Writing the standards it cites is `swift-quality`. Moving a package to Swift 6 mode is `swift-upgrade`. Tagging and publishing is `swift-release`.

## Siblings

`swift-quality` is the rule set that defines SW-CORE-16 to SW-CORE-21, this skill's own checks. The skill also routes to its concurrency, error, CLI, testing and language rows. Bundled with `swift-quality`, `swift-package` and `swift-release` as `swift-essentials`.
