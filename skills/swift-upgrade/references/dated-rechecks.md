# Dated re-checks for step U10

Load this from step U10 of the swift-upgrade procedure. Each item re-proves one
fact that a rule states about a specific tool version, so a bump that changes the
fact is caught before the old wording keeps shipping. A probe reports STILL while the
pinned fact holds and FLIPPED when it no longer does. A FLIPPED result is a finding:
record it against the rule ID named in the item and leave the rule text to its
maintainer. Items U10.7 to U10.17 are in
[dated-rechecks-tools.md](dated-rechecks-tools.md).

Measured 2026-10-10 on Swift 6.4.0 and 6.3.3 (Linux x86_64) unless an item says
`unverified: read only`. Put every probe package in a scratch directory outside the
repository under change, because the probes reuse names.

Contents: [The 17 items and their triggers](#the-17-items-and-their-triggers) ·
[Probes U10.1 to U10.3: one script](#probes-u101-to-u103-one-script) ·
[U10.1 SE-0526 withDeadline](#u101-se-0526-withdeadline) ·
[U10.2 SE-0540 and SE-0529](#u102-se-0540-and-se-0529) ·
[U10.3 The typed-throws Task crash](#u103-the-typed-throws-task-crash) ·
[U10.4 static-swift-stdlib](#u104-static-swift-stdlib-at-641-or-later) ·
[U10.5 swift-syntax](#u105-swift-syntax-prebuilts-and-the-tag-list) ·
[U10.6 Patch-release syntax](#u106-patch-release-syntax-forms)

## The 17 items and their triggers

A trigger that did not fire is reported `NOT-TRIGGERED(reason)`, and an item about a
dependency the package does not have is `NOT-APPLICABLE(no such dependency)`.

| Item | Re-check | Trigger | Rules |
|---|---|---|---|
| U10.1 | SE-0526 `withDeadline` | every toolchain bump | SW-CONC-24, SW-CONC-33, SW-CORE-14 |
| U10.2 | SE-0540 `defaultSwiftSettings:`, SE-0529 stdlib `FilePath` | every toolchain and SwiftPM bump | SW-CORE-14, SW-IO-01 |
| U10.3 | The typed-throws `Task` closure frontend crash | every toolchain bump | SW-CORE-14 |
| U10.4 | `--static-swift-stdlib` | `swift --version` is 6.4.1 or later | SW-REL-03 |
| U10.5 | swift-syntax prebuilt manifests and the tag list | every swift-syntax range bump | SW-REL-22, SW-PKG-10 |
| U10.6 | Patch-release syntax forms | every Swift patch release | SW-LANG-03 |
| U10.7 | `-Werror TemporaryPointers` on 6.4 | every toolchain bump past 6.4.0 | SW-SEC-11 |
| U10.8 | `ImplicitStrongCapture` on the oldest CI leg | the oldest leg moves | SW-LANG-08, SW-GATE-15 |
| U10.9 | The `Skipping enabled rule` canary | each SwiftLint image bump | SW-GATE-26 |
| U10.10 | LLVM coverage exclusion. Maintainer re-check, on request | each LLVM bump (6.5 expected) | SW-TEST-22 |
| U10.11 | `.serialized(for:)` and `.taskLocal` | Swift 6.5 | SW-TEST-05 |
| U10.12 | The multi-producer channel's `.unbounded` and `~Copyable` capture | each swift-async-algorithms bump | SW-CONC-35 |
| U10.13 | `migrate` `@concurrent` fix-it deprecations | a toolchain bump that follows a U8 run | SW-CORE-12 |
| U10.14 | Advisory floors (a reading step) | a dependency was bumped | SW-SEC-20 |
| U10.15 | swift-subprocess releases | each bump of that dependency | SW-IO-06 |
| U10.16 | The type-check limit on a loaded runner. Maintainer re-check, on request | each runner-class change | SW-LANG-07 |
| U10.17 | The swift-protobuf 6.4 TSan failure. Maintainer re-check, on request | each toolchain bump | SW-GATE-27 |

## Probes U10.1 to U10.3: one script

This script writes four three-line packages into a temporary directory and builds
each. It covers U10.1, U10.2 (both halves) and U10.3. Run it on the current toolchain
and on the floor toolchain.

```bash
#!/usr/bin/env bash
# One line per probe. STILL: the pinned failure still happens. FLIPPED: the cited rules are stale.
W=$(mktemp -d)
write() { mkdir -p "$W/$1/Sources/p" && cat > "$W/$1/Sources/p/main.swift"; }
manifest() { printf '%s\n' '// swift-tools-version: 6.2' 'import PackageDescription' \
    "let package = Package(name: \"p\", targets: [.executableTarget(name: \"p\")]$2)" > "$W/$1/Package.swift"; }

write withdeadline <<'SRC'
let value = try await withDeadline(.now + .seconds(1)) { 1 }
print(value)
SRC
manifest withdeadline ''

write defsettings <<'SRC'
print("ok")
SRC
manifest defsettings ', defaultSwiftSettings: [.swiftLanguageMode(.v6)]'

write filepath <<'SRC'
let path: FilePath = "/tmp/x"
print(path)
SRC
manifest filepath ''

write typedtask <<'SRC'
struct Boom: Error {}
let task = Task { () throws(Boom) in throw Boom() }
_ = await task.result
SRC
manifest typedtask ''

probe() { # name, text of the pinned failure, label
    out=$(swift build --package-path "$W/$1" 2>&1)
    rc=$?
    if [ "$rc" -ne 0 ] && printf '%s\n' "$out" | grep -q -F -e "$2"; then
        echo "STILL   $3 (exit $rc)"
    else
        echo "FLIPPED $3 (exit $rc): re-read the cited rules"
    fi
}
probe withdeadline "cannot find 'withDeadline' in scope" "SE-0526 withDeadline"
probe defsettings "extra argument 'defaultSwiftSettings' in call" "SE-0540 defaultSwiftSettings"
probe filepath "cannot find type 'FilePath' in scope" "SE-0529 stdlib FilePath"
probe typedtask "Please submit a bug report" "typed-throws Task closure crash"
```

Expected output today, on 6.4.0 and on 6.3.3 (watched, measured 2026-10-10):

```text
STILL   SE-0526 withDeadline (exit 1)
STILL   SE-0540 defaultSwiftSettings (exit 1)
STILL   SE-0529 stdlib FilePath (exit 1)
STILL   typed-throws Task closure crash (exit 1)
```

The FLIPPED path is real. With the last probe's body changed to `Task { throw Boom() }`
the script printed `FLIPPED typed-throws Task closure crash (exit 0)` and the other
three stayed STILL.

## U10.1 SE-0526 withDeadline

Rules: SW-CONC-33, SW-CORE-14. SW-CONC-24 owns the timeout helper that a shipped
`withDeadline` would replace.

Trigger: every toolchain bump. SE-0526 was accepted with modifications on 2026-07-30,
is expected in Swift 6.5 and is absent in 6.4 (read 2026-10-10). Run probe 1 of the
script. STILL means a timeout is still written as a structured race on
`ContinuousClock`, and a shielded cleanup still races its own deadline. FLIPPED means
`withDeadline` ships: stop, and revise SW-CONC-24 and SW-CONC-33 before rewriting any
helper.

## U10.2 SE-0540 and SE-0529

Rules: SW-CORE-14, SW-IO-01. SW-PKG-01 and SW-PKG-18 are affected by the first half.

Trigger: every toolchain and SwiftPM bump. Run probes 2 and 3 of the script.

- SE-0540 `defaultSwiftSettings:` was accepted with modifications on 2026-09-06. The
  implementation, [swiftlang/swift-package-manager#10033](https://github.com/swiftlang/swift-package-manager/pull/10033),
  was open and blocked on 2026-10-10 (read). STILL means the shared loop of SW-PKG-18
  stays. FLIPPED means the loop body moves into the argument unchanged.
- SE-0529 `FilePath` in the standard library was accepted with modifications and is
  not shipped. STILL means `FilePath` comes from `SystemPackage` (SW-IO-01). Whether
  the stdlib type and `SystemPackage.FilePath` are the same type on macOS is
  `unverified: read only`.

## U10.3 The typed-throws Task crash

Rule: SW-CORE-14. SW-CONC-03 owns the advice to avoid the form.

Trigger: every toolchain bump. Run probe 4 of the script. STILL means a `Task` closure
annotated `() throws(E)` crashes the frontend in IRGen on 6.4.0 and 6.3.3
(`Please submit a bug report`, exit 1). FLIPPED means it compiles. Stop condition S3
applies to a project that hits the crash in shared code: minimise, record, wait.

## U10.4 static-swift-stdlib at 6.4.1 or later

Rule: SW-REL-03.

Trigger: only when `swift --version` reports 6.4.1 or later. A library with no
executable builds clean on every toolchain, so the probe needs a product that links
`Foundation`. Plant a three-line executable in a scratch package (tools version 6.2):

```swift
import Foundation
let data = try JSONEncoder().encode(["a": 1])
print(data.count)
```

```sh
swift build -c release --static-swift-stdlib --scratch-path "$S/static"; echo "default engine exit $?"
```

On 6.4.0 this exits 1 with an `undefined reference` link error, and exits 0 with
`--build-system native` added (watched with this plant, measured 2026-10-10). On 6.3.3 the default
(native) engine exits 0 and `--build-system swiftbuild` exits 1. Exit 0 on the default
engine of 6.4.1 or later means [swift-build#1763](https://github.com/swiftlang/swift-build/pull/1763)
is in the toolchain. That is the removal condition of the SW-REL-03 fallback: report it
and stop pinning `--build-system native`. The fix was merged to main on 2026-09-22 and
backported to the 6.4.x branches, and 6.4.0 was the only 6.4 tag on 2026-10-10 (read).
The green half on 6.4.1 is `unverified: read only`.

## U10.5 swift-syntax prebuilts and the tag list

Rules: SW-REL-22, SW-PKG-10.

Trigger: every bump of a swift-syntax range. A package that builds macros downloads a
prebuilt swift-syntax when the resolved tag has a published manifest on the CI
toolchain. Swift 6.3.3 has none. Run, in a package that depends on swift-syntax:

```sh
swift build -v 2>&1 | tee "$S/build.log"
grep -L -e 'Prebuilt artifact' "$S/build.log"
```

The `grep -L` lists the log when no prebuilt was downloaded, so output means the
build compiled swift-syntax from source (73 s against 16 s with `-j 2` in the measured
case). Empty output means a prebuilt was used. An `exact:` prerelease tag got a 404
and built from source. Then re-read the tag list, because a swift-syntax major is a
Swift release and the range of SW-PKG-10 moves with it:

```sh
git ls-remote --tags https://github.com/swiftlang/swift-syntax | awk '{print $2}' | sed 's#refs/tags/##' | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -2
```

It printed `603.0.2` and `604.0.0` on 2026-10-10, with 605 prereleases up to
`605.0.0-prerelease-2026-09-15`. A new last line above 604 means the upper bound of
the SW-PKG-10 range is stale.

## U10.6 Patch-release syntax forms

Rule: SW-LANG-03.

Trigger: every Swift patch release. A tools version does not gate syntax, and syntax
arrives in patch releases: `weak let` is rejected on 6.2.0 and accepted from 6.2.3. A
floating floor leg passes where consumers on the `.0` fail. Build the tree on the
exact `.0` floor image and on the new patch image, then run this probe on both:

```swift
public final class Node: Sendable {
    public weak let parent: Node?

    public init(parent: Node?) {
        self.parent = parent
    }
}
```

Watched (measured 2026-10-10): exit 1 on 6.2.0 with `'weak' must be a mutable
variable, because it may change at runtime`, and exit 0 on 6.2.4, 6.3.3 and 6.4.0. A
form that the guard table of SW-LANG-04 places at one patch but that behaves
differently on the new patch means the table is stale.
