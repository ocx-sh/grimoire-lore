# Dated re-checks U10.7 to U10.17

Load this from step U10 of the swift-upgrade procedure, for the items U10.7 to U10.17.
The trigger list of all 17 items and U10.1 to U10.6 are in
[dated-rechecks.md](dated-rechecks.md). A probe reports STILL while the pinned fact
holds and FLIPPED when it no longer does. A FLIPPED result is a finding: report it
against the rule ID named in the item and leave the rule text to its maintainer.

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64) unless an item says
`unverified: read only`. Put every probe package in a scratch directory outside the
repository under change (`"$S"` from the skill's helper file), because the probes
reuse names. Every build below takes a `--scratch-path` there as well: a `.build-*` directory
inside the tree shows as untracked (the U0 and U8 clean-tree tests fail) and every grep that
excludes only `.build` scans its checkouts (watched 2026-10-10 on three trees).

Contents: [U10.7 TemporaryPointers](#u107-werror-temporarypointers-on-64) ·
[U10.8 ImplicitStrongCapture](#u108-implicitstrongcapture-on-the-oldest-leg) ·
[U10.9 SwiftLint canary](#u109-the-skipping-enabled-rule-canary) ·
[U10.10 LLVM coverage](#u1010-llvm-coverage-exclusion) ·
[U10.11 serialized and taskLocal](#u1011-serializedfor-and-tasklocal) ·
[U10.12 Multi-producer channel](#u1012-the-multi-producer-channel) ·
[U10.13 migrate fix-its](#u1013-migrate-concurrent-fix-it-deprecations) ·
[U10.14 Advisory floors](#u1014-advisory-floors) ·
[U10.15 swift-subprocess](#u1015-swift-subprocess-releases) ·
[U10.16 Type-check limit](#u1016-the-type-check-limit-on-a-loaded-runner) ·
[U10.17 swift-protobuf TSan](#u1017-the-swift-protobuf-64-tsan-failure)

## U10.7 -Werror TemporaryPointers on 6.4

Rule: SW-SEC-11.

Trigger: every toolchain bump past 6.4.0. Plant a dangling pointer and try to promote
the warning group:

```swift
public func leak() -> Int {
    var value = 42
    let pointer = UnsafeMutablePointer<Int>(&value)
    return pointer.pointee
}
```

```sh
swift build --scratch-path "${TMPDIR:-/tmp}/swift-upgrade/tp" -Xswiftc -Werror -Xswiftc TemporaryPointers; echo "exit $?"
```

On 6.4.0 the warning prints (`initialization of 'UnsafeMutablePointer<Int>' results in a
dangling pointer [#TemporaryPointers]`) and the exit is 0, so the group cannot be
promoted. On 6.3.3 the same command exits 1 (measured 2026-10-10). Exit 1 on a later
6.4 patch means the promotion works again and SW-SEC-11 can gate on it.

## U10.8 ImplicitStrongCapture on the oldest leg

Rules: SW-LANG-08, SW-GATE-15.

Trigger: whenever the oldest CI leg moves. 6.4 adds the default-on warning
`ImplicitStrongCapture`. Per-group promotion names only groups the oldest leg knows
(SW-GATE-15). Plant a nested `[weak self]`:

```swift
public final class Owner {
    var handler: (() -> Void)?

    public init() {}

    func register(_ body: @escaping () -> Void) {
        handler = body
    }

    func work() {}

    public func start() {
        register {
            self.register { [weak self] in
                self?.work()
            }
        }
    }
}
```

```sh
swift build --scratch-path "${TMPDIR:-/tmp}/swift-upgrade/isc" -Xswiftc -Werror -Xswiftc ImplicitStrongCapture; echo "exit $?"
```

Run it on the image of the oldest leg. Exit 0 with `unknown warning group:
'ImplicitStrongCapture'` means the leg does not know the group, so it must not be
named (6.3.3, measured 2026-10-10). Exit 1 with `'weak' ownership of capture 'self'
differs from implicitly-captured strong reference in outer scope` means the leg knows
it (6.4.0). When the oldest leg reaches 6.4, the group may be named, although the
blanket `-warnings-as-errors` already errors on it there.

## U10.9 The Skipping enabled rule canary

Rule: SW-GATE-26.

Trigger: each SwiftLint image bump. The static binary prints `Skipping enabled rule
'custom_rules' because it requires SourceKit` and exits 0 on a violating tree. Run
the shipped `swiftlint-gate.sh` wrapper against the bumped image over a tree whose
config has at least one `custom_rules` entry, with `SWIFTLINT` set to the image run
prefix and `SWIFTLINT_CONFIG` to the config. Exit 70 means the carrier skipped a rule,
so do not take the bump. Exit 2 is a violation and 0 is clean, which prove the rule
ran. The static-binary behaviour is observed and not documented, so it is re-run at
every bump.

## U10.10 LLVM coverage exclusion

Rule: SW-TEST-22.

Trigger: each LLVM bump (Swift 6.5 expected). There is no inline coverage exclusion:
[llvm-project#33625](https://github.com/llvm/llvm-project/issues/33625) is open since
2017 and the inline-marker pull request, llvm-project PR 203723, was closed unmerged on
2026-06-13 (read 2026-10-10). Re-read both, and list the exclusion options of the new
toolchain:

```sh
llvm-cov show --help | grep -i -e 'exclu' -e 'ignore-filename' -e 'name-allowlist' -e 'name-regex'
```

Today (6.4.0 and 6.3.3) it prints three lines: `--ignore-filename-regex`,
`--name-allowlist` and `--name-regex`. A new line naming a line or region marker means
SW-TEST-22's "no inline exclusion" is stale. The marker names are not known in
advance, so reading the new option list is a reading heuristic.

## U10.11 serialized(for:) and taskLocal

Rule: SW-TEST-05.

Trigger: at Swift 6.5. Cross-suite serialization does not exist on a shipped
toolchain. Plant:

```swift
@_spi(Experimental) import Testing

struct Env {
    static let shared = 1
}

@Suite(.serialized(for: \Env.self))
struct Suite {
    @Test func works() {}
}
```

```sh
swift build --build-tests --scratch-path "${TMPDIR:-/tmp}/swift-upgrade/ser"; echo "exit $?"
```

Exit 1 with `cannot call value of non-function type 'ParallelizationTrait'` on 6.4.0
and 6.3.3 is STILL. The twin `@Suite(.serialized)` with a plain `import Testing`
builds with exit 0 (watched, measured 2026-10-10). The built-in `.taskLocal(_:withValue:)`
trait is Swift 6.5 only per the pitch and has no probe here, so read the Swift
Testing trait documentation of the new toolchain (a reading heuristic).

## U10.12 The multi-producer channel

Rule: SW-CONC-35.

Trigger: each swift-async-algorithms bump. `MultiProducerSingleConsumerAsyncChannel`
ships only `.watermark`, and `.unbounded()` is in the Evolution document. Probe with
the newest 1.x release:

```swift
// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "chan",
    dependencies: [.package(url: "https://github.com/apple/swift-async-algorithms.git", from: "1.1.7")],
    targets: [
        .executableTarget(
            name: "p",
            dependencies: [.product(name: "AsyncAlgorithms", package: "swift-async-algorithms")]
        )
    ]
)
```

```swift
import AsyncAlgorithms

var made = MultiProducerSingleConsumerAsyncChannel<Int, Never>.makeChannel(
    of: Int.self,
    backpressureStrategy: .unbounded()
)
_ = made.takeChannel()
```

Exit 1 with `has no member 'unbounded'` on 1.1.7 is STILL, and replacing the strategy
with `.watermark(low: 1, high: 4)` builds with exit 0 (watched, measured 2026-10-10).
The `~Copyable` capture half (`group.addTask { try await source.send(...) }` failing
with `[#SendingClosureRisksDataRace]` in Swift 6 mode) was measured earlier and is not
re-run here, so re-read the release notes for the `Source` type becoming copyable.

## U10.13 migrate concurrent fix-it deprecations

Rule: SW-CORE-12.

Trigger: every toolchain bump that follows a U8 run. `migrate` writes `{ @concurrent in`
closures that call a `TaskLocal.withValue` overload which 6.4 deprecates. Plant it with
`.enableUpcomingFeature("NonisolatedNonsendingByDefault")` on the target:

```swift
enum Context {
    @TaskLocal static var level = 0
}

public func run() async -> Int {
    await Context.$level.withValue(1) { @concurrent in
        await Task.yield()
        return Context.level
    }
}
```

```sh
swift build --scratch-path "${TMPDIR:-/tmp}/swift-upgrade/tl" -Xswiftc -warnings-as-errors; echo "exit $?"
```

On 6.4.0 it exits 1 with `'withValue(_:operation:isolation:file:line:)' is deprecated:
Prefer the 'nonisolated(nonsending)' overload` and on 6.3.3 it exits 0. The same call
with a plain closure (no `@concurrent in`) builds clean on 6.4.0 (watched, measured
2026-10-10). Exit 0 on a later toolchain means the deprecation moved, so re-read the
note in step U8.

## U10.14 Advisory floors

Rule: SW-SEC-20.

Trigger: each dependency bump. A scanner can be green on a vulnerable tree, so floors
are hand-set from the dependencies' own repository advisories. Run the floor check and
the discovery command that SW-SEC-20 carries, and raise a floor wherever discovery
lists a fixed version above it. The floor table is a dated snapshot of 2026-10-10 and
does not age well. The re-derivation is a reading step, because only the dependency's
advisory page names the first fixed version.

## U10.15 swift-subprocess releases

Rule: SW-IO-06.

Trigger: each bump of that dependency.

```sh
git ls-remote --tags https://github.com/swiftlang/swift-subprocess | awk '{print $2}' | sed 's#refs/tags/##' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -2
```

It printed `1.0.0` and `1.0.1` on 2026-10-10. A newer last line is a release to read:
1.0.0 leaks one file descriptor per early-break `.sequence`, which is why the pin is
`from: "1.0.1"`. Raise the lower bound only for a fix the code needs.

## U10.16 The type-check limit on a loaded runner

Rule: SW-LANG-07.

Trigger: each runner-class change. The gate is wall-clock, so a loaded runner can
flap an expression that sits near the limit. Run the gate three times on the runner:

```sh
swift build -Xswiftc -Xfrontend -Xswiftc -warn-long-expression-type-checking=200 -Xswiftc -warnings-as-errors
```

An expression that warns in some runs and not in others is flapping. Fix it by typing
the operands or splitting it, never by raising the limit. The flapping threshold is
`unverified: read only` (no loaded runner was measured).

## U10.17 The swift-protobuf 6.4 TSan failure

Rule: SW-GATE-27.

Trigger: each toolchain bump. swift-protobuf pinned its sanitizer job to a Swift 6.3
image with the comment `Looks like 6.4 is failing for some reason` (read 2026-10-10 at
`6c84c3dedac0`, `.github/workflows/build.yml` lines 88 and 158). The reason is
unexplained, and the same job also covers the `Mutex` report split that SW-GATE-27
handles by report kind. Re-read the upstream workflow:

```sh
git clone --depth 1 https://github.com/apple/swift-protobuf /tmp/swift-protobuf-probe
grep -rn -i -e 'sanitize' -e 'is failing' --include='*.yml' --include='*.yaml' /tmp/swift-protobuf-probe/.github
```

On 2026-10-10 it printed the two `Looks like 6.4 is failing` comments and the
`sanitizer_testing` job (measured). When the comments are gone and the job's image is
6.4 or later, the 6.4 TSan failure cleared upstream: run the project's own TSan job on
the new image and revise SW-GATE-27's note.
