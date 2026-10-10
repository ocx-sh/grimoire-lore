# Ladder cases for step U5

Load this from step U5 of the swift-upgrade procedure. Each case is a class of
Swift 6 mode diagnostic with the wrong code, the lazy fix that compiles and adds
a hatch, and the ladder fix that adds none. The rung numbers are the order of
SW-CONC-28. The shared-state tools themselves are SW-CONC-29 and SW-CONC-01.

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64) in Swift 6 mode. Every
snippet below compiled, and the wrong forms printed the quoted diagnostics on both
toolchains. The classes come from a real 37-file package (swift-snapshot-testing at
`28e5de025e3f`), where the warning count fell 13, 9, 4, 4, 1 over the classes. The
result "0 hatches added, exit 0" holds on Linux only: that package declares Apple
platform floors (`.iOS(.v13)`, `.macOS(.v10_15)`), so on an Apple build Case 4 below
is stop condition S2, and the Apple build is `unverified: read only`.

Contents: [Case 1: a stored constant that is only read](#case-1-a-stored-constant-that-is-only-read) ·
[Case 2: a public value type that is not Sendable](#case-2-a-public-value-type-that-is-not-sendable) ·
[Case 3: a var that is never reassigned](#case-3-a-var-that-is-never-reassigned) ·
[Case 4: a mutable global](#case-4-a-mutable-global) ·
[Case 5: a global cache and a lock type already in the tree](#case-5-a-global-cache-and-a-lock-type-already-in-the-tree) ·
[What the lazy twin did](#what-the-lazy-twin-did) ·
[A trap in the mutable-flag fix](#a-trap-in-the-mutable-flag-fix)

## Case 1: a stored constant that is only read

Rungs 1 and 2: delete the sharing, or return a fresh value. A stored `static let`
of a non-Sendable value type, and a constant of a non-Sendable reference type such
as an `NSString`, are both read and never mutated.

```swift
public struct Formatter {
    public var render: (String) -> String

    public init(render: @escaping (String) -> String) {
        self.render = render
    }
}

extension Formatter {
    // Wrong in Swift 6 mode:
    // error: static property 'lines' is not concurrency-safe because non-'Sendable' type 'Formatter'
    // may have shared mutable state [#MutableGlobalVariable]
    public static let lines = Formatter { $0 }
}
```

The lazy fix compiles and adds a hatch line:

```swift
extension Formatter {
    nonisolated(unsafe) public static let lines = Formatter { $0 }
}
```

The ladder fix has no shared state, and callers still write `Formatter.lines`:

```swift
extension Formatter {
    public static var lines: Formatter {
        Formatter { $0 }
    }
}
```

The same shape clears `private let plistNull = NSString(string: "null")`, which
becomes `private var plistNull: NSString { NSString(string: "null") }`.

Caveat: replacing a stored property with a computed one changes the symbol kind. The
measured package is source-distributed. For a resilient library or a binary
framework this is `unverified: read only`, so stop and ask a human before applying
it there.

## Case 2: a public value type that is not Sendable

Rung 2: declare `Sendable`. A public non-frozen struct is not implicitly `Sendable`,
so a closure that captures it fails.

```swift
public struct Entry: Hashable {
    public var name: String

    public init(name: String) {
        self.name = name
    }
}

public func run(_ body: @Sendable () -> Void) {
    body()
}

public func capture(_ entry: Entry) {
    // Wrong: error: capture of 'entry' with non-Sendable type 'Entry' in a '@Sendable' closure
    run { print(entry) }
}
```

The ladder fix is the conformance, with no closure change:

```swift
public struct Entry: Hashable, Sendable {
    public var name: String

    public init(name: String) {
        self.name = name
    }
}
```

On the measured package three public value types (`File`, `InlineSnapshot`,
`InlineSnapshotSyntaxDescriptor`) removed three capture diagnostics this way.

## Case 3: a var that is never reassigned

Rung 2: `var` to `let`. A public stored global that holds a lock type or a constant
collection and is never reassigned is a `let`.

```swift
// Wrong: error: var 'inlineState' is not concurrency-safe because it is nonisolated global shared mutable state
public var inlineState: [String: Int] = [:]

// Ladder fix:
public let inlineState: [String: Int] = [:]
```

## Case 4: a mutable global

Rung 5: `Mutex<State>`, with the public spelling preserved as a computed property.
`import Synchronization` is required.

```swift
import Synchronization

// Wrong: error: var 'recordMode' is not concurrency-safe because it is nonisolated global shared mutable state
public var recordMode: Int = 0

// Ladder fix: callers still read and write recordMode.
private let recordStorage = Mutex<Int>(0)

public var recordMode: Int {
    get { recordStorage.withLock { $0 } }
    set { recordStorage.withLock { $0 = newValue } }
}
```

`Mutex` carries an operating system availability floor on Apple platforms. A package
whose platform floor is below the OS that ships `Synchronization` cannot use this
rung. That is stop condition S2 and SW-APPLE-04, and it is not a reason to fall back
to `nonisolated(unsafe)`. At S2: record the gap and the floor, keep the diagnosed
global, hold that target in `.swiftLanguageMode(.v5)` with a dated reason
(SW-PKG-15) and put S2 in the receipt. A literal run on the measured package stops at
its first mutable global (`AssertSnapshot` state, `Deprecations` recordings). What
may run under the lock is SW-CONC-08. The same rung serves a test target (a value
captured in a `sending` closure, as in `WaitTests.swift`).

## Case 5: a global cache and a lock type already in the tree

Rung 8, reuse of an existing, justified wrapper (the type is `@unchecked Sendable`,
unlike the `Mutex` of rung 5). Use it only when the wrapper already carries its guard
comment (SW-GATE-10) and only inside the module that owns it: `LockIsolated` is
defined in `InlineSnapshotTesting`, so `SnapshotTesting` cannot use it. The
justification pass prints the same legacy line before and after, so the delta check
stays at 0.

```swift
import Foundation

// Already in the tree before the upgrade: a legacy hatch with its guard visible.
public final class LockIsolated<Value>: @unchecked Sendable {
    private let lock = NSLock()
    private var value: Value

    public init(_ value: Value) {
        self.value = value
    }

    public func withValue<Result>(_ body: (inout Value) throws -> Result) rethrows -> Result {
        lock.lock()
        defer { lock.unlock() }
        return try body(&value)
    }
}

// Before: a mutable global dictionary, an error in Swift 6 mode.
// After: the same global behind the type the package already has. No new hatch line is added.
let sourceCache = LockIsolated<[File: String]>([:])
```

## What the lazy twin did

Same package, same flip, every diagnostic silenced with `nonisolated(unsafe)` on 10
declarations and `@unchecked Sendable` on 2 types. It built green in Swift 6 mode
(exit 0), and the compiler does not distinguish the two results. The added-lines
check from step U5 printed 13 lines for the twin and none for the ladder result,
while the whole-tree pass printed 12 lines against 2 (measured 2026-10-10). That gap
is why the procedure judges the delta.

## A trap in the mutable-flag fix

Reading heuristic, reasoned and not run. A `registered` flag that is set once can
tempt a rewrite as `private static let registration: Void = { ...DispatchQueue.main.sync... }()`.
That can deadlock when a background thread holds the once-initialiser and waits on the
main queue while the main thread waits on the same initialiser. The `Mutex<Bool>`
form of Case 4 avoids it. Never replace a diagnosed `static let` with a once-initialised
one that blocks on another thread.

## The flip's non-concurrency warnings (U7)

Swift 6 mode turns on warnings that complete checking never showed. The measured
package had, once `ConciseMagicFile` means the file ID, three
`parameter 'file' with default argument '#file' passed to parameter 'filePath', whose default argument is '#filePath'`
and one the other way,
`parameter 'filePath' with default argument '#filePath' passed to parameter 'filePath', whose default argument is '#file'`.
The cure is the same: change the callee default to `#filePath`. That alters a public
default (source compatible, a behaviour change), so note it in the receipt. The
package also had one `'init(contentsOfFile:)' is deprecated` and one `open var` in a
Linux-only branch. Changing `open var` to `public var` is a public-API break that
SW-GATE-20 flags, so record it. Fix each at its cause. Demoting a warning group is
allowed only on a toolchain-upgrade branch (SW-GATE-15), and it is a weakening that
needs its written reason (SW-CORE-01).

## The measured package in numbers (Scope)

The Scope paragraph of the skill cites this. Measured 2026-10-10 on Linux x86_64 in the `swift:6.4` (6.4.0)
and `swift:6.3` (6.3.3) images, on a real package (swift-snapshot-testing at
`28e5de025e3f`: 37 source files, 3 library and 2 test targets). Sources only: 5
mode 1 warning, complete checking 13, `-swift-version 6` 10 on 6.4.0 and 14 on 6.3.3
(errors and warnings together, toolchain dependent), Swift 6 mode 0 warnings with
`-warnings-as-errors` exit 0 and 0 added hatches. The test targets add their own
errors (U7), and that package declares Apple platform floors, so on an Apple build
its `Mutex` rung hits S2 (Linux-only result, see the cases above). macOS, Xcode projects,
app targets with `defaultIsolation` and Windows are `unverified: read only`.

## The `count` helper plant check (Before U0)

Watched 2026-10-10: with `path: "Source"` and one unused `var` in a source and one in a
test, `count` printed 2, the clean twin 0, a manifest naming a missing path `FAILED`.
A `/Sources/`-pinned grep printed 0 for all three.
